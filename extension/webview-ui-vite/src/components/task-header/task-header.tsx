import React from "react"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { ClaudeMessage } from "extension/shared/messages/extension-message"
import { vscode } from "../../utils/vscode"
import { cn } from "@/lib/utils"
import Thumbnails from "../thumbnails/thumbnails"
import TaskText from "./task-text"
import { useExtensionState } from "@/context/extension-state-context"
import { useCollapseState } from "@/hooks/use-collapse-state"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { FoldVertical, Download } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { rpcClient } from "@/lib/rpc-client"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"

interface TaskHeaderProps {
	firstMsg?: ClaudeMessage
	onClose: () => void
	isHidden: boolean
	elapsedTime?: number
	lastMessageAt?: number
}

function formatElapsedTime(ms: number): string {
	const seconds = Math.floor(ms / 1000)
	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = seconds % 60

	if (minutes > 0) {
		return `${minutes}m ${remainingSeconds}s`
	}
	return `${seconds}s`
}

export default function TaskHeader({
	firstMsg,
	onClose,
	elapsedTime,
	lastMessageAt,
}: TaskHeaderProps) {
	const { currentTaskId, currentTask } = useExtensionState()
	const { collapseAll, isAllCollapsed } = useCollapseState()
	const [isOpen, setIsOpen] = React.useState(true)
	const exportTaskFiles = rpcClient.exportTaskFiles.useMutation()

	const handleDownload = () => {
		vscode.postMessage({ type: "exportCurrentTask" })
	}

	const timingTooltip = firstMsg
		? [
				`Started At: ${new Date(firstMsg.ts).toLocaleString()}`,
				elapsedTime !== undefined && lastMessageAt
					? `Ended At: ${new Date(lastMessageAt).toLocaleString()}\nTotal Working Time: ${formatElapsedTime(elapsedTime)}`
					: null,
		  ]
				.filter(Boolean)
				.join("\n")
		: undefined

	return (
		<section className="pb-1">
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<div className="flex items-start gap-1">
					{/* Task title — takes remaining space */}
					<div className="flex-1 min-w-0 pt-0.5">
						<Tooltip>
							<TooltipTrigger asChild>
								<div>
									<TaskText text={currentTask?.name ?? currentTask?.task ?? firstMsg?.text} />
								</div>
							</TooltipTrigger>
							{timingTooltip && (
								<TooltipContent avoidCollisions side="bottom" className="whitespace-pre-line">
									{timingTooltip}
								</TooltipContent>
							)}
						</Tooltip>
					</div>

					{/* Right-side buttons */}
					<div className="flex items-center shrink-0">
						<Tooltip>
							<TooltipTrigger asChild>
								<VSCodeButton appearance="icon" onClick={collapseAll}>
									<FoldVertical
										size={16}
										className={cn("transition-transform", isAllCollapsed && "rotate-180")}
									/>
								</VSCodeButton>
							</TooltipTrigger>
							<TooltipContent avoidCollisions side="left">
								{isAllCollapsed ? "Expand All Messages" : "Collapse All Messages"}
							</TooltipContent>
						</Tooltip>

						<DropdownMenu>
							<Tooltip>
								<TooltipTrigger asChild>
									<DropdownMenuTrigger asChild>
										<VSCodeButton appearance="icon">
											<Download size={14} />
										</VSCodeButton>
									</DropdownMenuTrigger>
								</TooltipTrigger>
								<TooltipContent avoidCollisions side="left">Export</TooltipContent>
							</Tooltip>
							<DropdownMenuContent>
								<DropdownMenuItem onClick={handleDownload}>Export</DropdownMenuItem>
								<DropdownMenuItem onClick={() => exportTaskFiles.mutate({ taskId: currentTaskId ?? "-" })}>
									Export (Task Files)
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						<VSCodeButton appearance="icon" onClick={onClose}>
							<span className="codicon codicon-close"></span>
						</VSCodeButton>
					</div>
				</div>

				<CollapsibleContent className="flex flex-col pt-1 gap-2">
					<div className="flex flex-col pt-1 gap-2 w-full">
						{firstMsg?.images && firstMsg.images.length > 0 && <Thumbnails images={firstMsg.images} />}
					</div>
				</CollapsibleContent>
			</Collapsible>
		</section>
	)
}
