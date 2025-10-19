/**
 * Pull Requests Module
 * All Pull Requests operations consolidated
 */

import { z } from 'zod';
import { procedure } from '../../router/utils';
import { githubApiRequest, GITHUB_API_ENDPOINTS } from './api';
import * as vscode from 'vscode';
import simpleGit from 'simple-git';
import { GlobalStateManager } from '../../providers/state/global-state-manager';

/**
 * List GitHub Pull Requests
 */
export const listGitHubPullRequests = procedure
	.input(
		z.object({
			repoFullName: z.string(),
			state: z.enum(['open', 'closed', 'all']).optional().default('open'),
			per_page: z.number().optional().default(100),
		})
	)
	.resolve(async (ctx, input) => {
		try {
		const [owner, repo] = input.repoFullName.split('/');

		const data: any[] = await githubApiRequest(
			GITHUB_API_ENDPOINTS.REPO(owner, repo).PULLS,
			{
					params: {
						state: input.state,
						per_page: input.per_page,
						sort: 'updated',
						direction: 'desc',
					},
				}
			);

			const pullRequests = data.map((pr: any) => ({
				id: pr.id,
				number: pr.number,
				title: pr.title,
				state: pr.state as 'open' | 'closed',
				body: pr.body,
				user: {
					login: pr.user?.login || 'unknown',
					avatar_url: pr.user?.avatar_url || '',
				},
				head: {
					ref: pr.head?.ref || '',
					sha: pr.head?.sha || '',
					repo: pr.head?.repo ? {
						full_name: pr.head.repo.full_name || '',
						clone_url: pr.head.repo.clone_url || '',
					} : null,
				},
				base: {
					ref: pr.base?.ref || '',
					sha: pr.base?.sha || '',
					repo: pr.base?.repo ? {
						full_name: pr.base.repo.full_name || '',
						clone_url: pr.base.repo.clone_url || '',
					} : null,
				},
				labels: pr.labels?.map((label: any) => ({
					name: typeof label === 'string' ? label : label.name || '',
					color: typeof label === 'string' ? '000000' : label.color || '000000',
				})) || [],
				created_at: pr.created_at,
				updated_at: pr.updated_at,
				closed_at: pr.closed_at,
				merged_at: pr.merged_at,
				html_url: pr.html_url,
				comments: pr.comments || 0,
				commits: pr.commits || 0,
				additions: pr.additions || 0,
				deletions: pr.deletions || 0,
				changed_files: pr.changed_files || 0,
				draft: pr.draft || false,
				mergeable: pr.mergeable,
				mergeable_state: pr.mergeable_state,
			}));

			return { success: true, pullRequests };
		} catch (error: any) {
			console.error('[listGitHubPullRequests] Error:', error);
			return { success: false, error: error.message, pullRequests: [] };
		}
	});

/**
 * Update GitHub Pull Request (Close/Reopen)
 */
export const updateGitHubPullRequest = procedure
	.input(
		z.object({
			repoFullName: z.string(),
			prNumber: z.number(),
			state: z.enum(['open', 'closed']),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			// 解析仓库名称
			const [owner, repo] = input.repoFullName.split('/');

			// 更新 Pull Request 状态
			await githubApiRequest(
				GITHUB_API_ENDPOINTS.REPO(owner, repo).PULL(input.prNumber),
				{
					method: 'PATCH',
					data: {
						state: input.state,
					},
				}
			);

			return { success: true };
		} catch (error: any) {
			console.error('[updateGitHubPullRequest] Error:', error);
			return { success: false, error: error.message };
		}
	});

/**
 * Checkout Pull Request 到本地
 * 支持两种类型：
 * 1. 同仓库 PR - 直接 fetch origin
 * 2. Fork 仓库 PR - 添加 Fork 的 remote 后 fetch
 */
