import { ToolPromptSchema } from '../utils/utils';

export const patternSearchPrompt: ToolPromptSchema = {
	name: 'pattern_search',
	description:
		'Analyze how a pattern is used across a specific set of files you already identified. Provides statistical insights, usage context detection, and architectural recommendations. Unlike grep_search (discovers files across the whole codebase), this tool does deep analysis on files you specify.',
	parameters: {
		searchPattern: {
			type: 'string',
			description:
				'The pattern to search for. Supports plain text and regular expressions.',
			required: true,
		},
		files: {
			type: 'array',
			description:
				'Specific file paths or glob patterns to analyze (e.g., ["src/tools/**/*.ts"]). Max 100 files.',
			required: true,
		},
		caseSensitive: {
			type: 'boolean',
			description: 'Whether the search should be case-sensitive (default: false)',
			required: false,
		},
		contextLinesBefore: {
			type: 'number',
			description: 'Lines of context before each match (default: 5, max: 20)',
			required: false,
		},
		contextLinesAfter: {
			type: 'number',
			description: 'Lines of context after each match (default: 5, max: 20)',
			required: false,
		},
	},
	capabilities: [
		'Deep pattern analysis across a known set of files',
		'Statistical distribution by file type and directory',
		'Usage context detection (imports, class definitions, function calls)',
		'Architectural insights and refactoring recommendations',
		'Configurable context lines (0–20) around each match',
	],
	examples: [
		{
			description: 'Analyze how BaseAgentTool is used across tool files',
			output: `<pattern_search>
  <searchPattern>BaseAgentTool</searchPattern>
  <files>["src/agent/tools/runners/*.tool.ts"]</files>
  <contextLinesBefore>5</contextLinesBefore>
  <contextLinesAfter>5</contextLinesAfter>
</pattern_search>`,
		},
		{
			description: 'Compare execute() implementations across specific files',
			output: `<pattern_search>
  <searchPattern>async execute()</searchPattern>
  <files>["src/agent/tools/runners/fast-editor.tool.ts", "src/agent/tools/runners/grep-search.tool.ts"]</files>
  <contextLinesBefore>10</contextLinesBefore>
  <contextLinesAfter>15</contextLinesAfter>
</pattern_search>`,
		},
	],
};
