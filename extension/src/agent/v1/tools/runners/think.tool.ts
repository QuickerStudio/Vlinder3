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
export class ThinkTool extends BaseAgentTool<ThinkToolParams> {
	async execute(): Promise<ToolResponseV2> {
		const { input } = this.params;
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

		// Build the thinking record
		const thinkingRecord = this.buildThinkingRecord(
			thought,
			conclusion,
			next_action
		);

		// Store the thinking for context (this could be used for debugging or analysis)
		this.logThinkingProcess(thought, conclusion, next_action);

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

