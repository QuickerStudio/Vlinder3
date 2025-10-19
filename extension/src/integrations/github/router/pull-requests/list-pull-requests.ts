/**
 * List GitHub Pull Requests
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { githubApiRequest } from '../../api/api';

export const listGitHubPullRequests = procedure
	.input(
		z.object({
			repoFullName: z.string(),
			state: z.enum(['open', 'closed', 'all']).optional().default('open'),
			per_page: z.number().optional().default(100),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			const [owner, repo] = input.repoFullName.split('/');

			const data: any[] = await githubApiRequest(
				`https://api.github.com/repos/${owner}/${repo}/pulls`,
				{
					params: {
						state: input.state,
						per_page: input.per_page,
						sort: 'updated',
						direction: 'desc',
					},
				}
			);

			const pullRequests = data.map((pr: any) => ({
				id: pr.id,
				number: pr.number,
				title: pr.title,
				state: pr.state as 'open' | 'closed',
				body: pr.body,
				user: {
					login: pr.user?.login || 'unknown',
					avatar_url: pr.user?.avatar_url || '',
				},
				head: {
					ref: pr.head?.ref || '',
					sha: pr.head?.sha || '',
					repo: pr.head?.repo ? {
						full_name: pr.head.repo.full_name || '',
						clone_url: pr.head.repo.clone_url || '',
					} : null,
				},
				base: {
					ref: pr.base?.ref || '',
					sha: pr.base?.sha || '',
					repo: pr.base?.repo ? {
						full_name: pr.base.repo.full_name || '',
						clone_url: pr.base.repo.clone_url || '',
					} : null,
				},
				labels: pr.labels?.map((label: any) => ({
					name: typeof label === 'string' ? label : label.name || '',
					color: typeof label === 'string' ? '000000' : label.color || '000000',
				})) || [],
				created_at: pr.created_at,
				updated_at: pr.updated_at,
				closed_at: pr.closed_at,
				merged_at: pr.merged_at,
				html_url: pr.html_url,
				comments: pr.comments || 0,
				commits: pr.commits || 0,
				additions: pr.additions || 0,
				deletions: pr.deletions || 0,
				changed_files: pr.changed_files || 0,
				draft: pr.draft || false,
				mergeable: pr.mergeable,
				mergeable_state: pr.mergeable_state,
			}));

			return { success: true, pullRequests };
		} catch (error: any) {
			console.error('[listGitHubPullRequests] Error:', error);
			return { success: false, error: error.message, pullRequests: [] };
		}
	});

