import { ToolPromptSchema } from "../utils/utils"

export const updateTodoPrompt: ToolPromptSchema = {
	name: "update_todo",
	description:
		"Update the task plan (todo list) displayed in the user's panel. Use this tool to create and maintain a visible task plan that shows the user what you are working on. Always send the COMPLETE list of todos — not just changes. Update statuses as you progress through tasks.",
	parameters: {
		todos: {
			type: "array",
			description:
				"The complete todo list. Each item must have: id (unique string), task (description), status (pending|in_progress|completed|cancelled), and optional priority (low|medium|high|critical).",
			required: true,
		},
	},
	capabilities: [
		"Use update_todo at the START of any multi-step task to create a visible plan",
		"Update statuses as you complete each step — mark in_progress when starting, completed when done",
		"Always send the FULL list, not just changed items",
		"Use priority to highlight critical or high-priority tasks",
		"Use cancelled status for tasks that are no longer needed",
		"This tool is purely for user visibility — it does not execute tasks",
	],
	examples: [
		{
			description: "Update todo list with multiple tasks at different stages",
			output: `<tool name="update_todo">
  <todos>
    <item>
      <id>step-001</id>
      <task>Analyze existing code structure</task>
      <status>completed</status>
      <priority>high</priority>
    </item>
    <item>
      <id>step-002</id>
      <task>Implement the new feature</task>
      <status>in_progress</status>
      <priority>high</priority>
    </item>
    <item>
      <id>step-003</id>
      <task>Write tests</task>
      <status>pending</status>
      <priority>medium</priority>
    </item>
  </todos>
</tool>`,
		},
	],
}
