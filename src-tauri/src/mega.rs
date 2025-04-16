use mega::Client as MegaClient;
use reqwest::Client as ReqwestClient;
use tauri::{AppHandle, Emitter};
use tokio::fs::File;
use tokio_util::compat::TokioAsyncWriteCompatExt;
use futures_util::future::try_join;
use std::sync::{Arc, Mutex};
use std::error::Error as StdError;
use std::path::PathBuf;
use tokio_util::sync::CancellationToken;

pub async fn download_from_mega(
    url: String,
    download_dir: String,
    download_id: String,
    app: AppHandle,
    cancel_token: CancellationToken,
) -> Result<(), Box<dyn std::error::Error>> {
    println!("Starting download from URL: {}", url);
    println!("Download directory: {}", download_dir);

    let http_client = ReqwestClient::new();
    let client = MegaClient::builder().build(http_client)?;

    app.emit(
        "download-progress",
        &serde_json::json!({ "id": download_id.clone(), "progress": 0 }),
    )?;

    let nodes = client.fetch_public_nodes(&url).await?;

    let url_parts: Vec<&str> = url.split('#').collect();
    if url_parts.len() < 2 {
        return Err("Invalid Mega URL format".into());
    }

    let file_url = url_parts[0];
    let file_id = file_url
        .split('/')
        .last()
        .ok_or("Could not parse file ID from URL")?;

    let node = nodes.get_node_by_handle(file_id).ok_or("Node not found")?;
    let total_size = node.size();
    let node_handle = node.handle().to_string();

    let original_filename = node.name();
    println!("Original filename: {}", original_filename);

    tokio::fs::create_dir_all(&download_dir).await?;

    let file_path = PathBuf::from(&download_dir)
        .join(original_filename)
        .to_string_lossy()
        .to_string();

    println!("Complete file path: {}", file_path);

    let file = File::create(&file_path).await?;
    println!("File created successfully");

    let progress = Arc::new(Mutex::new(0u64));
    let progress_clone = Arc::clone(&progress);

    // Wrap cancel_token in Arc for shared ownership
    let cancel_token = Arc::new(cancel_token);
    let cancel_token_clone = Arc::clone(&cancel_token);

    let app_clone = app.clone();
    let download_id_clone = download_id.clone();
    let progress_reporter = tokio::spawn(async move {
        let mut last_progress = 0;
        loop {
            tokio::select! {
                _ = cancel_token.cancelled() => {
                    return Err("Download cancelled".into());
                }
                _ = tokio::time::sleep(tokio::time::Duration::from_millis(500)) => {
                    let current_progress = {
                        let p = *progress_clone.lock().unwrap();
                        if total_size > 0 {
                            (p as f64 / total_size as f64 * 100.0) as u32
                        } else {
                            0
                        }
                    };

                    if current_progress != last_progress {
                        if let Err(e) = app_clone.emit(
                            "download-progress",
                            &serde_json::json!({ "id": download_id_clone, "progress": current_progress }),
                        ) {
                            eprintln!("Failed to emit progress: {}", e);
                        }
                        last_progress = current_progress;
                    }

                    if current_progress >= 100 {
                        break;
                    }
                }
            }
        }
        Ok::<(), Box<dyn StdError + Send + Sync>>(())
    });

    let http_client_dl = ReqwestClient::new();
    let client_dl = MegaClient::builder().build(http_client_dl)?;
    let url_clone = url.clone();

    let download_task = tokio::spawn(async move {
        let nodes_dl = client_dl.fetch_public_nodes(&url_clone).await?;
        let node_dl = nodes_dl
            .get_node_by_handle(&node_handle)
            .ok_or("Node not found in download task")?;

        tokio::select! {
            _ = cancel_token_clone.cancelled() => {
                Err("Download cancelled".into())
            }
            result = client_dl.download_node(node_dl, file.compat_write()) => {
                result?;
                if let Ok(mut p) = progress.lock() {
                    *p = total_size;
                }
                Ok::<(), Box<dyn StdError + Send + Sync>>(())
            }
        }
    });

    let (download_result, progress_result) = try_join(download_task, progress_reporter).await?;

    if let Err(e) = download_result {
        return Err(format!("Download failed: {}", e).into());
    }
    if let Err(e) = progress_result {
        return Err(format!("Progress reporter failed: {}", e).into());
    }

    app.emit(
        "download-progress",
        &serde_json::json!({ "id": download_id, "progress": 100 }),
    )?;

    println!("Download completed: {}", file_path);
    Ok(())
}