import { z } from 'zod';

// ============================================================================
// Multi-in-One Terminal Tool Schema
// Unified terminal system supporting all VS Code panel features
// ============================================================================

/**
 * Panel Type - Different panel types in VS Code bottom panel
 */
export const PanelType = z.enum([
	'terminal',        // Standard terminal
	'debug-console',   // Debug console for debugging
	'output',          // Output channel
	'problems',        // Problems/diagnostics panel
	'ports',           // Port forwarding panel
	'output-analyzer', // Output analysis and search engine
]);

// ============================================================================
// Terminal Types
// ============================================================================

/**
 * Shell types - Standard shell environments
 */
export const ShellType = z.enum([
	// Unix/Linux shells
			'bash',
			'zsh',
			'fish',
			'sh',
	'ksh',
	'tcsh',
	'dash',
	
	// Windows shells
	'powershell',
	'powershell-core',     // pwsh (PowerShell 7+)
	'cmd',
	'git-bash',
	'wsl-bash',            // Windows Subsystem for Linux
	
	// Auto-detection
			'auto',
]);

/**
 * Terminal types - Different terminal environments
 */
export const TerminalType = z.enum([
	'integrated-terminal',  // Standard VS Code integrated terminal
	'external-terminal',    // External terminal window
	'javascript-debug',     // JavaScript Debug Terminal
	'python-debug',         // Python Debug Terminal
	'task-terminal',        // Task terminal (for VS Code tasks)
]);

/**
 * Terminal icon options - Visual identification
 */
export const TerminalIconType = z.enum([
	'terminal',
	'debug',
	'gear',
	'package',
	'rocket',
	'bug',
	'tools',
	'server',
	'database',
	'cloud',
]);

/**
 * Terminal color options - Terminal tab colors
 */
export const TerminalColorType = z.enum([
	'terminal.ansiBlack',
	'terminal.ansiRed',
	'terminal.ansiGreen',
	'terminal.ansiYellow',
	'terminal.ansiBlue',
	'terminal.ansiMagenta',
	'terminal.ansiCyan',
	'terminal.ansiWhite',
]);

/**
 * Terminal location - Where to show the terminal
 */
export const TerminalLocation = z.enum([
	'panel',    // Show in bottom panel
	'editor',   // Show in editor area
	'active',   // Use currently active location
]);

// ============================================================================
// Debug Console Types
// ============================================================================

/**
 * Debug Console action types
 */
export const DebugConsoleAction = z.enum([
	'evaluate',  // Evaluate expression
	'clear',     // Clear console
	'focus',     // Focus console
	'log',       // Log message
]);

/**
 * Evaluation context
 */
export const EvaluationContext = z.enum([
	'watch',
	'repl',
	'hover',
	'clipboard',
]);

/**
 * Debug configuration type
 */
export const DebugType = z.enum([
	'node',
	'python',
	'chrome',
	'edge',
	'java',
	'go',
	'php',
	'cpp',
	'rust',
]);

// ============================================================================
// Output Channel Types
// ============================================================================

/**
 * Output channel action types
 */
export const OutputChannelAction = z.enum([
	'create',
	'write',
	'writeLine',
	'append',
	'appendLine',
	'clear',
	'show',
	'hide',
	'dispose',
]);

/**
 * Output Channel Type
 */
export const OutputChannelType = z.enum([
	'standard',  // Standard output channel
	'log',       // Log output channel with structured logging
]);

/**
 * Log Level for log channels
 */
export const LogLevel = z.enum([
	'trace',
	'debug',
	'info',
	'warning',
	'error',
]);

// ============================================================================
// Problems Types
// ============================================================================

/**
 * Problems action types
 */
export const ProblemsAction = z.enum([
	'add',
	'addMultiple',
	'clear',
	'clearFile',
	'clearAll',
	'show',
	'get',
]);

/**
 * Problem Severity
 */
export const ProblemSeverity = z.enum([
	'error',
	'warning',
	'information',
	'hint',
]);

/**
 * Problem Source
 */
export const ProblemSource = z.enum([
	'typescript',
	'javascript',
	'eslint',
	'python',
	'java',
	'go',
	'rust',
	'custom',
]);

// ============================================================================
// Ports Types
// ============================================================================

/**
 * Ports action types
 */
export const PortsAction = z.enum([
	'forward',
	'stopForwarding',
	'list',
	'detect',
	'openBrowser',
	'openExternal',
	'getAttribute',
	'setAttribute',
]);

/**
 * Port Privacy Level
 */
