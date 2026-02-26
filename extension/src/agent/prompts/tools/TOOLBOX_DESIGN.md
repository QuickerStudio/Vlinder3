# Toolbox Design Document

> 参考基准：Claude Code 18 工具极简设计哲学
> 当前状态：25 个工具
> 目标：合并至 ~15 个工具，每个工具职责单一、边界清晰

---

## 一、工具系统架构

每个工具由三层组成，合并/删除任何工具都需要同步修改三层：

```
schema/          ← Zod 参数定义 + XML 解析规则
runners/         ← 工具执行逻辑（BaseAgentTool 子类）
prompts/tools/   ← AI 提示词（description + examples）
```

注册入口：
- `schema/index.ts` — `tools[]` 数组，ToolParser 用它解析 XML
- `tool-executor.ts` — `createTool()` 的 `toolMap`，运行时路由
- `types/index.ts` — `ToolParams` 联合类型
- `prompts/tools/index.ts` — `toolPrompts[]`，注入 system prompt

---

## 二、现状问题分析

### 2.1 搜索工具过度碎片化（4个 → 1个）

| 现有工具 | schema | runner | 问题 |
|---|---|---|---|
| `grep_search` | `schema/grep-search.ts` | `runners/grep-search.tool.ts` | VS Code API 文本搜索 |
| `search_files` | `schema/search_files.ts` | `runners/search-files.tool.ts` | ripgrep 目录搜索，与 grep_search 高度重叠 |
| `pattern_search` | `schema/pattern-search.ts` | `runners/pattern-search.tool.ts` | 对已知文件深度分析，是 grep_search 的增强版 |
| `search_symbol` | `schema/search_symbols.ts` | `runners/search-symbols.tool.ts` | 语言感知符号搜索，可作为参数选项 |

Claude Code 用一个 `Grep`（ripgrep 驱动，参数丰富）覆盖所有场景。

### 2.2 文件读取分裂（3个 → 1个）

| 现有工具 | schema | runner | 问题 |
|---|---|---|---|
| `read_file` | `schema/read_file.ts` | `runners/read-file/read-file.tool.ts` | 读文本文件 |
| `read_image` | `schema/read-image.ts` | `runners/read-image.tool.ts` | 读图片，应是 read_file 的能力 |
| `explore_repo_folder` | `schema/explore-repo-folder.schema.ts` | `runners/explore-repo-folder.tool.ts` | 列代码定义，与 list_files 重叠 |

Claude Code 的 `Read` 自动检测文件类型，支持文本/图片/PDF/Notebook。

### 2.3 文件编辑过度分裂（5个 → 2个）

| 现有工具 | schema | runner | 问题 |
|---|---|---|---|
| `file_editor` | `schema/file_editor_tool.ts` | `runners/coders/file-editor.tool.ts` | 全文件编辑，支持 diff/rollback/版本管理 |
| `fast_editor` | `schema/fast-editor.ts` | `runners/fast-editor.tool.ts` | 快速 create/update/delete，与 file_editor 重叠 |
| `replace_string` | `schema/replace-string.ts` | `runners/replace-string.tool.ts` | 单文件单处字符串替换 |
| `multi_replace_string` | `schema/multi-replace-string.ts` | `runners/multi-replace-string.tool.ts` | 多文件多处字符串替换 |
| `insert_edit` | `schema/insert-edit.ts` | `runners/insert-edit.tool.ts` | 基于行号插入/替换，实践中不如字符串替换精确 |

Claude Code 用 `Edit`（字符串替换）+ `Write`（全文件写入）两个工具覆盖所有编辑场景。

### 2.4 终端工具重复（2个 → 1个）

| 现有工具 | schema | runner | 问题 |
|---|---|---|---|
| `terminal` | `schema/terminal.ts` | `runners/terminal.tool.ts` | 执行命令 |
| `server_runner` | `schema/dev_server.ts` | `runners/dev-server.tool.ts` | 管理长期运行服务，是 terminal 的特例 |

Claude Code 的 `Bash` 通过 `run_in_background` 参数支持后台进程，`BashOutput` 读取输出，`KillShell` 终止进程。

### 2.5 文件操作可合并（3个 → 2个）

