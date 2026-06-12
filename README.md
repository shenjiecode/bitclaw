# BitClaw

BitClaw 是 [PicoClaw](https://github.com/sipeed/picoclaw) 的桌面外壳应用。

🦞 bite + claw — 为 PicoClaw 提供对话、配置、文件浏览和产物管理的图形界面。

## 功能

- 🔍 **自动发现** — 检测本机安装的 PicoClaw
- 🚀 **Gateway 管理** — 启动/停止 PicoClaw Gateway 子进程
- 💬 **对话** — 通过 Pico Channel WebSocket 与 PicoClaw 交互
- 📁 **文件浏览** — 浏览 PicoClaw workspace 中的文件
- ⚙️ **配置管理** — 读写 PicoClaw 配置
- 📦 **产物管理** — 管理和分类 AI 生成的文件

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Tauri 2 |
| 前端 | React 19 + TypeScript |
| 构建 | Vite 7 + Tailwind CSS v4 |
| 状态管理 | Zustand 5 |
| UI 组件 | 手工组件 + Tailwind（shadcn/ui 待引入） |
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
  features/       # 功能模块 (chat, artifacts, workspace, config)
  stores/         # Zustand 状态管理
  components/ui/  # shadcn/ui 组件目录（暂未初始化）
src-tauri/        # Rust 后端
  src/commands/   # Tauri IPC 命令
  src/services/   # 业务逻辑
  src/db/         # SQLite 数据层
```

## 发版流程

项目使用 GitHub Actions 自动构建，推送 `v*` 格式的 tag 即可触发。

### 1. 更新版本号

确认以下三处版本号一致：

- `package.json` → `version`
- `src-tauri/tauri.conf.json` → `version`
- `CHANGELOG.md` → 新增版本段落

### 2. 提交并打 tag

```bash
git add -A
git commit -m "chore: release v0.x.0"
git push

git tag -a v0.x.0 -m "v0.x.0"
git push origin v0.x.0
```

### 3. 等待 CI 构建

GitHub Actions 会自动构建 4 个平台：

| 产物 | 平台 |
|------|------|
| `.dmg` (aarch64) | macOS Apple Silicon |
| `.dmg` (x64) | macOS Intel |
| `.deb` + `.rpm` + `.AppImage` | Linux x86_64 |
| `.exe` + `.msi` | Windows x64 |

构建完成后会生成一个 **Draft Release**。

### 4. 发布

检查 Draft Release 中的产物和 changelog 无误后，执行：

```bash
# 用 CHANGELOG.md 内容作为 release notes
gh release edit v0.x.0 --notes-file CHANGELOG.md

# 发布（从 draft 变为正式版）
gh release edit v0.x.0 --draft=false
```

也可以直接在 [GitHub Releases 页面](https://github.com/shenjiecode/bitclaw/releases) 手动操作。

## License

MIT
