use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionMeta {
    pub key: String,
    pub summary: String,
    pub message_count: i64,
    pub channel: String,
    pub session_uuid: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionMessage {
    pub role: String,
    pub content: String,
    /// reasoning_content for assistant messages (thought)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reasoning: Option<String>,
    /// tool_calls for assistant messages
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<serde_json::Value>,
}

/// List all picoclaw sessions from workspace/sessions/*.meta.json
#[tauri::command]
pub async fn list_sessions() -> Result<Vec<SessionMeta>, String> {
    let workspace = resolve_workspace()?;
    let sessions_dir = workspace.join("sessions");
    if !sessions_dir.exists() {
        return Ok(vec![]);
    }

    let mut sessions = Vec::new();
    let entries = std::fs::read_dir(&sessions_dir)
        .map_err(|e| format!("Failed to read sessions dir: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Entry error: {}", e))?;
        let path = entry.path();
        if !path.to_string_lossy().ends_with(".meta.json") {
            continue;
        }

        let content = match std::fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let val: serde_json::Value = match serde_json::from_str(&content) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let key = val["key"].as_str().unwrap_or("").to_string();
        let summary = val["summary"].as_str().unwrap_or("").to_string();
        let count = val["count"].as_i64().unwrap_or(0);
        let channel = val["scope"]["channel"].as_str().unwrap_or("").to_string();

        // Extract session UUID from scope.values.chat
        let chat_val = val["scope"]["values"]["chat"]
            .as_str()
            .unwrap_or("");
        let session_uuid = if chat_val.contains(':') {
            chat_val.rsplit(':').next().unwrap_or("").to_string()
        } else {
            chat_val.to_string()
        };

        let created_at = val["created_at"].as_str().unwrap_or("").to_string();
        let updated_at = val["updated_at"].as_str().unwrap_or("").to_string();

        sessions.push(SessionMeta {
            key,
            summary,
            message_count: count,
            channel,
            session_uuid,
            created_at,
            updated_at,
        });
    }

    // Sort by updated_at descending (most recent first)
    sessions.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));

    Ok(sessions)
}

/// Load messages from a session's .jsonl file
#[tauri::command]
pub async fn list_session_messages(
    session_key: String,
) -> Result<Vec<SessionMessage>, String> {
    let workspace = resolve_workspace()?;
    let jsonl_path = workspace.join("sessions").join(format!("{}.jsonl", session_key));

    if !jsonl_path.exists() {
        return Ok(vec![]);
    }

    let content = std::fs::read_to_string(&jsonl_path)
        .map_err(|e| format!("Failed to read session: {}", e))?;

    let mut messages = Vec::new();
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
            let role = val["role"].as_str().unwrap_or("unknown").to_string();
            let content = val["content"].as_str().unwrap_or("").to_string();
            let reasoning = val.get("reasoning_content")
                .and_then(|v| v.as_str())
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string());
            let tool_calls = val.get("tool_calls")
                .filter(|v| v.is_array() && v.as_array().unwrap().len() > 0)
                .cloned();

            // Skip empty tool results
            if role == "tool" && content.is_empty() {
                continue;
            }

            messages.push(SessionMessage { role, content, reasoning, tool_calls });
        }
    }

    Ok(messages)
}

/// Delete a session (both .meta.json and .jsonl)
#[tauri::command]
pub async fn delete_session(session_key: String) -> Result<(), String> {
    let workspace = resolve_workspace()?;
    let sessions_dir = workspace.join("sessions");

    let meta_path = sessions_dir.join(format!("{}.meta.json", session_key));
    let jsonl_path = sessions_dir.join(format!("{}.jsonl", session_key));

    if !meta_path.exists() {
        return Err("Session not found".to_string());
    }

    std::fs::remove_file(&meta_path)
        .map_err(|e| format!("Failed to delete meta: {}", e))?;

    if jsonl_path.exists() {
        std::fs::remove_file(&jsonl_path)
            .map_err(|e| format!("Failed to delete messages: {}", e))?;
    }

    Ok(())
}

fn resolve_workspace() -> Result<PathBuf, String> {
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
    dirs::home_dir()
        .map(|h| h.join(".picoclaw/workspace"))
        .ok_or("Cannot determine workspace path".to_string())
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
