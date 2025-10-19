/**
 * GitHub Settings
 * Manages GitHub integration settings like default clone directory
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { GlobalStateManager } from '../../../../providers/state/global-state-manager';

export const getGitHubSettings = procedure
	.input(z.object({}))
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const githubSettings = globalState.getGlobalState('githubSettings') || {};
			
			return { success: true, settings: githubSettings };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	});

export const updateGitHubSettings = procedure
	.input(
		z.object({
			settings: z.object({
				defaultCloneDirectory: z.string().optional(),
			}).optional(),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			
			// Update GitHub settings (like defaultCloneDirectory)
			if (input.settings) {
				const currentGitHubSettings = globalState.getGlobalState('githubSettings') || {};
				const newGitHubSettings = {
					...currentGitHubSettings,
					...input.settings,
				};
				await globalState.updateGlobalState('githubSettings', newGitHubSettings);
			}

			return { success: true, settings: globalState.getGlobalState('githubSettings') };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	});

