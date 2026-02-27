# 2026 年 AI Agent 核心技术名词

## 多智能体协作层

**Agent Teams**
多个 agent 实例共享任务列表、互相发消息、并行协作。Claude Code 实验性功能，基于 7 个原语构建：TeamCreate / TaskCreate / TaskUpdate / TaskList / Task / SendMessage / TeamDelete。与 Subagents 的核心区别：agent 之间可以直接通信，不需要通过主 agent 中转。

**Agent Handoff**
agent 把控制权转交给另一个专职 agent。OpenAI Agents SDK 的核心原语。例如 triage agent 分析请求后 handoff 给 code agent 或 test agent。工具定义不变，context 不变，只是执行主体切换。

**Hierarchical Agents**
管理 agent（orchestrator）+ 专职 worker agent 的层级结构。管理 agent 负责规划和分配，worker agent 负责执行。适合复杂任务的分解和并行处理。

**Agent as Tool**
把整个 agent 封装成另一个 agent 的工具调用。调用方不需要知道被调用 agent 的内部实现，只需要知道输入输出契约。

**Subagent Spawning**
主 agent 动态生成子 agent 处理子任务。每个子 agent 有独立的 context window，完成后结果返回主 agent。适合需要上下文隔离的并行任务。

---

## 工具调用层

**Programmatic Tool Calling（程序化工具调用）**
编排层主动规划工具调用序列，不完全依赖模型决定调用什么。可以定义工具调用的 DAG，有依赖关系的串行，无依赖的并行。

**Parallel Tool Calls（单轮多工具调用）**
一次 LLM 响应返回多个 tool_use blocks，全部并行执行，结果打包一起返回。相比串行调用，速度提升显著。Anthropic 和 OpenAI API 均支持，需要 `parallel_tool_calls: true`。

**Tool Orchestration**
工具调用的编排层。定义工具之间的依赖关系、执行顺序、错误处理和重试策略。类似 DAG 调度器，但针对 LLM tool calls。

**Tool Schema as Contract**
工具定义是严格的 JSON Schema，包含类型约束、枚举值、必填字段、`additionalProperties: false`。调用前验证（pre-call validate），调用后验证输出（post-call verify）。工具是契约，不只是代码。

**On-demand Tool Retrieval（工具懒加载）**
默认只发送工具的轻量 stub（name + description），完整 schema 按需加载。模型调用 `tool_search` 时才返回完整定义。节省大量 context token，保持 KV cache 稳定。

**MCP（Model Context Protocol）**
工具调用的跨进程标准协议。工具运行在独立进程（MCP Server），agent 通过标准协议调用。Gemini CLI、OpenCode、Copilot、Claude Code 全部采用。2025 年已成为行业标准。

---

## 上下文管理层

**Context Engineering**
把 context window 当稀缺资源来设计整个系统。不只是写好 prompt，而是设计信息的检索、注入、压缩、外化的完整流程。2025 年取代 prompt engineering 成为核心工程技能。

**KV Cache / Prompt Caching**
稳定的 prompt 前缀命中服务端 KV cache，避免重复计算。成本降低最高 90%，延迟降低最高 85%。核心原则：静态内容（system prompt、tool definitions）永远在前，动态内容（conversation）永远在后。

**Context Compaction**
上下文窗口接近上限时，压缩历史对话为摘要，保留最近 N 条消息。关键：压缩时保持 system prompt 和 tool definitions 不变，维持 KV cache 命中。

**Externalizing Context（上下文外化）**
把计划、任务状态、中间结果写到文件系统，agent 按需读取，不占用 context window。允许 agent 在 context 满了之后继续工作，也支持任务中断后恢复。

**"Stay in the Smart Half"**
保持 context window 使用率低于 50%。研究表明相关信息埋在长 context 中间时，模型性能下降 30% 以上（"Lost in the Middle" 效应）。低于一半时模型表现最好。

**Progressive Disclosure**
分层暴露代码库结构，不一次性全量注入。先给高层概览，agent 按需深入具体文件。避免 context 被无关信息填满。

---

## 记忆层

**Working Memory（工作记忆）**
当前任务的活跃 context window 内容。容量有限，任务结束后消失。

**Episodic Memory（情节记忆）**
本次会话的完整交互记录。可以持久化到磁盘，支持会话恢复。

**Semantic Memory（语义记忆）**
跨会话的持久化知识：项目结构、用户偏好、代码库约定。通常存储为向量数据库或结构化文件，按需检索注入 context。

