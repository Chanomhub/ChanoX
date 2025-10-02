#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod archiver;
mod cloudinary;
mod state;
mod api;

use crate::state::{
    AppState, ArticleResponse, CloudinaryConfig, DownloadedGameInfo, LaunchConfig,
    cleanup_active_downloads, save_active_downloads_to_file, save_state_to_file,
};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::Value;
use std::collections::HashMap;
use std::fs::{self};
use std::path::{Path, PathBuf};
use std::process::{Command as StdCommand, Command};
use std::sync::{Mutex, RwLock};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use tokio_util::sync::CancellationToken;
use uuid::Uuid;
use std::process::Stdio;

fn sanitize_filename(filename: &str) -> String {
    let re = regex::Regex::new(r#"[^a-zA-Z0-9._-]"#).unwrap();
    re.replace_all(filename, "_").to_string()
}

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct ActiveDownloads {
    #[serde(default)]
    pub downloads: HashMap<String, DownloadInfo>,
    #[serde(skip)]
    pub tokens: HashMap<String, CancellationToken>,
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
    downloaded_at: Option<String>,
    extracted: bool,
    extracted_path: Option<String>,
    extraction_status: Option<String>,
    extraction_progress: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PluginFunction {
    Download,
    Translate,
    Emulation,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub supported_hosts: Vec<String>,
    pub entry_point: String,
    #[serde(rename = "type")]
    pub plugin_type: String,
    pub plugin_function: PluginFunction,
    #[serde(default)]
    pub external_binary: bool,
    #[serde(default)]
    pub language: Option<String>,
    #[serde(default)]
    pub successful: Option<String>,
    #[serde(default)]
    pub install_instruction: Option<String>,
    #[serde(default)]
    pub supported_actions: Vec<String>,
    #[serde(default)]
    pub category: String, // New: essential, optional
    #[serde(default)]
    pub download_url: Option<String>, // New: URL for downloading plugin
    #[serde(skip)]
    pub binary_path: Option<PathBuf>,
}

pub struct PluginRegistry {
    plugins: HashMap<String, PluginManifest>,
}

impl PluginRegistry {
    pub fn new() -> Self {
        PluginRegistry {
            plugins: HashMap::new(),
        }
    }

    pub fn load_plugins(&mut self, path: &str) -> Result<(), String> {
        let dir = fs::read_dir(path).map_err(|e| format!("Failed to read plugins directory: {}", e))?;
        let mut errors = Vec::new();

        for entry in dir {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let file_path = entry.path();
            if file_path.extension().map_or(false, |ext| ext == "json") {
                match fs::read_to_string(&file_path) {
                    Ok(content) => {
                        match serde_json::from_str::<PluginManifest>(&content) {
                            Ok(mut manifest) => {
                                if manifest.category.is_empty() {
                                    manifest.category = "optional".to_string();
                                }
                                if manifest.plugin_type == "script" {
                                    if manifest.external_binary {
                                        let program = manifest
                                            .entry_point
                                            .split_whitespace()
                                            .next()
                                            .unwrap_or(&manifest.entry_point);
                                        match find_external_binary(program, manifest.language.as_deref()) {
                                            Ok(binary_path) => {
                                                manifest.binary_path = Some(binary_path);
                                                self.register_plugin(manifest);
                                            }
                                            Err(e) => {
                                                errors.push(format!("External binary error for {}: {}", manifest.id, e));
                                                continue;
                                            }
                                        }
                                    } else {
                                        let program = manifest
                                            .entry_point
                                            .split_whitespace()
                                            .next()
                                            .unwrap_or(&manifest.entry_point);
                                        let script_path = Path::new(path).join(program);
                                        if !script_path.exists() {
                                            errors.push(format!(
                                                "Script file {} not found for plugin {}",
                                                script_path.display(),
                                                manifest.id
                                            ));
                                            continue;
                                        }
                                        self.register_plugin(manifest);
                                    }
                                } else {
                                    self.register_plugin(manifest);
                                }
                            }
                            Err(e) => errors.push(format!("Failed to parse plugin JSON {}: {}", file_path.display(), e)),
                        }
                    }
                    Err(e) => errors.push(format!("Failed to read plugin file {}: {}", file_path.display(), e)),
                }
            }
        }

        if !errors.is_empty() {
            return Err(errors.join("; "));
        }
        Ok(())
    }

    pub fn register_plugin(&mut self, manifest: PluginManifest) {
        self.plugins.insert(manifest.id.clone(), manifest);
    }

    pub fn find_plugins_by_function(&self, function: PluginFunction) -> Vec<&PluginManifest> {
        self.plugins
            .values()
            .filter(|manifest| manifest.plugin_function == function)
            .collect()
    }

    pub fn find_plugin_for_action(&self, action: &str, host: Option<&str>) -> Option<&PluginManifest> {
        self.plugins
            .values()
            .find(|manifest| {
                manifest.supported_actions.contains(&action.to_string()) &&
                host.map_or(true, |h| {
                    manifest.supported_hosts.iter().any(|supported| {
                        if supported.starts_with("*.") {
                            h.to_lowercase().ends_with(&supported[1..].to_lowercase())
                        } else {
                            supported.to_lowercase() == h.to_lowercase()
                        }
                    })
                })
            })
    }

    pub fn get_plugin_ids(&self) -> Vec<&String> {
        self.plugins.keys().collect()
    }

    pub fn get_plugin(&self, plugin_id: &str) -> Option<&PluginManifest> {
        self.plugins.get(plugin_id)
    }

    pub fn get_all_plugins(&self) -> &HashMap<String, PluginManifest> {
        &self.plugins
    }

    pub fn remove_plugin(&mut self, plugin_id: &str) {
        self.plugins.remove(plugin_id);
    }
}

pub async fn execute_plugin<T: DeserializeOwned>(
    manifest: &PluginManifest,
    _action: &str,
    input: Value,
    app: &tauri::AppHandle,
    _cancel_token: CancellationToken,
) -> Result<T, String> {
    match manifest.plugin_type.as_str() {
        "script" => {
            let plugins_path = get_plugins_path(app)?;
            let program = manifest.entry_point.split_whitespace().next().unwrap_or(&manifest.entry_point);
            let script_path = plugins_path.join(program);

            let mut cmd = if manifest.external_binary {
                Command::new(manifest.binary_path.as_ref().ok_or("Missing binary path")?)
            } else {
                let interpreter = manifest.language.as_deref().and_then(|lang| match lang {
                    "python" => Some("python"),
                    "bash" => Some("bash"),
                    "node" => Some("node"),
                    _ => None,
                });

                if let Some(interp) = interpreter {
                    Command::new(interp)
                } else {
                    Command::new(&script_path)
                }
            };

            cmd.args(shlex::split(&manifest.entry_point).unwrap_or_default().get(1..).unwrap_or(&[]))
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());

            let mut child = cmd.spawn().map_err(|e| format!("Failed to start plugin: {}", e))?;

            if let Some(stdin) = child.stdin.as_mut() {
                serde_json::to_writer(stdin, &input)
                    .map_err(|e| format!("Failed to write to plugin: {}", e))?;
            }

            let output = child
                .wait_with_output()
                .map_err(|e| format!("Plugin execution failed: {}", e))?;

            let stdout = strip_ansi_codes(&String::from_utf8_lossy(&output.stdout));

            serde_json::from_str(&stdout)
                .map_err(|e| format!("Invalid plugin output: {} - Raw output: {}", e, stdout))
        }
        "command" => {
            let command = manifest.entry_point
                .replace("{{input}}", &serde_json::to_string(&input).unwrap_or_default());
            let parts = shlex::split(&command).ok_or("Invalid command format")?;
            let program = parts.get(0).ok_or("Empty command")?;
            let args = parts.get(1..).unwrap_or(&[]);

            let output = Command::new(program)
                .args(args)
                .output()
                .map_err(|e| format!("Failed to execute command: {}", e))?;

            let stdout = strip_ansi_codes(&String::from_utf8_lossy(&output.stdout));

            serde_json::from_str(&stdout)
                .map_err(|e| format!("Invalid plugin output: {} - Raw output: {}", e, stdout))
        }
        _ => Err(format!("Unsupported plugin type: {}", manifest.plugin_type)),
    }
}

fn strip_ansi_codes(input: &str) -> String {
    let re = regex::Regex::new(r"\x1B\[[0-9;]*[A-Za-z]").unwrap();
    re.replace_all(input, "").to_string()
}

fn get_plugins_path(_app: &tauri::AppHandle) -> Result<PathBuf, String> {
    #[cfg(debug_assertions)]
    {
        let manifest_dir = env!("CARGO_MANIFEST_DIR");
        let plugins_path = PathBuf::from(manifest_dir).join("plugins");
        if !plugins_path.exists() {
            return Err(format!("Plugins directory {} does not exist", plugins_path.display()));
        }
        Ok(plugins_path)
    }

    #[cfg(not(debug_assertions))]
    {
        let path = _app
            .path()
            .resource_dir()
            .map_err(|_| "Cannot resolve resource directory".to_string())?
            .join("plugins");
        if !path.exists() {
            return Err(format!("Plugins directory {} does not exist", path.display()));
        }
        Ok(path)
    }
}

fn find_external_binary(program: &str, language: Option<&str>) -> Result<PathBuf, String> {
    let install_instructions = match language {
        Some(lang) => match lang.to_lowercase().as_str() {
            "rust" => Some("Please install Rust via rustup (https://rustup.rs/)"),
            "go" => Some("Please install Go (https://golang.org/doc/install)"),
            "python" => Some("Please install Python (https://www.python.org/downloads/)"),
            "node" => Some("Please install Node.js (https://nodejs.org/)"),
            _ => None,
        },
        None => None,
    };

    if let Some(lang) = language {
        let home_dir = dirs::home_dir().ok_or("Cannot find home directory")?;
        let binary_path = match lang.to_lowercase().as_str() {
            "rust" => home_dir.join(".cargo").join("bin").join(program),
            "go" => home_dir.join("go").join("bin").join(program),
            "python" => home_dir.join(".local").join("bin").join(program),
            "bash" => PathBuf::from(program),
            "node" => home_dir.join(".nvm").join("versions").join("node").join("*").join("bin").join(program),
            _ => return Err(format!("Unsupported language: {}. {}", lang, install_instructions.unwrap_or(""))),
        };

        if lang.to_lowercase() == "node" {
            if let Ok(entries) = glob::glob(binary_path.to_str().ok_or("Invalid glob pattern")?) {
                for entry in entries.flatten() {
                    if entry.exists() {
                        return Ok(entry);
                    }
                }
            }
        } else if binary_path.exists() {
            return Ok(binary_path);
        }
    }

    let path_result = if cfg!(target_os = "windows") {
        Command::new("where").arg(program).output()
    } else {
        Command::new("which").arg(program).output()
    };

    match path_result {
        Ok(output) if output.status.success() => {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Some(path) = stdout.lines().next().map(PathBuf::from) {
                if path.exists() {
                    return Ok(path);
                }
            }
        }
        _ => {}
    }

    let error_msg = format!(
        "Binary '{}' not found in {} or PATH. {}",
        program,
        language.unwrap_or("any language-specific directory"),
        install_instructions.unwrap_or("")
    );
    Err(error_msg)
}

#[tauri::command]
fn is_directory(path: String) -> Result<bool, String> {
    let path_obj = Path::new(&path);
    if !path_obj.exists() {
        return Err("Path does not exist".to_string());
    }
    Ok(path_obj.is_dir())
}

#[tauri::command]
async fn unarchive_file(
    file_path: String,
    output_dir: String,
    download_id: String,
    app: AppHandle,
) -> Result<(), String> {
    app.emit(
        "extraction-progress",
        &serde_json::json!({
            "downloadId": download_id,
            "status": "extracting",
            "progress": 0.0
        }),
    )
    .map_err(|e| format!("Failed to emit extraction progress: {}", e))?;

    {
        let active_downloads = app.state::<RwLock<ActiveDownloads>>();
        let mut downloads = active_downloads
            .write()
            .map_err(|e| format!("Failed to lock active downloads: {}", e))?;
        if let Some(download) = downloads.downloads.get_mut(&download_id) {
            download.extraction_status = Some("extracting".to_string());
            download.extraction_progress = Some(0.0);
        }
        save_active_downloads_to_file(&app, &downloads)?;
    }

    let result = archiver::unarchive_file_with_progress(&file_path, &output_dir, |progress| {
        app.emit(
            "extraction-progress",
            &serde_json::json!({
                "downloadId": download_id,
                "status": "extracting",
                "progress": progress
            }),
        )
        .ok();
    });

    match result {
        Ok(_) => {
            app.emit(
                "extraction-progress",
                &serde_json::json!({
                    "downloadId": download_id,
                    "status": "completed",
                    "progress": 100.0
                }),
            )
            .map_err(|e| format!("Failed to emit extraction complete: {}", e))?;

            {
                let active_downloads = app.state::<RwLock<ActiveDownloads>>();
                let mut downloads = active_downloads
                    .write()
                    .map_err(|e| format!("Failed to lock active downloads: {}", e))?;
                if let Some(download) = downloads.downloads.get_mut(&download_id) {
                    download.extraction_status = Some("completed".to_string());
                    download.extraction_progress = Some(100.0);
                    download.extracted = true;
                    download.extracted_path = Some(output_dir.clone());
                }
                save_active_downloads_to_file(&app, &downloads)?;
            }

            app.notification()
                .builder()
                .title("Extraction Complete")
                .body(format!("File extracted to {}", output_dir))
                .show()
                .map_err(|e| format!("Failed to show notification: {}", e))?;

            Ok(())
        }
        Err(e) => {
            app.emit(
                "extraction-progress",
                &serde_json::json!({
                    "downloadId": download_id,
                    "status": "failed",
                    "progress": 0.0,
                    "error": e.to_string()
                }),
            )
            .map_err(|e| format!("Failed to emit extraction error: {}", e))?;

            {
                let active_downloads = app.state::<RwLock<ActiveDownloads>>();
                let mut downloads = active_downloads
                    .write()
                    .map_err(|e| format!("Failed to lock active downloads: {}", e))?;
                if let Some(download) = downloads.downloads.get_mut(&download_id) {
                    download.extraction_status = Some("failed".to_string());
                    download.extraction_progress = Some(0.0);
                }
                save_active_downloads_to_file(&app, &downloads)?;
            }

            Err(e.to_string())
        }
    }
}

#[tauri::command]
async fn check_path_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

#[tauri::command]
async fn select_game_executable(app: AppHandle, _game_id: String) -> Result<String, String> {
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

#[tauri::command]
async fn launch_game(
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

#[tauri::command]
async fn extract_icon(app: AppHandle, executable_path: String) -> Result<String, String> {
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
        if executable_path.to_lowercase().ends_with(".exe") {
            let file = File::open(&executable_path).map_err(|e| format!("Failed to open file: {}", e))?;
            let icon_dir_result = IconDir::read(file);
            let icon_image = match icon_dir_result {
                Ok(icon_dir) => {
                    let entry = icon_dir
                        .entries()
                        .first()
                        .ok_or("No icons found in executable")?;
                    entry
                        .decode()
                        .map_err(|e| format!("Failed to decode icon: {}", e))?
                }
                Err(_e) => {
                    let default_icon = app
                        .path()
                        .resource_dir()
                        .map_err(|e| format!("Failed to get resource dir: {}", e))?
                        .join("default_icon.png");
                    if default_icon.exists() {
                        fs::copy(&default_icon, &icon_path)
                            .map_err(|e| format!("Failed to copy default icon: {}", e))?;
                        return Ok(icon_path
                            .to_str()
                            .ok_or("Failed to convert path to string")?
                            .to_string());
                    } else {
                        return Err("Default icon not found and icon extraction failed".to_string());
                    }
                }
            };

            let rgba = icon_image.rgba_data();
            let img = image::RgbaImage::from_raw(icon_image.width(), icon_image.height(), rgba.to_vec())
                .ok_or("Failed to create RGBA image")?;
            let dynamic_img = DynamicImage::ImageRgba8(img);

            dynamic_img
                .save_with_format(&icon_path, image::ImageFormat::Png)
                .map_err(|e| format!("Failed to save icon: {}", e))?;
        } else {
            return Err("Only .exe files supported for icon extraction on Windows".to_string());
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

#[tauri::command]
async fn save_launch_config(
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

#[tauri::command]
fn echo_test(message: String) -> String {
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
    let mut app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state.token = Some(token);
    save_state_to_file(&app, &app_state)?;
    Ok(())
}

#[tauri::command]
fn get_token(state: State<'_, Mutex<AppState>>) -> Result<Option<String>, String> {
    let app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
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
    let mut app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
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
    let app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    Ok(app_state.cloudinary.clone())
}

#[tauri::command]
fn save_all_settings(
    token: String,
    cloudinary_config: CloudinaryConfig,
    state: State<'_, Mutex<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    let mut app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state.token = Some(token);
    app_state.cloudinary = Some(cloudinary_config);
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
        let app_state = state
            .lock()
            .map_err(|e| format!("Failed to lock state: {}", e))?;
        app_state
            .cloudinary
            .as_ref()
            .ok_or("Cloudinary config not set")?
            .clone()
    };
    cloudinary::upload_to_cloudinary(file_path, public_id, &cloudinary_config).await
}

#[tauri::command]
fn open_directory(path: String, _app: AppHandle) -> Result<(), String> {
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

#[tauri::command]
async fn fetch_article_by_slug(
    slug: String,
    token: Option<String>,
) -> Result<ArticleResponse, String> {
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
    let mut app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;
    app_state.download_dir = Some(dir.clone());
    save_state_to_file(&app, &app_state)?;
    Ok(())
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
    let path_obj = Path::new(&path);
    if !path_obj.exists() {
        return Err("File does not exist".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        StdCommand::new("cmd")
            .args(["/c", "start", "", path_obj.to_str().unwrap()])
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        StdCommand::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        StdCommand::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
async fn remove_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| format!("Failed to remove file: {}", e))?;
    Ok(())
}

#[tauri::command]
fn register_manual_download(
    download_id: String,
    filename: String,
    path: String,
    active_downloads: State<'_, RwLock<ActiveDownloads>>,
    app: AppHandle,
) -> Result<(), String> {
    let mut downloads = active_downloads
        .write()
        .map_err(|e| format!("Failed to write active downloads: {}", e))?;

    let extracted_path = format!("{}_extracted", path);
    let extracted = Path::new(&extracted_path).exists();

    downloads.downloads.insert(
        download_id.clone(),
        DownloadInfo {
            id: download_id,
            filename,
            url: "".to_string(),
            progress: 100.0,
            status: "completed".to_string(),
            path: Some(path.clone()),
            error: None,
            provider: None,
            downloaded_at: Some(chrono::Utc::now().to_rfc3339()),
            extracted,
            extracted_path: if extracted { Some(extracted_path) } else { None },
            extraction_status: Some(if extracted { "completed".to_string() } else { "idle".to_string() }),
            extraction_progress: Some(if extracted { 100.0 } else { 0.0 }),
        },
    );

    save_active_downloads_to_file(&app, &downloads)?;
    Ok(())
}

#[tauri::command]
fn save_games(
    games: Vec<DownloadInfo>,
    state: State<'_, Mutex<AppState>>,
    app: AppHandle,
) -> Result<(), String> {
    let mut app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;

    let existing_games = app_state.games.clone().unwrap_or_default();

    let converted_games: Vec<DownloadedGameInfo> = games
        .into_iter()
        .map(|game| {
            let existing_game = existing_games.iter().find(|g| g.id == game.id);
            DownloadedGameInfo {
                id: game.id,
                filename: game.filename,
                path: game.path.unwrap_or_default(),
                extracted: game.extracted,
                extracted_path: game.extracted_path,
                downloaded_at: game.downloaded_at,
                launch_config: existing_game.and_then(|g| g.launch_config.clone()),
                icon_path: existing_game.and_then(|g| g.icon_path.clone()),
            }
        })
        .collect();

    app_state.games = Some(converted_games);
    save_state_to_file(&app, &app_state)?;
    Ok(())
}

#[tauri::command]
fn get_saved_games(
    state: State<'_, Mutex<AppState>>,
    app: AppHandle,
) -> Result<Vec<DownloadedGameInfo>, String> {
    let mut app_state = state
        .lock()
        .map_err(|e| format!("Failed to lock state: {}", e))?;

    let games = app_state.games.clone().unwrap_or_default();

    let valid_games: Vec<DownloadedGameInfo> = games
        .into_iter()
        .filter(|game| {
            let path_exists = game.path.is_empty() || Path::new(&game.path).exists();
            let extracted_path_exists = game.extracted_path.as_ref().map_or(true, |path| {
                path.is_empty() || Path::new(path).exists()
            });
            path_exists || extracted_path_exists
        })
        .collect();

    if valid_games.len() != app_state.games.as_ref().map_or(0, |g| g.len()) {
        app_state.games = Some(valid_games.clone());
        save_state_to_file(&app, &app_state)?;
    }

    Ok(valid_games)
}



#[tauri::command]
async fn install_plugin(
    manifest: PluginManifest,
    app: AppHandle,
    active_downloads: State<'_, RwLock<ActiveDownloads>>,
    registry: State<'_, Mutex<PluginRegistry>>,
) -> Result<(), String> {
    todo!()
}

#[tauri::command]
fn get_all_plugins(registry: State<'_, Mutex<PluginRegistry>>) -> Result<Vec<PluginManifest>, String> {
    let registry = registry.lock().map_err(|e| format!("Failed to lock registry: {}", e))?;
    Ok(registry.get_all_plugins().values().cloned().collect())
}

#[tauri::command]
fn get_plugin_ids(registry: State<'_, Mutex<PluginRegistry>>) -> Result<Vec<String>, String> {
    let registry = registry.lock().map_err(|e| format!("Failed to lock registry: {}", e))?;
    Ok(registry.get_plugin_ids().into_iter().cloned().collect())
}

#[tauri::command]
async fn remove_plugin(
    plugin_id: String,
    app: AppHandle,
    registry: State<'_, Mutex<PluginRegistry>>,
) -> Result<(), String> {
    let plugins_path = get_plugins_path(&app)?;
    let manifest_path = plugins_path.join(format!("{}.json", plugin_id));
    if manifest_path.exists() {
        fs::remove_file(&manifest_path).map_err(|e| format!("Failed to remove manifest: {}", e))?;
    }

    let mut registry = registry.lock().map_err(|e| format!("Failed to lock registry: {}", e))?;
    registry.remove_plugin(&plugin_id);
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(PluginRegistry::new()))
        .setup(move |app| {
            let app_handle = app.handle().clone();

            let initial_state = match state::load_state_from_file(&app_handle) {
                Ok(loaded_state) => loaded_state,
                Err(_e) => {
                    let default_state = AppState::default();
                    save_state_to_file(&app_handle, &default_state)?;
                    default_state
                }
            };

            let mut initial_downloads = match state::load_active_downloads_from_file(&app_handle) {
                Ok(loaded_downloads) => loaded_downloads,
                Err(_) => ActiveDownloads::default(),
            };
            cleanup_active_downloads(&mut initial_downloads);

            app.manage(Mutex::new(initial_state));
            app.manage(RwLock::new(initial_downloads));

            if let Ok(mut app_state) = app.state::<Mutex<AppState>>().lock() {
                if app_state.download_dir.is_none() {
                    app_state.download_dir = state::get_default_download_dir(&app_handle);
                    save_state_to_file(&app_handle, &app_state)?;
                }
            }

            let plugins_path = get_plugins_path(&app_handle)?;
            let registry = app.state::<Mutex<PluginRegistry>>();
            let mut registry = registry.lock().unwrap();
            registry.load_plugins(plugins_path.to_str().ok_or("Invalid plugins path")?)?;

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
            api::get_articles,
            fetch_article_by_slug,
            get_download_dir,
            set_download_dir,
            verify_config_exists,
            show_download_notification,
            open_directory,
            get_active_downloads,
            open_file,
            remove_file,
            unarchive_file,
            check_path_exists,
            save_games,
            get_saved_games,
            register_manual_download,
            is_directory,
            select_game_executable,
            launch_game,
            extract_icon,
            save_launch_config,
            install_plugin,
            get_all_plugins,
            get_plugin_ids,
            remove_plugin
        ])
        .on_window_event(|app, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let app_handle = app.app_handle().clone();
                if let Ok(app_state) = app.state::<Mutex<AppState>>().lock() {
                    let _ = save_state_to_file(&app_handle, &app_state);
                }
                if let Ok(active_downloads) = app.state::<RwLock<ActiveDownloads>>().read() {
                    let _ = save_active_downloads_to_file(&app_handle, &active_downloads);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}