/**
 * GitHub Router - Main Entry Point
 */

import { router } from '../../../router/utils/router';
import * as auth from './auth';

/**
 * GitHub Router
 */
export const githubRouter = router({
	// Authentication
	authenticateGitHub: auth.authenticateGitHub,
	getGitHubAccount: auth.getGitHubAccount,
	logoutGitHub: auth.logoutGitHub,
	fetchGitHubAvatar: auth.fetchGitHubAvatar,
});

