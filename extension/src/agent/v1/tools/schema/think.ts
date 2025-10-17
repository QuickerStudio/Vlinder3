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
 * - Create TODO lists to organize multi-step workflows
 * 
 * IMPORTANT: This tool does NOT retrieve new information, make changes to the codebase, or execute commands. It is purely for thinking and planning. The thinking process is isolated and only your conclusions/actions are shown to the user.
 * 
 * @schema
 * {
 *   thought: string;           // Your thinking process, reasoning, analysis
 *   conclusion?: string;        // Optional: Key conclusions or insights
 *   next_action?: string;       // Optional: What you plan to do next
 *   todo_list?: Array<{        // Optional: TODO list for complex workflows
 *     id: string;              // Unique identifier
 *     task: string;            // Task description
 *     status: string;          // pending | in_progress | completed | cancelled
 *     priority?: string;       // low | medium | high | critical
 *   }>;
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
	todo_list: z
		.array(
			z.object({
				id: z.string().describe('Unique identifier for the todo item'),
				task: z.string().describe('Description of the task to be completed'),
				status: z
					.enum(['pending', 'in_progress', 'completed', 'cancelled'])
					.default('pending')
					.describe('Current status of the task'),
				priority: z
					.enum(['low', 'medium', 'high', 'critical'])
					.optional()
					.describe('Priority level of the task'),
			})
		)
		.optional()
		.describe(
			'Optional TODO list to break down next actions into concrete, trackable tasks. Each task should have a unique ID, description, and status. Use this to organize multi-step workflows.'
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

	`<tool name="think">
  <thought>
    Breaking down the complex refactoring task:
    1. Update database schema for new user roles
    2. Modify authentication middleware
    3. Update API endpoints to use new auth
    4. Update frontend components
    5. Write tests for all changes
    
    This is a multi-step process that requires careful coordination.
    Let me create a TODO list to track progress.
  </thought>
  <conclusion>Multi-step authentication refactoring requires systematic approach</conclusion>
  <next_action>Start with reading existing authentication code</next_action>
  <todo_list>
    <item>
      <id>auth-001</id>
      <task>Read and analyze existing authentication implementation</task>
      <status>in_progress</status>
      <priority>high</priority>
    </item>
    <item>
      <id>auth-002</id>
      <task>Design new database schema for user roles</task>
      <status>pending</status>
      <priority>high</priority>
    </item>
    <item>
      <id>auth-003</id>
      <task>Create database migration scripts</task>
      <status>pending</status>
      <priority>high</priority>
    </item>
    <item>
      <id>auth-004</id>
      <task>Update authentication middleware to support roles</task>
      <status>pending</status>
      <priority>medium</priority>
    </item>
    <item>
      <id>auth-005</id>
      <task>Update API endpoints with new auth logic</task>
      <status>pending</status>
      <priority>medium</priority>
    </item>
    <item>
      <id>auth-006</id>
      <task>Update frontend components and API calls</task>
      <status>pending</status>
      <priority>low</priority>
    </item>
    <item>
      <id>auth-007</id>
      <task>Write comprehensive tests for authentication</task>
      <status>pending</status>
      <priority>medium</priority>
    </item>
  </todo_list>
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