export const PortPrivacy = z.enum([
	'public',  // Accessible from outside
	'private', // Only accessible locally
]);

/**
 * Port Protocol
 */
export const PortProtocol = z.enum([
	'http',
	'https',
	'ws',
	'wss',
	'tcp',
	'udp',
]);

/**
 * Port Status
 */
export const PortStatus = z.enum([
	'detected',   // Automatically detected
	'forwarded',  // Port forwarding active
	'stopped',    // Port forwarding stopped
	'failed',     // Port forwarding failed
]);

// ============================================================================
// Output Analyzer Types
// ============================================================================

/**
 * Output analyzer action types
 */
export const OutputAnalyzerAction = z.enum([
	'search',           // Search in outputs
	'analyze',          // Analyze output patterns
	'filter',           // Filter outputs
	'getHistory',       // Get output history
	'clearHistory',     // Clear output history
	'getStatistics',    // Get output statistics
	'exportOutputs',    // Export outputs to file
]);

/**
 * Search mode for output analysis
 */
export const SearchMode = z.enum([
	'keyword',      // Simple keyword search
	'regex',        // Regular expression
	'pattern',      // Predefined patterns (error, warning, etc.)
	'fuzzy',        // Fuzzy matching
	'exact',        // Exact match
]);

/**
 * Output severity level (auto-detected from patterns)
 */
export const OutputSeverity = z.enum([
	'error',        // Error messages
	'warning',      // Warning messages
	'info',         // Info messages
	'success',      // Success messages
	'debug',        // Debug messages
	'trace',        // Trace messages
	'all',          // All messages
]);

/**
 * Predefined search patterns
 */
export const SearchPattern = z.enum([
	'error',            // Error patterns: error, fail, exception, etc.
	'warning',          // Warning patterns: warn, caution, deprecated, etc.
	'success',          // Success patterns: success, done, complete, passed, etc.
	'build',            // Build patterns: compiling, building, bundling, etc.
	'test',             // Test patterns: test, spec, jest, mocha, etc.
	'network',          // Network patterns: http, request, response, etc.
	'file-operation',   // File operations: reading, writing, creating, etc.
	'git',              // Git patterns: commit, push, pull, merge, etc.
	'npm',              // NPM patterns: install, update, publish, etc.
	'docker',           // Docker patterns: container, image, volume, etc.
	'database',         // Database patterns: query, connection, migration, etc.
	'custom',           // Custom pattern (user-defined)
]);

/**
 * Time range for filtering outputs
 */
export const TimeRange = z.enum([
	'last-minute',
	'last-5-minutes',
	'last-15-minutes',
	'last-hour',
	'last-day',
	'last-week',
	'all',
	'custom',
]);

/**
 * Sort order for results
 */
export const SortOrder = z.enum([
	'newest-first',     // Most recent first
	'oldest-first',     // Oldest first
	'relevance',        // Most relevant first
	'severity',         // By severity level
]);

/**
 * Output source filter
 */
export const OutputSource = z.enum([
	'terminal',
	'debug-console',
	'output-channel',
	'all',
]);

// ============================================================================
// Main Schema - Multi-in-One Terminal Tool
// ============================================================================

/**
 * Main terminal tool schema - Universal terminal and panel management
 * Supports all VS Code panel features in one unified tool
 */
