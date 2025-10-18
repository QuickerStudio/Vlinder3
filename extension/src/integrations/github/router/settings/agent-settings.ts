/**
 * GitHub Agent Settings
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { GlobalStateManager } from '../../../../providers/state/global-state-manager';

export const getGitHubAgentSettings = procedure
	.input(z.object({}))
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const settings = globalState.getGlobalState('githubAgentSettings') || {
				enabled: false,
				selectedModel: null,
				customPrompt: '',
			};
			return { success: true, settings };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	});

export const updateGitHubAgentSettings = procedure
	.input(
		z.object({
			enabled: z.boolean().optional(),
			selectedModel: z.string().nullable().optional(),
			customPrompt: z.string().optional(),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const currentSettings = globalState.getGlobalState('githubAgentSettings') || {
				enabled: false,
				selectedModel: null,
				customPrompt: '',
			};

			const newSettings = {
				...currentSettings,
				...input,
			};

			await globalState.updateGlobalState('githubAgentSettings', newSettings);
			return { success: true, settings: newSettings };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	});

