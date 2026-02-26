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
})

const schema = z.object({
	todos: z
		.array(todoItemSchema)
		.describe("The full updated todo list. Always send the complete list, not just changes."),
})

export const updateTodoTool = {
	schema: {
		name: "update_todo",
		schema,
	},
	examples: [
		`<tool name="update_todo">
  <todos>
    <item>
      <id>task-001</id>
      <task>Read and analyze existing code structure</task>
      <status>completed</status>
      <priority>high</priority>
    </item>
    <item>
      <id>task-002</id>
      <task>Implement the new feature</task>
      <status>in_progress</status>
      <priority>high</priority>
    </item>
    <item>
      <id>task-003</id>
      <task>Write tests</task>
      <status>pending</status>
      <priority>medium</priority>
    </item>
  </todos>
</tool>`,
	],
}

export type UpdateTodoToolParams = {
	name: "update_todo"
	input: z.infer<typeof schema>
}
