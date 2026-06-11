# PicoClaw 参考文档（BitClaw 开发用）

> 最后更新：2026-06-11  
> 基于 PicoClaw v0.2.8（config schema version 3）

---

## 1. 安装与发现

### 1.1 二进制位置

PicoClaw 是单文件 Go 二进制，常见安装位置：

| 平台 | 常见路径 |
|------|----------|
| Linux | `/usr/local/bin/picoclaw`, `/usr/bin/picoclaw`, `~/.local/bin/picoclaw` |
| macOS | `/usr/local/bin/picoclaw`, `/opt/homebrew/bin/picoclaw` |
| Windows | `%APPDATA%\picoclaw\picoclaw.exe`, `%LOCALAPPDATA%\picoclaw\picoclaw.exe` |
| 手动 | 任何 PATH 目录，或用户自定义位置 |

**当前 BitClaw 问题**：`services/discovery.rs` 的 `find_picoclaw()` 只搜索了预设目录列表和 `which`，不支持用户手动指定路径。

**建议方案**：
1. 搜索时检查环境变量 `PICOCLAW_HOME`（默认 `~/.picoclaw`），从中推断二进制位置
2. 增加 BitClaw 自己的设置存储，允许用户手动指定 picoclaw 二进制路径
3. 发现流程：用户手动指定 > PATH/which 搜索 > 预设目录扫描

### 1.2 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PICOCLAW_HOME` | PicoClaw 数据根目录 | `~/.picoclaw` |
| `PICOCLAW_CONFIG` | 配置文件完整路径 | `$PICOCLAW_HOME/config.json` |
| `PICOCLAW_LOG_LEVEL` | Gateway 日志级别 | `warn` |

---

## 2. 配置文件 (`config.json`)

### 2.1 位置

- 默认：`~/.picoclaw/config.json`
- 可通过 `PICOCLAW_CONFIG` 环境变量覆盖
- 敏感信息存放在同目录下的 `.security.yml`

### 2.2 顶层结构

```jsonc
{
  "version": 3,              // 配置 schema 版本（当前 3）
  "session": { ... },        // 会话隔离策略
  "isolation": { ... },      // 隔离配置
  "agents": { ... },         // Agent 配置
  "channel_list": { ... },   // 通道配置（注意：JSON key 是 channel_list）
  "model_list": [ ... ],     // LLM 模型列表
  "gateway": { ... },        // Gateway 网关配置
  "hooks": { ... },          // 钩子系统
  "tools": { ... },          // 工具配置
  "heartbeat": { ... },      // 心跳/定时任务
  "devices": { ... },        // 设备监控
  "voice": { ... },          // 语音配置
  "build_info": { ... }      // 构建信息（只读）
}
```

> ⚠️ **重要**：在 config.json 中，通道配置的 JSON key 是 `channel_list`，不是 `channels`。V1/V2 的 `channels` 会自动迁移到 `channel_list`。

### 2.3 Gateway 配置

```jsonc
{
  "gateway": {
    "host": "localhost",    // 监听地址，"0.0.0.0" 允许外部访问
    "port": 18790,          // 监听端口
    "hot_reload": false,    // 配置热重载
    "log_level": "warn"     // debug | info | warn | error | fatal
  }
}
```

BitClaw 连接时需要从 `gateway.host` 和 `gateway.port` 构建连接 URL。

### 2.4 Pico Channel 配置

Pico Channel 是专为自定义客户端设计的原生 WebSocket 通道。

在 `channel_list` 中的配置格式：

```jsonc
{
  "channel_list": {
    "pico": {
      "enabled": true,            // ⚠️ 必须为 true 才能连接
      "type": "pico",
      "settings": {
        "token": "your-secure-token",  // ⚠️ 认证令牌，必填
        "allow_token_query": false,
        "allow_origins": [],
        "ping_interval": 30,       // WebSocket ping 间隔（秒）
        "read_timeout": 60,        // 读超时（秒）
        "write_timeout": 10,       // 写超时（秒）
        "max_connections": 100     // 最大并发连接数
      },
      "reasoning_channel_id": "",
      "group_trigger": {},
      "typing": {},
      "placeholder": {
        "enabled": false
      }
    }
  }
}
```

> ⚠️ **关键**：如果 `channel_list.pico.enabled` 不是 `true`，或 `settings.token` 为空，Gateway 将不会启动 Pico Channel。BitClaw **必须**在尝试连接前检查这两个条件。

**token 可能在 `.security.yml` 中**：
```yaml
# ~/.picoclaw/.security.yml
channels:
  pico:
    token: "actual-secret-token"
```

### 2.5 Agent 默认配置

```jsonc
{
  "agents": {
    "defaults": {
      "workspace": "~/.picoclaw/workspace",
      "restrict_to_workspace": true,
      "model_name": "some-model",      // 默认模型名称
      "max_tokens": 32768,
      "max_tool_iterations": 50
    }
  }
}
```

### 2.6 Model List

