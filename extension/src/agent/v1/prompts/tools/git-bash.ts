import { ToolPromptSchema } from '../utils/utils';

export const gitBashToolPrompt: ToolPromptSchema = {
	name: 'git_bash',
	description:
		"Executes commands in Git Bash shell environment. Provides Unix-like command-line with Git tools and utilities (grep, find, sed, awk, curl, jq, etc.). Uses Shell Integration API for command execution with exit codes and output capture. Supports terminal reuse for multi-command workflows. Terminal names are semantic (e.g., 'npm-install-1', 'git-status-2'). Executes from workspace root: {{cwd}}",
	parameters: {
		command: {
			type: 'string',
			description:
				'The Git Bash command to execute. Can use Unix utilities like grep, find, sed, awk, curl, jq, git, ssh, etc. Supports pipes, redirects, and command chaining.',
			required: true,
		},
		timeout: {
			type: 'number',
			description:
				'Maximum execution time in milliseconds. Default is 300000 (5 minutes). Increase for long-running commands like builds or downloads.',
			required: false,
		},
		captureOutput: {
			type: 'boolean',
			description:
				"Whether to capture and return command output. Default is true. Set to false for commands that don't produce useful output or for long-running processes.",
			required: false,
		},
		terminalName: {
			type: 'string',
			description:
				'Custom name for the terminal. Use with reuseTerminal to run multiple commands in the same session. Example: "backend-setup", "test-runner".',
			required: false,
		},
		reuseTerminal: {
			type: 'boolean',
			description:
				'Reuse existing terminal with the same name. Requires terminalName. Default is false. Useful for running multiple commands in sequence.',
			required: false,
		},
	},
	capabilities: [
		"Uses VSCode's official Terminal Shell Integration API for reliable command execution",
		'Automatically detects Git Bash installation on Windows',
		'Captures accurate exit codes from commands (when shell integration is available)',
		'Streams command output in real-time using the shell integration API',
		'Supports all Unix utilities included with Git Bash (grep, find, sed, awk, curl, wget, ssh, etc.)',
		'Supports Git commands and operations',
		'Supports pipes, redirects, and command chaining (|, >, >>, &&, ||, ;)',
		'Configurable timeout for long-running commands',
		'Automatic ANSI escape sequence cleaning for readable output',
		'Graceful fallback when shell integration is unavailable',
		'Terminal Naming: Automatically generates semantic names (npm-install-1, git-status-2) for easy identification',
		'Terminal Reuse: Set terminalName + reuseTerminal=true to run multiple commands in same session',
		'Terminal Tracking: Each terminal is tracked with name, last command, and creation time',
		'Environment variables are automatically passed to the terminal from the current process',
		'Only available on Windows systems with Git Bash installed',
		'Shell integration may not be immediately available for new terminals (waits up to 3 seconds)',
		'Without shell integration, exit codes and output capture are not available',
		'Interactive commands (requiring user input) are not supported',
		'Commands that open GUI applications may not work as expected',
		'Long-running commands should increase timeout or use terminal tool with captureOutput=false',
		'Some Windows-specific commands may not work in Git Bash environment',
		'Best Practice: Use Git Bash for Unix-style file operations (grep, find, sed, awk)',
		'Best Practice: Use Git Bash for Git operations and repository management',
		'Best Practice: Use Git Bash for curl/wget downloads and API calls',
		'Best Practice: Check for <exitCode>0</exitCode> in results to verify command success',
		'Best Practice: Look for <status>executed_without_integration</status> to understand if shell integration was used',
		'Best Practice: Increase timeout for long-running commands (builds, downloads, tests)',
		'Best Practice: Use absolute paths or ensure correct working directory for file operations',
		'Best Practice: Avoid interactive commands - use non-interactive flags when available',
		'Best Practice: For very long-running processes, consider using terminal tool instead',
		'Best Practice: Use jq for JSON processing in Git Bash (included with Git for Windows)',
		'Best Practice: Use terminalName + reuseTerminal to run multiple commands in same session (e.g., cd then npm)',
		'Best Practice: Terminal names are shown in output - use them with read_progress to monitor long-running commands',
		'Output Tips: Use ls -1 for single-column file listing instead of ls alone',
		'Output Tips: Use printenv or env for environment variables instead of echo $VAR',
		'Output Tips: Merge stderr with stdout using 2>&1 to capture error messages',
		'Output Tips: For sed newlines, use $\'\\n\' syntax: sed "s/pattern/replacement$\'\\n\'/g"',
		'Output Tips: Some commands may produce no output - append && echo "Done" to confirm execution',
	],
	examples: [
		{
			description: 'Search for TODO comments in source files',
			output: `<git_bash>
  <command>grep -r "TODO" ./src --include="*.ts" --include="*.tsx"</command>
</git_bash>`,
		},
		{
			description: 'Find all JavaScript files modified in the last 7 days',
			output: `<git_bash>
  <command>find ./src -name "*.js" -mtime -7 -type f</command>
</git_bash>`,
		},
		{
			description: 'Count lines of code in TypeScript files',
			output: `<git_bash>
  <command>find ./src -name "*.ts" -exec wc -l {} + | tail -1</command>
</git_bash>`,
		},
		{
			description: 'Get GitHub repository information using curl and jq',
			output: `<git_bash>
  <command>curl -sL https://api.github.com/repos/microsoft/vscode | jq '.stargazers_count, .forks_count'</command>
</git_bash>`,
		},
		{
			description: 'Check Git repository status',
			output: `<git_bash>
  <command>git status --short</command>
</git_bash>`,
		},
		{
			description: 'List recent Git commits',
			output: `<git_bash>
  <command>git log --oneline -10</command>
</git_bash>`,
		},
		{
			description: 'Run a build command with extended timeout',
			output: `<git_bash>
  <command>npm run build</command>
  <timeout>600000</timeout>
</git_bash>`,
		},
		{
			description: 'Replace text in multiple files using sed',
			output: `<git_bash>
  <command>find ./src -name "*.ts" -exec sed -i 's/oldText/newText/g' {} +</command>
</git_bash>`,
		},
		{
			description: 'Download a file using curl',
			output: `<git_bash>
  <command>curl -L -o package.json https://example.com/package.json</command>
</git_bash>`,
		},
		{
			description: 'Check if a port is in use',
			output: `<git_bash>
  <command>netstat -ano | grep :3000</command>
</git_bash>`,
		},
		{
			description: 'Run multiple commands in same terminal session',
			output: `<git_bash>
  <command>cd backend</command>
  <terminalName>backend-setup</terminalName>
</git_bash>

<!-- Then run more commands in the same terminal -->
<git_bash>
  <command>npm install</command>
  <terminalName>backend-setup</terminalName>
  <reuseTerminal>true</reuseTerminal>
</git_bash>

<git_bash>
  <command>npm run build</command>
  <terminalName>backend-setup</terminalName>
  <reuseTerminal>true</reuseTerminal>
</git_bash>`,
		},
		{
			description: 'Check environment variables',
			output: `<git_bash>
  <command>printenv HOME</command>
</git_bash>

<!-- Or list all environment variables -->
<git_bash>
  <command>printenv | sort</command>
</git_bash>`,
		},
		{
			description: 'Capture error output with stderr redirect',
			output: `<git_bash>
  <command>npm test 2>&1</command>
</git_bash>`,
		},
		{
			description: 'Use sed with newlines properly',
			output: `<git_bash>
  <command>echo "line1line2" | sed "s/line2/$'\\n'line2/"</command>
</git_bash>`,
		},
	],
};
