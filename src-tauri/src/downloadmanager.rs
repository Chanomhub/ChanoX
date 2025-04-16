use crate::mega::download_from_mega;
use crate::plugin::PluginManifest;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use tauri::AppHandle;
use url::Url;
use shlex::split;
use regex::Regex;
use tauri::{Emitter, Manager};
use tokio_util::sync::CancellationToken;

#[derive(Debug)]
pub enum DownloadError {
    InvalidUrl(String),
    UnsupportedProvider(String),
    DownloadFailed(String),
}

fn strip_ansi_codes(input: &str) -> String {
    let re = Regex::new(r"\x1B\[[0-9;]*[A-Za-z]").unwrap();
    re.replace_all(input, "").to_string()
}

fn get_plugins_path(_app: &AppHandle) -> Result<PathBuf, DownloadError> {
    #[cfg(debug_assertions)]
    {
        let manifest_dir = env!("CARGO_MANIFEST_DIR");
        let plugins_path = PathBuf::from(manifest_dir).join("plugins");
        println!("Debug plugins path: {}", plugins_path.display());
        if !plugins_path.exists() {
            return Err(DownloadError::DownloadFailed(format!(
                "Plugins directory {} does not exist",
                plugins_path.display()
            )));
        }
        Ok(plugins_path)
    }

    #[cfg(not(debug_assertions))]
    {
        let path = _app
            .path()
            .resource_dir()
            .map_err(|_| {
                DownloadError::DownloadFailed("Cannot resolve resource directory".to_string())
            })?
            .join("plugins");

        println!("Production plugins path: {}", path.display());
        if !path.exists() {
            return Err(DownloadError::DownloadFailed(format!(
                "Plugins directory {} does not exist",
                path.display()
            )));
        }
        Ok(path)
    }
}

fn call_command_plugin(
    entry_point: &str,
    url: &str,
    file_path: &str,
    download_id: &str,
) -> Result<String, DownloadError> {
    let command = entry_point
        .replace("{{download_url}}", url)
        .replace("{{output}}", file_path);
    println!("Command after replacement: {}", command);

    let parts = split(&command)
        .ok_or_else(|| DownloadError::DownloadFailed("Invalid command format".to_string()))?;
    if parts.is_empty() {
        return Err(DownloadError::DownloadFailed(
            "Invalid entry_point".to_string(),
        ));
    }
    let program = &parts[0];
    let args = &parts[1..];

    let status = Command::new(program)
        .args(args)
        .status()
        .map_err(|e| DownloadError::DownloadFailed(format!("Failed to execute command: {}", e)))?;

    if status.success() {
        if Path::new(file_path).exists() {
            Ok(file_path.to_string())
        } else {
            Err(DownloadError::DownloadFailed(
                "File not found after command execution".to_string(),
            ))
        }
    } else {
        Err(DownloadError::DownloadFailed(format!(
            "Command failed with status: {}",
            status
        )))
    }
}

