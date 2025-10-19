/**
 * List GitHub Actions Workflows
 * 获取仓库的所有 GitHub Actions 工作流
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { githubApiRequest } from '../../api/api';

export const listGitHubWorkflows = procedure
	.input(
		z.object({
			repoFullName: z.string(),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			const [owner, repo] = input.repoFullName.split('/');
			
			// GET /repos/{owner}/{repo}/actions/workflows
			const data = await githubApiRequest(
				`https://api.github.com/repos/${owner}/${repo}/actions/workflows`,
				{
					method: 'GET',
				}
			);

			const workflows = data.workflows?.map((workflow: any) => ({
				id: workflow.id,
				node_id: workflow.node_id,
				name: workflow.name,
				path: workflow.path,
				state: workflow.state, // active, disabled_manually, disabled_inactivity
				created_at: workflow.created_at,
				updated_at: workflow.updated_at,
				url: workflow.url,
				html_url: workflow.html_url,
				badge_url: workflow.badge_url,
			})) || [];

			return { success: true, workflows };
		} catch (error: any) {
			console.error('[listGitHubWorkflows] Error:', error);
			return { success: false, error: error.message, workflows: [] };
		}
	});


