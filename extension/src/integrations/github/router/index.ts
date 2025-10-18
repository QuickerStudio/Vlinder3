/**
 * GitHub Router - Main Entry Point
 */

import { router } from '../../../router/utils/router';
import * as auth from './auth';
import * as legacy from './legacy';

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
});

