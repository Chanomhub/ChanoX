use serde::{Deserialize, Serialize};
use std::sync::Mutex;

// Define the Cloudinary config structure
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct CloudinaryConfig {
    pub cloud_name: String,
    pub api_key: String,
    pub api_secret: String,
}

// Create AppState to store the Cloudinary config
pub struct AppState {
    pub token: Mutex<String>,
    pub cloudinary_config: Mutex<CloudinaryConfig>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            token: Mutex::new(String::new()),
            cloudinary_config: Mutex::new(CloudinaryConfig::default()),
        }
    }
}
