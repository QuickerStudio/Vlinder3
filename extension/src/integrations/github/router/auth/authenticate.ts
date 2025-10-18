/**
 * GitHub Authentication - Login
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { GitHubSignInStore } from '../../stores/signin-store';

export const authenticateGitHub = procedure
	.input(z.object({}))
	.resolve(async (ctx, input) => {
		try {
			const signInStore = GitHubSignInStore.getInstance();
			const result = await signInStore.beginDotComSignIn();

			if (result.kind === 'success') {
				return {
					success: true,
					account: {
						username: result.account.login,
						email: result.account.emails[0]?.email,
						avatarUrl: result.account.avatarURL,
					},
				};
			}

			return {
				success: false,
				error: 'Authentication cancelled or failed',
			};
		} catch (error: any) {
			console.error('GitHub authentication error:', error);
			return {
				success: false,
				error: error.message || 'Failed to authenticate with GitHub',
			};
		}
	});