**Procedural Memory（程序记忆）**
如何做事的记忆：工具使用模式、常用工作流、成功的解决方案模板。可以通过 fine-tuning 或 few-shot examples 实现。

**Durable State / Checkpoint-Resume**
agent 执行过程中定期保存检查点。崩溃或中断后能从最近检查点恢复，不需要重头开始。对长时间运行的任务（数小时）至关重要。

---

## 推理与规划层

**ReAct（Reasoning + Acting）**
交替推理（Thought）和行动（Action）的循环：观察当前状态 → 推理下一步 → 执行工具 → 观察结果 → 继续推理。灵活但 LLM 调用次数多。

**Plan-and-Execute**
先生成完整执行计划，再逐步执行。规划阶段 1 次 LLM 调用，执行阶段按计划走。比 ReAct 减少 LLM 调用次数，但计划需要足够准确。

**Reflexion / Self-Critique（自我批判）**
agent 对自己的输出做批判性评估，识别错误和改进点，然后重新生成。类似人类的"写完再检查"。可以显著降低错误率。

**Self-Healing（自愈）**
检测到错误（linting error、test failure、runtime exception）后自动重试或换策略，不需要人工干预。现代 coding agent 的标配能力。

**Speculative Execution（推测执行）**
预测 agent 下一步可能需要什么（文件内容、工具结果），提前并行执行，结果缓存备用。降低感知延迟。

---

## 安全与可观测性层

**Guardrails**
输入输出验证层，与 agent 执行并行运行（不是串行检查）。输入 guardrail 过滤有害请求，输出 guardrail 验证结果符合预期。OpenAI Agents SDK 的核心原语之一。

**Agent Sandboxing**
在隔离环境（容器、VM）中运行 agent，防止破坏宿主系统。Cursor Cloud Agents 在独立 VM 上运行，能自测、录 demo、提 PR。

**Human-in-the-Loop**
关键步骤暂停等待人工确认。不是全程监督，而是在高风险操作（删除文件、部署代码）前插入人工审核节点。

**Tracing / Observability**
完整记录 agent 的每一步决策、工具调用、中间状态。用于调试、性能优化、行为审计。OpenAI Agents SDK 内置 tracing，支持 OpenTelemetry。

**Least-Privilege Execution**
agent 只拥有完成当前任务所需的最小权限。文件系统访问范围限制、API 调用白名单、敏感操作需要额外授权。

---

## 前沿能力层

**Computer Use**
agent 直接操作 GUI：截图、点击、输入、滚动。不需要 API，直接像人一样使用软件。Anthropic Claude Cowork、OpenAI Codex 均已支持。

**Cloud Agents**
在云端隔离 VM 上运行的 agent，能长时间自主工作：构建代码、运行测试、录制 demo 视频、生成 merge-ready PR。Cursor 于 2026.02.24 发布。

**Structured Outputs**
强制模型输出符合预定义 JSON Schema 的结构化数据。不是解析模型的自由文本，而是模型直接输出结构化结果。消除输出解析的不确定性。

**Streaming Structured Output**
流式输出的同时解析结构化数据。使用 `partial-json` 等库处理不完整的 JSON 片段，实现低延迟的结构化流式响应。

**Extended Thinking / Interleaved Thinking**
模型在工具调用之间插入推理步骤（thinking blocks）。不只是最终答案前的 chain-of-thought，而是贯穿整个 agentic loop 的持续推理。Anthropic `betas: ['interleaved-thinking-2025-05-14']`。

**Agentic Coding（自主编程）**
agent 能完整执行编程任务：理解需求 → 分解子任务 → 编写代码 → 运行测试 → 修复错误 → 提交 PR，全程无需人工干预。2026 年的行业标准目标。

---

## 参考来源

- OpenAI Agents SDK: https://github.com/openai/openai-agents-python
- Claude Code Agent Teams: https://alexop.dev/posts/from-tasks-to-swarms-agent-teams-in-claude-code
- Coding Agents Feb 2026: https://calv.info/agents-feb-2026
- AI Agent Architecture Patterns: https://redis.io/blog/ai-agent-architecture-patterns
- How AI Agents Use Tools 2026: https://skywork.ai/blog/ai-agents-using-tools-ultimate-guide-2026
- Context Engineering: https://weaviate.io/blog/context-engineering
