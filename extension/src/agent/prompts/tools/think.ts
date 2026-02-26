import { ToolPromptSchema } from '../utils/utils';

/**
 * Think Tool Prompt
 * 
 * This prompt teaches the AI how to use the thinking scratchpad effectively.
 * Based on Anthropic's extended thinking patterns and best practices.
 */
export const thinkToolPrompt: ToolPromptSchema = {
	name: 'think',
	description:
		'A thinking scratchpad for reasoning through complex problems before taking action. Use this tool to organize thoughts, validate plans, check requirements, evaluate approaches, and ensure you have all necessary information. The thinking process is isolated - only your conclusions and planned actions are shown to the user, not the detailed reasoning. You can optionally create a TODO list to break down complex tasks into trackable steps.',
	parameters: {
		thought: {
			type: 'string',
			description:
				'Your thinking process, reasoning, and analysis. Break down problems, evaluate options, list requirements, check constraints, and reason systematically. Be thorough and consider edge cases.',
			required: true,
		},
		conclusion: {
			type: 'string',
			description:
				'Key conclusions or insights from your thinking. What did you decide or realize? Helps maintain continuity across thinking sessions.',
			required: false,
		},
		next_action: {
			type: 'string',
			description:
				'What you plan to do next based on your thinking. Be specific about which tool you will use or what action you will take.',
			required: false,
		},
		todo_list: {
			type: 'array',
			description:
				'Optional TODO list to break down next actions into concrete, trackable tasks. Each item should have: id (unique identifier), task (description), status (pending/in_progress/completed/cancelled), and optional priority (low/medium/high/critical). Use this for complex, multi-step workflows.',
			required: false,
		},
	},
	capabilities: [
		'Use think to organize your thoughts and reason through complex problems systematically',
		'Use think BEFORE making important decisions or taking significant actions',
		'Use think to validate that your planned actions align with user requirements and constraints',
		'Use think to check if you have all necessary information before proceeding',
		'Use think to evaluate multiple approaches and choose the best one',
		'Use think to break down complex tasks into manageable steps',
		'Use think to identify potential issues, edge cases, or risks',
		'Use think to list applicable rules, patterns, or best practices for the current situation',
		'Use think with TODO list to organize multi-step workflows into trackable tasks',
		'Use TODO list for complex refactoring, feature implementations, or any task requiring multiple coordinated steps',
		'Track task status (pending, in_progress, completed, cancelled) to maintain clear progress visibility',
		'Assign priority levels (low, medium, high, critical) to help organize work order',
		'IMPORTANT: The think tool does NOT retrieve information, execute commands, or make changes - it is purely for reasoning',
		'IMPORTANT: Your thinking process is isolated - users only see conclusions and next actions, not the detailed reasoning',
		'BEST PRACTICE: Use think liberally when dealing with complex, multi-step tasks',
		'BEST PRACTICE: Think before asking questions to ensure you truly need the information',
		'BEST PRACTICE: Think before executing commands to validate they are correct and safe',
		'BEST PRACTICE: Think after receiving information to process and plan how to use it',
		'BEST PRACTICE: Create TODO lists when planning requires coordination across multiple files or systems',
		'LIMITATIONS: Cannot access files, cannot execute commands, cannot modify code',
		'LIMITATIONS: Should not be used for simple, straightforward operations',
	],
	examples: [
		{
			description: 'Analyzing requirements and choosing an approach',
			output: `<think>
<thought>
Let me analyze the user's request to add authentication:

Requirements:
1. Add user authentication to existing Express.js app
2. Secure password storage
3. Token-based authentication for API calls

Current codebase analysis:
- Using Express.js with TypeScript
- REST API architecture
- No existing auth system

Approach evaluation:
Option A: JWT tokens
  ✓ Stateless, scalable
  ✓ No server-side session storage needed
  ✓ Works well with REST APIs
  ✓ Can include user claims
  
Option B: Session-based
  ✗ Requires session storage (Redis/database)
  ✗ More complex for APIs
  ✓ Easier to invalidate

Decision: JWT is better suited for this REST API architecture.

Security considerations:
- Use bcrypt for password hashing (industry standard)
- Store JWT secret in environment variables
- Set appropriate token expiration
- Implement refresh token mechanism
</thought>
<conclusion>Implement JWT-based authentication with bcrypt password hashing and refresh token support</conclusion>
<next_action>Search for existing auth-related files to understand current setup, then create auth middleware</next_action>
</think>`,
		},
		{
			description: 'Validating a plan against requirements',
			output: `<think>
<thought>
Before implementing the database migration, let me validate the plan:

Requirements check:
✓ Use Prisma ORM (specified by user)
✓ PostgreSQL database (already configured)
✓ Add user roles table
✓ Maintain backward compatibility
✗ Need to verify existing user table structure

Validation steps:
1. Current users table - need to check schema
2. Foreign key relationships - need to plan carefully
3. Migration strategy - must not lose existing data
4. Rollback plan - need to prepare

Risks identified:
- Existing users might have different schema than expected
- Foreign key constraints could fail if data inconsistent
- Migration might take long time on large user table

Mitigation:
- Read existing schema first
- Test migration on development database
- Create backup before production migration
</thought>
<conclusion>Need to examine existing user table schema before creating migration</conclusion>
<next_action>Use read_file to check existing Prisma schema and user model</next_action>
</think>`,
		},
		{
			description: 'Checking for missing information',
			output: `<think>
<thought>
User asked me to "optimize the slow queries". Let me check what information I have:

What I know:
✓ Application uses PostgreSQL database
✓ User reports slow performance

What I don't know:
✗ Which specific queries are slow?
✗ What is the current query execution time?
✗ Are there indexes on the relevant tables?
✗ What is the data volume?
✗ Are there any database logs showing slow queries?

Without this information, I would be guessing. I need to:
1. Ask user for specific slow queries or error logs
2. Check database schema for indexes
3. Analyze query patterns

Best approach: Ask targeted questions first rather than making assumptions.
</thought>
<conclusion>Insufficient information to optimize queries effectively. Need specific queries or database logs.</conclusion>
<next_action>Use ask_followup_question to request specific slow queries or database performance logs</next_action>
</think>`,
		},
		{
			description: 'Breaking down complex task with TODO list',
			output: `<think>
<thought>
The user wants to implement a complete authentication system with role-based access control. This is a complex, multi-step task that spans:
- Database layer (schema, migrations)
- Backend layer (middleware, API endpoints)
- Frontend layer (components, state management)
- Testing layer (unit tests, integration tests)

This requires careful coordination and I should track progress systematically.

Let me break this down into specific, actionable tasks with priorities:
1. First understand existing code (HIGH priority)
2. Design and implement database changes (HIGH - foundation for everything else)
3. Implement backend auth logic (HIGH - core functionality)
4. Update API endpoints (MEDIUM - depends on middleware)
5. Update frontend (LOW - can be done last)
6. Write comprehensive tests (MEDIUM - important for reliability)

I'll create a TODO list to track each phase.
</thought>
<conclusion>Authentication refactoring requires systematic, phased approach across multiple layers</conclusion>
<next_action>Start by reading existing authentication and user management code</next_action>
<todo_list>
  <item>
    <id>auth-refactor-001</id>
    <task>Read and analyze existing authentication implementation files</task>
    <status>in_progress</status>
    <priority>high</priority>
  </item>
  <item>
    <id>auth-refactor-002</id>
    <task>Read existing user model and database schema</task>
    <status>pending</status>
    <priority>high</priority>
  </item>
  <item>
    <id>auth-refactor-003</id>
    <task>Design new database schema with roles table and relationships</task>
    <status>pending</status>
    <priority>high</priority>
  </item>
  <item>
    <id>auth-refactor-004</id>
    <task>Create database migration scripts for new schema</task>
    <status>pending</status>
    <priority>high</priority>
  </item>
  <item>
    <id>auth-refactor-005</id>
    <task>Implement role-based authentication middleware</task>
    <status>pending</status>
    <priority>high</priority>
  </item>
  <item>
    <id>auth-refactor-006</id>
    <task>Update user registration endpoint with role assignment</task>
    <status>pending</status>
    <priority>medium</priority>
  </item>
  <item>
    <id>auth-refactor-007</id>
    <task>Update login endpoint to include role information in JWT</task>
    <status>pending</status>
    <priority>medium</priority>
  </item>
  <item>
    <id>auth-refactor-008</id>
    <task>Protect existing API endpoints with role checks</task>
    <status>pending</status>
    <priority>medium</priority>
  </item>
  <item>
    <id>auth-refactor-009</id>
    <task>Update frontend authentication context with roles</task>
    <status>pending</status>
    <priority>low</priority>
  </item>
  <item>
    <id>auth-refactor-010</id>
    <task>Update frontend components to respect user roles</task>
    <status>pending</status>
    <priority>low</priority>
  </item>
  <item>
    <id>auth-refactor-011</id>
    <task>Write unit tests for authentication middleware</task>
    <status>pending</status>
    <priority>medium</priority>
  </item>
  <item>
    <id>auth-refactor-012</id>
    <task>Write integration tests for auth endpoints</task>
    <status>pending</status>
    <priority>medium</priority>
  </item>
</todo_list>
</think>`,
		},
	],
};

