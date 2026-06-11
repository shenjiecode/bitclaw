use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileInfo {
    pub name: String,
    pub path: String,       // absolute path
    pub rel_path: String,   // relative to workspace root
    pub is_dir: bool,
    pub size: u64,
    pub modified: String,   // ISO 8601
}

/// Resolve workspace root from picoclaw config.
fn resolve_workspace() -> Result<PathBuf, String> {
    // 1. Read config to get agents.defaults.workspace
    let config_path = resolve_config_path();
    if let Some(cp) = &config_path {
        if let Ok(content) = std::fs::read_to_string(cp) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(ws) = val
                    .get("agents")
                    .and_then(|a| a.get("defaults"))
                    .and_then(|d| d.get("workspace"))
                    .and_then(|w| w.as_str())
                {
                    let p = PathBuf::from(ws);
                    if p.is_dir() {
                        return Ok(p);
                    }
                }
            }
        }
    }

    // 2. Fallback: ~/.picoclaw/workspace
    if let Some(home) = dirs::home_dir() {
        let fallback = home.join(".picoclaw/workspace");
        if fallback.is_dir() {
            return Ok(fallback);
        }
    }

    Err("Workspace directory not found. Check PicoClaw config: agents.defaults.workspace".to_string())
}

fn resolve_config_path() -> Option<PathBuf> {
    if let Ok(custom) = std::env::var("PICOCLAW_CONFIG") {
        let p = PathBuf::from(custom);
        if p.exists() {
            return Some(p);
        }
    }
    if let Ok(home) = std::env::var("PICOCLAW_HOME") {
        let p = PathBuf::from(home).join("config.json");
        if p.exists() {
            return Some(p);
        }
    }
    dirs::home_dir().map(|h| h.join(".picoclaw/config.json"))
}

fn format_time(metadata: &std::fs::Metadata) -> String {
    metadata
        .modified()
        .ok()
        .and_then(|t| {
            let duration = t.duration_since(std::time::UNIX_EPOCH).ok()?;
            let secs = duration.as_secs() as i64;
            chrono::DateTime::from_timestamp(secs, 0)
                .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
        })
        .unwrap_or_default()
}

/// List directory contents within the workspace.
#[tauri::command]
pub async fn list_workspace_files(
    dir_path: Option<String>,
) -> Result<ListResult, String> {
    let workspace = resolve_workspace()?;
    let target = match dir_path {
        Some(p) => {
            let resolved = workspace.join(&p);
            // Security: ensure the resolved path is within workspace
            let canonical = resolved
                .canonicalize()
                .map_err(|e| format!("Invalid path: {}", e))?;
            let ws_canonical = workspace
                .canonicalize()
                .map_err(|e| format!("Invalid workspace: {}", e))?;
            if !canonical.starts_with(&ws_canonical) {
                return Err("Path is outside workspace".to_string());
            }
            canonical
        }
        None => workspace.clone(),
    };

    let ws_canonical = workspace
        .canonicalize()
        .map_err(|e| format!("Invalid workspace: {}", e))?;

    let mut files = Vec::new();
    let entries = std::fs::read_dir(&target)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Entry error: {}", e))?;
        let metadata = entry.metadata().map_err(|e| format!("Metadata error: {}", e))?;
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files/dirs
        if name.starts_with('.') {
            continue;
        }

        let full_path = entry.path();
        let rel_path = full_path
            .strip_prefix(&ws_canonical)
            .unwrap_or(&full_path)
            .to_string_lossy()
            .to_string();

        files.push(FileInfo {
            name,
            path: full_path.to_string_lossy().to_string(),
            rel_path,
            is_dir: metadata.is_dir(),
            size: metadata.len(),
            modified: format_time(&metadata),
        });
    }

    files.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    // Compute breadcrumbs from workspace root
    let rel = target
        .strip_prefix(&ws_canonical)
        .unwrap_or(Path::new(""))
        .to_string_lossy()
        .to_string();

    let breadcrumbs = if rel.is_empty() {
        vec![Breadcrumb {
            name: workspace
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
            rel_path: String::new(),
        }]
    } else {
        let mut crumbs = vec![Breadcrumb {
            name: workspace
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
            rel_path: String::new(),
        }];
        let mut accumulated = String::new();
        for part in rel.split('/') {
            if part.is_empty() {
                continue;
            }
            if !accumulated.is_empty() {
                accumulated.push('/');
            }
            accumulated.push_str(part);
            crumbs.push(Breadcrumb {
                name: part.to_string(),
                rel_path: accumulated.clone(),
            });
        }
        crumbs
    };

    Ok(ListResult {
        files,
        breadcrumbs,
        workspace_root: ws_canonical.to_string_lossy().to_string(),
    })
}

