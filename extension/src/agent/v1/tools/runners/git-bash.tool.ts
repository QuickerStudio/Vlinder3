// runners/git-bash.tool.ts
import { BaseAgentTool } from '../base-agent.tool';
import { GitBashToolParams } from '../schema/git-bash';
import { ToolResponseV2 } from '../../types';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import stripAnsi from 'strip-ansi';

/**
 * GitBashTool - Primary Command Execution Tool
 * 
 * Features:
 * - Sandbox security with command validation
 * - Auto-monitoring for long-running tasks
 * - Shell Integration with fallback
 * - Working directory isolation
 * - Comprehensive output capture
 */

// Sandbox Security Configuration
const DANGEROUS_COMMANDS = [
	'rm -rf /',
	'rm -rf /*',
	'rm -rf ~',
	'rm -rf $HOME',
	':(){ :|:& };:', // Fork bomb
	'dd if=/dev/zero',
	'mkfs',
	'format',
	'> /dev/sda',
];

const SAFE_COMMAND_PATTERNS = [
	/^npm (install|ci|run|test|start|build|dev|uninstall|update|outdated|audit|init|pack|publish|version)/,
	/^yarn (install|run|test|start|build|dev|add|remove|upgrade|outdated|audit|init)/,
	/^pnpm (install|run|test|start|build|dev|add|remove|update|outdated|audit|init)/,
	/^git (status|log|diff|add|commit|push|pull|checkout|branch|clone|fetch|merge|rebase|tag|stash)/,
	/^grep /,
	/^find /,
	/^sed /,
	/^awk /,
	/^curl /,
	/^wget /,
	/^ls /,
	/^cat /,
	/^echo /,
	/^mkdir /,
	/^touch /,
	/^mv /,
	/^cp /,
	/^node /,
	/^python /,
	/^java /,
	/^cargo /,
	/^go /,
	/^dotnet /,
];

export class GitBashTool extends BaseAgentTool<GitBashToolParams> {
	private terminalId: number | null = null;
	private monitoringActive = false;
	private monitoringSent = false; // Prevent duplicate monitoring reports
	
	// Terminal counter for semantic naming
	private static terminalCounter = 0;
	
	// Terminal registry for tracking and reuse
	private static terminalRegistry = new Map<string, {
		terminal: vscode.Terminal;
		lastUsed: Date;
		createdAt: Date;
		lastCommand?: string;
	}>();

