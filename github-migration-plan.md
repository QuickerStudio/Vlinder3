# GitHub 集成迁移计划

## 📋 目标
将 `VlinderB` 中完整的 GitHub 集成功能迁移到主项目 `Vlinder`。

---

## 🗂️ 文件清单

### 需要迁移的后端文件

#### 1. GitHub 集成核心目录
```
从: VlinderB/extension/src/integrations/github/
到: Vlinder/extension/src/integrations/github/
```

**包含的子目录和文件**:
```
github/
├── api/
│   ├── agent/
│   │   ├── code/          # Code Agent API
│   │   └── wiki/          # Wiki Agent API
│   ├── github-api.ts      # HTTP 客户端
│   └── utils/
│       └── auth.ts
├── models/                 # 数据模型（基于 GitHub Desktop）
│   ├── account.ts
│   ├── author.ts
│   ├── branch.ts
│   ├── commit.ts
│   ├── github-repository.ts
│   ├── pull-request.ts
│   ├── issue.ts
│   ├── owner.ts
│   ├── repository.ts
│   └── ... (共30+个模型文件)
├── router/                 # API 路由
│   ├── auth/              # 认证
│   ├── code/              # 代码操作
│   ├── wiki/              # Wiki 操作
│   ├── issues/            # Issue 管理
│   ├── pull-requests/     # PR 管理
│   ├── actions/           # GitHub Actions
│   ├── workspace/         # 工作区
│   ├── settings/          # 设置
│   ├── legacy/            # 遗留 API
│   ├── index.ts           # 路由注册
│   └── types.ts
├── stores/                 # 状态存储
│   ├── accounts-store.ts   # 账户管理
│   └── signin-store.ts     # 登录流程
├── __tests__/             # 测试
└── index.ts               # 主导出
```

**文件数量**: 约 100+ 个文件

---

### 需要迁移的前端文件

#### 2. GitHub UI 组件目录
```
从: VlinderB/extension/webview-ui-vite/src/components/settings-view/preferences/github-card/
到: Vlinder/extension/webview-ui-vite/src/components/settings-view/preferences/github-card/
```

**包含的子目录和文件**:
```
github-card/
├── components/
│   ├── dialogs/
│   │   ├── create-issue.tsx
│   │   ├── create-pr.tsx
│   │   ├── github-settings-dialog.tsx
│   │   ├── wiki-commit-detail.tsx
│   │   └── index.ts
│   ├── tabs/
│   │   ├── code.tsx
│   │   ├── pull-requests.tsx
│   │   ├── issues.tsx
│   │   ├── wiki.tsx
│   │   ├── actions.tsx
│   │   ├── commit-activity.tsx
│   │   └── index.ts
│   ├── ui/
│   │   ├── top-bar.tsx
│   │   ├── tab-nav.tsx
│   │   ├── status-dot.tsx
│   │   └── index.ts
│   ├── LoginView.tsx
│   ├── RepositoriesSidebar.tsx
│   └── index.ts
├── hooks/
│   ├── github-auth.ts
│   ├── repositories.ts
│   ├── pull-requests.ts
│   ├── issues.ts
│   ├── wiki.ts
│   └── index.ts
└── types.ts
```

**文件数量**: 约 30 个文件

#### 3. GitHub Tab 入口
```
从: VlinderB/extension/webview-ui-vite/src/components/settings-view/github-tab.tsx
到: Vlinder/extension/webview-ui-vite/src/components/settings-view/github-tab.tsx
```

---

### 需要修改的现有文件

#### 4. 后端路由注册
```
文件: Vlinder/extension/src/router/app-router.ts
```
**修改内容**:
```typescript
// 添加导入
import { githubRouter } from '../integrations/github';

// 在 mergeRouters 中添加
export const appRouter = mergeRouters(
  taskRouter,
  gitRouter,
  providerRouter,
  agentRouter,
  githubRouter  // 新增
);
```