```jsonc
{
  "model_list": [
    {
      "model_name": "gpt-5.4",        // 别名，在 model_name 中引用
      "provider": "openai",            // 供应商
      "model": "gpt-5.4",             // 实际模型 ID
      "api_base": "https://api.openai.com/v1",
      "api_keys": ["sk-xxx"],          // 建议放在 .security.yml
      "enabled": true,
      "streaming": {
        "enabled": true                // 启用流式输出
      }
    }
  ]
}
```

---

## 3. WebSocket 协议（Pico Protocol）

### 3.1 连接

**端点**：`ws://<host>:<port>/pico`（注意不是 `/pico/ws`）

**认证方式**（三选一）：

1. **WebSocket Subprotocol**（推荐，浏览器兼容）：
   ```javascript
   const ws = new WebSocket('ws://localhost:18790/pico', ['token.your-token-here']);
   ```

2. **Authorization Header**：
   ```
   Authorization: Bearer your-token
   ```

3. **Query Parameter**（需 `allow_token_query: true`）：
   ```
   ws://localhost:18790/pico?token=your-token
   ```

**Session**：
- 可通过 `?session_id=xxx` 指定会话 ID
- 不指定则自动生成 UUID
- 同一 session_id 的消息会广播到该 session 的所有连接

### 3.2 Wire Format

所有消息都是 JSON，结构如下：

```jsonc
{
  "type": "message.send",          // 消息类型（见下表）
  "id": "optional-message-id",     // 客户端消息 ID（可选）
  "session_id": "optional",        // 会话 ID（可选）
  "timestamp": 1718000000000,      // Unix 毫秒时间戳
  "payload": { ... }               // 消息负载
}
```

### 3.3 消息类型

#### Client → Server

| type | 说明 | payload |
|------|------|---------|
| `message.send` | 发送文本消息 | `{ "content": "你好" }` |
| `media.send` | 发送媒体消息 | 包含 `media` 或 `attachments` 数组 |
| `ping` | 心跳 | 无 |

#### Server → Client

| type | 说明 | payload |
|------|------|---------|
| `message.create` | 新消息（助手回复） | `{ "content": "...", "message_id": "...", "kind": "thought" }` |
| `message.update` | 更新已有消息（流式/编辑） | `{ "message_id": "...", "content": "..." }` |
| `message.delete` | 删除消息 | `{ "message_id": "..." }` |
| `media.create` | 媒体消息 | 含 `attachments` 数组 |
| `typing.start` | 开始输入指示 | 无 |
| `typing.stop` | 停止输入指示 | 无 |
| `error` | 错误 | `{ "code": "...", "message": "..." }` |
| `pong` | 心跳响应 | 无 |

### 3.4 message.create 的 payload 字段

```jsonc
{
  "content": "回复内容",
  "message_id": "uuid",
  "kind": "thought",              // 可选："thought" | "tool_calls" | 缺省
  "thought": true,                // legacy 兼容字段，新客户端看 kind 即可
  "tool_calls": [...],            // kind=tool_calls 时包含
  "context_usage": {              // 上下文使用情况
    "used_tokens": 1000,
    "total_tokens": 32000,
    "compress_at_tokens": 24000,
    "used_percent": 3.1
  }
}
```

### 3.5 媒体消息（media.send）

支持内联 base64 图片 data URL：

```jsonc
{
  "type": "media.send",
  "payload": {
    "content": "描述一下这张图片",
    "media": ["data:image/png;base64,iVBOR..."]
  }
}
```

或使用 attachments 对象数组：

```jsonc
{
  "type": "media.send",
  "payload": {
    "content": "",
    "attachments": [
      { "type": "image", "url": "data:image/png;base64,..." }
    ]
  }
}
```

支持的图片格式：`image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/bmp`

### 3.6 流式输出（Streaming）

当 model_list 中的模型配置了 `streaming.enabled: true` 且 pico channel 配置了 `settings.streaming.enabled: true` 时：

1. 服务端先发 `message.create`（首条）
2. 后续通过 `message.update` 更新同一条消息的 content
3. 最终内容总是完整发出

---

## 4. BitClaw 连接流程（建议）

### 4.1 启动时检查流程

```
1. 发现 picoclaw 二进制
   ├── 检查 BitClaw 用户设置中的自定义路径
   ├── 检查 $PICOCLAW_HOME
   ├── which/where 搜索
   └── 预设目录扫描

2. 读取 picoclaw 配置
   ├── 路径：$PICOCLAW_CONFIG || $PICOCLAW_HOME/config.json || ~/.picoclaw/config.json
   └── 解析 channel_list.pico

3. 判断是否可连接
   ├── channel_list.pico.enabled === true ?
   ├── channel_list.pico.settings.token 非空 ?（可能需检查 .security.yml）
   └── gateway.host + gateway.port 构建 URL

4. 尝试 WebSocket 连接
   └── ws://<host>:<port>/pico，使用 token 认证
```

### 4.2 UI 状态机

