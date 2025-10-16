import React, { useState } from "react"
import { CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react"
import { formatDate } from "@/utils/dateFormatter"

interface TaskCardProps {
	id: string
	task: string
	ts: number
	tokensIn?: number
	tokensOut?: number
	cacheWrites?: number
	cacheReads?: number
	totalCost: number
	onSelect: (id: string) => void
	isCompleted?: boolean
}

const TaskCard: React.FC<TaskCardProps> = ({
	id,
	task,
	ts,
	tokensIn,
	tokensOut,
	cacheWrites,
	cacheReads,
	totalCost,
	onSelect,
	isCompleted,
}) => {
	const [isExpanded, setIsExpanded] = useState(false)

	const handleToggle = (e: React.MouseEvent) => {
		e.stopPropagation()
		setIsExpanded(!isExpanded)
	}

	return (
		<div
			className={`group bg-card hover:bg-accent/50 border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 ${
				isCompleted ? "hover:border-success/50" : "hover:border-info/50"
			}`}>
			{/* 标题行 */}
			<div className="flex items-center justify-between gap-2 py-2 px-3 cursor-pointer" onClick={() => onSelect(id)}>
				<div className="flex-1 text-card-foreground truncate text-sm pr-2">
					{task}
				</div>
				<div className="flex items-center gap-2 flex-shrink-0">
					<div className="opacity-70 group-hover:opacity-100 transition-opacity">
						{isCompleted ? (
							<CheckCircle2 className="w-4 h-4 text-success" />
						) : (
							<Clock className="w-4 h-4 text-info" />
						)}
					</div>
					<button
						onClick={handleToggle}
						className="p-0.5 hover:bg-accent rounded transition-colors"
						aria-label={isExpanded ? "折叠" : "展开"}>
						{isExpanded ? (
							<ChevronUp className="w-4 h-4 text-light" />
						) : (
							<ChevronDown className="w-4 h-4 text-light" />
						)}
					</button>
				</div>
			</div>

			{/* 分割线 - 只在展开时显示 */}
			{isExpanded && <div className="border-t border-border/30 mx-3"></div>}

			{/* 可折叠的详细信息 */}
			{isExpanded && (
				<div className="px-3 py-2 space-y-2">
					<div className="text-light flex-line wrap !gap-2 text-xs" style={{ justifyContent: "space-between" }}>
						<div className="flex-line nowrap">
							<span className="text-alt">Tokens:</span>
							<code className="text-light">
								<span>↑</span>
								{tokensIn?.toLocaleString() ?? 0}
							</code>
							<code className="text-light">
								<span>↓</span>
								{tokensOut?.toLocaleString() ?? 0}
							</code>
						</div>
						{!!cacheWrites && !!cacheReads && (
							<div className="flex-line nowrap">
								<span className="text-alt">Cache:</span>
								<code className="text-light">
									<span>+</span>
									{cacheWrites?.toLocaleString()}
								</code>
								<code className="text-light">
									<span>→</span>
									{cacheReads?.toLocaleString()}
								</code>
							</div>
						)}
						<div className="flex-line nowrap">
							<span className="text-alt">API Cost:</span>
							<code className="text-light">
								<span>$</span>
								{totalCost?.toFixed(4) ?? 0}
							</code>
						</div>
					</div>
					<div className="text-light text-xs uppercase tracking-wide">{formatDate(ts)}</div>
				</div>
			)}
		</div>
	)
}

export default TaskCard
