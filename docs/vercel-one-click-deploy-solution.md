# Vercel 一键部署完整方案（完全自动化）

## 📋 方案概述

**目标**：用户在 VS Code 中点击一个按钮，自动将当前项目部署到 Vercel，无需任何手动操作。

**技术栈**：
- **前端**：VS Code Extension (已有的 Vlinder 扩展)
- **后端**：Node.js/Express 服务 (需要部署到你的服务器)
- **第三方**：Vercel REST API + GitHub API

---

## 🎯 完整流程

```
用户点击"Deploy to Vercel"
    ↓
扩展检测当前项目 Git 仓库
    ↓
调用后端 API: POST /api/vercel/deploy
    ↓
后端处理：
  1. 检查用户 Vercel Token (如无则引导 OAuth)
  2. 检查项目是否已存在
  3. 创建/更新 Vercel 项目
  4. 绑定 GitHub 仓库
  5. 触发部署
    ↓
返回部署状态和 URL
    ↓
扩展显示结果
```

---

## 📦 后端服务架构

### 1. 数据库设计

```sql
-- 用户表
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  vscode_user_id VARCHAR(100) UNIQUE,  -- VS Code 用户标识
  vercel_access_token TEXT,            -- Vercel OAuth Token (加密存储)
  vercel_team_id VARCHAR(50),          -- Vercel Team ID (可选)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 部署记录表
CREATE TABLE deployments (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) REFERENCES users(id),
  project_name VARCHAR(100),
  repo_url TEXT,
  vercel_project_id VARCHAR(50),
  vercel_deployment_id VARCHAR(100),
  deployment_url TEXT,
  status VARCHAR(20),  -- pending, building, ready, error
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. API 接口设计

#### 2.1 初始化/检查授权状态
```
GET /api/vercel/auth/status?userId=<vscode_user_id>

Response:
{
  "authorized": true/false,
  "authUrl": "https://your-backend.com/api/vercel/auth/start?userId=xxx"  // 如果未授权
}
```

#### 2.2 Vercel OAuth 授权流程
```
# Step 1: 开始授权
GET /api/vercel/auth/start?userId=<vscode_user_id>
→ 重定向到 Vercel OAuth 页面

# Step 2: OAuth 回调
GET /api/vercel/auth/callback?code=<code>&state=<userId>
→ 交换 access_token
→ 存储到数据库
→ 重定向到成功页面
```

#### 2.3 一键部署接口（核心）
```
POST /api/vercel/deploy

Request Body:
{
  "userId": "vscode_user_xxx",          // VS Code 用户 ID
  "repoUrl": "https://github.com/user/repo",
  "projectName": "my-project",
  "branch": "main",
  "framework": "nextjs",                // 可选：nextjs, vite, static 等
  "envVars": {                          // 可选：环境变量
    "API_KEY": "xxx",
    "DATABASE_URL": "xxx"
  }
}

Response:
{
  "success": true,
  "deploymentId": "dpl_xxx",
  "deploymentUrl": "https://my-project.vercel.app",
  "inspectUrl": "https://vercel.com/user/project/dpl_xxx",
  "status": "building"
}
```

#### 2.4 查询部署状态
```
GET /api/vercel/deploy/status/:deploymentId?userId=<userId>

Response:
{
  "status": "ready",  // pending, building, ready, error
  "url": "https://my-project.vercel.app",
  "readyAt": "2025-10-18T12:34:56Z"
}
```

---

## 🔧 后端核心实现

### 3.1 Vercel API 调用封装

```typescript
// src/services/vercel.service.ts
import axios from 'axios';

export class VercelService {
  private baseUrl = 'https://api.vercel.com';
  
  constructor(private accessToken: string) {}
  
