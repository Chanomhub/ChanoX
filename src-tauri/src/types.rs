use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio_util::sync::CancellationToken;

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct ActiveDownloads {
    #[serde(default)]
    pub downloads: HashMap<String, DownloadInfo>,
    #[serde(skip)]
    pub tokens: HashMap<String, CancellationToken>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct DownloadInfo {
    pub id: String,
    pub filename: String,
    pub url: String,
    pub progress: f32,
    pub status: String,
    pub path: Option<String>,
    pub error: Option<String>,
    pub provider: Option<String>,
    pub downloaded_at: Option<String>,
    pub extracted: bool,
    pub extracted_path: Option<String>,
    pub extraction_status: Option<String>,
    pub extraction_progress: Option<f32>,
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
    pub category: String,
    #[serde(default)]
    pub download_url: Option<String>,
    #[serde(skip)]
    pub binary_path: Option<PathBuf>,
}

pub struct PluginRegistry {
    pub plugins: HashMap<String, PluginManifest>,
}

impl PluginRegistry {
    pub fn new() -> Self {
        PluginRegistry {
            plugins: HashMap::new(),
        }
    }

    pub fn register_plugin(&mut self, manifest: PluginManifest) {
        self.plugins.insert(manifest.id.clone(), manifest);
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


}