// schema/read-progress.ts
import { z } from 'zod';

/**
 * @tool read_progress
 * @description **[MONITORING TOOL]** Reads the current progress and output of a running terminal process with intelligent filtering and analysis. Use this to check if a long-running command is progressing normally or has encountered issues. Features: smart output filtering, completion detection, one-time summary reporting, continuous monitoring support.
 * @schema
 * {
 *   terminalId?: number; // The unique ID of the terminal to check (optional if terminalName is provided)
 *   terminalName?: string; // The name of the terminal to check (optional if terminalId is provided)
 *   includeFullOutput?: boolean; // Whether to include full output history (default: false, only recent output)
 *   filterKeywords?: string[]; // Keywords to filter important output lines (e.g., ["error", "success", "completed"])
 *   contextLines?: number; // Number of context lines before/after filtered lines (default: 2)
 *   extractData?: boolean; // Extract structured data (JSON, URLs, paths) for AI processing (default: false)
 *   smartSummary?: boolean; // Generate intelligent summary of key information (default: true)
 *   waitForCompletion?: boolean; // Wait and monitor until process completes (default: false)
 *   maxWaitTime?: number; // Maximum time to wait for completion in ms (default: 60000)
 *   maxChars?: number; // Maximum number of characters to return from output (default: 16000, max: 50000)
 * }
 * @example
 * ```xml
 * <tool name="read_progress">
 *   <terminalId>1</terminalId>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="read_progress">
 *   <terminalName>git-bash-123</terminalName>
 *   <smartSummary>true</smartSummary>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="read_progress">
 *   <terminalId>5</terminalId>
 *   <filterKeywords>["error", "warning", "success", "failed", "completed"]</filterKeywords>
 *   <smartSummary>true</smartSummary>
 * </tool>
 * ```
 * @example
 * ```xml
 * <tool name="read_progress">
 *   <terminalId>3</terminalId>
 *   <waitForCompletion>true</waitForCompletion>
 *   <maxWaitTime>120000</maxWaitTime>
 * </tool>
 * ```
 */
// Helpers to robustly coerce XML string values
const toOptionalNumber = (v: unknown) => {
  if (typeof v === 'string') {
    const s = v.trim()
    if (s.length === 0) { return undefined }
    const n = Number(s)
    return Number.isFinite(n) ? n : undefined
  }
  return (typeof v === 'number' && Number.isFinite(v)) ? v : undefined
}

const toOptionalBoolean = (v: unknown) => {
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s.length === 0) { return undefined }
    if (s === 'true' || s === '1') { return true }
    if (s === 'false' || s === '0') { return false }
    return undefined
  }
  if (typeof v === 'boolean') { return v }
  if (typeof v === 'number') { return v !== 0 }
  return undefined
}

const schema = z
	.object({
		terminalId: z.preprocess(
			toOptionalNumber,
			z.number().int().positive()
		)
			.optional()
			.describe('The unique ID of the terminal to check. Must be a positive integer.'),
		terminalName: z
			.string()
			.min(1, 'Terminal name cannot be empty.')
			.optional()
			.describe('The name of the terminal to check.'),
		includeFullOutput: z.preprocess(
			toOptionalBoolean,
			z.boolean()
		)
			.optional()
			.default(false)
			.describe('Whether to include full output history. Default is false (only recent output).'),
	filterKeywords: z
		.array(z.string())
		.optional()
		.describe(
			'Keywords to filter important output lines. Lines containing these keywords will be highlighted.'
		),
		contextLines: z.preprocess(
			toOptionalNumber,
			z.number().int().min(0).max(10)
		)
			.optional()
			.default(2)
			.describe('Number of context lines to include before and after filtered lines (default: 2). Helps understand error context.'),
		extractData: z.preprocess(
			toOptionalBoolean,
			z.boolean()
		)
			.optional()
			.default(false)
			.describe('Extract structured data from output (JSON, URLs, file paths). Useful for AI processing. Default is false.'),
		smartSummary: z.preprocess(
			toOptionalBoolean,
			z.boolean()
		)
			.optional()
			.default(true)
			.describe('Generate intelligent summary of key information from terminal output. Default is true.'),
			waitForCompletion: z.preprocess(
			toOptionalBoolean,
			z.boolean()
		)
			.optional()
			.default(false)
			.describe('Wait and continuously monitor until process completes. Default is false.'),
		maxWaitTime: z.preprocess(
			toOptionalNumber,
			z.number()
		)
			.optional()
			.default(60000)
			.describe('Maximum time to wait for completion in milliseconds. Default is 60000 (1 minute). Only applies when waitForCompletion is true.'),
		maxChars: z.preprocess(
			toOptionalNumber,
			z.number()
		)
			.optional()
			.default(16000)
			.describe('Maximum number of characters to return from terminal output (default: 16000, max: 50000). Helps limit output size for long-running processes.'),
	})
	.refine(
		(data: { terminalId?: number; terminalName?: string }) => 
			data.terminalId !== undefined || data.terminalName !== undefined,
		{
			message: 'Either terminalId or terminalName must be provided.',
		}
	);

const examples = [
	`<tool name="read_progress">
  <terminalId>1</terminalId>
</tool>`,

	`<tool name="read_progress">
  <terminalName>git-bash-123</terminalName>
  <smartSummary>true</smartSummary>
</tool>`,

	`<tool name="read_progress">
  <terminalId>5</terminalId>
  <filterKeywords>["error", "warning", "success", "failed"]</filterKeywords>
  <smartSummary>true</smartSummary>
</tool>`,

	`<tool name="read_progress">
  <terminalId>3</terminalId>
  <waitForCompletion>true</waitForCompletion>
  <maxWaitTime>120000</maxWaitTime>
</tool>`,
];

export const readProgressTool = {
	schema: {
		name: 'read_progress',
		schema,
	},
	examples,
};

export type ReadProgressToolParams = {
	name: 'read_progress';
	input: z.infer<typeof schema>;
};
