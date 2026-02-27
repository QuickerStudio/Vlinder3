# Vlinder 架构重构 Spec

---

## Phase 0: vscode-copilot-chat → Vlinder 重构计划

### 三件事

1. 改名 copilot-chat → Vlinder
2. 去掉 `github.copilot` token 门禁，BYOK 永远激活
3. 加 Vlinder 自有 provider + 确认 OpenRouter 可用

---

### Step 1: 改名

`package.json`:
```json
"name": "vlinder",
"displayName": "Vlinder",
"publisher": "QuickerStudio",
"description": "AI coding agent powered by Vlinder"
```

全局替换（仅影响 UI 字符串和命令 ID，不影响逻辑）：
- `copilot-chat` → `vlinder` （命令前缀）
- `GitHub Copilot` → `Vlinder` （UI 显示文本）
- `copilot` → `vlinder` （contribution points 里的 command/menu ID）

---

### Step 2: 去掉 Copilot token 门禁

**文件**: `src/extension/byok/common/byokProvider.ts`

```ts
// 改前
export function isBYOKEnabled(copilotToken, capiClientService): boolean {
    if (isScenarioAutomation) return true;
    const isGHE = capiClientService.dotcomAPIURL !== 'https://api.github.com';
    return (copilotToken.isInternal || copilotToken.isIndividual) && !isGHE;
}

// 改后
export function isBYOKEnabled(): boolean {
    return true;
}
```

**文件**: `src/extension/byok/vscode-node/byokContribution.ts`

```ts
// 改前
if (authService.copilotToken && isBYOKEnabled(authService.copilotToken, this._capiClientService) && !this._byokProvidersRegistered) {

// 改后
if (!this._byokProvidersRegistered) {
```

这两处改完，所有 BYOK provider 在插件启动时直接激活，不再需要 Copilot 订阅。

---

### Step 3: 加 Vlinder Provider

新建 `src/extension/byok/vscode-node/vlinderProvider.ts`，继承 `AbstractLanguageModelChatProvider`。

核心逻辑：
- 认证：读取 Vlinder apiKey（存在 `byokStorageService`）
- 推理：POST `https://vlinders.org/api/inference-stream`，解析 SSE（code 0/1/2/3/4/-1）
- 协议转换：`vlinderSSEResponse` → VS Code `LanguageModelResponsePart`
  - `code: 2` (text delta) → `LanguageModelTextPart`
  - `code: 4` (reasoning) → `LanguageModelThinkingPart`
  - `code: 1` (final) → 上报 usage

在 `byokContribution.ts` 注册：
```ts
this._providers.set('vlinder', instantiationService.createInstance(VlinderLMProvider, this._byokStorageService));
```

---

### Step 4: 确认 OpenRouter

`openRouterProvider.ts` 已存在，不依赖 Copilot token，Step 2 完成后直接可用。无需改动。

---

### 执行顺序

Step 2 → Step 3 → Step 1 → Step 4 验证

Step 2 最先做，因为不改这个其他都跑不起来。

---

### 战略决策

不在现有 Vlinder 代码上打补丁，而是以 `microsoft/vscode-copilot-chat`（MIT 协议）为新基座，将 Vlinder 的 provider 系统注入进去。

**理由**：copilot-chat 已经实现了：
- VS Code LM API 原生集成（`lm.registerLanguageModelChatProvider`）
- 完整 BYOK 框架（`AbstractLanguageModelChatProvider` 基类）
- Agent Handoffs、Plan Agent、Ask Agent、Explore Agent
- Hook 系统（PreToolUse、PostToolUse、SubagentStart、SubagentEnd）
- ATIF v1.5 trajectory logging
- MCP 集成（`claudeMcpServerRegistry`）

### Delta 分析：Vlinder 有但 copilot-chat 没有的

**copilot-chat 已有的 BYOK providers：**
Anthropic、Gemini Native、OpenAI、OpenRouter、xAI、Azure BYOK、Ollama、Custom OAI Compatible

