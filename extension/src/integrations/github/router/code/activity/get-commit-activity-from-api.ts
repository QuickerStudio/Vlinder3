/**
 * Code - Get Commit Activity from GitHub API
 * 
 * Fetches commit activity statistics directly from GitHub API
 * Uses the /repos/{owner}/{repo}/stats/commit_activity endpoint
 */

import { z } from 'zod';
import { procedure } from '../../../../../router/utils';
import { githubApiRequest } from '../../../api/github-api';

interface GitHubWeeklyActivity {
	days: number[]; // 7 days, Sunday to Saturday
	total: number;
	week: number; // Unix timestamp
}

interface WeeklyActivity {
	weekStart: string;
	weekEnd: string;
	totalCommits: number;
	contributors: string[];
	days: number[];
}

interface CommitActivityData {
	weeks: WeeklyActivity[];
	totalCommits: number;
	totalContributors: number;
	averageCommitsPerWeek: number;
}

export const getCommitActivityFromAPI = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const [owner, repo] = input.repoFullName.split('/');
			
			if (!owner || !repo) {
				return {
					success: false,
					error: 'Invalid repository name format. Expected: owner/repo',
					data: null
				};
			}

			// Call GitHub API for commit activity stats
			const url = `https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`;
			
			console.log(`[Commit Activity API] Fetching from: ${url}`);
			
			const githubData = await githubApiRequest<GitHubWeeklyActivity[]>(url);

			if (!githubData || githubData.length === 0) {
				return {
					success: false,
					error: 'No commit activity data available from GitHub',
					data: null
				};
			}

			// Convert GitHub API data format to our format
			// GitHub returns data for the last 52 weeks
			const weeks: WeeklyActivity[] = githubData.map((weekData) => {
				// week is Unix timestamp (seconds), convert to date
				const weekStartDate = new Date(weekData.week * 1000);
				const weekEndDate = new Date(weekStartDate);
				weekEndDate.setDate(weekEndDate.getDate() + 6);

				return {
					weekStart: weekStartDate.toISOString(),
					weekEnd: weekEndDate.toISOString(),
					totalCommits: weekData.total,
					contributors: [], // GitHub API doesn't provide contributor info
					days: weekData.days
				};
			});

			// Calculate totals
			const totalCommits = weeks.reduce((sum, week) => sum + week.totalCommits, 0);

			const activityData: CommitActivityData = {
				weeks,
				totalCommits,
				totalContributors: 0, // GitHub stats API doesn't provide this info
				averageCommitsPerWeek: totalCommits / weeks.length
			};

			console.log(`[Commit Activity API] Successfully fetched ${weeks.length} weeks of data`);

			return {
				success: true,
				data: activityData
			};

		} catch (error: any) {
			console.error('[Commit Activity API] Error:', error);
			
			// GitHub API may return 202 indicating stats are being computed
			if (error.response?.status === 202) {
				return {
					success: false,
					error: 'GitHub is computing commit statistics. Please try again in a few moments.',
					data: null
				};
			}
			
			// 401/403 indicates authentication issues
			if (error.response?.status === 401 || error.response?.status === 403) {
				return {
					success: false,
					error: 'Authentication failed. Please sign in to GitHub.',
					data: null
				};
			}

			// 404 indicates repository doesn't exist or no access
			if (error.response?.status === 404) {
				return {
					success: false,
					error: 'Repository not found or you do not have access to it.',
					data: null
				};
			}

			return {
				success: false,
				error: error.message || 'Failed to fetch commit activity from GitHub',
				data: null
			};
		}
	});


