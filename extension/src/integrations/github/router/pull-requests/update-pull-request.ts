/**
 * Update GitHub Pull Request (Close/Reopen)
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { githubApiRequest } from '../../api/api';

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
				`https://api.github.com/repos/${owner}/${repo}/pulls/${input.prNumber}`,
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


