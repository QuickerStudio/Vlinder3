/**
 * Update GitHub Issue (Close/Reopen)
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { githubApiRequest } from '../../api/github-api';

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
				`https://api.github.com/repos/${owner}/${repo}/issues/${input.issueNumber}`,
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


