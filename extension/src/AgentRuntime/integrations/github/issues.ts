/**
 * Issues Module - All Issues operations
 */

import { z } from 'zod';
import { procedure } from '../../router/utils';
import { githubApiRequest, GITHUB_API_ENDPOINTS } from '../../integrations/github/api';

// ============================================================================
// List Issues
// ============================================================================

export const listGitHubIssues = procedure
	.input(
		z.object({
			repoFullName: z.string(),
			state: z.enum(['open', 'closed', 'all']).optional().default('open'),
			per_page: z.number().optional().default(100),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			// 解析仓库名称
			const [owner, repo] = input.repoFullName.split('/');

		// 获取 Issues
		const data: any[] = await githubApiRequest(
			GITHUB_API_ENDPOINTS.REPO(owner, repo).ISSUES,
			{
					params: {
						state: input.state,
						per_page: input.per_page,
						sort: 'updated',
						direction: 'desc',
					},
				}
			);

			// 格式化 Issues
			const issues = data.map((issue: any) => ({
				id: issue.id,
				number: issue.number,
				title: issue.title,
				state: issue.state as 'open' | 'closed',
				body: issue.body,
				user: {
					login: issue.user?.login || 'unknown',
					avatar_url: issue.user?.avatar_url || '',
				},
				labels: issue.labels.map((label: any) => ({
					name: typeof label === 'string' ? label : label.name || '',
					color: typeof label === 'string' ? '000000' : label.color || '000000',
				})),
				created_at: issue.created_at,
				updated_at: issue.updated_at,
				closed_at: issue.closed_at,
				html_url: issue.html_url,
				comments: issue.comments,
			}));

			return { success: true, issues };
		} catch (error: any) {
			console.error('[listGitHubIssues] Error:', error);
			return { success: false, error: error.message, issues: [] };
		}
	});

// ============================================================================
// Update Issue
// ============================================================================

export const updateGitHubIssue = procedure
	.input(
		z.object({
			repoFullName: z.string(),
			issueNumber: z.number(),
			state: z.enum(['open', 'closed']),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			// 解析仓库名称
			const [owner, repo] = input.repoFullName.split('/');

			// 更新 Issue 状态
			await githubApiRequest(
				GITHUB_API_ENDPOINTS.REPO(owner, repo).ISSUE(input.issueNumber),
				{
					method: 'PATCH',
					data: {
						state: input.state,
					},
				}
			);

			return { success: true };
		} catch (error: any) {
			console.error('[updateGitHubIssue] Error:', error);
			return { success: false, error: error.message };
		}
	});