export const checkoutPullRequest = procedure
	.input(
		z.object({
			repoFullName: z.string(),
			pullNumber: z.number(),
			headRef: z.string(),
			headSha: z.string(),
			headRepoFullName: z.string().optional(), // Fork 仓库的全名
			headRepoCloneUrl: z.string().optional(), // Fork 仓库的克隆 URL
		})
	)
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const codeCloneStatus = globalState.getGlobalState('codeCloneStatus') || {};
			const status = codeCloneStatus[input.repoFullName];

			if (!status || !status.localPath) {
				return {
					success: false,
					error: 'Repository not cloned. Please clone the repository first.',
				};
			}

			const git = simpleGit(status.localPath);
			const branchName = `pr-${input.pullNumber}`;

			// 判断是否是 Fork 仓库的 PR
			const isFork = input.headRepoFullName && input.headRepoFullName !== input.repoFullName;

			if (isFork && input.headRepoCloneUrl) {
				// Fork 仓库的 PR
				const remoteName = `pr-${input.pullNumber}-fork`;

				// 1. 添加 Fork 仓库作为 remote
				try {
					await git.addRemote(remoteName, input.headRepoCloneUrl);
				} catch (error) {
					// Remote 可能已存在，忽略错误
					console.log(`Remote ${remoteName} might already exist`);
				}

				// 2. Fetch Fork 仓库的分支
				await git.fetch(remoteName, input.headRef);

				// 3. 创建并 checkout 本地分支，跟踪 Fork 的分支
				try {
					await git.checkout(['-b', branchName, `${remoteName}/${input.headRef}`]);
				} catch (error) {
					// 分支可能已存在，直接 checkout
					await git.checkout(branchName);
					await git.pull(remoteName, input.headRef);
				}
			} else {
				// 同仓库的 PR - 使用 GitHub 的 pull/NUMBER/head 引用
				// 1. Fetch PR
				await git.fetch('origin', `pull/${input.pullNumber}/head:${branchName}`);

				// 2. Checkout PR branch
				try {
					await git.checkout(branchName);
				} catch (error) {
					// 分支可能已存在，先删除再创建
					await git.deleteLocalBranch(branchName, true);
					await git.fetch('origin', `pull/${input.pullNumber}/head:${branchName}`);
					await git.checkout(branchName);
				}
			}

			// 3. 在新窗口中打开
			const uri = vscode.Uri.file(status.localPath);
			await vscode.commands.executeCommand('vscode.openFolder', uri, true);

			return {
				success: true,
				message: `Checked out PR #${input.pullNumber} to local branch ${branchName}`,
				isFork,
			};
		} catch (error: any) {
			console.error('[checkoutPullRequest] Error:', error);
			return { success: false, error: error.message };
		}
	});

/**
 * 在浏览器中查看 PR 的 Files Changed
 * 这是最可靠的方式，因为 GitHub 的 UI 最完善
 */
export const viewPRChanges = procedure
	.input(
		z.object({
			repoFullName: z.string(),
			pullNumber: z.number(),
			htmlUrl: z.string(),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			// 直接在浏览器中打开 PR 的 Files Changed 页面
			// 这是最可靠和功能最完善的方式
			const filesUrl = `${input.htmlUrl}/files`;
			
			// 使用 VSCode API 打开浏览器
			await vscode.env.openExternal(vscode.Uri.parse(filesUrl));

			return {
				success: true,
				message: `Opening PR #${input.pullNumber} Files Changed in browser`,
			};
		} catch (error: any) {
			console.error('[viewPRChanges] Error:', error);
			return { success: false, error: error.message };
		}
	});

/**
 * 获取 PR 的本地状态
 */
export const getPRLocalStatus = procedure
	.input(
		z.object({
			repoFullName: z.string(),
			pullNumber: z.number(),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const codeCloneStatus = globalState.getGlobalState('codeCloneStatus') || {};
			const status = codeCloneStatus[input.repoFullName];

			if (!status || !status.localPath) {
				return {
					success: true,
					isCloned: false,
					isCheckedOut: false,
				};
			}

			const git = simpleGit(status.localPath);

			// 检查本地是否有这个 PR 分支
			const branches = await git.branchLocal();
			const prBranch = `pr-${input.pullNumber}`;
			const hasPRBranch = branches.all.includes(prBranch);

			// 检查当前是否在这个 PR 分支上
			const currentBranch = branches.current;
			const isCheckedOut = currentBranch === prBranch;

			return {
				success: true,
				isCloned: true,
				hasPRBranch,
				isCheckedOut,
				currentBranch,
			};
		} catch (error: any) {
			console.error('[getPRLocalStatus] Error:', error);
			return { success: false, error: error.message };
		}
	});

