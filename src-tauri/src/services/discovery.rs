use std::path::PathBuf;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DiscoveryError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Resolve picoclaw home directory, respecting PICOCLAW_HOME env var.
fn picoclaw_home() -> Option<PathBuf> {
    if let Ok(custom) = std::env::var("PICOCLAW_HOME") {
        let p = PathBuf::from(custom);
        if p.is_dir() {
            return Some(p);
        }
    }
    dirs::home_dir().map(|h| h.join(".picoclaw"))
}

/// Resolve picoclaw config path, respecting PICOCLAW_CONFIG env var.
#[allow(dead_code)]
fn picoclaw_config_path() -> Option<PathBuf> {
    if let Ok(custom) = std::env::var("PICOCLAW_CONFIG") {
        let p = PathBuf::from(&custom);
        if p.exists() {
            return Some(p);
        }
    }
    picoclaw_home().map(|h| h.join("config.json"))
}

/// Get the picoclaw config file path (for frontend to read).
#[allow(dead_code)]
pub fn get_picoclaw_config_path() -> Option<String> {
    picoclaw_config_path().map(|p| p.to_string_lossy().to_string())
}

/// Search for picoclaw binary with optional custom path.
/// Priority: custom_path > PATH/which > preset directories
pub async fn find_picoclaw(custom_path: Option<&str>) -> Result<Option<String>, DiscoveryError> {
    // 1. User-specified path takes highest priority
    if let Some(path) = custom_path {
        let expanded = shellexpand_path(path);
        let p = PathBuf::from(&expanded);
        if p.is_file() && p.exists() {
            return Ok(Some(expanded));
        }
        // If it's a directory, look for picoclaw inside
        if p.is_dir() {
            let binary = p.join("picoclaw");
            if binary.is_file() || binary.with_extension("exe").is_file() {
                return Ok(Some(binary.to_string_lossy().to_string()));
            }
        }
        // File doesn't exist but user explicitly set it — don't silently fall through
        return Ok(None);
    }

    // 2. Check PATH via which/where
    if let Some(path) = find_in_path() {
        return Ok(Some(path));
    }

    // 3. Check PICOCLAW_HOME directory
    if let Some(home) = picoclaw_home() {
        // Could be in $PICOCLAW_HOME itself or a bin subdirectory
        for sub in &["", "bin"] {
            let dir = if sub.is_empty() {
                home.clone()
            } else {
                home.join(sub)
            };
            let binary = dir.join("picoclaw");
            if binary.exists() {
                return Ok(Some(binary.to_string_lossy().to_string()));
            }
        }
    }

    // 4. Check common install locations
    for dir in get_search_paths() {
        let path = dir.join("picoclaw");
        if path.exists() {
            return Ok(Some(path.to_string_lossy().to_string()));
        }
    }

    Ok(None)
}

/// Find picoclaw in system PATH.
fn find_in_path() -> Option<String> {
    let cmd_name = if cfg!(windows) { "where" } else { "which" };

    if let Ok(output) = std::process::Command::new(cmd_name)
        .arg("picoclaw")
        .output()
    {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout)
                .lines()
                .next()
                .unwrap_or("")
                .trim()
                .to_string();
            if !path.is_empty() {
                return Some(path);
            }
        }
    }
    None
}

/// Expand ~ and environment variables in a path string.
fn shellexpand_path(path: &str) -> String {
    let path = if path.starts_with("~/") {
        if let Some(home) = dirs::home_dir() {
            format!("{}{}", home.to_string_lossy(), &path[1..])
        } else {
            path.to_string()
        }
    } else {
        path.to_string()
    };
    path
}

fn get_search_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    if let Some(home) = dirs::home_dir() {
        paths.push(home.join(".local/bin"));
        paths.push(home.join("bin"));
    }

    #[cfg(target_os = "macos")]
    {
        paths.push(PathBuf::from("/usr/local/bin"));
        paths.push(PathBuf::from("/opt/homebrew/bin"));
    }

    #[cfg(target_os = "linux")]
    {
        paths.push(PathBuf::from("/usr/local/bin"));
        paths.push(PathBuf::from("/usr/bin"));
    }

    #[cfg(target_os = "windows")]
    {
        if let Some(app_data) = std::env::var("APPDATA").ok() {
            paths.push(PathBuf::from(app_data).join("picoclaw"));
        }
        if let Some(local_app_data) = std::env::var("LOCALAPPDATA").ok() {
            paths.push(PathBuf::from(local_app_data).join("picoclaw"));
        }
    }

    paths
}
