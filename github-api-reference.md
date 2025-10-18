# GitHub Integration API Reference

## 📡 API 端点完整列表

本文档列出了 VlinderB GitHub 集成的所有 RPC API 端点。

---

## 🔐 认证 (Authentication)

### `authenticateGitHub`
**描述**: 使用 GitHub OAuth 登录

**输入**:
```typescript
{}
```

**输出**:
```typescript
{
  success: boolean;
  account?: {
    username: string;
    email?: string;
    avatarUrl?: string;
  };
  error?: string;
}
```

**使用示例**:
```typescript
const result = await rpcClient.authenticateGitHub.use({});
```

---

### `getGitHubAccount`
**描述**: 获取当前登录的账户信息

**输入**:
```typescript
{}
```

**输出**:
```typescript
{
  authenticated: boolean;
  account?: {
    username: string;
    email?: string;
    avatarUrl?: string;
  };
}
```

**使用示例**:
```typescript
const result = await rpcClient.getGitHubAccount.use({});
```

---

### `logoutGitHub`
**描述**: 登出当前账户

**输入**:
```typescript
{}
```

**输出**:
```typescript
{
  success: boolean;
}
```

**使用示例**:
```typescript
await rpcClient.logoutGitHub.use({});
```

---

### `fetchGitHubAvatar`
**描述**: 获取用户头像 URL

**输入**:
```typescript
{
  username: string;
}
```

**输出**:
```typescript
{
  avatarUrl: string;
}
```

---

## ⚙️ 设置 (Settings)

### `getGitHubSettings`
**描述**: 获取 GitHub 设置

**输入**:
```typescript
{}
```

**输出**:
```typescript
{
  settings: {
    defaultCloneDirectory: string;
  };
}
```

**使用示例**:
```typescript
const result = await rpcClient.getGitHubSettings.use({});
```

---

### `updateGitHubSettings`
**描述**: 更新 GitHub 设置

**输入**:
```typescript
{
  defaultCloneDirectory?: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  settings?: {
    defaultCloneDirectory: string;
  };
  error?: string;
}
```

**使用示例**:
```typescript
const result = await rpcClient.updateGitHubSettings.use({
  defaultCloneDirectory: 'C:\\Projects\\GitHub'
});
```

---

### `getGitHubAgentSettings`
**描述**: 获取 Agent 设置

**输入**:
```typescript
{}
```

**输出**:
```typescript
{
  settings: {
    enabled: boolean;
    model: string;
    customPrompt?: string;
  };
}
```

---

### `updateGitHubAgentSettings`
**描述**: 更新 Agent 设置

**输入**:
```typescript
{
  enabled?: boolean;
  model?: string;
  customPrompt?: string;
}
```

**输出**:
```typescript
{
  success: boolean;
}
```

---

### `enableGitHubAgent`
**描述**: 启用/禁用 GitHub Agent

**输入**:
```typescript
{
  enabled: boolean;
}
```

**输出**:
```typescript
{
  success: boolean;
}
```

---

### `selectGitHubAgentModel`
**描述**: 选择 Agent 模型

**输入**:
```typescript
{
  model: string;
}
```

**输出**:
```typescript
{
  success: boolean;
}
```

---

### `currentGitHubAgentModel`
**描述**: 获取当前 Agent 模型

**输入**:
```typescript
{}
```

**输出**:
```typescript
{
  model: string;
}
```

---

### `customizeGitHubAgentPrompt`
**描述**: 自定义 Agent 提示词

**输入**:
```typescript
{
  prompt: string;
}
```

**输出**:
```typescript
{
  success: boolean;
}
```

---

## 📚 Wiki 操作 (Wiki Operations)

### `cloneWikiAndInitialize`
**描述**: 克隆 Wiki 仓库并初始化

**输入**:
```typescript
{
  repoFullName: string;      // e.g., "owner/repo"
  wikiCloneUrl: string;      // e.g., "https://github.com/owner/repo.wiki.git"
  targetPath?: string;       // Optional custom path
}
```

**输出**:
```typescript
{
  success: boolean;
  localPath?: string;
  message?: string;
  isCloned?: boolean;
  error?: string;
}
```

**使用示例**:
```typescript
const result = await rpcClient.cloneWikiAndInitialize.use({
  repoFullName: 'microsoft/vscode',
  wikiCloneUrl: 'https://github.com/microsoft/vscode.wiki.git'
});
```

---

