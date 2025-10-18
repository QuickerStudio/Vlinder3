# Terminal Tool 单元测试

本目录包含了 Terminal 工具新功能的完整单元测试套件。

## 测试文件

### 1. `sandbox-engine.test.ts`
测试沙箱引擎的安全策略评估功能。

**测试覆盖：**
- ✅ 阻止列表（Block List）测试
  - 匹配通用阻止模式的命令
  - 匹配平台特定阻止模式的命令
  - 不阻止安全命令
- ✅ 风险关键词（Risk Keywords）测试
  - 检测风险关键词并警告
  - 忽略引号内的风险关键词
  - 优先级：阻止 > 警告
- ✅ 允许列表（Allow List）测试
  - 匹配允许模式的命令
  - 默认允许未匹配的命令
- ✅ 平台策略选择测试
  - 应用正确的平台策略
  - 合并通用和平台特定策略
- ✅ 边界情况测试
  - 处理空策略
  - 优雅处理无效正则表达式
  - 处理空命令
  - 处理特殊字符命令
- ✅ 引号剥离测试
  - 正确处理单引号和双引号内容

### 2. `security-state.test.ts`
测试终端安全状态管理。

**测试覆盖：**
- ✅ getPolicy() 方法
  - 未设置策略时返回 undefined
  - 优雅处理格式错误的策略
- ✅ 策略类型验证
  - 验证策略结构
  - 支持平台特定规则
  - 支持包含所有功能的复杂策略
- ✅ 策略解析
  - 验证 version 字段存在
  - 验证 version 字段为数字类型

### 3. `shell-detect.test.ts`
测试 Git Bash 路径检测功能（仅限 Windows）。

**测试覆盖：**
- ✅ 非 Windows 平台返回 null
- ✅ Windows 平台返回字符串或 null
- ✅ 优雅处理错误
- ✅ 检查正确的路径（Windows）

### 4. `terminal-manager.test.ts`
测试终端注册表和终端管理器。

**TerminalRegistry 测试覆盖：**
- ✅ createTerminal
  - 使用默认名称创建终端
  - 使用自定义名称创建终端
  - 分配唯一 ID
  - 初始化输出跟踪
- ✅ getTerminal
  - 通过 ID 检索终端
  - 不存在的 ID 返回 undefined
  - 已关闭的终端返回 undefined
- ✅ getTerminalByName
  - 通过名称检索终端
  - 不存在的名称返回 undefined
- ✅ updateTerminal
  - 更新终端属性
- ✅ closeTerminal
  - 关闭终端并从注册表移除
  - 不存在的终端返回 false
- ✅ addOutput
  - 添加输出行到终端日志
  - 缓冲不完整的行
  - flush=true 时刷新缓冲区
- ✅ DevServer 管理
  - 添加开发服务器
  - 更新开发服务器 URL
  - 更新开发服务器状态
  - 检查开发服务器是否运行
  - 通过名称获取开发服务器
  - 清除所有开发服务器
- ✅ getAllTerminals
  - 返回所有活动终端
  - 过滤已关闭的终端

**TerminalManager 测试覆盖：**
- ✅ getOrCreateTerminal
  - 不存在时创建新终端
  - 相同 cwd 时重用现有终端
  - 不同 cwd 时创建新终端
  - 不重用忙碌的终端
  - 尊重自定义名称参数
- ✅ getTerminals
  - 返回忙碌的终端
  - 返回空闲的终端
- ✅ closeTerminal
  - 通过 ID 关闭终端
  - 不存在的终端返回 false
- ✅ closeAllTerminals
  - 关闭所有管理的终端
- ✅ disposeAll
  - 清理所有资源

## 已修复的错误

### 1. `shell-detect.ts` 路径错误
**问题：** Windows 路径使用了错误的转义序列（`\\\\` 而不是 `\`）
```typescript
// 修复前
const commonPaths = [
    "C\\\\Program Files\\\\Git\\\\bin\\\\bash.exe",
    ...
]
const fixed = p.replace(/\\\\/g, "\\")

// 修复后
const commonPaths = [
    "C:\\Program Files\\Git\\bin\\bash.exe",
    ...
]
// 直接使用路径，无需替换
```

## 测试结果

所有 terminal 工具相关的测试均已通过：

```
✓ SandboxEngine Tests (18 passing)
✓ TerminalSecurityState Tests (7 passing)
✓ shell-detect Tests (4 passing)
✓ TerminalRegistry Tests (22 passing)
✓ TerminalManager Tests (13 passing)
```

**总计：64+ 个 terminal 相关测试通过**

## 运行测试

要运行所有 terminal 工具测试：

```bash
cd extension
npm test
```

要仅运行 terminal 工具测试（如果配置了 mocha 过滤器）：

```bash
npm test -- --grep "Terminal|SandboxEngine|shell-detect|TerminalSecurityState"
```

## 技术栈

- **测试框架：** Mocha
- **断言库：** Node.js assert
- **模拟库：** Sinon
- **测试运行器：** VSCode Test

## 注意事项

1. **TerminalSecurityState 测试** 需要 VSCode 扩展上下文，因此在单元测试中主要测试类型验证和策略结构
2. **shell-detect 测试** 在 Windows 上测试实际功能，在其他平台上跳过
3. **TerminalRegistry 和 TerminalManager 测试** 使用 Sinon stubs 模拟 VSCode API

## 维护

测试应该在以下情况下更新：
- 添加新的终端功能
- 修改安全策略结构
- 更改终端管理逻辑
- 发现 bug 时添加回归测试

