// main.rs
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod cloudinary;
mod downloadmanager;
mod plugin;
mod state;
mod archiver;

use plugin::{PluginRegistry, PluginManifest, PluginFunction};
use crate::state::{AppState, CloudinaryConfig, save_state_to_file, DownloadedGameInfo};
use tauri::{Manager, State, Emitter, AppHandle};
use tauri_plugin_notification::NotificationExt;
use downloadmanager::{execute_plugin as execute_download_plugin, DownloadError};
use std::collections::HashMap;
use std::sync::{Mutex, RwLock};
use url::Url;
use std::fs;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::process::Command;
use tokio_util::sync::CancellationToken;

#[derive(Default)]
pub struct ActiveDownloads {
    downloads: HashMap<String, DownloadInfo>,
    tokens: HashMap<String, CancellationToken>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct DownloadInfo {
    id: String,
    filename: String,
    url: String,
    progress: f32,
    status: String,
    path: Option<String>,
    error: Option<String>,
    provider: Option<String>,
}

#[tauri::command]
async fn unarchive_file(file_path: String, output_dir: String) -> Result<(), String> {
    archiver::unarchive_file(&file_path, &output_dir)
        .map_err(|e| match e {
            archiver::ArchiveError::Io(msg) => format!("IO error: {}", msg),
            archiver::ArchiveError::UnsupportedFormat(msg) => format!("Unsupported format: {}", msg),
            archiver::ArchiveError::InvalidArchive(msg) => format!("Invalid archive: {}", msg),
        })
}

#[tauri::command]
async fn check_path_exists(path: String) -> Result<bool, String> {
    Ok(std::path::Path::new(&path).exists())
}

#[tauri::command]
async fn download_file(
    url: String,
    filename: String,
    download_id: String,
    state: State<'_, Mutex<AppState>>,
    app: AppHandle,
    plugin_registry: State<'_, Mutex<PluginRegistry>>,
) -> Result<String, String> {
    let download_dir = {
        let app_state = state.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
        app_state.download_dir.clone().ok_or("Download directory not set")?
    };

    let parsed_url = Url::parse(&url).map_err(|e| format!("Invalid URL: {}", e))?;
    let host = parsed_url.host_str().ok_or("No host in URL")?;

    let plugin = {
        let plugin_registry = plugin_registry.lock().map_err(|e| format!("Failed to lock plugin registry: {}", e))?;
        plugin_registry
            .find_plugins_by_function(PluginFunction::Download)
            .into_iter()
            .find(|manifest| {
                manifest.supported_hosts.iter().any(|supported| {
                    if supported.starts_with("*.") {
                        host.to_lowercase().ends_with(&supported[1..].to_lowercase())
                    } else {
                        supported.to_lowercase() == host.to_lowercase()
                    }
                })
            })
            .cloned()
            .ok_or_else(|| format!("No download plugin found for host: {}", host))?
    };

    let cancel_token = CancellationToken::new();

    {
        let active_downloads = app.state::<RwLock<ActiveDownloads>>();
        let mut downloads = active_downloads
            .write()
            .map_err(|e| format!("Failed to write active downloads: {}", e))?;
        downloads.tokens.insert(download_id.clone(), cancel_token.clone());
    }

    execute_download_plugin(
        &plugin,
        "download",
        serde_json::json!({
            "url": url,
            "filename": filename,
            "download_id": download_id,
            "download_dir": download_dir
        }),
        &app,
        cancel_token,
    )
    .await
    .map_err(|e| match e {
        DownloadError::InvalidUrl(msg) => format!("Invalid URL: {}", msg),
        DownloadError::UnsupportedProvider(msg) => format!("Unsupported provider: {}", msg),
        DownloadError::DownloadFailed(msg) => format!("Download failed: {}", msg),
    })
}

#[tauri::command]
fn echo_test(message: String) -> String {
    println!("Echo test received: {}", message);
    format!("Echo reply: {}", message)
}

#[tauri::command]
fn verify_config_exists(app: AppHandle) -> Result<String, String> {
    state::verify_config_file(&app).map(|_| "Config file verified successfully".to_string())
}

#[tauri::command]
fn show_download_notification(
    app: AppHandle,
    title: String,
    message: String,
) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(message)
        .show()
        .map_err(|e| format!("Failed to show notification: {}", e))?;
    Ok(())
}

#[tauri::command]
fn set_token(
    token: String,
    state: State<'_, Mutex<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    let mut app_state = state.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state.token = Some(token);
    save_state_to_file(&app, &app_state)?;
    Ok(())
}