### `getWikiCloneStatus`
**描述**: 获取 Wiki 克隆状态

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  isCloned: boolean;
  localPath?: string;
  clonedAt?: string;
}
```

**使用示例**:
```typescript
const status = await rpcClient.getWikiCloneStatus.use({
  repoFullName: 'microsoft/vscode'
});
```

---

### `verifyWikiCloneStatus`
**描述**: 验证 Wiki 克隆状态（检查文件系统）

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  isCloned: boolean;
  localPath?: string;
}
```

---

### `updateWikiCloneStatus`
**描述**: 手动更新 Wiki 克隆状态

**输入**:
```typescript
{
  repoFullName: string;
  isCloned: boolean;
  localPath?: string;
}
```

**输出**:
```typescript
{
  success: boolean;
}
```

---

### `syncAllWikiStatuses`
**描述**: 同步所有 Wiki 状态

**输入**:
```typescript
{}
```

**输出**:
```typescript
{
  synced: number;
  removed: number;
}
```

---

### `deleteLocalWiki`
**描述**: 删除本地 Wiki 仓库

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

---

### `getWikiHistory`
**描述**: 获取 Wiki 提交历史

**输入**:
```typescript
{
  repoFullName: string;
  maxCount?: number;
}
```

**输出**:
```typescript
{
  success: boolean;
  commits?: Array<{
    hash: string;
    message: string;
    author: string;
    email?: string;
    date: string;
    refs?: string;
  }>;
  error?: string;
}
```

**使用示例**:
```typescript
const result = await rpcClient.getWikiHistory.use({
  repoFullName: 'microsoft/vscode',
  maxCount: 50
});
```

---

### `openWikiFile`
**描述**: 在编辑器中打开 Wiki 文件

**输入**:
```typescript
{
  repoFullName: string;
  filePath: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  error?: string;
}
```

---

### `openWikiFolderInExplorer`
**描述**: 在文件资源管理器中打开 Wiki 文件夹

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  error?: string;
}
```

---

## 💻 代码操作 (Code Operations)

### `cloneCodeAndInitialize`
**描述**: 克隆代码仓库并初始化

**输入**:
```typescript
{
  repoFullName: string;
  codeCloneUrl: string;
  targetPath?: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  localPath?: string;
  message?: string;
  isCloned?: boolean;
  error?: string;
}
```

**使用示例**:
```typescript
const result = await rpcClient.cloneCodeAndInitialize.use({
  repoFullName: 'microsoft/vscode',
  codeCloneUrl: 'https://github.com/microsoft/vscode.git'
});
```

---

### `getCodeCloneStatus`
**描述**: 获取代码仓库克隆状态

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  isCloned: boolean;
  localPath?: string;
  clonedAt?: string;
}
```

---

### `verifyCodeCloneStatus`
**描述**: 验证代码仓库克隆状态

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  isCloned: boolean;
  localPath?: string;
}
```

---

### `syncAllCodeStatuses`
**描述**: 同步所有代码仓库状态

**输入**:
```typescript
{}
```

**输出**:
```typescript
{
  synced: number;
  removed: number;
}
```

---

### `deleteLocalCode`
**描述**: 删除本地代码仓库

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

---

### `getCodeHistory`
**描述**: 获取代码提交历史

**输入**:
```typescript
{
  repoFullName: string;
  maxCount?: number;
}
```

**输出**:
```typescript
{
  success: boolean;
  commits?: Array<{
    hash: string;
    message: string;
    author: string;
    email?: string;
    date: string;
    refs?: string;
  }>;
  error?: string;
}
```

---

### `getCommitActivity`
**描述**: 获取提交活动统计（从本地仓库）

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  activity?: Array<{
    date: string;
    count: number;
  }>;
  error?: string;
}
```

---

### `getCommitActivityFromAPI`
**描述**: 获取提交活动统计（从 GitHub API）

**输入**:
```typescript
{
  owner: string;
  repo: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  activity?: {
    all: number[];
    owner: number[];
  };
  error?: string;
}
```

**使用示例**:
```typescript
const result = await rpcClient.getCommitActivityFromAPI.use({
  owner: 'microsoft',
  repo: 'vscode'
});
```

---

### `openCodeFile`
**描述**: 在编辑器中打开代码文件

**输入**:
```typescript
{
  repoFullName: string;
  filePath: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  error?: string;
}
```

---

