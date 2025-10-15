import { BaseAgentTool } from '../base-agent.tool';
import { TerminalToolParams } from '../schema/terminal';
import { ToolResponseV2 } from '../../types';
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { getGlobalAnalyzer } from './read-progress.tool';
import stripAnsi from 'strip-ansi';

/**
 * Multi-in-One Terminal Tool
 * 
 * Unified terminal system supporting all VS Code panel features:
 * - Terminal: Standard terminal execution (PowerShell, Bash, CMD, Git Bash, etc.)
 * - Debug Console: Debug expression evaluation and logging
 * - Output: Output channels for structured logging
 * - Problems: Diagnostic problems management
 * - Ports: Port forwarding and management
 * - Output Analyzer: Intelligent output search and analysis
 * 
 * Supports multiple terminal types:
 * - Integrated Terminal
 * - JavaScript Debug Terminal
 * - Python Debug Terminal
 * - Task Terminal
 * - External Terminal
 */
export class TerminalTool extends BaseAgentTool<TerminalToolParams> {
	// Terminal ID counter for generating semantic names
	private static terminalCounter = 0;
	
	// Shell Integration support cache - avoid waiting 3s every time
	private static shellIntegrationCache = new Map<string, {
		supported: boolean;
		lastChecked: Date;
		shell: string;
	}>();
	
	private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
	
	// Terminal state tracking for AI visibility
	private static terminalStateRegistry = new Map<string, {
		name: string;
		status: 'idle' | 'running' | 'completed' | 'error';
		lastCommand?: string;
		lastExitCode?: number;
		createdAt: Date;
		lastActiveAt: Date;
	}>();
	
	/**
	 * Analyze error output and provide intelligent suggestions
	 */
	private analyzeTerminalError(exitCode: number, output: string, command: string): {
		errorType: string;
		category: string;
		suggestion: string;
		relatedCommands: string[];
	} {
		const lowerOutput = output.toLowerCase();
		const lowerCommand = command.toLowerCase();
		
		// Module/Package not found
		if (lowerOutput.includes('cannot find module') || lowerOutput.includes('module not found') || 
		    lowerOutput.includes('modulenotfounderror')) {
			const moduleMatch = output.match(/Cannot find module ['"]([^'"]+)['"]/i);
			const moduleName = moduleMatch ? moduleMatch[1] : 'unknown';
			return {
				errorType: 'MODULE_NOT_FOUND',
				category: 'Dependency Error',
				suggestion: `Install the missing module: npm install ${moduleName}`,
				relatedCommands: [`npm install ${moduleName}`, 'npm install', 'npm ci']
			};
		}
		
		// Permission denied
		if (lowerOutput.includes('eacces') || lowerOutput.includes('permission denied') || 
		    lowerOutput.includes('access is denied')) {
			const needsSudo = !lowerCommand.startsWith('sudo');
			return {
				errorType: 'PERMISSION_DENIED',
				category: 'Permission Error',
				suggestion: needsSudo 
					? 'Run with elevated permissions (sudo on Unix, Run as Administrator on Windows)'
					: 'Check file/directory permissions or ownership',
				relatedCommands: needsSudo ? [`sudo ${command}`, 'sudo -i'] : ['chmod', 'chown']
			};
		}
		
		// Port already in use
		if (lowerOutput.includes('eaddrinuse') || lowerOutput.includes('port') && lowerOutput.includes('already in use')) {
			const portMatch = output.match(/port (\d+)/i);
			const port = portMatch ? portMatch[1] : 'unknown';
			return {
				errorType: 'PORT_IN_USE',
				category: 'Network Error',
				suggestion: `Port ${port} is already in use. Kill the process or use a different port.`,
				relatedCommands: [
					'netstat -ano | findstr :' + port,  // Windows
					'lsof -ti:' + port,  // Unix
					'npx kill-port ' + port
				]
			};
		}
		
		// File/Directory not found
		if (lowerOutput.includes('enoent') || lowerOutput.includes('no such file or directory') || 
		    lowerOutput.includes('cannot find the path')) {
			return {
				errorType: 'FILE_NOT_FOUND',
				category: 'File System Error',
				suggestion: 'Check if the file/directory path is correct and exists',
				relatedCommands: ['ls -la', 'dir', 'pwd', 'Get-Location']
			};
		}
		
		// Git errors
		if (lowerOutput.includes('not a git repository')) {
			return {
				errorType: 'NOT_GIT_REPO',
				category: 'Git Error',
				suggestion: 'Initialize a git repository first',
				relatedCommands: ['git init', 'git clone <url>']
			};
		}
		
		if (lowerOutput.includes('merge conflict') || lowerOutput.includes('conflict')) {
			return {
				errorType: 'GIT_CONFLICT',
				category: 'Git Error',
				suggestion: 'Resolve merge conflicts in affected files',
				relatedCommands: ['git status', 'git diff', 'git mergetool', 'git add <file>', 'git commit']
			};
		}
		
		if (lowerOutput.includes('rejected') && lowerOutput.includes('push')) {
			return {
				errorType: 'GIT_PUSH_REJECTED',
				category: 'Git Error',
				suggestion: 'Pull latest changes before pushing',
				relatedCommands: ['git pull', 'git pull --rebase', 'git fetch']
			};
		}
		
		// npm/yarn errors
		if (lowerOutput.includes('npm err!') || lowerOutput.includes('npm error')) {
			if (lowerOutput.includes('missing script')) {
				return {
					errorType: 'NPM_SCRIPT_NOT_FOUND',
					category: 'NPM Error',
					suggestion: 'Check package.json scripts section for available commands',
					relatedCommands: ['npm run', 'cat package.json']
				};
			}
			return {
				errorType: 'NPM_ERROR',
				category: 'NPM Error',
				suggestion: 'Check npm error message. Try: npm cache clean --force, then npm install',
				relatedCommands: ['npm cache clean --force', 'npm install', 'rm -rf node_modules package-lock.json']
			};
		}
		
		// Syntax errors
		if (lowerOutput.includes('syntaxerror') || lowerOutput.includes('unexpected token')) {
			return {
				errorType: 'SYNTAX_ERROR',
				category: 'Code Error',
				suggestion: 'Fix syntax error in your code at the line indicated',
				relatedCommands: []
			};
		}
		
		// Command not found
		if (lowerOutput.includes('command not found') || lowerOutput.includes('is not recognized')) {
			const cmdMatch = command.match(/^(\S+)/);
			const cmd = cmdMatch ? cmdMatch[1] : '';
			return {
				errorType: 'COMMAND_NOT_FOUND',
				category: 'Shell Error',
				suggestion: `Command '${cmd}' not found. Check if it's installed or in PATH`,
				relatedCommands: ['which ' + cmd, 'where ' + cmd]
			};
		}
		
		// Generic error
		return {
			errorType: 'GENERIC_ERROR',
			category: 'Unknown Error',
			suggestion: 'Check the error output above for details',
			relatedCommands: []
		};
	}
	
