import { ToolPromptSchema } from '../utils/utils';

export const insertEditPrompt: ToolPromptSchema = {
	name: 'insert_edit',
	description:
		'Insert or replace code at specific line numbers in a file. Useful for precise line-based editing when you know the exact line numbers.',
	parameters: {
		explanation: {
			type: 'string',
			description: 'Explanation of why this edit is being made',
			required: true,
		},
		filePath: {
			type: 'string',
			description: 'Relative path to the file to edit',
			required: true,
		},
		startLine: {
			type: 'number',
			description:
				'Starting line number (1-based). For insertion, code is inserted before this line. For replacement, this is the first line to replace.',
			required: true,
		},
		endLine: {
			type: 'number',
			description:
				'Ending line number (1-based, inclusive). Only required for replacement. If omitted, performs insertion.',
			required: false,
		},
		code: {
			type: 'string',
			description: 'The code to insert or use as replacement. Should include proper indentation.',
			required: true,
		},
	},
	capabilities: [
		'Insert new code before a specific line number',
		'Replace a range of lines with new code',
		'Use read_file first to identify the correct line numbers',
	],
	examples: [
		{
			description: 'Insert a new import statement at line 2',
			output: `<insert_edit>
  <explanation>Add missing import for useEffect hook</explanation>
  <filePath>src/components/Dashboard.tsx</filePath>
  <startLine>2</startLine>
  <code>import { useEffect } from 'react'</code>
</insert_edit>`,
		},
		{
			description: 'Replace lines 15–20 with improved version',
			output: `<insert_edit>
  <explanation>Add error handling to calculateTotal</explanation>
  <filePath>src/utils/calculations.ts</filePath>
  <startLine>15</startLine>
  <endLine>20</endLine>
  <code>function calculateTotal(items: Item[]): number {
  if (!items || items.length === 0) return 0
  return items.reduce((sum, item) => sum + item.price, 0)
}</code>
</insert_edit>`,
		},
	],
};