**Vlinder 独有，需要注入的：**

| Provider | 认证方式 | 特殊性 |
|---|---|---|
| `vlinder` | apiKey → vlinders.org | 自有推理服务，credits 系统，SSE 协议 |
| `deepseek` | apiKey | Vercel AI SDK 包装 |
| `mistral` | apiKey | Codestral baseURL |
| `amazon-bedrock` | accessKeyId + secretAccessKey + region | AWS SigV4 |
| `google-vertex` | clientEmail + privateKey + project + location | GCP service account |
| `together-ai` | apiKey | OpenAI compatible |
| `fireworks` | apiKey | OpenAI compatible |
| `deepinfra` | apiKey | OpenAI compatible |

**Vlinder 的核心技术资产：**

1. `vlinderSSEResponse` — 自定义 SSE 协议（code 0/1/2/3/4/-1），带 `internal.cost`、`userCredits`、reasoning delta（code 4）
2. `CustomApiHandler` — 用 Vercel AI SDK（`ai` package）统一包装所有第三方 provider，支持 `smoothStream()`、`stopSequences`、prompt caching、thinking mode
3. `VlinderHandler` — 直连 vlinders.org，带 credits 追踪、amplitude 埋点、stop_sequence 处理
4. `ApiManager` — 上层编排：context window 压缩、retry 逻辑（最多 5 次）、60s inactivity timeout、thinking mode 注入

### 注入架构

copilot-chat 的 `AbstractLanguageModelChatProvider` 是 VS Code LM API 适配层，Vlinder 的 `CustomApiHandler` 是 Vercel AI SDK 适配层。两者接口不同，需要桥接层。

```
VS Code LM API
    ↓
AbstractLanguageModelChatProvider (copilot-chat 基类)
    ↓
VlinderBridgeProvider (新建桥接层)
    ↓
CustomApiHandler / VlinderHandler (Vlinder 现有逻辑)
    ↓
Vercel AI SDK / vlinders.org SSE
```

**协议转换**：`vlinderSSEResponse` → `LanguageModelResponsePart`
- `code: 2` (text delta) → `LanguageModelTextPart`
- `code: 3` (content block) → `LanguageModelToolCallPart`
- `code: 4` (reasoning delta) → `LanguageModelTextPart`（带前缀标记）
- `code: 1` (final) → 触发 usage 上报

### 任务

- [ ] **0.1** 在 `byok/vscode-node/` 新建 `vlinderProvider.ts`：`VlinderBYOKLMProvider extends AbstractLanguageModelChatProvider`，桥接 `VlinderHandler`，处理 credits 认证
- [ ] **0.2** 新建 `deepseekProvider.ts`：桥接 `CustomApiHandler`（PROVIDER_IDS.DEEPSEEK）
- [ ] **0.3** 新建 `mistralProvider.ts`：桥接 `CustomApiHandler`（PROVIDER_IDS.MISTRAL），Codestral baseURL
- [ ] **0.4** 新建 `bedrockProvider.ts`：桥接 `CustomApiHandler`（PROVIDER_IDS.AMAZON_BEDROCK），AWS 多字段认证 UI
- [ ] **0.5** 新建 `vertexProvider.ts`：桥接 `CustomApiHandler`（PROVIDER_IDS.GOOGLE_VERTEX），GCP service account 认证 UI
- [ ] **0.6** 新建 `vlinderSseAdapter.ts`：`vlinderSSEResponse` → `LanguageModelResponsePart` 协议转换层
- [ ] **0.7** 在 `byokContribution.ts` 注册所有新 provider
- [ ] **0.8** 将 Vlinder 的 `ApiManager` 的 context compaction 逻辑（retry + 60s timeout）迁移到桥接层

### 关键风险

