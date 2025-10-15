# 工具系统分析报告

## 问题诊断

### 🔴 核心问题
`extension/src/agent/v1/prompts/tools/index.ts` 文件导入了4个不存在的文件，导致**编译失败**，进而阻止整个AI工具系统加载。

### 缺失的导入
1. **`fetch-webpage.ts`** - 第23行导入，第74行使用
2. **`get-errors.ts`** - 第19行导入，第78行使用  
3. **`context7.ts`** - 第31行导入，第85行使用
4. **`compress-context.ts`** - 第32行导入，第86行使用

这些文件在 `extension/src/agent/v1/prompts/tools/` 目录中不存在，导致TypeScript编译器无法解析这些模块，整个工具系统初始化失败。

---

## 工具注册完整流程

通过分析 `read_file` 工具，我总结了工具注册的完整流程：

### 1. Schema 定义 (`tools/schema/*.ts`)
```typescript
// schema/read_file.ts
import { z } from "zod"

const schema = z.object({
    path: z.string().describe("The path of the file to read")
})

export const readFileTool = {
    schema: {
        name: "read_file",
        schema,
    },
    examples: [...]
}
```

**作用**: 定义工具的参数验证规则和基本元数据

### 2. Prompt 定义 (`prompts/tools/*.ts`)
```typescript
// prompts/tools/read-file.ts
export const readFilePrompt: ToolPromptSchema = {
    name: 'read_file',
    description: '...',
    parameters: {
        path: {
            type: 'string',
            description: '...',
            required: true,
        },
    },
    capabilities: [...],
    examples: [...]
}
```

**作用**: 定义提供给AI的工具描述、参数说明、能力描述和使用示例

### 3. Tool 实现 (`tools/runners/**/*.tool.ts`)
```typescript
// tools/runners/read-file/read-file.tool.ts
export class ReadFileTool extends BaseAgentTool<ReadFileToolParams> {
    async execute() {
        // 工具执行逻辑
    }
}
```

**作用**: 实现工具的实际执行逻辑

### 4. 注册到系统

#### Schema 注册 (`tools/schema/index.ts`)
```typescript
import { readFileTool } from "./read_file"

export const tools = [
    readFileTool,
    // ... 其他工具
] as const
```

#### Prompt 注册 (`prompts/tools/index.ts`)
```typescript
import { readFilePrompt } from './read-file'

export const toolPrompts = [
    readFilePrompt,
    // ... 其他工具
]
```

#### Tool 导出 (`tools/index.ts`)
```typescript
export * from "./runners/read-file/read-file.tool"
```

### 5. 提示词构建流程

```
buildPromptFromTemplate() 
  ↓
new PromptBuilder(config)
  ↓
builder.addTools(toolPrompts)  ← 这里会遍历 toolPrompts 数组
  ↓
builder.build()
  ↓
生成包含所有工具描述的系统提示词
```

在 `PromptBuilder.generateSectionContent('toolSection')` 方法中，会为每个工具生成格式化的描述：

```markdown
# tool_name

Description: ...

Parameters:
- param1: (required) description
- param2: (optional) description

## Examples:
### Example description
> Kodu Output :
<kodu_action>...</kodu_action>
```

---

## 工具对比分析

### Schema vs Prompts 文件对比

| 功能 | Schema文件 | Prompt文件 | 状态 |
|------|-----------|-----------|------|
| read_file | ✅ | ✅ | 正常 |
| web_search | ✅ | ❌ | Schema存在，缺Prompt |
| write_to_file | ✅ | ❌ | Schema存在，缺Prompt |
| dev_server | ✅ | ✅ (server-runner) | 正常 |
| submit_review | ✅ | ✅ | 正常 |
| fetch_webpage | ❌ | ❌ 被错误导入 | 文件不存在 |
| get_errors | ❌ | ❌ 被错误导入 | 文件不存在 |
| context7 | ❌ | ❌ 被错误导入 | 文件不存在 |
| compress_context | ❌ | ❌ 被错误导入 | 文件不存在 |

### 为什么 web_search 和 write_to_file 有Schema但没有Prompt？

这可能是设计决策：
- **web_search**: 可能被 `url_screenshot` 或其他网络工具替代
- **write_to_file**: 可能被 `file_editor` 工具替代，后者提供更完整的文件编辑功能

只有在 `toolPrompts` 数组中的工具才会被提供给AI，所以即使有Schema定义，如果没有对应的Prompt定义并注册，AI也看不到这个工具。

---

## 修复方案

### ✅ 已实施的修复

从 `extension/src/agent/v1/prompts/tools/index.ts` 中移除以下内容：

1. 移除导入：
```typescript
- import { getErrorsPrompt } from './get-errors';
- import { fetchWebpagePrompt } from './fetch-webpage';
- import { context7Prompt } from './context7';
- import { compressContextPrompt } from './compress-context';
```

2. 从 `toolPrompts` 数组中移除引用：
```typescript
- fetchWebpagePrompt,
- getErrorsPrompt,
- context7Prompt,
- compressContextPrompt,
```

### 验证结果

✅ 编译器无错误  
✅ Linter 无错误  
✅ 所有导入的文件都存在  
✅ 所有在 `toolPrompts` 数组中引用的工具都已正确导入  

---

## 建议和最佳实践

### 1. 添加新工具时的检查清单

- [ ] 在 `schema/` 目录创建 schema 文件
- [ ] 在 `prompts/tools/` 目录创建 prompt 文件
- [ ] 在 `runners/` 目录创建 tool 实现
- [ ] 在 `schema/index.ts` 中导入并添加到 `tools` 数组
- [ ] 在 `prompts/tools/index.ts` 中导入并添加到 `toolPrompts` 数组
- [ ] 在 `tools/index.ts` 中导出工具类
- [ ] 运行编译验证无错误

### 2. 工具命名约定

**文件命名**:
- Schema: `snake_case.ts` (例如: `read_file.ts`)
- Prompt: `kebab-case.ts` (例如: `read-file.ts`)
- Tool: `kebab-case.tool.ts` (例如: `read-file.tool.ts`)

**导出命名**:
- Schema: `{name}Tool` (例如: `readFileTool`)
- Prompt: `{name}Prompt` (例如: `readFilePrompt`)
- Tool类: `{Name}Tool` (例如: `ReadFileTool`)

### 3. 避免未来出现类似问题

建议添加编译时检查或测试：

```typescript
// 在 prompts/tools/index.ts 中添加类型检查
import { tools as schemaTools } from '../../tools/schema'

// 确保每个在 toolPrompts 中的工具名称都有对应的 schema
type ToolName = typeof schemaTools[number]['schema']['name']
type PromptToolName = typeof toolPrompts[number]['name']

// 这会在编译时捕获不匹配的工具名称
const _check: PromptToolName extends ToolName ? true : false = true
```

---

## 总结

**根本原因**: 导入不存在的文件导致模块加载失败  
**影响范围**: 整个AI工具系统无法初始化  
**修复状态**: ✅ 已完成  
**测试状态**: ✅ 编译通过，无Linter错误

系统现在应该能够正确加载所有已注册的工具，AI将能够看到并使用这些工具。

