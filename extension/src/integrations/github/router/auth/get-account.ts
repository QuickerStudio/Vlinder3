/**
 * GitHub Authentication - Get Account
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { GitHubAccountsStore } from '../../stores/accounts-store';

export const getGitHubAccount = procedure
	.input(z.object({}))
	.resolve(async (ctx, input) => {
		try {
			const accountsStore = GitHubAccountsStore.getInstance();
			const accounts = await accountsStore.getAll();

			if (accounts.length === 0) {
				return {
					authenticated: false,
					account: null,
				};
			}

			const account = accounts[0];
			return {
				authenticated: true,
				account: {
					username: account.login,
					email: account.emails[0]?.email,
					avatarUrl: account.avatarURL,
				},
			};
		} catch (error: any) {
			console.error('Error getting GitHub account:', error);
			return {
				authenticated: false,
				account: null,
			};
		}
	});

