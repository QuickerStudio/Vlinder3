// schema/think.ts
import { z } from 'zod';

/**
 * @tool think
 * @description A thinking scratchpad that allows you to reason through complex problems, validate plans, and organize thoughts before taking action. This tool is designed for context isolation - your thinking process is kept separate from the final output. Use this when you need to:
 * - Break down complex problems into manageable steps
 * - Verify that your planned actions align with requirements and constraints
 * - List applicable rules, patterns, or best practices
 * - Evaluate multiple approaches before committing to one
 * - Check if you have all necessary information
 * - Reason about edge cases and potential issues
 * 
 * IMPORTANT: This tool does NOT retrieve new information, make changes to the codebase, or execute commands. It is purely for thinking and planning. The thinking process is isolated and only your conclusions/actions are shown to the user.
 * 
 * @schema
 * {
 *   thought: string;           // Your thinking process, reasoning, analysis
 *   conclusion?: string;        // Optional: Key conclusions or insights
 *   next_action?: string;       // Optional: What you plan to do next
 * }
 * 
 * @example
 * ```xml
 * <tool name="think">
 *   <thought>
 *     Let me analyze the requirements:
 *     1. User wants to add authentication
 *     2. Current codebase uses Express.js
 *     3. Need to consider security best practices
 *     
 *     Approach options:
 *     - JWT tokens (stateless, scalable)
 *     - Session-based (simpler, but requires storage)
 *     
 *     Given the existing architecture, JWT would be better because:
 *     - No need for session storage
 *     - Works well with API design
 *     - Can be validated without database lookup
 *   </thought>
 *   <conclusion>Use JWT-based authentication with bcrypt for password hashing</conclusion>
 *   <next_action>Read existing auth-related files to understand current implementation</next_action>
 * </tool>
 * ```
 * 
 * @example
 * ```xml
 * <tool name="think">
 *   <thought>
 *     Checking if I have all information:
 *     - Database type: PostgreSQL ✓
 *     - ORM: Unknown ✗
 *     - Existing auth middleware: Unknown ✗
 *     
 *     Missing critical information. I should ask the user before proceeding.
 *   </thought>
 *   <conclusion>Need more information about ORM and existing auth setup</conclusion>
 *   <next_action>Use ask_followup_question to gather missing details</next_action>
 * </tool>
 * ```
 * 
 * @example
 * ```xml
 * <tool name="think">
 *   <thought>
 *     Validating my plan against requirements:
 *     ✓ Must not break existing API endpoints
 *     ✓ Must use TypeScript strict mode
 *     ✓ Must include input validation
 *     ✓ Must handle errors gracefully
 *     ✗ Need to ensure backward compatibility
 *     
 *     Potential issues:
 *     - Existing endpoints don't have auth
 *     - Adding auth might break frontend
 *     
 *     Solution: Add auth to new routes only, migrate old routes gradually
 *   </thought>
 *   <conclusion>Implement auth for new routes, provide migration guide for existing routes</conclusion>
 * </tool>
 * ```
 */
const schema = z.object({
	thought: z
		.string()
		.describe(
			'Your thinking process, reasoning, and analysis. Use this space to break down problems, evaluate options, list requirements, check constraints, and reason through the task. Be thorough and systematic.'
		),
	conclusion: z
		.string()
		.optional()
		.describe(
			'Key conclusions or insights from your thinking. What did you decide or realize? This helps maintain continuity across multiple thinking sessions.'
		),
	next_action: z
		.string()
		.optional()
		.describe(
			'What you plan to do next based on your thinking. Be specific about which tool you will use or what action you will take.'
		),
});

const examples = [
	`<tool name="think">
  <thought>
    Let me analyze the requirements:
    1. User wants to add authentication
    2. Current codebase uses Express.js
    3. Need to consider security best practices
    
    Approach options:
    - JWT tokens (stateless, scalable)
    - Session-based (simpler, but requires storage)
    
    Given the existing architecture, JWT would be better because:
    - No need for session storage
    - Works well with API design
    - Can be validated without database lookup
  </thought>
  <conclusion>Use JWT-based authentication with bcrypt for password hashing</conclusion>
  <next_action>Read existing auth-related files to understand current implementation</next_action>
</tool>`,

	`<tool name="think">
  <thought>
    Checking if I have all information:
    - Database type: PostgreSQL ✓
    - ORM: Unknown ✗
    - Existing auth middleware: Unknown ✗
    
    Missing critical information. I should ask the user before proceeding.
  </thought>
  <conclusion>Need more information about ORM and existing auth setup</conclusion>
  <next_action>Use ask_followup_question to gather missing details</next_action>
</tool>`,

	`<tool name="think">
  <thought>
    Validating my plan against requirements:
    ✓ Must not break existing API endpoints
    ✓ Must use TypeScript strict mode
    ✓ Must include input validation
    ✓ Must handle errors gracefully
    ✗ Need to ensure backward compatibility
    
    Potential issues:
    - Existing endpoints don't have auth
    - Adding auth might break frontend
    
    Solution: Add auth to new routes only, migrate old routes gradually
  </thought>
  <conclusion>Implement auth for new routes, provide migration guide for existing routes</conclusion>
</tool>`,
];

export const thinkTool = {
	schema: {
		name: 'think',
		schema,
	},
	examples,
};

export type ThinkToolParams = {
	name: 'think';
	input: z.infer<typeof schema>;
};