`rename` 是 `move` 的特例（同目录移动），可合并为 `move` 的 `rename` 模式。

### 2.6 缺失工具

Claude Code 有但我们没有的：
- **`todo`**：任务追踪，对复杂多步骤任务非常有价值，避免 agent 遗漏步骤

---

## 三、重新设计的工具箱（15个）

### 分组 A：核心交互（3个，不变）

| 新工具名 | 合并自 | 变化 |
|---|---|---|
| `think` | `think` | 不变 |
| `ask_followup_question` | `ask_followup_question` | 不变 |
| `attempt_completion` | `attempt_completion` | 不变 |

### 分组 B：终端执行（1个，原2个）

| 新工具名 | 合并自 | 变化 |
|---|---|---|
| `terminal` | `terminal` + `server_runner` | schema 增加 `run_in_background: boolean`；增加 `commandType: "run" \| "get_output" \| "kill"` |

**runner 改动：** `terminal.tool.ts` 吸收 `dev-server.tool.ts` 的后台进程管理逻辑。

### 分组 C：文件读取（1个，原3个）

| 新工具名 | 合并自 | 变化 |
|---|---|---|
| `read_file` | `read_file` + `read_image` + `explore_repo_folder` | schema 增加 `show_definitions: boolean`；runner 自动检测文件类型，图片走原 read-image 逻辑 |

### 分组 D：文件浏览（1个，不变）

| 新工具名 | 合并自 | 变化 |
|---|---|---|
| `list_files` | `list_files` | 不变（explore_repo_folder 的能力并入 read_file） |

### 分组 E：代码搜索（1个，原4个）

| 新工具名 | 合并自 | 变化 |
|---|---|---|
| `search` | `grep_search` + `search_files` + `pattern_search` + `search_symbol` | 统一参数：`query`、`path`、`files`（指定文件列表）、`mode: "text" \| "regex" \| "symbol"`、`include_pattern`、`context_lines`、`case_sensitive` |

**runner 改动：** 新建 `runners/search.tool.ts`，根据参数路由到不同搜索策略。

### 分组 F：文件编辑（2个，原5个）

| 新工具名 | 合并自 | 变化 |
|---|---|---|
| `edit_file` | `replace_string` + `multi_replace_string` + `insert_edit` + `fast_editor` | 支持单/多处字符串替换（`replace_all`）；支持创建新文件（`mode: "create"`） |
| `write_file` | `file_editor` | 保留全文件写入 + 版本管理（rollback/list_versions） |

### 分组 G：文件系统操作（2个，原3个）

| 新工具名 | 合并自 | 变化 |
|---|---|---|
| `move_file` | `move` + `rename` | schema 增加 `rename_only: boolean`，runner 判断是否同目录操作 |
| `remove_file` | `remove` | 不变 |

### 分组 H：网络与视觉（1个，不变）

| 新工具名 | 合并自 | 变化 |
|---|---|---|
| `url_screenshot` | `url_screenshot` | 不变，这是区别于 Claude Code 的特色能力 |

### 分组 I：VSCode 集成（1个，不变）

| 新工具名 | 合并自 | 变化 |
|---|---|---|
| `vscode_api` | `vscode_api` | 不变，VSCode 扩展特有能力 |

### 分组 J：Agent 管理（2个，原1个 + 新增1个）

| 新工具名 | 合并自 | 变化 |
|---|---|---|
| `spawn_agent` | `spawn_agent` | 不变 |
| `todo` | 新增 | 参考 Claude Code TodoWrite，管理当前任务的 pending/in_progress/completed 状态列表 |

> `exit_agent`、`submit_review`、`timer` 保持现状：
> - `exit_agent`：子 agent 内部工具，由 `subtask.prompt.ts` 单独注入，不在主 prompt 中
> - `submit_review`：由 runner 内部触发，不需要 AI 主动调用
> - `timer`：有实际使用场景，Claude Code 没有不代表不需要

---

## 四、工具数量对比

```
现有（主 prompt）：25 个工具
目标：            15 个工具  （-40%）

Claude Code：     18 个工具（含平台特有工具）
```

---

## 五、每个工具的完整改动清单

### 5.1 需要新建的文件

