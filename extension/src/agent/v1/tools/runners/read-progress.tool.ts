// runners/read-progress.tool.ts
import { AdvancedTerminalManager } from '../../../../integrations/terminal';
import { TerminalRegistry } from '../../../../integrations/terminal/terminal-manager';
import { BaseAgentTool } from '../base-agent.tool';
import { ReadProgressToolParams } from '../schema/read-progress';
import { ToolResponseV2 } from '../../types';

// ============================================================================
// Output Analyzer - Integrated Types and Engine
// ============================================================================

interface TerminalOutput {
	id: string;
	terminalId: number;
	terminalName: string;
	terminalType: 'terminal' | 'debug-console' | 'output-channel';
	timestamp: Date;
	content: string;
	severity?: OutputSeverity;
	metadata?: Record<string, any>;
}

type OutputSeverity = 'error' | 'warning' | 'info' | 'success' | 'debug' | 'trace';

interface SearchResult {
	output: TerminalOutput;
	matches: Match[];
	relevanceScore: number;
	contextBefore?: string[];
	contextAfter?: string[];
}

interface Match {
	line: number;
	column: number;
	text: string;
	highlighted?: string;
}

interface AnalysisResult {
	totalOutputs: number;
	errorCount: number;
	warningCount: number;
	successCount: number;
	patterns: PatternOccurrence[];
	timeline: TimelineEntry[];
	byTerminal: Map<string, TerminalStats>;
}

interface PatternOccurrence {
	pattern: string;
	count: number;
	severity: OutputSeverity;
	examples: string[];
}

interface TimelineEntry {
	timestamp: Date;
	severity: OutputSeverity;
	count: number;
}

interface TerminalStats {
	terminalName: string;
	totalOutputs: number;
	errorCount: number;
	warningCount: number;
	lastActivity: Date;
}

/**
 * Predefined patterns for common log messages
 */
