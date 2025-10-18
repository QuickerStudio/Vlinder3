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
			
			// Get both agent settings and GitHub settings
			const agentSettings = globalState.getGlobalState('githubAgentSettings') || {
				enabled: false,
				selectedModel: null,
				customPrompt: '',
			};
			
			const githubSettings = globalState.getGlobalState('githubSettings') || {};
			
			// Merge both settings for compatibility
			const settings = {
				...agentSettings,
				...githubSettings,
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
			settings: z.object({
				defaultCloneDirectory: z.string().optional(),
			}).optional(),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			
			// Update agent settings if provided
			if (input.enabled !== undefined || input.selectedModel !== undefined || input.customPrompt !== undefined) {
				const currentAgentSettings = globalState.getGlobalState('githubAgentSettings') || {
					enabled: false,
					selectedModel: null,
					customPrompt: '',
				};

				const newAgentSettings = {
					...currentAgentSettings,
					enabled: input.enabled ?? currentAgentSettings.enabled,
					selectedModel: input.selectedModel ?? currentAgentSettings.selectedModel,
					customPrompt: input.customPrompt ?? currentAgentSettings.customPrompt,
				};

				await globalState.updateGlobalState('githubAgentSettings', newAgentSettings);
			}

			// Update GitHub settings (like defaultCloneDirectory) if provided
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

