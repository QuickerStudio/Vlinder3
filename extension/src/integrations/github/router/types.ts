/**
 * GitHub Router Types
 */

import { z } from 'zod';

export const githubRepositorySchema = z.object({
	id: z.number(),
	name: z.string(),
	fullName: z.string(),
	description: z.string().nullable(),
	url: z.string(),
	cloneUrl: z.string(),
	private: z.boolean(),
	updatedAt: z.string(),
	stargazersCount: z.number().optional(),
	forksCount: z.number().optional(),
	hasWiki: z.boolean().optional(),
});

export type GitHubRepository = z.infer<typeof githubRepositorySchema>;