const schema = z.object({
	// ========================================
	// Core Panel Configuration
	// ========================================
	panelType: PanelType
		.optional()
		.describe('Type of panel to interact with. Defaults to "terminal".'),
	
	action: z
		.string()
		.optional()
		.describe('Action to perform (context-specific based on panelType)'),
	
	// ========================================
	// Terminal Configuration
	// ========================================
	
	// Basic command execution
	command: z
		.string()
		.optional()
		.describe('The command to execute in the terminal'),
	
	// Terminal type configuration
	terminalType: TerminalType
		.optional()
		.describe('Type of terminal to use. Defaults to "integrated-terminal".'),
	
	shell: ShellType
		.optional()
		.describe(
			"The shell to use for execution. 'auto' will detect the system default. Defaults to 'auto'."
		),
	
	// Working directory and environment
	workingDirectory: z
		.string()
		.optional()
		.describe(
			'Working directory for command execution. Defaults to workspace root.'
		),
	
	environmentVariables: z
		.record(z.string())
		.optional()
		.describe('Environment variables to set for the command execution.'),
	
	// Execution options
	executionTimeout: z
		.number()
		.optional()
		.describe(
			'Maximum execution time in milliseconds. Defaults to 30000 (30 seconds).'
		),
	
	shouldCaptureOutput: z
		.boolean()
		.optional()
		.describe(
			'Whether to capture and return command output. Defaults to true.'
		),
	
	shouldPreFilterOutput: z
		.boolean()
		.optional()
		.describe(
			'🤖 AI-controlled intelligent output pre-filtering. When true, automatically filters output to show only important information (errors, warnings, key events). When false, shows complete output. AI should decide based on command type: enable for verbose commands (npm install, build), disable for simple commands (ls, git status). Defaults to AI decision.'
		),
	
	isInteractive: z
		.boolean()
		.optional()
		.describe(
			'Whether to run in interactive mode (requires user input). Defaults to false.'
		),
	
	// Terminal session management
	terminalName: z
		.string()
		.optional()
		.describe(
			'Name for the terminal session. Useful for tracking multiple terminals.'
		),
	
	shouldReuseTerminal: z
		.boolean()
		.optional()
		.describe(
			'Whether to reuse an existing terminal with the same name. Defaults to false.'
		),
	
	shouldAutoCloseTerminal: z
		.boolean()
		.optional()
		.describe(
			'Whether to automatically close terminal after successful execution. Defaults to false.'
		),
	
	// Terminal appearance
	terminalIcon: TerminalIconType
		.optional()
		.describe('Icon to display for the terminal tab.'),
	
	terminalColor: TerminalColorType
		.optional()
		.describe('Color theme for the terminal tab.'),
	
	terminalLocation: TerminalLocation
		.optional()
		.describe('Where to show the terminal. Defaults to "panel".'),
	
	// Terminal display options
	shouldShowTerminal: z
		.boolean()
		.optional()
		.describe(
			'Whether to show the terminal when executing command. Defaults to true.'
		),
	
	shouldPreserveFocus: z
		.boolean()
		.optional()
		.describe(
			'Whether to preserve focus when showing terminal. Defaults to false.'
		),
	
	// Advanced options
	strictEnvironmentVariables: z
		.boolean()
		.optional()
		.describe(
			'Whether to use strict environment isolation (no inheritance). Defaults to false.'
		),
	
	shellArguments: z
		.array(z.string())
		.optional()
		.describe('Additional arguments to pass to the shell executable.'),
	
	// ========================================
	// Debug Console Configuration
	// ========================================
	
	debugConsoleAction: DebugConsoleAction
		.optional()
		.describe('Action to perform in debug console'),
	
	expression: z
		.string()
		.optional()
		.describe('Expression to evaluate in debug context'),
	
	debugSessionName: z
		.string()
		.optional()
		.describe('Name of the debug session to use'),
	
	debugSessionId: z
		.string()
		.optional()
		.describe('ID of the debug session to use'),
	
	evaluationContext: EvaluationContext
		.optional()
		.describe('Context for expression evaluation'),
	
	frameId: z
		.number()
		.optional()
		.describe('Stack frame ID for evaluation'),
	
	logLevel: LogLevel
		.optional()
		.describe('Log level for logging'),
	
	// Debug configuration
	debugConfiguration: z
		.object({
			type: DebugType.describe('Debug type'),
			request: z.enum(['launch', 'attach']).describe('Debug request type'),
			program: z.string().optional().describe('Program to debug'),
			args: z.array(z.string()).optional().describe('Program arguments'),
			port: z.number().optional().describe('Debug port'),
			stopOnEntry: z.boolean().optional().describe('Stop on entry point'),
		})
		.optional()
		.describe('Configuration for debug terminals'),
	
	// ========================================
	// Output Channel Configuration
	// ========================================
	
	outputChannelAction: OutputChannelAction
		.optional()
		.describe('Action to perform on output channel'),
	
	channelName: z
		.string()
		.optional()
		.describe('Name of the output channel'),
	
	channelType: OutputChannelType
		.optional()
		.describe('Type of output channel'),
	
	content: z
		.string()
		.optional()
		.describe('Content to write to the channel'),
	
	languageId: z
		.string()
		.optional()
		.describe('Language ID for syntax highlighting'),
	
	// ========================================
	// Problems Configuration
	// ========================================
	
	problemsAction: ProblemsAction
		.optional()
		.describe('Action to perform on problems'),
	
	collectionName: z
		.string()
		.optional()
		.describe('Name of the diagnostic collection'),
	
	filePath: z
		.string()
		.optional()
		.describe('Path to the file with problems'),
	
	problem: z
		.object({
			message: z.string().describe('Problem message'),
			severity: ProblemSeverity.describe('Problem severity level'),
			startLine: z.number().describe('Starting line number (0-based)'),
			startCharacter: z.number().describe('Starting character position (0-based)'),
			endLine: z.number().describe('Ending line number (0-based)'),
			endCharacter: z.number().describe('Ending character position (0-based)'),
			source: ProblemSource.optional().describe('Problem source'),
			code: z.union([z.string(), z.number()]).optional().describe('Error or warning code'),
			relatedInformation: z
				.array(
					z.object({
						filePath: z.string(),
						startLine: z.number(),
						startCharacter: z.number(),
						endLine: z.number(),
						endCharacter: z.number(),
						message: z.string(),
					})
				)
				.optional()
				.describe('Related diagnostic information'),
		})
		.optional()
		.describe('Problem details'),
	
	problems: z
		.array(
			z.object({
				filePath: z.string(),
				message: z.string(),
				severity: ProblemSeverity,
				startLine: z.number(),
				startCharacter: z.number(),
				endLine: z.number(),
				endCharacter: z.number(),
				source: ProblemSource.optional(),
				code: z.union([z.string(), z.number()]).optional(),
			})
		)
		.optional()
		.describe('Array of problems'),
	
	filterSeverity: ProblemSeverity
		.optional()
		.describe('Filter problems by severity'),
	
	filterSource: ProblemSource
		.optional()
		.describe('Filter problems by source'),
	
	// ========================================
	// Ports Configuration
	// ========================================
	
	portsAction: PortsAction
		.optional()
		.describe('Action to perform on ports'),
	
	portNumber: z
		.number()
		.optional()
		.describe('Port number to manage'),
	
	localPort: z
		.number()
		.optional()
		.describe('Local port number'),
	
	remotePort: z
		.number()
		.optional()
		.describe('Remote port number'),
	
	portLabel: z
		.string()
		.optional()
		.describe('Label/name for the port'),
	
	portProtocol: PortProtocol
		.optional()
		.describe('Protocol used by the port'),
	
	portPrivacy: PortPrivacy
		.optional()
		.describe('Privacy level for the port'),
	
	forwardingName: z
		.string()
		.optional()
		.describe('Name for the port forwarding configuration'),
	
	shouldAutoForward: z
		.boolean()
		.optional()
		.describe('Whether to automatically forward detected ports'),
	
	shouldAutoOpenBrowser: z
		.boolean()
		.optional()
		.describe('Whether to automatically open browser when forwarding'),
	
	processName: z
		.string()
		.optional()
		.describe('Process name to associate with the port'),
	
	commandLine: z
		.string()
		.optional()
		.describe('Command line that started the process'),
	
	urlPath: z
		.string()
		.optional()
		.describe('URL path to append when opening browser'),
	
	attributeName: z
		.string()
		.optional()
		.describe('Attribute name'),
	
	attributeValue: z
		.string()
		.optional()
		.describe('Attribute value'),
	
	filterStatus: PortStatus
		.optional()
		.describe('Filter ports by status'),
	
	filterProtocol: PortProtocol
		.optional()
		.describe('Filter ports by protocol'),
	
	// ========================================
	// Output Analyzer Configuration
	// ========================================
	
	outputAnalyzerAction: OutputAnalyzerAction
		.optional()
		.describe('Action to perform in output analyzer'),
	
	// Search configuration
	searchQuery: z
		.string()
		.optional()
		.describe('Search query string'),
	
	searchMode: SearchMode
		.optional()
		.describe('Search mode to use. Defaults to "keyword".'),
	
	searchPattern: SearchPattern
		.optional()
		.describe('Predefined search pattern'),
	
	customPattern: z
		.string()
		.optional()
		.describe('Custom regex pattern (when searchPattern is "custom")'),
	
	caseSensitive: z
		.boolean()
		.optional()
		.describe('Whether search is case sensitive. Defaults to false.'),
	
	// Filter configuration
	outputSeverity: OutputSeverity
		.optional()
		.describe('Filter by output severity level'),
	
	outputSource: OutputSource
		.optional()
		.describe('Filter by output source type'),
	
	terminalNameFilter: z
		.string()
		.optional()
		.describe('Filter by terminal name (supports wildcards)'),
	
	timeRange: TimeRange
		.optional()
		.describe('Time range for filtering outputs'),
	
	customTimeStart: z
		.string()
		.optional()
		.describe('Custom start time (ISO 8601 format, when timeRange is "custom")'),
	
	customTimeEnd: z
		.string()
		.optional()
		.describe('Custom end time (ISO 8601 format, when timeRange is "custom")'),
	
	// Result configuration
	maxResults: z
		.number()
		.optional()
		.describe('Maximum number of results to return. Defaults to 100.'),
	
	sortOrder: SortOrder
		.optional()
		.describe('Sort order for results. Defaults to "newest-first".'),
	
	includeContext: z
		.boolean()
		.optional()
		.describe('Include surrounding context lines. Defaults to false.'),
	
	contextLines: z
		.number()
		.optional()
		.describe('Number of context lines before and after match. Defaults to 3.'),
	
	highlightMatches: z
		.boolean()
		.optional()
		.describe('Highlight matching text in results. Defaults to true.'),
	
	// Analysis configuration
	analyzeErrors: z
		.boolean()
		.optional()
		.describe('Analyze and categorize error messages. Defaults to true.'),
	
	analyzeWarnings: z
		.boolean()
		.optional()
		.describe('Analyze and categorize warning messages. Defaults to true.'),
	
	detectPatterns: z
		.boolean()
		.optional()
		.describe('Automatically detect common patterns. Defaults to true.'),
	
	groupByTerminal: z
		.boolean()
		.optional()
		.describe('Group results by terminal. Defaults to false.'),
	
	// Export configuration
	exportPath: z
		.string()
		.optional()
		.describe('File path to export outputs'),
	
	exportFormat: z
		.enum(['json', 'txt', 'csv', 'html', 'markdown'])
		.optional()
		.describe('Export format. Defaults to "txt".'),
	
	includeTimestamps: z
		.boolean()
		.optional()
		.describe('Include timestamps in export. Defaults to true.'),
	
	includeMetadata: z
		.boolean()
		.optional()
		.describe('Include metadata (terminal name, severity) in export. Defaults to true.'),
	
	// ========================================
	// Common Options
	// ========================================
	
	message: z
		.string()
		.optional()
		.describe('Message text (context-specific)'),
	
	shouldShowPanel: z
		.boolean()
		.optional()
		.describe('Whether to show the panel. Defaults to true for terminal.'),
	
	// ========================================
	// Legacy Support (Deprecated)
	// ========================================
	
	cwd: z
		.string()
		.optional()
		.describe(
			'[DEPRECATED] Use workingDirectory instead. Working directory for command execution.'
		),
	
	timeout: z
		.number()
		.optional()
		.describe(
			'[DEPRECATED] Use executionTimeout instead. Maximum execution time in milliseconds.'
		),
	
	env: z
		.record(z.string())
		.optional()
		.describe('[DEPRECATED] Use environmentVariables instead. Environment variables to set.'),
	
	captureOutput: z
		.boolean()
		.optional()
		.describe(
			'[DEPRECATED] Use shouldCaptureOutput instead. Whether to capture and return command output.'
		),
	
	interactive: z
		.boolean()
		.optional()
		.describe(
			'[DEPRECATED] Use isInteractive instead. Whether to run in interactive mode.'
		),
	
	reuseTerminal: z
		.boolean()
		.optional()
		.describe(
			'[DEPRECATED] Use shouldReuseTerminal instead. Whether to reuse an existing terminal.'
		),
});

