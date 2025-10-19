/**
 * GitHub Router - Main Entry Point
 */

import { z } from 'zod';
import * as os from 'os';
import * as path from 'path';
import { router } from '../../../router/utils/router';
import * as auth from './auth';
import * as code from './code';
import * as wiki from './wiki';
import * as issues from './issues';
import * as pullRequests from './pull-requests';
import * as commitActivity from './code/activity';
import * as actions from './actions';
import * as settings from './settings';

/**
 * GitHub Repository Schema
 */
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

/**
 * Utility Functions
 */
export function getDefaultCloneDirectory(): string {
	return path.join(os.homedir(), 'Documents', 'GitHub');
}

/**
 * Diagnostic logging helper
 */
export function createDiagnosticLogger(prefix: string) {
	return (message: string, data?: any) => {
		console.log(`[${prefix}] ${message}`, data || '');
	};
}

/**
 * GitHub Router
 */
export const githubRouter = router({
	// Authentication
	authenticateGitHub: auth.authenticateGitHub,
	getGitHubAccount: auth.getGitHubAccount,
	logoutGitHub: auth.logoutGitHub,
	fetchGitHubAvatar: auth.fetchGitHubAvatar,
	
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
	
	// Commit Activity
	getCommitActivity: commitActivity.getCommitActivity,
	getCommitActivityFromAPI: commitActivity.getCommitActivityFromAPI,
	
	// Actions
	listGitHubWorkflows: actions.listGitHubWorkflows,
	getGitHubWorkflowRuns: actions.getGitHubWorkflowRuns,
	triggerGitHubWorkflow: actions.triggerGitHubWorkflow,
	enableGitHubWorkflow: actions.enableGitHubWorkflow,
	disableGitHubWorkflow: actions.disableGitHubWorkflow,
	
	// Settings
	getGitHubSettings: settings.getGitHubSettings,
	updateGitHubSettings: settings.updateGitHubSettings,
});

