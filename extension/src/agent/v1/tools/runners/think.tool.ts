import { BaseAgentTool } from '../base-agent.tool';
import { ThinkToolParams } from '../schema/think';
import { ToolResponseV2 } from '../../types';
import dedent from 'dedent';

/**
 * Think Tool - A thinking scratchpad for context isolation
 * 
 * Based on Anthropic's best practices for agent design, this tool provides
 * a dedicated space for the AI to think through complex problems before
 * taking action. The thinking process is isolated from the final output,
 * allowing for deeper reasoning without cluttering the user-facing response.
 * 
 * Key Design Principles:
 * 1. Context Isolation: Thinking stays in the scratchpad, not in final output
 * 2. No Side Effects: This tool doesn't read files, execute commands, or make changes
 * 3. Structured Reasoning: Encourages systematic problem-solving
 * 4. Planning Support: Helps validate actions before execution
 * 
 * Usage Pattern:
 * - Use BEFORE making complex decisions
 * - Use to validate plans against requirements
 * - Use to check if all necessary information is available
 * - Use to reason about edge cases and potential issues
 */
/**
 * Think Tool — Maintenance Notes (2025-10-16)
 *
 * - Timer lifecycle: Start the timer only while approvalState is 'loading' (Thinking Process).
 *   Stop and clean up the timer in any other state (approved/error/rejected) and on unmount.
 * - Stable duration: Backend now provides completedAt and durationMs. The UI prefers these values
 *   and persists them in sessionStorage to prevent timers from "reviving" after reloads.
 * - Context isolation: Only ✓ Conclusion and → Next Action are injected into the next model prompt;
 *   the raw Thinking Process (thought) is not injected.
 * - Read-only classification: 'think' has been added to readOnlyTools to avoid unnecessary approval flows.
 * - Why: Fixes issues such as large/growing elapsed times (e.g., "Think 1437s") and timer restarts on reopen.
 */
export class ThinkTool extends BaseAgentTool<ThinkToolParams> {
	async execute(): Promise<ToolResponseV2> {
		const { input, ask, updateAsk } = this.params;
		const { thought, conclusion, next_action } = input;

		// Validate required field
		if (!thought || thought.trim() === '') {
			return this.toolResponse(
				'error',
				dedent`<think_tool_response>
					<status>error</status>
					<message>The 'thought' parameter is required and cannot be empty</message>
					<help>
						The think tool requires meaningful content in the thought field.
						Use it to reason through problems, validate plans, or organize your thinking.
					</help>
				</think_tool_response>`
			);
		}

		// Show thinking process to user (auto-approve since this is a read-only tool)
		const startedAt = Date.now();
		const { response } = await ask(
			'tool',
			{
				tool: {
					tool: 'think',
					thought,
					conclusion,
					next_action,
					approvalState: 'loading',
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		// Store the thinking for context (this could be used for debugging or analysis)
		this.logThinkingProcess(thought, conclusion, next_action);

		// Build the thinking record
		const thinkingRecord = this.buildThinkingRecord(
			thought,
			conclusion,
			next_action
		);

		// Update to approved state after thinking is complete
		const completedAt = Date.now();
		const durationMs = Math.max(0, completedAt - startedAt);
		await updateAsk(
			'tool',
			{
				tool: {
					tool: 'think',
					thought,
					conclusion,
					next_action,
					approvalState: 'approved',
					completedAt,
					durationMs,
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				},
			},
			this.ts
		);

		// Return a success response
		// The key insight: the detailed thinking stays in the tool execution,
		// only a summary is returned to maintain context isolation
		return this.toolResponse('success', thinkingRecord);
	}

	/**
	 * Build a structured record of the thinking process
	 */
	private buildThinkingRecord(
		thought: string,
		conclusion?: string,
		nextAction?: string
	): string {
		const timestamp = new Date().toISOString();

		return dedent`<think_tool_response>
			<status>success</status>
			<timestamp>${timestamp}</timestamp>
			<thinking_summary>
				${conclusion ? `<conclusion>${this.escapeXml(conclusion)}</conclusion>` : '<conclusion>Thinking process completed</conclusion>'}
				${nextAction ? `<next_action>${this.escapeXml(nextAction)}</next_action>` : ''}
			</thinking_summary>
			<note>
				Thinking process recorded. This space was used for reasoning and planning.
				${conclusion ? 'Key insights have been identified.' : 'Continue with the planned approach.'}
			</note>
		</think_tool_response>`;
	}

	/**
	 * Log the thinking process for debugging and analysis
	 * In production, this could be stored in a database or logged to analytics
	 */
	private logThinkingProcess(
		thought: string,
		conclusion?: string,
		nextAction?: string
	): void {
		// Log for debugging (in production, this could go to a proper logging service)
		this.logger(
			`Thinking recorded: ${conclusion || 'Processing'} ${nextAction ? `→ ${nextAction}` : ''}`,
			'debug'
		);

		// Could be extended to:
		// - Store in a database for analysis
		// - Track thinking patterns over time
		// - Provide insights into agent reasoning
		// - Help debug complex decision-making processes
	}

	/**
	 * Escape XML special characters for safe inclusion in XML responses
	 */
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
	 * Override abort to handle gracefully
	 * Thinking can be interrupted without side effects
	 */
	public override async abortToolExecution() {
		this.logger('Thinking process interrupted', 'debug');
		return await super.abortToolExecution();
	}
}

