import { ToolPromptSchema } from '../utils/utils';

export const terminalToolPrompt: ToolPromptSchema = {
	name: 'terminal',
	description:
		'Execute shell commands and capture output with exit codes. Use when you need to run CLI commands, build tools, package managers (npm/yarn), git operations, or any terminal commands that produce results you need to read.',
	parameters: {
		command: {
			type: 'string',
			description: 'Command to execute',
			required: true,
		},
		shell: {
			type: 'string',
			description:
				"Shell: 'auto' (default), 'git-bash', 'powershell', 'cmd', 'bash', 'zsh', 'fish', 'sh'",
			required: false,
		},
		cwd: {
			type: 'string',
			description: 'Working directory (default: workspace root)',
			required: false,
		},
		timeout: {
			type: 'number',
			description: 'Timeout in milliseconds (default: 30000)',
			required: false,
		},
		env: {
			type: 'object',
			description: 'Environment variables (key-value pairs)',
			required: false,
		},
		captureOutput: {
			type: 'boolean',
			description:
				'Capture output (default: true). Set false for long-running servers.',
			required: false,
		},
		interactive: {
			type: 'boolean',
			description: 'Interactive mode - returns immediately (default: false)',
			required: false,
		},
		terminalName: {
			type: 'string',
			description: 'Terminal session name for reuse',
			required: false,
		},
		reuseTerminal: {
			type: 'boolean',
			description: 'Reuse terminal with same name (default: false)',
			required: false,
		},
		action: {
			type: 'string',
			description: "Special action: 'list-terminals' to see all terminals with their states",
			required: false,
		},
	},
	capabilities: [
		// Core Capabilities
		'Captures command output and exit codes for result analysis',
		'Provides error analysis with fix suggestions when commands fail',
		'Tracks terminal states - use action="list-terminals" to see all active terminals',
		'Shows progress updates for long-running commands (>3 seconds)',
		'Generates semantic terminal names (npm-1, git-2) for easy identification',
		
		// Shell Integration Support
		'Windows: Git Bash and PowerShell support shell integration - provides exit codes and output capture',
		'Windows: CMD does NOT support shell integration - command executes but output cannot be captured',
		'macOS/Linux: bash, zsh, fish, pwsh support shell integration',
		"PowerShell uses VSCode's native API - automatically uses best available PowerShell (pwsh or powershell.exe)",

		// Shell Selection Strategy
		"Use 'git-bash' on Windows when you need reliable output capture",
		"Use 'powershell' on Windows for PowerShell-specific commands",
		"Use 'cmd' only when CMD-specific syntax is required - accept that output cannot be captured",
		"Use 'auto' for cross-platform compatibility - detects system default shell",

		// Output Interpretation
		'<status>success</status>: Command completed, check exitCode and output',
		'<status>executed</status>: Command sent but output not captured - use read-progress to monitor',
		'<status>error</status>: Command failed - check <error_analysis> for fix suggestions',
		
		// When Commands Fail
		'Errors include <error_type> (MODULE_NOT_FOUND, PERMISSION_DENIED, etc.) and <suggestion> for fixes',
		'Common errors: missing dependencies, permission issues, port conflicts, file not found, git/npm errors',
		
		// Managing Multiple Terminals
		'action="list-terminals" shows all terminals with their current status (idle/running/completed/error)',
		'Terminal names like "npm-1" or "git-2" help track which terminal ran which command',

		// Timeout Management
		'Default timeout: 30 seconds - increase for build commands, tests, or long operations',
		'Interactive commands (interactive=true) return immediately - use for REPL or user input scenarios',

		// Session Management & Terminal Reuse
		'IMPORTANT: Set terminalName + reuseTerminal=true to run multiple commands in same shell session',
		'Terminal reuse is the PRIMARY way to run multiple commands in sequence without creating new terminals',
		'Example workflow: First command sets terminalName="my-session", subsequent commands use terminalName="my-session" + reuseTerminal=true',
		'Each terminal automatically gets a semantic name (npm-1, git-2) that appears in the output',
		'Use captureOutput=false for long-running servers - monitor with read_progress tool instead',

		// Environment Variables
		'PowerShell: $env:VAR_NAME',
		'CMD: %VAR_NAME%',
		'Unix shells: $VAR_NAME or export VAR_NAME=value',
	],
	examples: [
		{
			description: 'Run npm command',
			output: `<tool name="terminal">
  <command>npm install</command>
</tool>`,
		},
		{
			description: 'Check what terminals are running',
			output: `<tool name="terminal">
  <action>list-terminals</action>
</tool>`,
		},
		{
			description: 'Run git command',
			output: `<tool name="terminal">
  <command>git status</command>
</tool>`,
		},
		{
			description: 'Use specific shell (Windows Git Bash)',
			output: `<tool name="terminal">
  <command>ls -la</command>
  <shell>git-bash</shell>
</tool>`,
		},
		{
			description: 'PowerShell command (uses VSCode native API)',
			output: `<tool name="terminal">
  <command>Get-Process | Where-Object {$_.CPU -gt 100}</command>
  <shell>powershell</shell>
</tool>`,
		},
		{
			description: 'CMD command (no output capture)',
			output: `<tool name="terminal">
  <command>dir /s</command>
  <shell>cmd</shell>
</tool>`,
		},
		{
			description: 'Long-running build (increase timeout)',
			output: `<tool name="terminal">
  <command>npm run build</command>
  <timeout>120000</timeout>
</tool>`,
		},
		{
			description: 'Dev server (no output capture, monitor separately)',
			output: `<tool name="terminal">
  <command>npm run dev</command>
  <captureOutput>false</captureOutput>
  <terminalName>dev-server</terminalName>
</tool>`,
		},
		{
			description: 'Run multiple commands in same terminal session (RECOMMENDED)',
			output: `<!-- First command creates the terminal -->
<tool name="terminal">
  <command>cd backend</command>
  <terminalName>backend-session</terminalName>
</tool>

<!-- Subsequent commands reuse the same terminal -->
<tool name="terminal">
  <command>npm install</command>
  <terminalName>backend-session</terminalName>
  <reuseTerminal>true</reuseTerminal>
</tool>

<tool name="terminal">
  <command>npm run build</command>
  <terminalName>backend-session</terminalName>
  <reuseTerminal>true</reuseTerminal>
</tool>`,
		},
		{
			description: 'Custom working directory + environment variables',
			output: `<tool name="terminal">
  <command>node server.js</command>
  <cwd>/path/to/project</cwd>
  <env>{"NODE_ENV": "production", "PORT": "3000"}</env>
</tool>`,
		},
	],
};
