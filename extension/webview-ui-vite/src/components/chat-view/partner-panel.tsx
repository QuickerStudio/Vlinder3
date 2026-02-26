import React, { useCallback, useState } from "react"
import { useEvent } from "react-use"
import { CheckCircle2, Circle, Clock, XCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled"
export type TodoPriority = "low" | "medium" | "high" | "critical"

export interface TodoItem {
	id: string
	task: string
	status: TodoStatus
	priority?: TodoPriority
}

const MOCK_TODOS: TodoItem[] = [
	{ id: "1", task: "Analyze existing authentication code", status: "completed", priority: "high" },
	{ id: "2", task: "Design new database schema for user roles", status: "completed", priority: "high" },
	{ id: "3", task: "Implement role-based middleware", status: "in_progress", priority: "critical" },
	{ id: "4", task: "Update API endpoints with auth checks", status: "pending", priority: "high" },
	{ id: "5", task: "Update frontend components for roles", status: "pending", priority: "medium" },
	{ id: "6", task: "Write unit tests for auth middleware", status: "pending", priority: "medium" },
	{ id: "7", task: "Write integration tests", status: "pending", priority: "low" },
	{ id: "8", task: "Update legacy session handler", status: "cancelled", priority: "low" },
]

const statusIcon = (status: TodoStatus) => {
	switch (status) {
		case "completed":
			return <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
		case "in_progress":
			return <Loader2 className="w-3.5 h-3.5 text-blue-400 shrink-0 animate-spin" />
		case "cancelled":
			return <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
		default:
			return <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
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
	const [todos, setTodos] = useState<TodoItem[]>(MOCK_TODOS)

	const handleMessage = useCallback((e: MessageEvent) => {
		const msg = e.data
		if (msg.type === "todoListUpdated" && Array.isArray(msg.todos)) {
			setTodos(msg.todos)
		}
	}, [])

	useEvent("message", handleMessage)

	const inProgress = todos.filter((t) => t.status === "in_progress").length
	const completed = todos.filter((t) => t.status === "completed").length

	if (todos.length === 0) {
		return (
			<div className={cn("flex flex-col h-full items-center justify-center gap-1 px-3", className)}>
				<Clock className="w-5 h-5 text-muted-foreground/40" />
				<span className="text-[11px] text-muted-foreground/50 text-center">
					Task plan will appear here
				</span>
			</div>
		)
	}

	return (
		<div className={cn("flex flex-col h-full overflow-hidden", className)}>
			{/* Header — always visible, no collapse */}
			<div className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-muted-foreground shrink-0">
				<span className="font-medium">Task Plan</span>
				<span className="ml-auto flex gap-1.5">
					{inProgress > 0 && (
						<span className="text-blue-400">{inProgress} active</span>
					)}
					<span className="text-muted-foreground/60">
						{completed}/{todos.length}
					</span>
				</span>
			</div>

			{/* Scrollable todo list */}
			<div className="flex-1 overflow-y-auto px-2 pb-1 space-y-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
				{todos.map((item) => (
					<div
						key={item.id}
						className={cn(
							"flex items-start gap-1.5 py-0.5 rounded text-[11px]",
							item.status === "completed" && "opacity-50",
							item.status === "cancelled" && "opacity-30 line-through"
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
				))}
			</div>
		</div>
	)
}

export default PartnerPanel
