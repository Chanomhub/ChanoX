use crate::state::{save_state_to_file, AppState, ArticleResponse, DownloadedGameInfo, LaunchConfig};
use crate::types::{ActiveDownloads, DownloadInfo, PluginManifest, PluginRegistry};
use crate::utils::{is_path_directory, path_exists};
use std::fs;
use std::path::Path;
use std::process::Command as StdCommand;
use std::sync::{Mutex, RwLock};
use tauri::{AppHandle, Manager, State};

// Basic utility commands
#[tauri::command]
pub fn echo_test(message: String) -> String {
    format!("Echo reply: {}", message)
}

#[tauri::command]
pub async fn check_path_exists(path: String) -> Result<bool, String> {
    Ok(path_exists(&path))
}

#[tauri::command]
pub fn is_directory(path: String) -> Result<bool, String> {
    is_path_directory(&path)
}

#[tauri::command]
pub fn verify_config_exists(app: AppHandle) -> Result<String, String> {
    crate::state::verify_config_file(&app).map(|_| "Config file verified successfully".to_string())
}

// File operations
#[tauri::command]
pub fn remove_file(path: String) -> Result<(), String> {
    let path_obj = Path::new(&path);
    if !path_obj.exists() {
        return Err("File does not exist".to_string());
    }
    fs::remove_file(path_obj).map_err(|e| format!("Failed to remove file: {}", e))
}

#[tauri::command]
pub fn open_file(path: String, _app: AppHandle) -> Result<(), String> {
    let path_obj = Path::new(&path);
    if !path_obj.exists() {
        return Err("File does not exist".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        StdCommand::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        StdCommand::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        StdCommand::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn open_directory(path: String, _app: AppHandle) -> Result<(), String> {
    let path_obj = Path::new(&path);
    if !path_obj.exists() {
        return Err("Directory does not exist".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        StdCommand::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        StdCommand::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        StdCommand::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;
    }

    Ok(())
}

// State management commands
#[tauri::command]
pub fn set_token(
    token: String,
    state: State<'_, Mutex<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    let mut app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state.token = Some(token);
    save_state_to_file(&app, &app_state)?;
    Ok(())
}

#[tauri::command]
pub fn get_token(state: State<'_, Mutex<AppState>>) -> Result<Option<String>, String> {
    let app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    Ok(app_state.token.clone())
}



#[tauri::command]
pub fn save_all_settings(
    token: String,
    state: State<'_, Mutex<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    let mut app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state.token = Some(token);
    save_state_to_file(&app, &app_state)?;
    Ok(())
}

#[tauri::command]
pub fn get_download_dir(app: AppHandle) -> Result<String, String> {
    let state = app.state::<Mutex<AppState>>();
    let app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    
    match &app_state.download_dir {
        Some(dir) => Ok(dir.clone()),
        None => crate::state::get_default_download_dir(&app)
            .ok_or_else(|| "Failed to get default download directory".to_string()),
    }
}

#[tauri::command]
pub fn set_download_dir(
    dir: String,
    state: State<'_, Mutex<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    let mut app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state.download_dir = Some(dir);
    save_state_to_file(&app, &app_state)?;
    Ok(())
}



// Article commands
#[tauri::command]
pub async fn fetch_article_by_slug(
    slug: String,
    token: Option<String>,
) -> Result<ArticleResponse, String> {
    crate::state::fetch_article_by_slug(slug, token).await
}
// Plugin commands
#[tauri::command]
pub fn get_all_plugins(registry: State<'_, Mutex<PluginRegistry>>) -> Result<Vec<PluginManifest>, String> {
    let registry = registry
        .lock()
        .map_err(|e| format!("Failed to lock plugin registry: {}", e))?;
    Ok(registry.get_all_plugins().values().cloned().collect())
}

#[tauri::command]
pub fn get_plugin_ids(registry: State<'_, Mutex<PluginRegistry>>) -> Result<Vec<String>, String> {
    let registry = registry
        .lock()
        .map_err(|e| format!("Failed to lock plugin registry: {}", e))?;
    Ok(registry.get_plugin_ids().into_iter().cloned().collect())
}

#[tauri::command]
pub fn install_plugin(
    _manifest: PluginManifest,
    _app: AppHandle,
    _active_downloads: State<'_, RwLock<ActiveDownloads>>,
    _registry: State<'_, Mutex<PluginRegistry>>,
) -> Result<(), String> {
    // TODO: Implement plugin installation logic
    Err("Plugin installation not yet implemented".to_string())
}

#[tauri::command]
pub fn remove_plugin(
    plugin_id: String,
    app: AppHandle,
    registry: State<'_, Mutex<PluginRegistry>>,
) -> Result<(), String> {
    let mut registry = registry
        .lock()
        .map_err(|e| format!("Failed to lock plugin registry: {}", e))?;
    registry.remove_plugin(&plugin_id);
    Ok(())
}

// Download commands
#[tauri::command]
pub async fn unarchive_file(
    file_path: String,
    output_dir: String,
    download_id: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    crate::downloads::unarchive_file(file_path, output_dir, download_id, app).await
}

#[tauri::command]
pub fn get_active_downloads(
    active_downloads: tauri::State<'_, std::sync::RwLock<ActiveDownloads>>,
) -> Result<Vec<DownloadInfo>, String> {
    crate::downloads::get_active_downloads(active_downloads)
}

#[tauri::command]
pub fn register_manual_download(
    download_id: String,
    filename: String,
    path: String,
    active_downloads: tauri::State<'_, std::sync::RwLock<ActiveDownloads>>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    crate::downloads::register_manual_download(download_id, filename, path, active_downloads, app)
}

#[tauri::command]
pub fn show_download_notification(
    app: tauri::AppHandle,
    title: String,
    message: String,
) -> Result<(), String> {
    crate::downloads::show_download_notification(app, title, message)
}

// Game commands
#[tauri::command]
pub async fn extract_icon(app: tauri::AppHandle, executable_path: String) -> Result<String, String> {
    crate::games::extract_icon(app, executable_path).await
}

#[tauri::command]
pub fn get_saved_games(
    state: tauri::State<'_, std::sync::Mutex<AppState>>,
    app: tauri::AppHandle,
) -> Result<Vec<DownloadedGameInfo>, String> {
    crate::games::get_saved_games(state, app)
}

#[tauri::command]
pub async fn launch_game(
    app: tauri::AppHandle,
    game_id: String,
    launch_config: Option<LaunchConfig>,
    state: tauri::State<'_, std::sync::Mutex<AppState>>,
) -> Result<(), String> {
    crate::games::launch_game(app, game_id, launch_config, state).await
}

#[tauri::command]
pub fn save_games(
    games: Vec<DownloadInfo>,
    state: tauri::State<'_, std::sync::Mutex<AppState>>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    crate::games::save_games(games, state, app)
}

#[tauri::command]
pub async fn save_launch_config(
    game_id: String,
    launch_config: LaunchConfig,
    icon_path: Option<String>,
    state: tauri::State<'_, std::sync::Mutex<AppState>>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    crate::games::save_launch_config(game_id, launch_config, icon_path, state, app).await
}

#[tauri::command]
pub async fn select_game_executable(app: tauri::AppHandle, game_id: String) -> Result<String, String> {
    crate::games::select_game_executable(app, game_id).await
}