/**
 * Wiki - Delete Local Wiki
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { GlobalStateManager } from '../../../../providers/state/global-state-manager';

export const deleteLocalWiki = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const fs = require('fs').promises;
			const globalState = GlobalStateManager.getInstance();
			const wikiCloneStatus = globalState.getGlobalState('wikiCloneStatus') || {};
			const status = wikiCloneStatus[input.repoFullName];
			
			if (!status || !status.localPath) {
				return { success: false, error: 'Wiki not cloned' };
			}
			
			// Delete local directory
			await fs.rm(status.localPath, { recursive: true, force: true });
			
			// Update status
			delete wikiCloneStatus[input.repoFullName];
			await globalState.updateGlobalState('wikiCloneStatus', wikiCloneStatus);
			
			return { success: true, message: 'Wiki deleted successfully' };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	});

