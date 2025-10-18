/**
 * GitHub API Client
 * Centralized API interaction layer
 */

import axios, { AxiosRequestConfig } from 'axios';
import { GitHubAccountsStore } from '../stores/accounts-store';

/**
 * Get current account token
 */
export async function getCurrentAccountToken(): Promise<string | null> {
	try {
		const accountsStore = GitHubAccountsStore.getInstance();
		const accounts = await accountsStore.getAll();
		
		if (accounts.length === 0) {
			return null;
		}

		return accounts[0].token;
	} catch {
		return null;
	}
}

/**
 * Get GitHub API headers with authentication
 */
export async function getGitHubHeaders(): Promise<Record<string, string> | null> {
	const token = await getCurrentAccountToken();
	if (!token) {
		return null;
	}

	return {
		Authorization: `Bearer ${token}`,
		Accept: 'application/vnd.github.v3+json',
	};
}

/**
 * Make authenticated GitHub API request
 */
export async function githubApiRequest<T = any>(
	url: string,
	config?: AxiosRequestConfig
): Promise<T> {
	const headers = await getGitHubHeaders();
	if (!headers) {
		throw new Error('Not authenticated with GitHub');
	}

	const response = await axios({
		url,
		...config,
		headers: {
			...headers,
			...config?.headers,
		},
	});

	return response.data;
}