- copilot-chat 依赖 `IInstantiationService`（VS Code DI 容器），Vlinder 的 provider 直接 `new`。需要把 Vlinder provider 包装成可被 DI 注入的形式。
- `VlinderHandler` 的 credits 系统（`userCredits`、amplitude 埋点）需要对接 copilot-chat 的 `IAuthenticationService`，不能直接复用。
- Together.ai、Fireworks、DeepInfra 都是 OpenAI compatible，可以直接复用 copilot-chat 现有的 `CustomOAIBYOKModelProvider`，只需预配置 baseURL，无需新建 provider 文件。

---

## 核心判断

当前系统的根本问题不是缺少依赖，而是架构设计与 2025 年 LLM agent 工程实践脱节：

1. **工具调用用 XML 字符串解析** — `chunk-process.ts` 维护自定义 SSE 格式 (code 0/1/2/4/-1)，`task-executor.ts` 手写 XML 解析器处理 `<vlinder_action>` 标签。Anthropic 原生 `tool_use` blocks 从未被使用。
2. **手写 tool execution loop** — `makeClaudeRequest()` → `processApiResponse()` → `finishProcessingResponse()` → `makeClaudeRequest()` 是完全手写的 agentic loop，而 `@anthropic-ai/sdk` 的 `toolRunner()` 可以替代整个循环。
3. **没有 cache-first 设计** — `getEnvironmentDetails()` 每次 API 请求都重新构建，system prompt 和 tool definitions 在每轮对话中都是变量，KV cache 命中率接近 0。
4. **没有 context compaction** — 上下文窗口满了就直接失败，没有压缩策略。
5. **没有 MCP** — 2025 年所有标杆（Gemini CLI、OpenCode、Copilot、Claude Code）都以 MCP 为核心，我们完全缺失。
6. **工具 schema 每次全量发送** — 没有 lazy loading，每次请求都携带所有工具的完整 schema。

---

## 技术标杆分析

### Claude Code 的核心工程创新

来源：Claude Code 官方文档 + southbridge.ai 反编译分析

**1. Prompt Caching 是生产指标**
Claude Code 把 cache hit rate 当作 production incident metric 来监控。整个 agent harness 围绕维持稳定的 cache prefix 构建：
- 静态内容（system prompt、tool definitions）永远在前
- 变量内容（conversation history）永远在后
- 每次请求的前 N tokens 必须与上次完全相同才能命中 cache

**2. Tool Stubs + Lazy Loading**
不是每次发送完整 tool schema（数千 tokens），而是发送轻量 stub：
```json
{ "name": "read_file", "description": "...", "defer_loading": true }
```
完整 schema 只在模型调用 `ToolSearch` 时才加载。

**3. Cache-Safe Compaction**
上下文窗口满时，用相同的 system prompt + tools 运行压缩，保持 cache prefix 不变，只把 conversation 压缩成摘要追加为最后一条 user message。

**4. Plan Mode 是工具，不是配置**
`EnterPlanMode` / `ExitPlanMode` 是可调用的工具，所以 tool definitions 在整个 session 中永远不变（cache 保持热）。

**5. Subagent 上下文隔离**
每个 subagent 有独立的 context window。主 agent 写详细计划，委托给专家 subagent 执行，结果写回文件系统。

### `@anthropic-ai/sdk` 新 API（0.78.0）

```typescript
// 替代整个手写 agentic loop
const runner = client.messages.toolRunner({
  model: "claude-opus-4-5",
  tools: [...],
  messages: [...],
})
runner.on("message", handler)
await runner.finalMessage()

// Zod 类型安全工具定义
const tool = betaZodTool({
  name: "read_file",
  schema: z.object({ path: z.string(), startLine: z.number().optional() }),
  execute: async ({ path, startLine }) => { ... }
})

// 内置 MCP 支持
const mcpClient = new Anthropic.MCPClient({ serverUrl: "..." })
const tools = await mcpClient.listTools()
```

### OpenCode 的选择