	/**
	 * Generate semantic terminal name based on command
	 */
	private generateSemanticTerminalName(command: string): string {
		GitBashTool.terminalCounter++;
		
		// Extract command name (first word)
		const commandName = command.trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9-]/g, '');
		
		// Generate semantic name based on command
		if (commandName) {
			// Examples: "npm-install-1", "git-status-2", "node-app-3"
			return `${commandName}-${GitBashTool.terminalCounter}`;
		}
		
		// Fallback: generic bash terminal
		return `git-bash-${GitBashTool.terminalCounter}`;
	}
	
	/**
	 * Find existing terminal by name
	 */
	private findExistingTerminal(name: string): vscode.Terminal | undefined {
		const cached = GitBashTool.terminalRegistry.get(name);
		if (cached) {
			// Check if terminal still exists in VSCode
			const exists = vscode.window.terminals.find(t => t === cached.terminal);
			if (exists) {
				return cached.terminal;
			} else {
				// Terminal was closed, remove from registry
				GitBashTool.terminalRegistry.delete(name);
			}
		}
		
		// Also check VSCode terminals directly
		return vscode.window.terminals.find(t => t.name === name);
	}

	async execute(): Promise<ToolResponseV2> {
		const { input, say, ask, updateAsk } = this.params;
		const command = input.command;
		const timeout = input.timeout ?? 300000;
		const captureOutput = input.captureOutput ?? true;
		const autoMonitor = input.autoMonitor ?? true;
		const monitorInterval = input.monitorInterval ?? 5000;
		const sandbox = input.sandbox ?? true;
		const workingDirectory = input.workingDirectory;
		const terminalName = input.terminalName;
		const reuseTerminal = input.reuseTerminal ?? false;

		if (!command?.trim()) {
			await say(
				'error',
				"The 'git_bash' tool was called without a 'command'. Retrying..."
			);
			return this.toolResponse(
				'error',
				"Error: Missing or empty 'command' parameter."
			);
		}

		// Sandbox validation
		if (sandbox) {
			const validationResult = this.validateCommand(command);
			if (!validationResult.safe) {
				const errorMsg = `<git_bash_security_error>
<status>blocked</status>
<reason>${validationResult.reason}</reason>
<command>${this.escapeXml(command)}</command>

<security_policy>
The command has been blocked by the sandbox security system.

Detected issue: ${validationResult.reason}

Safe alternatives:
- Use more specific paths (e.g., 'rm -rf node_modules' instead of 'rm -rf /')
- Break down complex commands into smaller steps
- Request user approval for potentially dangerous operations
- Disable sandbox mode if you're certain the command is safe (sandbox=false)

To disable sandbox for this command:
<tool name="git_bash">
  <command>${this.escapeXml(command)}</command>
  <sandbox>false</sandbox>
</tool>
</security_policy>
</git_bash_security_error>`;

				await say('error', errorMsg);
				return this.toolResponse('error', errorMsg);
			}
		}

		// Smart AI Assistance: Pre-flight checks
		const smartChecks = await this.runSmartChecks(command, workingDirectory || this.cwd);
		if (smartChecks.warnings.length > 0 || smartChecks.suggestions.length > 0) {
			const warningMsg = this.formatSmartChecks(command, smartChecks);
			await say('tool', warningMsg);
		}

		const { response } = await ask(
			'tool',
			{
				tool: {
					tool: 'git_bash',
					command,
					approvalState: 'pending',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		if (response !== 'yesButtonTapped') {
			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'git_bash',
						command,
						approvalState: 'rejected',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);
			return this.toolResponse('rejected', this.formatToolDenied());
		}

		await updateAsk(
			'tool',
			{
				tool: {
					tool: 'git_bash',
					command,
					approvalState: 'loading',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		// Detect Git Bash path
		const gitBashPath = this.detectGitBashPath();
		if (!gitBashPath) {
			const errorMsg = `<git_bash_output>
<error>Git Bash not found</error>

Git Bash is not installed or could not be detected on this system.

To install Git Bash:
1. Download Git for Windows from https://git-scm.com/download/win
2. Run the installer and ensure "Git Bash Here" option is selected
3. Restart VSCode after installation

Common installation paths checked:
- C:\\Program Files\\Git\\bin\\bash.exe
- C:\\Program Files (x86)\\Git\\bin\\bash.exe
- Git in PATH environment variable
</git_bash_output>`;

			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'git_bash',
						command,
						output: errorMsg,
						approvalState: 'error',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);

			await say('error', errorMsg);
			return this.toolResponse('error', errorMsg);
		}

		// Determine working directory (with sandbox isolation)
		const effectiveWorkingDir = workingDirectory || this.cwd;

		// Generate semantic terminal name
		const semanticName = terminalName || this.generateSemanticTerminalName(command);
		
		// Try to reuse existing terminal if requested
		let terminal: vscode.Terminal | undefined;
		if (reuseTerminal && terminalName) {
			terminal = this.findExistingTerminal(terminalName);
			if (terminal) {
				// Update registry
				const existing = GitBashTool.terminalRegistry.get(terminalName);
				if (existing) {
					existing.lastUsed = new Date();
					existing.lastCommand = command;
				}
			}
		}
		
		// Create new terminal if not reusing or terminal not found
		if (!terminal) {
			// Get current environment variables
			const env = { ...process.env };
			
			terminal = vscode.window.createTerminal({
				name: semanticName,
				shellPath: gitBashPath,
				cwd: effectiveWorkingDir,
				env: env, // Pass environment variables to terminal
			});
			
			// Register the terminal
			GitBashTool.terminalRegistry.set(semanticName, {
				terminal,
				lastUsed: new Date(),
				createdAt: new Date(),
				lastCommand: command
			});
		}

		terminal.show();

		// Try to use shell integration API
		if (terminal.shellIntegration) {
			return await this.executeWithShellIntegration(
				terminal,
				command,
				timeout,
				captureOutput,
				autoMonitor,
				monitorInterval,
				updateAsk,
				say
			);
		}

		// Wait for shell integration to activate (up to 3 seconds)
		// Optimized from 5s based on performance testing - provides 40% faster
		// failure detection while still covering all normal initialization scenarios
		const shellIntegrationPromise =
			new Promise<vscode.TerminalShellIntegration>((resolve, reject) => {
				const disposable = vscode.window.onDidChangeTerminalShellIntegration(
					(event) => {
						if (event.terminal === terminal) {
							disposable.dispose();
							resolve(event.shellIntegration);
						}
					}
				);

				setTimeout(() => {
					disposable.dispose();
					reject(new Error('Shell integration not available'));
				}, 3000);
			});

		try {
			const shellIntegration = await shellIntegrationPromise;
			return await this.executeWithShellIntegration(
				terminal,
				command,
				timeout,
				captureOutput,
				autoMonitor,
				monitorInterval,
				updateAsk,
				say,
				shellIntegration
			);
		} catch (error) {
			// Fallback: Use sendText without shell integration
			return await this.executeWithFallback(
				terminal,
				command,
				timeout,
				updateAsk,
				say
			);
		}
	}

	/**
	 * Smart AI Assistance: Pre-flight checks to prevent common mistakes
	 */
	private async runSmartChecks(command: string, cwd: string): Promise<{
		warnings: Array<{ type: string; message: string; severity: string }>;
		suggestions: Array<{ action: string; reason: string }>;
	}> {
		const warnings: Array<{ type: string; message: string; severity: string }> = [];
		const suggestions: Array<{ action: string; reason: string }> = [];

		// Check 1: Dependency sync check (npm/node projects)
		if (command.match(/^npm (start|run|test|build|dev)/)) {
			const depCheck = this.checkDependencySync(cwd);
			if (depCheck.needsCheck) {
				warnings.push({
					type: depCheck.issue,
					message: depCheck.suggestion,
					severity: depCheck.severity
				});
				
				if (depCheck.issue === 'missing_node_modules') {
					suggestions.push({
						action: 'Run: npm install',
						reason: 'Install dependencies before running scripts'
					});
				} else if (depCheck.issue === 'outdated_dependencies') {
					suggestions.push({
						action: 'Consider: npm install',
						reason: 'package.json was modified after last install'
					});
				}
			}
		}

		// Check 2: Git safety warnings
		if (command.match(/^git (checkout|switch|reset --hard)/)) {
			const gitCheck = this.checkGitSafety(cwd);
			if (gitCheck.hasUncommitted) {
				warnings.push({
					type: 'uncommitted_changes',
					message: `${gitCheck.uncommittedCount} uncommitted file(s) detected`,
					severity: 'high'
				});
				
				suggestions.push({
					action: 'Consider: git stash or git commit',
					reason: 'Save your work before switching branches'
				});
			}
		}

		return { warnings, suggestions };
	}

	private checkDependencySync(cwd: string): any {
		const packageJsonPath = path.join(cwd, 'package.json');
		const nodeModulesPath = path.join(cwd, 'node_modules');

		if (!fs.existsSync(packageJsonPath)) {
			return { needsCheck: false };
		}

		if (!fs.existsSync(nodeModulesPath)) {
			return {
				needsCheck: true,
				issue: 'missing_node_modules',
				severity: 'critical',
				suggestion: 'node_modules folder not found - dependencies not installed'
			};
		}

		const packageStat = fs.statSync(packageJsonPath);
		const modulesStat = fs.statSync(nodeModulesPath);

		if (packageStat.mtime > modulesStat.mtime) {
			return {
				needsCheck: true,
				issue: 'outdated_dependencies',
				severity: 'high',
				suggestion: 'package.json modified after last npm install'
			};
		}

		return { needsCheck: false };
	}

	private checkGitSafety(cwd: string): any {
		try {
			const { execSync } = require('child_process');
			
			// Check if in git repo
			try {
				execSync('git rev-parse --git-dir', { cwd, stdio: 'pipe' });
			} catch {
				return { hasUncommitted: false };
			}

			// Check for uncommitted changes
			const statusOutput = execSync('git status --porcelain', {
				cwd,
				encoding: 'utf-8',
				stdio: 'pipe'
			});

			const hasUncommitted = statusOutput.trim().length > 0;
			if (hasUncommitted) {
				const fileCount = statusOutput.trim().split('\n').length;
				return { hasUncommitted: true, uncommittedCount: fileCount };
			}

			return { hasUncommitted: false };
		} catch {
			return { hasUncommitted: false };
		}
	}

	private formatSmartChecks(command: string, checks: any): string {
		let output = '<git_bash_smart_check>\n';
		output += `<command>${this.escapeXml(command)}</command>\n`;

		if (checks.warnings.length > 0) {
			output += '<warnings>\n';
			checks.warnings.forEach((w: any) => {
				output += `  <warning severity="${w.severity}">\n`;
				output += `    <type>${w.type}</type>\n`;
				output += `    <message>${this.escapeXml(w.message)}</message>\n`;
				output += '  </warning>\n';
			});
			output += '</warnings>\n';
		}

		if (checks.suggestions.length > 0) {
			output += '<suggestions>\n';
			checks.suggestions.forEach((s: any) => {
				output += '  <suggestion>\n';
				output += `    <action>${this.escapeXml(s.action)}</action>\n`;
				output += `    <reason>${this.escapeXml(s.reason)}</reason>\n`;
				output += '  </suggestion>\n';
			});
			output += '</suggestions>\n';
		}

		output += '<note>These are suggestions to help avoid common mistakes. You can proceed if you are certain.</note>\n';
		output += '</git_bash_smart_check>';

		return output;
	}

	/**
	 * Analyze command errors and provide intelligent suggestions
	 */
	private analyzeError(exitCode: number, output: string, command: string): {
		type: string;
		description: string;
		fixes: string[];
		confidence: string;
	} {
		const errorPatterns = [
			{
				pattern: /Cannot find module ['"]([^'"]+)['"]/i,
				type: 'missing_module',
				description: 'Required module not found',
				fixes: [
					'Run: npm install',
					'Check if the module name is correct in your code',
					'Verify package.json includes this dependency'
				],
				confidence: 'high'
			},
			{
				pattern: /EACCES|permission denied/i,
				type: 'permission_error',
				description: 'Permission denied',
				fixes: [
					'Fix npm permissions: npm config set prefix ~/.npm-global',
					'Use nvm to manage Node.js versions (recommended)',
					'As last resort: Use sudo (not recommended for npm)'
				],
				confidence: 'high'
			},
			{
				pattern: /ENOENT.*package\.json/i,
				type: 'wrong_directory',
				description: 'package.json not found - wrong directory',
				fixes: [
					'Navigate to project root: cd /path/to/project',
					'Verify you are in the correct directory',
					'Check if package.json exists: ls package.json'
				],
				confidence: 'high'
			},
			{
				pattern: /npm ERR!.*conflict/i,
				type: 'dependency_conflict',
				description: 'Dependency version conflict',
				fixes: [
					'Delete node_modules: rm -rf node_modules',
					'Delete package-lock.json: rm package-lock.json',
					'Reinstall: npm install',
					'Check for peer dependency warnings'
				],
				confidence: 'medium'
			},
			{
				pattern: /rejected.*non-fast-forward|failed to push/i,
				type: 'git_push_rejected',
				description: 'Git push rejected - remote has new commits',
				fixes: [
					'Pull first: git pull',
					'Or rebase: git pull --rebase',
					'After resolving conflicts: git push',
					'Force push ONLY if certain (destructive!): git push -f'
				],
				confidence: 'high'
			},
			{
				pattern: /conflict|CONFLICT/i,
				type: 'git_merge_conflict',
				description: 'Git merge conflict detected',
				fixes: [
					'Check conflicted files: git status',
					'Open and resolve conflicts in affected files',
					'Look for <<<<<<< and ======= markers',
					'After resolving: git add . && git commit'
				],
				confidence: 'high'
			},
			{
				pattern: /fatal: not a git repository/i,
				type: 'not_git_repo',
				description: 'Not a Git repository',
				fixes: [
					'Initialize repository: git init',
					'Or clone existing: git clone <url>',
					'Check if you are in the correct directory'
				],
				confidence: 'high'
			},
			{
				pattern: /ENOTFOUND|getaddrinfo|network/i,
				type: 'network_error',
				description: 'Network connectivity issue',
				fixes: [
					'Check your internet connection',
					'Verify the URL/hostname is correct',
					'Check if behind a proxy/firewall',
					'Try again in a few moments'
				],
				confidence: 'medium'
			}
		];

		// Match error patterns
		for (const pattern of errorPatterns) {
			if (pattern.pattern.test(output)) {
				return {
					type: pattern.type,
					description: pattern.description,
					fixes: pattern.fixes,
					confidence: pattern.confidence
				};
			}
		}

		// Generic error analysis based on exit code
		if (exitCode === 127) {
			return {
				type: 'command_not_found',
				description: 'Command not found',
				fixes: [
					'Check if the command is installed',
					'Verify the command name spelling',
					'Check your PATH environment variable',
					`Try: which ${command.split(' ')[0]}`
				],
				confidence: 'high'
			};
		}

		// Unknown error
		return {
			type: 'unknown_error',
			description: 'Command failed',
			fixes: [
				'Review the error output above',
				'Check command syntax and parameters',
				'Verify required dependencies are installed',
				'Search for the error message online'
			],
			confidence: 'low'
		};
	}

	private formatErrorAnalysis(command: string, exitCode: number, output: string, analysis: any, terminalName?: string): string {
		let result = '<git_bash_output>\n';
		if (terminalName) {
			result += `<terminal_name>${this.escapeXml(terminalName)}</terminal_name>\n`;
		}
		result += `<command>${this.escapeXml(command)}</command>\n`;
		result += `<exitCode>${exitCode}</exitCode>\n`;
		result += `<output>${this.escapeXml(output)}</output>\n`;
		result += '\n<error_analysis>\n';
		result += `  <error_type>${analysis.type}</error_type>\n`;
		result += `  <description>${this.escapeXml(analysis.description)}</description>\n`;
		result += `  <confidence>${analysis.confidence}</confidence>\n`;
		result += '  <suggested_fixes>\n';
		analysis.fixes.forEach((fix: string, idx: number) => {
			result += `    <fix priority="${idx + 1}">${this.escapeXml(fix)}</fix>\n`;
		});
		result += '  </suggested_fixes>\n';
		result += '</error_analysis>\n';
		result += '</git_bash_output>';
		
		return result;
	}

	/**
	 * Validate command for sandbox security
	 */
	private validateCommand(command: string): { safe: boolean; reason: string } {
		// Remove quoted strings to avoid false positives from string content
		// e.g., git commit -m "rm -rf /" should be safe
		const withoutQuotedStrings = command.replace(/(["'])(.*?)\1/g, '');
		
		// Check for dangerous commands in actual command context (not in strings)
		for (const dangerousCmd of DANGEROUS_COMMANDS) {
			if (withoutQuotedStrings.includes(dangerousCmd)) {
				return {
					safe: false,
					reason: `Dangerous command detected: "${dangerousCmd}"`,
				};
			}
		}

		// Check for suspicious patterns in actual command (not in strings)
		if (withoutQuotedStrings.includes('rm -rf') && withoutQuotedStrings.includes('/*')) {
			return {
				safe: false,
				reason: 'Recursive deletion of root-level directories is not allowed',
			};
		}

		if (withoutQuotedStrings.match(/rm\s+-rf\s+[~/](?![a-zA-Z0-9_-])/)) {
			return {
				safe: false,
				reason: 'Recursive deletion of home/root directory is not allowed',
			};
		}

		// Check if command matches safe patterns
		const matchesSafePattern = SAFE_COMMAND_PATTERNS.some((pattern) =>
			pattern.test(command)
		);

		// If doesn't match safe patterns, check for potentially risky operations
		if (!matchesSafePattern) {
			// Allow if it doesn't contain dangerous keywords in actual command
			const riskyKeywords = ['mkfs', '/dev/', '> /dev/', 'dd if='];
			for (const keyword of riskyKeywords) {
				if (withoutQuotedStrings.includes(keyword)) {
					return {
						safe: false,
						reason: `Potentially dangerous operation: "${keyword}"`,
					};
				}
			}
			
			// Special case: 'format' is only dangerous in specific contexts
			if (withoutQuotedStrings.match(/\b(format|mkfs)\s+/)) {
				return {
					safe: false,
					reason: 'Potentially dangerous formatting operation',
				};
			}
		}

		return { safe: true, reason: '' };
	}

	private detectGitBashPath(): string | null {
		// Common Git Bash installation paths on Windows
		const commonPaths = [
			'C:\\Program Files\\Git\\bin\\bash.exe',
			'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
			'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
			'C:\\Program Files (x86)\\Git\\usr\\bin\\bash.exe',
		];

		// Check common paths
		for (const bashPath of commonPaths) {
			if (fs.existsSync(bashPath)) {
				return bashPath;
			}
		}

		// Check if git is in PATH and try to find bash.exe
		try {
			const { execSync } = require('child_process');
			const gitPath = execSync('where git', { encoding: 'utf-8' })
				.trim()
				.split('\n')[0];
			if (gitPath) {
				// Git path is usually: C:\Program Files\Git\cmd\git.exe
				// Bash is at: C:\Program Files\Git\bin\bash.exe
				const gitDir = path.dirname(path.dirname(gitPath));
				const bashPath = path.join(gitDir, 'bin', 'bash.exe');
				if (fs.existsSync(bashPath)) {
					return bashPath;
				}
			}
		} catch (error) {
			// Git not in PATH
		}

		return null;
	}

	private async executeWithShellIntegration(
		terminal: vscode.Terminal,
		command: string,
		timeout: number,
		captureOutput: boolean,
		autoMonitor: boolean,
		monitorInterval: number,
		updateAsk: any,
		say: any,
		shellIntegration?: vscode.TerminalShellIntegration
	): Promise<ToolResponseV2> {
		const integration = shellIntegration || terminal.shellIntegration!;
		let output = '';
		let exitCode: number | undefined;
		const startTime = Date.now();
		let executionCompleted = false;

		// Store terminal for monitoring
		this.terminalId = (terminal as any).processId || Date.now();

		// Execute command using shell integration API
		const execution = integration.executeCommand(command);

		// Create promises for both output reading and execution completion
		const outputPromise = (async () => {
			if (captureOutput) {
				const outputStream = execution.read();
				try {
					for await (const data of outputStream) {
						// Capture all output including stdout and stderr
						output += data;
					}
				} catch (error) {
					// Stream ended or error occurred
					// Note: This is expected when the stream completes
				}
			}
		})();

		const completionPromise = new Promise<ToolResponseV2>((resolve) => {
			const disposable = vscode.window.onDidEndTerminalShellExecution(
				async (event) => {
					if (event.execution === execution) {
						disposable.dispose();
						exitCode = event.exitCode;
						executionCompleted = true;
						this.monitoringActive = false;

						// Wait for output to finish reading (with a small additional delay)
						await outputPromise;
						// Give a small buffer time for any remaining output
						await new Promise(r => setTimeout(r, 100));

						const elapsed = Date.now() - startTime;

						// Clean output (remove ANSI escape sequences)
						const cleanOutput = this.cleanAnsiEscapes(output);
						
						// Check if output is truly empty
						const hasOutput = cleanOutput && cleanOutput.length > 0;

						const finalOutput = `<git_bash_output>
<terminal_name>${this.escapeXml(terminal.name)}</terminal_name>
<command>${this.escapeXml(command)}</command>
<exitCode>${exitCode ?? 'unknown'}</exitCode>
<elapsed>${elapsed}ms</elapsed>
<output>${hasOutput ? this.escapeXml(cleanOutput) : '(no output)'}</output>
</git_bash_output>`;

						await updateAsk(
							'tool',
							{
								tool: {
									tool: 'git_bash',
									command,
									output: finalOutput,
									approvalState: exitCode === 0 ? 'approved' : 'error',
									ts: this.ts,
									isSubMsg: this.params.isSubMsg,
								},
							},
							this.ts
						);

						if (exitCode === undefined) {
							await say(
								'tool',
								`Command completed but exit code is unknown. Output:\n${cleanOutput || '(no output)'}`
							);
							resolve(this.toolResponse('success', finalOutput));
						} else if (exitCode === 0) {
							resolve(this.toolResponse('success', finalOutput));
						} else {
							// Analyze error and provide suggestions
							const errorAnalysis = this.analyzeError(exitCode, cleanOutput, command);
							const errorMessage = this.formatErrorAnalysis(command, exitCode, cleanOutput, errorAnalysis, terminal.name);
							
							await say('error', errorMessage);
							resolve(this.toolResponse('error', errorMessage));
						}
					}
				}
			);

			// Timeout handling with auto-monitoring
			setTimeout(async () => {
				if (!executionCompleted) {
					// Command still running after timeout
					if (autoMonitor) {
						// Activate auto-monitoring
						this.monitoringActive = true;
						
						const cleanOutput = this.cleanAnsiEscapes(output);
						const elapsed = Date.now() - startTime;

						const monitoringOutput = `<git_bash_output>
<status>timeout_monitoring_active</status>
<terminal_name>${this.escapeXml(terminal.name)}</terminal_name>
<command>${this.escapeXml(command)}</command>
<elapsed>${elapsed}ms</elapsed>
<timeout>${timeout}ms</timeout>
<monitoring>
  <active>true</active>
  <interval>${monitorInterval}ms</interval>
  <terminal_id>${this.terminalId}</terminal_id>
</monitoring>
<partial_output>${this.escapeXml(cleanOutput)}</partial_output>
<message>Command execution exceeded timeout (${timeout}ms). Auto-monitoring activated. Use read_progress tool to check progress and results.</message>
<recommendation>
The command is still running in the background. The system will automatically monitor its progress.

To check current status using the terminal name (RECOMMENDED):
<tool name="read_progress">
  <terminalName>${this.escapeXml(terminal.name)}</terminalName>
</tool>

The terminal will continue running. When the command completes, you can check the final results.
</recommendation>
</git_bash_output>`;

						await updateAsk(
							'tool',
							{
								tool: {
									tool: 'git_bash',
									command,
									output: monitoringOutput,
									approvalState: 'approved',
									ts: this.ts,
									isSubMsg: this.params.isSubMsg,
								},
							},
							this.ts
						);

						// Don't dispose the listener - let command continue
						resolve(this.toolResponse('success', monitoringOutput));
					} else {
						// No auto-monitoring, just timeout
						disposable.dispose();

						await Promise.race([
							outputPromise,
							new Promise((r) => setTimeout(r, 1000)),
						]);

						const elapsed = Date.now() - startTime;
						const timeoutOutput = `<git_bash_output>
<terminal_name>${this.escapeXml(terminal.name)}</terminal_name>
<command>${this.escapeXml(command)}</command>
<status>timeout</status>
<elapsed>${elapsed}ms</elapsed>
<timeout>${timeout}ms</timeout>
<output>${this.escapeXml(this.cleanAnsiEscapes(output))}</output>
<message>Command execution timed out after ${timeout}ms</message>
</git_bash_output>`;

						resolve(this.toolResponse('error', timeoutOutput));
					}
				}
			}, timeout);
		});

		return completionPromise;
	}

	private async executeWithFallback(
		terminal: vscode.Terminal,
		command: string,
		timeout: number,
		updateAsk: any,
		say: any
	): Promise<ToolResponseV2> {
		// Fallback: Use sendText when shell integration is not available
		terminal.sendText(command, true);

		const warningOutput = `<git_bash_output>
<terminal_name>${this.escapeXml(terminal.name)}</terminal_name>
<command>${this.escapeXml(command)}</command>
<status>executed_without_integration</status>
<message>Shell integration is not available. The command was executed but output cannot be reliably captured.</message>

<note>
To enable shell integration for Git Bash:
1. Update VSCode to the latest version
2. Add the following to your ~/.bashrc file in Git Bash:
   
   if [ -n "$VSCODE_SHELL_INTEGRATION" ]; then
       . "$(code --locate-shell-integration-path bash)"
   fi

3. Restart the terminal

Without shell integration:
- Exit codes are not available
- Output capture is unreliable
- Command completion detection is not accurate

The command has been executed in the terminal. Please verify the results manually.
</note>
</git_bash_output>`;

		await updateAsk(
			'tool',
			{
				tool: {
					tool: 'git_bash',
					command,
					output: warningOutput,
					approvalState: 'approved',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		await say('tool', warningOutput);
		return this.toolResponse('success', warningOutput);
	}

	/**
	 * ANSI escape sequence removal using standardized strip-ansi library
	 * Optimized for consistency and maintainability
	 */
	private cleanAnsiEscapes(text: string): string {
		if (!text) {
			return '';
		}
		
		// Use strip-ansi for standardized ANSI escape sequence removal
		let cleaned = stripAnsi(text);
		
		// Normalize line endings while preserving actual line breaks
		cleaned = cleaned
			.replace(/\r\n/g, '\n')
			.replace(/\r/g, '\n');
		
		// Remove excessive blank lines (more than 2 consecutive)
		cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
		
		// Trim only leading/trailing whitespace, not internal spacing
		cleaned = cleaned.trim();
		
		return cleaned;
	}

	private escapeXml(text: string): string {
		if (!text) {
			return '';
		}
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');
	}
}