| 文件 | 说明 |
|---|---|
| `schema/search.ts` | 合并4个搜索工具的 Zod schema |
| `runners/search.tool.ts` | 统一搜索 runner，内部路由 |
| `schema/todo.ts` | todo 工具 Zod schema |
| `runners/todo.tool.ts` | todo 工具 runner |
| `prompts/tools/todo.ts` | todo 工具提示词 |

### 5.2 需要修改的文件

| 文件 | 改动 |
|---|---|
| `schema/terminal.ts` | 增加 `run_in_background`、`commandType` 字段 |
| `runners/terminal.tool.ts` | 吸收 dev-server 后台进程逻辑 |
| `schema/read_file.ts` | 增加 `show_definitions` 字段 |
| `runners/read-file/read-file.tool.ts` | 增加图片检测分支 + 代码定义分支 |
| `schema/move.ts` | 增加 `rename_only` 字段 |
| `runners/move.tool.ts` | 增加 rename 模式 |
| `schema/index.ts` | 更新 `tools[]` 数组 |
| `tool-executor.ts` | 更新 `toolMap`，保留旧工具名别名 |
| `types/index.ts` | 更新 `ToolParams` 联合类型 |
| `prompts/tools/index.ts` | 更新 `toolPrompts[]` |

### 5.3 需要删除的文件（合并后）

| 文件层 | 待删除 |
|---|---|
| schema | `grep-search.ts`、`search_files.ts`、`pattern-search.ts`、`search_symbols.ts`、`read-image.ts`、`explore-repo-folder.schema.ts`、`dev_server.ts`、`rename.ts`、`fast-editor.ts`、`replace-string.ts`、`multi-replace-string.ts`、`insert-edit.ts` |
| runners | `grep-search.tool.ts`、`search-files.tool.ts`、`pattern-search.tool.ts`、`search-symbols.tool.ts`、`read-image.tool.ts`、`explore-repo-folder.tool.ts`、`dev-server.tool.ts`、`rename.tool.ts`、`fast-editor.tool.ts`、`replace-string.tool.ts`、`multi-replace-string.tool.ts`、`insert-edit.tool.ts` |
| prompts/tools | `grep-search.ts`、`search-files.ts`、`pattern-search.ts`、`search-symbol.ts`、`read-image.ts`、`explore-repo-folder.ts`、`server-runner.ts`、`rename.ts`、`fast-editor.ts`、`replace-string.ts`、`multi-replace-string.ts`、`insert-edit.ts` |

### 5.4 需要更新的 webview UI

| 文件 | 改动 |
|---|---|
| `webview-ui-vite/src/components/chat-row/chat-tools.tsx` | 更新 switch/case，合并对应 ToolBlock |
| `AgentRuntime/shared/new-tools.ts` | 更新 ChatTool 联合类型 |

---

## 六、向后兼容策略

旧工具名在 `tool-executor.ts` 的 `toolMap` 中保留别名映射，确保历史任务记录不因工具名变更而出错：

```typescript
// 向后兼容别名
grep_search: SearchTool,
search_files: SearchTool,
pattern_search: SearchTool,
search_symbol: SearchTool,
read_image: ReadFileTool,
explore_repo_folder: ReadFileTool,
server_runner: TerminalTool,
rename: MoveFileTool,
fast_editor: EditFileTool,
replace_string: EditFileTool,
multi_replace_string: EditFileTool,
insert_edit: EditFileTool,
```

---

## 七、实施顺序（按风险从低到高）

### 第一阶段：低风险，独立合并
1. `rename` → 合并进 `move`（rename 是 move 的特例）
2. `read_image` → 合并进 `read_file`（增加类型检测）
3. 新增 `todo` 工具

### 第二阶段：中风险，需要测试
4. `server_runner` → 合并进 `terminal`（增加后台进程支持）
5. `explore_repo_folder` → 合并进 `read_file`（增加 show_definitions 参数）

### 第三阶段：高风险，需要完整回归
6. 搜索工具合并（4→1）：新建 `search` 工具，删除4个旧工具
7. 编辑工具合并（5→2）：整合为 `edit_file` + `write_file`

每个阶段完成后需要完整的 agent 行为回归测试，确认工具调用正确、UI 状态正常。
