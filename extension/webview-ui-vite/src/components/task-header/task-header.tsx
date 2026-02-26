import React from "react"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { ClaudeMessage } from "extension/shared/messages/extension-message"
import { vscode } from "../../utils/vscode"
import { cn } from "@/lib/utils"
import Thumbnails from "../thumbnails/thumbnails"
import TaskText from "./task-text"
import CreditsInfo from "./credits-info"
import { useExtensionState } from "@/context/extension-state-context"
import { useCollapseState } from "@/hooks/use-collapse-state"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { FoldVertical } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { rpcClient } from "@/lib/rpc-client"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu"

interface TaskHeaderProps {
	firstMsg?: ClaudeMessage
	onClose: () => void
	isHidden: boolean
	vlinderCredits?: number
	vscodeUriScheme?: string
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
	vlinderCredits,
	vscodeUriScheme,
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
				<div className="flex flex-wrap">
					<div style={{ flex: "1 1 0%" }}></div>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<VSCodeButton appearance="icon">Export</VSCodeButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem onClick={handleDownload}>Export</DropdownMenuItem>
							<DropdownMenuItem onClick={() => exportTaskFiles.mutate({ taskId: currentTaskId ?? "-" })}>
								Export (Task Files)
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

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
					<VSCodeButton appearance="icon" onClick={onClose}>
						<span className="codicon codicon-close"></span>
					</VSCodeButton>
					<div className="basis-full flex">
						<div key={currentTask?.name ?? currentTask?.task ?? firstMsg?.text} className="w-full">
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
					</div>
				</div>

				<CollapsibleContent className="flex flex-col pt-1 gap-2">
					<div
						className="flex flex-col pt-1 gap-2 w-full"
						key={currentTask?.name ?? currentTask?.task ?? firstMsg?.text}>
						{firstMsg?.images && firstMsg.images.length > 0 && <Thumbnails images={firstMsg.images} />}
					</div>
					<CreditsInfo vlinderCredits={vlinderCredits} vscodeUriScheme={vscodeUriScheme} />
				</CollapsibleContent>
			</Collapsible>
		</section>
	)
}
