import { z } from "zod"

const todoItemSchema = z.object({
	id: z.string().describe("Unique identifier for the todo item"),
	task: z.string().describe("Description of the task"),
	status: z
		.enum(["pending", "in_progress", "completed", "cancelled"])
		.default("pending")
		.describe("Current status of the task"),
	priority: z
		.enum(["low", "medium", "high", "critical"])
		.optional()
		.describe("Priority level of the task"),
	source: z
		.enum(["agent", "user"])
		.default("agent")
		.describe("Who created this task: 'agent' for autonomously designed tasks, 'user' for tasks from the user queue"),
})

const schema = z.object({
	todos: z
		.array(todoItemSchema)
		.describe("Agent-owned tasks to merge into the current task list. Only include agent tasks — user tasks are managed separately and must not be overwritten."),
	mode: z
		.enum(["merge", "replace"])
		.default("merge")
		.describe("'merge' updates/adds agent tasks without touching user tasks. 'replace' replaces all agent tasks."),
})

export const updateTodoTool = {
	schema: {
		name: "update_todo",
		schema,
	},
	examples: [
		`<tool name="update_todo">
  <mode>merge</mode>
  <todos>
    <item>
      <id>task-001</id>
      <task>Read and analyze existing code structure</task>
      <status>completed</status>
      <priority>high</priority>
      <source>agent</source>
    </item>
    <item>
      <id>task-002</id>
      <task>Implement the new feature</task>
      <status>in_progress</status>
      <priority>high</priority>
      <source>agent</source>
    </item>
  </todos>
</tool>`,
	],
}

export type UpdateTodoToolParams = {
	name: "update_todo"
	input: z.infer<typeof schema>
}
