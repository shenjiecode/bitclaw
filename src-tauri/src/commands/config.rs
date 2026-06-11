use std::path::PathBuf;

/// Read picoclaw config.json as raw JSON (for advanced editing).
#[tauri::command]
pub async fn read_picoclaw_config(home_dir: Option<String>) -> Result<serde_json::Value, String> {
    let config_path = resolve_config_path(home_dir)?;

    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))
}

/// Write picoclaw config.json from raw JSON.
#[tauri::command]
pub async fn write_picoclaw_config(
    home_dir: Option<String>,
    config: serde_json::Value,
) -> Result<(), String> {
    let config_path = resolve_config_path(home_dir)?;

    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    std::fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config: {}", e))
}

/// Read picoclaw .security.yml as raw text.
#[tauri::command]
pub async fn read_security_yml(home_dir: Option<String>) -> Result<Option<String>, String> {
    let config_path = resolve_config_path(home_dir)?;
    let security_path = config_path.parent().unwrap_or(std::path::Path::new(".")).join(".security.yml");
    if !security_path.exists() {
        return Ok(None);
    }
    std::fs::read_to_string(&security_path)
        .map(Some)
        .map_err(|e| format!("Failed to read .security.yml: {}", e))
}

/// Write picoclaw .security.yml from raw text.
#[tauri::command]
pub async fn write_security_yml(
    home_dir: Option<String>,
    content: String,
) -> Result<(), String> {
    let config_path = resolve_config_path(home_dir)?;
    let security_path = config_path.parent().unwrap_or(std::path::Path::new(".")).join(".security.yml");
    std::fs::write(&security_path, content)
        .map_err(|e| format!("Failed to write .security.yml: {}", e))
}

/// Get the pico channel token from picoclaw config.
/// First checks config.json, then tries .security.yml.
#[tauri::command]
pub async fn get_pico_token(home_dir: Option<String>) -> Result<Option<String>, String> {
    let config_path = resolve_config_path(home_dir.clone())?;

    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;

    let config: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))?;

    // Check channel_list.pico.settings.token
    let token = config
        .get("channel_list")
        .or_else(|| config.get("channels"))
        .and_then(|cl| cl.get("pico"))
        .and_then(|pc| pc.get("settings"))
        .and_then(|s| s.get("token"))
        .and_then(|t| t.as_str())
        .map(|t| t.to_string());

    if token.is_some() {
        return Ok(token);
    }

    // Try .security.yml
    let config_dir = config_path.parent().unwrap_or(std::path::Path::new("."));
    let security_path = config_dir.join(".security.yml");

    if security_path.exists() {
        let content = std::fs::read_to_string(&security_path)
            .map_err(|e| format!("Failed to read .security.yml: {}", e))?;
        let yaml_value: serde_yaml::Value =
            serde_yaml::from_str(&content).map_err(|e| format!("Failed to parse .security.yml: {}", e))?;
        let yml_token = yaml_value
            .get("channel_list")
            .or_else(|| yaml_value.get("channels"))
            .and_then(|cl| cl.get("pico"))
            .and_then(|p| p.get("settings"))
            .and_then(|s| s.get("token"))
            .and_then(|t| t.as_str())
            .map(|t| t.to_string());
        return Ok(yml_token);
    }

    Ok(None)
}

fn resolve_config_path(home_dir: Option<String>) -> Result<PathBuf, String> {
    // PICOCLAW_CONFIG env
    if let Ok(custom) = std::env::var("PICOCLAW_CONFIG") {
        let p = PathBuf::from(custom);
        if p.exists() {
            return Ok(p);
        }
    }

    match home_dir {
        Some(dir) => Ok(PathBuf::from(dir).join("config.json")),
        None => {
            // Check PICOCLAW_HOME
            if let Ok(home) = std::env::var("PICOCLAW_HOME") {
                return Ok(PathBuf::from(home).join("config.json"));
            }
            dirs::home_dir()
                .ok_or("Cannot determine home directory".to_string())
                .map(|h| h.join(".picoclaw/config.json"))
        }
    }
}
