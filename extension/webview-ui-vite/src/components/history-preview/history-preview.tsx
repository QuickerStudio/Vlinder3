import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import React, { useState } from "react"
import { useExtensionState } from "../../context/extension-state-context"
import { vscode } from "../../utils/vscode"
import TaskCard from "./task-card"

interface HistoryPreviewProps {
	showHistoryView: () => void
}

const HistoryPreview: React.FC<HistoryPreviewProps> = ({ showHistoryView }) => {
	const { taskHistory } = useExtensionState()
	const [isExpandedAll, setIsExpandedAll] = useState(false)

	const handleHistorySelect = (id: string) => {
		vscode.postMessage({ type: "showTaskWithId", text: id })
	}

	const handleToggleExpandAll = () => {
		setIsExpandedAll(!isExpandedAll)
	}

	return (
		<section className="border-b-0 !pb-0 !pt-2">
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
					className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide transition-all duration-300"
					style={{
						maxHeight: isExpandedAll ? "400px" : "82px",
						scrollSnapType: "y mandatory", // 启用垂直滚动捕捉
					}}>
					<div className="space-y-1">
						{taskHistory
							.filter((item) => item.ts && item.task)
							.slice(0, 8)
							.map((item) => (
								<TaskCard
									key={item.id}
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
								/>
							))}
					</div>
				</div>
			</div>
		</section>
	)
}

export default HistoryPreview
