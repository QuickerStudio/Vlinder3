# 终端安全系统迁移指南

> **版本**: v3.9.0+  
> **更新日期**: 2025-10-18  
> **作者**: Vlinder Team

---

## 📋 概述

Vlinder 终端系统已完成重大升级，主要变更包括：

1. ✅ **execute_command 工具增强**：集成沙箱安全、跨平台 Shell 支持（Windows 优先 Git Bash）
2. ❌ **git_bash 工具已移除**：所有功能由 execute_command 接管
3. 🔒 **新增沙箱安全系统**：JSON 策略配置，黑白名单与风险检测
4. ⚙️ **Settings UI 增强**：Advanced 区域新增 Terminal Security Policy 编辑器

---

## 🚀 主要变更

### 1. git_bash 工具已完全移除

**影响范围**：
- ❌ 删除文件：
  - `extension/src/agent/v1/tools/runners/git-bash.tool.ts`
  - `extension/src/agent/v1/tools/schema/git-bash.ts`
  - `extension/src/agent/v1/prompts/tools/git-bash.ts`
- ❌ 删除导出：`schema/index.ts`, `prompts/tools/index.ts`
- ❌ 删除类型：`GitBashTool` from `shared/new-tools.ts`

**替代方案**：所有原 git_bash 功能由 `execute_command` 提供

---

### 2. execute_command 增强功能

#### 新增能力

| 功能 | 描述 | 默认值 |
|------|------|--------|
| **沙箱安全** | JSON 策略校验（block/warn/allow） | 启用（如果配置了策略） |
| **跨平台 Shell** | Windows 优先 Git Bash，其他平台用系统默认 | 自动检测 |
| **黑白名单** | 正则表达式规则匹配 | 见默认策略 |
| **风险检测** | 危险关键字二次确认 | `/dev/`, `sudo` 等 |

#### 保留原有功能

- ✅ 命令超时控制（`commandTimeout`）
- ✅ 自动关闭终端（`autoCloseTerminal`）
- ✅ 实时输出捕获（Shell Integration）
- ✅ 用户审批流程
- ✅ 错误处理与重试

---

## 🔒 沙箱安全系统

### 默认策略示例

```json
{
  "version": 1,
  "platforms": {
    "win32": {
      "preferredShell": "git-bash",
      "allow": ["^npm ", "^yarn ", "^git "],
      "block": ["rm -rf /", "dd if=/dev/zero"],
      "riskKeywords": ["/dev/", "> /dev/"]
    },
    "darwin": {
      "preferredShell": "default",
      "allow": ["^npm ", "^yarn "],
      "block": ["rm -rf /"],
      "riskKeywords": ["/dev/"]
    },
    "linux": {
      "preferredShell": "default",
      "allow": ["^npm ", "^yarn "],
      "block": ["rm -rf /"],
      "riskKeywords": ["/dev/"]
    }
  },
  "common": {
    "block": ["rm -rf /*", "rm -rf ~"],
    "riskKeywords": ["sudo "]
  }
}
```

### 评估顺序

1. **Block Check（最高优先级）**：命中 `block` 规则 → 直接拒绝执行
2. **Risk Check（次优先级）**：命中 `riskKeywords` → 警告用户，需再次确认
3. **Allow Check（建议性）**：
   - 命中 `allow` → 放行
   - 未命中 `allow` 但也未命中 block/risk → 默认放行

### 配置位置

Settings → Advanced → Terminal Security Policy (JSON)

- **编辑**：JSON 文本编辑器（支持多行）
- **恢复默认**：点击 "Restore Default" 按钮
- **清空**：点击 "Clear" 按钮（禁用沙箱）

---

## 🛠️ 迁移步骤

### 对开发者

如果您在提示词或脚本中引用了 `git_bash`，请全部替换为 `execute_command`。

#### 旧代码（已失效）

```xml
<tool name="git_bash">
  <command>npm install</command>
  <timeout>300000</timeout>
  <sandbox>true</sandbox>
</tool>
```

#### 新代码

```xml
<tool name="execute_command">
  <command>npm install</command>
</tool>
```

**注意**：
- `timeout` 通过全局 Settings → Command Timeout 配置（适用所有命令）
- `sandbox` 通过 Terminal Security Policy JSON 配置（全局策略）
- 无需传递 `shellPath`，Windows 下自动优先使用 Git Bash

---

### 对用户

无需手动迁移，系统已自动升级：

1. **原有命令执行**：`execute_command` 自动继承原有功能
2. **Windows Git Bash**：如果已安装 Git Bash，自动使用（无需配置）
3. **沙箱策略**：默认未启用，可在 Settings 手动配置 JSON 策略

---

## 📖 常见问题 (FAQ)

### Q1: 为什么删除 git_bash 工具？

**A**: 功能冗余。`execute_command` 已增强为跨平台工具，可在 Windows 上自动使用 Git Bash，同时支持沙箱安全，无需维护两套工具。

---

### Q2: Windows 上如何确认使用了 Git Bash？

**A**: 在终端输出中查看命令执行环境。如果安装了 Git Bash，路径检测如下：
- `C:\Program Files\Git\bin\bash.exe`
- `C:\Program Files (x86)\Git\bin\bash.exe`
- PATH 环境变量中的 `git` 命令对应的 bash

---

### Q3: 如何禁用沙箱？

**A**: Settings → Advanced → Terminal Security Policy → 点击 "Clear" 按钮，清空 JSON 配置。

---

### Q4: 沙箱会影响性能吗？

**A**: 几乎无影响。策略评估在命令执行前进行，仅正则匹配，耗时 <1ms。

---

### Q5: 如何添加自定义安全规则？

**A**: 编辑 Terminal Security Policy JSON：

```json
{
  "version": 1,
  "common": {
    "block": ["YOUR_DANGEROUS_COMMAND"],
    "riskKeywords": ["YOUR_RISKY_KEYWORD"],
    "allow": ["^YOUR_SAFE_COMMAND "]
  }
}
```

支持正则表达式（如 `^npm ` 匹配以 "npm " 开头的命令）。

---

## 🔧 技术细节

### Shell 检测逻辑

```typescript
// Windows
if (os.platform() === "win32") {
  const gitBash = detectGitBashPath()
  if (gitBash) {
    shellPath = gitBash  // 优先使用
  } else {
    // 回退到 PowerShell/cmd
  }
}

// macOS / Linux
// 使用系统默认 Shell (bash / zsh)
```

### 沙箱评估流程

```typescript
1. 去除命令中的引号字符串（避免误报）
2. 检查 block 规则 → 命中则拒绝
3. 检查 riskKeywords → 命中则警告
4. 检查 allow 规则 → 命中则放行（建议性）
5. 默认放行（如果 allow 为空或未命中）
```

---

## 📚 相关文档

- [终端系统架构报告](./terminal-system-architecture.md)
- [沙箱策略 JSON Schema](../src/integrations/terminal/sandbox/policy.types.ts)
- [默认策略配置](../src/integrations/terminal/sandbox/policy.default.json)

---

## 🎯 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v3.9.0 | 2025-10-18 | 删除 git_bash，增强 execute_command，新增沙箱系统 |
| v3.8.26 | 2025-10-17 | git_bash 工具标记为 deprecated |

---

**文档结束**

