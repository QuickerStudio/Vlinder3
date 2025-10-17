# Think工具的TODO List功能

## 概述

think工具现在支持TODO List功能，允许AI代理在思考过程中创建和管理任务列表，用于组织复杂的多步骤工作流程。

## 功能特性

### 1. TODO项结构

每个TODO项包含以下字段：

- **id** (必填): 唯一标识符，用于跟踪任务
- **task** (必填): 任务描述
- **status** (必填): 任务状态
  - `pending`: 待处理
  - `in_progress`: 进行中
  - `completed`: 已完成
  - `cancelled`: 已取消
- **priority** (可选): 优先级级别
  - `low`: 低优先级
  - `medium`: 中优先级
  - `high`: 高优先级
  - `critical`: 关键优先级

### 2. 使用场景

TODO List功能特别适用于以下场景：

- 复杂的代码重构，需要协调多个文件的修改
- 功能实现需要跨越多个层级（数据库、后端、前端等）
- 需要系统性地跟踪进度的多步骤任务
- 需要根据优先级组织工作顺序的项目

## 使用示例

### 示例1: 基本的TODO List

```xml
<tool name="think">
  <thought>
    需要为系统添加用户认证功能。这是一个涉及多个步骤的任务：
    1. 设计数据库schema
    2. 实现后端认证逻辑
    3. 创建API端点
    4. 更新前端界面
    
    让我创建一个TODO列表来跟踪这些步骤。
  </thought>
  <conclusion>需要系统性地实现认证功能</conclusion>
  <next_action>开始阅读现有的代码库结构</next_action>
  <todo_list>
    <item>
      <id>auth-001</id>
      <task>分析现有代码库的认证相关代码</task>
      <status>in_progress</status>
      <priority>high</priority>
    </item>
    <item>
      <id>auth-002</id>
      <task>设计用户和角色的数据库schema</task>
      <status>pending</status>
      <priority>high</priority>
    </item>
    <item>
      <id>auth-003</id>
      <task>实现JWT认证中间件</task>
      <status>pending</status>
      <priority>high</priority>
    </item>
    <item>
      <id>auth-004</id>
      <task>创建登录和注册API端点</task>
      <status>pending</status>
      <priority>medium</priority>
    </item>
    <item>
      <id>auth-005</id>
      <task>更新前端登录界面</task>
      <status>pending</status>
      <priority>low</priority>
    </item>
  </todo_list>
</tool>
```

### 示例2: 带优先级的复杂工作流

```xml
<tool name="think">
  <thought>
    重构数据库访问层是一个关键任务，需要仔细规划：
    
    高优先级任务（必须首先完成）：
    - 审查现有代码
    - 设计新的架构
    - 创建迁移计划
    
    中优先级任务（核心功能）：
    - 实现新的数据访问层
    - 更新业务逻辑层
    
    低优先级任务（优化）：
    - 性能优化
    - 文档更新
  </thought>
  <conclusion>需要分阶段进行数据库访问层重构</conclusion>
  <next_action>开始审查现有的数据库访问代码</next_action>
  <todo_list>
    <item>
      <id>refactor-001</id>
      <task>审查所有现有的数据库访问代码</task>
      <status>in_progress</status>
      <priority>critical</priority>
    </item>
    <item>
      <id>refactor-002</id>
      <task>设计新的数据访问层架构</task>
      <status>pending</status>
      <priority>critical</priority>
    </item>
    <item>
      <id>refactor-003</id>
      <task>创建代码迁移计划</task>
      <status>pending</status>
      <priority>high</priority>
    </item>
    <item>
      <id>refactor-004</id>
      <task>实现新的Repository模式</task>
      <status>pending</status>
      <priority>high</priority>
    </item>
    <item>
      <id>refactor-005</id>
      <task>更新业务逻辑层以使用新的数据访问层</task>
      <status>pending</status>
      <priority>medium</priority>
    </item>
    <item>
      <id>refactor-006</id>
      <task>优化查询性能</task>
      <status>pending</status>
      <priority>low</priority>
    </item>
    <item>
      <id>refactor-007</id>
      <task>更新技术文档</task>
      <status>pending</status>
      <priority>low</priority>
    </item>
  </todo_list>
</tool>
```

