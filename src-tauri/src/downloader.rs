use futures_util::StreamExt;
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use crate::store::StoreManager;

pub struct Downloader {
    store: Arc<StoreManager>,
    active_tasks: Arc<Mutex<HashMap<String, tokio::sync::oneshot::Sender<()>>>>,
}

impl Downloader {
    pub fn new(store: Arc<StoreManager>) -> Self {
        Self {
            store,
            active_tasks: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn sanitize_filename(name: &str) -> String {
        name.chars()
            .map(|c| match c {
                '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
                other => other,
            })
            .collect::<String>()
            .trim()
            .to_string()
    }

    fn clean_cover_url(url: &str) -> String {
        let mut clean = url.trim().to_string();
        if clean.starts_with("//") {
            clean = format!("https:{}", clean);
        }
        let re = regex::Regex::new(r"-\d+x\d+(\.[a-zA-Z0-9]+(?:\?.*)?)$").unwrap();
        clean = re.replace(&clean, "$1").to_string();
        let re2 = regex::Regex::new(r"-scaled(\.[a-zA-Z0-9]+(?:\?.*)?)$").unwrap();
        clean = re2.replace(&clean, "$1").to_string();
        clean
    }

    fn parse_size_str(s: &str) -> u64 {
        let s = s.trim().to_uppercase();
        let parts: Vec<&str> = s.split_whitespace().collect();
        if parts.is_empty() {
            return 0;
        }
        if let Ok(num) = parts[0].parse::<f64>() {
            let unit = if parts.len() > 1 { parts[1] } else { "" };
            if unit.starts_with('G') {
                (num * 1024.0 * 1024.0 * 1024.0) as u64
            } else if unit.starts_with('M') {
                (num * 1024.0 * 1024.0) as u64
            } else if unit.starts_with('K') {
                (num * 1024.0) as u64
            } else {
                num as u64
            }
        } else {
            0
        }
    }

    pub async fn start_download(
        &self,
        app: AppHandle,
        task_data: serde_json::Value,
    ) -> Result<serde_json::Value, String> {
        let actual_data = if task_data.get("downloadUrl").is_some() || task_data.get("download_url").is_some() {
            &task_data
        } else if let Some(inner) = task_data.get("taskData").or_else(|| task_data.get("task_data")) {
            inner
        } else {
            &task_data
        };

        let id = actual_data
            .get("id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| {
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis().to_string())
                    .unwrap_or_else(|_| "task".to_string())
            });

        let download_url = actual_data
            .get("downloadUrl")
            .or_else(|| actual_data.get("download_url"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| "Missing downloadUrl".to_string())?
            .to_string();

        let referer = actual_data
            .get("referer")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        let filename = actual_data
            .get("filename")
            .and_then(|v| v.as_str())
            .unwrap_or("Trainer.zip")
            .to_string();

        let file_size_str = actual_data
            .get("fileSize")
            .or_else(|| actual_data.get("file_size"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let game_title = actual_data
            .get("gameTitle")
            .or_else(|| actual_data.get("game_title"))
            .and_then(|v| v.as_str())
            .unwrap_or("Game Trainer")
            .to_string();

        let cover = actual_data
            .get("cover")
            .or_else(|| actual_data.get("thumbCover"))
            .or_else(|| actual_data.get("thumb_cover"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let version = actual_data
            .get("version")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let config = self.store.get_config();
        let download_dir = PathBuf::from(&config.download_dir);
        let _ = fs::create_dir_all(&download_dir);

        let safe_filename = Self::sanitize_filename(&filename);
        let target_file_path = download_dir.join(&safe_filename);

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        let record = serde_json::json!({
            "id": id,
            "downloadUrl": download_url,
            "referer": referer,
            "filename": safe_filename,
            "gameTitle": game_title,
            "cover": cover,
            "version": version,
            "targetFilePath": target_file_path.to_string_lossy().to_string(),
            "totalBytes": 0,
            "downloadedBytes": 0,
            "percent": 0,
            "speed": 0,
            "eta": 0,
            "status": "downloading",
            "createdAt": now,
            "updatedAt": now,
        });

        self.store.save_download(record.clone());
        let _ = app.emit("download-start", &record);

        let (cancel_tx, mut cancel_rx) = tokio::sync::oneshot::channel::<()>();
        {
            let mut tasks = self.active_tasks.lock().await;
            tasks.insert(id.clone(), cancel_tx);
        }

        let store_clone = self.store.clone();
        let active_tasks_clone = self.active_tasks.clone();
        let app_clone = app.clone();
        let id_clone = id.clone();
        let auto_extract = config.auto_extract;
        let mut bg_record = record.clone();

        tokio::spawn(async move {
            let mut client_builder = reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(300))
                .cookie_store(true)
                .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");

            if config.proxy.mode == "custom" && !config.proxy.custom_url.trim().is_empty() {
                let mut p = config.proxy.custom_url.trim().to_string();
                if !p.starts_with("http://") && !p.starts_with("https://") && !p.starts_with("socks5://") {
                    p = format!("http://{}", p);
                }
                if let Ok(proxy) = reqwest::Proxy::all(&p) {
                    client_builder = client_builder.proxy(proxy);
                }
            } else if config.proxy.mode == "direct" {
                client_builder = client_builder.no_proxy();
            }

            let client = client_builder.build().unwrap_or_default();

            let mut req = client.get(&download_url);
            if let Some(ref r) = referer {
                req = req.header("Referer", r);
            }

            let res = match req.send().await {
                Ok(r) => r,
                Err(e) => {
                    active_tasks_clone.lock().await.remove(&id_clone);
                    bg_record["status"] = serde_json::json!("failed");
                    bg_record["error"] = serde_json::json!(e.to_string());
                    store_clone.save_download(bg_record.clone());
                    let _ = app_clone.emit("download-failed", &bg_record);
                    return;
                }
            };

            let mut total_bytes = res.content_length().unwrap_or(0);
            if total_bytes == 0 && !file_size_str.is_empty() {
                total_bytes = Self::parse_size_str(&file_size_str);
            }
            bg_record["totalBytes"] = serde_json::json!(total_bytes);

            let mut file = match File::create(&target_file_path) {
                Ok(f) => f,
                Err(e) => {
                    active_tasks_clone.lock().await.remove(&id_clone);
                    bg_record["status"] = serde_json::json!("failed");
                    bg_record["error"] = serde_json::json!(e.to_string());
                    store_clone.save_download(bg_record.clone());
                    let _ = app_clone.emit("download-failed", &bg_record);
                    return;
                }
            };

            let mut stream = res.bytes_stream();
            let mut downloaded_bytes: u64 = 0;
            let mut last_bytes: u64 = 0;
            let mut last_time = Instant::now();

            loop {
                tokio::select! {
                    _ = &mut cancel_rx => {
                        let _ = fs::remove_file(&target_file_path);
                        return;
                    }
                    chunk = stream.next() => {
                        match chunk {
                            Some(Ok(bytes)) => {
                                if let Err(e) = file.write_all(&bytes) {
                                    active_tasks_clone.lock().await.remove(&id_clone);
                                    bg_record["status"] = serde_json::json!("failed");
                                    bg_record["error"] = serde_json::json!(e.to_string());
                                    store_clone.save_download(bg_record.clone());
                                    let _ = app_clone.emit("download-failed", &bg_record);
                                    return;
                                }
                                downloaded_bytes += bytes.len() as u64;

                                if last_time.elapsed().as_millis() >= 500 {
                                    let elapsed = last_time.elapsed().as_secs_f64();
                                    let speed = if elapsed > 0.0 {
                                        ((downloaded_bytes - last_bytes) as f64 / elapsed) as u64
                                    } else { 0 };

                                    let percent = if total_bytes > 0 {
                                        std::cmp::min(99, (downloaded_bytes * 100 / total_bytes) as u32)
                                    } else { 0 };

                                    let eta = if speed > 0 && total_bytes > downloaded_bytes {
                                        (total_bytes - downloaded_bytes) / speed
                                    } else { 0 };

                                    bg_record["downloadedBytes"] = serde_json::json!(downloaded_bytes);
                                    bg_record["percent"] = serde_json::json!(percent);
                                    bg_record["speed"] = serde_json::json!(speed);
                                    bg_record["eta"] = serde_json::json!(eta);

                                    store_clone.save_download(bg_record.clone());
                                    let _ = app_clone.emit("download-progress", &bg_record);

                                    last_bytes = downloaded_bytes;
                                    last_time = Instant::now();
                                }
                            }
                            Some(Err(e)) => {
                                active_tasks_clone.lock().await.remove(&id_clone);
                                bg_record["status"] = serde_json::json!("failed");
                                bg_record["error"] = serde_json::json!(e.to_string());
                                store_clone.save_download(bg_record.clone());
                                let _ = app_clone.emit("download-failed", &bg_record);
                                return;
                            }
                            None => {
                                // Download completed
                                break;
                            }
                        }
                    }
                }
            }

            drop(file);
            active_tasks_clone.lock().await.remove(&id_clone);

            // Verify file magic bytes
            let mut is_exe = false;
            let mut is_zip = false;
            if let Ok(mut f) = File::open(&target_file_path) {
                let mut magic = [0u8; 4];
                if f.read_exact(&mut magic).is_ok() {
                    is_exe = magic[0] == 0x4D && magic[1] == 0x5A; // MZ
                    is_zip = magic[0] == 0x50 && magic[1] == 0x4B; // PK
                }
            }

            let mut final_file_path = target_file_path.clone();
            let mut extracted_exe_path: Option<String> = None;
            let mut extracted_folder_path: Option<String> = Some(download_dir.to_string_lossy().to_string());

            if is_exe {
                let mut proper_path = final_file_path.clone();
                let fname = proper_path.file_name().unwrap_or_default().to_string_lossy().to_string();
                if fname.to_lowercase().ends_with(".zip") {
                    proper_path.set_extension("exe");
                    let _ = fs::rename(&final_file_path, &proper_path);
                    final_file_path = proper_path;
                }
                extracted_exe_path = Some(final_file_path.to_string_lossy().to_string());
            } else if is_zip {
                let mut proper_path = final_file_path.clone();
                let fname = proper_path.file_name().unwrap_or_default().to_string_lossy().to_string();
                if fname.to_lowercase().ends_with(".exe") {
                    proper_path.set_extension("zip");
                    let _ = fs::rename(&final_file_path, &proper_path);
                    final_file_path = proper_path;
                }

                if auto_extract {
                    if let Ok(res) = Self::extract_zip(&final_file_path, &download_dir, &game_title) {
                        extracted_folder_path = Some(res.0);
                        extracted_exe_path = res.1;
                    }
                }
            } else {
                extracted_exe_path = Some(final_file_path.to_string_lossy().to_string());
            }

            let now_done = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);

            let final_filename = final_file_path.file_name().unwrap_or_default().to_string_lossy().to_string();
            bg_record["filename"] = serde_json::json!(final_filename);
            bg_record["targetFilePath"] = serde_json::json!(final_file_path.to_string_lossy().to_string());
            bg_record["downloadedBytes"] = serde_json::json!(downloaded_bytes);
            bg_record["totalBytes"] = serde_json::json!(downloaded_bytes);
            bg_record["percent"] = serde_json::json!(100);
            bg_record["speed"] = serde_json::json!(0);
            bg_record["eta"] = serde_json::json!(0);
            bg_record["status"] = serde_json::json!("completed");
            bg_record["completedAt"] = serde_json::json!(now_done);
            bg_record["extractedExePath"] = serde_json::json!(extracted_exe_path);
            bg_record["extractedFolderPath"] = serde_json::json!(extracted_folder_path);

            let clean_title = game_title.trim_end_matches(" Trainer").trim().to_string();
            let library_item = serde_json::json!({
                "id": id_clone,
                "title": game_title,
                "cleanTitle": clean_title,
                "version": version,
                "cover": Self::clean_cover_url(&cover),
                "zipPath": final_file_path.to_string_lossy().to_string(),
                "exePath": extracted_exe_path.clone().unwrap_or_else(|| final_file_path.to_string_lossy().to_string()),
                "folderPath": extracted_folder_path.clone().unwrap_or_else(|| download_dir.to_string_lossy().to_string()),
                "downloadUrl": download_url,
                "referer": referer,
                "addedAt": now_done,
            });

            store_clone.save_library_item(library_item.clone());
            store_clone.save_download(bg_record.clone());

            let mut event_payload = bg_record.clone();
            event_payload["libraryItem"] = library_item;
            let _ = app_clone.emit("download-completed", &event_payload);
        });

        Ok(record)
    }

    pub async fn cancel_download(&self, id: &str) {
        let mut tasks = self.active_tasks.lock().await;
        if let Some(tx) = tasks.remove(id) {
            let _ = tx.send(());
        }

        let mut dl = self.store.get_downloads();
        if let Some(item) = dl.iter_mut().find(|x| x.get("id").and_then(|v| v.as_str()) == Some(id)) {
            item["status"] = serde_json::json!("cancelled");
            item["speed"] = serde_json::json!(0);
            self.store.save_download(item.clone());
        }
    }

    pub fn extract_zip(
        zip_path: &Path,
        download_dir: &Path,
        game_title: &str,
    ) -> Result<(String, Option<String>), String> {
        let file = File::open(zip_path).map_err(|e| e.to_string())?;
        let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

        let folder_name = Self::sanitize_filename(game_title);
        let target_dir = download_dir.join(&folder_name);
        fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

        archive.extract(&target_dir).map_err(|e| e.to_string())?;

        // Find .exe in target_dir
        let mut found_exe: Option<String> = None;
        Self::find_exe_recursive(&target_dir, &mut found_exe);

        Ok((target_dir.to_string_lossy().to_string(), found_exe))
    }

    fn find_exe_recursive(dir: &Path, found: &mut Option<String>) {
        if found.is_some() {
            return;
        }
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_dir() {
                    Self::find_exe_recursive(&p, found);
                } else if p.is_file() {
                    if let Some(ext) = p.extension() {
                        if ext.to_string_lossy().to_lowercase() == "exe" {
                            *found = Some(p.to_string_lossy().to_string());
                            return;
                        }
                    }
                }
            }
        }
    }

    pub fn launch_trainer(&self, exe_path: &str) -> Result<bool, String> {
        let p = Path::new(exe_path);
        if !p.exists() {
            return Err(format!("修改器执行文件不存在: {}", exe_path));
        }

        let parent = p.parent().unwrap_or_else(|| Path::new("."));

        // Use Windows "cmd /c start" to support UAC elevation prompt
        let _ = Command::new("cmd")
            .current_dir(parent)
            .args(["/c", "start", "", &p.to_string_lossy()])
            .spawn()
            .map_err(|e| format!("启动修改器失败: {}", e))?;

        Ok(true)
    }

    pub fn open_in_explorer(&self, target_path: &str) {
        let p = Path::new(target_path);
        if p.exists() {
            if p.is_dir() {
                let _ = Command::new("explorer").arg(p).spawn();
            } else {
                let _ = Command::new("explorer").arg(format!("/select,\"{}\"", p.to_string_lossy())).spawn();
            }
        } else if let Some(parent) = p.parent() {
            if parent.exists() {
                let _ = Command::new("explorer").arg(parent).spawn();
            }
        }
    }
}
