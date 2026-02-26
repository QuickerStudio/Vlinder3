import React, { useCallback, useEffect, useRef, useState } from "react"
import { useEvent } from "react-use"
import { CheckCircle2, Circle, Clock, XCircle, Loader2, Plus, X, User, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import { vscode } from "@/utils/vscode"

export type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled"
export type TodoPriority = "low" | "medium" | "high" | "critical"
export type TodoSource = "agent" | "user"

export interface TodoItem {
	id: string
	task: string
	status: TodoStatus
	priority?: TodoPriority
	source: TodoSource
}


const statusIcon = (status: TodoStatus) => {
	switch (status) {
		case "completed":
			return <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
		case "in_progress":
			return <Loader2 className="w-3 h-3 text-blue-400 shrink-0 animate-spin" />
		case "cancelled":
			return <XCircle className="w-3 h-3 text-muted-foreground shrink-0" />
		default:
			return <Circle className="w-3 h-3 text-muted-foreground/50 shrink-0" />
	}
}

const priorityColor: Record<TodoPriority, string> = {
	low: "text-muted-foreground",
	medium: "text-yellow-400",
	high: "text-orange-400",
	critical: "text-red-500",
}

interface PartnerPanelProps {
	className?: string
}

const PartnerPanel: React.FC<PartnerPanelProps> = ({ className }) => {
	const [currentTodos, setCurrentTodos] = useState<TodoItem[]>([])
	const [queuedTasks, setQueuedTasks] = useState<string[]>([])
	const [inputValue, setInputValue] = useState("")
	const inputRef = useRef<HTMLInputElement>(null)

	// Persist queue to backend whenever it changes
	useEffect(() => {
		vscode.postMessage({ type: "updateQueuedTasks", tasks: queuedTasks } as any)
	}, [queuedTasks])

	const handleMessage = useCallback((e: MessageEvent) => {
		const msg = e.data

		// Restore persisted queue on launch
		if (msg.type === "queuedTasksSync" && Array.isArray(msg.tasks)) {
			setQueuedTasks(msg.tasks)
			return
		}

		if (msg.type === "todoListUpdated" && Array.isArray(msg.todos)) {
			const incoming: TodoItem[] = msg.todos
			const mode: string = msg.mode ?? "merge"

			setCurrentTodos((prev) => {
				if (mode === "replace") {
					const userTasks = prev.filter((t) => t.source === "user")
					return [...incoming.map((t) => ({ ...t, source: "agent" as TodoSource })), ...userTasks]
				}
				const merged = [...prev]
				for (const item of incoming) {
					const idx = merged.findIndex((t) => t.id === item.id)
					if (idx >= 0) {
						merged[idx] = { ...item, source: "agent" }
					} else {
						merged.push({ ...item, source: "agent" })
					}
				}
				return merged
			})

			// Remove queue items that Claude has picked up (name match)
			setQueuedTasks((prev) => {
				const pickedUp = new Set(incoming.map((t) => t.task.toLowerCase()))
				return prev.filter((q) => !pickedUp.has(q.toLowerCase()))
			})
			return
		}

		// Clear current tasks when a new task starts
		if (msg.type === "action" && msg.action === "chatButtonTapped") {
			setCurrentTodos([])
			return
		}

		// Clear current tasks when task completes (attempt_completion tool)
		if (msg.type === "claudeMessage") {
			try {
				const tool = JSON.parse(msg.claudeMessage?.text ?? "{}")
				if (tool?.tool === "attempt_completion") {
					setCurrentTodos([])
				}
			} catch {}
		}
	}, [])

	useEvent("message", handleMessage)

	const addQueuedTask = () => {
		const trimmed = inputValue.trim()
		if (!trimmed) return
		setQueuedTasks((prev) => [...prev, trimmed])
		setInputValue("")
		inputRef.current?.focus()
	}

	const removeQueuedTask = (index: number) => {
		setQueuedTasks((prev) => prev.filter((_, i) => i !== index))
	}

	// Agent tasks first, then user tasks
	const agentTasks = currentTodos.filter((t) => t.source === "agent")
	const userTasks = currentTodos.filter((t) => t.source === "user")
	const inProgress = currentTodos.filter((t) => t.status === "in_progress").length
	const completed = currentTodos.filter((t) => t.status === "completed").length

	const renderTodoItem = (item: TodoItem) => (
		<div
			key={item.id}
			className={cn(
				"flex items-start gap-1.5 py-0.5 rounded text-[11px]",
				item.status === "completed" && "opacity-40",
				item.status === "cancelled" && "opacity-25 line-through"
			)}>
			{statusIcon(item.status)}
			<span className={cn(
				"flex-1 leading-tight",
				item.status === "in_progress" && "text-foreground font-medium"
			)}>
				{item.task}
			</span>
			{item.priority && item.priority !== "low" && (
				<span className={cn("text-[10px] shrink-0", priorityColor[item.priority])}>
					{item.priority === "critical" ? "!" : item.priority === "high" ? "↑" : "~"}
				</span>
			)}
		</div>
	)

	return (
		<div className={cn("flex flex-col h-full min-h-0 overflow-hidden", className)}>
			{/* Current tasks — Claude managed, agent first then user */}
			<div className="flex flex-col flex-1 min-h-0">
				<div className="flex items-center gap-1.5 px-2 pt-1 pb-0.5 shrink-0">
					<span className="text-[11px] font-medium text-muted-foreground">Current tasks</span>
					{currentTodos.length > 0 && (
						<span className="ml-auto flex gap-1.5 text-[10px]">
							{inProgress > 0 && <span className="text-blue-400">{inProgress} active</span>}
							<span className="text-muted-foreground/50">{completed}/{currentTodos.length}</span>
						</span>
					)}
				</div>

				{currentTodos.length === 0 ? (
					<div className="flex-1 flex items-center justify-center">
						<div className="flex flex-col items-center gap-1">
							<Clock className="w-4 h-4 text-muted-foreground/30" />
							<span className="text-[11px] text-muted-foreground/40">No active tasks</span>
						</div>
					</div>
				) : (
					<div className="flex-1 overflow-y-auto px-2 pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
						{/* Agent tasks */}
						{agentTasks.length > 0 && (
							<div className="space-y-0.5">
								{userTasks.length > 0 && (
									<div className="flex items-center gap-1 py-0.5">
										<Bot className="w-2.5 h-2.5 text-muted-foreground/40" />
										<span className="text-[10px] text-muted-foreground/40">Agent</span>
									</div>
								)}
								{agentTasks.map(renderTodoItem)}
							</div>
						)}
						{/* User tasks */}
						{userTasks.length > 0 && (
							<div className="space-y-0.5 mt-1">
								<div className="flex items-center gap-1 py-0.5">
									<User className="w-2.5 h-2.5 text-muted-foreground/40" />
									<span className="text-[10px] text-muted-foreground/40">User</span>
								</div>
								{userTasks.map(renderTodoItem)}
							</div>
						)}
					</div>
				)}
			</div>

			{/* Tasks in queue — user managed, fixed at bottom */}
			<div className="flex flex-col shrink-0 border-t border-border/30">
				<div className="flex items-center gap-1 px-2 pt-1 pb-0.5">
					<span className="text-[11px] font-medium text-muted-foreground">Tasks in queue</span>
					{queuedTasks.length > 0 && (
						<span className="text-[10px] text-muted-foreground/50 ml-auto">{queuedTasks.length}</span>
					)}
				</div>
				{queuedTasks.length > 0 && (
					<div className="max-h-[56px] overflow-y-auto px-2 space-y-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
						{queuedTasks.map((task, i) => (
							<div key={i} className="flex items-center gap-1 group">
								<Circle className="w-2.5 h-2.5 text-muted-foreground/30 shrink-0" />
								<span className="flex-1 text-[11px] text-muted-foreground/70 leading-tight truncate">{task}</span>
								<button
									onClick={() => removeQueuedTask(i)}
									className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-muted-foreground transition-opacity"
								>
									<X className="w-2.5 h-2.5" />
								</button>
							</div>
						))}
					</div>
				)}
				<div className="flex items-center gap-1 px-2 py-1">
					<input
						ref={inputRef}
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addQueuedTask() } }}
						placeholder="Queue a task..."
						className="flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/40 outline-none min-w-0"
					/>
					<button
						onClick={addQueuedTask}
						disabled={!inputValue.trim()}
						className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground disabled:opacity-30 transition-colors"
					>
						<Plus className="w-3 h-3" />
					</button>
				</div>
			</div>
		</div>
	)
}

export default PartnerPanel
