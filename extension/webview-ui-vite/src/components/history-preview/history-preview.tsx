import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import React, { useState, useRef, useEffect } from "react"
import { useExtensionState } from "../../context/extension-state-context"
import { vscode } from "../../utils/vscode"
import TaskCard from "./task-card"

interface HistoryPreviewProps {
	showHistoryView: () => void
}

const HistoryPreview: React.FC<HistoryPreviewProps> = ({ showHistoryView }) => {
	const { taskHistory } = useExtensionState()
	const [isExpandedAll, setIsExpandedAll] = useState(false)
	const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

	const handleHistorySelect = (id: string) => {
		vscode.postMessage({ type: "showTaskWithId", text: id })
	}

	const handleToggleExpandAll = () => {
		setIsExpandedAll(!isExpandedAll)
		// 清空单独展开的卡片状态
		if (!isExpandedAll) {
			setExpandedCards({})
		}
	}

	const handleToggleCard = (id: string, expanded: boolean) => {
		setExpandedCards((prev) => ({
			...prev,
			[id]: expanded,
		}))
	}

	// 计算折叠卡片的高度
	const getCollapsedCardHeight = (): number => {
		// 找到第一个折叠状态的卡片
		for (const [id, cardWrapper] of cardRefs.current.entries()) {
			const isCardExpanded = isExpandedAll || expandedCards[id]
			if (!isCardExpanded) {
				// 获取卡片的实际高度（包括边框和 padding）
				const cardElement = cardWrapper.firstElementChild as HTMLElement
				if (cardElement) {
					const height = cardElement.offsetHeight
					if (height > 0) {
						return height
					}
				}
			}
		}
		
		// 如果所有卡片都展开了，使用第一个卡片来估算折叠高度
		const firstCard = cardRefs.current.values().next().value
		if (firstCard) {
			const cardElement = firstCard.firstElementChild as HTMLElement
			if (cardElement) {
				// 获取标题行的高度（py-2 + 内容高度）
				const titleRow = cardElement.querySelector('.flex.items-center.justify-between.gap-2') as HTMLElement
				if (titleRow) {
					// 标题行的高度 + 边框
					return titleRow.offsetHeight + 2 // +2 for borders
				}
			}
		}
		
		// 默认高度：py-2(16px) + 文本行高(~25px) + 边框(2px)
		return 43
	}

	// 处理滚轮事件
	useEffect(() => {
		const container = scrollContainerRef.current
		if (!container) return

		const handleWheel = (e: WheelEvent) => {
			e.preventDefault()

			// 检查是否有展开的卡片
			const hasExpandedCards = Object.values(expandedCards).some((expanded) => expanded)
			
			if (hasExpandedCards) {
				// 先折叠所有卡片
				setExpandedCards({})
				return
			}

			// 计算滚动距离：2个折叠卡片的高度 + 1个间距(space-y-1 = 4px)
			const collapsedCardHeight = getCollapsedCardHeight()
			const scrollDistance = collapsedCardHeight * 2 + 4

			// 根据滚动方向滚动
			if (e.deltaY > 0) {
				// 向下滚动
				container.scrollBy({
					top: scrollDistance,
					behavior: "smooth",
				})
			} else {
				// 向上滚动
				container.scrollBy({
					top: -scrollDistance,
					behavior: "smooth",
				})
			}
		}

		container.addEventListener("wheel", handleWheel, { passive: false })
		return () => {
			container.removeEventListener("wheel", handleWheel)
		}
	}, [expandedCards])

	return (
		<section className="border-b-0 !pb-2 !pt-2">
			{/* 横向布局：左侧（标题+按钮） | 右侧（滚动容器） */}
			<div className="flex items-end gap-3">
				{/* 左侧：标题和按钮的垂直布局 */}
				<div className="flex flex-col gap-2 flex-shrink-0">
					<h3 className="flex-line uppercase text-alt">
						<span className="codicon codicon-history text-alt" />
						Recent Tasks
					</h3>
					<VSCodeButton appearance="icon" onClick={showHistoryView}>
						<div className="text-light whitespace-nowrap">View all history</div>
					</VSCodeButton>
					<VSCodeButton appearance="icon" onClick={handleToggleExpandAll}>
						<div className="text-light whitespace-nowrap">
							{isExpandedAll ? "Collapse all ↑" : "Expand all ↓"}
						</div>
					</VSCodeButton>
				</div>

				{/* 右侧：可滚动的 task-card 容器 */}
				<div
					ref={scrollContainerRef}
					className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide transition-all duration-300"
					style={{
						maxHeight: isExpandedAll ? "400px" : "82px",
						scrollSnapType: isExpandedAll ? "none" : "y mandatory", // 全部展开时禁用捕捉
					}}>
					<div className="space-y-1">
						{taskHistory
							.filter((item) => item.ts && item.task)
							.slice(0, 8)
							.map((item) => (
								<div
									key={item.id}
									ref={(el) => {
										if (el) {
											cardRefs.current.set(item.id, el)
										} else {
											cardRefs.current.delete(item.id)
										}
									}}>
									<TaskCard
										id={item.id}
										task={item.name ?? item.task}
										ts={item.ts}
										tokensIn={item.tokensIn}
										tokensOut={item.tokensOut}
										cacheWrites={item.cacheWrites}
										cacheReads={item.cacheReads}
										totalCost={item.totalCost}
										isCompleted={item.isCompleted}
										onSelect={handleHistorySelect}
										isExpanded={isExpandedAll || expandedCards[item.id] || false}
										onToggleExpand={handleToggleCard}
									/>
								</div>
							))}
					</div>
				</div>
			</div>
		</section>
	)
}

export default HistoryPreview
