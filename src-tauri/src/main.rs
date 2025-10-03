#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod archiver;
mod api;
mod commands;
mod downloads;
mod games;
mod plugin;
mod state;
mod types;
mod utils;

use crate::state::{cleanup_active_downloads, load_active_downloads_from_file, load_state_from_file};
use crate::types::{ActiveDownloads, PluginRegistry};
use crate::utils::get_plugins_path;
use std::sync::{Mutex, RwLock};
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Initialize app state
            let app_state = load_state_from_file(app.handle()).unwrap_or_default();
            app.manage(Mutex::new(app_state));

            // Initialize active downloads
            let active_downloads = load_active_downloads_from_file(app.handle()).unwrap_or_default();
            app.manage(RwLock::new(active_downloads));

            // Initialize plugin registry
            let mut plugin_registry = PluginRegistry::new();
            if let Ok(plugins_path) = get_plugins_path(app.handle()) {
                if let Err(e) = plugin_registry.load_plugins(plugins_path.to_str().unwrap()) {
                    eprintln!("Failed to load plugins: {}", e);
                }
            }
            app.manage(Mutex::new(plugin_registry));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Basic utility commands
            commands::echo_test,
            commands::check_path_exists,
            commands::is_directory,
            commands::verify_config_exists,
            
            // File operations
            commands::remove_file,
            commands::open_file,
            commands::open_directory,
            
            // State management
            commands::set_token,
            commands::get_token,
            commands::save_all_settings,
            commands::get_download_dir,
            commands::set_download_dir,
            
            // Articles
            api::get_articles,
            commands::fetch_article_by_slug,
            
            // Downloads
            commands::unarchive_file,
            commands::get_active_downloads,
            commands::register_manual_download,
            commands::show_download_notification,
            
            // Games
            commands::extract_icon,
            commands::get_saved_games,
            commands::launch_game,
            commands::save_games,
            commands::save_launch_config,
            commands::select_game_executable,
            
            // Plugins
            commands::get_all_plugins,
            commands::get_plugin_ids,
            commands::install_plugin,
            commands::remove_plugin,
        ])
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Cleanup on app close
                let app_handle = _window.app_handle();
                if let Ok(mut active_downloads) = app_handle.state::<RwLock<ActiveDownloads>>().write() {
                    cleanup_active_downloads(&mut active_downloads);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}