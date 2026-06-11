use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use tokio::sync::Mutex;

/// Create a std::process::Command with console window hidden on Windows.
fn silent_command(program: &str) -> std::process::Command {
    #[allow(unused_mut)]
    let mut cmd = std::process::Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // CREATE_NO_WINDOW = 0x08000000
        cmd.creation_flags(0x08000000);
    }
    cmd
}

/// State for managing the picoclaw gateway child process.
pub struct GatewayState {
    inner: Arc<Mutex<Option<GatewayProcess>>>,
}

struct GatewayProcess {
    child: tauri_plugin_shell::process::CommandChild,
}

#[derive(Debug, Clone, serde::Serialize)]
pub enum GatewayDetection {
    /// No gateway listening on the port.
    NotRunning,
    /// Gateway port is reachable, managed by BitClaw.
    RunningManaged,
    /// Gateway port is reachable, but NOT spawned by BitClaw.
    RunningExternal,
}

impl GatewayState {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(None)),
        }
    }

    /// Check if the gateway port is reachable.
    /// Returns whether the gateway is running and who manages it.
    pub async fn detect(&self, host: &str, port: u16) -> GatewayDetection {
        let is_ours = self.inner.lock().await.is_some();
        let port_reachable = tokio::net::TcpStream::connect(format!("{}:{}", host, port))
            .await
            .is_ok();

        match (is_ours, port_reachable) {
            (true, true) => GatewayDetection::RunningManaged,
            (false, true) => GatewayDetection::RunningExternal,
            (_, false) => GatewayDetection::NotRunning,
        }
    }

    /// Start picoclaw gateway. If port is occupied by an external process,
    /// kill it first, then start our own.
    pub async fn start(
        &self,
        app: AppHandle,
        binary_path: &str,
        host: &str,
        port: u16,
    ) -> Result<(), String> {
        {
            let guard = self.inner.lock().await;
            if guard.is_some() {
                return Err("Gateway is already running (managed by BitClaw)".to_string());
            }
        }

        // Check if port is already in use
        let port_taken = tokio::net::TcpStream::connect(format!("{}:{}", host, port))
            .await
            .is_ok();

        if port_taken {
            // Kill existing picoclaw processes using this port
            kill_picoclaw_on_port(port).await?;
            // Give it a moment to release the port
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;

            // Verify port is now free
            let still_taken = tokio::net::TcpStream::connect(format!("{}:{}", host, port))
                .await
                .is_ok();
            if still_taken {
                return Err(format!(
                    "Port {} is still occupied after killing existing picoclaw processes",
                    port
                ));
            }
        }

        let (mut rx, child) = app
            .shell()
            .command(binary_path)
            .args(["gateway"])
            .spawn()
            .map_err(|e| format!("Failed to spawn gateway: {}", e))?;

        {
            let mut guard = self.inner.lock().await;
            *guard = Some(GatewayProcess { child });
        }

        let inner = self.inner.clone();
        let app2 = app.clone();

        // Read stdout/stderr in background
        tauri::async_runtime::spawn(async move {
            let mut stderr_buf = String::new();
            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stdout(line) => {
                        let msg = String::from_utf8_lossy(&line).to_string();
                        let _ = app2.emit("gateway:stdout", &msg);
                    }
                    CommandEvent::Stderr(line) => {
                        let msg = String::from_utf8_lossy(&line).to_string();
                        let _ = app2.emit("gateway:stderr", &msg);
                        stderr_buf.push_str(&msg);
                        if msg.contains("failed") || msg.contains("ERR") {
                            let _ = app2.emit("gateway:error", &msg);
                        }
                    }
                    CommandEvent::Terminated(_payload) => {
                        let _ = app2.emit("gateway:status", "stopped");
                        if !stderr_buf.is_empty() {
                            let _ = app2.emit("gateway:error", &stderr_buf);
                        }
                        let mut guard = inner.lock().await;
                        *guard = None;
                        break;
                    }
                    CommandEvent::Error(err) => {
                        let _ = app2.emit("gateway:error", &err);
                    }
                    _ => {}
                }
            }
        });

        let _ = app.emit("gateway:status", "running");
        Ok(())
    }

    /// Stop the gateway process (only if managed by us).
    pub async fn stop(&self) -> Result<(), String> {
        let mut guard = self.inner.lock().await;
        if let Some(proc) = guard.take() {
            let _ = proc.child.kill();
        }
        Ok(())
    }

    /// Check if we have a managed child process.
    pub async fn is_running(&self) -> bool {
        self.inner.lock().await.is_some()
    }
}

