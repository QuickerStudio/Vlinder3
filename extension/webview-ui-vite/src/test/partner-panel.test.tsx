import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PartnerPanel from "../components/chat-view/partner-panel"
import { vscode } from "@/utils/vscode"

// Helper: dispatch a window message event
const dispatchMsg = (data: object) => {
	act(() => {
		window.dispatchEvent(new MessageEvent("message", { data }))
	})
}

beforeEach(() => {
	vi.clearAllMocks()
})

// ─── 1. Agent tool: update_todo updates Current tasks ────────────────────────
describe("Agent tool — update_todo", () => {
	it("renders agent tasks from todoListUpdated message (merge)", async () => {
		render(<PartnerPanel />)

		dispatchMsg({
			type: "todoListUpdated",
			mode: "merge",
			todos: [
				{ id: "t1", task: "Analyze codebase", status: "completed", priority: "high", source: "agent" },
				{ id: "t2", task: "Implement feature", status: "in_progress", priority: "critical", source: "agent" },
				{ id: "t3", task: "Write tests", status: "pending", priority: "medium", source: "agent" },
			],
		})

		await waitFor(() => {
			expect(screen.getByText("Analyze codebase")).toBeInTheDocument()
			expect(screen.getByText("Implement feature")).toBeInTheDocument()
			expect(screen.getByText("Write tests")).toBeInTheDocument()
		})
	})

	it("merges incremental updates by id without duplicating", async () => {
		render(<PartnerPanel />)

		dispatchMsg({
			type: "todoListUpdated",
			mode: "merge",
			todos: [
				{ id: "t1", task: "Analyze codebase", status: "pending", source: "agent" },
				{ id: "t2", task: "Implement feature", status: "pending", source: "agent" },
			],
		})

		// Update t1 status only
		dispatchMsg({
			type: "todoListUpdated",
			mode: "merge",
			todos: [{ id: "t1", task: "Analyze codebase", status: "completed", source: "agent" }],
		})

		await waitFor(() => {
			// Both tasks still present, no duplicates
			expect(screen.getAllByText("Analyze codebase")).toHaveLength(1)
			expect(screen.getAllByText("Implement feature")).toHaveLength(1)
		})
	})

	it("replace mode replaces all agent tasks but keeps user tasks", async () => {
		render(<PartnerPanel />)

		// First add a user task via queue then simulate it being in currentTodos
		// Seed with agent + user tasks via two merge messages
		dispatchMsg({
			type: "todoListUpdated",
			mode: "merge",
			todos: [
				{ id: "a1", task: "Old agent task", status: "pending", source: "agent" },
				{ id: "u1", task: "User task", status: "pending", source: "user" },
			],
		})

		dispatchMsg({
			type: "todoListUpdated",
			mode: "replace",
			todos: [{ id: "a2", task: "New agent task", status: "in_progress", source: "agent" }],
		})

		await waitFor(() => {
			expect(screen.queryByText("Old agent task")).not.toBeInTheDocument()
			expect(screen.getByText("New agent task")).toBeInTheDocument()
			// User task preserved
			expect(screen.getByText("User task")).toBeInTheDocument()
		})
	})

	it("shows active count and completion ratio in header", async () => {
		render(<PartnerPanel />)

		dispatchMsg({
			type: "todoListUpdated",
			mode: "merge",
			todos: [
				{ id: "t1", task: "Task A", status: "completed", source: "agent" },
				{ id: "t2", task: "Task B", status: "in_progress", source: "agent" },
				{ id: "t3", task: "Task C", status: "pending", source: "agent" },
			],
		})

		await waitFor(() => {
			expect(screen.getByText("1 active")).toBeInTheDocument()
			expect(screen.getByText("1/3")).toBeInTheDocument()
		})
	})

	it("clears current tasks on attempt_completion", async () => {
		render(<PartnerPanel />)

		dispatchMsg({
			type: "todoListUpdated",
			mode: "merge",
			todos: [{ id: "t1", task: "Some task", status: "in_progress", source: "agent" }],
		})

		await waitFor(() => expect(screen.getByText("Some task")).toBeInTheDocument())

		dispatchMsg({
			type: "claudeMessage",
			claudeMessage: { text: '{"tool":"attempt_completion","result":"done"}' },
		})

		await waitFor(() => {
			expect(screen.queryByText("Some task")).not.toBeInTheDocument()
			expect(screen.getByText("No active tasks")).toBeInTheDocument()
		})
	})
})

