import React, { useState } from "react"
import { CheckCircle2, Clock, ChevronDown, ChevronUp } from "lucide-react"
import { formatDate } from "@/utils/dateFormatter"
import ArrowTooltips from "@/components/ui/arrow-tooltips"
import ConversationPreview from "@/components/history-view/conversation-preview"

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

	// 构建 tooltip 内容
	const tooltipContent = () => {
		const parts = []
		parts.push(`Tokens: ↑${tokensIn?.toLocaleString() ?? 0} ↓${tokensOut?.toLocaleString() ?? 0}`)
		if (cacheWrites && cacheReads) {
			parts.push(`Cache: +${cacheWrites?.toLocaleString()} →${cacheReads?.toLocaleString()}`)
		}
		parts.push(`API Cost: $${totalCost?.toFixed(4) ?? 0}`)
		return parts.join(" | ")
	}

	return (
		<div
			className={`group bg-card hover:bg-accent/50 border border-border/50 shadow-sm hover:shadow-md transition-all duration-200 ${
				isCompleted ? "hover:border-success/50" : "hover:border-info/50"
			}`}
			style={{
				scrollSnapAlign: "start",
			}}>
			{/* 标题行 */}
			<div className="flex items-center justify-between gap-2 py-2 px-3 cursor-pointer" onClick={() => onSelect(id)}>
				<div className="flex-1 text-card-foreground truncate text-sm pr-2">
					{task}
				</div>
				<div className="flex items-center gap-2 flex-shrink-0">
					<ArrowTooltips title={tooltipContent()} side="top" delayDuration={300}>
						<div className="opacity-70 group-hover:opacity-100 transition-opacity cursor-help">
							{isCompleted ? (
								<CheckCircle2 className="w-4 h-4 text-success" />
							) : (
								<Clock className="w-4 h-4 text-info" />
							)}
						</div>
					</ArrowTooltips>
					<button
						onClick={handleToggle}
						className="p-0.5 hover:bg-accent rounded transition-colors"
						aria-label={isExpanded ? "Collapse" : "Expand"}>
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

			{/* 可折叠的时间信息 */}
			{isExpanded && (
				<div className="px-3 py-2 flex items-center justify-between">
					<div className="flex items-center justify-start">
						<ConversationPreview taskId={id} />
					</div>
					<div className="flex items-center justify-end text-light text-sm tracking-wide">
						{formatDate(ts)}
					</div>
				</div>
			)}
		</div>
	)
}

export default TaskCard
