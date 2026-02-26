import { ToolPromptSchema } from "../utils/utils"

export const updateTodoPrompt: ToolPromptSchema = {
	name: "update_todo",
	description:
		"Update the task plan displayed in the user's panel. Use this to maintain a visible plan of agent-owned tasks. Supports incremental merge — only send agent tasks, user tasks are managed separately and will not be overwritten.",
	parameters: {
		todos: {
			type: "array",
			description:
				"Agent tasks to update. Each item: id (unique string), task (description), status (pending|in_progress|completed|cancelled), optional priority (low|medium|high|critical), source should always be 'agent'.",
			required: true,
		},
		mode: {
			type: "string",
			description:
				"'merge' (default) upserts agent tasks by id without touching user tasks. 'replace' replaces all agent tasks.",
			required: false,
		},
	},
	capabilities: [
		"Call update_todo at the START of any multi-step task to create a visible plan",
		"Use mode='merge' (default) to incrementally update statuses as you progress",
		"Mark tasks in_progress when starting, completed when done, cancelled if no longer needed",
		"Only include agent-designed tasks — never set source to 'user'",
		"User tasks in the queue are separate and will be handled after agent tasks complete",
		"This tool is purely for user visibility — it does not execute tasks",
	],
	examples: [
		{
			description: "Initial plan at task start",
			output: `<tool name="update_todo">
  <mode>merge</mode>
  <todos>
    <item>
      <id>step-001</id>
      <task>Analyze existing code structure</task>
      <status>in_progress</status>
      <priority>high</priority>
      <source>agent</source>
    </item>
    <item>
      <id>step-002</id>
      <task>Implement the new feature</task>
      <status>pending</status>
      <priority>high</priority>
      <source>agent</source>
    </item>
    <item>
      <id>step-003</id>
      <task>Write tests</task>
      <status>pending</status>
      <priority>medium</priority>
      <source>agent</source>
    </item>
  </todos>
</tool>`,
		},
	],
}
