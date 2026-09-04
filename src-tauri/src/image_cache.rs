use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use crate::store::StoreManager;

pub struct ImageCacheManager {
    pub cache_dir: PathBuf,
    store: Arc<StoreManager>,
}

impl ImageCacheManager {
    pub fn new(store: Arc<StoreManager>) -> Self {
        let cache_dir = store.data_dir.join("image_cache");
        let _ = fs::create_dir_all(&cache_dir);

        Self {
            cache_dir,
            store,
        }
    }

    fn get_extension(url: &str) -> &'static str {
        let clean = url.split('?').next().unwrap_or(url).to_lowercase();
        if clean.ends_with(".png") {
            ".png"
        } else if clean.ends_with(".webp") {
            ".webp"
        } else if clean.ends_with(".gif") {
            ".gif"
        } else if clean.ends_with(".svg") {
            ".svg"
        } else {
            ".jpg"
        }
    }

    pub fn get_cache_path(&self, url: &str) -> PathBuf {
        let digest = md5::compute(url.trim().as_bytes());
        let hash = format!("{:x}", digest);
        let ext = Self::get_extension(url);
        self.cache_dir.join(format!("{}{}", hash, ext))
    }

    fn build_client(&self) -> reqwest::Client {
        let cfg = self.store.get_config();
        let mut builder = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(20))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");

        if cfg.proxy.mode == "custom" && !cfg.proxy.custom_url.trim().is_empty() {
            let mut p = cfg.proxy.custom_url.trim().to_string();
            if !p.starts_with("http://") && !p.starts_with("https://") && !p.starts_with("socks5://") {
                p = format!("http://{}", p);
            }
            if let Ok(proxy) = reqwest::Proxy::all(&p) {
                builder = builder.proxy(proxy);
            }
        }

        builder.build().unwrap_or_default()
    }

    pub async fn get_image_bytes(&self, url: &str) -> Option<(Vec<u8>, String)> {
        let file_path = self.get_cache_path(url);
        let ext = Self::get_extension(url);
        let mime = match ext {
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            ".svg" => "image/svg+xml",
            _ => "image/jpeg",
        }.to_string();

        if file_path.exists() {
            if let Ok(bytes) = fs::read(&file_path) {
                if !bytes.is_empty() {
                    return Some((bytes, mime));
                }
            }
        }

        // Fetch image over network
        let client = self.build_client();
        let resp = client.get(url)
            .header("Referer", "https://flingtrainer.com/")
            .send()
            .await
            .ok()?;

        if resp.status().is_success() {
            if let Ok(bytes) = resp.bytes().await {
                let vec = bytes.to_vec();
                let _ = fs::write(&file_path, &vec);
                return Some((vec, mime));
            }
        }

        None
    }

    pub fn get_stats(&self) -> serde_json::Value {
        let mut count = 0;
        let mut size_bytes: u64 = 0;

        if let Ok(entries) = fs::read_dir(&self.cache_dir) {
            for entry in entries.flatten() {
                if let Ok(meta) = entry.metadata() {
                    if meta.is_file() {
                        count += 1;
                        size_bytes += meta.len();
                    }
                }
            }
        }

        let formatted = if size_bytes < 1024 {
            format!("{} B", size_bytes)
        } else if size_bytes < 1024 * 1024 {
            format!("{:.1} KB", size_bytes as f64 / 1024.0)
        } else {
            format!("{:.2} MB", size_bytes as f64 / (1024.0 * 1024.0))
        };

        serde_json::json!({
            "count": count,
            "sizeBytes": size_bytes,
            "sizeFormatted": formatted,
        })
    }

    pub fn clear(&self) -> serde_json::Value {
        if let Ok(entries) = fs::read_dir(&self.cache_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_file() {
                    let _ = fs::remove_file(p);
                }
            }
        }
        serde_json::json!({ "success": true })
    }

    pub async fn preload(&self, urls: Vec<String>) {
        let client = self.build_client();
        for url in urls {
            let target_path = self.get_cache_path(&url);
            if target_path.exists() {
                continue;
            }
            if let Ok(resp) = client.get(&url).header("Referer", "https://flingtrainer.com/").send().await {
                if resp.status().is_success() {
                    if let Ok(bytes) = resp.bytes().await {
                        let _ = fs::write(&target_path, bytes);
                    }
                }
            }
        }
    }
}
