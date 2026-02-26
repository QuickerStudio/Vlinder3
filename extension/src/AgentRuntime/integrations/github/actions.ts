/**
 * Actions Module
 * All GitHub Actions operations consolidated
 */

import { z } from 'zod';
import { procedure } from '../../router/utils';
import { githubApiRequest, GITHUB_API_ENDPOINTS } from './api';

/**
 * List GitHub Actions Workflows
 * 获取仓库的所有 GitHub Actions 工作流
 */
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
				GITHUB_API_ENDPOINTS.REPO(owner, repo).WORKFLOWS,
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

/**
 * Get GitHub Actions Workflow Runs
 * 获取工作流的运行历史
 */
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
				GITHUB_API_ENDPOINTS.REPO(owner, repo).WORKFLOW_RUNS(input.workflowId, input.per_page),
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

/**
 * Trigger GitHub Actions Workflow
 * 手动触发工作流运行
 */
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
				GITHUB_API_ENDPOINTS.REPO(owner, repo).WORKFLOW_DISPATCH(input.workflowId),
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

/**
 * Enable GitHub Actions Workflow
 * 启用工作流
 */
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
				GITHUB_API_ENDPOINTS.REPO(owner, repo).WORKFLOW_ENABLE(input.workflowId),
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

/**
 * Disable GitHub Actions Workflow
 * 禁用工作流
 */
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
				GITHUB_API_ENDPOINTS.REPO(owner, repo).WORKFLOW_DISABLE(input.workflowId),
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