fn call_script_plugin(
    app: &AppHandle,
    entry_point: &str,
    url: &str,
    file_path: &str,
    download_id: &str,
    external_binary: bool,
    binary_path: Option<&PathBuf>,
    language: Option<&str>,
    successful: Option<&str>,
) -> Result<String, DownloadError> {
    let input = json!({
        "action": "download",
        "url": url,
        "file_path": file_path,
        "download_id": download_id,
        "options": {}
    });

    let download_dir = Path::new(file_path)
        .parent()
        .ok_or_else(|| DownloadError::DownloadFailed("Invalid file path".to_string()))?
        .to_string_lossy()
        .replace('\\', "/");

    let command = entry_point
        .replace("{{download_url}}", url)
        .replace("{{output}}", &download_dir);
    println!("Command after replacement: {}", command);

    let parts = split(&command)
        .ok_or_else(|| DownloadError::DownloadFailed("Invalid command format".to_string()))?;
    if parts.is_empty() {
        return Err(DownloadError::DownloadFailed(
            "Invalid entry_point".to_string(),
        ));
    }
    let program = &parts[0];
    let args = &parts[1..];

    let executable_path = if external_binary {
        binary_path
            .map(|p| p.to_path_buf())
            .ok_or_else(|| {
                DownloadError::DownloadFailed(
                    "No binary path provided for external binary".to_string(),
                )
            })?
    } else {
        let plugins_path = get_plugins_path(app)?;
        let script_path = plugins_path.join(program);
        println!("Attempting to locate script at: {}", script_path.display());
        if !script_path.exists() {
            return Err(DownloadError::DownloadFailed(format!(
                "Script file {} does not exist",
                script_path.display()
            )));
        }
        script_path
    };

    println!("Executing program at: {}", executable_path.display());

    let final_command = if external_binary {
        let mut cmd = vec![executable_path.to_string_lossy().to_string()];
        cmd.extend(args.iter().map(|s| s.to_string()));
        cmd
    } else {
        let interpreter = match language.unwrap_or("") {
            "python" => Some("python"),
            "bash" => Some("bash"),
            "node" => Some("node"),
            _ => match executable_path.extension().and_then(|s| s.to_str()) {
                Some("py") => Some("python"),
                Some("sh") => Some("bash"),
                Some("js") => Some("node"),
                _ => None,
            },
        };

        if let Some(interp) = interpreter {
            let mut cmd = vec![interp.to_string(), executable_path.to_string_lossy().to_string()];
            cmd.extend(args.iter().map(|s| s.to_string()));
            cmd
        } else {
            let mut cmd = vec![executable_path.to_string_lossy().to_string()];
            cmd.extend(args.iter().map(|s| s.to_string()));
            cmd
        }
    };

    let formatted_command = final_command
        .iter()
        .map(|arg| {
            if arg.contains(' ') || arg.contains('"') {
                format!("\"{}\"", arg.replace("\"", "\\\""))
            } else {
                arg.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join(" ");
    println!("Final command: {}", formatted_command);

    let program = &final_command[0];
    let args = &final_command[1..];

    let mut cmd = Command::new(program);
    cmd.args(args);
    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| DownloadError::DownloadFailed(format!("Failed to start plugin: {}", e)))?;

    if let Some(stdin) = child.stdin.as_mut() {
        serde_json::to_writer(stdin, &input).map_err(|e| {
            DownloadError::DownloadFailed(format!("Failed to write to plugin: {}", e))
        })?;
    }

    let output = child
        .wait_with_output()
        .map_err(|e| DownloadError::DownloadFailed(format!("Plugin execution failed: {}", e)))?;

    let raw_stdout = String::from_utf8_lossy(&output.stdout);
    let raw_stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = strip_ansi_codes(&raw_stdout);
    let stderr = strip_ansi_codes(&raw_stderr);

    println!("Raw stdout: {}", raw_stdout);
    println!("Processed stdout: {}", stdout);
    println!("Processed stderr: {}", stderr);

    if Path::new(file_path).exists() {
        return Ok(file_path.to_string());
    }

    if let Some(success_str) = successful {
        if stdout.contains(success_str) || stderr.contains(success_str) {
            let dir = Path::new(&download_dir);
            let filename = url
                .rsplit('/')
                .find(|s| !s.is_empty() && *s != "file")
                .unwrap_or("download");
            let expected_path = dir.join(filename);
            if expected_path.exists() {
                return Ok(expected_path.to_string_lossy().to_string());
            } else {
                return Err(DownloadError::DownloadFailed(format!(
                    "Success string '{}' found, but file not found in {}",
                    success_str, download_dir
                )));
            }
        } else {
            return Err(DownloadError::DownloadFailed(format!(
                "Success string '{}' not found in plugin output",
                success_str
            )));
        }
    }

    if stdout.trim().is_empty() {
        return Err(DownloadError::DownloadFailed(
            "Plugin returned empty output".to_string(),
        ));
    }

    let result: Value = serde_json::from_str(&stdout).map_err(|e| {
        DownloadError::DownloadFailed(format!("Invalid plugin output: {} - Raw output: {}", e, stdout))
    })?;

    if result["status"] == "success" {
        Ok(result["path"].as_str().unwrap_or(file_path).to_string())
    } else {
        Err(DownloadError::DownloadFailed(
            result["error"]
                .as_str()
                .unwrap_or("Unknown error")
                .to_string(),
        ))
    }
}

pub async fn download_file(
    url: String,
    filename: String,
    download_id: String,
    app: AppHandle,
    download_dir: String,
    plugin: &PluginManifest,
    use_exact_path: bool,
    cancel_token: CancellationToken,
) -> Result<String, DownloadError> {
    let parsed_url = Url::parse(&url)
        .map_err(|e| DownloadError::InvalidUrl(format!("Invalid URL: {}", e)))?;
    let host = parsed_url
        .host_str()
        .ok_or_else(|| DownloadError::InvalidUrl("No host in URL".to_string()))?;

    println!("Received filename: '{}', download_dir: '{}'", filename, download_dir);

    let filename = if filename.is_empty() || filename == "file" {
        parsed_url
            .path_segments()
            .and_then(|segments| segments.rev().nth(1))
            .map(|s| s.to_string())
            .unwrap_or("download".to_string())
    } else {
        filename
    };
    println!("Using filename: '{}'", filename);

    let file_path = if use_exact_path {
        let path = Path::new(&download_dir).join(&filename);
        if path.exists() {
            if path.is_dir() {
                return Err(DownloadError::DownloadFailed(format!(
                    "Cannot save file: '{}' is a folder in {}",
                    filename, download_dir
                )));
            }
            return Err(DownloadError::DownloadFailed(format!(
                "File already exists at {}",
                path.display()
            )));
        }
        path
    } else {
        let path = Path::new(&download_dir).join(&filename);
        if path.exists() {
            if path.is_dir() {
                return Err(DownloadError::DownloadFailed(format!(
                    "Cannot save file: '{}' is a folder in {}",
                    filename, download_dir
                )));
            }
            let mut path = path;
            let (name, ext) = (
                path.file_stem().unwrap_or_default().to_string_lossy().to_string(),
                path.extension().unwrap_or_default().to_string_lossy().to_string(),
            );
            let mut counter = 1;
            while path.exists() {
                let new_filename = if ext.is_empty() {
                    format!("{} ({})", name, counter)
                } else {
                    format!("{} ({}).{}", name, counter, ext)
                };
                path = Path::new(&download_dir).join(new_filename);
                counter += 1;
            }
            path
        } else {
            path
        }
    };

    let file_path_str = file_path
        .to_string_lossy()
        .replace("/", "\\")
        .to_string();
    println!("Plugin will use path: '{}'", file_path_str);

    if !Path::new(&file_path_str)
        .parent()
        .map(|p| p.exists())
        .unwrap_or(false)
    {
        return Err(DownloadError::DownloadFailed(format!(
            "Parent directory for '{}' does not exist",
            file_path_str
        )));
    }

    println!("Using plugin: '{}' (type: {})", plugin.id, plugin.plugin_type);
    match plugin.plugin_type.as_str() {
        "script" => {
            let result = call_script_plugin(
                &app,
                &plugin.entry_point,
                &url,
                &file_path_str,
                &download_id,
                plugin.external_binary,
                plugin.binary_path.as_ref(),
                plugin.language.as_deref(),
                plugin.successful.as_deref(),
            )?;
            if result != file_path_str {
                if Path::new(&result).exists() {
                    return Ok(result);
                }
                return Err(DownloadError::DownloadFailed(
                    "Plugin returned invalid path".to_string(),
                ));
            }
        }
        "command" => {
            let result = call_command_plugin(
                &plugin.entry_point,
                &url,
                &file_path_str,
                &download_id,
            )?;
            if result != file_path_str {
                return Err(DownloadError::DownloadFailed(
                    "Command returned invalid path".to_string(),
                ));
            }
        }
        "native" => match plugin.id.as_str() {
            "mega" => {
                download_from_mega(url, download_dir, download_id, app, cancel_token)
                    .await
                    .map_err(|e| DownloadError::DownloadFailed(e.to_string()))?;
            }
            _ => {
                return Err(DownloadError::UnsupportedProvider(format!(
                    "Native plugin '{}' not implemented",
                    plugin.id
                )));
            }
        },
        _ => {
            return Err(DownloadError::UnsupportedProvider(format!(
                "Unknown plugin type: {}",
                plugin.plugin_type
            )));
        }
    }

    Ok(file_path_str)
}