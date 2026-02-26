import { ToolPromptSchema } from '../utils/utils';

export const vscodeApiPrompt: ToolPromptSchema = {
	name: 'get_vscode_api',
	description:
		'Search the VS Code API documentation for information about VS Code extension development APIs.',
	parameters: {
		query: {
			type: 'string',
			description:
				"The search query for VS Code API documentation (e.g., 'window', 'TextEditor', 'showInformationMessage')",
			required: true,
		},
	},
	capabilities: [
		'Search for VS Code API classes, interfaces, functions, and namespaces',
		'Get documentation for specific API members with usage descriptions',
		'Use only for VS Code extension development questions — not for general code search',
	],
	examples: [
		{
			description: 'Search for window API',
			output: `<get_vscode_api>
  <query>window</query>
</get_vscode_api>`,
		},
		{
			description: 'Search for a specific method',
			output: `<get_vscode_api>
  <query>showInformationMessage</query>
</get_vscode_api>`,
		},
	],
};