  // 创建项目
  async createProject(projectName: string, gitRepo: { 
    type: 'github', 
    repo: string  // "owner/repo"
  }) {
    const response = await axios.post(
      `${this.baseUrl}/v9/projects`,
      {
        name: projectName,
        gitRepository: gitRepo,
        framework: 'nextjs',  // 自动检测
        buildCommand: null,   // 使用默认
        devCommand: null,
        installCommand: null
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }
  
  // 设置环境变量
  async setEnvVariables(projectId: string, envVars: Record<string, string>) {
    const promises = Object.entries(envVars).map(([key, value]) =>
      axios.post(
        `${this.baseUrl}/v10/projects/${projectId}/env`,
        {
          key,
          value,
          type: 'encrypted',
          target: ['production', 'preview', 'development']
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )
    );
    await Promise.all(promises);
  }
  
  // 触发部署
  async createDeployment(projectName: string, gitSource: {
    type: 'github',
    repo: string,
    ref: string  // branch name
  }) {
    const response = await axios.post(
      `${this.baseUrl}/v13/deployments`,
      {
        name: projectName,
        gitSource,
        target: 'production'
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }
  
  // 查询部署状态
  async getDeployment(deploymentId: string) {
    const response = await axios.get(
      `${this.baseUrl}/v13/deployments/${deploymentId}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      }
    );
    return response.data;
  }
}
```

### 3.2 部署接口实现

```typescript
// src/routes/deploy.route.ts
import { Router } from 'express';
import { VercelService } from '../services/vercel.service';
import { db } from '../db';

const router = Router();

router.post('/deploy', async (req, res) => {
  const { userId, repoUrl, projectName, branch = 'main', envVars } = req.body;
  
  try {
    // 1. 获取用户 Vercel Token
    const user = await db.users.findOne({ vscode_user_id: userId });
    if (!user || !user.vercel_access_token) {
      return res.status(401).json({
        error: 'Not authorized',
        authUrl: `${process.env.BACKEND_URL}/api/vercel/auth/start?userId=${userId}`
      });
    }
    
    const vercel = new VercelService(user.vercel_access_token);
    
    // 2. 解析 GitHub 仓库信息
    const repoMatch = repoUrl.match(/github\.com[\/:](.+?)\/(.+?)(\.git)?$/);
    if (!repoMatch) {
      return res.status(400).json({ error: 'Invalid GitHub repository URL' });
    }
    const [, owner, repoName] = repoMatch;
    const repo = `${owner}/${repoName.replace('.git', '')}`;
    
    // 3. 检查项目是否存在（可选：如果存在则直接部署）
    let projectId: string;
    try {
      const existingProject = await vercel.getProject(projectName);
      projectId = existingProject.id;
    } catch {
      // 项目不存在，创建新项目
      const project = await vercel.createProject(projectName, {
        type: 'github',
        repo
      });
      projectId = project.id;
      
      // 设置环境变量
      if (envVars && Object.keys(envVars).length > 0) {
        await vercel.setEnvVariables(projectId, envVars);
      }
    }
    
    // 4. 触发部署
    const deployment = await vercel.createDeployment(projectName, {
      type: 'github',
      repo,
      ref: branch
    });
    
    // 5. 保存部署记录
    await db.deployments.insert({
      user_id: user.id,
      project_name: projectName,
      repo_url: repoUrl,
      vercel_project_id: projectId,
      vercel_deployment_id: deployment.id,
      deployment_url: deployment.url,
      status: 'building'
    });
    
    // 6. 返回结果
    res.json({
      success: true,
      deploymentId: deployment.id,
      deploymentUrl: `https://${deployment.url}`,
      inspectUrl: deployment.inspectorUrl,
      status: deployment.readyState
    });
    
  } catch (error: any) {
    console.error('Deploy error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Deployment failed',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

// 查询部署状态
router.get('/deploy/status/:deploymentId', async (req, res) => {
  const { deploymentId } = req.params;
  const { userId } = req.query;
  
  try {
    const user = await db.users.findOne({ vscode_user_id: userId });
    if (!user) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    
    const vercel = new VercelService(user.vercel_access_token);
    const deployment = await vercel.getDeployment(deploymentId);
    
    // 更新数据库状态
    await db.deployments.update(
      { vercel_deployment_id: deploymentId },
      { status: deployment.readyState }
    );
    
    res.json({
      status: deployment.readyState,
      url: `https://${deployment.url}`,
      readyAt: deployment.ready
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 3.3 OAuth 授权实现

```typescript
// src/routes/auth.route.ts
import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

// Vercel OAuth 配置（需要在 Vercel Dashboard 创建 Integration）
const VERCEL_CLIENT_ID = process.env.VERCEL_CLIENT_ID!;
const VERCEL_CLIENT_SECRET = process.env.VERCEL_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.BACKEND_URL}/api/vercel/auth/callback`;

router.get('/auth/start', (req, res) => {
  const { userId } = req.query;
  const state = crypto.randomBytes(16).toString('hex');
  
  // 存储 state 和 userId 的映射（可以用 Redis）
  // 这里简化处理，实际应该用安全的方式
  const authUrl = `https://vercel.com/integrations/xxx/new?` +
    `client_id=${VERCEL_CLIENT_ID}&` +
    `state=${state}_${userId}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  
  res.redirect(authUrl);
});

router.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  const [, userId] = (state as string).split('_');
  
  try {
    // 交换 access token
    const tokenResponse = await fetch('https://api.vercel.com/v2/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: VERCEL_CLIENT_ID,
        client_secret: VERCEL_CLIENT_SECRET,
        code: code as string,
        redirect_uri: REDIRECT_URI
      })
    });
    
    const { access_token, team_id } = await tokenResponse.json();
    
    // 存储到数据库
    await db.users.upsert({
      vscode_user_id: userId,
      vercel_access_token: encrypt(access_token),  // 加密存储
      vercel_team_id: team_id,
      updated_at: new Date()
    });
    
    res.send(`
      <html>
        <body>
          <h1>✅ Authorization Successful</h1>
          <p>You can close this window and return to VS Code.</p>
          <script>window.close();</script>
        </body>
      </html>
    `);
    
  } catch (error) {
    res.status(500).send('Authorization failed');
  }
});

export default router;
```

---

## 🎨 VS Code 扩展实现

### 4.1 扩展配置

```typescript
// extension/src/config/deploy.config.ts
export const DEPLOY_CONFIG = {
  backendUrl: process.env.VLINDER_DEPLOY_BACKEND || 'https://api.vlinders.org',
  getUserId: () => {
    // 生成唯一的用户标识（基于机器ID或VS Code用户）
    const machineId = vscode.env.machineId;
    const sessionId = vscode.env.sessionId;
    return `vscode_${machineId}_${sessionId}`;
  }
};
```

### 4.2 部署服务

```typescript
// extension/src/services/deploy.service.ts
import * as vscode from 'vscode';
import axios from 'axios';
import { DEPLOY_CONFIG } from '../config/deploy.config';

export class DeployService {
  private userId = DEPLOY_CONFIG.getUserId();
  
  // 检查授权状态
  async checkAuthStatus(): Promise<{ authorized: boolean; authUrl?: string }> {
    const response = await axios.get(
      `${DEPLOY_CONFIG.backendUrl}/api/vercel/auth/status`,
      { params: { userId: this.userId } }
    );
    return response.data;
  }
  
  // 获取当前项目信息
  async getCurrentProjectInfo(): Promise<{
    repoUrl: string;
    projectName: string;
    branch: string;
  } | null> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) return null;
    
    try {
      // 获取 Git 信息
      const gitExt = vscode.extensions.getExtension('vscode.git');
      await gitExt?.activate();
      const api = (gitExt?.exports?.getAPI?.(1) as any);
      const repo = api?.repositories?.[0];
      
      const remotes = repo?.state?.remotes || [];
      const origin = remotes.find((r: any) => r.name === 'origin');
      const repoUrl = origin?.fetchUrl || origin?.pushUrl;
      
      const branch = repo?.state?.HEAD?.name || 'main';
      const projectName = workspaceFolder.name;
      
      return { repoUrl, projectName, branch };
    } catch {
      return null;
    }
  }
  
  // 执行部署
  async deploy(envVars?: Record<string, string>): Promise<{
    success: boolean;
    deploymentUrl?: string;
    deploymentId?: string;
    error?: string;
  }> {
    // 1. 检查授权
    const authStatus = await this.checkAuthStatus();
    if (!authStatus.authorized) {
      // 打开授权页面
      await vscode.env.openExternal(vscode.Uri.parse(authStatus.authUrl!));
      throw new Error('Please authorize Vercel access first');
    }
    
    // 2. 获取项目信息
    const projectInfo = await this.getCurrentProjectInfo();
    if (!projectInfo) {
      throw new Error('No Git repository found');
    }
    
    // 3. 调用部署接口
    try {
      const response = await axios.post(
        `${DEPLOY_CONFIG.backendUrl}/api/vercel/deploy`,
        {
          userId: this.userId,
          ...projectInfo,
          envVars
        },
        { timeout: 30000 }
      );
      
      return {
        success: true,
        deploymentUrl: response.data.deploymentUrl,
        deploymentId: response.data.deploymentId
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
  
  // 查询部署状态
  async getDeploymentStatus(deploymentId: string) {
    const response = await axios.get(
      `${DEPLOY_CONFIG.backendUrl}/api/vercel/deploy/status/${deploymentId}`,
      { params: { userId: this.userId } }
    );
    return response.data;
  }
}
```

### 4.3 UI 集成

```typescript
// extension/webview-ui-vite/src/components/settings-view/advanced-tab.tsx

// 添加部署按钮
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <div className="flex-1 pr-2">
      <Label className="text-xs font-medium">Deploy to Vercel</Label>
      <p className={`${DESCRIPTION_TEXT_SIZE} text-muted-foreground`}>
        Deploy your project to Vercel with one click
      </p>
    </div>
    <Button
      size="sm"
      onClick={() => {
        vscode.postMessage({ type: "vercelDeploy" } as any)
      }}
      disabled={isDeploying}
    >
      {isDeploying ? "Deploying..." : "🚀 Deploy"}
    </Button>
  </div>
  
  {/* 部署状态显示 */}
  {deployStatus && (
    <div className={`text-xs p-2 rounded ${
      deployStatus.status === 'ready' ? 'bg-green-500/10' :
      deployStatus.status === 'error' ? 'bg-red-500/10' :
      'bg-blue-500/10'
    }`}>
      {deployStatus.status === 'ready' && (
        <>
          ✅ Deployed! <a href={deployStatus.url} className="underline">Open Site</a>
        </>
      )}
      {deployStatus.status === 'building' && '⏳ Building...'}
      {deployStatus.status === 'error' && '❌ Failed: ' + deployStatus.error}
    </div>
  )}
</div>
```

### 4.4 消息处理

```typescript
// extension/src/providers/webview/webview-manager.ts

case "vercelDeploy":
  try {
    const deployService = new DeployService();
    
    vscode.window.showInformationMessage('Starting deployment...');
    
    const result = await deployService.deploy();
    
    if (result.success) {
      vscode.window.showInformationMessage(
        `✅ Deployed! ${result.deploymentUrl}`,
        'Open Site'
      ).then(selection => {
        if (selection === 'Open Site') {
          vscode.env.openExternal(vscode.Uri.parse(result.deploymentUrl!));
        }
      });
      
      // 轮询部署状态
      const checkStatus = setInterval(async () => {
        const status = await deployService.getDeploymentStatus(result.deploymentId!);
        if (status.status === 'ready' || status.status === 'error') {
          clearInterval(checkStatus);
          this.postMessageToWebview({
            type: 'deployStatus',
            status
          });
        }
      }, 5000);
      
    } else {
      vscode.window.showErrorMessage(`Deploy failed: ${result.error}`);
    }
    
  } catch (error: any) {
    if (error.message.includes('authorize')) {
      vscode.window.showWarningMessage(
        'Please authorize Vercel access in your browser',
        'Retry'
      );
    } else {
      vscode.window.showErrorMessage(`Deploy error: ${error.message}`);
    }
  }
  break;
```

---

## 📦 部署清单

### 后端需要部署的内容
- [ ] Node.js/Express 服务器
- [ ] PostgreSQL 数据库
- [ ] 环境变量配置：
  ```
  VERCEL_CLIENT_ID=xxx
  VERCEL_CLIENT_SECRET=xxx
  BACKEND_URL=https://your-backend.com
  DATABASE_URL=postgresql://...
  ENCRYPTION_KEY=xxx
  ```

### 需要在 Vercel Dashboard 创建
- [ ] Integration App
  - Scopes: `deployments:write`, `projects:write`, `env:read`, `env:write`
  - Redirect URL: `https://your-backend.com/api/vercel/auth/callback`

### VS Code 扩展配置
- [ ] 更新 `package.json` 配置项
- [ ] 添加部署服务代码
- [ ] 更新 UI 组件

---

## 🔒 安全注意事项

1. **Token 加密存储**：使用 AES-256 加密 Vercel access token
2. **HTTPS Only**：所有 API 必须使用 HTTPS
3. **Rate Limiting**：限制 API 调用频率
4. **Input Validation**：严格验证所有输入参数
5. **Error Handling**：不要在错误信息中泄露敏感信息

---

## 🎯 总结

这个方案：
- ✅ **完全自动化**：用户只需点击一个按钮
- ✅ **安全可靠**：OAuth 授权 + Token 加密
- ✅ **实时反馈**：轮询部署状态并显示
- ✅ **可扩展**：易于添加更多功能（环境变量、域名配置等）

**下一步**：你需要先部署后端服务，我可以帮你：
1. 完整的后端代码（Express + TypeScript）
2. Docker 配置文件
3. 数据库迁移脚本
4. 完整的测试用例

告诉我你要从哪里开始！

