# Changelog

All notable changes to BitClaw will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.3] - 2026-06-12

### Fixed

- 修复 PicoClaw 未安装时无限重渲染导致白屏的问题（`discover()` 从 render 移至 `useEffect`）
- 无 PicoClaw 时显示中文引导提示，隐藏 Gateway/连接控件，保持所有页面可操作
- Windows 平台隐藏所有子进程控制台窗口

## [0.2.0] - 2026-06-11

### Added

- Chat 功能：基于 Pico Protocol 的实时聊天
  - 会话列表：侧边栏「最近」折叠区，显示历史会话
  - 新建聊天：菜单项「新聊天」一键开始新对话
  - 消息类型区分：用户消息、AI 回复、💭 思考过程、🔧 工具调用（展开显示函数名和参数）、⚙️ 工具结果
  - 历史消息加载：解析 JSONL 中的 reasoning_content 和 tool_calls
  - 会话管理：删除会话，当前会话高亮
  - 用户消息右对齐 + 右侧头像（微信风格）
- 后端新增：list_sessions、list_session_messages、delete_session 命令
- WS 连接支持 session_id 参数
- 全中文界面

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

[0.2.3]: https://github.com/shenjiecode/bitclaw/releases/tag/v0.2.3
[0.1.0]: https://github.com/shenjiecode/bitclaw/releases/tag/v0.1.0
