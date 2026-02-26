import { ToolPromptSchema } from '../utils/utils';

export const spawnAgentPrompt: ToolPromptSchema = {
	name: 'spawn_agent',
	description:
		'Spawn a specialized sub-agent to handle a focused task. Requires user approval before creating the agent.',
	parameters: {
		agentName: {
			type: 'string',
			description:
				"Type of agent to spawn. One of:\n- 'sub_task': Execute a specific focused sub-component\n- 'planner': Analyze and create a detailed execution plan\n- 'tester': Comprehensive testing and quality assurance\n- 'optimizer': Iterative optimization through data-driven testing",
			required: true,
		},
		instructions: {
			type: 'string',
			description: 'Detailed instructions for the sub-agent, including objectives and context. Include few-shot examples if helpful.',
			required: true,
		},
		files: {
			type: 'string',
			description: 'Comma-separated list of files the sub-agent should focus on (no spaces)',
			required: false,
		},
	},
	capabilities: [
		"Use 'sub_task' for focused code changes or installs",
		"Use 'planner' to break down complex tasks into steps",
		"Use 'tester' to write and run tests, find bugs, verify fixes",
		"Use 'optimizer' to improve performance through systematic iteration",
	],
	examples: [
		{
			description: 'Spawn a sub_task agent to install deps and run tests',
			output: `<spawn_agent>
<agentName>sub_task</agentName>
<instructions>Install dependencies and run unit tests. Report any failures.</instructions>
<files>package.json,README.md</files>
</spawn_agent>`,
		},
		{
			description: 'Spawn a tester agent',
			output: `<spawn_agent>
<agentName>tester</agentName>
<instructions>Create integration tests for the pattern-search tool. Run them, fix failures, iterate until 100% pass rate.</instructions>
<files>extension/src/agent/tools/runners/pattern-search.tool.ts</files>
</spawn_agent>`,
		},
	],
};