#[tauri::command]
fn get_token(state: State<'_, Mutex<AppState>>) -> Result<Option<String>, String> {
    let app_state = state.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    Ok(app_state.token.clone())
}

#[tauri::command]
fn set_cloudinary_config(
    cloud_name: String,
    api_key: String,
    api_secret: String,
    state: State<'_, Mutex<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    let mut app_state = state.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    let config = CloudinaryConfig {
        cloud_name,
        api_key,
        api_secret,
    };
    app_state.cloudinary = Some(config);
    save_state_to_file(&app, &app_state)?;
    Ok(())
}

#[tauri::command]
fn get_cloudinary_config(
    state: State<'_, Mutex<AppState>>,
) -> Result<Option<CloudinaryConfig>, String> {
    let app_state = state.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    Ok(app_state.cloudinary.clone())
}

#[tauri::command]
fn save_all_settings(
    token: String,
    cloudinary_config: state::CloudinaryConfig,
    state: State<'_, Mutex<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    let mut app_state = state.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state.token = Some(token);
    app_state.cloudinary = Some(CloudinaryConfig {
        cloud_name: cloudinary_config.cloud_name,
        api_key: cloudinary_config.api_key,
        api_secret: cloudinary_config.api_secret,
    });
    save_state_to_file(&app, &app_state)?;
    Ok(())
}

#[tauri::command]
async fn upload_to_cloudinary(
    file_path: String,
    public_id: Option<String>,
    state: State<'_, Mutex<AppState>>,
) -> Result<String, String> {
    let cloudinary_config = {
        let app_state = state.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
        app_state
            .cloudinary
            .as_ref()
            .ok_or("Cloudinary config not set")?
            .clone()
    };
    cloudinary::upload_to_cloudinary(file_path, public_id, &cloudinary_config).await
}