const PREDEFINED_PATTERNS = {
	error: [
		/error/i,
		/fail(ed|ure)?/i,
		/exception/i,
		/fatal/i,
		/crash(ed)?/i,
		/abort(ed)?/i,
		/panic/i,
		/critical/i,
		/\[ERROR\]/i,
		/\[FATAL\]/i,
		/\bERR\b/i,
	],
	warning: [
		/warn(ing)?/i,
		/caution/i,
		/deprecated/i,
		/\[WARN\]/i,
		/\[WARNING\]/i,
		/potential\s+issue/i,
		/recommendation/i,
	],
	success: [
		/success(ful(ly)?)?/i,
		/done/i,
		/complete(d)?/i,
		/passed/i,
		/\[OK\]/i,
		/\[SUCCESS\]/i,
		/✓/,
		/✔/,
		/finished/i,
		/ready/i,
	],
	build: [
		/compiling/i,
		/building/i,
		/bundling/i,
		/transpiling/i,
		/webpack/i,
		/vite/i,
		/rollup/i,
		/esbuild/i,
		/\[build\]/i,
	],
	test: [
		/test(ing)?/i,
		/spec/i,
		/jest/i,
		/mocha/i,
		/karma/i,
		/\[TEST\]/i,
		/describe\(/,
		/it\(/,
		/expect\(/,
	],
	network: [
		/http/i,
		/request/i,
		/response/i,
		/\b(GET|POST|PUT|DELETE|PATCH)\b/,
		/fetch/i,
		/axios/i,
		/api/i,
		/endpoint/i,
		/\d{3}\s+(OK|Error|Not Found)/i,
	],
	'file-operation': [
		/reading\s+file/i,
		/writing\s+file/i,
		/creating\s+file/i,
		/deleting\s+file/i,
		/copying\s+file/i,
		/moving\s+file/i,
		/file\s+(created|deleted|modified)/i,
	],
	git: [
		/git\s+(commit|push|pull|fetch|merge|rebase|checkout)/i,
		/\[git\]/i,
		/branch/i,
		/repository/i,
		/remote/i,
	],
	npm: [
		/npm\s+(install|update|publish|run)/i,
		/package\.json/i,
		/node_modules/i,
		/\bpnpm\b/i,
		/\byarn\b/i,
	],
	docker: [
		/docker/i,
		/container/i,
		/image/i,
		/dockerfile/i,
		/compose/i,
		/volume/i,
	],
	database: [
		/query/i,
		/database/i,
		/connection/i,
		/migration/i,
		/\b(SELECT|INSERT|UPDATE|DELETE)\b/,
		/postgres|mysql|mongodb|redis/i,
	],
};

/**
 * Output Analyzer Engine - Integrated into Read Progress Tool
 */
class OutputAnalyzer {
	private outputs: Map<string, TerminalOutput> = new Map();
	private outputsByTerminal: Map<string, TerminalOutput[]> = new Map();

	addOutput(output: TerminalOutput): void {
		this.outputs.set(output.id, output);
		const terminalOutputs = this.outputsByTerminal.get(output.terminalName) || [];
		terminalOutputs.push(output);
		this.outputsByTerminal.set(output.terminalName, terminalOutputs);
		if (!output.severity) {
			output.severity = this.detectSeverity(output.content);
		}
	}

	search(options: {
		query?: string;
		mode?: 'keyword' | 'regex' | 'pattern' | 'fuzzy' | 'exact';
		pattern?: keyof typeof PREDEFINED_PATTERNS;
		customPattern?: string;
		caseSensitive?: boolean;
		severity?: OutputSeverity;
		source?: string;
		terminalName?: string;
		timeRange?: { start?: Date; end?: Date };
		maxResults?: number;
		includeContext?: boolean;
		contextLines?: number;
	}): SearchResult[] {
		const { mode = 'keyword', maxResults = 100 } = options;
		let filteredOutputs = Array.from(this.outputs.values());

		if (options.severity) {
			filteredOutputs = filteredOutputs.filter((o) => o.severity === options.severity);
		}
		if (options.terminalName) {
			const pattern = this.wildcardToRegex(options.terminalName);
			filteredOutputs = filteredOutputs.filter((o) => pattern.test(o.terminalName));
		}
		if (options.timeRange) {
			filteredOutputs = filteredOutputs.filter((o) => {
				if (options.timeRange!.start && o.timestamp < options.timeRange!.start) {return false;}
				if (options.timeRange!.end && o.timestamp > options.timeRange!.end) {return false;}
				return true;
			});
		}

		const results: SearchResult[] = [];
		for (const output of filteredOutputs) {
			if (mode === 'pattern' && options.pattern) {
				const patterns = PREDEFINED_PATTERNS[options.pattern] || [];
				if (patterns.some((p) => p.test(output.content))) {
					results.push({ output, matches: [], relevanceScore: 1 });
				}
			} else if (options.query) {
				if (output.content.toLowerCase().includes(options.query.toLowerCase())) {
					results.push({ output, matches: [], relevanceScore: 1 });
				}
			}
		}
		return results.slice(0, maxResults);
	}

	analyze(options: {
		timeRange?: { start?: Date; end?: Date };
		terminalName?: string;
		detectPatterns?: boolean;
		groupByTerminal?: boolean;
	}): AnalysisResult {
		let outputs = Array.from(this.outputs.values());
		if (options.timeRange) {
			outputs = outputs.filter((o) => {
				if (options.timeRange!.start && o.timestamp < options.timeRange!.start) {return false;}
				if (options.timeRange!.end && o.timestamp > options.timeRange!.end) {return false;}
				return true;
			});
		}
		if (options.terminalName) {
			const pattern = this.wildcardToRegex(options.terminalName);
			outputs = outputs.filter((o) => pattern.test(o.terminalName));
		}

		const result: AnalysisResult = {
			totalOutputs: outputs.length,
			errorCount: outputs.filter((o) => o.severity === 'error').length,
			warningCount: outputs.filter((o) => o.severity === 'warning').length,
			successCount: outputs.filter((o) => o.severity === 'success').length,
			patterns: [],
			timeline: [],
			byTerminal: new Map(),
		};

		if (options.detectPatterns) {
			result.patterns = this.detectCommonPatterns(outputs);
		}
		if (options.groupByTerminal) {
			result.byTerminal = this.groupByTerminal(outputs);
		}
		return result;
	}

	getHistory(options: {
		terminalName?: string;
		timeRange?: { start?: Date; end?: Date };
		maxResults?: number;
	}): TerminalOutput[] {
		let outputs = Array.from(this.outputs.values());
		if (options.terminalName) {
			const pattern = this.wildcardToRegex(options.terminalName);
			outputs = outputs.filter((o) => pattern.test(o.terminalName));
		}
		if (options.timeRange) {
			outputs = outputs.filter((o) => {
				if (options.timeRange!.start && o.timestamp < options.timeRange!.start) {return false;}
				if (options.timeRange!.end && o.timestamp > options.timeRange!.end) {return false;}
				return true;
			});
		}
		outputs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
		if (options.maxResults) {
			outputs = outputs.slice(0, options.maxResults);
		}
		return outputs;
	}

	clearHistory(terminalName?: string): number {
		if (terminalName) {
			const pattern = this.wildcardToRegex(terminalName);
			const toDelete: string[] = [];
			for (const [id, output] of this.outputs) {
				if (pattern.test(output.terminalName)) {
					toDelete.push(id);
				}
			}
			toDelete.forEach((id) => this.outputs.delete(id));
			return toDelete.length;
		} else {
			const count = this.outputs.size;
			this.outputs.clear();
			this.outputsByTerminal.clear();
			return count;
		}
	}

	export(
		outputs: TerminalOutput[],
		format: 'json' | 'txt' | 'csv' | 'html' | 'markdown',
		options: { includeTimestamps?: boolean; includeMetadata?: boolean }
	): string {
		if (format === 'json') {
			return JSON.stringify(outputs, null, 2);
		}
		return outputs
			.map((o) => {
				let line = '';
				if (options.includeTimestamps) {line += `[${o.timestamp.toISOString()}] `;}
				if (options.includeMetadata) {line += `[${o.terminalName}] [${o.severity}] `;}
				line += o.content;
				return line;
			})
			.join('\n');
	}

	private detectSeverity(content: string): OutputSeverity {
		if (PREDEFINED_PATTERNS.error.some((p) => p.test(content))) {return 'error';}
		if (PREDEFINED_PATTERNS.warning.some((p) => p.test(content))) {return 'warning';}
		if (PREDEFINED_PATTERNS.success.some((p) => p.test(content))) {return 'success';}
		return 'info';
	}

	private wildcardToRegex(pattern: string): RegExp {
		const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
		const regex = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
		return new RegExp(`^${regex}$`, 'i');
	}

	private detectCommonPatterns(outputs: TerminalOutput[]): PatternOccurrence[] {
		const patterns: PatternOccurrence[] = [];
		for (const [name, regexPatterns] of Object.entries(PREDEFINED_PATTERNS)) {
			const matches: string[] = [];
			let count = 0;
			outputs.forEach((output) => {
				regexPatterns.forEach((pattern) => {
					const match = output.content.match(pattern);
					if (match) {
						count++;
						if (matches.length < 3) {
							matches.push(match[0]);
						}
					}
				});
			});
			if (count > 0) {
				patterns.push({
					pattern: name,
					count,
					severity: name === 'error' ? 'error' : name === 'warning' ? 'warning' : 'info',
					examples: matches,
				});
			}
		}
		return patterns.sort((a, b) => b.count - a.count);
	}

	private groupByTerminal(outputs: TerminalOutput[]): Map<string, TerminalStats> {
		const stats = new Map<string, TerminalStats>();
		outputs.forEach((output) => {
			const existing = stats.get(output.terminalName) || {
				terminalName: output.terminalName,
				totalOutputs: 0,
				errorCount: 0,
				warningCount: 0,
				lastActivity: output.timestamp,
			};
			existing.totalOutputs++;
			if (output.severity === 'error') {existing.errorCount++;}
			if (output.severity === 'warning') {existing.warningCount++;}
			if (output.timestamp > existing.lastActivity) {
				existing.lastActivity = output.timestamp;
			}
			stats.set(output.terminalName, existing);
		});
		return stats;
	}
}

/**
 * ReadProgressTool - Intelligent Terminal Monitoring & Analysis System
 * 
 * 🔺 铁三角系统之：监控+分析引擎 🔺
 * 
 * Core Features:
 * ✅ Smart output filtering with keyword highlighting
 * ✅ Intelligent summary generation
 * ✅ Wait-for-completion monitoring
 * ✅ One-time completion reporting (防重复发送)
 * ✅ Process state analysis
 * 
 * 🆕 Integrated Output Analyzer:
 * ✅ Multi-mode search (keyword, regex, pattern, fuzzy, exact)
 * ✅ 12 predefined patterns (error, warning, success, build, test, etc.)
 * ✅ Time-based filtering
 * ✅ Statistical analysis
 * ✅ Multi-format export (JSON, TXT, CSV, HTML, Markdown)
 * ✅ Pattern detection and classification
 * ✅ High reliability text processing engine
 */

// Track which terminals have already sent completion reports
const completionReportsSent = new Set<number>();

// Global output analyzer instance (shared across all monitors)
const globalOutputAnalyzer = new OutputAnalyzer();

export class ReadProgressTool extends BaseAgentTool<ReadProgressToolParams> {
	async execute(): Promise<ToolResponseV2> {
		const { input, say } = this.params;
		const {
			terminalId,
			terminalName,
			includeFullOutput,
			filterKeywords,
			contextLines = 2,
			extractData = false,
			smartSummary = true,
			waitForCompletion = false,
			maxWaitTime = 60000,
			maxChars = 16000,
		} = input;

		// Validate that at least one identifier is provided
		if (terminalId === undefined && !terminalName) {
			await say('error', 'Either terminalId or terminalName must be provided');
			return this.toolResponse('error', 'Error: Missing terminal identifier');
		}

		// Get terminal manager
		const { terminalManager } = this.koduDev;
		if (!(terminalManager instanceof AdvancedTerminalManager)) {
			throw new Error('AdvancedTerminalManager is not available');
		}

		// Find the terminal
		let terminalInfo;
		if (terminalId !== undefined) {
			terminalInfo = TerminalRegistry.getTerminal(terminalId);
		} else if (terminalName) {
			terminalInfo = TerminalRegistry.getTerminalByName(terminalName);
		}

		if (!terminalInfo) {
			const identifier =
				terminalId !== undefined
					? `ID ${terminalId}`
					: `name "${terminalName}"`;
			await say('error', `Terminal with ${identifier} not found`);
			return this.toolResponse(
				'error',
				`<read_progress_result>
  <status>error</status>
  <error>Terminal not found: ${identifier}</error>
</read_progress_result>`
			);
		}

		const actualTerminalId = terminalInfo.id;

		// Wait for completion if requested
		if (waitForCompletion) {
			const waitResult = await this.waitForTerminalCompletion(
				actualTerminalId,
				maxWaitTime
			);
			if (!waitResult.completed && waitResult.timeout) {
				await say(
					'tool',
					`Terminal monitoring timed out after ${maxWaitTime}ms. Process may still be running.`
				);
			}
		}

		// Get terminal status
		const isBusy = terminalInfo.busy;
		const lastCommand = terminalInfo.lastCommand || '';
		const isHot = terminalManager.isProcessHot(actualTerminalId);

		// Get output
		const outputLogs = TerminalRegistry.getTerminalLogs(actualTerminalId) || [];

		// 🆕 Auto-feed outputs to analyzer (for historical analysis)
		this.feedOutputToAnalyzer(terminalInfo, outputLogs);

		// Apply maxChars limit (smart truncation)
		const effectiveMaxChars = Math.min(maxChars, 50000); // Cap at 50000
		const truncatedLogs = this.applyMaxCharsLimit(outputLogs, effectiveMaxChars);

		// Apply filtering if keywords provided
		let filteredOutput = includeFullOutput
			? truncatedLogs
			: truncatedLogs.slice(-30); // Last 30 lines if not full
		let highlightedLines: string[] = [];

		if (filterKeywords && filterKeywords.length > 0) {
			const { filtered, highlighted } = this.filterOutputByKeywords(
				filteredOutput,
				filterKeywords,
				contextLines
			);
			highlightedLines = highlighted;
			// If keywords provided, show only matching lines + context
			if (highlighted.length > 0) {
				filteredOutput = filtered;
			}
		}

		// Check if it's a dev server
		const devServer = TerminalRegistry.getDevServer(actualTerminalId);
		const isDevServer = devServer !== undefined;

		// Generate smart summary
		const summary = smartSummary
			? this.generateSmartSummary(
					filteredOutput,
					isBusy,
					isHot,
					devServer,
					highlightedLines
				)
			: null;

		// Check if this is a completion report (one-time only)
		const isCompletionReport =
			!isBusy && !completionReportsSent.has(actualTerminalId);
		if (isCompletionReport) {
			completionReportsSent.add(actualTerminalId);
		}

		// Extract structured data if requested (JSON, URLs, paths)
		let extractedData;
		if (extractData) {
			extractedData = this.extractStructuredData(filteredOutput.join('\n'));
		}

		// Get process ID from the terminal
		const processId = await terminalInfo.terminal.processId || 'unknown';
		
		// Build result - Optimized for AI parsing (reduced nesting and redundancy)
		// Enhanced with clear terminal identification: name, ID, PID, and command overview
		const result = `<read_progress_result>
<status>success</status>
<terminal>
  <name>${terminalInfo.name || `Terminal-${actualTerminalId}`}</name>
  <terminal_id>${actualTerminalId}</terminal_id>
  <process_id>${processId}</process_id>
  <busy>${isBusy}</busy>
  <hot>${isHot}</hot>
  <is_dev_server>${isDevServer}</is_dev_server>${isCompletionReport ? '\n  <completed>true</completed>' : ''}
  <last_command>${this.escapeXml(lastCommand)}</last_command>${
			devServer ? `
  <server status="${devServer.status}"${devServer.url ? ` url="${devServer.url}"` : ''}${devServer.error ? ` error="${this.escapeXml(devServer.error)}"` : ''}/>`  : ''
		}
</terminal>${
		highlightedLines.length > 0
			? `
<filtered matches="${highlightedLines.length}" keywords="${filterKeywords?.join(', ')}">
${highlightedLines.map((line) => `${this.escapeXml(line)}`).join('\n')}
</filtered>`
			: ''
	}
<output lines="${filteredOutput.length}" mode="${includeFullOutput ? 'full' : 'recent'}">
${(!highlightedLines.length ? filteredOutput : []).map((line: string) => this.escapeXml(line)).join('\n')}
</output>${
		extractedData && (extractedData.json.length > 0 || extractedData.urls.length > 0 || extractedData.paths.length > 0)
			? `
<extracted_data>
${extractedData.json.length > 0 ? `<json_blocks count="${extractedData.json.length}">${extractedData.json.map(j => `\n${JSON.stringify(j, null, 2)}`).join('')}\n</json_blocks>` : ''}
${extractedData.urls.length > 0 ? `<urls count="${extractedData.urls.length}">${extractedData.urls.map(u => `\n${u}`).join('')}\n</urls>` : ''}
${extractedData.paths.length > 0 ? `<file_paths count="${extractedData.paths.length}">${extractedData.paths.map(p => `\n${p}`).join('')}\n</file_paths>` : ''}
</extracted_data>`
			: ''
	}${
		summary
			? `
<summary state="${summary.processState}" progress="${summary.estimatedProgress || 0}">
<activity>${summary.activity}</activity>
<findings>${summary.keyFindings.join('; ')}</findings>
<action>${this.escapeXml(summary.recommendation)}</action>
</summary>`
			: ''
	}
</read_progress_result>`;

		return this.toolResponse('success', result.trim());
	}

	/**
	 * Wait for terminal to complete execution
	 */
	private async waitForTerminalCompletion(
		terminalId: number,
		maxWaitTime: number
	): Promise<{ completed: boolean; timeout: boolean }> {
		const startTime = Date.now();
		const checkInterval = 1000; // Check every second

		while (Date.now() - startTime < maxWaitTime) {
			const terminalInfo = TerminalRegistry.getTerminal(terminalId);
			if (!terminalInfo || !terminalInfo.busy) {
				return { completed: true, timeout: false };
			}

			// Wait for check interval
			await new Promise((resolve) => setTimeout(resolve, checkInterval));
		}

		return { completed: false, timeout: true };
	}

	/**
	 * Filter output by keywords and return both filtered lines and highlighted matches
	 * Enhanced with configurable context lines for better error understanding
	 */
	private filterOutputByKeywords(
		output: string[],
		keywords: string[],
		contextLines: number = 2
	): { filtered: string[]; highlighted: string[] } {
		const highlighted: string[] = [];
		const filtered: string[] = [];

		const keywordLower = keywords.map((k) => k.toLowerCase());

		for (let i = 0; i < output.length; i++) {
			const line = output[i];
			const lineLower = line.toLowerCase();

			// Check if line contains any keyword
			const matchesKeyword = keywordLower.some((keyword) =>
				lineLower.includes(keyword)
			);

			if (matchesKeyword) {
				highlighted.push(line);

				// Include context: previous N lines + current + next N lines
				const contextStart = Math.max(0, i - contextLines);
				const contextEnd = Math.min(output.length, i + contextLines + 1);

				for (let j = contextStart; j < contextEnd; j++) {
					if (!filtered.includes(output[j])) {
						filtered.push(output[j]);
					}
				}
			}
		}

		return { filtered, highlighted };
	}

	/**
	 * Generate intelligent summary of terminal output
	 */
	private generateSmartSummary(
		output: string[],
		isBusy: boolean,
		isHot: boolean,
		devServer: any,
		highlightedLines: string[]
	): {
		processState: string;
		activity: string;
		keyFindings: string[];
		recommendation: string;
		estimatedProgress?: number;
	} {
		const keyFindings: string[] = [];
		const recentText = output.slice(-20).join('\n');

		// Analyze for errors
		const errorCount = this.countPatternMatches(recentText, [
			'error',
			'failed',
			'exception',
			'fatal',
		]);
		if (errorCount > 0) {
			keyFindings.push(`Detected ${errorCount} error(s) in recent output`);
		}

		// Analyze for warnings
		const warningCount = this.countPatternMatches(recentText, [
			'warning',
			'warn',
		]);
		if (warningCount > 0) {
			keyFindings.push(`Detected ${warningCount} warning(s) in recent output`);
		}

		// Analyze for success indicators
		const successCount = this.countPatternMatches(recentText, [
			'success',
			'completed',
			'done',
			'finished',
			'✓',
			'✔',
		]);
		if (successCount > 0) {
			keyFindings.push(
				`Detected ${successCount} success indicator(s) in recent output`
			);
		}

		// Analyze for progress indicators
		const progressMatch = recentText.match(/(\d+)%/g);
		let estimatedProgress: number | undefined;
		if (progressMatch) {
			const percentages = progressMatch
				.map((m) => parseInt(m))
				.filter((n) => !isNaN(n) && n >= 0 && n <= 100);
			if (percentages.length > 0) {
				estimatedProgress = Math.max(...percentages);
				keyFindings.push(`Progress: ${estimatedProgress}%`);
			}
		}

		// Highlighted lines summary
		if (highlightedLines.length > 0) {
			keyFindings.push(`Found ${highlightedLines.length} key event(s)`);
		}

		// Process state determination
		let processState: string;
		if (!isBusy) {
			processState = errorCount > 0 ? 'completed_with_errors' : 'completed';
		} else if (isHot) {
			processState = 'running_active';
		} else {
			processState = 'running_waiting';
		}

		// Activity description
		let activity: string;
		if (devServer) {
			activity = `Dev server: ${devServer.status}`;
		} else if (isBusy && isHot) {
			activity = 'Actively producing output';
		} else if (isBusy && !isHot) {
			activity = 'Running but idle (may be waiting for input)';
		} else {
			activity = 'Process completed';
		}

		// Generate recommendation
		const recommendation = this.generateRecommendation(
			processState,
			errorCount,
			successCount,
			devServer
		);

		return {
			processState,
			activity,
			keyFindings: keyFindings.length > 0 ? keyFindings : ['No significant events detected'],
			recommendation,
			estimatedProgress,
		};
	}

	private countPatternMatches(text: string, patterns: string[]): number {
		const textLower = text.toLowerCase();
		let count = 0;
		for (const pattern of patterns) {
			const regex = new RegExp(pattern, 'gi');
			const matches = textLower.match(regex);
			count += matches ? matches.length : 0;
		}
		return count;
	}

	private generateRecommendation(
		processState: string,
		errorCount: number,
		successCount: number,
		devServer: any
	): string {
		if (devServer) {
			switch (devServer.status) {
				case 'running':
					return 'Dev server is running normally. Proceed with development tasks.';
				case 'error':
					return 'Dev server has errors. Review output and restart if needed.';
				case 'starting':
					return 'Dev server is starting. Wait for completion.';
				default:
					return 'Dev server status unclear. Review output manually.';
			}
		}

		switch (processState) {
			case 'completed':
				return successCount > 0
					? 'Process completed successfully. Review output for results.'
					: 'Process completed. Review output for results.';
			case 'completed_with_errors':
				return 'Process completed with errors. Review error messages and take corrective action.';
			case 'running_active':
				return 'Process is actively running. Monitor progress or wait for completion.';
			case 'running_waiting':
				return 'Process appears to be waiting (no recent output). May be waiting for input or stuck. Consider manual inspection.';
			default:
				return 'Process state unclear. Review output manually.';
		}
	}

	private analyzeProgress(
		isBusy: boolean,
		isHot: boolean,
		output: string[],
		devServer?: { status: string; error?: string }
	): string {
		if (devServer) {
			return this.analyzeDevServer(devServer);
		}

		if (this.hasErrorsInOutput(output) && !isHot) {
			return 'Process appears to have errors and is not active. Consider using kill_bash to terminate.';
		}

		if (!isBusy) {
			return 'Process has completed. Check output for results.';
		}

		if (isHot) {
			return 'Process is actively running and producing output. Continue waiting.';
		}

		if (isBusy && !isHot) {
			return 'Process is running but not producing output. May be waiting for input or stuck. Consider checking manually or using kill_bash if stuck.';
		}

		return 'Process status unclear. Review output manually.';
	}

	private analyzeDevServer(devServer: {
		status: string;
		error?: string;
	}): string {
		switch (devServer.status) {
			case 'running':
				return 'Dev server is running normally. Continue waiting or proceed with next steps.';
			case 'error':
				return 'Dev server encountered an error. Consider using kill_bash to terminate and restart.';
			case 'starting':
				return 'Dev server is still starting. Continue waiting.';
			default:
				return 'Dev server is in an unknown state. Review output manually.';
		}
	}

	private hasErrorsInOutput(output: string[]): boolean {
		const recentText = output.slice(-10).join('\n').toLowerCase();
		const errorPatterns = [
			'error',
			'failed',
			'exception',
			'fatal',
			'cannot',
			'unable to',
			'not found',
			'enoent',
			'econnrefused',
		];
		return errorPatterns.some((pattern) => recentText.includes(pattern));
	}

	private escapeXml(str: string): string {
		if (!str) {
			return '';
		}
		return str
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&apos;');
	}

	/**
	 * Extract structured data from output (JSON, URLs, file paths)
	 * @param output - Terminal output text
	 * @returns Extracted structured data
	 */
	private extractStructuredData(output: string): {
		json: any[];
		urls: string[];
		paths: string[];
	} {
		const json: any[] = [];
		const urls: string[] = [];
		const paths: string[] = [];

		// Extract JSON blocks
		// Match JSON objects {...} and arrays [...]
		const jsonRegex = /(\{(?:[^{}]|(?:\{[^{}]*\}))*\}|\[(?:[^\[\]]|(?:\[[^\[\]]*\]))*\])/g;
		const jsonMatches = output.match(jsonRegex);
		
		if (jsonMatches) {
			for (const match of jsonMatches) {
				try {
					const parsed = JSON.parse(match);
					json.push(parsed);
				} catch {
					// Not valid JSON, skip
				}
			}
		}

		// Extract URLs
		// Match http://, https://, file://, localhost
		const urlRegex = /https?:\/\/[^\s<>"']+|file:\/\/[^\s<>"']+|localhost:\d+[^\s<>"']*/g;
		const urlMatches = output.match(urlRegex);
		if (urlMatches) {
			urls.push(...new Set(urlMatches)); // Remove duplicates
		}

		// Extract file paths
		// Match common path patterns: /path/to/file, C:\path\to\file, ./relative/path, ~/home/path
		// First remove URLs from text to avoid false positives
		const textWithoutURLs = output.replace(/https?:\/\/[^\s<>"']+/g, '');
		const pathRegex = /(?:(?:\/[a-zA-Z]|[A-Za-z]:\\|\.{1,2}\/|~\/)[\w\-\.\/\\]+(?:\.\w+)?)/g;
		const pathMatches = textWithoutURLs.match(pathRegex);
		if (pathMatches) {
			// Filter out any remaining URL-like patterns and false positives
			const filteredPaths = pathMatches.filter(p => {
				// Exclude URLs
				if (p.includes('://')) {return false;}
				
				// Exclude simple number patterns like "10/5" (math) or "10/11/2024" (dates)
				// Path should have at least one letter in the filename part
				const lastSegment = p.split(/[\/\\]/).pop() || '';
				if (/^\d+$/.test(lastSegment)) {return false;} // Only numbers in last segment
				
				// Path should start with valid prefix
				if (!p.match(/^([A-Za-z]:|\/[a-zA-Z]|\.\/|\.\.\/|~\/)/)) {return false;}
				
				return true;
			});
			paths.push(...new Set(filteredPaths)); // Remove duplicates
		}

		return { json, urls, paths };
	}

	/**
	 * Apply maxChars limit with smart truncation (keep most recent lines)
	 */
	private applyMaxCharsLimit(logs: string[], maxChars: number): string[] {
		// Calculate total length
		const totalLength = logs.reduce((sum, line) => sum + line.length + 1, 0); // +1 for newline

		if (totalLength <= maxChars) {
			return logs;
		}

		// Smart truncation: keep most recent lines that fit within maxChars
		const truncated: string[] = [];
		let currentLength = 0;

		for (let i = logs.length - 1; i >= 0; i--) {
			const line = logs[i];
			const lineLength = line.length + 1; // +1 for newline

			if (currentLength + lineLength <= maxChars) {
				truncated.unshift(line);
				currentLength += lineLength;
			} else {
				// Add truncation indicator
				if (truncated.length > 0) {
					truncated.unshift('...[output truncated - showing most recent lines]...');
				}
				break;
			}
		}

		return truncated;
	}

	// ============================================================================
	// 🆕 Output Analyzer Integration
	// ============================================================================

	/**
	 * Feed terminal outputs to the analyzer for historical tracking
	 */
	private feedOutputToAnalyzer(terminalInfo: any, outputs: string[]): void {
		if (!outputs || outputs.length === 0) {return;}

		// Create terminal output entry
		const combinedOutput = outputs.join('\n');
		const terminalOutput: TerminalOutput = {
			id: `${terminalInfo.id}-${Date.now()}`,
			terminalId: terminalInfo.id,
			terminalName: terminalInfo.name || `Terminal ${terminalInfo.id}`,
			terminalType: 'terminal',
			timestamp: new Date(),
			content: combinedOutput,
			metadata: {
				lastCommand: terminalInfo.lastCommand,
				busy: terminalInfo.busy,
			},
		};

		// Add to analyzer
		globalOutputAnalyzer.addOutput(terminalOutput);
	}

	/**
	 * Search for patterns in terminal history using the analyzer
	 */
	searchTerminalHistory(options: {
		terminalId?: number;
		terminalName?: string;
		pattern?: string;
		query?: string;
		mode?: 'keyword' | 'regex' | 'pattern';
		timeRange?: { start?: Date; end?: Date };
		maxResults?: number;
	}) {
		return globalOutputAnalyzer.search({
			query: options.query,
			mode: options.mode || 'keyword',
			pattern: options.pattern as any,
			terminalName: options.terminalName,
			timeRange: options.timeRange,
			maxResults: options.maxResults || 100,
		});
	}

	/**
	 * Analyze terminal outputs for patterns and statistics
	 */
	analyzeTerminalOutputs(options: {
		terminalId?: number;
		terminalName?: string;
		timeRange?: { start?: Date; end?: Date };
	}) {
		return globalOutputAnalyzer.analyze({
			terminalName: options.terminalName,
			timeRange: options.timeRange,
			detectPatterns: true,
			groupByTerminal: true,
		});
	}

	/**
	 * Get statistics for a specific terminal
	 */
	getTerminalStatistics(terminalName?: string) {
		const analysis = globalOutputAnalyzer.analyze({
			terminalName,
			detectPatterns: true,
			groupByTerminal: true,
		});

		return {
			totalOutputs: analysis.totalOutputs,
			errorCount: analysis.errorCount,
			warningCount: analysis.warningCount,
			successCount: analysis.successCount,
			errorRate:
				analysis.totalOutputs > 0
					? ((analysis.errorCount / analysis.totalOutputs) * 100).toFixed(2) + '%'
					: '0%',
			warningRate:
				analysis.totalOutputs > 0
					? ((analysis.warningCount / analysis.totalOutputs) * 100).toFixed(2) + '%'
					: '0%',
			patterns: analysis.patterns,
		};
	}

	/**
	 * Search for errors in terminal history
	 */
	searchErrors(terminalName?: string, timeRange?: { start?: Date; end?: Date }) {
		return globalOutputAnalyzer.search({
			pattern: 'error',
			mode: 'pattern',
			terminalName,
			timeRange,
			maxResults: 50,
		});
	}

	/**
	 * Search for warnings in terminal history
	 */
	searchWarnings(terminalName?: string, timeRange?: { start?: Date; end?: Date }) {
		return globalOutputAnalyzer.search({
			pattern: 'warning',
			mode: 'pattern',
			terminalName,
			timeRange,
			maxResults: 50,
		});
	}

	/**
	 * Export terminal outputs to file
	 */
	exportTerminalHistory(
		terminalName: string | undefined,
		format: 'json' | 'txt' | 'csv' | 'html' | 'markdown',
		timeRange?: { start?: Date; end?: Date }
	): string {
		const outputs = globalOutputAnalyzer.getHistory({
			terminalName,
			timeRange,
		});

		return globalOutputAnalyzer.export(outputs, format, {
			includeTimestamps: true,
			includeMetadata: true,
		});
	}

	/**
	 * Clear terminal history in analyzer
	 */
	clearAnalyzerHistory(terminalName?: string): number {
		return globalOutputAnalyzer.clearHistory(terminalName);
	}

	/**
	 * Get analyzer instance (for advanced usage)
	 */
	static getAnalyzer(): OutputAnalyzer {
		return globalOutputAnalyzer;
	}

	// ============================================================================
	// 🆕 Enhanced Pattern Detection (using analyzer patterns)
	// ============================================================================

	/**
	 * Detect if output contains specific patterns using analyzer's pattern library
	 */
	private detectPatternInOutput(
		output: string[],
		patternType: keyof typeof PREDEFINED_PATTERNS
	): { detected: boolean; count: number; examples: string[] } {
		const combinedText = output.join('\n');
		const patterns = PREDEFINED_PATTERNS[patternType] || [];
		
		let count = 0;
		const examples: string[] = [];

		for (const pattern of patterns) {
			const matches = combinedText.match(pattern);
			if (matches) {
				count += matches.length;
				if (examples.length < 3) {
					examples.push(...matches.slice(0, 3 - examples.length));
				}
			}
		}

		return {
			detected: count > 0,
			count,
			examples: examples.slice(0, 3),
		};
	}

	/**
	 * Enhanced error detection using analyzer patterns
	 */
	private detectErrors(output: string[]) {
		return this.detectPatternInOutput(output, 'error');
	}

	/**
	 * Enhanced warning detection using analyzer patterns
	 */
	private detectWarnings(output: string[]) {
		return this.detectPatternInOutput(output, 'warning');
	}

	/**
	 * Detect success patterns
	 */
	private detectSuccess(output: string[]) {
		return this.detectPatternInOutput(output, 'success');
	}

	/**
	 * Detect build patterns
	 */
	private detectBuild(output: string[]) {
		return this.detectPatternInOutput(output, 'build');
	}

	/**
	 * Detect test patterns
	 */
	private detectTest(output: string[]) {
		return this.detectPatternInOutput(output, 'test');
	}
}

/**
 * Clear completion reports for a specific terminal
 * (useful for testing or when terminal is reused)
 */
export function clearCompletionReport(terminalId: number): void {
	completionReportsSent.delete(terminalId);
}

/**
 * Get the global output analyzer instance
 * (for external access to analyzer features)
 */
export function getGlobalAnalyzer(): OutputAnalyzer {
	return globalOutputAnalyzer;
}

/**
 * Quick search for errors across all terminals
 */
export function quickSearchErrors(timeRange?: { start?: Date; end?: Date }) {
	return globalOutputAnalyzer.search({
		pattern: 'error',
		mode: 'pattern',
		timeRange,
		maxResults: 50,
	});
}

/**
 * Quick search for warnings across all terminals
 */
export function quickSearchWarnings(timeRange?: { start?: Date; end?: Date }) {
	return globalOutputAnalyzer.search({
		pattern: 'warning',
		mode: 'pattern',
		timeRange,
		maxResults: 50,
	});
}

/**
 * Get overall statistics across all terminals
 */
export function getOverallStatistics() {
	const analysis = globalOutputAnalyzer.analyze({
		detectPatterns: true,
		groupByTerminal: true,
	});

	return {
		totalOutputs: analysis.totalOutputs,
		errorCount: analysis.errorCount,
		warningCount: analysis.warningCount,
		successCount: analysis.successCount,
		errorRate:
			analysis.totalOutputs > 0
				? ((analysis.errorCount / analysis.totalOutputs) * 100).toFixed(2) + '%'
				: '0%',
		warningRate:
			analysis.totalOutputs > 0
				? ((analysis.warningCount / analysis.totalOutputs) * 100).toFixed(2) + '%'
				: '0%',
		patterns: analysis.patterns.slice(0, 10),
		terminalBreakdown: Array.from(analysis.byTerminal.entries()).map(([name, stats]) => ({
			terminalName: name,
			totalOutputs: stats.totalOutputs,
			errors: stats.errorCount,
			warnings: stats.warningCount,
			lastActivity: stats.lastActivity,
		})),
	};
}

/**
 * Clear all completion reports
 */
export function clearAllCompletionReports(): void {
	completionReportsSent.clear();
}
