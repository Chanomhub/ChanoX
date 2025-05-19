use crate::state::CloudinaryConfig;
use chrono;
use hex;
use image::ImageReader;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha1::{Digest, Sha1};
use std::fs;
use std::io::Cursor;

#[derive(Serialize, Deserialize, Debug)]
struct CloudinaryResponse {
    secure_url: String,
    #[serde(default)]
    public_id: Option<String>,
}

pub async fn upload_to_cloudinary(
    file_path: String,
    public_id: Option<String>,
    cloudinary_config: &CloudinaryConfig,
) -> Result<String, String> {
    let client = Client::new();

    // ตรวจสอบขนาดไฟล์ก่อนอัปโหลด
    let metadata =
        fs::metadata(&file_path).map_err(|e| format!("Failed to read file metadata: {}", e))?;
    let file_size = metadata.len();
    const MAX_SIZE: u64 = 10 * 1024 * 1024; // 10 MB
    let mut temp_file_path = file_path.clone();

    // ตรวจสอบขนาดไฟล์และแจ้งเตือนสำหรับดีบัค
    if file_size > MAX_SIZE {
        eprintln!(
            "DEBUG: File {} exceeds size limit. Size: {} bytes, Max: {} bytes",
            file_path, file_size, MAX_SIZE
        );

        // ถ้าเป็น GIF ให้ลองแปลงเป็น WebP
        if file_path.to_lowercase().ends_with(".gif") {
            println!("Converting GIF to WebP to reduce size...");
            temp_file_path = convert_gif_to_webp(&file_path)?;

            // ตรวจสอบขนาดไฟล์ใหม่หลังจากแปลง
            let new_metadata = fs::metadata(&temp_file_path)
                .map_err(|e| format!("Failed to read converted file metadata: {}", e))?;
            let new_file_size = new_metadata.len();
            if new_file_size > MAX_SIZE {
                return Err(format!(
                    "Converted WebP file still too large: {} bytes. Maximum is {} bytes. Consider upgrading your Cloudinary plan.",
                    new_file_size, MAX_SIZE
                ));
            }
        } else {
            return Err(format!(
                "File size too large: {} bytes. Maximum is {} bytes. Consider upgrading your Cloudinary plan.",
                file_size, MAX_SIZE
            ));
        }
    }

    let file_bytes =
        fs::read(&temp_file_path).map_err(|e| format!("Failed to read file: {}", e))?;
    let file_part = reqwest::multipart::Part::bytes(file_bytes)
        .file_name(temp_file_path.clone())
        .mime_str("application/octet-stream")
        .map_err(|e| format!("Failed to set MIME type: {}", e))?;
    let mut form = reqwest::multipart::Form::new().part("file", file_part);

    if let Some(id) = &public_id {
        form = form.text("public_id", id.clone());
    }

    let timestamp = chrono::Utc::now().timestamp().to_string();
    form = form
        .text("api_key", cloudinary_config.api_key.clone())
        .text("timestamp", timestamp.clone())
        .text(
            "signature",
            generate_signature(
                &cloudinary_config.api_secret,
                &public_id.unwrap_or_default(),
                &timestamp,
            ),
        );

    let response = client
        .post(format!(
            "https://api.cloudinary.com/v1_1/{}/image/upload",
            cloudinary_config.cloud_name
        ))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    println!("Cloudinary response: {}", response_text);

    // ตรวจสอบข้อผิดพลาดจาก Cloudinary
    if response_text.contains("File size too large") {
        return Err(
            "File size exceeds Cloudinary's limit of 10 MB for your plan. Please upgrade your Cloudinary account or reduce the file size.".to_string(),
        );
    }

    let result: CloudinaryResponse = serde_json::from_str(&response_text).map_err(|e| {
        format!(
            "Failed to parse response: {} - Raw response: {}",
            e, response_text
        )
    })?;
    Ok(result.secure_url)
}

// ฟังก์ชันแปลง GIF เป็น WebP
fn convert_gif_to_webp(input_path: &str) -> Result<String, String> {
    let img = ImageReader::open(input_path)
        .map_err(|e| format!("Failed to open GIF: {}", e))?
        .decode()
        .map_err(|e| format!("Failed to decode GIF: {}", e))?;

    let output_path = input_path.replace(".gif", ".webp");
    let mut buffer = Vec::new();

    // Save the image as WebP to the buffer
    img.write_to(&mut Cursor::new(&mut buffer), image::ImageFormat::WebP)
        .map_err(|e| format!("Failed to convert to WebP: {}", e))?;

    fs::write(&output_path, buffer).map_err(|e| format!("Failed to write WebP file: {}", e))?;
    Ok(output_path)
}

fn generate_signature(api_secret: &str, public_id: &str, timestamp: &str) -> String {
    let mut signature_params = Vec::new();

    // Only add public_id if it's not empty
    if !public_id.is_empty() {
        signature_params.push(format!("public_id={}", public_id));
    }

    signature_params.push(format!("timestamp={}", timestamp));

    // Sort parameters alphabetically as per Cloudinary requirements
    signature_params.sort();

    // Join all parameters without separator and append secret
    let string_to_sign = format!("{}{}", signature_params.join("&"), api_secret);

    // Create the SHA-1 hash
    let mut hasher = Sha1::new();
    hasher.update(string_to_sign);
    let result = hasher.finalize();

    hex::encode(result)
}