// ============================================================================
// Examples - Multi-in-One Terminal Tool
// ============================================================================

const examples = [
	// ========================================
	// Terminal Examples
	// ========================================
	
	// Basic terminal command
	`<tool name="terminal">
  <panelType>terminal</panelType>
  <command>npm install</command>
</tool>`,

	// PowerShell command
	`<tool name="terminal">
  <panelType>terminal</panelType>
  <command>Get-Process | Where-Object {$_.CPU -gt 100}</command>
  <shell>powershell</shell>
</tool>`,

	// Working directory
	`<tool name="terminal">
  <panelType>terminal</panelType>
  <command>git status</command>
  <shell>bash</shell>
  <workingDirectory>/path/to/project</workingDirectory>
</tool>`,

	// JavaScript Debug Terminal
	`<tool name="terminal">
  <panelType>terminal</panelType>
  <terminalType>javascript-debug</terminalType>
  <command>node --inspect app.js</command>
  <terminalName>Debug: App</terminalName>
  <terminalIcon>bug</terminalIcon>
  <terminalColor>terminal.ansiRed</terminalColor>
  <debugConfiguration>
    <type>node</type>
    <request>launch</request>
    <program>app.js</program>
    <stopOnEntry>true</stopOnEntry>
  </debugConfiguration>
</tool>`,

	// Python Debug Terminal
	`<tool name="terminal">
  <panelType>terminal</panelType>
  <terminalType>python-debug</terminalType>
  <command>python -m debugpy --listen 5678 main.py</command>
  <terminalName>Debug: Python App</terminalName>
  <terminalIcon>bug</terminalIcon>
  <debugConfiguration>
    <type>python</type>
    <request>launch</request>
    <program>main.py</program>
    <port>5678</port>
  </debugConfiguration>
</tool>`,

	// Dev server with custom environment
	`<tool name="terminal">
  <panelType>terminal</panelType>
  <command>npm run dev</command>
  <terminalName>Dev Server</terminalName>
  <terminalIcon>server</terminalIcon>
  <terminalColor>terminal.ansiGreen</terminalColor>
  <shouldReuseTerminal>true</shouldReuseTerminal>
  <environmentVariables>
    <NODE_ENV>development</NODE_ENV>
    <PORT>3000</PORT>
  </environmentVariables>
</tool>`,

	// WSL bash on Windows
	`<tool name="terminal">
  <panelType>terminal</panelType>
  <command>ls -la</command>
  <shell>wsl-bash</shell>
  <workingDirectory>/mnt/c/projects</workingDirectory>
</tool>`,

	// 🆕 Intelligent pre-filtering for verbose commands
	`<tool name="terminal">
  <panelType>terminal</panelType>
  <command>npm install</command>
  <shouldPreFilterOutput>true</shouldPreFilterOutput>
  <terminalName>NPM Install</terminalName>
</tool>`,

	// 🆕 No filtering for simple commands
	`<tool name="terminal">
  <panelType>terminal</panelType>
  <command>git status</command>
  <shouldPreFilterOutput>false</shouldPreFilterOutput>
</tool>`,

	// 🆕 AI-controlled filtering for build commands
	`<tool name="terminal">
  <panelType>terminal</panelType>
  <command>npm run build</command>
  <shouldPreFilterOutput>true</shouldPreFilterOutput>
  <terminalIcon>gear</terminalIcon>
</tool>`,

	// ========================================
	// Debug Console Examples
	// ========================================
	
	// Evaluate expression in debug console
	`<tool name="terminal">
  <panelType>debug-console</panelType>
  <debugConsoleAction>evaluate</debugConsoleAction>
  <expression>myVariable</expression>
</tool>`,

	// Log to debug console
	`<tool name="terminal">
  <panelType>debug-console</panelType>
  <debugConsoleAction>log</debugConsoleAction>
  <message>Checkpoint reached</message>
  <logLevel>info</logLevel>
</tool>`,

	// Clear debug console
	`<tool name="terminal">
  <panelType>debug-console</panelType>
  <debugConsoleAction>clear</debugConsoleAction>
</tool>`,

	// ========================================
	// Output Channel Examples
	// ========================================
	
	// Create output channel
	`<tool name="terminal">
  <panelType>output</panelType>
  <outputChannelAction>create</outputChannelAction>
  <channelName>Build Output</channelName>
  <channelType>standard</channelType>
</tool>`,

	// Write to output channel
	`<tool name="terminal">
  <panelType>output</panelType>
  <outputChannelAction>writeLine</outputChannelAction>
  <channelName>Build Output</channelName>
  <content>Starting build process...</content>
</tool>`,

	// Log with level
	`<tool name="terminal">
  <panelType>output</panelType>
  <outputChannelAction>writeLine</outputChannelAction>
  <channelName>Application Logs</channelName>
  <channelType>log</channelType>
  <content>Application started successfully</content>
  <logLevel>info</logLevel>
</tool>`,

	// Show output channel
	`<tool name="terminal">
  <panelType>output</panelType>
  <outputChannelAction>show</outputChannelAction>
  <channelName>Build Output</channelName>
  <shouldPreserveFocus>false</shouldPreserveFocus>
</tool>`,

	// ========================================
	// Problems Examples
	// ========================================
	
	// Add single problem
	`<tool name="terminal">
  <panelType>problems</panelType>
  <problemsAction>add</problemsAction>
  <collectionName>custom-linter</collectionName>
  <filePath>/path/to/file.ts</filePath>
  <problem>
    <message>Variable 'x' is never used</message>
    <severity>warning</severity>
    <startLine>10</startLine>
    <startCharacter>4</startCharacter>
    <endLine>10</endLine>
    <endCharacter>5</endCharacter>
    <source>custom</source>
    <code>unused-var</code>
  </problem>
</tool>`,

	// Add multiple problems
	`<tool name="terminal">
  <panelType>problems</panelType>
  <problemsAction>addMultiple</problemsAction>
  <collectionName>typescript</collectionName>
  <problems>
    <problem>
      <filePath>/path/to/file1.ts</filePath>
      <message>Cannot find name 'foo'</message>
      <severity>error</severity>
      <startLine>5</startLine>
      <startCharacter>10</startCharacter>
      <endLine>5</endLine>
      <endCharacter>13</endCharacter>
      <source>typescript</source>
      <code>2304</code>
    </problem>
  </problems>
</tool>`,

	// Clear problems
	`<tool name="terminal">
  <panelType>problems</panelType>
  <problemsAction>clearAll</problemsAction>
  <collectionName>typescript</collectionName>
</tool>`,

	// Show problems panel
	`<tool name="terminal">
  <panelType>problems</panelType>
  <problemsAction>show</problemsAction>
</tool>`,

	// ========================================
	// Ports Examples
	// ========================================
	
	// Forward a port
	`<tool name="terminal">
  <panelType>ports</panelType>
  <portsAction>forward</portsAction>
  <localPort>3000</localPort>
  <portLabel>Development Server</portLabel>
  <portProtocol>http</portProtocol>
  <portPrivacy>private</portPrivacy>
  <shouldAutoOpenBrowser>true</shouldAutoOpenBrowser>
</tool>`,

	// Stop forwarding
	`<tool name="terminal">
  <panelType>ports</panelType>
  <portsAction>stopForwarding</portsAction>
  <portNumber>3000</portNumber>
</tool>`,

	// List all ports
	`<tool name="terminal">
  <panelType>ports</panelType>
  <portsAction>list</portsAction>
</tool>`,

	// Open browser to port
	`<tool name="terminal">
  <panelType>ports</panelType>
  <portsAction>openBrowser</portsAction>
  <portNumber>3000</portNumber>
  <urlPath>/api/docs</urlPath>
</tool>`,

	// Detect port
	`<tool name="terminal">
  <panelType>ports</panelType>
  <portsAction>detect</portsAction>
  <portNumber>3000</portNumber>
  <processName>node</processName>
  <portLabel>Node.js Server</portLabel>
</tool>`,

	// ========================================
	// Output Analyzer Examples
	// ========================================
	
	// Search for errors
	`<tool name="terminal">
  <panelType>output-analyzer</panelType>
  <outputAnalyzerAction>search</outputAnalyzerAction>
  <searchPattern>error</searchPattern>
  <outputSource>all</outputSource>
  <timeRange>last-hour</timeRange>
  <maxResults>50</maxResults>
</tool>`,

	// Search for specific keyword
	`<tool name="terminal">
  <panelType>output-analyzer</panelType>
  <outputAnalyzerAction>search</outputAnalyzerAction>
  <searchQuery>connection failed</searchQuery>
  <searchMode>keyword</searchMode>
  <caseSensitive>false</caseSensitive>
  <includeContext>true</includeContext>
  <contextLines>3</contextLines>
</tool>`,

	// Search with regex
	`<tool name="terminal">
  <panelType>output-analyzer</panelType>
  <outputAnalyzerAction>search</outputAnalyzerAction>
  <searchQuery>ERROR:\\s+\\[.*\\]</searchQuery>
  <searchMode>regex</searchMode>
  <highlightMatches>true</highlightMatches>
</tool>`,

	// Search for warnings in specific terminal
	`<tool name="terminal">
  <panelType>output-analyzer</panelType>
  <outputAnalyzerAction>search</outputAnalyzerAction>
  <searchPattern>warning</searchPattern>
  <terminalNameFilter>Dev Server</terminalNameFilter>
  <outputSeverity>warning</outputSeverity>
  <sortOrder>newest-first</sortOrder>
</tool>`,

	// Analyze build output
	`<tool name="terminal">
  <panelType>output-analyzer</panelType>
  <outputAnalyzerAction>analyze</outputAnalyzerAction>
  <searchPattern>build</searchPattern>
  <analyzeErrors>true</analyzeErrors>
  <analyzeWarnings>true</analyzeWarnings>
  <detectPatterns>true</detectPatterns>
</tool>`,

	// Filter by severity
	`<tool name="terminal">
  <panelType>output-analyzer</panelType>
  <outputAnalyzerAction>filter</outputAnalyzerAction>
  <outputSeverity>error</outputSeverity>
  <timeRange>last-15-minutes</timeRange>
  <groupByTerminal>true</groupByTerminal>
</tool>`,

	// Get output history
	`<tool name="terminal">
  <panelType>output-analyzer</panelType>
  <outputAnalyzerAction>getHistory</outputAnalyzerAction>
  <terminalNameFilter>Build*</terminalNameFilter>
  <timeRange>last-day</timeRange>
  <maxResults>100</maxResults>
</tool>`,

	// Get statistics
	`<tool name="terminal">
  <panelType>output-analyzer</panelType>
  <outputAnalyzerAction>getStatistics</outputAnalyzerAction>
  <timeRange>last-hour</timeRange>
  <analyzeErrors>true</analyzeErrors>
  <analyzeWarnings>true</analyzeWarnings>
</tool>`,

	// Export outputs to file
	`<tool name="terminal">
  <panelType>output-analyzer</panelType>
  <outputAnalyzerAction>exportOutputs</outputAnalyzerAction>
  <exportPath>./logs/terminal-output.json</exportPath>
  <exportFormat>json</exportFormat>
  <includeTimestamps>true</includeTimestamps>
  <includeMetadata>true</includeMetadata>
  <timeRange>last-hour</timeRange>
</tool>`,

	// Search for success patterns
	`<tool name="terminal">
  <panelType>output-analyzer</panelType>
  <outputAnalyzerAction>search</outputAnalyzerAction>
  <searchPattern>success</searchPattern>
  <outputSeverity>success</outputSeverity>
  <timeRange>all</timeRange>
</tool>`,

	// Search npm patterns
	`<tool name="terminal">
  <panelType>output-analyzer</panelType>
  <outputAnalyzerAction>search</outputAnalyzerAction>
  <searchPattern>npm</searchPattern>
  <terminalNameFilter>*install*</terminalNameFilter>
</tool>`,

	// Custom pattern search
	`<tool name="terminal">
  <panelType>output-analyzer</panelType>
  <outputAnalyzerAction>search</outputAnalyzerAction>
  <searchPattern>custom</searchPattern>
  <customPattern>Test.*passed|Test.*failed</customPattern>
  <searchMode>regex</searchMode>
  <includeContext>true</includeContext>
</tool>`,
];