#### 5. 前端 Settings 页面
```
文件: Vlinder/extension/webview-ui-vite/src/components/settings-view/[主设置组件]
```
**修改内容**:
- 添加 "GitHub" Tab
- 导入并渲染 `GitHubTab` 组件

---

## 📦 依赖项检查

### NPM 包依赖

#### 后端依赖 (extension/package.json)
```json
{
  "dependencies": {
    "simple-git": "^3.x",      // Git 操作
    "axios": "^1.x",            // HTTP 请求
    "@types/node": "^20.x"      // Node 类型
  }
}
```

#### 前端依赖 (webview-ui-vite/package.json)
```json
{
  "dependencies": {
    "lucide-react": "^0.x",     // 图标（可能已存在）
    "recharts": "^2.x"          // 图表（用于 Commit Activity）
  }
}
```

**检查步骤**:
1. 查看 `Vlinder/extension/package.json`
2. 查看 `Vlinder/extension/webview-ui-vite/package.json`
3. 确认是否已安装上述依赖
4. 如果没有，需要安装

---

## 🔧 前置条件验证

### 1. 状态管理器
GitHub 集成依赖以下状态管理器：

- **`GlobalStateManager`** - 全局状态存储
  - 位置: `extension/src/providers/state/global-state-manager.ts`
  - 方法: `getGlobalState()`, `updateGlobalState()`

- **`SecretStateManager`** - 安全状态存储
  - 位置: `extension/src/providers/state/secret-state-manager.ts`
  - 方法: `getSecret()`, `storeSecret()`, `deleteSecret()`

**验证方法**:
```bash
# 检查文件是否存在
ls Vlinder/extension/src/providers/state/
```

### 2. RPC 通信
前端需要通过 `rpcClient` 与后端通信：

- **`rpcClient`**
  - 位置: `webview-ui-vite/src/lib/rpc-client.ts`
  - 类型: 自动从 `AppRouter` 生成

**验证方法**:
```typescript
// 检查 rpcClient 是否正确导入
import { rpcClient } from '@/lib/rpc-client';
```

### 3. Procedure 和 Router 工具
后端 API 使用统一的 Procedure Pattern：

- **`procedure`**
  - 位置: `extension/src/router/utils/procedure.ts`
  - 导出: `createProcedure()`, `procedure`

- **`router`**
  - 位置: `extension/src/router/utils/router.ts`
  - 导出: `router()`, `mergeRouters()`

**验证方法**:
```bash
# 检查文件是否存在
ls Vlinder/extension/src/router/utils/
```

---

## 📋 迁移步骤

### 阶段 1: 环境准备

#### 步骤 1.1: 验证依赖
```bash
cd Vlinder/extension
pnpm install simple-git axios
```

```bash
cd Vlinder/extension/webview-ui-vite
pnpm install recharts  # 如果还没有
```

#### 步骤 1.2: 验证前置条件
- [ ] 确认 `GlobalStateManager` 存在
- [ ] 确认 `SecretStateManager` 存在
- [ ] 确认 `procedure` 和 `router` 工具存在
- [ ] 确认 `rpcClient` 正常工作

---

### 阶段 2: 后端迁移

#### 步骤 2.1: 复制 GitHub 集成目录
```bash
# 复制整个 github 目录
cp -r VlinderB/extension/src/integrations/github \
      Vlinder/extension/src/integrations/
```

#### 步骤 2.2: 检查导入路径
检查以下文件的导入路径是否正确：

**需要检查的导入**:
```typescript
// 状态管理器
import { GlobalStateManager } from '../../../providers/state/global-state-manager';
import { SecretStateManager } from '../../../providers/state/secret-state-manager';

// 路由工具
import { procedure } from '../../../router/utils';
import { router } from '../../../router/utils/router';

// VSCode API
import * as vscode from 'vscode';
```

