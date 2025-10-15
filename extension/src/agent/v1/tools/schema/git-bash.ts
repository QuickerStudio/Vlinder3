// schema/git-bash.ts
import { z } from 'zod';

/**
 * @tool git_bash
 * @description Executes commands in Git Bash shell environment. Provides Unix-like command-line with Git tools and utilities (grep, find, sed, awk, curl, etc.). Features: sandbox security, auto-monitoring, Shell Integration API for output capture, terminal reuse for multi-command workflows.
 * @schema
 * {
 *   command: string; // The Git Bash command to execute
 *   timeout?: number; // Maximum execution time in milliseconds (default: 300000 = 5 minutes)
 *   captureOutput?: boolean; // Whether to capture and return command output (default: true)
 *   autoMonitor?: boolean; // Auto-trigger read_progress if timeout reached (default: true)
 *   monitorInterval?: number; // Monitoring interval in ms when auto-monitoring (default: 5000)
 *   sandbox?: boolean; // Enable sandbox mode with safety checks (default: true)
 *   workingDirectory?: string; // Override working directory (for sandbox isolation)
 *   terminalName?: string; // Custom name for the terminal (enables reuse)
 *   reuseTerminal?: boolean; // Reuse terminal with same name for multiple commands (default: false)
 * }
 * @example
 * ```xml
 * <tool name="git_bash">
 *   <command>grep -r "TODO" ./src</command>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="git_bash">
 *   <command>find ./dist -name "*.js" -type f</command>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="git_bash">
 *   <command>npm run build</command>
 *   <timeout>600000</timeout>
 *   <autoMonitor>true</autoMonitor>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="git_bash">
 *   <command>rm -rf node_modules && npm install</command>
 *   <sandbox>true</sandbox>
 * </tool>
 * ```
 */
const schema = z.object({
	command: z
		.string()
		.describe(
			'The Git Bash command to execute. Can use Unix utilities like grep, find, sed, awk, curl, jq, etc.'
		),
	timeout: z
		.number()
		.optional()
		.default(300000)
		.describe(
			'Maximum execution time in milliseconds. Default is 300000 (5 minutes). When timeout is reached, auto-monitoring activates if enabled.'
		),
	captureOutput: z
		.boolean()
		.optional()
		.default(true)
		.describe('Whether to capture and return command output. Default is true.'),
	autoMonitor: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			'Auto-trigger read_progress tool to monitor terminal when timeout is reached. Default is true. Prevents blocking and allows continuous progress tracking.'
		),
	monitorInterval: z
		.number()
		.optional()
		.default(5000)
		.describe(
			'Interval in milliseconds for progress monitoring when auto-monitor is active. Default is 5000 (5 seconds).'
		),
	sandbox: z
		.boolean()
		.optional()
		.default(true)
		.describe(
			'Enable sandbox mode with safety checks (validates dangerous commands, restricts directory access). Default is true for security.'
		),
	workingDirectory: z
		.string()
		.optional()
		.describe(
			'Override the working directory for command execution. Useful for isolating command execution scope.'
		),
	terminalName: z
		.string()
		.optional()
		.describe(
			'Custom name for the terminal. When provided with reuseTerminal=true, enables running multiple commands in the same terminal session. Use descriptive names like "build-server" or "test-runner".'
		),
	reuseTerminal: z
		.boolean()
		.optional()
		.default(false)
		.describe(
			'Reuse existing terminal with the same name instead of creating a new one. Requires terminalName to be specified. Useful for running multiple commands in sequence within the same shell environment.'
		),
});

const examples = [
	`<tool name="git_bash">
  <command>grep -r "TODO" ./src</command>
</tool>`,

	`<tool name="git_bash">
  <command>find ./dist -name "*.js" -type f</command>
</tool>`,

	`<tool name="git_bash">
  <command>npm run build</command>
  <timeout>600000</timeout>
  <autoMonitor>true</autoMonitor>
</tool>`,

	`<tool name="git_bash">
  <command>npm test</command>
  <timeout>300000</timeout>
  <autoMonitor>true</autoMonitor>
  <monitorInterval>3000</monitorInterval>
</tool>`,

	`<tool name="git_bash">
  <command>rm -rf node_modules && npm install</command>
  <sandbox>true</sandbox>
  <timeout>600000</timeout>
</tool>`,

	`<!-- Reuse terminal for multiple commands in same session -->
<tool name="git_bash">
  <command>cd backend && npm install</command>
  <terminalName>backend-setup</terminalName>
</tool>
<!-- Then run more commands in the same terminal -->
<tool name="git_bash">
  <command>npm run build</command>
  <terminalName>backend-setup</terminalName>
  <reuseTerminal>true</reuseTerminal>
</tool>`,
];

export const gitBashTool = {
	schema: {
		name: 'git_bash',
		schema,
	},
	examples,
};

export type GitBashToolParams = {
	name: 'git_bash';
	input: z.infer<typeof schema>;
};
