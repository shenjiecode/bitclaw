# BitClaw 项目约定

## 项目概述
BitClaw 是 PicoClaw 的桌面外壳应用。前端 React + TypeScript，后端 Rust（Tauri 2）。
通过 Pico Channel WebSocket（ws://host:18790/pico/ws）与 PicoClaw 通信。

## 目录结构
- `src/` — React 前端代码
  - `components/ui/` — shadcn/ui 组件目录（暂未初始化，当前所有 UI 为手工组件）
  - `features/` — 按功能模块组织页面级组件，每个模块一个文件夹（chat / artifacts / workspace / config）
  - `hooks/` — 跨模块复用的 React hooks
  - `stores/` — Zustand store，按领域拆分
  - `lib/` — 纯工具函数
- `src-tauri/src/` — Rust 后端
  - `commands/` — Tauri IPC 命令，函数标注 `#[tauri::command]`，只做参数校验和调用 service
  - `services/` — 业务逻辑，不依赖 Tauri 框架，可独立测试
  - `db/` — SQLite 操作，迁移文件放 `db/migrations/`

## 前端规范
- TypeScript strict 模式
- 函数组件 + hooks，不用 class 组件
- 状态管理：Zustand。Store 按领域拆分，不放全局大对象
- 样式：Tailwind CSS v4，不写单独 CSS 文件
- 不引入未经确认的重型依赖

## Rust 规范
- 命令层（commands）只做参数校验和调用 service，不含业务逻辑
- Service 层不依赖 Tauri 类型，接收和返回纯 Rust 类型
- 错误处理：定义统一的错误类型，用 thiserror
- 数据库：rusqlite，迁移用版本号 SQL 文件
- 不用 unwrap()，用 ? 和适当的错误传播

## Tauri IPC 规范
- 命令命名：snake_case，如 `discover_picoclaw`、`list_artifacts`
- 前端通过 `@tauri-apps/api` 的 `invoke` 调用
- 数据传输用 serde 序列化，前后端各自定义类型
- 不在 IPC 中传大文件，用文件路径引用

## WebSocket 通信
- 前端不直接连 PicoClaw WebSocket
- Rust 侧做 WebSocket 中转：连接 picoclaw gateway 的 /pico/ws 端点
- 前端通过 Tauri Event 收发消息
- 连接状态由 Zustand store 管理

## Git 规范
- 提交格式：`type(scope): description`，type: feat/fix/refactor/docs/chore
- main 为主分支，开发用 feat/xxx 或 fix/xxx

## 测试
- Rust：cargo test，service 层重点覆盖
- 前端：vitest，按需引入