#[tauri::command]
fn open_directory(path: String, app: AppHandle) -> Result<(), String> {
    let path_obj = std::path::Path::new(&path);
    if !path_obj.exists() {
        return Err("Directory does not exist".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
async fn fetch_article_by_slug(
    slug: String,
    token: Option<String>,
) -> Result<state::ArticleResponse, String> {
    state::fetch_article_by_slug(slug, token).await
}

#[tauri::command]
fn get_download_dir(app: AppHandle) -> Result<String, String> {
    let state = app.state::<Mutex<AppState>>();
    let app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state
        .download_dir
        .clone()
        .ok_or_else(|| "Download directory not set".to_string())
}

#[tauri::command]
fn set_download_dir(
    dir: String,
    state: State<'_, Mutex<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    let mut app_state = state.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state.download_dir = Some(dir.clone());
    save_state_to_file(&app, &app_state)?;
    println!("Download directory set to: {}", dir);
    Ok(())
}

pub fn update_download_progress(
    app: &AppHandle,
    download_id: &str,
    progress: f32,
) {
    {
        let active_downloads = app.state::<RwLock<ActiveDownloads>>();
        let mut downloads = active_downloads.write().expect("Failed to acquire write lock");
        if let Some(download) = downloads.downloads.get_mut(download_id) {
            download.status = "downloading".to_string();
            download.progress = progress;
        }
    }

    let _ = app.emit(
        "download-progress",
        &serde_json::json!({
            "id": download_id,
            "progress": progress
        }),
    );
}

#[tauri::command]
fn get_plugin_ids(plugin_registry: State<'_, Mutex<PluginRegistry>>) -> Result<Vec<String>, String> {
    let plugin_registry = plugin_registry.lock().map_err(|e| format!("Failed to lock plugin registry: {}", e))?;
    Ok(plugin_registry.get_plugin_ids().into_iter().map(|s| s.to_string()).collect())
}

#[tauri::command]
fn get_active_downloads(
    active_downloads: State<'_, RwLock<ActiveDownloads>>,
) -> Result<Vec<DownloadInfo>, String> {
    let downloads = active_downloads
        .read()
        .map_err(|e| format!("Failed to read active downloads: {}", e))?;
    Ok(downloads.downloads.values().cloned().collect())
}

#[tauri::command]
fn open_file(path: String, _app: AppHandle) -> Result<(), String> {
    let path_obj = std::path::Path::new(&path);
    if !path_obj.exists() {
        return Err("File does not exist".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/c", "start", "", path_obj.to_str().unwrap()])
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
async fn download_from_url(
    url: String,
    download_id: Option<String>,
    app: AppHandle,
) -> Result<(), String> {
    println!("Initiating download from URL: {}", url);

    let url_path = url.split('?').next().unwrap_or(&url);
    let filename = url_path.split('/').last().unwrap_or("download.bin").to_string();

    let download_id = download_id.unwrap_or_else(|| format!("manual_download_{}", chrono::Utc::now().timestamp()));

    let state = app.state::<Mutex<AppState>>();
    let download_dir = {
        let app_state = state.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
        app_state.download_dir.clone().ok_or("Download directory not set")?
    };

    {
        let active_downloads = app.state::<RwLock<ActiveDownloads>>();
        let mut downloads = active_downloads
            .write()
            .map_err(|e| format!("Failed to write to active downloads: {}", e))?;

        let provider = {
            let plugin_registry = app.state::<Mutex<PluginRegistry>>();
            let plugin_registry = plugin_registry.lock().map_err(|e| format!("Failed to lock plugin registry: {}", e))?;
            let parsed_url = Url::parse(&url)
                .map_err(|e| format!("Invalid URL: {}", e))?;

            if let Some(host) = parsed_url.host_str() {
                plugin_registry.find_plugins_by_function(PluginFunction::Download)
                    .into_iter()
                    .find(|manifest| {
                        manifest.supported_hosts.iter().any(|supported| {
                            if supported.starts_with("*.") {
                                host.to_lowercase().ends_with(&supported[1..].to_lowercase())
                            } else {
                                supported.to_lowercase() == host.to_lowercase()
                            }
                        })
                    })
                    .map(|plugin| plugin.id.clone())
            } else {
                None
            }
        };

        downloads.downloads.insert(download_id.clone(), DownloadInfo {
            id: download_id.clone(),
            filename: filename.clone(),
            url: url.clone(),
            progress: 0.0,
            status: "pending".to_string(),
            path: None,
            error: None,
            provider,
        });

        downloads.tokens.insert(download_id.clone(), CancellationToken::new());
    }

    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        let result = download_file(
            url,
            filename.clone(),
            download_id.clone(),
            app_handle.state::<Mutex<AppState>>(),
            app_handle.clone(),
            app_handle.state::<Mutex<PluginRegistry>>(),
        ).await;

        {
            let active_downloads = app_handle.state::<RwLock<ActiveDownloads>>();
            let mut downloads = match active_downloads.write() {
                Ok(guard) => guard,
                Err(e) => {
                    println!("Failed to lock active downloads: {}", e);
                    return;
                }
            };

            match result {
                Ok(path) => {
                    if let Some(download) = downloads.downloads.get_mut(&download_id) {
                        download.status = "completed".to_string();
                        download.progress = 100.0;
                        download.path = Some(path.clone());
                    }

                    if let Err(e) = show_download_notification(
                        app_handle.clone(),
                        "Download Complete".to_string(),
                        format!("Downloaded: {}", filename),
                    ) {
                        println!("Failed to show notification: {}", e);
                    }
                    println!("Download completed: {}", path);

                    if let Err(e) = app_handle.emit(
                        "download-complete",
                        &serde_json::json!({
                            "id": download_id,
                            "filename": filename,
                            "path": path
                        }),
                    ) {
                        println!("Failed to emit download complete event: {}", e);
                    }
                }
                Err(e) => {
                    if let Some(download) = downloads.downloads.get_mut(&download_id) {
                        download.status = "failed".to_string();
                        download.error = Some(e.clone());
                    }

                    println!("Download failed: {}", e);
                    if let Err(e) = show_download_notification(
                        app_handle.clone(),
                        "Download Failed".to_string(),
                        format!("Failed to download: {}", filename),
                    ) {
                        println!("Failed to show notification: {}", e);
                    }

                    if let Err(e) = app_handle.emit(
                        "download-error",
                        &serde_json::json!({
                            "id": download_id,
                            "filename": filename,
                            "error": e
                        }),
                    ) {
                        println!("Failed to emit download error event: {}", e);
                    }
                }
            }

            downloads.tokens.remove(&download_id);
        }
    });

    Ok(())
}

#[tauri::command]
fn save_games(
    games: Vec<DownloadInfo>,
    state: State<'_, Mutex<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    let mut app_state = state.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    let converted_games: Vec<DownloadedGameInfo> = games.into_iter().map(|game| DownloadedGameInfo {
        id: game.id,
        filename: game.filename,
        path: game.path.unwrap_or_default(),
        extracted: false,
        extracted_path: None,
    }).collect();
    app_state.games = Some(converted_games);
    save_state_to_file(&app, &app_state)?;
    println!("Games saved successfully to config");
    Ok(())
}

#[tauri::command]
fn get_saved_games(
    state: State<'_, Mutex<AppState>>,
) -> Result<Vec<DownloadInfo>, String> {
    let app_state = state.lock().map_err(|e| format!("Failed to lock state: {}", e))?;
    let games = app_state.games.clone().unwrap_or_default();
    let converted_games: Vec<DownloadInfo> = games.into_iter().map(|game| DownloadInfo {
        id: game.id,
        filename: game.filename,
        url: "".to_string(),
        progress: 100.0,
        status: "completed".to_string(),
        path: Some(game.path),
        error: None,
        provider: None,
    }).collect();
    Ok(converted_games)
}

#[tauri::command]
async fn cancel_active_download(download_id: String, app: AppHandle) -> Result<(), String> {
    println!("Cancellation requested for download: {}", download_id);
    let active_downloads = app.state::<RwLock<ActiveDownloads>>();
    let mut downloads = active_downloads
        .write()
        .map_err(|e| format!("Failed to lock active downloads: {}", e))?;

    app.emit(
        "cancel-download",
        &serde_json::json!({ "download_id": download_id }),
    ).map_err(|e| format!("Failed to emit cancel-download event: {}", e))?;

    if let Some(token) = downloads.tokens.remove(&download_id) {
        token.cancel();
        if let Some(download) = downloads.downloads.get_mut(&download_id) {
            download.status = "cancelled".to_string();
            download.progress = 0.0;
            download.error = Some("Download cancelled by user".to_string());
        }

        show_download_notification(
            app.clone(),
            "Download Cancelled".to_string(),
            format!("Download {} was cancelled", download_id),
        )?;

        println!("Download {} cancelled successfully", download_id);
        Ok(())
    } else {
        Err(format!("No active download found for id: {}", download_id))
    }
}

#[tauri::command]
async fn remove_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| format!("Failed to remove file: {}", e))?;
    Ok(())
}

