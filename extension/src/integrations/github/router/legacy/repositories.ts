/**
 * Legacy Repository Operations
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { githubApiRequest, getCurrentAccountToken } from '../../api/github-api';
import { getDefaultCloneDirectory } from '../utils';
import { githubRepositorySchema, GitHubRepository } from '../types';
import * as vscode from 'vscode';
import { GlobalStateManager } from '../../../../providers/state/global-state-manager';

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
			const data = await githubApiRequest('https://api.github.com/user/repos', {
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

