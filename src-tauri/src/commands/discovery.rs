use crate::db::DbState;
use crate::services::{self, config::PicoClawStatus, connection::ConnectionState};
use std::sync::Arc;
use tauri::State;

/// Discover picoclaw: find binary, read config, return full status.
#[tauri::command]
pub async fn discover_picoclaw(
    db: State<'_, DbState>,
    _connection_state: State<'_, Arc<ConnectionState>>,
) -> Result<PicoClawStatus, String> {
    let custom_path = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        crate::db::get_setting(&conn, "picoclaw_binary_path")
            .map_err(|e| e.to_string())?
    };

    let binary_path = services::discovery::find_picoclaw(custom_path.as_deref())
        .await
        .map_err(|e| e.to_string())?;

    let custom_home = {
        let conn = db.0.lock().map_err(|e| e.to_string())?;
        crate::db::get_setting(&conn, "picoclaw_home")
            .map_err(|e| e.to_string())?
    };

    let status = services::config::analyze_picoclaw_config(
        binary_path.as_deref(),
        custom_home.as_deref(),
    );

    Ok(status)
}

/// Set a custom path for the picoclaw binary.
#[tauri::command]
pub async fn set_picoclaw_binary_path(
    db: State<'_, DbState>,
    path: Option<String>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    match path {
        Some(p) => {
            crate::db::set_setting(&conn, "picoclaw_binary_path", &p)
                .map_err(|e| e.to_string())
        }
        None => {
            conn.execute(
                "DELETE FROM bitclaw_settings WHERE key = 'picoclaw_binary_path'",
                [],
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        }
    }
}

/// Get the stored custom path for picoclaw binary.
#[tauri::command]
pub async fn get_picoclaw_binary_path(db: State<'_, DbState>) -> Result<Option<String>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    crate::db::get_setting(&conn, "picoclaw_binary_path").map_err(|e| e.to_string())
}

/// Connect to PicoClaw gateway via WebSocket.
#[tauri::command]
pub async fn connect_picoclaw(
    app: tauri::AppHandle,
    connection_state: State<'_, Arc<ConnectionState>>,
    url: String,
    token: Option<String>,
) -> Result<(), String> {
    connection_state
        .connect(app, &url, token.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// Disconnect from PicoClaw gateway.
#[tauri::command]
pub async fn disconnect_picoclaw(
    connection_state: State<'_, Arc<ConnectionState>>,
) -> Result<(), String> {
    connection_state
        .disconnect()
        .await
        .map_err(|e| e.to_string())
}

/// Send a message to the PicoClaw WebSocket.
#[tauri::command]
pub async fn send_picoclaw_message(
    connection_state: State<'_, Arc<ConnectionState>>,
    message: String,
) -> Result<(), String> {
    connection_state
        .send(&message)
        .await
        .map_err(|e| e.to_string())
}
