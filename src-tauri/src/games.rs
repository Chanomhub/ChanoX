use crate::state::{save_state_to_file, AppState, DownloadedGameInfo, LaunchConfig};
use std::fs;
use std::path::Path;
use std::process::Command as StdCommand;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

pub async fn select_game_executable(app: AppHandle, _game_id: String) -> Result<String, String> {
    let dialog = app
        .dialog()
        .file()
        .add_filter("Executable Files", &["exe", "py", "sh"]);
    let result = dialog.blocking_pick_file();

    match result {
        Some(file_path) => {
            let path_str = file_path.to_string();
            Ok(path_str)
        }
        None => Err("No file selected".to_string()),
    }
}

pub async fn launch_game(
    _app: AppHandle,
    game_id: String,
    launch_config: Option<LaunchConfig>,
    state: State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    let app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;

    let stored_launch_config = app_state.games.as_ref().and_then(|games| {
        games
            .iter()
            .find(|g| g.id == game_id)
            .and_then(|game| game.launch_config.clone())
    });

    let launch_config = stored_launch_config
        .or(launch_config)
        .ok_or("No launch configuration provided or found")?;

    let executable_path = &launch_config.executable_path;
    let path_obj = Path::new(executable_path);

    if !path_obj.exists() {
        return Err("Executable does not exist".to_string());
    }

    let launch_method = &launch_config.launch_method;
    match launch_method.as_str() {
        "direct" => {
            #[cfg(target_os = "windows")]
            {
                StdCommand::new(executable_path)
                    .spawn()
                    .map_err(|e| format!("Failed to launch: {}", e))?;
            }
            #[cfg(not(target_os = "windows"))]
            {
                return Err("Direct launch only supported on Windows".to_string());
            }
        }
        "python" => {
            let python_check = StdCommand::new("python3").arg("--version").output();
            if python_check.is_err() {
                return Err("Python3 is not installed".to_string());
            }
            StdCommand::new("python3")
                .arg(executable_path)
                .spawn()
                .map_err(|e| format!("Failed to launch Python script: {}", e))?;
        }
        "wine" => {
            #[cfg(not(target_os = "windows"))]
            {
                let wine_check = StdCommand::new("wine").arg("--version").output();
                if wine_check.is_err() {
                    return Err("Wine is not installed".to_string());
                }
                StdCommand::new("wine")
                    .arg(executable_path)
                    .spawn()
                    .map_err(|e| format!("Failed to launch with Wine: {}", e))?;
            }
            #[cfg(target_os = "windows")]
            {
                return Err("Wine not needed on Windows".to_string());
            }
        }
        "custom" => {
            if let Some(cmd) = &launch_config.custom_command {
                StdCommand::new("sh")
                    .arg("-c")
                    .arg(cmd)
                    .spawn()
                    .map_err(|e| format!("Failed to launch custom command: {}", e))?;
            } else {
                return Err("Custom command not provided".to_string());
            }
        }
        _ => return Err("Invalid launch method".to_string()),
    }

    Ok(())
}

pub async fn extract_icon(app: AppHandle, executable_path: String) -> Result<String, String> {
    let path_obj = Path::new(&executable_path);
    if !path_obj.exists() {
        return Err("Executable does not exist".to_string());
    }

    let icon_path = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("icons")
        .join(format!("{}.png", Uuid::new_v4()));

    fs::create_dir_all(icon_path.parent().unwrap())
        .map_err(|e| format!("Failed to create icons dir: {}", e))?;

    #[cfg(target_os = "windows")]
    {
        // For now, just use a default icon approach
        let default_icon = app
            .path()
            .resource_dir()
            .map_err(|e| format!("Failed to get resource dir: {}", e))?
            .join("default_icon.png");
        if default_icon.exists() {
            fs::copy(&default_icon, &icon_path)
                .map_err(|e| format!("Failed to copy default icon: {}", e))?;
        } else {
            // Create a simple placeholder file
            fs::write(&icon_path, b"placeholder")
                .map_err(|e| format!("Failed to create placeholder icon: {}", e))?;
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let default_icon = app
            .path()
            .resource_dir()
            .map_err(|e| format!("Failed to get resource dir: {}", e))?
            .join("default_icon.png");
        if default_icon.exists() {
            fs::copy(&default_icon, &icon_path)
                .map_err(|e| format!("Failed to copy default icon: {}", e))?;
        } else {
            return Err("Default icon not found".to_string());
        }
    }

    Ok(icon_path
        .to_str()
        .ok_or("Failed to convert path to string")?
        .to_string())
}

pub async fn save_launch_config(
    game_id: String,
    launch_config: LaunchConfig,
    icon_path: Option<String>,
    state: State<'_, Mutex<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    let mut app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    if app_state.games.is_none() {
        app_state.games = Some(Vec::new());
    }
    if let Some(games) = app_state.games.as_mut() {
        if let Some(game) = games.iter_mut().find(|g| g.id == game_id) {
            game.launch_config = Some(launch_config.clone());
            game.icon_path = icon_path.clone();
        } else {
            return Err(format!("Game with id {} not found", game_id));
        }
    }
    save_state_to_file(&app, &app_state)?;
    Ok(())
}

pub fn get_saved_games(
    state: State<'_, Mutex<AppState>>,
    app: AppHandle,
) -> Result<Vec<DownloadedGameInfo>, String> {
    let app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    
    match &app_state.games {
        Some(games) => Ok(games.clone()),
        None => Ok(Vec::new()),
    }
}

pub fn save_games(
    games: Vec<crate::types::DownloadInfo>,
    state: State<'_, Mutex<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    let mut app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    
    // Convert DownloadInfo to DownloadedGameInfo
    let game_infos: Vec<DownloadedGameInfo> = games
        .into_iter()
        .map(|download| DownloadedGameInfo {
            id: download.id,
            filename: download.filename,
            path: download.path.unwrap_or_default(),
            extracted: download.extracted,
            extracted_path: download.extracted_path,
            downloaded_at: download.downloaded_at,
            launch_config: None,
            icon_path: None,
        })
        .collect();
    
    app_state.games = Some(game_infos);
    save_state_to_file(&app, &app_state)?;
    Ok(())
}