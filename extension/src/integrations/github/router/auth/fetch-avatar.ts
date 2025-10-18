/**
 * GitHub Authentication - Fetch Avatar
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';

export const fetchGitHubAvatar = procedure
	.input(z.object({
		avatarUrl: z.string(),
	}))
	.resolve(async (ctx, input) => {
		try {
			const response = await fetch(input.avatarUrl);
			if (!response.ok) {
				throw new Error('Failed to fetch avatar');
			}

			const arrayBuffer = await response.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			const base64 = buffer.toString('base64');
			const mimeType = response.headers.get('content-type') || 'image/png';

			return {
				success: true,
				base64: `data:${mimeType};base64,${base64}`,
			};
		} catch (error: any) {
			console.error('Error fetching avatar:', error);
			return {
				success: false,
				error: error.message,
			};
		}
	});