#[tauri::command]
fn get_plugin_details(
    plugin_id: String,
    plugin_registry: State<'_, Mutex<PluginRegistry>>,
) -> Result<PluginManifest, String> {
    let plugin_registry = plugin_registry.lock().map_err(|e| format!("Failed to lock plugin registry: {}", e))?;
    plugin_registry
        .get_plugin(&plugin_id)
        .cloned()
        .ok_or_else(|| format!("Plugin {} not found", plugin_id))
}

#[tauri::command]
fn get_all_plugins(
    plugin_registry: State<'_, Mutex<PluginRegistry>>,
) -> Result<HashMap<String, PluginManifest>, String> {
    let plugin_registry = plugin_registry.lock().map_err(|e| format!("Failed to lock plugin registry: {}", e))?;
    Ok(plugin_registry.get_all_plugins().clone())
}

#[tauri::command]
async fn add_plugin(
    manifest: PluginManifest,
    plugin_registry: State<'_, Mutex<PluginRegistry>>,
    app: AppHandle,
) -> Result<(), String> {
    let plugins_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))?
        .join("plugins");

    if !plugins_dir.exists() {
        fs::create_dir_all(&plugins_dir)
            .map_err(|e| format!("Failed to create plugins directory: {}", e))?;
    }

    let manifest_path = plugins_dir.join(format!("{}.json", manifest.id));
    let manifest_json = serde_json::to_string_pretty(&manifest)
        .map_err(|e| format!("Failed to serialize manifest: {}", e))?;
    fs::write(&manifest_path, manifest_json)
        .map_err(|e| format!("Failed to write manifest: {}", e))?;

    let mut plugin_registry = plugin_registry.lock().map_err(|e| format!("Failed to lock plugin registry: {}", e))?;
    plugin_registry.register_plugin(manifest);
    Ok(())
}

#[tauri::command]
async fn remove_plugin(
    plugin_id: String,
    plugin_registry: State<'_, Mutex<PluginRegistry>>,
    app: AppHandle,
) -> Result<(), String> {
    let plugins_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to get resource directory: {}", e))?
        .join("plugins");
    let manifest_path = plugins_dir.join(format!("{}.json", plugin_id));

    if manifest_path.exists() {
        fs::remove_file(&manifest_path)
            .map_err(|e| format!("Failed to remove plugin file: {}", e))?;
    }

    let mut plugin_registry = plugin_registry.lock().map_err(|e| format!("Failed to lock plugin registry: {}", e))?;
    plugin_registry.remove_plugin(&plugin_id);
    Ok(())
}

