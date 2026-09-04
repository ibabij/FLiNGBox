use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct ProxyConfig {
    pub mode: String, // "direct", "system", "custom"
    pub custom_url: String,
}

impl Default for ProxyConfig {
    fn default() -> Self {
        Self {
            mode: "direct".to_string(),
            custom_url: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AppConfig {
    pub download_dir: String,
    pub auto_extract: bool,
    pub delete_files_on_remove: bool,
    pub translate_game_titles: bool,
    pub proxy: ProxyConfig,
    pub close_to_tray: bool,
    pub theme: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        let default_download = dirs::download_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("FLTrainers");

        let _ = fs::create_dir_all(&default_download);

        Self {
            download_dir: default_download.to_string_lossy().to_string(),
            auto_extract: true,
            delete_files_on_remove: true,
            translate_game_titles: true,
            proxy: ProxyConfig::default(),
            close_to_tray: false,
            theme: "dark".to_string(),
        }
    }
}

pub struct StoreManager {
    pub data_dir: PathBuf,
    pub config_path: PathBuf,
    pub library_path: PathBuf,
    pub downloads_path: PathBuf,
    pub favorites_path: PathBuf,

    pub config: RwLock<AppConfig>,
    pub library: RwLock<Vec<serde_json::Value>>,
    pub downloads: RwLock<Vec<serde_json::Value>>,
    pub favorites: RwLock<Vec<serde_json::Value>>,
}

impl StoreManager {
    pub fn new() -> Self {
        let data_dir = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("com.jibi.flingbox");

        let _ = fs::create_dir_all(&data_dir);

        let config_path = data_dir.join("config.json");
        let library_path = data_dir.join("library.json");
        let downloads_path = data_dir.join("downloads.json");
        let favorites_path = data_dir.join("favorites.json");

        let config: AppConfig = if config_path.exists() {
            fs::read_to_string(&config_path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            let def = AppConfig::default();
            if let Ok(s) = serde_json::to_string_pretty(&def) {
                let _ = fs::write(&config_path, s);
            }
            def
        };

        let library: Vec<serde_json::Value> = if library_path.exists() {
            fs::read_to_string(&library_path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            Vec::new()
        };

        let mut downloads: Vec<serde_json::Value> = if downloads_path.exists() {
            fs::read_to_string(&downloads_path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            Vec::new()
        };

        // Auto-fix any completed downloads where filename was labeled .zip but actually exists as .exe
        let mut dirty = false;
        for item in downloads.iter_mut() {
            if let Some(target_path_str) = item.get("targetFilePath").and_then(|v| v.as_str()) {
                let target_p = PathBuf::from(target_path_str);
                let exe_p = target_p.with_extension("exe");
                if !target_p.exists() && exe_p.exists() {
                    let exe_filename = exe_p.file_name().unwrap_or_default().to_string_lossy().to_string();
                    item["filename"] = serde_json::json!(exe_filename);
                    item["targetFilePath"] = serde_json::json!(exe_p.to_string_lossy().to_string());
                    item["extractedExePath"] = serde_json::json!(exe_p.to_string_lossy().to_string());
                    dirty = true;
                }
            }
            if item.get("status").and_then(|v| v.as_str()) == Some("completed") {
                if let Some(dl_bytes) = item.get("downloadedBytes").and_then(|v| v.as_u64()) {
                    if item.get("totalBytes").and_then(|v| v.as_u64()).unwrap_or(0) == 0 {
                        item["totalBytes"] = serde_json::json!(dl_bytes);
                        dirty = true;
                    }
                }
            }
        }
        if dirty {
            if let Ok(s) = serde_json::to_string_pretty(&downloads) {
                let _ = fs::write(&downloads_path, s);
            }
        }

        let favorites: Vec<serde_json::Value> = if favorites_path.exists() {
            fs::read_to_string(&favorites_path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            Vec::new()
        };

        Self {
            data_dir,
            config_path,
            library_path,
            downloads_path,
            favorites_path,
            config: RwLock::new(config),
            library: RwLock::new(library),
            downloads: RwLock::new(downloads),
            favorites: RwLock::new(favorites),
        }
    }

    pub fn get_config(&self) -> AppConfig {
        self.config.read().unwrap().clone()
    }

    pub fn save_config(&self, new_config: AppConfig) -> AppConfig {
        let mut cfg = self.config.write().unwrap();
        *cfg = new_config.clone();
        if let Ok(s) = serde_json::to_string_pretty(&new_config) {
            let _ = fs::write(&self.config_path, s);
        }
        new_config
    }

    pub fn get_library(&self) -> Vec<serde_json::Value> {
        self.library.read().unwrap().clone()
    }

    pub fn save_library_item(&self, item: serde_json::Value) -> Vec<serde_json::Value> {
        let mut lib = self.library.write().unwrap();
        let item_id = item.get("id").and_then(|v| v.as_str());
        let item_url = item.get("url").and_then(|v| v.as_str());

        let existing_idx = lib.iter().position(|x| {
            let id = x.get("id").and_then(|v| v.as_str());
            let url = x.get("url").and_then(|v| v.as_str());
            (item_id.is_some() && id == item_id) || (item_url.is_some() && url == item_url)
        });

        let mut new_item = item.clone();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        if let Some(obj) = new_item.as_object_mut() {
            obj.insert("updatedAt".to_string(), serde_json::json!(now));
        }

        if let Some(idx) = existing_idx {
            if let (Some(dest), Some(src)) = (lib[idx].as_object_mut(), new_item.as_object()) {
                for (k, v) in src {
                    dest.insert(k.clone(), v.clone());
                }
            } else {
                lib[idx] = new_item;
            }
        } else {
            if let Some(obj) = new_item.as_object_mut() {
                obj.insert("addedAt".to_string(), serde_json::json!(now));
            }
            lib.insert(0, new_item);
        }

        if let Ok(s) = serde_json::to_string_pretty(&*lib) {
            let _ = fs::write(&self.library_path, s);
        }

        lib.clone()
    }

    pub fn remove_library_item(&self, id: &str, delete_files: Option<bool>) -> Vec<serde_json::Value> {
        let mut lib = self.library.write().unwrap();
        let should_delete = delete_files.unwrap_or_else(|| self.get_config().delete_files_on_remove);

        if let Some(pos) = lib.iter().position(|x| x.get("id").and_then(|v| v.as_str()) == Some(id)) {
            if should_delete {
                let item = &lib[pos];
                self.delete_trainer_files(item);
            }
            lib.remove(pos);
            if let Ok(s) = serde_json::to_string_pretty(&*lib) {
                let _ = fs::write(&self.library_path, s);
            }
        }

        lib.clone()
    }

    fn delete_trainer_files(&self, item: &serde_json::Value) {
        let cfg = self.get_config();
        let download_dir = Path::new(&cfg.download_dir);

        // Delete folder
        if let Some(folder) = item.get("folderPath").and_then(|v| v.as_str()) {
            let p = Path::new(folder);
            if p.exists() && p != download_dir && p.is_dir() {
                let _ = fs::remove_dir_all(p);
            }
        }

        // Delete zip
        if let Some(zip) = item.get("zipPath").and_then(|v| v.as_str()) {
            let p = Path::new(zip);
            if p.exists() && p.is_file() {
                let _ = fs::remove_file(p);
            }
        }

        // Delete standalone exe
        if let Some(exe) = item.get("exePath").and_then(|v| v.as_str()) {
            let p = Path::new(exe);
            if p.exists() && p.is_file() {
                let _ = fs::remove_file(p);
            }
        }
    }

    pub fn get_downloads(&self) -> Vec<serde_json::Value> {
        self.downloads.read().unwrap().clone()
    }

    pub fn save_download(&self, record: serde_json::Value) -> Vec<serde_json::Value> {
        let mut dl = self.downloads.write().unwrap();
        let rec_id = record.get("id").and_then(|v| v.as_str());

        let idx = rec_id.and_then(|id| {
            dl.iter().position(|x| x.get("id").and_then(|v| v.as_str()) == Some(id))
        });

        if let Some(i) = idx {
            if let (Some(dest), Some(src)) = (dl[i].as_object_mut(), record.as_object()) {
                for (k, v) in src {
                    dest.insert(k.clone(), v.clone());
                }
            } else {
                dl[i] = record;
            }
        } else {
            dl.insert(0, record);
        }

        if let Ok(s) = serde_json::to_string_pretty(&*dl) {
            let _ = fs::write(&self.downloads_path, s);
        }

        dl.clone()
    }

    pub fn remove_download(&self, id: &str) -> Vec<serde_json::Value> {
        let mut dl = self.downloads.write().unwrap();
        dl.retain(|x| x.get("id").and_then(|v| v.as_str()) != Some(id));
        if let Ok(s) = serde_json::to_string_pretty(&*dl) {
            let _ = fs::write(&self.downloads_path, s);
        }
        dl.clone()
    }

    pub fn clear_completed_downloads(&self) -> Vec<serde_json::Value> {
        let mut dl = self.downloads.write().unwrap();
        dl.retain(|x| {
            let st = x.get("status").and_then(|v| v.as_str()).unwrap_or("");
            st == "downloading" || st == "paused"
        });
        if let Ok(s) = serde_json::to_string_pretty(&*dl) {
            let _ = fs::write(&self.downloads_path, s);
        }
        dl.clone()
    }

    pub fn get_favorites(&self) -> Vec<serde_json::Value> {
        self.favorites.read().unwrap().clone()
    }

    pub fn toggle_favorite(&self, item: serde_json::Value) -> Vec<serde_json::Value> {
        let mut fav = self.favorites.write().unwrap();
        let item_id = item.get("id").and_then(|v| v.as_str());
        let item_url = item.get("url").and_then(|v| v.as_str());

        let idx = fav.iter().position(|x| {
            let id = x.get("id").and_then(|v| v.as_str());
            let url = x.get("url").and_then(|v| v.as_str());
            (item_id.is_some() && id == item_id) || (item_url.is_some() && url == item_url)
        });

        if let Some(i) = idx {
            fav.remove(i);
        } else {
            let mut entry = item.clone();
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis() as u64)
                .unwrap_or(0);
            if let Some(obj) = entry.as_object_mut() {
                obj.insert("favoritedAt".to_string(), serde_json::json!(now));
            }
            fav.insert(0, entry);
        }

        if let Ok(s) = serde_json::to_string_pretty(&*fav) {
            let _ = fs::write(&self.favorites_path, s);
        }

        fav.clone()
    }

    pub fn is_favorite(&self, url_or_id: &str) -> bool {
        let fav = self.favorites.read().unwrap();
        fav.iter().any(|x| {
            let id = x.get("id").and_then(|v| v.as_str());
            let url = x.get("url").and_then(|v| v.as_str());
            id == Some(url_or_id) || url == Some(url_or_id)
        })
    }
}
