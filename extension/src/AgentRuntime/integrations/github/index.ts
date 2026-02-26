/**
 * GitHub Integration Module
 * Main entry point for GitHub integration including router, models, and utilities
 */

import { z } from 'zod';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { router } from '../../router/utils/router';
import { procedure } from '../../router/utils';
import * as code from './code';
import * as wiki from './wiki';
import * as issues from './issues';
import * as pullRequests from './pull-requests';
import * as actions from './actions';
import * as account from './account';
import { githubApiRequest, getCurrentAccountToken, GITHUB_API_ENDPOINTS } from './api';
import { GlobalStateManager } from '../../providers/state/global-state-manager';

// ============================================================================
// Exports - Models & Stores
// ============================================================================

export { 
	GitHubAccount, 
	accountEquals, 
	isDotComAccount, 
	isEnterpriseAccount,
	GitHubAccountsStore,
	GitHubSignInStore,
	SignInStep
} from './account';
export type { IAPIEmail, SignInResult } from './account';

// ============================================================================
// GitHub Repository Schema
// ============================================================================

export const githubRepositorySchema = z.object({
	id: z.number(),
	name: z.string(),
	fullName: z.string(),
	description: z.string().nullable(),
	url: z.string(),
	cloneUrl: z.string(),
	private: z.boolean(),
	updatedAt: z.string(),
	stargazersCount: z.number().optional(),
	forksCount: z.number().optional(),
	hasWiki: z.boolean().optional(),
});

export type GitHubRepository = z.infer<typeof githubRepositorySchema>;

// ============================================================================
// Utility Functions
// ============================================================================

export function getDefaultCloneDirectory(): string {
	return path.join(os.homedir(), 'Documents', 'GitHub');
}

export function createDiagnosticLogger(prefix: string) {
	return (message: string, data?: any) => {
		console.log(`[${prefix}] ${message}`, data || '');
	};
}

// ============================================================================
// Repository Operations (Legacy)
// ============================================================================

export const listGitHubRepositories = procedure
	.input(
		z.object({
			page: z.number().default(1),
			perPage: z.number().default(30),
			sort: z.enum(['created', 'updated', 'pushed', 'full_name']).default('updated'),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			const data = await githubApiRequest(GITHUB_API_ENDPOINTS.USER.REPOS, {
				params: {
					page: input.page,
					per_page: input.perPage,
					sort: input.sort,
					affiliation: 'owner,collaborator,organization_member',
				},
			});

			const repositories: GitHubRepository[] = data.map((repo: any) => ({
				id: repo.id,
				name: repo.name,
				fullName: repo.full_name,
				description: repo.description,
				url: repo.html_url,
				cloneUrl: repo.clone_url,
				private: repo.private,
				updatedAt: repo.updated_at,
				stargazersCount: repo.stargazers_count,
				forksCount: repo.forks_count,
				hasWiki: repo.has_wiki,
			}));

			return { success: true, repositories };
		} catch (error: any) {
			console.error('Error fetching repositories:', error);
			return {
				success: false,
				error: error.message || 'Failed to fetch repositories',
				repositories: [],
			};
		}
	});

export const cloneGitHubRepository = procedure
	.input(
		z.object({
			cloneUrl: z.string(),
			targetPath: z.string().optional(),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			const token = await getCurrentAccountToken();
			if (!token) {
				return { success: false, error: 'Not authenticated with GitHub' };
			}

			let targetUri: vscode.Uri;
			if (!input.targetPath) {
				const globalState = GlobalStateManager.getInstance();
				const settings = globalState.getGlobalState('githubSettings') || {};
				const defaultDir = settings.defaultCloneDirectory || getDefaultCloneDirectory();
				targetUri = vscode.Uri.file(defaultDir);
			} else {
				targetUri = vscode.Uri.file(input.targetPath);
			}

			await vscode.commands.executeCommand('git.clone', input.cloneUrl, targetUri.fsPath);

			return {
				success: true,
				message: 'Repository cloned successfully',
				path: targetUri.fsPath,
			};
		} catch (error: any) {
			console.error('Error cloning repository:', error);
			return {
				success: false,
				error: error.message || 'Failed to clone repository',
			};
		}
	});

// ============================================================================
// GitHub Router
// ============================================================================

export const githubRouter = router({
	// Authentication
	authenticateGitHub: account.authenticateGitHub,
	getGitHubAccount: account.getGitHubAccount,
	logoutGitHub: account.logoutGitHub,
	fetchGitHubAvatar: account.fetchGitHubAvatar,
	
	// Repository Operations
	listGitHubRepositories,
	cloneGitHubRepository,
	
	// Code
	cloneCodeAndInitialize: code.cloneCodeAndInitialize,
	getCodeCloneStatus: code.getCodeCloneStatus,
	deleteLocalCode: code.deleteLocalCode,
	getCodeHistory: code.getCodeHistory,
	openCodeFile: code.openCodeFile,
	openCodeFolderInExplorer: code.openCodeFolderInExplorer,
	openCodeFolder: code.openCodeFolder,
	openCodeInVSCode: code.openCodeInVSCode,
	addCodeToWorkspace: code.addCodeToWorkspace,
	getCommitActivity: code.getCommitActivity,
	getCommitActivityFromAPI: code.getCommitActivityFromAPI,
	
	// Wiki
	cloneWikiAndInitialize: wiki.cloneWikiAndInitialize,
	getWikiCloneStatus: wiki.getWikiCloneStatus,
	deleteLocalWiki: wiki.deleteLocalWiki,
	getWikiHistory: wiki.getWikiHistory,
	openWikiFile: wiki.openWikiFile,
	openWikiFolderInExplorer: wiki.openWikiFolderInExplorer,
	openWikiFolder: wiki.openWikiFolder,
	openWikiInVSCode: wiki.openWikiInVSCode,
	addWikiToWorkspace: wiki.addWikiToWorkspace,
	
	// Issues
	listGitHubIssues: issues.listGitHubIssues,
	updateGitHubIssue: issues.updateGitHubIssue,
	
	// Pull Requests
	listGitHubPullRequests: pullRequests.listGitHubPullRequests,
	updateGitHubPullRequest: pullRequests.updateGitHubPullRequest,
	checkoutPullRequest: pullRequests.checkoutPullRequest,
	viewPRChanges: pullRequests.viewPRChanges,
	getPRLocalStatus: pullRequests.getPRLocalStatus,
	
	// Actions
	listGitHubWorkflows: actions.listGitHubWorkflows,
	getGitHubWorkflowRuns: actions.getGitHubWorkflowRuns,
	triggerGitHubWorkflow: actions.triggerGitHubWorkflow,
	enableGitHubWorkflow: actions.enableGitHubWorkflow,
	disableGitHubWorkflow: actions.disableGitHubWorkflow,
	
	// Settings
	getGitHubSettings: account.getGitHubSettings,
	updateGitHubSettings: account.updateGitHubSettings,
});
