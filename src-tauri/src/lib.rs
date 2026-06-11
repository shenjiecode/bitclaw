use commands::{artifacts, config, discovery, files};
use services::connection::ConnectionState;
use std::sync::Arc;
use tauri::Manager;

mod commands;
mod db;
mod services;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data dir");
            let db_state = db::init_db(&app_data_dir)
                .expect("Failed to initialize database");
            app.manage(db_state);
            app.manage(Arc::new(ConnectionState::new()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            discovery::discover_picoclaw,
            discovery::set_picoclaw_binary_path,
            discovery::get_picoclaw_binary_path,
            discovery::connect_picoclaw,
            discovery::disconnect_picoclaw,
            discovery::send_picoclaw_message,
            config::read_picoclaw_config,
            config::write_picoclaw_config,
            config::get_pico_token,
            files::list_workspace_files,
            files::read_workspace_file,
            artifacts::list_artifacts,
            artifacts::create_artifact,
            artifacts::delete_artifact,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
