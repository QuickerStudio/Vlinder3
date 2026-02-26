/**
 * GitHub API Client
 * Centralized API interaction layer
 */

import axios, { AxiosRequestConfig } from 'axios';
import { GitHubAccountsStore } from './account';

/**
 * GitHub API Endpoints
 */
export const GITHUB_API_ENDPOINTS = {
	BASE: 'https://api.github.com',
	USER: {
		PROFILE: 'https://api.github.com/user',
		REPOS: 'https://api.github.com/user/repos',
	},
	REPO: (owner: string, repo: string) => ({
		ISSUES: `https://api.github.com/repos/${owner}/${repo}/issues`,
		ISSUE: (issueNumber: number) => `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
		PULLS: `https://api.github.com/repos/${owner}/${repo}/pulls`,
		PULL: (prNumber: number) => `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
		WORKFLOWS: `https://api.github.com/repos/${owner}/${repo}/actions/workflows`,
		WORKFLOW_RUNS: (workflowId: string | number, perPage: number = 30) => 
			`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?per_page=${perPage}`,
		WORKFLOW_DISPATCH: (workflowId: string | number) => 
			`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
		WORKFLOW_ENABLE: (workflowId: string | number) => 
			`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/enable`,
		WORKFLOW_DISABLE: (workflowId: string | number) => 
			`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/disable`,
		COMMIT_ACTIVITY: `https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`,
	}),
} as const;

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

