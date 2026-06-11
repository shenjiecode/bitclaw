# BitClaw

BitClaw 是 [PicoClaw](https://github.com/sipeed/picoclaw) 的桌面外壳应用。

🦞 bite + claw — 为 PicoClaw 提供对话、配置、文件浏览和产物管理的图形界面。

## 功能

- 🔍 **自动发现** — 检测本机安装的 PicoClaw
- 💬 **对话** — 通过 Pico Channel WebSocket 与 PicoClaw 交互
- 📁 **文件浏览** — 浏览 PicoClaw workspace 中的文件
- ⚙️ **配置管理** — 读写 PicoClaw 配置
- 📦 **产物管理** — 管理和分类 AI 生成的文件

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Tauri 2 |
| 前端 | React 19 + TypeScript |
| 构建 | Vite + Tailwind CSS v4 |
| 状态管理 | Zustand |
| UI 组件 | shadcn/ui |
| 后端 | Rust |
| 本地存储 | SQLite (rusqlite) |

## 开发

### 前置要求

- Node.js 22+
- Rust 1.80+
- 系统依赖参见 [Tauri Prerequisites](https://tauri.app/start/prerequisites/)

### 启动

```bash
# 安装前端依赖
npm install

# 开发模式（同时启动 Vite 和 Tauri）
npm run tauri dev
```

### 构建

```bash
npm run tauri build
```

## 项目结构

```
src/              # React 前端
  features/       # 功能模块 (chat, artifacts, config, files)
  stores/         # Zustand 状态管理
  components/ui/  # shadcn/ui 组件
src-tauri/        # Rust 后端
  src/commands/   # Tauri IPC 命令
  src/services/   # 业务逻辑
  src/db/         # SQLite 数据层
```

## License

MIT
