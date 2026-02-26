import { Button } from "@/components/ui/button"
import { formatDate } from "@/utils/dateFormatter"
import { type HistoryItem } from "extension/shared/history-item"
import { CheckCircle2, Clock, Loader2, Trash2, Calendar, Coins, Zap, Download, Pin, Pencil } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import ConversationPreview from './conversation-preview'
import { vscode } from "@/utils/vscode"

type HistoryItemProps = {
	item: HistoryItem
	onSelect: (id: string) => void
	onDelete: (id: string) => void
	onExport: (id: string) => void
	onPin: (id: string) => void
}

const HistoryItem = ({ item, onSelect, onDelete, onExport, onPin }: HistoryItemProps) => {
    const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({})
    const [isExpanded, setIsExpanded] = useState(false)
    const [isPinned, setIsPinned] = useState(!!item.isPinned)
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

    // 同步本地 isPinned 与外部 props
    useEffect(() => {
        setIsPinned(!!item.isPinned)
    }, [item.isPinned])

	return (
		<div
			className="cursor-pointer text-foreground border-b border-border hover:bg-secondary hover:text-secondary-foreground transition-colors"
			onClick={() => onSelect(item.id)}>
			<div className="flex flex-col gap-1.5 py-2 px-4 relative group">
				{/* 第一行：任务标题 + 对话预览 + 右侧操作按钮 */}
				<div className="flex justify-between items-center gap-3 leading-none">
					<div className="flex items-center gap-2 flex-1 min-w-0">
						<Button
							variant="ghost"
							size="sm"
							className="h-6 w-6 p-0 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
							title="Rename"
							onClick={(e) => {
								e.stopPropagation()
								vscode.postMessage({ type: "renameTask", taskId: item.id })
							}}>
							<Pencil size={13} />
						</Button>
						<div
							className="text-sm flex-1 truncate leading-tight"
							dangerouslySetInnerHTML={{ __html: item.name ?? item.task }}></div>
						{/* 对话预览组件 */}
						<ConversationPreview taskId={item.id} />
					</div>
					
					<div className="flex items-center gap-2 flex-shrink-0">
						{/* 状态图标 - 可点击展开详情 */}
						<button
							onClick={handleStatusClick}
							className="hover:opacity-70 transition-opacity"
							title="Click to show details">
							{item.isCompleted ? (
								<CheckCircle2 className="w-5 h-5 text-success" />
							) : (
								<Clock className="w-5 h-5 text-info" />
							)}
						</button>

						{/* EXPORT 按钮 */}
						<Button
							variant="ghost"
							size="sm"
							className="h-7 w-7 p-0 opacity-80 group-hover:opacity-100 transition-opacity"
							onClick={(e) => {
								e.stopPropagation()
								onExport(item.id)
							}}
							title="Export">
							<Download size={20} className="text-foreground" />
							<span className="sr-only">Export</span>
						</Button>

                        {/* Pin 按钮 */}
                        <Button
                            variant="ghost"
                            size="sm"
                            title={isPinned ? 'Unpin' : 'Pin'}
                            className={`h-7 w-7 p-0 transition-opacity ${
                                isPinned
                                    ? 'opacity-100 text-primary'
                                    : 'opacity-80 group-hover:opacity-100'
                            }`}
                            onClick={(e) => {
                                e.stopPropagation()
                                // 乐观更新 UI
                                setIsPinned((prev) => !prev)
                                onPin(item.id)
                            }}>
                            <span className="sr-only">{isPinned ? 'Unpin' : 'Pin'}</span>
                            <Pin
                                size={20}
                                className={isPinned ? 'fill-current' : ''}
                            />
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
								<Loader2 className="animate-spin" size={20} />
							) : (
								<Trash2 aria-label="Delete" size={20} className="text-foreground" />
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
							{/* 日期图标 */}
							<div className="flex items-center gap-1.5">
								<Calendar className="w-3.5 h-3.5 text-muted-foreground" />
								<span className="font-medium uppercase text-muted-foreground">
									{formatDate(item.ts)}
								</span>
							</div>
							
							{/* Tokens 图标 */}
							<div className="flex items-center gap-1.5">
								<Zap className="w-3.5 h-3.5 text-amber-500" />
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

							{/* Cache 图标 */}
							{!!item.cacheWrites && (
								<div className="flex items-center gap-1.5">
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
											className="w-3 h-3 text-blue-500">
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

						{/* 右侧：Cost 图标 */}
						{!!item.totalCost && (
							<div className="flex items-center gap-1.5 flex-shrink-0">
								<Coins className="w-3.5 h-3.5 text-green-500" />
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
