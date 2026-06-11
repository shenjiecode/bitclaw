use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

#[tauri::command]
pub async fn list_workspace_files(
    home_dir: Option<String>,
    sub_path: Option<String>,
) -> Result<Vec<FileInfo>, String> {
    let workspace = match home_dir {
        Some(dir) => PathBuf::from(dir).join(".picoclaw/workspace"),
        None => dirs::home_dir()
            .ok_or("Cannot determine home directory")?
            .join(".picoclaw/workspace"),
    };

    let target = match sub_path {
        Some(p) => workspace.join(&p),
        None => workspace,
    };

    let mut files = Vec::new();
    let entries = std::fs::read_dir(&target)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry.metadata().map_err(|e| format!("Failed to read metadata: {}", e))?;
        let name = entry
            .file_name()
            .to_string_lossy()
            .to_string();
        let path = entry.path().to_string_lossy().to_string();

        files.push(FileInfo {
            name,
            path,
            is_dir: metadata.is_dir(),
            size: metadata.len(),
        });
    }

    files.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name))
    });

    Ok(files)
}

#[tauri::command]
pub async fn read_workspace_file(file_path: String) -> Result<String, String> {
    std::fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}
