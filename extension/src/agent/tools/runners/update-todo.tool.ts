import { BaseAgentTool } from "../base-agent.tool"
import { UpdateTodoToolParams } from "../schema/update-todo"
import { ToolResponseV2 } from "../../types"

export class UpdateTodoTool extends BaseAgentTool<UpdateTodoToolParams> {
	async execute(): Promise<ToolResponseV2> {
		const { input, updateAsk } = this.params
		const { todos } = input

		if (!todos || !Array.isArray(todos)) {
			return this.toolResponse("error", "Invalid todos input: expected an array")
		}

		// Push the todo list to the webview
		this.vlinders.providerRef
			.deref()
			?.getWebviewManager()
			?.postMessageToWebview({
				type: "todoListUpdated",
				todos,
			} as any)

		// Update tool state to approved (read-only, auto-approve)
		await updateAsk(
			"tool",
			{
				tool: {
					tool: "update_todo",
					todos,
					approvalState: "approved",
					ts: this.ts,
					isSubMsg: this.params.isSubMsg,
				} as any,
			},
			this.ts
		)

		const summary = todos
			.map((t) => `[${t.status}] ${t.task}`)
			.join("\n")

		return this.toolResponse(
			"success",
			`Todo list updated with ${todos.length} item(s):\n${summary}`
		)
	}
}