	/**
	 * Generate AI-friendly semantic terminal name
	 */
	private generateSemanticTerminalName(command: string, shell: string, workingDir: string): string {
		// Increment counter
		TerminalTool.terminalCounter++;
		
		// Extract command name (first word)
		const commandName = command.trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9-]/g, '');
		
		// Get project name from working directory
		const projectName = path.basename(workingDir);
		
		// Generate semantic name based on command
		if (commandName) {
			// Examples: "npm-install", "git-status", "node-app"
			return `${commandName}-${TerminalTool.terminalCounter}`;
		}
		
		// Fallback: project-based name
		return `${projectName}-${shell}-${TerminalTool.terminalCounter}`;
	}
	
	/**
	 * Find existing terminal by name for reuse
	 */
	private findExistingTerminal(name: string): vscode.Terminal | undefined {
		// Check VSCode's active terminals
		return vscode.window.terminals.find(t => t.name === name);
	}
	
	/**
	 * Register a terminal in the state registry
	 */
	private registerTerminalState(name: string, status: 'idle' | 'running' | 'completed' | 'error', command?: string, exitCode?: number): void {
		const now = new Date();
		const existing = TerminalTool.terminalStateRegistry.get(name);
		
		TerminalTool.terminalStateRegistry.set(name, {
			name,
			status,
			lastCommand: command || existing?.lastCommand,
			lastExitCode: exitCode !== undefined ? exitCode : existing?.lastExitCode,
			createdAt: existing?.createdAt || now,
			lastActiveAt: now
		});
	}
	
	/**
	 * List all terminals with their current status
	 */
	private async listAllTerminals(): Promise<ToolResponseV2> {
		const terminals = vscode.window.terminals;
		const terminalList: Array<{
			name: string;
			processId: number | undefined;
			status: string;
			lastCommand?: string;
			lastExitCode?: number;
			createdAt?: string;
			lastActiveAt?: string;
		}> = [];
		
	// Get info from VSCode terminals
	for (const terminal of terminals) {
		const state = TerminalTool.terminalStateRegistry.get(terminal.name);
		const processId = await terminal.processId;
		
		terminalList.push({
			name: terminal.name,
			processId: processId,
			status: state?.status || 'unknown',
			lastCommand: state?.lastCommand,
			lastExitCode: state?.lastExitCode,
			createdAt: state?.createdAt?.toISOString(),
			lastActiveAt: state?.lastActiveAt?.toISOString()
		});
	}
		
		// Build XML output
		let xmlOutput = '<terminals_list>\n';
		xmlOutput += `<total_count>${terminalList.length}</total_count>\n`;
		xmlOutput += '<terminals>\n';
		
		for (const term of terminalList) {
			xmlOutput += '  <terminal>\n';
			xmlOutput += `    <name>${this.escapeXml(term.name)}</name>\n`;
			xmlOutput += `    <process_id>${term.processId || 'unknown'}</process_id>\n`;
			xmlOutput += `    <status>${term.status}</status>\n`;
			if (term.lastCommand) {
				xmlOutput += `    <last_command>${this.escapeXml(term.lastCommand)}</last_command>\n`;
			}
			if (term.lastExitCode !== undefined) {
				xmlOutput += `    <last_exit_code>${term.lastExitCode}</last_exit_code>\n`;
			}
			if (term.createdAt) {
				xmlOutput += `    <created_at>${term.createdAt}</created_at>\n`;
			}
			if (term.lastActiveAt) {
				xmlOutput += `    <last_active_at>${term.lastActiveAt}</last_active_at>\n`;
			}
			xmlOutput += '  </terminal>\n';
		}
		
		xmlOutput += '</terminals>\n';
		xmlOutput += '</terminals_list>';
		
		return this.toolResponse('success', xmlOutput);
	}

	async execute(): Promise<ToolResponseV2> {
		const { input, say, ask, updateAsk } = this.params;
		const panelType = input.panelType || 'terminal';

		// Route to appropriate handler based on panel type
		switch (panelType) {
			case 'terminal':
				return this.executeTerminal();
			case 'debug-console':
				return this.executeDebugConsole();
			case 'output':
				return this.executeOutputChannel();
			case 'problems':
				return this.executeProblems();
			case 'ports':
				return this.executePorts();
			case 'output-analyzer':
				return this.executeOutputAnalyzer();
			default:
				return this.toolResponse('error', `<error>Unknown panel type: ${panelType}</error>`);
		}
	}

	// ============================================================================
	// Terminal Execution
	// ============================================================================

	private async executeTerminal(): Promise<ToolResponseV2> {
		const { input, say, ask, updateAsk } = this.params;
		
		// Check if this is a list-terminals action
		if (input.action === 'list-terminals') {
			return this.listAllTerminals();
		}
		
		// Support both new and legacy parameter names
		const command = input.command;
		const shell = input.shell || 'auto';
		const workingDirectory = input.workingDirectory || input.cwd;
		const executionTimeout = input.executionTimeout || input.timeout || 30000;
		const environmentVariables = input.environmentVariables || input.env;
		const shouldCaptureOutput = input.shouldCaptureOutput ?? input.captureOutput ?? true;
		const isInteractive = input.isInteractive ?? input.interactive ?? false;
		const terminalName = input.terminalName;
		const shouldReuseTerminal = input.shouldReuseTerminal ?? input.reuseTerminal ?? false;
		const shouldAutoCloseTerminal = input.shouldAutoCloseTerminal ?? false;
		const terminalType = input.terminalType || 'integrated-terminal';
		const terminalIcon = input.terminalIcon;
		const terminalColor = input.terminalColor;
		const terminalLocation = input.terminalLocation;
		const shouldShowTerminal = input.shouldShowTerminal ?? input.shouldShowPanel ?? true;
		const shouldPreserveFocus = input.shouldPreserveFocus ?? false;
		const shellArguments = input.shellArguments;
		const strictEnvironmentVariables = input.strictEnvironmentVariables ?? false;
		const debugConfiguration = input.debugConfiguration;
		const shouldPreFilterOutput = input.shouldPreFilterOutput;

		if (!command) {
			return this.toolResponse('error', '<error>Command is required for terminal execution</error>');
		}

		// Ask for approval
		const { response } = await ask(
			'tool',
			{
				tool: {
					tool: 'terminal',
					panelType: 'terminal',
					command,
					shell,
					workingDirectory,
					executionTimeout,
					terminalName,
					terminalType,
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
						tool: 'terminal',
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
					tool: 'terminal',
					command,
					approvalState: 'loading',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		try {
			// Detect shell if auto
			const detectedShell = shell === 'auto' ? await this.detectDefaultShell() : shell;

			// Get shell path
			const shellPath = await this.getShellPath(detectedShell);
			if (!shellPath) {
				const availableShells = await this.getAvailableShells();
				const errorDetails = `Shell '${detectedShell}' is not available on this system.\n\nAvailable shells: ${availableShells.join(', ')}`;
				const errorMsg = `<terminal_result>
<status>error</status>
<panelType>terminal</panelType>
<shell>${detectedShell}</shell>
<error>Shell '${detectedShell}' is not available on this system</error>
<available>${availableShells.join(', ')}</available>
</terminal_result>`;

				await updateAsk(
					'tool',
					{
						tool: {
							tool: 'terminal',
							command,
							output: errorMsg,
							approvalState: 'error',
							ts: this.ts,
							isSubMsg: this.params.isSubMsg,
						},
					},
					this.ts
				);

				await say('error', errorDetails);
				return this.toolResponse('error', errorMsg);
			}

			// Determine working directory
			const finalWorkingDirectory = workingDirectory || this.cwd;

			// Generate semantic terminal name
			const semanticName = terminalName || this.generateSemanticTerminalName(command, detectedShell, finalWorkingDirectory);
			
			// Try to reuse existing terminal if requested
			let terminal: vscode.Terminal | undefined;
			let isReusedTerminal = false;
			
			if (shouldReuseTerminal && terminalName) {
				terminal = this.findExistingTerminal(terminalName);
				if (terminal) {
					isReusedTerminal = true;
					// Update registry
					this.registerTerminalState(terminalName, 'running', command);
				}
			}
			
			// Create new terminal if not reusing or terminal not found
			if (!terminal) {
				// Build terminal options
				const terminalOptions: vscode.TerminalOptions = {
					name: semanticName,
					shellPath: shellPath,
					cwd: finalWorkingDirectory,
					env: strictEnvironmentVariables 
						? environmentVariables 
						: { ...process.env, ...environmentVariables },
					shellArgs: shellArguments,
					iconPath: terminalIcon ? new vscode.ThemeIcon(terminalIcon) : undefined,
					color: terminalColor ? new vscode.ThemeColor(terminalColor) : undefined,
					location: terminalLocation === 'editor' 
						? vscode.TerminalLocation.Editor 
						: terminalLocation === 'active'
						? vscode.TerminalLocation.Panel
						: vscode.TerminalLocation.Panel,
				};
				
				// Create terminal based on type
				if (terminalType === 'javascript-debug' && debugConfiguration?.type === 'node') {
					// Create JavaScript Debug Terminal
					terminal = vscode.window.createTerminal({
						...terminalOptions,
						name: terminalName || 'JavaScript Debug Terminal',
						iconPath: new vscode.ThemeIcon('debug'),
					});
				} else if (terminalType === 'python-debug' && debugConfiguration?.type === 'python') {
					// Create Python Debug Terminal
					terminal = vscode.window.createTerminal({
						...terminalOptions,
						name: terminalName || 'Python Debug Terminal',
						iconPath: new vscode.ThemeIcon('debug'),
					});
				} else {
					// Create standard terminal
					terminal = vscode.window.createTerminal(terminalOptions);
				}
				
				// Register new terminal
				this.registerTerminalState(semanticName, 'running', command);
			}

			if (shouldShowTerminal) {
				terminal.show(shouldPreserveFocus);
			}

			// Try to use shell integration API
			if (terminal.shellIntegration) {
				return await this.executeWithShellIntegration(
					terminal,
					command,
					detectedShell,
					executionTimeout,
					shouldCaptureOutput,
					shouldPreFilterOutput,
					updateAsk,
					say,
					shouldAutoCloseTerminal
				);
			}

			// Check Shell Integration cache first
			const cacheKey = `${detectedShell}-${shellPath}`;
			const cached = TerminalTool.shellIntegrationCache.get(cacheKey);
			const now = new Date();
			
			// If we know this shell doesn't support Shell Integration, skip waiting
			if (cached && !cached.supported) {
				const cacheAge = now.getTime() - cached.lastChecked.getTime();
				if (cacheAge < TerminalTool.CACHE_TTL_MS) {
					// Cache hit: known to not support, use fallback immediately
					return await this.executeWithFallback(
						terminal,
						command,
						detectedShell,
						updateAsk,
						say,
						'cached_not_supported'
					);
				}
			}

			// Wait for shell integration to activate (up to 3 seconds)
			// Optimized from 5s based on performance testing - provides 40% faster
			// failure detection while still covering all normal initialization scenarios
			const shellIntegrationPromise = new Promise<vscode.TerminalShellIntegration>((resolve, reject) => {
				const disposable = vscode.window.onDidChangeTerminalShellIntegration((event) => {
					if (event.terminal === terminal) {
						disposable.dispose();
						resolve(event.shellIntegration);
					}
				});

				setTimeout(() => {
					disposable.dispose();
					reject(new Error('Shell integration not available'));
				}, 3000);
			});

			try {
				const shellIntegration = await shellIntegrationPromise;
				
				// Cache success: this shell supports Shell Integration
				TerminalTool.shellIntegrationCache.set(cacheKey, {
					supported: true,
					lastChecked: now,
					shell: detectedShell
				});
				return await this.executeWithShellIntegration(
					terminal,
					command,
					detectedShell,
					executionTimeout,
					shouldCaptureOutput,
					shouldPreFilterOutput,
					updateAsk,
					say,
					shouldAutoCloseTerminal,
					shellIntegration
				);
			} catch (error) {
				// Cache failure: this shell does NOT support Shell Integration
				TerminalTool.shellIntegrationCache.set(cacheKey, {
					supported: false,
					lastChecked: now,
					shell: detectedShell
				});
				
				// Fallback: Use sendText without shell integration
				return await this.executeWithFallback(
					terminal,
					command,
					detectedShell,
					updateAsk,
					say,
					'timeout_after_3s'
				);
			}
		} catch (error) {
			const errorMsg = `<terminal_result>
<status>error</status>
<panelType>terminal</panelType>
<error>${this.escapeXml(error instanceof Error ? error.message : String(error))}</error>
</terminal_result>`;

			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'terminal',
						command,
						output: errorMsg,
						approvalState: 'error',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);

			await say('error', `Terminal execution failed: ${error instanceof Error ? error.message : String(error)}`);
			return this.toolResponse('error', errorMsg);
		}
	}

	// ============================================================================
	// Debug Console Execution
	// ============================================================================

	private async executeDebugConsole(): Promise<ToolResponseV2> {
		const { input, say, ask, updateAsk } = this.params;
		const action = input.debugConsoleAction || 'evaluate';
		const expression = input.expression;
		const message = input.message;
		const logLevel = input.logLevel || 'info';

		// Ask for approval
		const { response } = await ask(
			'tool',
			{
				tool: {
					tool: 'terminal',
					panelType: 'debug-console',
					action,
					expression,
					message,
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
						tool: 'terminal',
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
					tool: 'terminal',
					approvalState: 'loading',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		try {
			let result = '';

			switch (action) {
				case 'evaluate':
					if (!expression) {
						throw new Error('Expression is required for evaluate action');
					}
					result = await this.evaluateDebugExpression(expression, input);
					break;

				case 'log':
					if (!message) {
						throw new Error('Message is required for log action');
					}
					result = await this.logToDebugConsole(message, logLevel);
					break;

				case 'clear':
					result = await this.clearDebugConsole();
					break;

				case 'focus':
					result = await this.focusDebugConsole(input.shouldPreserveFocus ?? false);
					break;

				default:
					throw new Error(`Unknown debug console action: ${action}`);
			}

			const output = `<debug_console_result>
<status>success</status>
<action>${action}</action>
<result>${this.escapeXml(result)}</result>
</debug_console_result>`;

			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'terminal',
						output,
						approvalState: 'approved',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);

			return this.toolResponse('success', output);
		} catch (error) {
			const errorMsg = `<debug_console_result>
<status>error</status>
<action>${action}</action>
<error>${this.escapeXml(error instanceof Error ? error.message : String(error))}</error>
</debug_console_result>`;

			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'terminal',
						output: errorMsg,
						approvalState: 'error',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);

			await say('error', `Debug console operation failed: ${error instanceof Error ? error.message : String(error)}`);
			return this.toolResponse('error', errorMsg);
		}
	}

	// ============================================================================
	// Output Channel Execution
	// ============================================================================

	private async executeOutputChannel(): Promise<ToolResponseV2> {
		const { input, say, ask, updateAsk } = this.params;
		const action = input.outputChannelAction || 'writeLine';
		const channelName = input.channelName;
		const content = input.content;
		const channelType = input.channelType || 'standard';

		if (!channelName && action !== 'show') {
			return this.toolResponse('error', '<error>Channel name is required</error>');
		}

		// Ask for approval
		const { response } = await ask(
			'tool',
			{
				tool: {
					tool: 'terminal',
					panelType: 'output',
					action,
					channelName,
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
						tool: 'terminal',
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
					tool: 'terminal',
					approvalState: 'loading',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		try {
			let result = '';

			switch (action) {
				case 'create':
					result = await this.createOutputChannel(channelName!, channelType);
					break;

				case 'write':
					result = await this.writeToOutputChannel(channelName!, content || '', false);
					break;

				case 'writeLine':
					result = await this.writeToOutputChannel(channelName!, content || '', true);
					break;

				case 'append':
					result = await this.appendToOutputChannel(channelName!, content || '', false);
					break;

				case 'appendLine':
					result = await this.appendToOutputChannel(channelName!, content || '', true);
					break;

				case 'clear':
					result = await this.clearOutputChannel(channelName!);
					break;

				case 'show':
					result = await this.showOutputChannel(channelName, input.shouldPreserveFocus ?? true);
					break;

				case 'hide':
					result = await this.hideOutputChannel();
					break;

				case 'dispose':
					result = await this.disposeOutputChannel(channelName!);
					break;

				default:
					throw new Error(`Unknown output channel action: ${action}`);
			}

			// Analyze log content for AI-friendly classification
			let logAnalysis = '';
			if ((action === 'write' || action === 'writeLine' || action === 'append' || action === 'appendLine') && content) {
				const analysis = this.analyzeLogContent(content);
				logAnalysis = `
<log_analysis>
  <level>${analysis.level}</level>
  <category>${this.escapeXml(analysis.category)}</category>
  <has_error>${analysis.hasError}</has_error>
  <has_warning>${analysis.hasWarning}</has_warning>
  <key_terms>${analysis.keyTerms.map(t => this.escapeXml(t)).join(', ')}</key_terms>
${analysis.suggestions.length > 0 ? `  <suggestions>
${analysis.suggestions.map(s => `    <suggestion>${this.escapeXml(s)}</suggestion>`).join('\n')}
  </suggestions>` : ''}
</log_analysis>`;
			}
			
			const output = `<output_channel_result>
<status>success</status>
<action>${action}</action>
<channelName>${channelName || 'N/A'}</channelName>
<result>${this.escapeXml(result)}</result>${logAnalysis}
</output_channel_result>`;

			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'terminal',
						output,
						approvalState: 'approved',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);

			return this.toolResponse('success', output);
		} catch (error) {
			const errorMsg = `<output_channel_result>
<status>error</status>
<action>${action}</action>
<error>${this.escapeXml(error instanceof Error ? error.message : String(error))}</error>
</output_channel_result>`;

			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'terminal',
						output: errorMsg,
						approvalState: 'error',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);

			await say('error', `Output channel operation failed: ${error instanceof Error ? error.message : String(error)}`);
			return this.toolResponse('error', errorMsg);
		}
	}

	// ============================================================================
	// Problems Execution
	// ============================================================================

	private async executeProblems(): Promise<ToolResponseV2> {
		const { input, say, ask, updateAsk } = this.params;
		const action = input.problemsAction || 'show';
		const collectionName = input.collectionName;
		const filePath = input.filePath;

		// Ask for approval
		const { response } = await ask(
			'tool',
			{
				tool: {
					tool: 'terminal',
					panelType: 'problems',
					action,
					collectionName,
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
						tool: 'terminal',
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
					tool: 'terminal',
					approvalState: 'loading',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		try {
			let result = '';

			switch (action) {
				case 'add':
					if (!collectionName || !filePath || !input.problem) {
						throw new Error('Collection name, file path, and problem details are required');
					}
					result = await this.addProblem(collectionName, filePath, input.problem);
					break;

				case 'addMultiple':
					if (!collectionName || !input.problems) {
						throw new Error('Collection name and problems array are required');
					}
					result = await this.addMultipleProblems(collectionName, input.problems);
					break;

				case 'clear':
					if (!collectionName) {
						throw new Error('Collection name is required');
					}
					result = await this.clearProblems(collectionName);
					break;

				case 'clearFile':
					if (!collectionName || !filePath) {
						throw new Error('Collection name and file path are required');
					}
					result = await this.clearFileProblems(collectionName, filePath);
					break;

				case 'clearAll':
					if (!collectionName) {
						throw new Error('Collection name is required');
					}
					result = await this.clearAllProblems(collectionName);
					break;

				case 'show':
					result = await this.showProblems(input.shouldPreserveFocus ?? true);
					break;

				case 'get':
					result = await this.getProblems(collectionName, input.filterSeverity, input.filterSource);
					break;

				default:
					throw new Error(`Unknown problems action: ${action}`);
			}

			const output = `<problems_result>
<status>success</status>
<action>${action}</action>
<result>${this.escapeXml(result)}</result>
</problems_result>`;

			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'terminal',
						output,
						approvalState: 'approved',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);

			return this.toolResponse('success', output);
		} catch (error) {
			const errorMsg = `<problems_result>
<status>error</status>
<action>${action}</action>
<error>${this.escapeXml(error instanceof Error ? error.message : String(error))}</error>
</problems_result>`;

			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'terminal',
						output: errorMsg,
						approvalState: 'error',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);

			await say('error', `Problems operation failed: ${error instanceof Error ? error.message : String(error)}`);
			return this.toolResponse('error', errorMsg);
		}
	}

	// ============================================================================
	// Ports Execution
	// ============================================================================

	private async executePorts(): Promise<ToolResponseV2> {
		const { input, say, ask, updateAsk } = this.params;
		const action = input.portsAction || 'list';
		const portNumber = input.portNumber;

		// Ask for approval
		const { response } = await ask(
			'tool',
			{
				tool: {
					tool: 'terminal',
					panelType: 'ports',
					action,
					portNumber,
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
						tool: 'terminal',
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
					tool: 'terminal',
					approvalState: 'loading',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		try {
			let result = '';

			switch (action) {
				case 'forward':
					if (!input.localPort) {
						throw new Error('Local port is required for forward action');
					}
					result = await this.forwardPort(input);
					break;

				case 'stopForwarding':
					if (!portNumber) {
						throw new Error('Port number is required for stopForwarding action');
					}
					result = await this.stopForwardingPort(portNumber);
					break;

				case 'list':
					result = await this.listPorts(input.filterStatus, input.filterProtocol);
					break;

				case 'detect':
					if (!portNumber) {
						throw new Error('Port number is required for detect action');
					}
					result = await this.detectPort(portNumber, input.processName, input.portLabel);
					break;

				case 'openBrowser':
					if (!portNumber) {
						throw new Error('Port number is required for openBrowser action');
					}
					result = await this.openBrowserToPort(portNumber, input.urlPath);
					break;

				case 'openExternal':
					if (!portNumber) {
						throw new Error('Port number is required for openExternal action');
					}
					result = await this.openExternalToPort(portNumber, input.urlPath);
					break;

				case 'getAttribute':
					if (!portNumber || !input.attributeName) {
						throw new Error('Port number and attribute name are required');
					}
					result = await this.getPortAttribute(portNumber, input.attributeName);
					break;

				case 'setAttribute':
					if (!portNumber || !input.attributeName || !input.attributeValue) {
						throw new Error('Port number, attribute name, and value are required');
					}
					result = await this.setPortAttribute(portNumber, input.attributeName, input.attributeValue);
					break;

				default:
					throw new Error(`Unknown ports action: ${action}`);
			}

			const output = `<ports_result>
<status>success</status>
<action>${action}</action>
<result>${this.escapeXml(result)}</result>
</ports_result>`;

			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'terminal',
						output,
						approvalState: 'approved',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);

			return this.toolResponse('success', output);
		} catch (error) {
			const errorMsg = `<ports_result>
<status>error</status>
<action>${action}</action>
<error>${this.escapeXml(error instanceof Error ? error.message : String(error))}</error>
</ports_result>`;

			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'terminal',
						output: errorMsg,
						approvalState: 'error',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);

			await say('error', `Ports operation failed: ${error instanceof Error ? error.message : String(error)}`);
			return this.toolResponse('error', errorMsg);
		}
	}

	// ============================================================================
	// Terminal Helper Methods
	// ============================================================================

	/**
	 * Detect the default shell based on the operating system
	 */
	private async detectDefaultShell(): Promise<string> {
		const platform = os.platform();

		if (platform === 'win32') {
			// Windows: Check what's available in order of preference
			if (await this.getShellPath('powershell')) {
				return 'powershell';
			}
			if (await this.getShellPath('git-bash')) {
				return 'git-bash';
			}
			return 'cmd';
		} else if (platform === 'darwin' || platform === 'linux') {
			// Unix-like: check SHELL environment variable
			const shellPath = process.env.SHELL || '/bin/bash';
			const shellName = path.basename(shellPath);

			// Map common shells
			if (shellName.includes('zsh')) {return 'zsh';}
			if (shellName.includes('fish')) {return 'fish';}
			if (shellName.includes('bash')) {return 'bash';}
			return 'sh';
		}

		return 'bash'; // Default fallback
	}

	/**
	 * Enhanced shell path detection with dynamic resolution
	 */
	private async getShellPath(shell: string): Promise<string | null> {
		const platform = os.platform();

		if (platform === 'win32') {
			// Windows shells
			switch (shell) {
				case 'powershell':
					const pwshPath = await this.findExecutable('pwsh');
					if (pwshPath) {return pwshPath;}
					const psPath = await this.findExecutable('powershell');
					if (psPath) {return psPath;}
					return 'powershell';

				case 'powershell-core':
					return await this.findExecutable('pwsh');

				case 'cmd':
					return 'cmd.exe';

				case 'git-bash':
				case 'bash':
					return await this.findGitBash();

				case 'wsl-bash':
					return await this.findExecutable('wsl.exe');

				default:
					return await this.findExecutable(shell);
			}
		} else {
			// Unix-like systems (macOS, Linux)
			switch (shell) {
				case 'bash':
					return (await this.findExecutable('bash')) || '/bin/bash';
				case 'zsh':
					return (await this.findExecutable('zsh')) || '/bin/zsh';
				case 'fish':
					return (await this.findExecutable('fish')) || '/usr/bin/fish';
				case 'sh':
					return (await this.findExecutable('sh')) || '/bin/sh';
				case 'ksh':
					return (await this.findExecutable('ksh')) || '/bin/ksh';
				case 'tcsh':
					return (await this.findExecutable('tcsh')) || '/bin/tcsh';
				case 'dash':
					return (await this.findExecutable('dash')) || '/bin/dash';
				case 'powershell':
				case 'powershell-core':
					return (await this.findExecutable('pwsh')) || '/usr/local/bin/pwsh';
				default:
					return await this.findExecutable(shell);
			}
		}
	}

	/**
	 * Find executable in system PATH
	 */
	private async findExecutable(command: string): Promise<string | null> {
		try {
			const { execSync } = require('child_process');
			const result =
				os.platform() === 'win32'
					? execSync(`where ${command}`, { encoding: 'utf-8', timeout: 5000 }).trim()
					: execSync(`which ${command}`, { encoding: 'utf-8', timeout: 5000 }).trim();

			const firstPath = result.split('\n')[0];
			return firstPath && fs.existsSync(firstPath) ? firstPath : null;
		} catch {
			return null;
		}
	}

	/**
	 * Enhanced Git Bash detection
	 */
	private async findGitBash(): Promise<string | null> {
		// Try common installation paths first
		const commonPaths = [
			'C:\\Program Files\\Git\\bin\\bash.exe',
			'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
			'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
			'C:\\Program Files (x86)\\Git\\usr\\bin\\bash.exe',
		];

		for (const bashPath of commonPaths) {
			if (fs.existsSync(bashPath)) {
				if (await this.validateShell(bashPath, 'bash')) {
					return bashPath;
				}
			}
		}

		// Try to find via git command
		try {
			const gitPath = await this.findExecutable('git');
			if (gitPath) {
				const gitDir = path.dirname(path.dirname(gitPath));
				const bashPath = path.join(gitDir, 'bin', 'bash.exe');
				if (fs.existsSync(bashPath) && (await this.validateShell(bashPath, 'bash'))) {
					return bashPath;
				}
			}
		} catch {}

		return null;
	}

	/**
	 * Validate shell compatibility and basic functionality
	 */
	private async validateShell(shellPath: string, shellType: string): Promise<boolean> {
		try {
			const { execSync } = require('child_process');

			const testCommand =
				shellType === 'powershell'
					? `"${shellPath}" -Command "echo test"`
					: `"${shellPath}" -c "echo test"`;

			const result = execSync(testCommand, {
				timeout: 3000,
				stdio: 'pipe',
				encoding: 'utf-8',
			});

			return result.trim() === 'test';
		} catch {
			return false;
		}
	}

	private async getAvailableShells(): Promise<string[]> {
		const platform = os.platform();
		const available: string[] = [];

		if (platform === 'win32') {
			if (await this.getShellPath('powershell')) {available.push('powershell');}
			if (await this.getShellPath('powershell-core')) {available.push('powershell-core');}
			if (await this.getShellPath('cmd')) {available.push('cmd');}
			if (await this.getShellPath('git-bash')) {available.push('git-bash');}
			if (await this.getShellPath('wsl-bash')) {available.push('wsl-bash');}
		} else {
			if (await this.getShellPath('bash')) {available.push('bash');}
			if (await this.getShellPath('zsh')) {available.push('zsh');}
			if (await this.getShellPath('fish')) {available.push('fish');}
			if (await this.getShellPath('sh')) {available.push('sh');}
			if (await this.getShellPath('ksh')) {available.push('ksh');}
			if (await this.getShellPath('tcsh')) {available.push('tcsh');}
			if (await this.getShellPath('dash')) {available.push('dash');}
		}

		return available;
	}

	/**
	 * Execute command using VSCode Shell Integration API
	 * 🆕 Supports intelligent output pre-filtering
	 */
	private async executeWithShellIntegration(
		terminal: vscode.Terminal,
		command: string,
		shell: string,
		timeout: number,
		captureOutput: boolean,
		shouldPreFilterOutput: boolean | undefined,
		updateAsk: any,
		say: any,
		shouldAutoClose: boolean = false,
		shellIntegration?: vscode.TerminalShellIntegration
	): Promise<ToolResponseV2> {
		const integration = shellIntegration || terminal.shellIntegration!;
		const startTime = Date.now();
		let output = '';
		let exitCode: number | undefined;
		let executionCompleted = false;

		const execution = integration.executeCommand(command);
		
		// Register terminal as running
		this.registerTerminalState(terminal.name, 'running', command);

		const outputPromise = (async () => {
			if (captureOutput) {
				const outputStream = execution.read();
				let lastProgressUpdate = Date.now();
				const PROGRESS_INTERVAL_MS = 3000; // Update every 3 seconds
				
				try {
					for await (const data of outputStream) {
						output += data;
						
						// Progressive feedback: inform AI about long-running commands
						const now = Date.now();
						if (now - lastProgressUpdate >= PROGRESS_INTERVAL_MS && !executionCompleted) {
							lastProgressUpdate = now;
							const elapsed = Math.floor((now - startTime) / 1000);
							const currentOutputLines = output.split('\n').length;
							
							// Send intermediate update to AI
							await updateAsk('tool', {
								tool: {
									tool: 'terminal',
									path: this.cwd,
									content: `<terminal_progress>
<status>running</status>
<command>${this.escapeXml(command)}</command>
<elapsed>${elapsed}s</elapsed>
<output_lines_so_far>${currentOutputLines}</output_lines_so_far>
<note>Command is still executing... (updates every 3s)</note>
</terminal_progress>`,
									ts: Date.now(),
								},
							});
						}
					}
				} catch (error) {
					// Stream ended or error occurred
				}
			}
		})();

		const completionPromise = new Promise<ToolResponseV2>((resolve) => {
			const disposable = vscode.window.onDidEndTerminalShellExecution(async (event) => {
				if (event.execution === execution) {
					disposable.dispose();
					exitCode = event.exitCode;
					executionCompleted = true;

					await outputPromise;

					const elapsed = Date.now() - startTime;
					const cleanOutput = this.cleanAnsiEscapes(output);
					
					// 🆕 Intelligent pre-filtering
					let processedOutput: string;
					let isTruncated: boolean;
					let isPreFiltered: boolean = false;
					
					if (shouldPreFilterOutput) {
						// Pre-filter: show only important information
						const filtered = this.preFilterOutput(cleanOutput);
						processedOutput = filtered.filteredOutput;
						isTruncated = filtered.isTruncated;
						isPreFiltered = filtered.isFiltered;
					} else {
						// No filtering: show complete output
						const result = this.smartTruncateOutput(cleanOutput);
						processedOutput = result.truncated;
						isTruncated = result.isTruncated;
					}

					// Calculate additional AI-friendly metrics
					const outputLines = cleanOutput.split('\n').length;
					const projectName = path.basename(this.cwd);
					
					// Register terminal state based on exit code
					const finalStatus = exitCode === 0 ? 'completed' : 'error';
					this.registerTerminalState(terminal.name, finalStatus, command, exitCode);
					
					// Analyze errors if command failed
					let errorAnalysisXml = '';
					if (exitCode !== 0 && exitCode !== undefined) {
						const analysis = this.analyzeTerminalError(exitCode, cleanOutput, command);
						errorAnalysisXml = `
<error_analysis>
  <error_type>${this.escapeXml(analysis.errorType)}</error_type>
  <category>${this.escapeXml(analysis.category)}</category>
  <suggestion>${this.escapeXml(analysis.suggestion)}</suggestion>
${analysis.relatedCommands.length > 0 ? `  <related_commands>
${analysis.relatedCommands.map(cmd => `    <command>${this.escapeXml(cmd)}</command>`).join('\n')}
  </related_commands>` : ''}
</error_analysis>`;
					}
					
					const finalOutput = `<terminal_result>
<status>${exitCode === 0 ? 'success' : 'error'}</status>
<terminal_name>${this.escapeXml(terminal.name)}</terminal_name>
<working_directory>${this.escapeXml(this.cwd)}</working_directory>
<project_name>${this.escapeXml(projectName)}</project_name>
<panelType>terminal</panelType>
<shell>${shell}</shell>
<command>${this.escapeXml(command)}</command>
<exitCode>${exitCode ?? 'unknown'}</exitCode>
<elapsed>${elapsed}ms</elapsed>
<output_stats>
  <length_bytes>${cleanOutput.length}</length_bytes>
  <length_lines>${outputLines}</length_lines>
  <is_truncated>${isTruncated}</is_truncated>
  <is_prefiltered>${isPreFiltered}</is_prefiltered>
${isPreFiltered ? `  <filter_note>Verbose output pre-filtered to show only important information (errors, warnings, key events)</filter_note>` : ''}
${isTruncated ? `  <truncation_note>Output exceeds size limit and was truncated to preserve first 70% and last lines</truncation_note>` : ''}
</output_stats>${errorAnalysisXml}
<output>${this.escapeXml(processedOutput || '(no output)')}</output>
</terminal_result>`;

					await updateAsk(
						'tool',
						{
							tool: {
								tool: 'terminal',
								command,
								result: finalOutput,
								approvalState: exitCode === 0 ? 'approved' : 'error',
								ts: this.ts,
								isSubMsg: this.params.isSubMsg,
							},
						},
						this.ts
					);

					// Auto-close terminal if requested and successful
					if (shouldAutoClose && exitCode === 0) {
						setTimeout(() => terminal.dispose(), 1000);
					}

					if (exitCode === 0) {
						resolve(this.toolResponse('success', finalOutput));
					} else {
						await say('error', `Command failed with exit code ${exitCode}`);
						resolve(this.toolResponse('error', finalOutput));
					}
				}
			});

			// Timeout handling
			setTimeout(async () => {
				if (!executionCompleted) {
					disposable.dispose();

					await Promise.race([outputPromise, new Promise((r) => setTimeout(r, 1000))]);

					const elapsed = Date.now() - startTime;
					const cleanOutput = this.cleanAnsiEscapes(output);
					
					// 🆕 Intelligent pre-filtering (timeout case)
					let processedOutput: string;
					let isTruncated: boolean;
					let isPreFiltered: boolean = false;
					
					if (shouldPreFilterOutput) {
						const filtered = this.preFilterOutput(cleanOutput);
						processedOutput = filtered.filteredOutput;
						isTruncated = filtered.isTruncated;
						isPreFiltered = filtered.isFiltered;
					} else {
						const result = this.smartTruncateOutput(cleanOutput);
						processedOutput = result.truncated;
						isTruncated = result.isTruncated;
					}

					// Calculate additional metrics for timeout case
					const outputLines = cleanOutput.split('\n').length;
					const projectName = path.basename(this.cwd);
					
					const timeoutOutput = `<terminal_result>
<status>timeout</status>
<terminal_name>${this.escapeXml(terminal.name)}</terminal_name>
<working_directory>${this.escapeXml(this.cwd)}</working_directory>
<project_name>${this.escapeXml(projectName)}</project_name>
<panelType>terminal</panelType>
<shell>${shell}</shell>
<command>${this.escapeXml(command)}</command>
<timeout>${timeout}ms</timeout>
<elapsed>${elapsed}ms</elapsed>
<output_stats>
  <length_bytes>${cleanOutput.length}</length_bytes>
  <length_lines>${outputLines}</length_lines>
  <is_truncated>${isTruncated}</is_truncated>
  <is_prefiltered>${isPreFiltered}</is_prefiltered>
</output_stats>
<output>${this.escapeXml(processedOutput)}</output>
<message>Command execution timed out after ${timeout}ms</message>
</terminal_result>`;

					resolve(this.toolResponse('error', timeoutOutput));
				}
			}, timeout);
		});

		return completionPromise;
	}

	/**
	 * Fallback execution when shell integration is not available
	 */
	private async executeWithFallback(
		terminal: vscode.Terminal,
		command: string,
		shell: string,
		updateAsk: any,
		say: any,
		fallbackReason: string = 'unknown'
	): Promise<ToolResponseV2> {
		terminal.sendText(command, true);
		
		// Register terminal as idle (fallback mode doesn't track completion)
		this.registerTerminalState(terminal.name, 'idle', command);

		const projectName = path.basename(this.cwd);
		
		// Generate detailed fallback reason message
		let reasonMessage = '';
		let alternativeSolution = '';
		
		switch (fallbackReason) {
			case 'cached_not_supported':
				reasonMessage = 'Shell Integration is not supported by this shell (cached from previous check)';
				alternativeSolution = `Use 'read-progress' tool to monitor output: read-progress`;
				break;
			case 'timeout_after_3s':
				reasonMessage = 'Shell Integration initialization timeout after 3000ms';
				alternativeSolution = `Use 'read-progress' tool to monitor output: read-progress`;
				break;
			default:
				reasonMessage = 'Shell Integration not available';
				alternativeSolution = `Check terminal tab "${terminal.name}" for output`;
		}
		
		const output = `<terminal_result>
<status>executed</status>
<terminal_name>${this.escapeXml(terminal.name)}</terminal_name>
<working_directory>${this.escapeXml(this.cwd)}</working_directory>
<project_name>${this.escapeXml(projectName)}</project_name>
<panelType>terminal</panelType>
<shell>${shell}</shell>
<command>${this.escapeXml(command)}</command>
<fallback_mode>
  <enabled>true</enabled>
  <reason>${this.escapeXml(reasonMessage)}</reason>
  <output_capture_available>false</output_capture_available>
  <alternative_solution>${this.escapeXml(alternativeSolution)}</alternative_solution>
</fallback_mode>
<note>Command sent to terminal successfully. ${this.escapeXml(alternativeSolution)}</note>
</terminal_result>`;

		await updateAsk(
			'tool',
			{
				tool: {
					tool: 'terminal',
					command,
					output: output,
					approvalState: 'approved',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		return this.toolResponse('success', output);
	}

	/**
	 * ANSI escape sequence removal using standardized strip-ansi library
	 * Optimized for consistency and maintainability
	 */
	private cleanAnsiEscapes(text: string): string {
		// Use strip-ansi for standardized ANSI escape sequence removal
		let cleaned = stripAnsi(text);
		
		// Normalize line endings and excessive newlines
		cleaned = cleaned
			.replace(/\r\n/g, '\n')
			.replace(/\r/g, '\n')
			.replace(/\n{3,}/g, '\n\n')
			.trim();
		
		return cleaned;
	}

	/**
	 * Smart output truncation with context preservation
	 */
	private smartTruncateOutput(
		output: string,
		maxLength: number = 10000
	): { truncated: string; isTruncated: boolean } {
		if (output.length <= maxLength) {
			return { truncated: output, isTruncated: false };
		}

		const lines = output.split('\n');
		let result = '';
		let lineCount = 0;

		const firstPart = Math.floor(maxLength * 0.7);
		for (const line of lines) {
			if (result.length + line.length + 1 > firstPart) {
				break;
			}
			result += line + '\n';
			lineCount++;
		}

		const skippedLines = lines.length - lineCount;
		const truncationInfo = `\n... [Output truncated - ${skippedLines} more lines omitted] ...\n`;
		result += truncationInfo;

		const remainingLength = maxLength - result.length;
		if (remainingLength > 200 && skippedLines > 5) {
			const lastLinesToShow = Math.floor(remainingLength / 50);
			const lastLines = lines.slice(-lastLinesToShow);
			result += lastLines.join('\n');
		}

		return { truncated: result, isTruncated: true };
	}

	private escapeXml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');
	}

	/**
	 * 🆕 Intelligent output pre-filtering
	 * 
	 * Filters verbose output to show only important information:
	 * - Errors and warnings (highest priority)
	 * - Success and completion messages
	 * - Progress indicators (%, compiling, bundling, etc.)
	 * - First and last few lines (context)
	 * - Removes repetitive/verbose logs (node_modules downloads, etc.)
	 * 
	 * @param output - Full output text
	 * @param maxLength - Maximum output length (default: 5000)
	 * @returns Filtered output with metadata
	 */
	private preFilterOutput(
		output: string,
		maxLength: number = 5000
	): { filteredOutput: string; isTruncated: boolean; isFiltered: boolean } {
		const lines = output.split('\n');
		const importantLines: string[] = [];
		let filteredCount = 0;

		// Patterns for important lines
		const importantPatterns = {
			error: /error|fail(ed|ure)?|exception|fatal|crash|abort|panic|critical|\[ERROR\]|\[FATAL\]|\bERR\b/i,
			warning: /warn(ing)?|caution|deprecated|\[WARN\]|potential\s+issue/i,
			success: /success(ful(ly)?)?|done|complete(d)?|passed|finished|ready|\[OK\]|✓|✔/i,
			progress: /\d+%|compiling|building|bundling|transpiling|installing|downloading/i,
			separator: /^[=\-_]{3,}$/,
			heading: /^#+\s+|^\*\*\s+|\[.*\]\s*$/,
		};

		// Noise patterns to skip
		const noisePatterns = [
			/^npm (WARN|notice)/i,                    // npm warnings/notices (too verbose)
			/^\s*at\s+.*\(.*:\d+:\d+\)/,              // Stack trace internals (keep first few)
			/^(node_modules|\.next|dist)\/.*$/,       // Build artifacts paths
			/downloading.*\d+%/i,                     // Download progress (too many)
			/^\s*$/,                                   // Empty lines
		];

		// Always include: first 3 lines and last 3 lines
		const headerLines = lines.slice(0, 3);
		const footerLines = lines.slice(-3);

		// Process middle content
		let stackTraceDepth = 0;
		for (let i = 3; i < lines.length - 3; i++) {
			const line = lines[i];

			// Skip empty lines
			if (!line.trim()) {continue;}

			// Check if it's noise
			const isNoise = noisePatterns.some((pattern) => pattern.test(line));
			if (isNoise) {
				// Limit stack traces to 3 lines
				if (line.match(/^\s*at\s+/)) {
					stackTraceDepth++;
					if (stackTraceDepth > 3) {
						filteredCount++;
						continue;
					}
				} else {
					filteredCount++;
					continue;
				}
			} else {
				stackTraceDepth = 0; // Reset stack trace counter
			}

			// Check if it's important
			const isImportant = Object.values(importantPatterns).some((pattern) =>
				pattern.test(line)
			);

			if (isImportant) {
				importantLines.push(line);
			}
		}

		// Combine results
		let result = '';
		result += headerLines.join('\n') + '\n';
		result += '\n';
		
		if (importantLines.length > 0) {
			result += importantLines.join('\n') + '\n';
		}
		
		if (filteredCount > 0) {
			result += `\n... [Pre-filtered: ${filteredCount} verbose lines removed] ...\n\n`;
		}
		
		result += footerLines.join('\n');

		// Apply truncation if still too long
		let isTruncated = false;
		if (result.length > maxLength) {
			result = result.substring(0, maxLength) + '\n... [Output truncated due to length] ...';
			isTruncated = true;
		}

		return {
			filteredOutput: result,
			isTruncated,
			isFiltered: filteredCount > 0 || importantLines.length > 0,
		};
	}

	// ============================================================================
	// Debug Console Helper Methods (Stubs - To be implemented)
	// ============================================================================

	private async evaluateDebugExpression(expression: string, input: any): Promise<string> {
		const activeDebugSession = vscode.debug.activeDebugSession;
		if (!activeDebugSession) {
			throw new Error('No active debug session found');
		}

		try {
			// Use VS Code's debug evaluation API
			const result = await activeDebugSession.customRequest('evaluate', {
				expression: expression,
				context: input.evaluationContext || 'repl',
				frameId: input.frameId,
			});

			// AI-friendly structured output
			return this.formatDebugEvaluationResult(expression, result);
		} catch (error) {
			throw new Error(`Failed to evaluate expression: ${error}`);
		}
	}
	
	/**
	 * Format debug evaluation result in AI-friendly structure
	 */
	private formatDebugEvaluationResult(expression: string, result: any): string {
		let output = `<debug_evaluation>\n`;
		output += `<expression>${this.escapeXml(expression)}</expression>\n`;
		
		// Extract type and value
		const type = result.type || 'unknown';
		const value = result.result || String(result);
		const variablesReference = result.variablesReference || 0;
		
		output += `<type>${this.escapeXml(type)}</type>\n`;
		output += `<value>${this.escapeXml(value)}</value>\n`;
		output += `<is_object>${variablesReference > 0}</is_object>\n`;
		
		// Analyze result type and provide suggestions
		const analysis = this.analyzeDebugResult(type, value);
		if (analysis.category) {
			output += `<category>${this.escapeXml(analysis.category)}</category>\n`;
		}
		if (analysis.suggestions.length > 0) {
			output += `<suggestions>\n`;
			for (const suggestion of analysis.suggestions) {
				output += `  <suggestion>${this.escapeXml(suggestion)}</suggestion>\n`;
			}
			output += `</suggestions>\n`;
		}
		
		// Parse stack trace if present
		if (value.includes('at ') && (value.includes('.js:') || value.includes('.ts:'))) {
			const stackTrace = this.parseStackTrace(value);
			if (stackTrace.frames.length > 0) {
				output += `<stack_trace>\n`;
				output += `  <total_frames>${stackTrace.frames.length}</total_frames>\n`;
				output += `  <frames>\n`;
				for (const frame of stackTrace.frames.slice(0, 5)) { // Top 5 frames
					output += `    <frame>\n`;
					output += `      <function>${this.escapeXml(frame.function)}</function>\n`;
					output += `      <file>${this.escapeXml(frame.file)}</file>\n`;
					output += `      <line>${frame.line}</line>\n`;
					if (frame.column) {
						output += `      <column>${frame.column}</column>\n`;
					}
					output += `    </frame>\n`;
				}
				output += `  </frames>\n`;
				output += `</stack_trace>\n`;
			}
		}
		
		output += `</debug_evaluation>`;
		return output;
	}
	
	/**
	 * Analyze debug result and provide AI-friendly suggestions
	 */
	private analyzeDebugResult(type: string, value: string): {
		category: string;
		suggestions: string[];
	} {
		const lowerValue = value.toLowerCase();
		const suggestions: string[] = [];
		let category = '';
		
		// Error analysis
		if (type === 'error' || lowerValue.includes('error:') || lowerValue.includes('exception')) {
			category = 'Error';
			suggestions.push('Check the stack trace to identify the error location');
			suggestions.push('Examine variables in the failing frame: evaluate variables');
			suggestions.push('Set a breakpoint at the error location and restart debugging');
		}
		// Undefined/null analysis
		else if (value === 'undefined' || value === 'null') {
			category = 'Null/Undefined Value';
			suggestions.push('Variable may not be initialized or is out of scope');
			suggestions.push('Check where this variable is assigned');
			suggestions.push('Inspect parent scope: evaluate parent object');
		}
		// Array analysis
		else if (type === 'object' && (value.startsWith('[') || lowerValue.includes('array'))) {
			category = 'Array';
			suggestions.push('Check array length: evaluate ' + value.split('[')[0] + '.length');
			suggestions.push('Inspect first element: evaluate ' + value.split('[')[0] + '[0]');
			suggestions.push('Use array methods: .map(), .filter(), .find()');
		}
		// Object analysis
		else if (type === 'object' && value.startsWith('{')) {
			category = 'Object';
			suggestions.push('Inspect object keys: evaluate Object.keys(' + value.split('{')[0] + ')');
			suggestions.push('Check specific property: evaluate <object>.<property>');
		}
		// Function analysis
		else if (type === 'function') {
			category = 'Function';
			suggestions.push('Call function with arguments: evaluate <function>(args)');
			suggestions.push('Inspect function definition: step into function');
		}
		// Number analysis
		else if (type === 'number') {
			category = 'Number';
			const num = parseFloat(value);
			if (isNaN(num)) {
				suggestions.push('Value is NaN - check calculations');
			} else if (!isFinite(num)) {
				suggestions.push('Value is Infinity - check for division by zero');
			} else if (num === 0) {
				suggestions.push('Value is 0 - verify this is expected');
			}
		}
		// String analysis
		else if (type === 'string') {
			category = 'String';
			if (value.length === 0 || value === '""' || value === "''") {
				suggestions.push('String is empty - verify this is expected');
			}
		}
		// Boolean analysis
		else if (type === 'boolean') {
			category = 'Boolean';
			suggestions.push('Use in conditional logic: if (' + value + ') { ... }');
		}
		
		return { category, suggestions };
	}
	
	/**
	 * Parse stack trace from error message
	 */
	private parseStackTrace(errorMessage: string): {
		frames: Array<{
			function: string;
			file: string;
			line: number;
			column?: number;
		}>;
	} {
		const frames: Array<{
			function: string;
			file: string;
			line: number;
			column?: number;
		}> = [];
		
		// Match patterns like:
		// at functionName (file.js:10:5)
		// at file.js:10:5
		// at async functionName (file.js:10:5)
		const stackLineRegex = /at\s+(?:async\s+)?([^\(]+?)?\s*\(([^:]+):(\d+):(\d+)\)|at\s+([^:]+):(\d+):(\d+)/g;
		
		let match;
		while ((match = stackLineRegex.exec(errorMessage)) !== null) {
			if (match[1] || match[2]) {
				// Pattern with function name
				frames.push({
					function: match[1]?.trim() || 'anonymous',
					file: match[2] || '',
					line: parseInt(match[3] || '0'),
					column: parseInt(match[4] || '0')
				});
			} else if (match[5]) {
				// Pattern without function name
				frames.push({
					function: 'anonymous',
					file: match[5],
					line: parseInt(match[6] || '0'),
					column: parseInt(match[7] || '0')
				});
			}
		}
		
		return { frames };
	}

	private async logToDebugConsole(message: string, logLevel: string): Promise<string> {
		vscode.debug.activeDebugConsole?.appendLine(`[${logLevel.toUpperCase()}] ${message}`);
		return `Logged message to debug console`;
	}

	private async clearDebugConsole(): Promise<string> {
		// VS Code doesn't provide a direct API to clear debug console
		// This is a placeholder
		return 'Debug console cannot be cleared programmatically';
	}

	private async focusDebugConsole(preserveFocus: boolean): Promise<string> {
		vscode.commands.executeCommand('workbench.debug.action.focusRepl');
		return 'Debug console focused';
	}

	/**
	 * Analyze log content for intelligent classification
	 */
	private analyzeLogContent(content: string): {
		level: string;
		category: string;
		hasError: boolean;
		hasWarning: boolean;
		keyTerms: string[];
		suggestions: string[];
	} {
		const lowerContent = content.toLowerCase();
		const suggestions: string[] = [];
		const keyTerms: string[] = [];
		let level = 'INFO';
		let category = 'General Log';
		let hasError = false;
		let hasWarning = false;
		
		// Detect log level
		if (lowerContent.includes('error') || lowerContent.includes('fail') || lowerContent.includes('exception')) {
			level = 'ERROR';
			hasError = true;
			category = 'Error Log';
			suggestions.push('Review error message and stack trace');
			suggestions.push('Check recent code changes that might have caused this');
		} else if (lowerContent.includes('warn') || lowerContent.includes('deprecated')) {
			level = 'WARN';
			hasWarning = true;
			category = 'Warning Log';
			suggestions.push('Address warnings before they become errors');
		} else if (lowerContent.includes('debug') || lowerContent.includes('trace')) {
			level = 'DEBUG';
			category = 'Debug Log';
		}
		
		// Extract key terms
		// Compilation errors
		if (lowerContent.includes('syntax') || lowerContent.includes('unexpected token')) {
			keyTerms.push('SyntaxError');
			suggestions.push('Check for missing brackets, quotes, or semicolons');
		}
		
		// Type errors
		if (lowerContent.includes('type') && hasError) {
			keyTerms.push('TypeError');
			suggestions.push('Verify variable types and method signatures');
		}
		
		// Reference errors
		if (lowerContent.includes('is not defined') || lowerContent.includes('cannot read property')) {
			keyTerms.push('ReferenceError');
			suggestions.push('Check if variable is declared and in scope');
		}
		
		// Network errors
		if (lowerContent.includes('timeout') || lowerContent.includes('connection') || lowerContent.includes('econnrefused')) {
			keyTerms.push('NetworkError');
			suggestions.push('Check network connection and server availability');
		}
		
		// File system errors
		if (lowerContent.includes('enoent') || lowerContent.includes('no such file')) {
			keyTerms.push('FileSystemError');
			suggestions.push('Verify file path exists');
		}
		
		// Permission errors
		if (lowerContent.includes('eacces') || lowerContent.includes('permission denied')) {
			keyTerms.push('PermissionError');
			suggestions.push('Check file/directory permissions');
		}
		
		// Module errors
		if (lowerContent.includes('cannot find module') || lowerContent.includes('module not found')) {
			keyTerms.push('ModuleError');
			suggestions.push('Run npm install or yarn install');
		}
		
		// Build/compile keywords
		if (lowerContent.includes('build') || lowerContent.includes('compil')) {
			keyTerms.push('Build');
		}
		
		// Test keywords
		if (lowerContent.includes('test') && (lowerContent.includes('pass') || lowerContent.includes('fail'))) {
			keyTerms.push('Testing');
		}
		
		// Deployment keywords
		if (lowerContent.includes('deploy') || lowerContent.includes('publish')) {
			keyTerms.push('Deployment');
		}
		
		return {
			level,
			category,
			hasError,
			hasWarning,
			keyTerms: keyTerms.length > 0 ? keyTerms : ['General'],
			suggestions
		};
	}
	
	// ============================================================================
	// Output Channel Helper Methods
	// ============================================================================

	private outputChannels: Map<string, vscode.OutputChannel | vscode.LogOutputChannel> = new Map();

	private async createOutputChannel(name: string, type: string): Promise<string> {
		if (this.outputChannels.has(name)) {
			return `Output channel '${name}' already exists`;
		}

		const channel =
			type === 'log'
				? vscode.window.createOutputChannel(name, { log: true })
				: vscode.window.createOutputChannel(name);

		this.outputChannels.set(name, channel);
		return `Created output channel '${name}'`;
	}

	private async writeToOutputChannel(name: string, content: string, newLine: boolean): Promise<string> {
		let channel = this.outputChannels.get(name);
		
		if (!channel) {
			channel = vscode.window.createOutputChannel(name);
			this.outputChannels.set(name, channel);
		}

		if (newLine) {
			channel.appendLine(content);
		} else {
			channel.append(content);
		}

		return `Wrote to output channel '${name}'`;
	}

	private async appendToOutputChannel(name: string, content: string, newLine: boolean): Promise<string> {
		return this.writeToOutputChannel(name, content, newLine);
	}

	private async clearOutputChannel(name: string): Promise<string> {
		const channel = this.outputChannels.get(name);
		if (!channel) {
			throw new Error(`Output channel '${name}' not found`);
		}

		channel.clear();
		return `Cleared output channel '${name}'`;
	}

	private async showOutputChannel(name: string | undefined, preserveFocus: boolean): Promise<string> {
		if (name) {
			const channel = this.outputChannels.get(name);
			if (!channel) {
				throw new Error(`Output channel '${name}' not found`);
			}
			channel.show(preserveFocus);
			return `Showed output channel '${name}'`;
		} else {
			vscode.commands.executeCommand('workbench.action.output.toggleOutput');
			return 'Toggled output panel';
		}
	}

	private async hideOutputChannel(): Promise<string> {
		vscode.commands.executeCommand('workbench.action.closePanel');
		return 'Hid output panel';
	}

	private async disposeOutputChannel(name: string): Promise<string> {
		const channel = this.outputChannels.get(name);
		if (!channel) {
			throw new Error(`Output channel '${name}' not found`);
		}

		channel.dispose();
		this.outputChannels.delete(name);
		return `Disposed output channel '${name}'`;
	}

	// ============================================================================
	// Problems Helper Methods
	// ============================================================================

	private diagnosticCollections: Map<string, vscode.DiagnosticCollection> = new Map();

	private async addProblem(collectionName: string, filePath: string, problem: any): Promise<string> {
		let collection = this.diagnosticCollections.get(collectionName);
		if (!collection) {
			collection = vscode.languages.createDiagnosticCollection(collectionName);
			this.diagnosticCollections.set(collectionName, collection);
		}

		const uri = vscode.Uri.file(filePath);
		const range = new vscode.Range(
			problem.startLine,
			problem.startCharacter,
			problem.endLine,
			problem.endCharacter
		);

		const severity = this.mapSeverity(problem.severity);
		const diagnostic = new vscode.Diagnostic(range, problem.message, severity);
		
		if (problem.source) {
			diagnostic.source = problem.source;
		}
		if (problem.code) {
			diagnostic.code = problem.code;
		}

		const existingDiagnostics = collection.get(uri) || [];
		collection.set(uri, [...existingDiagnostics, diagnostic]);

		return `Added problem to '${collectionName}' for file '${filePath}'`;
	}

	private async addMultipleProblems(collectionName: string, problems: any[]): Promise<string> {
		let collection = this.diagnosticCollections.get(collectionName);
		if (!collection) {
			collection = vscode.languages.createDiagnosticCollection(collectionName);
			this.diagnosticCollections.set(collectionName, collection);
		}

		const diagnosticsByFile = new Map<string, vscode.Diagnostic[]>();

		for (const problem of problems) {
			const uri = vscode.Uri.file(problem.filePath);
			const range = new vscode.Range(
				problem.startLine,
				problem.startCharacter,
				problem.endLine,
				problem.endCharacter
			);

			const severity = this.mapSeverity(problem.severity);
			const diagnostic = new vscode.Diagnostic(range, problem.message, severity);
			
			if (problem.source) {
				diagnostic.source = problem.source;
			}
			if (problem.code) {
				diagnostic.code = problem.code;
			}

			const fileDiagnostics = diagnosticsByFile.get(problem.filePath) || [];
			fileDiagnostics.push(diagnostic);
			diagnosticsByFile.set(problem.filePath, fileDiagnostics);
		}

		for (const [filePath, diagnostics] of diagnosticsByFile) {
			const uri = vscode.Uri.file(filePath);
			collection.set(uri, diagnostics);
		}

		return `Added ${problems.length} problems to '${collectionName}'`;
	}

	private async clearProblems(collectionName: string): Promise<string> {
		const collection = this.diagnosticCollections.get(collectionName);
		if (!collection) {
			throw new Error(`Diagnostic collection '${collectionName}' not found`);
		}

		collection.clear();
		return `Cleared all problems from '${collectionName}'`;
	}

	private async clearFileProblems(collectionName: string, filePath: string): Promise<string> {
		const collection = this.diagnosticCollections.get(collectionName);
		if (!collection) {
			throw new Error(`Diagnostic collection '${collectionName}' not found`);
		}

		const uri = vscode.Uri.file(filePath);
		collection.delete(uri);
		return `Cleared problems for file '${filePath}' from '${collectionName}'`;
	}

	private async clearAllProblems(collectionName: string): Promise<string> {
		return this.clearProblems(collectionName);
	}

	private async showProblems(preserveFocus: boolean): Promise<string> {
		vscode.commands.executeCommand('workbench.actions.view.problems');
		return 'Showed problems panel';
	}

	private async getProblems(
		collectionName: string | undefined,
		filterSeverity: any,
		filterSource: any
	): Promise<string> {
		const allDiagnostics = vscode.languages.getDiagnostics();
		let filteredDiagnostics: any[] = [];

		for (const [uri, diagnostics] of allDiagnostics) {
			for (const diagnostic of diagnostics) {
				if (filterSeverity && this.mapSeverityToString(diagnostic.severity) !== filterSeverity) {
					continue;
				}
				if (filterSource && diagnostic.source !== filterSource) {
					continue;
				}

				const severityStr = this.mapSeverityToString(diagnostic.severity);
				const priorityAnalysis = this.analyzeProblemPriority(
					diagnostic.message,
					severityStr,
					uri.fsPath,
					diagnostic.code
				);

				filteredDiagnostics.push({
					file: uri.fsPath,
					line: diagnostic.range.start.line,
					column: diagnostic.range.start.character,
					message: diagnostic.message,
					severity: severityStr,
					source: diagnostic.source,
					code: diagnostic.code,
					priority_score: priorityAnalysis.priorityScore,
					priority_level: priorityAnalysis.priorityLevel,
					fix_difficulty: priorityAnalysis.fixDifficulty,
					impact_scope: priorityAnalysis.impactScope,
					suggested_action: priorityAnalysis.suggestedAction
				});
			}
		}

		// Intelligent sorting: highest priority first
		filteredDiagnostics.sort((a, b) => b.priority_score - a.priority_score);

		return JSON.stringify(filteredDiagnostics, null, 2);
	}
	
	/**
	 * Analyze problem priority for intelligent sorting
	 */
	private analyzeProblemPriority(
		message: string,
		severity: string,
		filePath: string,
		code: any
	): {
		priorityScore: number;
		priorityLevel: string;
		fixDifficulty: string;
		impactScope: string;
		suggestedAction: string;
	} {
		let priorityScore = 0;
		let fixDifficulty = 'medium';
		let impactScope = 'local';
		let suggestedAction = 'Review and fix the issue';
		
		// Base score from severity
		switch (severity) {
			case 'error':
				priorityScore += 100;
				impactScope = 'high';
				break;
			case 'warning':
				priorityScore += 50;
				impactScope = 'medium';
				break;
			case 'information':
				priorityScore += 10;
				impactScope = 'low';
				break;
			case 'hint':
				priorityScore += 5;
				impactScope = 'low';
				break;
		}
		
		const lowerMessage = message.toLowerCase();
		
		// Critical keywords that increase priority
		if (lowerMessage.includes('security') || lowerMessage.includes('vulnerability')) {
			priorityScore += 200;
			impactScope = 'critical';
			suggestedAction = 'Fix immediately - security issue';
		}
		
		if (lowerMessage.includes('crash') || lowerMessage.includes('fatal')) {
			priorityScore += 150;
			impactScope = 'critical';
			suggestedAction = 'Fix immediately - application crash risk';
		}
		
		if (lowerMessage.includes('deprecated')) {
			priorityScore += 30;
			fixDifficulty = 'easy';
			suggestedAction = 'Update to new API';
		}
		
		if (lowerMessage.includes('unused') || lowerMessage.includes('never read')) {
			priorityScore += 5;
			fixDifficulty = 'easy';
			suggestedAction = 'Remove unused code';
		}
		
		// Syntax errors are usually easy to fix
		if (lowerMessage.includes('syntax') || lowerMessage.includes('unexpected token')) {
			priorityScore += 80;
			fixDifficulty = 'easy';
			suggestedAction = 'Fix syntax error';
		}
		
		// Type errors may be more complex
		if (lowerMessage.includes('type') && severity === 'error') {
			priorityScore += 70;
			fixDifficulty = 'medium';
			suggestedAction = 'Fix type mismatch';
		}
		
		// Missing imports are easy to fix
		if (lowerMessage.includes('cannot find name') || lowerMessage.includes('is not defined')) {
			priorityScore += 60;
			fixDifficulty = 'easy';
			suggestedAction = 'Add missing import or declaration';
		}
		
		// File importance (main files are higher priority)
		const fileName = filePath.toLowerCase();
		if (fileName.includes('index.') || fileName.includes('main.') || fileName.includes('app.')) {
			priorityScore += 40;
			impactScope = 'high';
		}
		
		if (fileName.includes('test') || fileName.includes('spec')) {
			priorityScore -= 10; // Tests are slightly lower priority
		}
		
		if (fileName.includes('config') || fileName.includes('.json')) {
			priorityScore += 20;
			fixDifficulty = 'easy';
		}
		
		// Determine priority level
		let priorityLevel: string;
		if (priorityScore >= 200) {
			priorityLevel = 'CRITICAL';
		} else if (priorityScore >= 100) {
			priorityLevel = 'HIGH';
		} else if (priorityScore >= 50) {
			priorityLevel = 'MEDIUM';
		} else if (priorityScore >= 20) {
			priorityLevel = 'LOW';
		} else {
			priorityLevel = 'TRIVIAL';
		}
		
		return {
			priorityScore,
			priorityLevel,
			fixDifficulty,
			impactScope,
			suggestedAction
		};
	}

	private mapSeverity(severity: string): vscode.DiagnosticSeverity {
		switch (severity) {
			case 'error':
				return vscode.DiagnosticSeverity.Error;
			case 'warning':
				return vscode.DiagnosticSeverity.Warning;
			case 'information':
				return vscode.DiagnosticSeverity.Information;
			case 'hint':
				return vscode.DiagnosticSeverity.Hint;
			default:
				return vscode.DiagnosticSeverity.Error;
		}
	}

	private mapSeverityToString(severity: vscode.DiagnosticSeverity): string {
		switch (severity) {
			case vscode.DiagnosticSeverity.Error:
				return 'error';
			case vscode.DiagnosticSeverity.Warning:
				return 'warning';
			case vscode.DiagnosticSeverity.Information:
				return 'information';
			case vscode.DiagnosticSeverity.Hint:
				return 'hint';
			default:
				return 'error';
		}
	}

	// ============================================================================
	// Ports Helper Methods (Stubs - VS Code has limited port forwarding API)
	// ============================================================================

	private async forwardPort(input: any): Promise<string> {
		// VS Code port forwarding is available in Remote Development scenarios
		// This is a simplified implementation
		const localPort = input.localPort!;
		const remotePort = input.remotePort || localPort;
		const label = input.portLabel || `Port ${localPort}`;

		// Try to use VS Code's port forwarding API if available
		try {
			// Note: This API might not be available in all contexts
			await vscode.commands.executeCommand('forwardPorts.startForwarding', {
				port: localPort,
				label: label,
			});

			return `Port ${localPort} forwarding started${remotePort !== localPort ? ` (remote: ${remotePort})` : ''}`;
		} catch (error) {
			return `Port forwarding API not available in this context. Port: ${localPort}`;
		}
	}

	private async stopForwardingPort(portNumber: number): Promise<string> {
		try {
			await vscode.commands.executeCommand('forwardPorts.stopForwarding', portNumber);
			return `Stopped forwarding port ${portNumber}`;
		} catch (error) {
			return `Could not stop forwarding port ${portNumber}`;
		}
	}

	private async listPorts(filterStatus: any, filterProtocol: any): Promise<string> {
		// This would require accessing VS Code's internal port forwarding state
		return 'Port listing not fully supported in current VS Code API';
	}

	private async detectPort(portNumber: number, processName?: string, portLabel?: string): Promise<string> {
		// Detect if port is in use and analyze conflicts
		const portAnalysis = await this.analyzePortConflict(portNumber, processName);
		
		// Build structured output
		let output = `<port_detection>
<port>${portNumber}</port>
<status>${portAnalysis.inUse ? 'in_use' : 'available'}</status>
<conflict_detected>${portAnalysis.hasConflict}</conflict_detected>`;

		if (portAnalysis.inUse && portAnalysis.processInfo) {
			output += `
<occupied_by>
  <process>${this.escapeXml(portAnalysis.processInfo)}</process>
</occupied_by>`;
		}

		if (portAnalysis.hasConflict) {
			output += `
<conflict_analysis>
  <type>${this.escapeXml(portAnalysis.conflictType)}</type>
  <severity>${portAnalysis.severity}</severity>
  <description>${this.escapeXml(portAnalysis.description)}</description>
  <suggested_actions>
${portAnalysis.suggestedActions.map(a => `    <action>${this.escapeXml(a)}</action>`).join('\n')}
  </suggested_actions>
</conflict_analysis>`;
		}

		if (portAnalysis.wellKnownService) {
			output += `
<well_known_service>
  <service>${this.escapeXml(portAnalysis.wellKnownService)}</service>
  <default_port>${portAnalysis.isDefaultPort}</default_port>
</well_known_service>`;
		}

		output += `
</port_detection>`;

		return output;
	}
	
	/**
	 * Analyze port conflicts and provide intelligent suggestions
	 */
	private async analyzePortConflict(portNumber: number, processName?: string): Promise<{
		inUse: boolean;
		hasConflict: boolean;
		conflictType: string;
		severity: string;
		description: string;
		suggestedActions: string[];
		processInfo?: string;
		wellKnownService?: string;
		isDefaultPort: boolean;
	}> {
		const { execSync } = require('child_process');
		let inUse = false;
		let processInfo: string | undefined;
		const suggestedActions: string[] = [];
		let conflictType = 'no_conflict';
		let severity = 'low';
		let description = `Port ${portNumber} is available`;
		
		// Check if port is in use
		try {
			let command: string;
			if (os.platform() === 'win32') {
				// Windows: netstat
				command = `netstat -ano | findstr :${portNumber}`;
			} else {
				// Unix/Mac: lsof or netstat
				command = `lsof -i :${portNumber} || netstat -tuln | grep :${portNumber}`;
			}
			
			const output = execSync(command, { encoding: 'utf-8', timeout: 3000 }).trim();
			
			if (output) {
				inUse = true;
				processInfo = output.split('\n')[0]; // First line
				
				// Extract PID if possible
				const pidMatch = output.match(/\s+(\d+)\s*$/);
				if (pidMatch) {
					processInfo = `PID ${pidMatch[1]}`;
				}
			}
		} catch (error) {
			// Port not in use (or command failed)
			inUse = false;
		}
		
		// Identify well-known services
		const wellKnownPorts: { [key: number]: string } = {
			80: 'HTTP',
			443: 'HTTPS',
			3000: 'Node.js Development Server',
			3001: 'React Development Server',
			4200: 'Angular Development Server',
			5000: 'Flask/Python Development Server',
			5432: 'PostgreSQL',
			5173: 'Vite Development Server',
			5500: 'Live Server',
			8000: 'Python HTTP Server',
			8080: 'Alternative HTTP / Development Server',
			8443: 'Alternative HTTPS',
			9000: 'PHP-FPM / SonarQube',
			27017: 'MongoDB',
			3306: 'MySQL',
			6379: 'Redis',
		};
		
		const wellKnownService = wellKnownPorts[portNumber];
		const isDefaultPort = !!wellKnownService;
		
		// Analyze conflict
		let hasConflict = false;
		
		if (inUse) {
			hasConflict = true;
			
			if (wellKnownService) {
				conflictType = 'well_known_port_conflict';
				severity = 'high';
				description = `Port ${portNumber} is already in use. This is the default port for ${wellKnownService}.`;
				suggestedActions.push(`Stop the existing ${wellKnownService} service`);
				suggestedActions.push(`Use an alternative port (e.g., ${portNumber + 1})`);
				
				if (portNumber >= 3000 && portNumber <= 5500) {
					// Development server port
					suggestedActions.push('Check if another development server is running');
					suggestedActions.push('Kill the process or use a different port');
				}
			} else {
				conflictType = 'port_already_in_use';
				severity = 'medium';
				description = `Port ${portNumber} is occupied by another process.`;
				suggestedActions.push(`Kill the process using port ${portNumber}`);
				suggestedActions.push(`Use an alternative port`);
				
				if (os.platform() === 'win32') {
					if (processInfo) {
						const pidMatch = processInfo.match(/(\d+)$/);
						if (pidMatch) {
							suggestedActions.push(`Command: taskkill /PID ${pidMatch[1]} /F`);
						}
					}
				} else {
					suggestedActions.push(`Command: kill $(lsof -t -i:${portNumber})`);
				}
			}
		} else {
			// Port is available
			if (wellKnownService && processName) {
				// Trying to use a well-known port for a different service
				if (!processName.toLowerCase().includes(wellKnownService.toLowerCase())) {
					hasConflict = true;
					conflictType = 'non_standard_service_on_known_port';
					severity = 'low';
					description = `Port ${portNumber} is typically used for ${wellKnownService}, but you're using it for ${processName}.`;
					suggestedActions.push('Consider using a different port to avoid confusion');
					suggestedActions.push(`Standard port for ${wellKnownService} is ${portNumber}`);
				}
			}
		}
		
		return {
			inUse,
			hasConflict,
			conflictType,
			severity,
			description,
			suggestedActions,
			processInfo,
			wellKnownService,
			isDefaultPort
		};
	}

	private async openBrowserToPort(portNumber: number, urlPath?: string): Promise<string> {
		const url = `http://localhost:${portNumber}${urlPath || ''}`;
		await vscode.env.openExternal(vscode.Uri.parse(url));
		return `Opened browser to ${url}`;
	}

	private async openExternalToPort(portNumber: number, urlPath?: string): Promise<string> {
		return this.openBrowserToPort(portNumber, urlPath);
	}

	private async getPortAttribute(portNumber: number, attributeName: string): Promise<string> {
		return `Attribute '${attributeName}' for port ${portNumber}: (not implemented)`;
	}

	private async setPortAttribute(portNumber: number, attributeName: string, attributeValue: string): Promise<string> {
		return `Set attribute '${attributeName}' to '${attributeValue}' for port ${portNumber}`;
	}

	// ============================================================================
	// Output Analyzer Execution
	// ============================================================================

	private async executeOutputAnalyzer(): Promise<ToolResponseV2> {
		const { input, say, ask, updateAsk } = this.params;
		const action = input.outputAnalyzerAction || 'search';

		// Ask for approval
		const { response } = await ask(
			'tool',
			{
				tool: {
					tool: 'terminal',
					panelType: 'output-analyzer',
					action,
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
						tool: 'terminal',
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
					tool: 'terminal',
					approvalState: 'loading',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		try {
			let result = '';

			switch (action) {
				case 'search':
					result = await this.searchOutputs(input);
					break;

				case 'analyze':
					result = await this.analyzeOutputs(input);
					break;

				case 'filter':
					result = await this.filterOutputs(input);
					break;

				case 'getHistory':
					result = await this.getOutputHistory(input);
					break;

				case 'clearHistory':
					result = await this.clearOutputHistory(input);
					break;

				case 'getStatistics':
					result = await this.getOutputStatistics(input);
					break;

				case 'exportOutputs':
					result = await this.exportOutputs(input);
					break;

				default:
					throw new Error(`Unknown output analyzer action: ${action}`);
			}

			const output = `<output_analyzer_result>
<status>success</status>
<action>${action}</action>
<result>${this.escapeXml(result)}</result>
</output_analyzer_result>`;

			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'terminal',
						output,
						approvalState: 'approved',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);

			return this.toolResponse('success', output);
		} catch (error) {
			const errorMsg = `<output_analyzer_result>
<status>error</status>
<action>${action}</action>
<error>${this.escapeXml(error instanceof Error ? error.message : String(error))}</error>
</output_analyzer_result>`;

			await updateAsk(
				'tool',
				{
					tool: {
						tool: 'terminal',
						output: errorMsg,
						approvalState: 'error',
						ts: this.ts,
						isSubMsg: this.params.isSubMsg,
					},
				},
				this.ts
			);

			await say('error', `Output analyzer operation failed: ${error instanceof Error ? error.message : String(error)}`);
			return this.toolResponse('error', errorMsg);
		}
	}

	// ============================================================================
	// Output Analyzer Helper Methods
	// ============================================================================

	private async searchOutputs(input: any): Promise<string> {
		const analyzer = getGlobalAnalyzer();
		
		// Parse time range
		const timeRange = this.parseTimeRange(input.timeRange, input.customTimeStart, input.customTimeEnd);

		// Perform search
		const results = analyzer.search({
			query: input.searchQuery,
			mode: input.searchMode || 'keyword',
			pattern: input.searchPattern,
			customPattern: input.customPattern,
			caseSensitive: input.caseSensitive || false,
			severity: input.outputSeverity,
			source: input.outputSource,
			terminalName: input.terminalNameFilter,
			timeRange,
			maxResults: input.maxResults || 100,
			includeContext: input.includeContext || false,
			contextLines: input.contextLines || 3,
		});

		// Format results
		const formatted = {
			totalResults: results.length,
			results: results.slice(0, 20).map(r => ({
				terminalName: r.output.terminalName,
				timestamp: r.output.timestamp,
				severity: r.output.severity,
				matchCount: r.matches.length,
				content: r.output.content.substring(0, 200) + (r.output.content.length > 200 ? '...' : ''),
				matches: r.matches.slice(0, 5).map(m => ({
					line: m.line,
					column: m.column,
					text: m.text,
				})),
				contextBefore: r.contextBefore,
				contextAfter: r.contextAfter,
			})),
		};

		return JSON.stringify(formatted, null, 2);
	}

	private async analyzeOutputs(input: any): Promise<string> {
		const analyzer = getGlobalAnalyzer();
		
		// Parse time range
		const timeRange = this.parseTimeRange(input.timeRange, input.customTimeStart, input.customTimeEnd);

		// Perform analysis
		const analysis = analyzer.analyze({
			timeRange,
			terminalName: input.terminalNameFilter,
			detectPatterns: input.detectPatterns !== false,
			groupByTerminal: input.groupByTerminal || false,
		});

		// Enhanced pattern recognition
		const enhancedPatterns = this.enhancePatternRecognition(analysis);

		// Format results with AI-friendly structure
		const formatted = {
			summary: {
				totalOutputs: analysis.totalOutputs,
				errorCount: analysis.errorCount,
				warningCount: analysis.warningCount,
				successCount: analysis.successCount,
			},
			patterns: analysis.patterns.slice(0, 10),
			enhanced_patterns: enhancedPatterns,
			timeline: analysis.timeline.slice(0, 50),
			byTerminal: Array.from(analysis.byTerminal.entries()).map(([name, stats]) => ({
				name,
				...stats,
			})),
		};

		return JSON.stringify(formatted, null, 2);
	}
	
	/**
	 * Enhanced pattern recognition for AI-friendly output analysis
	 */
	private enhancePatternRecognition(analysis: any): {
		json_detected: boolean;
		json_count: number;
		xml_detected: boolean;
		xml_count: number;
		urls_detected: boolean;
		urls: string[];
		file_paths_detected: boolean;
		file_paths: string[];
		api_calls_detected: boolean;
		api_calls: string[];
		error_patterns: string[];
		success_indicators: string[];
	} {
		const result = {
			json_detected: false,
			json_count: 0,
			xml_detected: false,
			xml_count: 0,
			urls_detected: false,
			urls: [] as string[],
			file_paths_detected: false,
			file_paths: [] as string[],
			api_calls_detected: false,
			api_calls: [] as string[],
			error_patterns: [] as string[],
			success_indicators: [] as string[],
		};

		// Sample recent outputs for pattern recognition
		const recentOutputs = analysis.timeline.slice(0, 100);
		
		for (const output of recentOutputs) {
			const content = output.content || '';
			
			// JSON detection
			const jsonMatches = content.match(/\{[\s\S]*?\}|\[[\s\S]*?\]/g);
			if (jsonMatches && jsonMatches.length > 0) {
				result.json_detected = true;
				result.json_count += jsonMatches.length;
			}
			
			// XML detection
			const xmlMatches = content.match(/<[a-zA-Z][^>]*>[\s\S]*?<\/[a-zA-Z][^>]*>/g);
			if (xmlMatches && xmlMatches.length > 0) {
				result.xml_detected = true;
				result.xml_count += xmlMatches.length;
			}
			
			// URL detection
			const urlMatches = content.match(/https?:\/\/[^\s]+/g);
			if (urlMatches && urlMatches.length > 0) {
				result.urls_detected = true;
				result.urls.push(...urlMatches.slice(0, 10));
			}
			
			// File path detection (Unix and Windows)
			const filePathMatches = content.match(/(?:[A-Za-z]:\\|\/)[^\s]+\.(js|ts|json|py|java|cpp|h|css|html|md|txt|log)/g);
			if (filePathMatches && filePathMatches.length > 0) {
				result.file_paths_detected = true;
				result.file_paths.push(...filePathMatches.slice(0, 10));
			}
			
			// API call detection (GET, POST, etc.)
			const apiCallMatches = content.match(/(GET|POST|PUT|DELETE|PATCH)\s+\/[^\s]+/g);
			if (apiCallMatches && apiCallMatches.length > 0) {
				result.api_calls_detected = true;
				result.api_calls.push(...apiCallMatches.slice(0, 10));
			}
			
			// Error pattern detection
			if (content.match(/error|fail|exception|crash|fatal/i)) {
				const errorKeywords = content.match(/(error|fail|exception|crash|fatal)[^\n]*/gi);
				if (errorKeywords) {
					result.error_patterns.push(...errorKeywords.slice(0, 5));
				}
			}
			
			// Success indicator detection
			if (content.match(/success|pass|complete|done|✓|✔/i)) {
				const successKeywords = content.match(/(success|pass|complete|done|✓|✔)[^\n]*/gi);
				if (successKeywords) {
					result.success_indicators.push(...successKeywords.slice(0, 5));
				}
			}
		}
		
		// Deduplicate arrays
		result.urls = [...new Set(result.urls)].slice(0, 10);
		result.file_paths = [...new Set(result.file_paths)].slice(0, 10);
		result.api_calls = [...new Set(result.api_calls)].slice(0, 10);
		result.error_patterns = [...new Set(result.error_patterns)].slice(0, 10);
		result.success_indicators = [...new Set(result.success_indicators)].slice(0, 10);
		
		return result;
	}

	private async filterOutputs(input: any): Promise<string> {
		const analyzer = getGlobalAnalyzer();
		
		// Parse time range
		const timeRange = this.parseTimeRange(input.timeRange, input.customTimeStart, input.customTimeEnd);

		// Filter outputs
		const history = analyzer.getHistory({
			terminalName: input.terminalNameFilter,
			timeRange,
			maxResults: input.maxResults || 100,
		});

		// Apply severity filter
		let filtered = history;
		if (input.outputSeverity && input.outputSeverity !== 'all') {
			filtered = filtered.filter(o => o.severity === input.outputSeverity);
		}

		// Group if requested
		if (input.groupByTerminal) {
			const grouped = new Map<string, typeof filtered>();
			filtered.forEach(output => {
				const list = grouped.get(output.terminalName) || [];
				list.push(output);
				grouped.set(output.terminalName, list);
			});

			const formatted = Array.from(grouped.entries()).map(([name, outputs]) => ({
				terminalName: name,
				count: outputs.length,
				outputs: outputs.slice(0, 10).map(o => ({
					timestamp: o.timestamp,
					severity: o.severity,
					content: o.content.substring(0, 200) + (o.content.length > 200 ? '...' : ''),
				})),
			}));

			return JSON.stringify(formatted, null, 2);
		}

		// Format results
		const formatted = filtered.map(o => ({
			terminalName: o.terminalName,
			timestamp: o.timestamp,
			severity: o.severity,
			content: o.content.substring(0, 200) + (o.content.length > 200 ? '...' : ''),
		}));

		return JSON.stringify(formatted, null, 2);
	}

	private async getOutputHistory(input: any): Promise<string> {
		const analyzer = getGlobalAnalyzer();
		
		// Parse time range
		const timeRange = this.parseTimeRange(input.timeRange, input.customTimeStart, input.customTimeEnd);

		// Get history
		const history = analyzer.getHistory({
			terminalName: input.terminalNameFilter,
			timeRange,
			maxResults: input.maxResults || 100,
		});

		// Format results
		const formatted = history.map(o => ({
			id: o.id,
			terminalName: o.terminalName,
			terminalType: o.terminalType,
			timestamp: o.timestamp,
			severity: o.severity,
			content: o.content,
		}));

		return JSON.stringify(formatted, null, 2);
	}

	private async clearOutputHistory(input: any): Promise<string> {
		const analyzer = getGlobalAnalyzer();
		
		// Clear history
		const count = analyzer.clearHistory(input.terminalNameFilter);

		return `Cleared ${count} output(s)${input.terminalNameFilter ? ` from terminal matching '${input.terminalNameFilter}'` : ''}`;
	}

	private async getOutputStatistics(input: any): Promise<string> {
		const analyzer = getGlobalAnalyzer();
		
		// Parse time range
		const timeRange = this.parseTimeRange(input.timeRange, input.customTimeStart, input.customTimeEnd);

		// Get statistics
		const analysis = analyzer.analyze({
			timeRange,
			terminalName: input.terminalNameFilter,
			detectPatterns: input.analyzeErrors !== false || input.analyzeWarnings !== false,
			groupByTerminal: true,
		});

		// Format statistics
		const stats = {
			overview: {
				totalOutputs: analysis.totalOutputs,
				errorCount: analysis.errorCount,
				warningCount: analysis.warningCount,
				successCount: analysis.successCount,
				errorRate: analysis.totalOutputs > 0 ? (analysis.errorCount / analysis.totalOutputs * 100).toFixed(2) + '%' : '0%',
				warningRate: analysis.totalOutputs > 0 ? (analysis.warningCount / analysis.totalOutputs * 100).toFixed(2) + '%' : '0%',
			},
			topPatterns: analysis.patterns.slice(0, 5),
			terminalBreakdown: Array.from(analysis.byTerminal.entries()).map(([name, stats]) => ({
				terminalName: name,
				totalOutputs: stats.totalOutputs,
				errors: stats.errorCount,
				warnings: stats.warningCount,
				lastActivity: stats.lastActivity,
			})),
		};

		return JSON.stringify(stats, null, 2);
	}

	private async exportOutputs(input: any): Promise<string> {
		const analyzer = getGlobalAnalyzer();
		
		// Parse time range
		const timeRange = this.parseTimeRange(input.timeRange, input.customTimeStart, input.customTimeEnd);

		// Get outputs to export
		const outputs = analyzer.getHistory({
			terminalName: input.terminalNameFilter,
			timeRange,
			maxResults: input.maxResults,
		});

		// Export to specified format
		const exportData = analyzer.export(outputs, input.exportFormat || 'txt', {
			includeTimestamps: input.includeTimestamps !== false,
			includeMetadata: input.includeMetadata !== false,
		});

		// Write to file if path provided
		if (input.exportPath) {
			try {
				await fs.promises.writeFile(input.exportPath, exportData, 'utf-8');
				return `Exported ${outputs.length} output(s) to ${input.exportPath}`;
			} catch (error) {
				throw new Error(`Failed to write export file: ${error instanceof Error ? error.message : String(error)}`);
			}
		}

		// Return export data directly
		return exportData;
	}

	private parseTimeRange(
		timeRange?: string,
		customStart?: string,
		customEnd?: string
	): { start?: Date; end?: Date } | undefined {
		if (!timeRange || timeRange === 'all') {
			return undefined;
		}

		const now = new Date();

		if (timeRange === 'custom') {
			return {
				start: customStart ? new Date(customStart) : undefined,
				end: customEnd ? new Date(customEnd) : undefined,
			};
		}

		// Calculate time range
		let start: Date;
		switch (timeRange) {
			case 'last-minute':
				start = new Date(now.getTime() - 60 * 1000);
				break;
			case 'last-5-minutes':
				start = new Date(now.getTime() - 5 * 60 * 1000);
				break;
			case 'last-15-minutes':
				start = new Date(now.getTime() - 15 * 60 * 1000);
				break;
			case 'last-hour':
				start = new Date(now.getTime() - 60 * 60 * 1000);
				break;
			case 'last-day':
				start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
				break;
			case 'last-week':
				start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
				break;
			default:
				return undefined;
		}

		return { start, end: now };
	}
}
