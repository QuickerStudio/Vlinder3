/**
 * GitHub Router - Main Entry Point
 */

import { router } from '../../../router/utils/router';
import * as auth from './auth';
import * as legacy from './legacy';
import * as code from './code';
import * as wiki from './wiki';
import * as issues from './issues';
import * as pullRequests from './pull-requests';
import * as commitActivity from './code/activity';
import * as actions from './actions';
import * as settings from './settings';

/**
 * GitHub Router
 */
export const githubRouter = router({
	// Authentication
	authenticateGitHub: auth.authenticateGitHub,
	getGitHubAccount: auth.getGitHubAccount,
	logoutGitHub: auth.logoutGitHub,
	fetchGitHubAvatar: auth.fetchGitHubAvatar,
	
	// Legacy
	listGitHubRepositories: legacy.listGitHubRepositories,
	cloneGitHubRepository: legacy.cloneGitHubRepository,
	
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

