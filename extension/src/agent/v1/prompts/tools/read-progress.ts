// prompts/tools/read-progress.ts
import { ToolPromptSchema } from '../utils/utils';

export const readProgressPrompt: ToolPromptSchema = {
	name: 'read_progress',
	description: `Reads the current progress and output of a running terminal process. Use this tool to monitor long-running commands. IMPORTANT: Terminal names are shown in terminal tool output (e.g., 'npm-install-1', 'git-status-2'). Use terminal tool with action="list-terminals" to see all active terminals.`,
	parameters: {
		terminalId: {
			type: 'number',
			description:
				'DEPRECATED: Use terminalName instead. The process ID (PID) of the terminal to check.',
			required: false,
		},
		terminalName: {
			type: 'string',
			description:
				'RECOMMENDED: The name of the terminal to check (e.g., "npm-install-1", "backend-session"). Terminal names are shown in command output. Use terminal tool with action="list-terminals" to see all active terminals.',
			required: false,
		},
		includeFullOutput: {
			type: 'boolean',
			description:
				'Whether to include full output history. Default is false (only recent output).',
			required: false,
		},
	},
	capabilities: [
		'Check if a terminal process is still running',
		'Read recent or full output from a terminal',
		'Determine if a process is actively producing output (hot state)',
		'Identify dev server status and URL',
		'Detect errors or issues in process output',
		'Get recommendations on whether to continue waiting or terminate',
		'IMPORTANT: Terminal names are semantic (npm-1, git-2) - use these names, NOT process IDs',
		'Use terminal tool with action="list-terminals" first to see all terminals and their names',
		'Terminal names from git_bash and terminal tools can be used directly',
	],
	examples: [
		{
			description: 'First, list all terminals to see their names',
			output: `<tool name="terminal">
  <action>list-terminals</action>
</tool>`,
		},
		{
			description: 'Check progress using terminal name (RECOMMENDED)',
			output: `<tool name="read_progress">
  <terminalName>npm-install-1</terminalName>
</tool>`,
		},
		{
			description: 'Monitor dev server by its custom name',
			output: `<tool name="read_progress">
  <terminalName>dev-server</terminalName>
  <includeFullOutput>true</includeFullOutput>
</tool>`,
		},
		{
			description: 'Check custom terminal session',
			output: `<tool name="read_progress">
  <terminalName>backend-session</terminalName>
</tool>`,
		},
		{
			description: 'Quick check of recent output from git command',
			output: `<tool name="read_progress">
  <terminalName>git-2</terminalName>
  <includeFullOutput>false</includeFullOutput>
</tool>`,
		},
	],
};