// ============================================================================
// Exports
// ============================================================================

export const terminalTool = {
	schema: {
		name: 'terminal',
		schema,
	},
	examples,
};

export type TerminalToolParams = {
	name: 'terminal';
	input: z.infer<typeof schema>;
};

export type TerminalToolInput = z.infer<typeof schema>;
export type PanelTypeValue = z.infer<typeof PanelType>;
export type ShellTypeValue = z.infer<typeof ShellType>;
export type TerminalTypeValue = z.infer<typeof TerminalType>;
export type TerminalIconTypeValue = z.infer<typeof TerminalIconType>;
export type TerminalColorTypeValue = z.infer<typeof TerminalColorType>;
export type TerminalLocationValue = z.infer<typeof TerminalLocation>;
export type DebugConsoleActionValue = z.infer<typeof DebugConsoleAction>;
export type EvaluationContextValue = z.infer<typeof EvaluationContext>;
export type DebugTypeValue = z.infer<typeof DebugType>;
export type OutputChannelActionValue = z.infer<typeof OutputChannelAction>;
export type OutputChannelTypeValue = z.infer<typeof OutputChannelType>;
export type LogLevelValue = z.infer<typeof LogLevel>;
export type ProblemsActionValue = z.infer<typeof ProblemsAction>;
export type ProblemSeverityValue = z.infer<typeof ProblemSeverity>;
export type ProblemSourceValue = z.infer<typeof ProblemSource>;
export type PortsActionValue = z.infer<typeof PortsAction>;
export type PortPrivacyValue = z.infer<typeof PortPrivacy>;
export type PortProtocolValue = z.infer<typeof PortProtocol>;
export type PortStatusValue = z.infer<typeof PortStatus>;
export type OutputAnalyzerActionValue = z.infer<typeof OutputAnalyzerAction>;
export type SearchModeValue = z.infer<typeof SearchMode>;
export type OutputSeverityValue = z.infer<typeof OutputSeverity>;
export type SearchPatternValue = z.infer<typeof SearchPattern>;
export type TimeRangeValue = z.infer<typeof TimeRange>;
export type SortOrderValue = z.infer<typeof SortOrder>;
export type OutputSourceValue = z.infer<typeof OutputSource>;