**检查方法**:
1. 打开 `Vlinder/extension/src/integrations/github/` 目录
2. 使用 IDE 的"查找所有引用"功能
3. 确认所有导入路径正确

#### 步骤 2.3: 注册 GitHub Router
编辑 `Vlinder/extension/src/router/app-router.ts`：

```typescript
// 1. 添加导入
import { githubRouter } from '../integrations/github';

// 2. 合并路由
export const appRouter = mergeRouters(
  taskRouter,
  gitRouter,
  providerRouter,
  agentRouter,
  githubRouter  // 新增
);
```

#### 步骤 2.4: 编译验证
```bash
cd Vlinder/extension
pnpm run build
```

检查是否有编译错误。

---

### 阶段 3: 前端迁移

#### 步骤 3.1: 复制 GitHub 组件
```bash
# 复制 github-card 目录
cp -r VlinderB/extension/webview-ui-vite/src/components/settings-view/preferences/github-card \
      Vlinder/extension/webview-ui-vite/src/components/settings-view/preferences/

# 复制 github-tab.tsx
cp VlinderB/extension/webview-ui-vite/src/components/settings-view/github-tab.tsx \
   Vlinder/extension/webview-ui-vite/src/components/settings-view/
```

#### 步骤 3.2: 检查前端导入路径
检查以下导入是否正确：

```typescript
// RPC Client
import { rpcClient } from '@/lib/rpc-client';

// UI 组件（确认路径别名 @/components）
import { Card, CardContent, ... } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
```

#### 步骤 3.3: 添加 GitHub Tab 到 Settings

找到主 Settings 组件（可能是 `SettingsView.tsx` 或类似文件）：

```typescript
import GitHubTab from './github-tab';

// 在 Tabs 中添加
<TabsList>
  {/* ... 其他 Tab */}
  <TabsTrigger value="github">GitHub</TabsTrigger>
</TabsList>

<TabsContent value="github">
  <GitHubTab />
</TabsContent>
```

#### 步骤 3.4: 编译验证
```bash
cd Vlinder/extension/webview-ui-vite
pnpm run build
```

检查是否有编译错误。

---

### 阶段 4: 功能测试

#### 步骤 4.1: 启动扩展
```bash
cd Vlinder/extension
pnpm run watch  # 或 pnpm run dev
```

在 VSCode 中按 F5 启动调试。

#### 步骤 4.2: 测试认证
1. 打开 Settings 页面
2. 切换到 "GitHub" Tab
3. 点击 "Login with GitHub"
4. 完成 OAuth 授权
5. 验证是否显示用户信息

#### 步骤 4.3: 测试仓库列表
1. 验证仓库列表是否加载
2. 测试搜索功能
3. 测试排序功能
4. 测试"只显示已克隆"过滤

#### 步骤 4.4: 测试克隆功能
1. 选择一个仓库
2. 在 Code Tab 点击 "Clone Repository"
3. 验证克隆是否成功
4. 检查文件系统中的克隆目录
5. 验证克隆状态是否正确更新

#### 步骤 4.5: 测试 Wiki 功能
1. 选择一个有 Wiki 的仓库
2. 切换到 Wiki Tab
3. 点击 "Clone Wiki"
4. 验证 Wiki 历史加载
5. 测试文件打开

#### 步骤 4.6: 测试 PR/Issue
1. 切换到 Pull Requests Tab
2. 验证 PR 列表加载
3. 测试状态筛选
4. 切换到 Issues Tab
5. 验证 Issue 列表加载

#### 步骤 4.7: 测试设置
1. 点击设置按钮（齿轮图标）
2. 修改 Clone Directory
3. 保存设置
4. 验证设置是否持久化

---

### 阶段 5: 清理和优化

#### 步骤 5.1: 删除未使用的文件
检查是否有以下文件可以删除：
- 测试文件（`*.test.ts`）
- 文档文件（`*.md`）- 除非需要保留
- 备份文件（`*.zip`）