OpenCode (sst/opencode) 是目前架构最激进的开源 agent：
- 完全基于 Vercel AI SDK v5（`ai` catalog）
- 使用 `@modelcontextprotocol/sdk` 1.25.2 作为 MCP 核心
- `partial-json` 处理流式 JSON 解析
- `@parcel/watcher` 替代 chokidar（原生文件监听，更快）

---

## Phase 1: WorkSpace 模块修复

这些是已确认的 bug，修复成本低，先清理技术债。

### 已确认 Bug

- `formatFileToLines`：计算了行号但从未使用，返回无行号原始内容
- `read-file.tool.ts`：`lines` 变量赋值后未使用，响应仍用原始 `content`
- `path-helpers.ts`：`fileExistsAtPath` 用了同步 `accessSync` 但声明为 async

### 任务

- [ ] **1.1** 修复 `formatFileToLines`：输出 `${index + 1}: ${line}`
- [ ] **1.2** 修复 `read-file.tool.ts`：响应使用格式化行号内容
- [ ] **1.3** `read-file` schema 增加可选 `startLine` / `endLine`，按范围切片返回
- [ ] **1.4** 修复 `path-helpers.ts`：`accessSync` → `fs/promises` 的 `access`
- [ ] **1.5** `getCwd()` 增加可选 `hint` 路径参数，返回包含该路径的 workspace folder
- [ ] **1.6** `parseSourceCodeForDefinitionsTopLevel` 可解析文件上限从 50 → 200

---

## Phase 2: Agent 核心架构重构

这是真正的重构，不是打补丁。目标是把当前的手写 XML loop 替换成基于原生 SDK 的 cache-first 架构。

### Architecture 1: 迁移到原生 `tool_use` blocks

**现状**：工具调用通过 XML 字符串 `<vlinder_action><tool_name>...</tool_name></vlinder_action>` 传递，`chunk-process.ts` 手写解析器。

**目标**：使用 Anthropic 原生 `tool_use` content blocks，彻底删除 XML 解析逻辑。

**影响文件**：
- `chunk-process.ts` — 删除 XML 解析，改为处理 `tool_use` events
- `task-executor.ts` — `processApiResponse()` 改为处理 `content_block_start` / `input_json_delta`
- 所有 tool prompt 文件（`extension/src/agent/prompts/tools/`）— 删除 XML 格式说明
- `tool-executor.ts` — 改为接收 `{ type: "tool_use", id, name, input }` 而非解析 XML

**任务**：
- [ ] **2.1** 升级 `@anthropic-ai/sdk` 0.26.1 → 0.78.0
- [ ] **2.2** 重写 `chunk-process.ts`：基于 SDK 原生 streaming events（`content_block_start`, `content_block_delta`, `content_block_stop`, `message_delta`）
- [ ] **2.3** 重写 `task-executor.ts` 的 `processApiResponse()`：处理 `tool_use` blocks，构建 `tool_result` user messages
- [ ] **2.4** 删除所有 tool prompt 中的 XML 格式说明，改为 SDK 原生 tool schema 格式
- [ ] **2.5** 新增 `partial-json`（`npm i partial-json`）用于流式 tool input 解析

### Architecture 2: Cache-First System Prompt 设计

**现状**：`getEnvironmentDetails()` 每次 API 请求都重新构建整个 context，包括文件列表、diagnostics、dev server 状态。这些变量内容混在 system prompt 里，导致每次请求的前缀都不同，KV cache 永远无法命中。

**目标**：分离静态内容和动态内容。

```
[STATIC — 永远不变，cache 命中]
system prompt (角色定义、规则、工具说明)
tool definitions (完整 schema)

[DYNAMIC — 每次变化，追加为最后一条 user message]
environment_details (文件列表、diagnostics、dev server)
```