### `openCodeFolderInExplorer`
**描述**: 在文件资源管理器中打开代码文件夹

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  error?: string;
}
```

---

## 🔧 工作区操作 (Workspace Operations)

### `openCodeFolder`
**描述**: 在新窗口中打开代码文件夹

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  error?: string;
}
```

---

### `openCodeInVSCode`
**描述**: 在 VSCode 中打开代码（同 `openCodeFolder`）

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  error?: string;
}
```

---

### `addCodeToWorkspace`
**描述**: 将代码文件夹添加到当前工作区

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  error?: string;
}
```

---

### `openWikiFolder`
**描述**: 在新窗口中打开 Wiki 文件夹

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  error?: string;
}
```

---

### `openWikiInVSCode`
**描述**: 在 VSCode 中打开 Wiki

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  error?: string;
}
```

---

### `addWikiToWorkspace`
**描述**: 将 Wiki 文件夹添加到当前工作区

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  error?: string;
}
```

---

## 📝 Issue 操作 (Issues)

### `listGitHubIssues`
**描述**: 列出仓库的 Issues

**输入**:
```typescript
{
  owner: string;
  repo: string;
  state?: 'open' | 'closed' | 'all';
  page?: number;
  perPage?: number;
}
```

**输出**:
```typescript
{
  success: boolean;
  issues?: Array<{
    id: number;
    number: number;
    title: string;
    body: string | null;
    state: 'open' | 'closed';
    author: string;
    createdAt: string;
    updatedAt: string;
    url: string;
    labels: string[];
  }>;
  error?: string;
}
```

**使用示例**:
```typescript
const result = await rpcClient.listGitHubIssues.use({
  owner: 'microsoft',
  repo: 'vscode',
  state: 'open',
  page: 1,
  perPage: 30
});
```

---

### `updateGitHubIssue`
**描述**: 更新 Issue 状态

**输入**:
```typescript
{
  owner: string;
  repo: string;
  issueNumber: number;
  state?: 'open' | 'closed';
  title?: string;
  body?: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  issue?: any;
  error?: string;
}
```

---

## 🔀 Pull Request 操作 (Pull Requests)

### `listGitHubPullRequests`
**描述**: 列出仓库的 Pull Requests

**输入**:
```typescript
{
  owner: string;
  repo: string;
  state?: 'open' | 'closed' | 'all';
  page?: number;
  perPage?: number;
}
```

**输出**:
```typescript
{
  success: boolean;
  pullRequests?: Array<{
    id: number;
    number: number;
    title: string;
    body: string | null;
    state: 'open' | 'closed';
    author: string;
    createdAt: string;
    updatedAt: string;
    url: string;
    head: string;
    base: string;
  }>;
  error?: string;
}
```

**使用示例**:
```typescript
const result = await rpcClient.listGitHubPullRequests.use({
  owner: 'microsoft',
  repo: 'vscode',
  state: 'open'
});
```

---

### `updateGitHubPullRequest`
**描述**: 更新 PR 状态

**输入**:
```typescript
{
  owner: string;
  repo: string;
  pullNumber: number;
  state?: 'open' | 'closed';
  title?: string;
  body?: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  pullRequest?: any;
  error?: string;
}
```

---

### `mergeGitHubPullRequest`
**描述**: 合并 Pull Request

**输入**:
```typescript
{
  owner: string;
  repo: string;
  pullNumber: number;
  mergeMethod?: 'merge' | 'squash' | 'rebase';
  commitTitle?: string;
  commitMessage?: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  merged?: boolean;
  sha?: string;
  error?: string;
}
```

---

### `checkoutPullRequest`
**描述**: Checkout PR 到本地

**输入**:
```typescript
{
  repoFullName: string;
  pullNumber: number;
}
```

**输出**:
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

---

### `viewPRChanges`
**描述**: 查看 PR 的变更

**输入**:
```typescript
{
  repoFullName: string;
  pullNumber: number;
}
```

**输出**:
```typescript
{
  success: boolean;
  changes?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
  error?: string;
}
```

---

### `getPRLocalStatus`
**描述**: 获取 PR 的本地状态

**输入**:
```typescript
{
  repoFullName: string;
  pullNumber: number;
}
```

**输出**:
```typescript
{
  isCheckedOut: boolean;
  currentBranch?: string;
}
```

---

## ⚡ GitHub Actions 操作

### `listGitHubWorkflows`
**描述**: 列出仓库的 Workflows

**输入**:
```typescript
{
  owner: string;
  repo: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  workflows?: Array<{
    id: number;
    name: string;
    path: string;
    state: string;
    created_at: string;
    updated_at: string;
  }>;
  error?: string;
}
```

**使用示例**:
```typescript
const result = await rpcClient.listGitHubWorkflows.use({
  owner: 'microsoft',
  repo: 'vscode'
});
```

---

### `triggerGitHubWorkflow`
**描述**: 触发 Workflow

**输入**:
```typescript
{
  owner: string;
  repo: string;
  workflowId: number | string;
  ref?: string;
  inputs?: Record<string, any>;
}
```

**输出**:
```typescript
{
  success: boolean;
  error?: string;
}
```

---

### `enableGitHubWorkflow`
**描述**: 启用 Workflow

**输入**:
```typescript
{
  owner: string;
  repo: string;
  workflowId: number | string;
}
```

**输出**:
```typescript
{
  success: boolean;
  error?: string;
}
```

---

### `disableGitHubWorkflow`
**描述**: 禁用 Workflow

**输入**:
```typescript
{
  owner: string;
  repo: string;
  workflowId: number | string;
}
```

**输出**:
```typescript
{
  success: boolean;
  error?: string;
}
```

---

### `getGitHubWorkflowRuns`
**描述**: 获取 Workflow 运行历史

**输入**:
```typescript
{
  owner: string;
  repo: string;
  workflowId: number | string;
  page?: number;
  perPage?: number;
}
```

**输出**:
```typescript
{
  success: boolean;
  runs?: Array<{
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    created_at: string;
    updated_at: string;
    html_url: string;
  }>;
  error?: string;
}
```

---

## 🤖 Agent API - Wiki

### `agentReadWikiFile`
**描述**: Agent 读取 Wiki 文件

**输入**:
```typescript
{
  repoFullName: string;
  filePath: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  content?: string;
  error?: string;
}
```

---

### `agentWriteWikiFile`
**描述**: Agent 写入 Wiki 文件

**输入**:
```typescript
{
  repoFullName: string;
  filePath: string;
  content: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

---

### `agentCreateWikiPage`
**描述**: Agent 创建 Wiki 页面

**输入**:
```typescript
{
  repoFullName: string;
  pageName: string;
  content: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  filePath?: string;
  error?: string;
}
```

---

### `agentListWikiFiles`
**描述**: Agent 列出 Wiki 文件

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  files?: string[];
  error?: string;
}
```

---

### `agentDeleteWikiPage`
**描述**: Agent 删除 Wiki 页面

**输入**:
```typescript
{
  repoFullName: string;
  filePath: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

---

### `agentSyncWiki`
**描述**: Agent 同步 Wiki（pull + push）

**输入**:
```typescript
{
  repoFullName: string;
  commitMessage?: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

---

### `agentGetWikiDiff`
**描述**: Agent 获取 Wiki 差异

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  diff?: string;
  error?: string;
}
```

---

## 🤖 Agent API - Code

### `agentReadCodeFile`
**描述**: Agent 读取代码文件

**输入**:
```typescript
{
  repoFullName: string;
  filePath: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  content?: string;
  error?: string;
}
```

---

### `agentWriteCodeFile`
**描述**: Agent 写入代码文件

**输入**:
```typescript
{
  repoFullName: string;
  filePath: string;
  content: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

---

### `agentCreateCodeFile`
**描述**: Agent 创建代码文件

**输入**:
```typescript
{
  repoFullName: string;
  filePath: string;
  content: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

---

### `agentListCodeFiles`
**描述**: Agent 列出代码文件

**输入**:
```typescript
{
  repoFullName: string;
  path?: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  files?: string[];
  error?: string;
}
```

---

### `agentDeleteCodeFile`
**描述**: Agent 删除代码文件

**输入**:
```typescript
{
  repoFullName: string;
  filePath: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

---

### `agentSyncCode`
**描述**: Agent 同步代码（pull + push）

**输入**:
```typescript
{
  repoFullName: string;
  commitMessage?: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  message?: string;
  error?: string;
}
```

---

### `agentGetCodeDiff`
**描述**: Agent 获取代码差异

**输入**:
```typescript
{
  repoFullName: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  diff?: string;
  error?: string;
}
```

---

## 📦 Legacy APIs

### `listGitHubRepositories`
**描述**: 列出用户的所有仓库

**输入**:
```typescript
{
  page?: number;
  perPage?: number;
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
}
```

**输出**:
```typescript
{
  success: boolean;
  repositories: Array<{
    id: number;
    name: string;
    fullName: string;
    description: string | null;
    url: string;
    cloneUrl: string;
    private: boolean;
    updatedAt: string;
    stargazersCount?: number;
    forksCount?: number;
    hasWiki?: boolean;
  }>;
  error?: string;
}
```

**使用示例**:
```typescript
const result = await rpcClient.listGitHubRepositories.use({
  sort: 'updated',
  page: 1,
  perPage: 100
});
```

---

### `cloneGitHubRepository`
**描述**: 克隆仓库（遗留方法，推荐使用 `cloneCodeAndInitialize`）

**输入**:
```typescript
{
  cloneUrl: string;
  targetPath?: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  message?: string;
  path?: string;
  error?: string;
}
```

---

### `forkRepository`
**描述**: Fork 仓库

**输入**:
```typescript
{
  owner: string;
  repo: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  repository?: any;
  error?: string;
}
```

---

### `starRepository`
**描述**: Star 仓库

**输入**:
```typescript
{
  owner: string;
  repo: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  error?: string;
}
```

---

### `unstarRepository`
**描述**: Unstar 仓库

**输入**:
```typescript
{
  owner: string;
  repo: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  error?: string;
}
```

---

### `listPullRequests`
**描述**: 列出 PR（遗留方法，推荐使用 `listGitHubPullRequests`）

---

### `createPullRequest`
**描述**: 创建 PR

**输入**:
```typescript
{
  owner: string;
  repo: string;
  title: string;
  body?: string;
  head: string;
  base: string;
}
```

**输出**:
```typescript
{
  success: boolean;
  pullRequest?: any;
  error?: string;
}
```

---

### `mergePullRequest`
**描述**: 合并 PR（遗留方法，推荐使用 `mergeGitHubPullRequest`）

---

### `listIssues`
**描述**: 列出 Issues（遗留方法，推荐使用 `listGitHubIssues`）

---

### `createIssue`
**描述**: 创建 Issue

**输入**:
```typescript
{
  owner: string;
  repo: string;
  title: string;
  body?: string;
  labels?: string[];
}
```

**输出**:
```typescript
{
  success: boolean;
  issue?: any;
  error?: string;
}
```

---

### `updateIssue`
**描述**: 更新 Issue（遗留方法，推荐使用 `updateGitHubIssue`）

---

### `getWikiPages`
**描述**: 获取 Wiki 页面列表（GitHub API，不推荐）

---

### `createWikiPage`
**描述**: 创建 Wiki 页面（GitHub API，不推荐）

---

### `updateWikiPage`
**描述**: 更新 Wiki 页面（GitHub API，不推荐）

---

## 📊 API 统计

- **总端点数**: 80+
- **分类**:
  - 认证: 4
  - 设置: 8
  - Wiki 操作: 15
  - Code 操作: 14
  - 工作区: 6
  - Issues: 2
  - Pull Requests: 6
  - GitHub Actions: 5
  - Agent API (Wiki): 7
  - Agent API (Code): 7
  - Legacy: 15+

---

## 🔍 快速查找

### 按功能分类

#### 用户认证
- `authenticateGitHub`
- `getGitHubAccount`
- `logoutGitHub`

#### 仓库列表
- `listGitHubRepositories`

#### 克隆操作
- `cloneCodeAndInitialize` ⭐
- `cloneWikiAndInitialize` ⭐
- `cloneGitHubRepository` (Legacy)

#### 获取状态
- `getCodeCloneStatus`
- `getWikiCloneStatus`
- `verifyCodeCloneStatus`
- `verifyWikiCloneStatus`

#### 删除本地仓库
- `deleteLocalCode`
- `deleteLocalWiki`

#### 查看历史
- `getCodeHistory`
- `getWikiHistory`
- `getCommitActivity`

#### PR 和 Issue
- `listGitHubPullRequests`
- `listGitHubIssues`
- `createPullRequest`
- `createIssue`

#### Agent 操作
- `agentReadCodeFile` / `agentReadWikiFile`
- `agentWriteCodeFile` / `agentWriteWikiFile`
- `agentListCodeFiles` / `agentListWikiFiles`
- `agentSyncCode` / `agentSyncWiki`

---

**文档版本**: 1.0  
**最后更新**: 2025-10-18  
**总端点数**: 80+

