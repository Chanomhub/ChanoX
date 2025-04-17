use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use tokio_util::sync::CancellationToken; // Added import

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
            let entry = match entry {
                Ok(entry) => entry,
                Err(e) => {
                    errors.push(format!("Failed to read directory entry: {}", e));
                    continue;
                }
            };
            let file_path = entry.path();
            if file_path.extension().map_or(false, |ext| ext == "json") {
                println!("Processing plugin file: {:?}", file_path);
                match fs::read_to_string(&file_path) {
                    Ok(content) => {
                        match serde_json::from_str::<PluginManifest>(&content) {
                            Ok(mut manifest) => {
                                if manifest.plugin_type == "script" {
                                    if manifest.external_binary {
                                        let program = manifest
                                            .entry_point
                                            .split_whitespace()
                                            .next()
                                            .unwrap_or(&manifest.entry_point);
                                        match find_external_binary(program, manifest.language.as_deref()) {
                                            Ok(binary_path) => {
                                                println!(
                                                    "Found external binary '{}' at: {}",
                                                    program,
                                                    binary_path.display()
                                                );
                                                manifest.binary_path = Some(binary_path);
                                                self.register_plugin(manifest);
                                            }
                                            Err(e) => {
                                                let mut error_msg = format!(
                                                    "External binary '{}' not found for plugin {}: {}",
                                                    program, manifest.id, e
                                                );
                                                if let Some(instruction) = &manifest.install_instruction {
                                                    error_msg.push_str(&format!("\nInstallation instruction: {}", instruction));
                                                }
                                                errors.push(error_msg);
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
                            Err(e) => {
                                errors.push(format!(
                                    "Failed to parse plugin JSON {}: {}",
                                    file_path.display(),
                                    e
                                ));
                            }
                        }
                    }
                    Err(e) => {
                        errors.push(format!(
                            "Failed to read plugin file {}: {}",
                            file_path.display(),
                            e
                        ));
                    }
                }
            }
        }

        if !errors.is_empty() {
            println!("Errors encountered while loading plugins:");
            for error in errors {
                println!("- {}", error);
            }
        } else {
            println!("All plugins loaded successfully.");
        }
        Ok(())
    }

    pub fn register_plugin(&mut self, manifest: PluginManifest) {
        println!("Registering plugin: {}", manifest.id);
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

    pub fn print_registered_plugins(&self) {
        println!("Currently registered plugins:");
        for (id, plugin) in &self.plugins {
            println!("  - {} ({})", plugin.name, id);
            println!("    Supported hosts: {:?}", plugin.supported_hosts);
            println!("    Type: {}", plugin.plugin_type);
            println!("    Function: {:?}", plugin.plugin_function);
            println!("    Supported actions: {:?}", plugin.supported_actions);
            if let Some(lang) = &plugin.language {
                println!("    Language: {}", lang);
            }
            if let Some(path) = &plugin.binary_path {
                println!("    Binary path: {}", path.display());
            }
            if let Some(instruction) = &plugin.install_instruction {
                println!("    Install instruction: {}", instruction);
            }
        }
    }
}

pub async fn execute_plugin<T: DeserializeOwned>(
    manifest: &PluginManifest,
    action: &str,
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
        println!("Debug plugins path: {}", plugins_path.display());
        if !plugins_path.exists() {
            return Err(format!(
                "Plugins directory {} does not exist",
                plugins_path.display()
            ));
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

        println!("Production plugins path: {}", path.display());
        if !path.exists() {
            return Err(format!(
                "Plugins directory {} does not exist",
                path.display()
            ));
        }
        Ok(path)
    }
}

fn find_external_binary(program: &str, language: Option<&str>) -> Result<PathBuf, String> {
    let install_instructions = match language {
        Some(lang) => match lang.to_lowercase().as_str() {
            "rust" => Some("Please install Rust via rustup (https://rustup.rs/) or install the required binary with 'cargo install <package>'"),
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