**任务**：
- [ ] **2.6** 重构 `main-agent.ts`：system prompt 提取为纯静态字符串，不包含任何运行时状态
- [ ] **2.7** `getEnvironmentDetails()` 的输出改为追加到每次 user message 末尾，而非注入 system prompt
- [ ] **2.8** 在 `createApiStreamRequest()` 调用时启用 `anthropic-beta: prompt-caching-2024-07-31`，对 system prompt 和 tool definitions 加 `cache_control: { type: "ephemeral" }`

### Architecture 3: Context Compaction

**现状**：没有 compaction 策略，上下文窗口满了就报错。

**目标**：实现 cache-safe compaction，保持 cache prefix 不变。

**策略**（参考 Claude Code）：
1. 检测 context 使用率 > 80%
2. 用相同的 system prompt + tools 发起压缩请求
3. 压缩 prompt：`"Summarize the conversation so far, preserving all technical decisions, file paths, and current task state."`
4. 用摘要替换中间的 conversation history，保留最近 N 条消息
5. Cache prefix（system prompt + tools）保持不变

**任务**：
- [ ] **2.9** 在 `api-history-manager.ts` 增加 `getTokenCount()` 方法，基于 `inputTokens` 估算当前 context 大小
- [ ] **2.10** 在 `makeClaudeRequest()` 前检查 context 使用率，超过阈值触发 compaction
- [ ] **2.11** 实现 `compactContext()` 方法：发起压缩请求，用摘要替换历史

### Architecture 4: MCP 集成

**现状**：完全没有 MCP 支持。Gemini CLI、OpenCode、Copilot、Claude Code 全部以 MCP 为核心。

**目标**：`@modelcontextprotocol/sdk` 作为 MCP 客户端，允许用户配置 MCP server，agent 可以调用 MCP tools。

**任务**：
- [ ] **2.12** 新增 `@modelcontextprotocol/sdk`（`npm i @modelcontextprotocol/sdk`）
- [ ] **2.13** 实现 `MCPManager`：读取用户配置的 MCP servers，建立连接，列出可用 tools
- [ ] **2.14** 将 MCP tools 动态注入到 tool definitions 中（在静态 tool schema 之后，保持 cache prefix 稳定）
- [ ] **2.15** 在 `tool-executor.ts` 中处理 MCP tool 调用，转发到对应 MCP server

### Architecture 5: Tool Lazy Loading（可选，P2）

**现状**：每次请求发送所有工具的完整 schema。

**目标**：发送轻量 stub，完整 schema 按需加载。

**任务**：
- [ ] **2.16** 实现 `ToolRegistry`：维护 stub（name + description）和 full schema 的映射
- [ ] **2.17** 新增 `tool_search` 内置工具：模型调用时返回匹配工具的完整 schema
- [ ] **2.18** 默认只发送 stubs，`tool_search` 结果追加到 conversation（不改变 system prompt，保持 cache）

---

## Phase 3: 界面布局现代化

在 Phase 2 完成后进行，避免在不稳定的后端上做 UI 工作。

### 已有依赖（无需新增）

- `@tanstack/react-virtual` ✅ — partner-panel 任务列表虚拟滚动
- `@radix-ui/react-tooltip` ✅ — 统一 tooltip
- `react-resizable-panels` ✅ — 替换手写拖拽
- `framer-motion` ✅ — 动画过渡

### 任务

- [ ] **3.1** `partner-panel.tsx` 任务列表接入 `@tanstack/react-virtual`
- [ ] **3.2** `input-v1.tsx` drag handle 迁移至 `react-resizable-panels`
- [ ] **3.3** 全局 tooltip 统一使用 `@radix-ui/react-tooltip`

---

## 执行顺序

Phase 1（bug 修复，1-2天）→ Phase 2 Architecture 1+2（核心重构，1周）→ Phase 2 Architecture 3+4（compaction + MCP，1周）→ Phase 3（UI，3天）

Phase 2 的 Architecture 1 和 2 必须同时进行，因为迁移到原生 tool_use 和 cache-first 设计是相互依赖的。
