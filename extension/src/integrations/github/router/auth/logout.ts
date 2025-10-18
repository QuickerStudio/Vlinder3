/**
 * GitHub Authentication - Logout
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { GitHubAccountsStore } from '../../stores/accounts-store';

export const logoutGitHub = procedure
	.input(z.object({}))
	.resolve(async (ctx, input) => {
		try {
			const accountsStore = GitHubAccountsStore.getInstance();
			const accounts = await accountsStore.getAll();

			for (const account of accounts) {
				await accountsStore.removeAccount(account);
			}

			return {
				success: true,
			};
		} catch (error: any) {
			console.error('Error logging out from GitHub:', error);
			return {
				success: false,
				error: error.message,
			};
		}
	});

