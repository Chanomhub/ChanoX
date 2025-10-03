use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;

pub fn strip_ansi_codes(input: &str) -> String {
    let re = regex::Regex::new(r"\x1B\[[0-9;]*[A-Za-z]").unwrap();
    re.replace_all(input, "").to_string()
}

pub fn get_plugins_path(_app: &tauri::AppHandle) -> Result<PathBuf, String> {
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

pub fn find_external_binary(program: &str, language: Option<&str>) -> Result<PathBuf, String> {
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

pub fn is_path_directory(path: &str) -> Result<bool, String> {
    let path_obj = Path::new(path);
    if !path_obj.exists() {
        return Err("Path does not exist".to_string());
    }
    Ok(path_obj.is_dir())
}

pub fn path_exists(path: &str) -> bool {
    Path::new(path).exists()
}