// ─── 2. User queue management ────────────────────────────────────────────────
describe("User — Tasks in queue", () => {
	it("adds a task to the queue on Enter", async () => {
		const user = userEvent.setup()
		render(<PartnerPanel />)

		const input = screen.getByPlaceholderText("Queue a task...")
		await user.click(input)
		await user.type(input, "Add dark mode{Enter}")

		expect(screen.getByText("Add dark mode")).toBeInTheDocument()
	})

	it("adds a task via + button click", async () => {
		const user = userEvent.setup()
		render(<PartnerPanel />)

		const input = screen.getByPlaceholderText("Queue a task...")
		await user.type(input, "Refactor auth module")
		await user.click(screen.getByRole("button", { name: "" })) // Plus button

		expect(screen.getByText("Refactor auth module")).toBeInTheDocument()
	})

	it("removes a queued task on × click", async () => {
		const user = userEvent.setup()
		render(<PartnerPanel />)

		const input = screen.getByPlaceholderText("Queue a task...")
		await user.type(input, "Task to remove{Enter}")

		expect(screen.getByText("Task to remove")).toBeInTheDocument()

		// Hover to reveal × button
		const taskRow = screen.getByText("Task to remove").closest("div")!
		fireEvent.mouseEnter(taskRow)
		const removeBtn = taskRow.querySelector("button")!
		await user.click(removeBtn)

		expect(screen.queryByText("Task to remove")).not.toBeInTheDocument()
	})

	it("persists queue to backend via postMessage on add", async () => {
		const user = userEvent.setup()
		render(<PartnerPanel />)

		// Wait for initialization timeout
		await act(async () => { await new Promise(r => setTimeout(r, 600)) })

		const input = screen.getByPlaceholderText("Queue a task...")
		await user.type(input, "Persist this{Enter}")

		await waitFor(() => {
			expect(vscode.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({ type: "updateQueuedTasks", tasks: ["Persist this"] })
			)
		})
	})

	it("restores queue from queuedTasksSync on launch", async () => {
		render(<PartnerPanel />)

		dispatchMsg({ type: "queuedTasksSync", tasks: ["Restored task 1", "Restored task 2"] })

		await waitFor(() => {
			expect(screen.getByText("Restored task 1")).toBeInTheDocument()
			expect(screen.getByText("Restored task 2")).toBeInTheDocument()
		})
	})

	it("does not overwrite persisted queue before sync arrives", async () => {
		render(<PartnerPanel />)

		// postMessage should NOT be called immediately on mount (before initialized)
		expect(vscode.postMessage).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: "updateQueuedTasks" })
		)
	})
})