#[tauri::command]
fn register_manual_download(
    download_id: String,
    filename: String,
    path: String,
    active_downloads: State<'_, RwLock<ActiveDownloads>>,
) -> Result<(), String> {
    println!("Manually registered download: {} at {}", download_id, path);
    let mut downloads = active_downloads
        .write()
        .map_err(|e| format!("Failed to write active downloads: {}", e))?;
    downloads.downloads.insert(
        download_id.clone(),
        DownloadInfo {
            id: download_id,
            filename,
            url: "".to_string(),
            progress: 100.0,
            status: "completed".to_string(),
            path: Some(path),
            error: None,
            provider: None,
        },
    );
    Ok(())
}

#[tauri::command]
async fn execute_plugin_action(
    plugin_id: String,
    action: String,
    input: Value,
    app: AppHandle,
    plugin_registry: State<'_, Mutex<PluginRegistry>>,
) -> Result<Value, String> {
    let plugin = {
        let registry = plugin_registry.lock().map_err(|e| format!("Failed to lock registry: {}", e))?;
        registry.get_plugin(&plugin_id)
            .cloned()
            .ok_or_else(|| format!("Plugin {} not found", plugin_id))?
    };

    plugin::execute_plugin(&plugin, &action, input, &app, CancellationToken::new())
        .await
        .map_err(|e| format!("Plugin execution failed: {}", e))
}

fn main() {
    let plugin_registry = PluginRegistry::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .setup(move |app| {
            let app_handle = app.handle().clone();

            let plugins_dir = app
                .path()
                .resource_dir()
                .map_err(|e| format!("Failed to get resource directory: {}", e))?
                .join("plugins");
            println!("Attempting to load plugins from: {:?}", plugins_dir);

            let mut plugin_registry = plugin_registry;
            if let Err(e) = plugin_registry.load_plugins(plugins_dir.to_str().ok_or("Invalid plugins directory path")?){
                println!("Failed to load plugins from directory: {}", e);
            }

            println!("Available plugins after registration: {:?}", plugin_registry.get_plugin_ids());
            plugin_registry.print_registered_plugins();

            let initial_state = match state::load_state_from_file(&app_handle) {
                Ok(loaded_state) => {
                    println!("Loaded state successfully: {:?}", loaded_state);
                    loaded_state
                }
                Err(e) => {
                    println!("Failed to load state: {}. Using default state.", e);
                    let default_state = AppState::default();
                    if let Err(save_err) = state::save_state_to_file(&app_handle, &default_state) {
                        println!("Failed to save default state: {}", save_err);
                    }
                    default_state
                }
            };

            app.manage(Mutex::new(initial_state));
            app.manage(Mutex::new(plugin_registry));
            app.manage(RwLock::new(ActiveDownloads::default()));

            if let Ok(mut app_state) = app.state::<Mutex<AppState>>().lock() {
                if app_state.download_dir.is_none() {
                    app_state.download_dir = state::get_default_download_dir(&app_handle);
                    if let Err(e) = state::save_state_to_file(&app_handle, &app_state) {
                        println!("Failed to save default download directory: {}", e);
                    }
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            echo_test,
            set_token,
            get_token,
            set_cloudinary_config,
            get_cloudinary_config,
            save_all_settings,
            upload_to_cloudinary,
            fetch_article_by_slug,
            get_download_dir,
            set_download_dir,
            verify_config_exists,
            download_file,
            show_download_notification,
            open_directory,
            download_from_url,
            cancel_active_download,
            get_plugin_ids,
            get_active_downloads,
            open_file,
            remove_file,
            get_plugin_details,
            get_all_plugins,
            add_plugin,
            remove_plugin,
            unarchive_file,
            check_path_exists,
            save_games,
            get_saved_games,
            register_manual_download,
            execute_plugin_action
        ])
        .on_window_event(|app, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let app_handle = app.app_handle().clone();
                if let Ok(app_state) = app.state::<Mutex<AppState>>().lock() {
                    if let Err(e) = state::save_state_to_file(&app_handle, &app_state) {
                        println!("Failed to save state on close: {}", e);
                    } else {
                        println!("State saved successfully on close");
                    }
                } else {
                    println!("Failed to lock state on close");
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}