#[derive(Debug, Serialize)]
pub struct ListResult {
    pub files: Vec<FileInfo>,
    pub breadcrumbs: Vec<Breadcrumb>,
    pub workspace_root: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct Breadcrumb {
    pub name: String,
    pub rel_path: String,
}

/// Read a file's content.
#[tauri::command]
pub async fn read_workspace_file(file_path: String) -> Result<FileContent, String> {
    let workspace = resolve_workspace()?;
    let target = PathBuf::from(&file_path);

    // Security check
    let canonical = target
        .canonicalize()
        .map_err(|e| format!("Invalid path: {}", e))?;
    let ws_canonical = workspace
        .canonicalize()
        .map_err(|e| format!("Invalid workspace: {}", e))?;
    if !canonical.starts_with(&ws_canonical) {
        return Err("Path is outside workspace".to_string());
    }

    let metadata = std::fs::metadata(&canonical)
        .map_err(|e| format!("Cannot read file: {}", e))?;
    let name = canonical
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let content = std::fs::read_to_string(&canonical)
        .map_err(|e| format!("Failed to read: {}", e))?;

    Ok(FileContent {
        name,
        path: canonical.to_string_lossy().to_string(),
        content,
        size: metadata.len(),
        modified: format_time(&metadata),
    })
}

#[derive(Debug, Serialize)]
pub struct FileContent {
    pub name: String,
    pub path: String,
    pub content: String,
    pub size: u64,
    pub modified: String,
}

/// Write content to a file (create or overwrite).
#[tauri::command]
pub async fn write_workspace_file(
    file_path: String,
    content: String,
) -> Result<(), String> {
    let workspace = resolve_workspace()?;
    let target = PathBuf::from(&file_path);

    // If file doesn't exist yet, verify parent is within workspace
    if !target.exists() {
        let parent = target
            .parent()
            .ok_or("Invalid path (no parent directory)")?;
        let parent_canonical = parent
            .canonicalize()
            .map_err(|e| format!("Parent dir invalid: {}", e))?;
        let ws_canonical = workspace
            .canonicalize()
            .map_err(|e| format!("Invalid workspace: {}", e))?;
        if !parent_canonical.starts_with(&ws_canonical) {
            return Err("Path is outside workspace".to_string());
        }
    } else {
        let canonical = target
            .canonicalize()
            .map_err(|e| format!("Invalid path: {}", e))?;
        let ws_canonical = workspace
            .canonicalize()
            .map_err(|e| format!("Invalid workspace: {}", e))?;
        if !canonical.starts_with(&ws_canonical) {
            return Err("Path is outside workspace".to_string());
        }
    }

    std::fs::write(&target, &content)
        .map_err(|e| format!("Failed to write: {}", e))
}

/// Create a new directory.
#[tauri::command]
pub async fn create_directory(dir_path: String) -> Result<(), String> {
    let workspace = resolve_workspace()?;
    let target = PathBuf::from(&dir_path);

    let parent = target
        .parent()
        .ok_or("Invalid path")?;
    let parent_canonical = parent
        .canonicalize()
        .map_err(|e| format!("Parent dir invalid: {}", e))?;
    let ws_canonical = workspace
        .canonicalize()
        .map_err(|e| format!("Invalid workspace: {}", e))?;
    if !parent_canonical.starts_with(&ws_canonical) {
        return Err("Path is outside workspace".to_string());
    }

    std::fs::create_dir(&target)
        .map_err(|e| format!("Failed to create directory: {}", e))
}

/// Delete a file or directory.
#[tauri::command]
pub async fn delete_workspace_item(file_path: String) -> Result<(), String> {
    let workspace = resolve_workspace()?;
    let target = PathBuf::from(&file_path);
    let canonical = target
        .canonicalize()
        .map_err(|e| format!("Invalid path: {}", e))?;
    let ws_canonical = workspace
        .canonicalize()
        .map_err(|e| format!("Invalid workspace: {}", e))?;
    if !canonical.starts_with(&ws_canonical) {
        return Err("Path is outside workspace".to_string());
    }

    if canonical == ws_canonical {
        return Err("Cannot delete workspace root".to_string());
    }

    if canonical.is_dir() {
        std::fs::remove_dir_all(&canonical)
            .map_err(|e| format!("Failed to delete directory: {}", e))
    } else {
        std::fs::remove_file(&canonical)
            .map_err(|e| format!("Failed to delete file: {}", e))
    }
}

/// Rename/move a file or directory.
#[tauri::command]
pub async fn rename_workspace_item(
    old_path: String,
    new_name: String,
) -> Result<(), String> {
    let workspace = resolve_workspace()?;
    let src = PathBuf::from(&old_path);
    let src_canonical = src
        .canonicalize()
        .map_err(|e| format!("Source path invalid: {}", e))?;
    let ws_canonical = workspace
        .canonicalize()
        .map_err(|e| format!("Invalid workspace: {}", e))?;
    if !src_canonical.starts_with(&ws_canonical) {
        return Err("Path is outside workspace".to_string());
    }

    // New path = same parent, new name
    let dest = src_canonical
        .parent()
        .unwrap_or(&ws_canonical)
        .join(&new_name);
    let dest_canonical = dest
        .parent()
        .unwrap_or(&ws_canonical)
        .canonicalize()
        .map_err(|e| format!("Dest parent invalid: {}", e))?;
    if !dest_canonical.starts_with(&ws_canonical) {
        return Err("Destination is outside workspace".to_string());
    }
    if dest.exists() {
        return Err("A file with that name already exists".to_string());
    }

    std::fs::rename(&src_canonical, &dest)
        .map_err(|e| format!("Failed to rename: {}", e))
}