```
[未发现] → 发现 picoclaw 二进制 → [已发现/未配置]
  → 读取 config → 检查 pico channel
    → enabled=false 或无 token → [需要配置]（引导用户去 picoclaw WebUI 或直接编辑 config）
    → enabled=true + 有 token → [可连接] → 连接 → [已连接]
```

### 4.3 关键判断条件

```rust
// 判断是否应该尝试连接
fn should_connect(config: &PicoConfig) -> bool {
    // 1. channel_list 中有 pico 项
    let pico_channel = config.channel_list.get("pico");
    if pico_channel.is_none() { return false; }
    
    // 2. pico channel 已启用
    if !pico_channel.enabled { return false; }
    
    // 3. token 已配置（注意可能只在 .security.yml 中）
    // BitClaw 可以尝试连接来验证，连接失败则提示用户配置 token
    
    true
}
```

---

## 5. PicoClaw 工作区布局

```
~/.picoclaw/
├── config.json            # 主配置文件
├── .security.yml          # 敏感信息（API keys, tokens）
├── launcher-auth.db       # WebUI 认证数据库
├── logs/                  # 运行日志
├── workspace/             # Agent 工作空间
│   ├── sessions/          # 会话历史
│   ├── memory/            # 长期记忆 (MEMORY.md)
│   ├── state/             # 持久状态
│   ├── cron/              # 定时任务
│   ├── skills/            # 自定义技能
│   ├── AGENTS.md          # Agent 行为指南
│   ├── HEARTBEAT.md       # 心跳任务提示
│   ├── IDENTITY.md        # Agent 身份
│   └── USER.md            # 用户偏好
└── skills/                # 全局技能
```

---

## 6. 当前 BitClaw 代码问题清单

### 6.1 Discovery（发现）

| 问题 | 现状 | 建议 |
|------|------|------|
| 不支持用户自定义路径 | `find_picoclaw()` 只搜固定目录 | 添加 BitClaw 设置存储，优先使用用户指定路径 |
| 不检查 `PICOCLAW_HOME` | 完全忽略 | 在 `~/.picoclaw` 之外，检查 `$PICOCLAW_HOME/bin/` |
| `which` 在 Windows 不可用 | 使用 `which` 命令 | Windows 上应使用 `where` |

### 6.2 Config（配置）

| 问题 | 现状 | 建议 |
|------|------|------|
| 不检查 pico channel 状态 | `read_picoclaw_config` 只读全量 JSON | 应解析 `channel_list.pico.enabled` |
| 不解析 PicoSettings | `PicoConfig` 只有 `model_name` | 应完整解析并展示 pico channel 状态 |
| 不检查 .security.yml | 只看 config.json | 至少提示用户 token 可能在 .security.yml |

### 6.3 Connection（连接）

| 问题 | 现状 | 建议 |
|------|------|------|
| 无脑连接 | App.tsx 启动就 `discover()` + `connect()` | 先读 config，检查 pico enabled，再决定是否连接 |
| 硬编码 URL | `ws://127.0.0.1:18790/pico` | 从 config.json 的 `gateway.host` + `gateway.port` 读取 |
| 无 WebSocket 实现 | `connect()` 是 TODO | 需要在 Rust 侧实现 WebSocket 中转 |
| 无认证 | 不传 token | 从 config 中读取 pico token 并用于认证 |

---

## 7. 配置文件示例（真实参考）

以下是一个启用了 Pico Channel 的最小配置：

```jsonc
{
  "version": 3,
  "agents": {
    "defaults": {
      "workspace": "~/.picoclaw/workspace",
      "model_name": "your-model",
      "max_tokens": 32768
    }
  },
  "channel_list": {
    "pico": {
      "enabled": true,
      "type": "pico",
      "settings": {
        "token": "your-secret-token-here",
        "ping_interval": 30,
        "read_timeout": 60,
        "max_connections": 100
      }
    }
  },
  "model_list": [
    {
      "model_name": "your-model",
      "provider": "openai",
      "model": "gpt-5.4",
      "api_base": "https://api.openai.com/v1"
      // api_keys 放在 .security.yml
    }
  ],
  "gateway": {
    "host": "localhost",
    "port": 18790,
    "log_level": "warn"
  }
}
```

---

## 8. 参考资料

- [PicoClaw 官方文档 - Configuration](https://docs.picoclaw.io/docs/configuration/)
- [PicoClaw 官方文档 - Config Reference](https://docs.picoclaw.io/docs/configuration/config-reference/)
- [PicoClaw 官方文档 - Channels](https://docs.picoclaw.io/docs/channels/)
- [PicoClaw GitHub - Configuration Guide](https://github.com/sipeed/picoclaw/blob/main/docs/guides/configuration.md)
- [GitHub Discussion #2469 - 自定义 GUI 通信方式](https://github.com/sipeed/picoclaw/discussions/2469)
- Pico Channel 源码：`picoclaw/pkg/channels/pico/` (protocol.go, pico.go)
- Pico Config 结构：`picoclaw/pkg/config/config.go` (PicoSettings, GatewayConfig)