/// Kill picoclaw processes that are listening on the given port.
async fn kill_picoclaw_on_port(port: u16) -> Result<(), String> {
    // Use lsof or fuser to find PIDs on the port, then kill them
    #[cfg(unix)]
    {
        // Try fuser first (more widely available)
        let fuser_output = silent_command("fuser")
            .args([&format!("{}/tcp", port)])
            .output();

        if let Ok(output) = fuser_output {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let pids: Vec<u32> = stdout
                .split_whitespace()
                .filter_map(|s| s.parse().ok())
                .collect();

            for pid in &pids {
                // Verify it's actually picoclaw
                if is_picoclaw_process(*pid) {
                    // SIGTERM first
                    let _ = silent_command("kill")
                        .args([&pid.to_string()])
                        .output();
                }
            }

            if !pids.is_empty() {
                // Wait a moment for graceful shutdown
                tokio::time::sleep(std::time::Duration::from_millis(300)).await;

                // Check if any are still alive, SIGKILL if needed
                for pid in &pids {
                    if is_picoclaw_process(*pid) {
                        let _ = silent_command("kill")
                            .args(["-9", &pid.to_string()])
                            .output();
                    }
                }
            }
            return Ok(());
        }

        // Fallback: use ss to find pids
        let ss_output = silent_command("ss")
            .args(["-tlnp", &format!("sport = :{}", port)])
            .output();

        if let Ok(output) = ss_output {
            let stdout = String::from_utf8_lossy(&output.stdout);
            // Parse "pid=12345" from ss output
            let pids: Vec<u32> = stdout
                .split(|c: char| !c.is_ascii_digit())
                .filter(|s| !s.is_empty())
                .filter_map(|s| s.parse().ok())
                .collect();

            for pid in pids {
                if is_picoclaw_process(pid) {
                    let _ = silent_command("kill")
                        .args([&pid.to_string()])
                        .output();
                }
            }
        }

        Ok(())
    }

    #[cfg(windows)]
    {
        let _ = port; // suppress unused warning
        // On Windows, use netstat + taskkill
        let output = silent_command("netstat")
            .args(["-ano", "-p", "TCP"])
            .output()
            .map_err(|e| format!("netstat failed: {}", e))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            if line.contains(&format!(":{}", port)) && line.contains("LISTENING") {
                if let Some(pid_str) = line.split_whitespace().last() {
                    if let Ok(pid) = pid_str.parse::<u32>() {
                        let _ = silent_command("taskkill")
                            .args(["/F", "/PID", &pid.to_string()])
                            .output();
                    }
                }
            }
        }
        Ok(())
    }
}

/// Check if a PID is a picoclaw process.
#[cfg(unix)]
fn is_picoclaw_process(pid: u32) -> bool {
    let path = format!("/proc/{}/cmdline", pid);
    if let Ok(cmdline) = std::fs::read_to_string(&path) {
        return cmdline.contains("picoclaw");
    }
    // If we can't read /proc, try ps
    let output = silent_command("ps")
        .args(["-p", &pid.to_string(), "-o", "comm="])
        .output();
    if let Ok(out) = output {
        let name = String::from_utf8_lossy(&out.stdout);
        return name.trim().contains("picoclaw");
    }
    // Can't determine, don't kill
    false
}
