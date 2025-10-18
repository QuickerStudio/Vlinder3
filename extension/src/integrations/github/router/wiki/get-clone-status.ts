/**
 * Wiki - Get Clone Status
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { GlobalStateManager } from '../../../../providers/state/global-state-manager';

export const getWikiCloneStatus = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		const globalState = GlobalStateManager.getInstance();
		const wikiCloneStatus = globalState.getGlobalState('wikiCloneStatus') || {};
		const status = wikiCloneStatus[input.repoFullName];
		
		return {
			isCloned: status?.isCloned || false,
			localPath: status?.localPath,
			clonedAt: status?.clonedAt,
		};
	});

