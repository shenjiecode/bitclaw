use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Structured information about picoclaw's pico channel status,
/// returned to the frontend for making connection decisions.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PicoClawStatus {
    /// Path to the picoclaw binary, if found.
    pub binary_path: Option<String>,
    /// Path to the config.json that was read.
    pub config_path: Option<String>,
    /// Whether the pico channel is enabled in config.
    pub pico_enabled: bool,
    /// Whether a token is configured for the pico channel.
    /// Note: token may be in .security.yml, so this only checks config.json.
    pub has_token: bool,
    /// Gateway host from config (default "localhost").
    pub gateway_host: String,
    /// Gateway port from config (default 18790).
    pub gateway_port: u16,
    /// The constructed WebSocket URL for connecting.
    pub ws_url: Option<String>,
    /// Default model name, if configured.
    pub model_name: Option<String>,
    /// Human-readable status summary.
    pub status_summary: PicoStatusSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PicoStatusSummary {
    /// PicoClaw binary not found.
    BinaryNotFound,
    /// Config file not found or unreadable.
    ConfigNotFound,
    /// Config read OK but pico channel is not enabled.
    PicoNotEnabled,
    /// Pico channel enabled but no token in config.json (may be in .security.yml).
    PicoEnabledNoToken,
    /// Pico channel enabled and token present — ready to connect.
    ReadyToConnect,
    /// Invalid config format.
    ConfigError(String),
}

/// Read and analyze the picoclaw config to determine connection readiness.
pub fn analyze_picoclaw_config(
    binary_path: Option<&str>,
    custom_home: Option<&str>,
) -> PicoClawStatus {
    let config_path = resolve_config_path(custom_home);

    let config_path_str = config_path.as_ref().map(|p| p.to_string_lossy().to_string());

    // Try to read and parse the config
    let config_value = match &config_path {
        Some(path) => match std::fs::read_to_string(path) {
            Ok(content) => serde_json::from_str::<serde_json::Value>(&content).map_err(|e| e.to_string()),
            Err(e) => Err(e.to_string()),
        },
        None => Err("Cannot determine config path".to_string()),
    };

    match config_value {
        Ok(config) => parse_config_and_build_status(binary_path, config_path_str, config),
        Err(_e) => PicoClawStatus {
            binary_path: binary_path.map(|s| s.to_string()),
            config_path: None,
            pico_enabled: false,
            has_token: false,
            gateway_host: "localhost".to_string(),
            gateway_port: 18790,
            ws_url: None,
            model_name: None,
            status_summary: if binary_path.is_some() {
                PicoStatusSummary::ConfigNotFound
            } else {
                PicoStatusSummary::BinaryNotFound
            },
        },
    }
}

fn resolve_config_path(custom_home: Option<&str>) -> Option<PathBuf> {
    // PICOCLAW_CONFIG env takes priority
    if let Ok(custom) = std::env::var("PICOCLAW_CONFIG") {
        let p = PathBuf::from(custom);
        if p.exists() {
            return Some(p);
        }
    }

    // Custom home dir
    if let Some(home) = custom_home {
        let p = PathBuf::from(home).join("config.json");
        if p.exists() {
            return Some(p);
        }
    }

    // PICOCLAW_HOME env
    if let Ok(home) = std::env::var("PICOCLAW_HOME") {
        let p = PathBuf::from(home).join("config.json");
        if p.exists() {
            return Some(p);
        }
    }

    // Default: ~/.picoclaw/config.json
    dirs::home_dir().map(|h| h.join(".picoclaw/config.json"))
}

fn parse_config_and_build_status(
    binary_path: Option<&str>,
    config_path_str: Option<String>,
    config: serde_json::Value,
) -> PicoClawStatus {
    // Extract gateway config
    let gateway = config.get("gateway");
    let gateway_host = gateway
        .and_then(|g| g.get("host"))
        .and_then(|h| h.as_str())
        .unwrap_or("localhost")
        .to_string();
    let gateway_port = gateway
        .and_then(|g| g.get("port"))
        .and_then(|p| p.as_u64())
        .unwrap_or(18790) as u16;

    // Extract model_name from agents.defaults
    let model_name = config
        .get("agents")
        .and_then(|a| a.get("defaults"))
        .and_then(|d| d.get("model_name"))
        .and_then(|m| m.as_str())
        .map(|s| s.to_string());

    // Extract pico channel config
    // JSON key is "channel_list" (schema v2+), fallback to "channels"
    let channel_list = config
        .get("channel_list")
        .or_else(|| config.get("channels"));

    let pico_channel = channel_list
        .and_then(|cl| cl.get("pico"));

    let pico_enabled = pico_channel
        .and_then(|pc| pc.get("enabled"))
        .and_then(|e| e.as_bool())
        .unwrap_or(false);

    // Token may be in settings.token or directly in the channel config
    let has_token_in_config = pico_channel
        .and_then(|pc| {
            pc.get("settings")
                .and_then(|s| s.get("token"))
                .and_then(|t| t.as_str())
                .map(|t| !t.is_empty())
        })
        .unwrap_or(false);

    // Also check .security.yml for token
    let has_token_in_yml = config_path_str.as_ref().and_then(|cp| {
        let config_dir = std::path::Path::new(cp).parent()?;
        let yml_path = config_dir.join(".security.yml");
        if !yml_path.exists() { return None; }
        let content = std::fs::read_to_string(&yml_path).ok()?;
        let yaml: serde_yaml::Value = serde_yaml::from_str(&content).ok()?;
        let token = yaml
            .get("channel_list")
            .or_else(|| yaml.get("channels"))
            .and_then(|cl| cl.get("pico"))
            .and_then(|p| p.get("settings"))
            .and_then(|s| s.get("token"))
            .and_then(|t| t.as_str())?;
        Some(!token.is_empty())
    }).unwrap_or(false);

    let has_token = has_token_in_config || has_token_in_yml;

    // Build WS URL if ready
    let ws_url = if pico_enabled {
        Some(format!("ws://{}:{}/pico/ws", gateway_host, gateway_port))
    } else {
        None
    };

    // Determine status summary
    let status_summary = if binary_path.is_none() {
        PicoStatusSummary::BinaryNotFound
    } else if !pico_enabled {
        PicoStatusSummary::PicoNotEnabled
    } else if !has_token {
        PicoStatusSummary::PicoEnabledNoToken
    } else {
        PicoStatusSummary::ReadyToConnect
    };

    PicoClawStatus {
        binary_path: binary_path.map(|s| s.to_string()),
        config_path: config_path_str,
        pico_enabled,
        has_token,
        gateway_host,
        gateway_port,
        ws_url,
        model_name,
        status_summary,
    }
}
