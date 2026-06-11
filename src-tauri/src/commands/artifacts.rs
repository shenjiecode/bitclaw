use crate::db;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Artifact {
    pub id: i64,
    pub name: String,
    pub file_path: String,
    pub created_at: String,
    pub tags: String, // JSON array stored as string
}

#[derive(Debug, Deserialize)]
pub struct CreateArtifactInput {
    pub name: String,
    pub file_path: String,
    pub tags: Option<Vec<String>>,
}

#[tauri::command]
pub async fn list_artifacts(state: tauri::State<'_, db::DbState>) -> Result<Vec<Artifact>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::artifacts::list(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_artifact(
    state: tauri::State<'_, db::DbState>,
    artifact: CreateArtifactInput,
) -> Result<Artifact, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let tags = serde_json::to_string(&artifact.tags.unwrap_or_default())
        .map_err(|e| e.to_string())?;
    db::artifacts::create(&conn, &artifact.name, &artifact.file_path, &tags)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_artifact(
    state: tauri::State<'_, db::DbState>,
    id: i64,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::artifacts::delete(&conn, id).map_err(|e| e.to_string())
}
