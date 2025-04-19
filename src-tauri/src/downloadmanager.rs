// downloadmanager.rs
use crate::plugin::{PluginManifest, execute_plugin as plugin_execute_plugin};
use serde_json::Value;
use tauri::AppHandle;
use tokio_util::sync::CancellationToken;

#[derive(Debug)]
pub enum DownloadError {
    InvalidUrl(String),
    UnsupportedProvider(String),
    DownloadFailed(String),
}

#[derive(serde::Deserialize)]
struct DownloadResult {
    path: String,
}

pub async fn execute_plugin(
    plugin: &PluginManifest,
    action: &str,
    input: Value,
    app: &AppHandle,
    cancel_token: CancellationToken,
) -> Result<String, DownloadError> {
    let result: DownloadResult = plugin_execute_plugin(plugin, action, input, app, cancel_token)
        .await
        .map_err(|e| DownloadError::DownloadFailed(e))?;

    if !std::path::Path::new(&result.path).exists() {
        return Err(DownloadError::DownloadFailed(format!(
            "File not found at path: {}",
            result.path
        )));
    }

    Ok(result.path)
}