## 技术实现

### 架构变更

1. **Schema层** (`extension/src/agent/v1/tools/schema/think.ts`)
   - 添加了`todo_list`字段到Zod schema
   - 定义了TODO项的结构和验证规则

2. **执行层** (`extension/src/agent/v1/tools/runners/think.tool.ts`)
   - 扩展了`execute`方法以处理TODO list
   - 添加了`buildThinkingRecord`方法来格式化TODO输出
   - 添加了`getStatusIcon`方法来为不同状态显示图标
   - 扩展了日志记录以包含TODO信息

3. **类型定义** (`extension/src/shared/new-tools.ts`)
   - 更新了`ThinkTool`类型以包含`todo_list`字段

4. **提示词** (`extension/src/agent/v1/prompts/tools/think.ts`)
   - 更新了工具描述以包含TODO list功能
   - 添加了新的能力说明
   - 添加了包含TODO list的示例

## 最佳实践

### 何时使用TODO List

✅ **应该使用**:
- 任务涉及3个以上的明确步骤
- 需要跨多个文件或系统进行协调
- 需要跟踪进度和完成状态
- 需要根据优先级组织工作

❌ **不应该使用**:
- 简单的单步任务
- 直接明了的操作
- 不需要跟踪的临时思考

### TODO项命名规范

建议的ID命名格式：
- 使用描述性前缀（如：`auth-`, `refactor-`, `feature-`）
- 使用递增的数字后缀（`001`, `002`, `003`等）
- 保持一致性以便于识别和跟踪

示例：
- `auth-001`, `auth-002` - 认证相关任务
- `db-001`, `db-002` - 数据库相关任务
- `ui-001`, `ui-002` - 用户界面相关任务

### 状态管理

建议的状态转换流程：
```
pending → in_progress → completed
                     ↘ cancelled
```

- 从`pending`（待处理）开始
- 开始工作时更新为`in_progress`（进行中）
- 完成后标记为`completed`（已完成）
- 不再需要时标记为`cancelled`（已取消）

### 优先级设置

- **critical** (关键): 必须立即完成，阻塞其他工作
- **high** (高): 重要且紧急，应优先处理
- **medium** (中): 正常优先级，按顺序处理
- **low** (低): 可以稍后处理，不影响核心功能

## 输出格式

think工具的响应会包含格式化的TODO列表：

```xml
<think_tool_response>
  <status>success</status>
  <timestamp>2025-10-17T12:00:00.000Z</timestamp>
  <thinking_summary>
    <conclusion>任务已分解为可跟踪的步骤</conclusion>
    <next_action>开始执行第一个任务</next_action>
    <todo_list>
      <todo id="task-001" status="in_progress" priority="high">
        🔄 完成需求分析 [HIGH]
      </todo>
      <todo id="task-002" status="pending" priority="medium">
        ⏳ 设计系统架构 [MEDIUM]
      </todo>
      <todo id="task-003" status="pending" priority="low">
        ⏳ 编写文档 [LOW]
      </todo>
    </todo_list>
  </thinking_summary>
  <note>
    Thinking process recorded. This space was used for reasoning and planning.
    Key insights have been identified.
    TODO list created with 3 tasks.
  </note>
</think_tool_response>
```

## 状态图标

- ⏳ `pending` - 待处理
- 🔄 `in_progress` - 进行中
- ✅ `completed` - 已完成
- ❌ `cancelled` - 已取消

## 总结

TODO List功能为think工具增加了强大的任务管理能力，使AI代理能够更好地组织和跟踪复杂的多步骤工作流程。通过合理使用这个功能，可以提高工作的系统性和可追溯性。

