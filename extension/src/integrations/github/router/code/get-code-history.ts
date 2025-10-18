/**
 * Code - Get History
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { GlobalStateManager } from '../../../../providers/state/global-state-manager';
import simpleGit from 'simple-git';

export const getCodeHistory = procedure
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
					commits: []
				};
			}

		const git = simpleGit(status.localPath);
		const log = await git.log({ maxCount: 50 });

		const commits = log.all.map((commit: any, index: number) => ({
			id: `${input.repoFullName}-${index}`,
			hash: commit.hash,
			message: commit.message,
			author: commit.author_name,
			email: commit.author_email,
			date: new Date(commit.date).toLocaleString(),
			refs: commit.refs
		}));

		return {
			success: true,
			commits
		};
		} catch (error: any) {
			console.error('[Code History] Error:', error);
			return {
				success: false,
				error: error.message,
				commits: []
			};
		}
	});

