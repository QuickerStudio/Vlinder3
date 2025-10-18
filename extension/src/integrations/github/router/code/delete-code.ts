/**
 * Code - Delete Local Code
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { GlobalStateManager } from '../../../../providers/state/global-state-manager';

export const deleteLocalCode = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const fs = require('fs').promises;
			const globalState = GlobalStateManager.getInstance();
			const codeCloneStatus = globalState.getGlobalState('codeCloneStatus') || {};
			const status = codeCloneStatus[input.repoFullName];
			
			if (!status || !status.localPath) {
				return { success: false, error: 'Code repository not cloned' };
			}
			
			// Delete local directory
			await fs.rm(status.localPath, { recursive: true, force: true });
			
			// Update status
			delete codeCloneStatus[input.repoFullName];
			await globalState.updateGlobalState('codeCloneStatus', codeCloneStatus);
			
			return { success: true, message: 'Code repository deleted successfully' };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	});

