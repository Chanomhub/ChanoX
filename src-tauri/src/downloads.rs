use crate::state::save_active_downloads_to_file;
use crate::types::{ActiveDownloads, DownloadInfo};
use std::sync::RwLock;
use tauri::{AppHandle, Emitter, Manager, State};

pub async fn unarchive_file(
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

    let result = crate::archiver::unarchive_file_with_progress(&file_path, &output_dir, |progress| {
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

            tauri_plugin_notification::NotificationExt::notification(&app)
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

pub fn get_active_downloads(
    active_downloads: State<'_, RwLock<ActiveDownloads>>,
) -> Result<Vec<DownloadInfo>, String> {
    let downloads = active_downloads
        .read()
        .map_err(|e| format!("Failed to lock active downloads: {}", e))?;
    Ok(downloads.downloads.values().cloned().collect())
}

pub fn register_manual_download(
    download_id: String,
    filename: String,
    path: String,
    active_downloads: State<'_, RwLock<ActiveDownloads>>,
    app: AppHandle,
) -> Result<(), String> {
    let mut downloads = active_downloads
        .write()
        .map_err(|e| format!("Failed to lock active downloads: {}", e))?;
    
    let download_info = DownloadInfo {
        id: download_id.clone(),
        filename,
        url: "manual".to_string(),
        progress: 100.0,
        status: "completed".to_string(),
        path: Some(path),
        error: None,
        provider: Some("manual".to_string()),
        downloaded_at: Some(chrono::Utc::now().to_rfc3339()),
        extracted: false,
        extracted_path: None,
        extraction_status: None,
        extraction_progress: None,
    };
    
    downloads.downloads.insert(download_id, download_info);
    save_active_downloads_to_file(&app, &downloads)?;
    
    Ok(())
}

pub fn show_download_notification(
    app: AppHandle,
    title: String,
    message: String,
) -> Result<(), String> {
    tauri_plugin_notification::NotificationExt::notification(&app)
        .builder()
        .title(title)
        .body(message)
        .show()
        .map_err(|e| format!("Failed to show notification: {}", e))?;
    Ok(())
}