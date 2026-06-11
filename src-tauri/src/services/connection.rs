use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::Message;

#[derive(Debug, thiserror::Error)]
pub enum ConnectionError {
    #[error("WebSocket error: {0}")]
    Ws(#[from] tokio_tungstenite::tungstenite::Error),
    #[error("Not connected")]
    NotConnected,
    #[error("Already connected")]
    AlreadyConnected,
}

type WsSender = futures_util::stream::SplitSink<
    tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
    Message,
>;

/// State managed by the connection service, stored in Tauri state.
pub struct ConnectionState {
    inner: Arc<Mutex<Option<(WsSender, tokio::sync::oneshot::Sender<()>)>>>,
}

impl ConnectionState {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn connect(
        &self,
        app: AppHandle,
        url: &str,
        token: Option<&str>,
        session_id: Option<&str>,
    ) -> Result<(), ConnectionError> {
        {
            let guard = self.inner.lock().await;
            if guard.is_some() {
                return Err(ConnectionError::AlreadyConnected);
            }
        }

        // Build URL with session_id
        let final_url = match session_id {
            Some(sid) if !sid.is_empty() => {
                let separator = if url.contains('?') { '&' } else { '?' };
                format!("{}{}session_id={}", url, separator, sid)
            }
            _ => url.to_string(),
        };

        let mut request = final_url.into_client_request()?;

        if let Some(tok) = token {
            if !tok.is_empty() {
                use tokio_tungstenite::tungstenite::http::HeaderValue;
                request.headers_mut().insert(
                    "Sec-WebSocket-Protocol",
                    HeaderValue::from_str(&format!("token.{}", tok))
                        .unwrap_or_else(|_| HeaderValue::from_static("")),
                );
            }
        }

        let (ws_stream, _response) = tokio_tungstenite::connect_async(request).await?;
        let (ws_sender, mut ws_receiver) = ws_stream.split();

        let (cancel_tx, mut cancel_rx) = tokio::sync::oneshot::channel::<()>();

        {
            let mut guard = self.inner.lock().await;
            *guard = Some((ws_sender, cancel_tx));
        }

        let _ = app.emit("picoclaw:connection-status", "connected");

        let inner = self.inner.clone();
        tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = &mut cancel_rx => {
                        break;
                    }
                    msg = ws_receiver.next() => {
                        match msg {
                            Some(Ok(Message::Text(text))) => {
                                let _ = app.emit("picoclaw:message", text.as_str());
                            }
                            Some(Ok(Message::Ping(_))) => {
                                // Pong handled automatically by tungstenite
                            }
                            Some(Ok(Message::Close(_))) | Some(Err(_)) | None => {
                                break;
                            }
                            _ => {}
                        }
                    }
                }
            }

            let mut guard = inner.lock().await;
            *guard = None;
            let _ = app.emit("picoclaw:connection-status", "disconnected");
        });

        Ok(())
    }

    pub async fn send(&self, text: &str) -> Result<(), ConnectionError> {
        let mut guard = self.inner.lock().await;
        let (sender, _) = guard.as_mut().ok_or(ConnectionError::NotConnected)?;
        sender
            .send(Message::Text(text.into()))
            .await
            .map_err(ConnectionError::Ws)
    }

    pub async fn disconnect(&self) -> Result<(), ConnectionError> {
        let mut guard = self.inner.lock().await;
        if let Some((mut sender, cancel_tx)) = guard.take() {
            let _ = sender.send(Message::Close(None)).await;
            let _ = cancel_tx.send(());
        }
        Ok(())
    }
}
