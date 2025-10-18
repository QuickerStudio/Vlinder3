/**
 * Enable/Disable GitHub Actions Workflow
 * 启用或禁用工作流
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { githubApiRequest } from '../../api/github-api';

export const enableGitHubWorkflow = procedure
	.input(
		z.object({
			repoFullName: z.string(),
			workflowId: z.number(),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			const [owner, repo] = input.repoFullName.split('/');
			
			// PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable
			await githubApiRequest(
				`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${input.workflowId}/enable`,
				{
					method: 'PUT',
				}
			);

			return { success: true, message: 'Workflow enabled successfully' };
		} catch (error: any) {
			console.error('[enableGitHubWorkflow] Error:', error);
			return { success: false, error: error.message };
		}
	});

export const disableGitHubWorkflow = procedure
	.input(
		z.object({
			repoFullName: z.string(),
			workflowId: z.number(),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			const [owner, repo] = input.repoFullName.split('/');
			
			// PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable
			await githubApiRequest(
				`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${input.workflowId}/disable`,
				{
					method: 'PUT',
				}
			);

			return { success: true, message: 'Workflow disabled successfully' };
		} catch (error: any) {
			console.error('[disableGitHubWorkflow] Error:', error);
			return { success: false, error: error.message };
		}
	});


