use scraper::{Html, Selector};
use reqwest::Client;
use std::fs::File;
use std::io::Write;
use tauri::{AppHandle};
use futures_util::StreamExt;
use tauri::Emitter;

pub async fn download_from_mediafire(
    url: String,
    file_path: String,
    download_id: String,
    app: AppHandle,
) -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3")
        .build()?;

    // Function to extract download URL with retries
    async fn extract_download_url(
        client: &Client,
        url: &str,
        max_retries: u32,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let selectors = [
            Selector::parse("a.input.popsok").unwrap(),
            Selector::parse("a[aria-label='Download file']").unwrap(),
        ];

        for attempt in 1..=max_retries {
            // Scope the HTML parsing to ensure `document` is dropped before await
            let download_url = {
                let response = client.get(url).send().await?;
                let html = response.text().await?;
                let document = Html::parse_document(&html);

                let mut found_url = None;
                for selector in &selectors {
                    if let Some(element) = document.select(selector).next() {
                        if let Some(href) = element.value().attr("href") {
                            found_url = Some(href.to_string());
                            break;
                        }
                    }
                }
                found_url
            };

            // Check if we found a URL
            if let Some(url) = download_url {
                return Ok(url);
            }

            // Wait before retrying, only if not the last attempt
            if attempt < max_retries {
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
            }
        }

        Err("Download link not found after retries".into())
    }

    // Extract download URL with up to 3 retries
    let download_url = extract_download_url(&client, &url, 3).await?;

    // Start downloading the file
    let response = client.get(&download_url).send().await?;
    if !response.status().is_success() {
        return Err(format!("Failed to download: {}", response.status()).into());
    }

    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();
    let mut file = File::create(&file_path)?;

    // Emit initial progress
    app.emit(
        "download-progress",
        &serde_json::json!({ "id": download_id.clone(), "progress": 0 }),
    )?;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk?;
        downloaded += chunk.len() as u64;
        file.write_all(&chunk)?;
        if total_size > 0 {
            let progress = (downloaded as f64 / total_size as f64 * 100.0) as u32;
            app.emit(
                "download-progress",
                &serde_json::json!({ "id": download_id.clone(), "progress": progress }),
            )?;
        }
    }

    // Ensure we emit 100% progress on completion
    app.emit(
        "download-progress",
        &serde_json::json!({ "id": download_id.clone(), "progress": 100 }),
    )?;

    Ok(())
}