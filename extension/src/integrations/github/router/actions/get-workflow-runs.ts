/**
 * Get GitHub Actions Workflow Runs
 * 获取工作流的运行历史
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { githubApiRequest } from '../../api/api';

export const getGitHubWorkflowRuns = procedure
	.input(
		z.object({
			repoFullName: z.string(),
			workflowId: z.number(),
			per_page: z.number().optional().default(10),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			const [owner, repo] = input.repoFullName.split('/');
			
			// GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs
			const data = await githubApiRequest(
				`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${input.workflowId}/runs?per_page=${input.per_page}`,
				{
					method: 'GET',
				}
			);

			const runs = data.workflow_runs?.map((run: any) => ({
				id: run.id,
				name: run.name,
				head_branch: run.head_branch,
				head_sha: run.head_sha,
				status: run.status, // queued, in_progress, completed
				conclusion: run.conclusion, // success, failure, cancelled, skipped
				run_number: run.run_number,
				event: run.event,
				created_at: run.created_at,
				updated_at: run.updated_at,
				html_url: run.html_url,
			})) || [];

			return { success: true, runs };
		} catch (error: any) {
			console.error('[getGitHubWorkflowRuns] Error:', error);
			return { success: false, error: error.message, runs: [] };
		}
	});


