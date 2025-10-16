import { Button } from "@/components/ui/button"
import { formatDate } from "@/utils/dateFormatter"
import { type HistoryItem } from "extension/shared/history-item"
import { CheckCircle2, Clock, Loader2, Trash2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"

type HistoryItemProps = {
	item: HistoryItem
	onSelect: (id: string) => void
	onDelete: (id: string) => void
	onExport: (id: string) => void
}

const HistoryItem = ({ item, onSelect, onDelete, onExport }: HistoryItemProps) => {
	const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({})
	const [isExpanded, setIsExpanded] = useState(false)
	const timeoutRef = useRef<NodeJS.Timeout | null>(null)

	// 点击状态图标展开，5秒后自动折叠
	const handleStatusClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		setIsExpanded(true)
		
		// 清除之前的定时器
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
		}
		
		// 5秒后自动折叠
		timeoutRef.current = setTimeout(() => {
			setIsExpanded(false)
		}, 5000)
	}

	// 组件卸载时清除定时器
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	return (
		<div
			className="cursor-pointer text-foreground border-b border-border hover:bg-secondary hover:text-secondary-foreground transition-colors"
			onClick={() => onSelect(item.id)}>
			<div className="flex flex-col gap-2 p-4 relative group">
				{/* 第一行：任务标题 + 右侧操作按钮 */}
				<div className="flex justify-between items-start gap-3">
					<div
						className="text-sm flex-1 line-clamp-2 whitespace-pre-wrap break-words overflow-wrap-anywhere"
						dangerouslySetInnerHTML={{ __html: item.name ?? item.task }}></div>
					
					<div className="flex items-center gap-2 flex-shrink-0">
						{/* 状态图标 - 可点击展开详情 */}
						<button
							onClick={handleStatusClick}
							className="hover:opacity-70 transition-opacity"
							title="Click to show details">
							{item.isCompleted ? (
								<CheckCircle2 className="w-4 h-4 text-success" />
							) : (
								<Clock className="w-4 h-4 text-info" />
							)}
						</button>

						{/* EXPORT 按钮 */}
						<Button
							variant="ghost"
							size="sm"
							className="h-7 px-2 text-xs opacity-80 group-hover:opacity-100 transition-opacity"
							onClick={(e) => {
								e.stopPropagation()
								onExport(item.id)
							}}>
							EXPORT
						</Button>

						{/* 删除按钮 */}
						<Button
							variant="ghost"
							size="sm"
							id={`delete-${item.id}`}
							disabled={isLoading[item.id]}
							className="h-7 w-7 p-0 opacity-80 group-hover:opacity-100 transition-opacity"
							onClick={(e) => {
								e.stopPropagation()
								setIsLoading((prev) => ({ ...prev, [item.id]: true }))
								onDelete(item.id)
							}}>
							<span className="sr-only">Delete</span>
							{isLoading[item.id] ? (
								<Loader2 className="animate-spin" size={16} />
							) : (
								<Trash2 aria-label="Delete" size={16} className="text-foreground" />
							)}
						</Button>
					</div>
				</div>

				{/* 第二行：详细信息（可折叠） */}
				<div
					className={`text-xs overflow-hidden transition-all duration-300 ${
						isExpanded ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
					}`}>
					<div className="flex justify-between items-center gap-4">
						{/* 左侧：日期、Tokens、Cache */}
						<div className="flex items-center gap-3 flex-wrap">
							<span className="font-medium uppercase text-muted-foreground">
								{formatDate(item.ts)}
							</span>
							
							<div className="flex items-center gap-2">
								<span className="font-medium">Tokens:</span>
								<span className="flex items-center gap-1">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="24"
										height="24"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="w-3 h-3">
										<path d="m6 9 6 6 6-6"></path>
									</svg>
									{item.tokensIn?.toLocaleString()}
								</span>
								<span className="flex items-center gap-1">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="24"
										height="24"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="w-3 h-3">
										<path d="m18 15-6-6-6 6"></path>
									</svg>
									{item.tokensOut?.toLocaleString()}
								</span>
							</div>

							{!!item.cacheWrites && (
								<div className="flex items-center gap-2">
									<span className="font-medium">Cache:</span>
									<span className="flex items-center gap-1">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="w-3 h-3">
											<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
											<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
											<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
										</svg>
										+{item.cacheWrites?.toLocaleString()}
									</span>
									<span className="flex items-center gap-1">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="24"
											height="24"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="w-3 h-3">
											<path d="M5 12h14"></path>
											<path d="m12 5 7 7-7 7"></path>
										</svg>
										{item.cacheReads?.toLocaleString()}
									</span>
								</div>
							)}
						</div>

						{/* 右侧：Cost */}
						{!!item.totalCost && (
							<div className="flex items-center gap-2 flex-shrink-0">
								<span className="font-medium">Cost:</span>
								<span className="font-semibold">${item.totalCost?.toFixed(4)}</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

export default HistoryItem
