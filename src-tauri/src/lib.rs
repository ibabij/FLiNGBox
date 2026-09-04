mod store;
mod image_cache;
mod scraper;
mod downloader;

use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, State, Window,
};
use tauri_plugin_opener::OpenerExt;

use crate::downloader::Downloader;
use crate::image_cache::ImageCacheManager;
use crate::scraper::FlingScraper;
use crate::store::{AppConfig, StoreManager};

pub struct AppState {
    pub store: Arc<StoreManager>,
    pub image_cache: Arc<ImageCacheManager>,
    pub scraper: Arc<FlingScraper>,
    pub downloader: Arc<Downloader>,
}

// ================= Window Controls =================
#[tauri::command]
fn window_minimize(window: Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
fn window_maximize(window: Window) -> Result<bool, String> {
    let is_max = window.is_maximized().map_err(|e| e.to_string())?;
    if is_max {
        window.unmaximize().map_err(|e| e.to_string())?;
        Ok(false)
    } else {
        window.maximize().map_err(|e| e.to_string())?;
        Ok(true)
    }
}

#[tauri::command]
fn window_close(window: Window, state: State<'_, AppState>) -> Result<(), String> {
    let cfg = state.store.get_config();
    if cfg.close_to_tray {
        window.hide().map_err(|e| e.to_string())
    } else {
        window.close().map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn window_is_maximized(window: Window) -> Result<bool, String> {
    window.is_maximized().map_err(|e| e.to_string())
}

// ================= Scraper Commands =================
#[tauri::command]
async fn scraper_get_recent(state: State<'_, AppState>, page: Option<u32>) -> Result<serde_json::Value, String> {
    state.scraper.get_recent_trainers(page.unwrap_or(1)).await
}

#[tauri::command]
async fn scraper_search(state: State<'_, AppState>, query: String, page: Option<u32>) -> Result<serde_json::Value, String> {
    state.scraper.search_trainers(&query, page.unwrap_or(1)).await
}

#[tauri::command]
async fn scraper_get_az(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    state.scraper.get_all_trainers_az().await
}

#[tauri::command]
async fn scraper_get_popular(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    state.scraper.get_popular_trainers().await
}

#[tauri::command]
async fn scraper_get_details(state: State<'_, AppState>, url: String) -> Result<serde_json::Value, String> {
    state.scraper.get_trainer_details(&url).await
}

#[tauri::command]
async fn scraper_translate_text(
    state: State<'_, AppState>,
    text: String,
    from: Option<String>,
    to: Option<String>,
) -> Result<String, String> {
    state.scraper.translate_text(
        &text,
        &from.unwrap_or_else(|| "en".to_string()),
        &to.unwrap_or_else(|| "zh-CN".to_string()),
    ).await
}

#[tauri::command]
fn scraper_translate_game_title(state: State<'_, AppState>, title: String) -> serde_json::Value {
    state.scraper.translate_game_title(&title)
}

// ================= Download Commands =================
#[tauri::command]
async fn download_start(
    app: AppHandle,
    state: State<'_, AppState>,
    task_data: serde_json::Value,
) -> Result<serde_json::Value, String> {
    state.downloader.start_download(app, task_data).await
}

#[tauri::command]
async fn download_cancel(state: State<'_, AppState>, id: String) -> Result<serde_json::Value, String> {
    state.downloader.cancel_download(&id).await;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
fn download_get_list(state: State<'_, AppState>) -> Vec<serde_json::Value> {
    state.store.get_downloads()
}

#[tauri::command]
fn download_clear_completed(state: State<'_, AppState>) -> Vec<serde_json::Value> {
    state.store.clear_completed_downloads()
}

#[tauri::command]
fn download_remove(state: State<'_, AppState>, id: String) -> Vec<serde_json::Value> {
    state.store.remove_download(&id)
}

#[tauri::command]
fn download_extract(
    state: State<'_, AppState>,
    zip_path: String,
    game_title: Option<String>,
) -> Result<serde_json::Value, String> {
    let cfg = state.store.get_config();
    let download_dir = std::path::PathBuf::from(&cfg.download_dir);
    let title = game_title.unwrap_or_else(|| "Game".to_string());
    let (folder, exe) = Downloader::extract_zip(std::path::Path::new(&zip_path), &download_dir, &title)?;
    Ok(serde_json::json!({
        "folderPath": folder,
        "exePath": exe,
    }))
}

#[tauri::command]
fn download_launch(state: State<'_, AppState>, exe_path: String) -> Result<serde_json::Value, String> {
    state.downloader.launch_trainer(&exe_path)?;
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
fn download_open_folder(state: State<'_, AppState>, target_path: String) -> Result<serde_json::Value, String> {
    state.downloader.open_in_explorer(&target_path);
    Ok(serde_json::json!({ "success": true }))
}

// ================= Library & Favorites =================
#[tauri::command]
fn library_get_all(state: State<'_, AppState>) -> Vec<serde_json::Value> {
    state.store.get_library()
}

#[tauri::command]
fn library_save_item(state: State<'_, AppState>, item: serde_json::Value) -> Vec<serde_json::Value> {
    state.store.save_library_item(item)
}

#[tauri::command]
fn library_remove_item(
    state: State<'_, AppState>,
    id: String,
    delete_files: Option<bool>,
) -> Vec<serde_json::Value> {
    state.store.remove_library_item(&id, delete_files)
}

#[tauri::command]
fn library_get_favorites(state: State<'_, AppState>) -> Vec<serde_json::Value> {
    state.store.get_favorites()
}

#[tauri::command]
fn library_toggle_favorite(state: State<'_, AppState>, item: serde_json::Value) -> Vec<serde_json::Value> {
    state.store.toggle_favorite(item)
}

#[tauri::command]
fn library_is_favorite(state: State<'_, AppState>, url_or_id: String) -> bool {
    state.store.is_favorite(&url_or_id)
}

// ================= Settings & Dialogs =================
#[tauri::command]
fn settings_get(state: State<'_, AppState>) -> AppConfig {
    state.store.get_config()
}

#[tauri::command]
fn settings_save(state: State<'_, AppState>, new_config: AppConfig) -> AppConfig {
    state.store.save_config(new_config)
}

#[tauri::command]
async fn settings_test_proxy(mode: String, custom_url: Option<String>) -> Result<serde_json::Value, String> {
    let mut builder = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

    if mode == "custom" {
        let raw = custom_url.unwrap_or_default();
        if raw.trim().is_empty() {
            return Err("未填写自定义代理地址，请输入代理地址 (如: http://127.0.0.1:7890)".to_string());
        }
        let mut p = raw.trim().to_string();
        if !p.starts_with("http://") && !p.starts_with("https://") && !p.starts_with("socks5://") {
            p = format!("http://{}", p);
        }
        let proxy = reqwest::Proxy::all(&p).map_err(|e| format!("代理地址格式错误: {}", e))?;
        builder = builder.proxy(proxy);
    }

    let client = builder.build().map_err(|e| e.to_string())?;
    let res = client.get("https://flingtrainer.com")
        .send()
        .await
        .map_err(|e| format!("连接失败: {}", e))?;

    Ok(serde_json::json!({
        "success": true,
        "status": res.status().as_u16(),
    }))
}

#[tauri::command]
async fn dialog_select_folder(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_folder(move |folder| {
        let _ = tx.send(folder);
    });
    let result = rx.await.map_err(|e| e.to_string())?;
    Ok(result.map(|p| p.to_string()))
}

// ================= Image Cache =================
#[tauri::command]
fn image_cache_get_stats(state: State<'_, AppState>) -> serde_json::Value {
    state.image_cache.get_stats()
}

#[tauri::command]
fn image_cache_clear(state: State<'_, AppState>) -> serde_json::Value {
    state.image_cache.clear()
}

#[tauri::command]
async fn image_cache_preload(state: State<'_, AppState>, urls: Vec<String>) -> Result<serde_json::Value, String> {
    state.image_cache.preload(urls).await;
    Ok(serde_json::json!({ "success": true }))
}

// ================= Shell =================
#[tauri::command]
async fn shell_open_external(app: AppHandle, url: String) -> Result<serde_json::Value, String> {
    app.opener().open_url(&url, None::<&str>).map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "success": true }))
}

// ================= Main Entry Point =================
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let store = Arc::new(StoreManager::new());
    let image_cache = Arc::new(ImageCacheManager::new(store.clone()));
    let scraper = Arc::new(FlingScraper::new(store.clone()));
    let downloader = Arc::new(Downloader::new(store.clone()));

    let app_state = AppState {
        store: store.clone(),
        image_cache: image_cache.clone(),
        scraper: scraper.clone(),
        downloader: downloader.clone(),
    };

    let img_cache_for_protocol = image_cache.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .register_uri_scheme_protocol("fl-img", move |_app, request| {
            let uri = request.uri().to_string();
            let img_cache = img_cache_for_protocol.clone();

            let target_url = if let Some(idx) = uri.find("url=") {
                let encoded = &uri[idx + 4..];
                urlencoding::decode(encoded).unwrap_or_default().to_string()
            } else {
                String::new()
            };

            if target_url.is_empty() {
                return tauri::http::Response::builder()
                    .status(400)
                    .body(Vec::new())
                    .unwrap();
            }

            // Sync or cached fetch
            let cache_path = img_cache.get_cache_path(&target_url);
            if cache_path.exists() {
                if let Ok(bytes) = std::fs::read(&cache_path) {
                    let ext = cache_path.extension().unwrap_or_default().to_string_lossy().to_lowercase();
                    let mime = match ext.as_str() {
                        "png" => "image/png",
                        "webp" => "image/webp",
                        "gif" => "image/gif",
                        _ => "image/jpeg",
                    };

                    return tauri::http::Response::builder()
                        .status(200)
                        .header("Content-Type", mime)
                        .header("Access-Control-Allow-Origin", "*")
                        .body(bytes)
                        .unwrap();
                }
            }

            // Fallback: spawn async fetch in runtime
            let bytes = tauri::async_runtime::block_on(async move {
                img_cache.get_image_bytes(&target_url).await
            });

            if let Some((data, mime)) = bytes {
                tauri::http::Response::builder()
                    .status(200)
                    .header("Content-Type", mime)
                    .header("Access-Control-Allow-Origin", "*")
                    .body(data)
                    .unwrap()
            } else {
                tauri::http::Response::builder()
                    .status(404)
                    .body(Vec::new())
                    .unwrap()
            }
        })
        .setup(|app| {
            // System Tray Setup
            let open_item = MenuItem::with_id(app, "open", "打开 FLiNG Box", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("FLiNG Box (风灵盒子)")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            window_minimize,
            window_maximize,
            window_close,
            window_is_maximized,
            scraper_get_recent,
            scraper_search,
            scraper_get_az,
            scraper_get_popular,
            scraper_get_details,
            scraper_translate_text,
            scraper_translate_game_title,
            download_start,
            download_cancel,
            download_get_list,
            download_clear_completed,
            download_remove,
            download_extract,
            download_launch,
            download_open_folder,
            library_get_all,
            library_save_item,
            library_remove_item,
            library_get_favorites,
            library_toggle_favorite,
            library_is_favorite,
            settings_get,
            settings_save,
            settings_test_proxy,
            dialog_select_folder,
            image_cache_get_stats,
            image_cache_clear,
            image_cache_preload,
            shell_open_external,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
