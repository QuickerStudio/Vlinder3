# Terminal 安全策略对比

## 📊 当前策略 vs 建议策略

### macOS 平台对比

| 命令类型 | 当前策略 | 建议策略 | AI影响 |
|---------|---------|---------|--------|
| `ls -la` | ❌ 不在白名单 | ✅ 允许 | 无法列出文件 |
| `cat file.txt` | ❌ 不在白名单 | ✅ 允许 | 无法查看文件 |
| `mkdir dir` | ❌ 不在白名单 | ✅ 允许 | 无法创建目录 |
| `cp file1 file2` | ❌ 不在白名单 | ✅ 允许 | 无法复制文件 |
| `mv old new` | ❌ 不在白名单 | ✅ 允许 | 无法移动文件 |
| `rm file.txt` | ❌ 不在白名单 | ✅ 允许 | 无法删除文件 |
| `pwd` | ❌ 不在白名单 | ✅ 允许 | 无法查看路径 |
| `cd directory` | ❌ 不在白名单 | ✅ 允许 | 无法切换目录 |
| `grep pattern` | ❌ 不在白名单 | ✅ 允许 | 无法搜索文本 |
| `find . -name` | ❌ 不在白名单 | ✅ 允许 | 无法查找文件 |
| `curl url` | ❌ 不在白名单 | ✅ 允许 | 无法下载数据 |
| `node script.js` | ❌ 不在白名单 | ✅ 允许 | 无法运行脚本 |
| `python script.py` | ❌ 不在白名单 | ✅ 允许 | 无法运行Python |
| `npm install` | ✅ 允许 | ✅ 允许 | 正常工作 |
| `git commit` | ✅ 允许 | ✅ 允许 | 正常工作 |

### Linux 平台对比

**与 macOS 完全相同的问题！**

### Windows 平台

**Windows 平台配置合理，AI 可以正常工作。**

## 🚨 核心问题

### 当前 macOS/Linux Allow List
```json
"allow": [
  "^npm ",   // ✅ 仅这4个
  "^yarn ",
  "^pnpm ",
  "^git "
]
```

**允许的命令数量：4 个**

### 建议的 macOS/Linux Allow List
```json
"allow": [
  "^npm ", "^yarn ", "^pnpm ", "^git ",
  "^grep ", "^find ", "^sed ", "^awk ",
  "^curl ", "^wget ",
  "^ls ", "^cat ", "^echo ",
  "^mkdir ", "^touch ", "^mv ", "^cp ", "^rm ",
  "^cd ", "^pwd ",
  "^node ", "^python ", "^python3 ",
  "^java ", "^cargo ", "^go ", "^dotnet ",
  "^which ", "^type ", "^chmod ", "^chown ",
  "^brew ",    // macOS 特有
  "^apt ",     // Linux 特有
]
```

**允许的命令数量：30+ 个**

## 📈 影响统计

### AI 受限操作统计

在 macOS/Linux 上，AI 尝试的常见操作中：

- ✅ **能执行：** npm, yarn, pnpm, git (4个)
- ❌ **被限制：** 其他所有命令 (~26个常用命令)

**受限比例：87%** 🔴

### 实际案例

```bash
# AI 想做的事情 vs 实际结果

# 1. 查看项目结构
AI: ls -la
当前策略: ❌ 不在白名单，可能被阻止/警告
建议策略: ✅ 直接执行

# 2. 创建新目录
AI: mkdir src/components
当前策略: ❌ 不在白名单，可能被阻止/警告
建议策略: ✅ 直接执行

# 3. 复制配置文件
AI: cp .env.example .env
当前策略: ❌ 不在白名单，可能被阻止/警告
建议策略: ✅ 直接执行

# 4. 运行构建脚本
AI: node build.js
当前策略: ❌ 不在白名单，可能被阻止/警告
建议策略: ✅ 直接执行

# 5. 查找文件
AI: find . -name "*.ts"
当前策略: ❌ 不在白名单，可能被阻止/警告
建议策略: ✅ 直接执行
```

## 🔧 如何修复

### 方法 1: 替换配置文件（推荐）

```bash
# 备份当前配置
cp extension/src/integrations/terminal/sandbox/policy.default.json \
   extension/src/integrations/terminal/sandbox/policy.default.json.backup

# 使用建议配置
cp extension/src/integrations/terminal/sandbox/policy.default.recommended.json \
   extension/src/integrations/terminal/sandbox/policy.default.json
```

### 方法 2: 手动编辑

编辑 `extension/src/integrations/terminal/sandbox/policy.default.json`

将 macOS 和 Linux 的 `allow` 数组改为与 Windows 类似的完整列表。

### 方法 3: 临时禁用策略（不推荐）

在代码中注释掉策略检查（仅用于测试）。

## ⚖️ 安全性评估

### 当前配置的安全性问题

**❌ 假阳性过高**
- 阻止了大量安全的基本命令
- 严重影响 AI 正常工作
- 用户体验差

**✅ Block List 仍然有效**
- 危险命令（如 `rm -rf /`）仍被阻止
- 关键保护措施不受影响

### 建议配置的安全性

**✅ 平衡性好**
- 允许基本文件操作
- 保留危险命令拦截
- 保留 sudo 二次确认

**🛡️ 保护机制**
```
Layer 1: Block List (硬阻止)
  - rm -rf /
  - rm -rf /*
  - rm -rf ~
  - Fork bombs
  - Disk wipes

Layer 2: Risk Keywords (二次确认)
  - sudo
  - /dev/
  - format

Layer 3: Allow List (建议性)
  - 基本命令允许
  - 未知命令默认允许（但提示）
```

## 💡 为什么会出现这个问题？

### 可能的原因

1. **配置不一致**
   - Windows 配置很完整
   - macOS/Linux 配置被遗漏或简化

2. **测试不充分**
   - 可能主要在 Windows 上测试
   - macOS/Linux 测试场景不足

3. **过度保守**
   - 初期配置过于严格
   - 后来只更新了 Windows

## 📝 建议

### 立即行动（高优先级）

1. ✅ **更新 macOS Allow List** - 添加基本命令
2. ✅ **更新 Linux Allow List** - 添加基本命令
3. ✅ **测试验证** - 在各平台测试 AI 操作

### 长期改进（中优先级）

1. **添加配置 UI** - 让用户自定义策略
2. **分级策略** - 严格/平衡/宽松 三档
3. **命令学习** - 记录常用命令自动加白名单
4. **智能提示** - 说明为何阻止及如何解决

## 🎯 结论

**当前问题严重性：🔴 高**

- 在 macOS/Linux 系统上，87% 的常用命令不在白名单
- AI 基本无法执行文件操作和系统命令
- 严重影响 AI 的工作效率和用户体验

**解决方案简单：**

只需将 macOS/Linux 的 `allow` 列表改为与 Windows 一致即可。

**安全性影响：✅ 低**

- 危险命令仍被 Block List 拦截
- sudo 等高风险操作仍需确认
- 只是允许了基本的文件操作命令

