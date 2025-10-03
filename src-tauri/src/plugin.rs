
use crate::types::{PluginFunction, PluginManifest, PluginRegistry};
use crate::utils::{find_external_binary, get_plugins_path, strip_ansi_codes};
use serde::de::DeserializeOwned;
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use tokio_util::sync::CancellationToken;
use tauri::Manager;





impl PluginRegistry {
    pub fn load_plugins(&mut self, path: &str) -> Result<(), String> {
        let dir = std::fs::read_dir(path).map_err(|e| format!("Failed to read plugins directory: {}", e))?;
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
                match std::fs::read_to_string(&file_path) {
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
                                        let script_path = std::path::Path::new(path).join(program);
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

