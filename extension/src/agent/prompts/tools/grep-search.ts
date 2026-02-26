import { ToolPromptSchema } from '../utils/utils';

export const grepSearchPrompt: ToolPromptSchema = {
	name: 'grep_search',
	description:
		'Search for text patterns in files using regex. Fast and efficient for finding code, text, or patterns across the codebase.',
	parameters: {
		query: {
			type: 'string',
			description: 'The regex pattern to search for',
			required: true,
		},
		includePattern: {
			type: 'string',
			description: "Optional glob pattern for files to include (e.g., '**/*.ts')",
			required: false,
		},
		caseSensitive: {
			type: 'boolean',
			description: 'Whether the search should be case-sensitive (default: false)',
			required: false,
		},
		maxResults: {
			type: 'number',
			description: 'Maximum number of results to return (default: 100)',
			required: false,
		},
	},
	capabilities: [
		'Fast regex-based text search across the workspace',
		'Filter by glob pattern, case sensitivity, and result count',
		'Returns file paths, line numbers, and matching content',
		'Use for discovering files — then use pattern_search for deep analysis of known files',
	],
	examples: [
		{
			description: 'Search for a function definition',
			output: `<grep_search>
  <query>function handleClick</query>
</grep_search>`,
		},
		{
			description: 'Search in TypeScript files only',
			output: `<grep_search>
  <query>interface.*Props</query>
  <includePattern>**/*.ts</includePattern>
</grep_search>`,
		},
	],
};
