# Changelog

All notable changes to BitClaw will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2025-06-11

### Added

- PicoClaw binary discovery: PATH search, common install locations, `PICOCLAW_HOME` / `PICOCLAW_CONFIG` env vars, Windows `where` support
- User-configurable custom PicoClaw binary path in Settings
- PicoClaw config analysis: reads `channel_list.pico` status, gateway host/port, model name
- Conditional WebSocket connection: only attempts when pico channel is enabled
- WebSocket relay via Rust backend with Tauri Event forwarding (`picoclaw:message`, `picoclaw:connection-status`)
- Token authentication via `Sec-WebSocket-Protocol` subprotocol, with `.security.yml` fallback
- Structured connection status UI: binary found, config read, pico enabled, token present, gateway URL
- Status-aware hints guiding users to fix configuration issues
- Chat page with message input (Pico Protocol `message.send`)
- Artifacts page with SQLite-backed storage
- Files page for browsing workspace
- PicoClaw reference documentation (`docs/picoclaw-reference.md`)

### Technical

- Tauri 2 + React 19 + TypeScript + Tailwind CSS v4
- Rust backend: services layer (discovery, config parsing, WebSocket relay), commands layer, SQLite migrations
- Zustand store for connection state management
- Settings persistence via `bitclaw_settings` SQLite table

[0.1.0]: https://github.com/shenjiecode/bitclaw/releases/tag/v0.1.0
