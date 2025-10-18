/**
 * Code - Get Commit Activity
 * 
 * Analyzes commit history and returns weekly activity statistics
 * similar to GitHub's commit activity graph
 */

import { z } from 'zod';
import { procedure } from '../../../../../router/utils';
import { GlobalStateManager } from '../../../../../providers/state/global-state-manager';
import simpleGit from 'simple-git';

interface WeeklyActivity {
	weekStart: string;
	weekEnd: string;
	totalCommits: number;
	contributors: string[];
	days: number[]; // 7 days, Sunday to Saturday
}

interface CommitActivityData {
	weeks: WeeklyActivity[];
	totalCommits: number;
	totalContributors: number;
	averageCommitsPerWeek: number;
}

export const getCommitActivity = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const codeCloneStatus = globalState.getGlobalState('codeCloneStatus') || {};
			const status = codeCloneStatus[input.repoFullName];

			if (!status || !status.localPath) {
				return {
					success: false,
					error: 'Code repository not cloned locally',
					data: null
				};
			}

			const git = simpleGit(status.localPath);
			
			// Get commits from past year (52 weeks)
			const oneYearAgo = new Date();
			oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
			
			// Get all commit records
			const log = await git.log({
				'--since': oneYearAgo.toISOString(),
				'--all': null
			});

			// Initialize 52 weeks data structure
			const weeks: WeeklyActivity[] = [];
			const now = new Date();
			
			// Create 52 weeks of empty data
			for (let i = 51; i >= 0; i--) {
				const weekEnd = new Date(now);
				weekEnd.setDate(weekEnd.getDate() - (i * 7));
				// Adjust to end on Saturday
				weekEnd.setDate(weekEnd.getDate() - weekEnd.getDay() + 6);
				
				const weekStart = new Date(weekEnd);
				weekStart.setDate(weekStart.getDate() - 6);
				
				weeks.push({
					weekStart: weekStart.toISOString(),
					weekEnd: weekEnd.toISOString(),
					totalCommits: 0,
					contributors: [],
					days: [0, 0, 0, 0, 0, 0, 0] // Sun to Sat
				});
			}

			// Fill commit data
			const contributorsSet = new Set<string>();
			let totalCommits = 0;

			log.all.forEach((commit: any) => {
				const commitDate = new Date(commit.date);
				const author = commit.author_name;
				
				// Find corresponding week
				const weekIndex = weeks.findIndex(week => {
					const start = new Date(week.weekStart);
					const end = new Date(week.weekEnd);
					return commitDate >= start && commitDate <= end;
				});

				if (weekIndex !== -1) {
					const week = weeks[weekIndex];
					week.totalCommits++;
					totalCommits++;
					
					// Add contributor
					if (!week.contributors.includes(author)) {
						week.contributors.push(author);
					}
					contributorsSet.add(author);
					
					// Count by day of week (0 = Sunday, 6 = Saturday)
					const dayOfWeek = commitDate.getDay();
					week.days[dayOfWeek]++;
				}
			});

			const activityData: CommitActivityData = {
				weeks,
				totalCommits,
				totalContributors: contributorsSet.size,
				averageCommitsPerWeek: totalCommits / 52
			};

			return {
				success: true,
				data: activityData
			};

		} catch (error: any) {
			console.error('[Commit Activity] Error:', error);
			return {
				success: false,
				error: error.message,
				data: null
			};
		}
	});