// ─── 3. Agent awareness of user queue ────────────────────────────────────────
describe("Agent awareness — queue promotion", () => {
	it("removes queue item when agent picks it up by name match", async () => {
		const user = userEvent.setup()
		render(<PartnerPanel />)

		// User queues a task
		const input = screen.getByPlaceholderText("Queue a task...")
		await user.type(input, "Add OAuth2 login{Enter}")
		expect(screen.getByText("Add OAuth2 login")).toBeInTheDocument()

		// Agent sends update_todo with matching task name
		dispatchMsg({
			type: "todoListUpdated",
			mode: "merge",
			todos: [{ id: "a1", task: "Add OAuth2 login", status: "in_progress", source: "agent" }],
		})

		await waitFor(() => {
			// Task promoted to Current tasks
			expect(screen.getByText("Add OAuth2 login")).toBeInTheDocument()
			// Queue count should be 0 (no queue badge)
			expect(screen.queryByText("1")).not.toBeInTheDocument()
		})
	})

	it("shows Agent/User section labels when both types present", async () => {
		render(<PartnerPanel />)

		dispatchMsg({
			type: "todoListUpdated",
			mode: "merge",
			todos: [
				{ id: "a1", task: "Agent task", status: "pending", source: "agent" },
				{ id: "u1", task: "User task", status: "pending", source: "user" },
			],
		})

		await waitFor(() => {
			expect(screen.getByText("Agent")).toBeInTheDocument()
			expect(screen.getByText("User")).toBeInTheDocument()
		})
	})

	it("does NOT show Agent/User labels when only agent tasks present", async () => {
		render(<PartnerPanel />)

		dispatchMsg({
			type: "todoListUpdated",
			mode: "merge",
			todos: [{ id: "a1", task: "Only agent task", status: "pending", source: "agent" }],
		})

		await waitFor(() => {
			expect(screen.queryByText("Agent")).not.toBeInTheDocument()
			expect(screen.queryByText("User")).not.toBeInTheDocument()
		})
	})

	it("clears current tasks when new task starts (empty claudeMessages)", async () => {
		render(<PartnerPanel />)

		dispatchMsg({
			type: "todoListUpdated",
			mode: "merge",
			todos: [{ id: "t1", task: "Previous task", status: "in_progress", source: "agent" }],
		})

		await waitFor(() => expect(screen.getByText("Previous task")).toBeInTheDocument())

		dispatchMsg({ type: "claudeMessages", claudeMessages: [] })

		await waitFor(() => {
			expect(screen.queryByText("Previous task")).not.toBeInTheDocument()
		})
	})
})

// ─── 4. Duplicate task handling ──────────────────────────────────────────────
describe("Duplicate task handling", () => {
	it("allows adding the same task text to queue multiple times", async () => {
		const user = userEvent.setup()
		render(<PartnerPanel />)

		const input = screen.getByPlaceholderText("Queue a task...")
		await user.type(input, "Fix login bug{Enter}")
		await user.type(input, "Fix login bug{Enter}")

		// Both entries should exist (user may intentionally queue same task twice)
		const items = screen.getAllByText("Fix login bug")
		expect(items).toHaveLength(2)
	})

	it("agent sending same id twice updates in-place, no duplicate", async () => {
		render(<PartnerPanel />)

		dispatchMsg({
			type: "todoListUpdated",
			mode: "merge",
			todos: [{ id: "dup-1", task: "Refactor auth", status: "pending", source: "agent" }],
		})
		dispatchMsg({
			type: "todoListUpdated",
			mode: "merge",
			todos: [{ id: "dup-1", task: "Refactor auth", status: "in_progress", source: "agent" }],
		})

		await waitFor(() => {
			expect(screen.getAllByText("Refactor auth")).toHaveLength(1)
			// in_progress style applied
			expect(screen.getByText("Refactor auth")).toHaveClass("font-medium")
		})
	})

	it("agent sending same task name but different id creates two entries", async () => {
		render(<PartnerPanel />)

		dispatchMsg({
			type: "todoListUpdated",
			mode: "merge",
			todos: [
				{ id: "a1", task: "Write tests", status: "completed", source: "agent" },
				{ id: "a2", task: "Write tests", status: "pending", source: "agent" },
			],
		})

		await waitFor(() => {
			expect(screen.getAllByText("Write tests")).toHaveLength(2)
		})
	})

	it("queue name-match promotion removes ALL matching queue entries", async () => {
		const user = userEvent.setup()
		render(<PartnerPanel />)

		const input = screen.getByPlaceholderText("Queue a task...")
		await user.type(input, "Add dark mode{Enter}")
		await user.type(input, "Add dark mode{Enter}")

		expect(screen.getAllByText("Add dark mode")).toHaveLength(2)

		dispatchMsg({
			type: "todoListUpdated",
			mode: "merge",
			todos: [{ id: "a1", task: "Add dark mode", status: "in_progress", source: "agent" }],
		})

		await waitFor(() => {
			// Queue entries removed, only Current tasks entry remains
			expect(screen.getAllByText("Add dark mode")).toHaveLength(1)
		})
	})
})
