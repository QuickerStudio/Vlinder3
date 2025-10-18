/**
 * Code - Get Clone Status
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { GlobalStateManager } from '../../../../providers/state/global-state-manager';

export const getCodeCloneStatus = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		const globalState = GlobalStateManager.getInstance();
		const codeCloneStatus = globalState.getGlobalState('codeCloneStatus') || {};
		const status = codeCloneStatus[input.repoFullName];
		
		return {
			isCloned: status?.isCloned || false,
			localPath: status?.localPath,
			clonedAt: status?.clonedAt,
		};
	});

