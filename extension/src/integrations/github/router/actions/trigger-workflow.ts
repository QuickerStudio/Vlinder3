/**
 * Trigger GitHub Actions Workflow
 * 手动触发工作流运行
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { githubApiRequest } from '../../api/github-api';

export const triggerGitHubWorkflow = procedure
	.input(
		z.object({
			repoFullName: z.string(),
			workflowId: z.number(),
			ref: z.string(), // Branch name, e.g. 'main', 'develop'
		})
	)
	.resolve(async (ctx, input) => {
		try {
			const [owner, repo] = input.repoFullName.split('/');
			
			// POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches
			await githubApiRequest(
				`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${input.workflowId}/dispatches`,
				{
					method: 'POST',
					data: {
						ref: input.ref,
					},
				}
			);

			return { 
				success: true, 
				message: `Workflow triggered successfully on ${input.ref}` 
			};
		} catch (error: any) {
			console.error('[triggerGitHubWorkflow] Error:', error);
			return { success: false, error: error.message };
		}
	});