#### 步骤 5.2: 代码审查
- [ ] 检查所有 `console.log` 语句
- [ ] 检查所有 `TODO` 注释
- [ ] 检查错误处理是否完整
- [ ] 检查类型定义是否完整

#### 步骤 5.3: 性能优化
- [ ] 确认异步操作都有 loading 状态
- [ ] 确认大列表有虚拟滚动（如果需要）
- [ ] 确认 API 请求有缓存（如果需要）

---

## 🐛 常见问题和解决方案

### 问题 1: 编译错误 - 找不到模块
**症状**: `Cannot find module '../../providers/state/...'`

**解决方案**:
1. 检查相对路径是否正确
2. 确认目标文件存在
3. 调整 `../` 的数量

### 问题 2: RPC 调用失败
**症状**: `rpcClient.xxx is not a function`

**解决方案**:
1. 确认 `githubRouter` 已在 `app-router.ts` 中注册
2. 重新编译后端和前端
3. 重启扩展调试会话
4. 检查 RPC 类型生成是否正确

### 问题 3: Token 存储失败
**症状**: 登录成功但刷新后丢失

**解决方案**:
1. 确认 `SecretStateManager` 正常工作
2. 检查 VSCode 权限
3. 查看控制台错误日志

### 问题 4: 克隆失败
**症状**: `Clone failed: spawn git ENOENT`

**解决方案**:
1. 确认系统已安装 Git
2. 确认 Git 在 PATH 中
3. 尝试在终端手动执行 `git --version`

### 问题 5: UI 组件样式错误
**症状**: 组件显示不正常

**解决方案**:
1. 确认 Shadcn UI 组件库已安装
2. 确认 Tailwind CSS 配置正确
3. 检查 CSS 导入

---

## ✅ 验收清单

### 功能完整性
- [ ] 登录/登出功能正常
- [ ] 仓库列表加载正常
- [ ] 搜索和排序功能正常
- [ ] Code 克隆功能正常
- [ ] Wiki 克隆功能正常
- [ ] 克隆状态正确显示和持久化
- [ ] PR 列表加载正常
- [ ] Issue 列表加载正常
- [ ] GitHub Actions 列表正常
- [ ] Commit Activity 可视化正常
- [ ] 设置保存和加载正常

### 性能和体验
- [ ] 所有异步操作有 loading 状态
- [ ] 错误有友好提示
- [ ] 无明显性能问题
- [ ] UI 响应流畅

### 代码质量
- [ ] 无 TypeScript 编译错误
- [ ] 无 ESLint 警告
- [ ] 代码格式统一
- [ ] 注释清晰完整

---

## 📊 迁移进度追踪

| 阶段 | 任务 | 状态 | 备注 |
|-----|------|------|------|
| 1 | 环境准备 | ⬜ 待开始 | |
| 2 | 后端迁移 | ⬜ 待开始 | |
| 3 | 前端迁移 | ⬜ 待开始 | |
| 4 | 功能测试 | ⬜ 待开始 | |
| 5 | 清理优化 | ⬜ 待开始 | |

**状态标识**:
- ⬜ 待开始
- 🟡 进行中
- ✅ 已完成
- ❌ 有问题

---

## 📞 需要帮助时

如果在迁移过程中遇到问题，可以：

1. **查看日志**
   - VSCode 开发者工具控制台
   - 扩展 Host 日志（Help > Toggle Developer Tools）

2. **对比源文件**
   - 对比 `VlinderB` 中的原始文件
   - 检查是否有遗漏的修改

3. **分步验证**
   - 先验证后端 API 是否正常（使用 Postman 或类似工具）
   - 再验证前端是否能正常调用

4. **回滚测试**
   - 使用 Git 提交每个阶段
   - 出问题时可以回滚到上一个阶段

---

**文档版本**: 1.0  
**创建时间**: 2025-10-18  
**作者**: AI Assistant

