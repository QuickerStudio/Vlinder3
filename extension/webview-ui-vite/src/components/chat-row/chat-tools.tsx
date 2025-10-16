/* eslint-disable @typescript-eslint/no-unused-vars */
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
	AlertCircle,
	Bot,
	CheckCircle,
	ChevronDown,
	ChevronUp,
	ClipboardCheck,
	Code,
	FileText,
	FolderTree,
	HelpCircle,
	Image,
	LoaderPinwheel,
	LogOut,
	MessageCircle,
	MessageCircleReply,
	Play,
	RefreshCw,
	Scissors,
	Search,
	Server,
	Square,
	Terminal,
	XCircle,
	ArrowRight,
	FolderInput,
	Timer,
	X,
	Filter,
	FileCode,
	BarChart3,
	TrendingUp,
	Activity,
	Clock,
	Trash2,
	Edit3,
	FileEdit,
	Copy,
	Check,
} from "lucide-react"
import React, { useMemo, useState } from "react"
import {
	AddInterestedFileTool,
	AskFollowupQuestionTool,
	AttemptCompletionTool,
	ChatTool,
	ExecuteCommandTool,
	ExploreRepoFolderTool,
	FileChangePlanTool,
	ListFilesTool,
	ReadFileTool,
	SearchFilesTool,
	SearchSymbolsTool,
	ServerRunnerTool,
	UrlScreenshotTool,
	SubmitReviewTool,
	MoveTool,
	TimerTool,
	ThinkTool,
	PatternSearchTool,
	GrepSearchTool,
	ReadProgressTool,
	RenameTool,
	RemoveTool,
	ReplaceStringTool,
	MultiReplaceStringTool,
	InsertEditTool,
	FastEditorTool,
} from "extension/shared/new-tools"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible"
import { ScrollArea, ScrollBar } from "../ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import { Badge } from "../ui/badge"
import { EnhancedWebSearchBlock } from "./tools/web-search-tool"
import { FileEditorTool } from "./tools/file-editor-tool"
import { ThinkToolBlock } from "./tools/think-tool"
import { SpawnAgentBlock, ExitAgentBlock } from "./tools/agent-tools"
import { FastEditorToolBlock } from "./tools/fast-editor-tool"
import MarkdownRenderer from "./markdown-renderer"
import { CodeBlock } from "./code-block"
import { getLanguageFromPath } from "@/utils/get-language-from-path"
import { rpcClient } from "@/lib/rpc-client"

type ApprovalState = ToolStatus
export type ToolAddons = {
	approvalState?: ApprovalState
	ts: number
	/**
	 * If this is a sub message, it will force it to stick to previous tool call in the ui (same message)
	 */
	isSubMsg?: boolean
	userFeedback?: string
}
type ToolBlockProps = {
	icon: React.FC<React.SVGProps<SVGSVGElement>>
	title: string
	children: React.ReactNode
	tool: ChatTool["tool"]
	variant: "default" | "primary" | "info" | "accent" | "info" | "success" | "info" | "destructive"
} & ToolAddons

export const ToolBlock: React.FC<ToolBlockProps> = ({
	icon: Icon,
	title,
	children,
	variant,
	isSubMsg,
	approvalState,
	userFeedback,
}) => {
	variant =
		approvalState === "loading"
			? "info"
			: approvalState === "error" || approvalState === "rejected"
			? "destructive"
			: approvalState === "approved"
			? "success"
			: variant
	const stateIcons = {
		pending: <AlertCircle className="w-5 h-5 text-info" />,
		approved: <CheckCircle className="w-5 h-5 text-success" />,
		rejected: <XCircle className="w-5 h-5 text-destructive" />,
		error: <AlertCircle className="w-5 h-5 text-destructive" />,
		loading: <LoaderPinwheel className="w-5 h-5 text-info animate-spin" />,
		feedback: <MessageCircleReply className="w-5 h-5 text-destructive" />,
	}

	if (!approvalState) {
		return null
	}

	return (
		<div
			className={cn(
				"border-l-4 p-3 bg-card text-card-foreground rounded-sm",
				{
					"border-primary": variant === "primary",
					"border-secondary": variant === "info",
					"border-accent": variant === "accent",
					"border-success": variant === "success",
					"border-info": variant === "info",
					"border-muted": variant === "default",
					"border-destructive": variant === "destructive",
				},
				isSubMsg && "!-mt-5"
			)}>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center">
					<Icon className={cn("w-5 h-5 mr-2", `text-${variant}`)} />
					<h3 className="text-sm font-semibold">{title}</h3>
				</div>

				{userFeedback ? (
					<Tooltip>
						<TooltipTrigger>{stateIcons["feedback"]}</TooltipTrigger>
						<TooltipContent side="left">The tool got rejected with feedback</TooltipContent>
					</Tooltip>
				) : (
					stateIcons[approvalState]
				)}
			</div>
			<div className="text-sm">{children}</div>
		</div>
	)
}

export const DevServerToolBlock: React.FC<ServerRunnerTool & ToolAddons> = ({
	commandType,
	commandToRun,
	approvalState,

	tool,
	serverName,
	ts,
	output,
	...rest
}) => {
	const [isOpen, setIsOpen] = useState(false)

	const getIcon = () => {
		switch (commandType) {
			case "start":
				return Play
			case "stop":
				return Square
			case "restart":
				return RefreshCw
			case "getLogs":
				return FileText
			default:
				return Server
		}
	}

	const Icon = getIcon()

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={Icon}
			// title={`Dev Server - ${commandType?.charAt(0)?.toUpperCase?.() + commandType?.slice?.(1)}`}
			title={`Dev Server - ${serverName}`}
			variant="primary"
			approvalState={approvalState}>
			<div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto">
				<span className="text-success">$</span> {commandToRun}
			</div>

			{approvalState === "loading" && (
				<div className="mt-2 flex items-center">
					<span className="text-xs mr-2">
						Server is {commandType === "stop" ? "stopping" : "starting"}...
					</span>
					<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
				</div>
			)}

			{output && (
				<Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
							<span>View Output</span>
							{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2">
						<ScrollArea className="h-[200px] w-full rounded-md border">
							<ScrollArea className="h-[200px] w-full rounded-md border">
								<div className="p-4">
									<pre className="text-sm whitespace-pre-wrap text-pretty break-all">{output}</pre>
								</div>{" "}
								<ScrollBar orientation="vertical" />
							</ScrollArea>

							<ScrollBar orientation="vertical" />
						</ScrollArea>
					</CollapsibleContent>
				</Collapsible>
			)}

			{approvalState === "approved" && commandType === "start" && (
				<p className="text-xs mt-2 text-success">Server started successfully.</p>
			)}

			{approvalState === "approved" && commandType === "stop" && (
				<p className="text-xs mt-2 text-success">Server stopped successfully.</p>
			)}
			{approvalState === "approved" && commandType === "restart" && (
				<p className="text-xs mt-2 text-success">Server restarted successfully.</p>
			)}
			{approvalState === "approved" && commandType === "getLogs" && (
				<p className="text-xs mt-2 text-success">Server logs retrieved successfully.</p>
			)}

			{approvalState === "error" && (
				<p className="text-xs mt-2 text-destructive">An error occurred while {commandType}ing the server.</p>
			)}
		</ToolBlock>
	)
}
export const ChatTruncatedBlock = ({ ts }: { ts: number }) => {
	return (
		<ToolBlock
			ts={ts}
			tool="write_to_file"
			icon={Scissors}
			title="Chat Compressed"
			variant="info"
			approvalState="approved"
			isSubMsg={false}>
			<div className="space-y-4">
				<div className="bg-secondary/20 p-3 rounded-md">
					<p className="text-sm">
						The conversation history was compressed before reaching the maximum context window. Previous
						content may be unavailable, but the task can continue.
					</p>
				</div>
			</div>
		</ToolBlock>
	)
}

export const ChatMaxWindowBlock = ({ ts }: { ts: number }) => (
	<ToolBlock
		icon={AlertCircle}
		title="Maximum Context Reached"
		variant="destructive"
		approvalState="approved"
		isSubMsg={false}
		ts={ts}
		tool="write_to_file">
		<div className="bg-destructive/20 p-3 rounded-md">
			<p className="text-sm font-medium">This task has reached its maximum context limit and cannot continue.</p>
			<p className="text-sm mt-2">Please start a new task to continue working. Your progress has been saved.</p>
		</div>
	</ToolBlock>
)

export const ExecuteCommandBlock: React.FC<
	ExecuteCommandTool &
		ToolAddons & {
			hasNextMessage?: boolean
		}
> = ({ command, output, approvalState, tool, ts, ...rest }) => {
	const [isOpen, setIsOpen] = React.useState(false)

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={Terminal}
			title="Execute Command"
			variant="info"
			approvalState={approvalState}>
			<div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto">
				<span className="text-success">$</span> {command}
			</div>
			{output && (
				<Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
							<span>View Output</span>
							{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2">
						<ScrollArea className="h-[200px] w-full rounded-md border">
							<div className="bg-secondary/20 p-3 rounded-md text-sm">
								<pre className="whitespace-pre-wrap text-pretty break-all">{output}</pre>
							</div>
							<ScrollBar orientation="vertical" />
						</ScrollArea>
					</CollapsibleContent>
				</Collapsible>
			)}
		</ToolBlock>
	)
}

export const ListFilesBlock: React.FC<ListFilesTool & ToolAddons> = ({
	path,
	recursive,
	approvalState,
	tool,
	ts,
	content,
	...rest
}) => {
	const [isOpen, setIsOpen] = React.useState(false)

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={FolderTree}
			title="List Files"
			variant="info"
			approvalState={approvalState}>
			<p className="text-xs">
				<span className="font-semibold">Folder:</span> {path}
			</p>
			<p className="text-xs">
				<span className="font-semibold">Include subfolders:</span> {recursive || "No"}
			</p>
			{content && (
				<Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
							<span>View Output</span>
							{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2">
						<ScrollArea className="h-[200px] w-full rounded-md border">
							<div className="bg-secondary/20 p-3 rounded-md text-sm">
								<pre className="whitespace-pre-wrap text-pretty break-all">{content}</pre>
							</div>
							<ScrollBar orientation="vertical" />
						</ScrollArea>
					</CollapsibleContent>
				</Collapsible>
			)}
		</ToolBlock>
	)
}

export const ExploreRepoFolderBlock: React.FC<ExploreRepoFolderTool & ToolAddons> = ({
	path,
	approvalState,
	tool,
	ts,
	...rest
}) => (
	<ToolBlock
		{...rest}
		ts={ts}
		tool={tool}
		icon={Code}
		title="Explore Repository Folder"
		variant="accent"
		approvalState={approvalState}>
		<p className="text-xs">
			<span className="font-semibold">Scanning folder:</span> {path}
		</p>
	</ToolBlock>
)

export const SearchFilesBlock: React.FC<SearchFilesTool & ToolAddons> = ({
	path,
	regex,
	filePattern,
	approvalState,
	content: output,
	tool,
	ts,
	...rest
}) => {
	const [isOpen, setIsOpen] = React.useState(false)

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={Search}
			title="Search Files"
			variant="info"
			approvalState={approvalState}>
			<p className="text-xs">
				<span className="font-semibold">Search in:</span> {path}
			</p>
			<p className="text-xs">
				<span className="font-semibold">Look for:</span> {regex}
			</p>
			{filePattern && (
				<p className="text-xs">
					<span className="font-semibold">File types:</span> {filePattern}
				</p>
			)}
			{output && (
				<Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
							<span>View Output</span>
							{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2">
						<ScrollArea className="h-[200px] w-full rounded-md border">
							<div className="bg-secondary/20 p-3 rounded-md text-sm">
								<pre className="whitespace-pre-wrap text-pretty">{output}</pre>
							</div>
							<ScrollBar orientation="vertical" />
							<ScrollBar orientation="horizontal" />
						</ScrollArea>
					</CollapsibleContent>
				</Collapsible>
			)}
		</ToolBlock>
	)
}

const CodeBlockMemorized = React.memo(({ content, path }: { content: string; path: string }) => {
	return (
		<ScrollArea className="h-[200px] w-full rounded-md border">
			<CodeBlock language={path} children={content} />
			<ScrollBar orientation="vertical" />
			<ScrollBar orientation="horizontal" />
		</ScrollArea>
	)
})

export const ReadFileBlock: React.FC<ReadFileTool & ToolAddons> = ({
	path,
	approvalState,
	content,
	tool,
	ts,
	...rest
}) => {
	const [isOpen, setIsOpen] = React.useState(false)
	const pathEnding = useMemo(() => getLanguageFromPath(path), [path])

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={FileText}
			title="Read File"
			variant="primary"
			approvalState={approvalState}>
			<p className="text-xs">
				<span className="font-semibold">File:</span>
				<Button
					onClick={() => {
						rpcClient.openFile.use({ filePath: path })
					}}
					variant="link"
					size="sm"
					className="ml-1 text-start">
					{path}
				</Button>
			</p>

			{content && content.length > 0 && (
				<Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
							<span>View Content</span>
							{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2">
						{/* this optimize the render to not do heavy work unless it's open */}
						{isOpen && <CodeBlockMemorized content={content} path={pathEnding ?? "text"} />}
					</CollapsibleContent>
				</Collapsible>
			)}
		</ToolBlock>
	)
}

export type ToolStatus = "pending" | "rejected" | "approved" | "error" | "loading" | undefined

export const AskFollowupQuestionBlock: React.FC<AskFollowupQuestionTool & ToolAddons> = ({
	question,
	approvalState,

	tool,
	ts,
	...rest
}) => {
	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={HelpCircle}
			title="Follow-up Question"
			variant="info"
			approvalState={approvalState}>
			<div className="bg-info/20 text-info-foreground p-2 rounded text-xs">
				<MarkdownRenderer>{question}</MarkdownRenderer>
			</div>
		</ToolBlock>
	)
}

export const AttemptCompletionBlock: React.FC<AttemptCompletionTool & ToolAddons> = ({
	result,
	approvalState,

	tool,
	ts,
	...rest
}) => (
	<ToolBlock
		{...rest}
		ts={ts}
		tool={tool}
		icon={CheckCircle}
		title="Task Completion"
		variant={approvalState === "approved" ? "success" : approvalState === "rejected" ? "destructive" : "info"}
		approvalState={approvalState}>
		{/* {command && (
			<div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto mb-2">
				<span className="text-success">$</span> {command}
			</div>
		)} */}
		<div className="bg-background text-foreground p-2 rounded text-xs w-full flex">
			<MarkdownRenderer markdown={result?.trim()} />
		</div>
	</ToolBlock>
)

export const UrlScreenshotBlock: React.FC<UrlScreenshotTool & ToolAddons> = ({
	url,
	approvalState,

	tool,
	base64Image,
	ts,
	...rest
}) => (
	<ToolBlock
		{...rest}
		ts={ts}
		tool={tool}
		icon={Image}
		title="URL Screenshot"
		variant="accent"
		approvalState={approvalState}>
		<p className="text-xs">
			<span className="font-semibold">Website:</span> {url}
		</p>
		{base64Image && (
			<div className="bg-muted rounded-md mt-2 text-xs w-full max-h-40 overflow-auto">
				<img src={`data:image/png;base64,${base64Image}`} alt="URL Screenshot" />
			</div>
		)}
	</ToolBlock>
)
export const SearchSymbolBlock: React.FC<SearchSymbolsTool & ToolAddons> = ({
	symbolName,
	content,
	approvalState,
	tool,
	ts,
	...rest
}) => {
	const [isOpen, setIsOpen] = React.useState(false)
	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={Search}
			title="Search Symbols"
			variant="accent"
			approvalState={approvalState}>
			<p className="text-xs">
				<span className="font-semibold">Symbol:</span> {symbolName}
			</p>
			{content && (
				<Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
							<span>View Results</span>
							{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2">
						<ScrollArea className="h-[200px] w-full rounded-md border">
							<div className="bg-secondary/20 p-3 rounded-md text-sm">
								<pre className="whitespace-pre-wrap">{content}</pre>
							</div>
							<ScrollBar orientation="vertical" />
							<ScrollBar orientation="horizontal" />
						</ScrollArea>
					</CollapsibleContent>
				</Collapsible>
			)}
		</ToolBlock>
	)
}

export const AddInterestedFileBlock: React.FC<AddInterestedFileTool & ToolAddons> = ({
	path,
	why,
	approvalState,
	tool,
	ts,
	...rest
}) => (
	<ToolBlock
		{...rest}
		ts={ts}
		tool={tool}
		icon={FileText}
		title="Track File"
		variant="info"
		approvalState={approvalState}>
		<p className="text-xs">
			<span className="font-semibold">File:</span> {path}
		</p>
		<p className="text-xs">
			<span className="font-semibold">Reason:</span> {why}
		</p>
	</ToolBlock>
)

export const FileChangesPlanBlock: React.FC<
	FileChangePlanTool &
		ToolAddons & {
			innerThoughts?: string
			innerSelfCritique?: string
			rejectedString?: string
		}
> = ({
	path,
	what_to_accomplish,
	approvalState,
	tool,
	ts,
	innerThoughts = "",
	innerSelfCritique = "",
	rejectedString,
	...rest
}) => {
	const [isReasoningOpen, setIsReasoningOpen] = React.useState(false)

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={FileText}
			title="File Changes Plan"
			variant="info"
			approvalState={approvalState}>
			<div className="text-xs space-y-3">
				<div className="space-y-1">
					<p>
						<span className="font-semibold">File:</span> {path}
					</p>
					<div>
						<span className="font-semibold">What to accomplish:</span>
						<div className="mt-1 bg-muted p-2 rounded-md">
							<MarkdownRenderer markdown={what_to_accomplish?.trim() ?? ""} />
						</div>
					</div>
				</div>

				{(innerThoughts.trim() || innerSelfCritique.trim()) && (
					<Collapsible
						open={isReasoningOpen}
						onOpenChange={setIsReasoningOpen}
						className="border-t pt-3 mt-3">
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="flex items-center w-full justify-between px-0">
								<div className="flex items-center space-x-2">
									<MessageCircle className="h-4 w-4 text-info" />
									<span className="font-medium">View Kodu Reasoning Steps</span>
								</div>
								{isReasoningOpen ? (
									<ChevronUp className="h-4 w-4" />
								) : (
									<ChevronDown className="h-4 w-4" />
								)}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-2 space-y-3">
							{innerThoughts.trim() && (
								<div className="bg-secondary/20 p-2 rounded-md">
									<h4 className="font-semibold flex items-center space-x-2 mb-1 text-xs uppercase tracking-wide text-secondary-foreground">
										<HelpCircle className="h-3 w-3" />
										<span>Inner Thoughts</span>
									</h4>
									<MarkdownRenderer markdown={innerThoughts.trim()} />
								</div>
							)}
							{innerSelfCritique.trim() && (
								<div className="bg-secondary/20 p-2 rounded-md">
									<h4 className="font-semibold flex items-center space-x-2 mb-1 text-xs uppercase tracking-wide text-secondary-foreground">
										<AlertCircle className="h-3 w-3" />
										<span>Inner Self-Critique</span>
									</h4>
									<MarkdownRenderer markdown={innerSelfCritique.trim()} />
								</div>
							)}
						</CollapsibleContent>
					</Collapsible>
				)}

				{rejectedString?.trim() && (
					<div className="bg-destructive/10 border border-destructive rounded-md p-3 mt-3">
						<div className="flex items-center space-x-2 mb-2 text-destructive">
							<AlertCircle className="h-4 w-4" />
							<span className="font-semibold text-sm">Plan Rejected</span>
						</div>
						<p className="text-sm text-destructive-foreground">
							Kodu decided to reject the change plan because of:
						</p>
						<div className="bg-destructive/20 p-2 rounded-md mt-2">
							<MarkdownRenderer markdown={rejectedString.trim()} />
						</div>
					</div>
				)}
			</div>
		</ToolBlock>
	)
}

export const SubmitReviewBlock: React.FC<SubmitReviewTool & ToolAddons> = ({
	review,
	approvalState,
	tool,
	ts,
	...rest
}) => {
	const [isOpen, setIsOpen] = React.useState(false)

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={ClipboardCheck}
			title="Submit Review"
			variant="accent"
			approvalState={approvalState}>
			<div className="text-xs space-y-3">
				{review && (
					<Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
								<span>View Review</span>
								{isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-2">
							<ScrollArea className="h-[200px] w-full rounded-md border">
								<div className="bg-secondary/20 p-3 rounded-md text-sm">
									<MarkdownRenderer markdown={review} />
								</div>
								<ScrollBar orientation="vertical" />
							</ScrollArea>
						</CollapsibleContent>
					</Collapsible>
				)}
			</div>
		</ToolBlock>
	)
}

export const MoveToolBlock: React.FC<MoveTool & ToolAddons> = ({
	source_path,
	destination_path,
	type,
	overwrite,
	merge,
	approvalState,
	tool,
	ts,
	...rest
}) => {
	const getIcon = () => {
		if (type === 'directory' || (type === 'auto' && !source_path.includes('.'))) {
			return FolderInput
		}
		return FileText
	}

	const Icon = getIcon()

	const operationType = type === 'directory' ? 'Directory' : type === 'file' ? 'File' : 'Item'

	return (
		<ToolBlock
			{...rest}
			ts={ts}
			tool={tool}
			icon={Icon}
			title={`Move ${operationType}`}
			variant="primary"
			approvalState={approvalState}>
			<div className="space-y-2 text-xs">
				<div className="flex items-center gap-2">
					<div className="bg-muted px-2 py-1 rounded font-mono text-xs flex-1 overflow-x-auto">
						<span className="text-muted-foreground">From:</span>{" "}
						<span className="text-foreground">{source_path}</span>
					</div>
				</div>
				
				<div className="flex items-center justify-center">
					<ArrowRight className="h-4 w-4 text-muted-foreground" />
				</div>
				
				<div className="flex items-center gap-2">
					<div className="bg-muted px-2 py-1 rounded font-mono text-xs flex-1 overflow-x-auto">
						<span className="text-muted-foreground">To:</span>{" "}
						<span className="text-foreground">{destination_path}</span>
					</div>
				</div>

				{(overwrite || merge) && (
					<div className="flex gap-2 flex-wrap mt-2">
						{overwrite && (
							<div className="bg-warning/20 border border-warning px-2 py-1 rounded text-xs">
								<span className="text-warning-foreground">Overwrite enabled</span>
							</div>
						)}
						{merge && (
							<div className="bg-info/20 border border-info px-2 py-1 rounded text-xs">
								<span className="text-info-foreground">Merge enabled</span>
							</div>
						)}
					</div>
				)}

				{approvalState === "loading" && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Moving {operationType.toLowerCase()}...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}

				{approvalState === "approved" && (
					<p className="text-xs mt-2 text-success">
						{operationType} moved successfully from {source_path} to {destination_path}
					</p>
				)}

				{approvalState === "error" && (
					<p className="text-xs mt-2 text-destructive">
						Failed to move {operationType.toLowerCase()}. Please check the paths and try again.
					</p>
				)}
			</div>
		</ToolBlock>
	)
}

type TimerInternalState = 'running' | 'completed' | 'stopped' | 'error'

export const TimerToolBlock: React.FC<TimerTool & ToolAddons> = ({
	duration,
	note,
	startTime,
	endTime,
	approvalState,
	timerStatus,
	ts,
	...rest
}) => {
	const [currentTime, setCurrentTime] = React.useState(Date.now())
	const [timerState, setTimerState] = React.useState<TimerInternalState>(timerStatus || 'running')
	const [isExpanded, setIsExpanded] = React.useState(false)

	// Sync with backend timerStatus
	React.useEffect(() => {
		if (timerStatus) {
			setTimerState(timerStatus)
		}
	}, [timerStatus])

	// Update current time every 100ms when timer is running
	React.useEffect(() => {
		if (timerState === 'running' && startTime && endTime) {
			const interval = setInterval(() => {
				const now = Date.now()
				setCurrentTime(now)

				// Check if timer naturally completed
				if (endTime && now >= endTime) {
					setTimerState('completed')
				}
			}, 100)
			return () => clearInterval(interval)
		}
	}, [timerState, startTime, endTime])

	// Sync with system approvalState for error states only
	React.useEffect(() => {
		if (approvalState === 'error' && timerState !== 'stopped' && timerState !== 'completed') {
			setTimerState('error')
		}
	}, [approvalState, timerState])

	// Format time in HH:MM:SS:mmm format
	const formatTime = (totalSeconds: number): string => {
		const hours = Math.floor(totalSeconds / 3600)
		const mins = Math.floor((totalSeconds % 3600) / 60)
		const secs = Math.floor(totalSeconds % 60)
		const ms = Math.floor(((totalSeconds % 1) * 1000))
		return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(ms).padStart(3, '0')}`
	}

	// Format local date time (YYYY-MM-DD HH:MM:SS)
	const formatLocalDateTime = (timestamp: number): string => {
		const date = new Date(timestamp)
		const year = date.getFullYear()
		const month = String(date.getMonth() + 1).padStart(2, '0')
		const day = String(date.getDate()).padStart(2, '0')
		const hours = String(date.getHours()).padStart(2, '0')
		const minutes = String(date.getMinutes()).padStart(2, '0')
		const seconds = String(date.getSeconds()).padStart(2, '0')
		return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
	}

	// Calculate remaining time based on internal timer state (with milliseconds precision)
	const getRemainingTime = (): number => {
		if (!startTime || !endTime) return duration || 0

		if (timerState === 'completed') {
			return 0
		}

		const remaining = Math.max(0, endTime - currentTime)
		return remaining / 1000 // Return with decimal for milliseconds
	}

	// Calculate progress percentage based on internal timer state
	const getProgress = (): number => {
		if (!startTime || !endTime) return 0

		if (timerState === 'completed') {
			return 100
		}

		const total = endTime - startTime
		const elapsed = currentTime - startTime
		return Math.min(100, Math.max(0, (elapsed / total) * 100))
	}

	// Calculate display time for countdown timer
	const remainingSeconds = getRemainingTime()
	const displayTime = formatTime(remainingSeconds)
	const progress = getProgress()

	// Get border color based on timer state
	const getBorderColor = () => {
		switch (timerState) {
			case 'completed':
				return 'border-l-green-500'
			case 'error':
				return 'border-l-red-500'
			case 'stopped':
				return 'border-l-yellow-500'
			default:
				return 'border-l-blue-500'
		}
	}

	// Get status icon
	const getStatusIcon = () => {
		switch (timerState) {
			case 'completed':
				return <CheckCircle className='h-4 w-4 text-green-600' />
			case 'error':
				return <AlertCircle className='h-4 w-4 text-red-600' />
			default:
				return <Timer className='h-4 w-4 text-blue-600' />
		}
	}

	// Get countdown color based on timer state
	const getCountdownColor = () => {
		switch (timerState) {
			case 'completed':
				return 'text-green-600 dark:text-green-400'
			case 'error':
				return 'text-red-600 dark:text-red-400'
			case 'stopped':
				return 'text-yellow-600 dark:text-yellow-400'
			case 'running':
			default:
				return 'text-blue-600 dark:text-blue-400'
		}
	}

	// Get status message with timestamp
	const getStatusMessage = () => {
		const now = Date.now()
		const currentLocalTime = formatLocalDateTime(now)

		switch (timerState) {
			case 'completed':
				return `Timer completed at ${currentLocalTime}`
			case 'error':
				return `Timer failed at ${currentLocalTime}`
			case 'stopped':
				return `Timer stopped at ${currentLocalTime}`
			case 'running':
				return `Timer running - Current time: ${currentLocalTime}`
			default:
				return null
		}
	}

	return (
		<div className={cn(
			'rounded-sm border-l-4 bg-card text-card-foreground',
			getBorderColor()
		)}>
			<div
				className='flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors'
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<div className='flex items-center flex-1 min-w-0'>
					{getStatusIcon()}
					<h3 className='text-sm font-semibold mx-3 flex-shrink-0'>Timer</h3>
					<span className='text-xs text-muted-foreground truncate'>
						<span className={cn('font-mono font-semibold', getCountdownColor())}>
							{displayTime}
						</span>
						<> • {Math.round(progress)}%</>
						{note && <> • {note}</>}
					</span>
				</div>

				<div className='flex items-center space-x-2'>
					{isExpanded ? (
						<ChevronUp className='w-4 h-4 text-muted-foreground' />
					) : (
						<ChevronDown className='w-4 h-4 text-muted-foreground' />
					)}
				</div>
			</div>

			<Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
				<CollapsibleContent className='px-3 pb-3'>
					<div className='text-sm border-t pt-3 space-y-3'>
						<div className='flex items-center justify-between'>
							<span className='text-xs font-semibold text-muted-foreground'>
								Time Remaining:
							</span>
							<span className={cn(
								'font-mono text-2xl font-bold tabular-nums',
								timerState === 'completed' ? 'text-green-600' :
								timerState === 'error' ? 'text-red-600' :
								timerState === 'stopped' ? 'text-yellow-600' :
								'text-blue-600'
							)}>
								{displayTime}
							</span>
						</div>

						{timerState === 'running' && (
							<div className='flex items-center gap-2'>
								<div className='flex-1 h-2 bg-muted rounded-full overflow-hidden'>
									<div
										className='h-full transition-all duration-300 bg-blue-500'
										style={{ width: `${progress}%` }}
									/>
								</div>
								<span className='text-xs text-muted-foreground whitespace-nowrap min-w-[35px] font-mono'>
									{Math.round(progress)}%
								</span>
							</div>
						)}

						{getStatusMessage() && (
							<p className='text-xs text-muted-foreground'>
								{getStatusMessage()}
							</p>
						)}

						{duration !== undefined && duration > 0 && (
							<p className='text-xs'>
								<span className='font-semibold'>Total Duration:</span> {duration}s ({Math.floor(duration / 3600)}h {Math.floor((duration % 3600) / 60)}m {duration % 60}s)
							</p>
						)}

						{startTime && (
							<p className='text-xs'>
								<span className='font-semibold'>Start Time:</span> {formatLocalDateTime(startTime)}
							</p>
						)}

						{endTime && (
							<p className='text-xs'>
								<span className='font-semibold'>{timerState === 'running' ? 'Expected End Time:' : 'End Time:'}</span> {formatLocalDateTime(endTime)}
							</p>
						)}

						{note && (
							<p className='text-xs'>
								<span className='font-semibold'>Note:</span> {note}
							</p>
						)}
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	)
}

// ============================================================================
// Grep Search Tool
// ============================================================================
export const GrepSearchToolBlock: React.FC<GrepSearchTool & ToolAddons> = ({
	query,
	isRegexp,
	includePattern,
	maxResults,
	content,
	approvalState,
	ts,
	userFeedback,
	isSubMsg,
}) => {
	const [isResultsOpen, setIsResultsOpen] = useState(false)

	const parseSearchResults = (text: string) => {
		const stats: Record<string, string> = {}
		const matches: Array<{ file: string; line: string; preview: string }> = []

		const totalMatchesMatch = text.match(/<total_matches>(\d+)<\/total_matches>/)
		const filesMatchedMatch = text.match(/<files_matched>(\d+)<\/files_matched>/)
		const maxResultsMatch = text.match(/<max_results>(\d+)<\/max_results>/)

		if (totalMatchesMatch) stats.totalMatches = totalMatchesMatch[1]
		if (filesMatchedMatch) stats.filesMatched = filesMatchedMatch[1]
		if (maxResultsMatch) stats.maxResults = maxResultsMatch[1]

		const fileMatches = text.match(/<file path="([^"]+)">(.*?)<\/file>/gs)
		if (fileMatches) {
			fileMatches.forEach((fileMatch) => {
				const pathMatch = fileMatch.match(/path="([^"]+)"/)
				const lineMatch = fileMatch.match(/<line>(\d+)<\/line>/)
				const previewMatch = fileMatch.match(/<preview>(.*?)<\/preview>/s)

				if (pathMatch && lineMatch && previewMatch) {
					matches.push({
						file: pathMatch[1],
						line: lineMatch[1],
						preview: previewMatch[1]
							.replace(/&lt;/g, '<')
							.replace(/&gt;/g, '>')
							.replace(/&quot;/g, '"')
							.replace(/&apos;/g, "'")
							.replace(/&amp;/g, '&'),
					})
				}
			})
		}

		return { stats, matches }
	}

	const { stats, matches } = content ? parseSearchResults(content) : { stats: {}, matches: [] }
	const hasMatches = stats.totalMatches && parseInt(stats.totalMatches) > 0

	const getVariant = () => {
		if (approvalState === 'loading') return 'border-info'
		if (approvalState === 'error' || approvalState === 'rejected') return 'border-destructive'
		if (approvalState === 'approved') return 'border-success'
		return 'border-muted'
	}

	const getStatusIcon = () => {
		if (approvalState === 'loading') {
			return <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-info"></div>
		}
		if (approvalState === 'error' || approvalState === 'rejected') {
			return <span className="text-destructive">✗</span>
		}
		if (approvalState === 'approved') {
			return <span className="text-success">✓</span>
		}
		return null
	}

	const groupedMatches = matches.reduce((acc, match) => {
		if (!acc[match.file]) {
			acc[match.file] = []
		}
		acc[match.file].push(match)
		return acc
	}, {} as Record<string, typeof matches>)

	return (
		<div className={cn('border-l-4 p-3 bg-card text-card-foreground rounded-sm', getVariant(), isSubMsg && '!-mt-5')}>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center">
					<Search className="w-5 h-5 mr-2 text-info" />
					<h3 className="text-sm font-semibold">Grep Search</h3>
				</div>
				{getStatusIcon()}
			</div>

			<div className="text-sm space-y-2">
				<div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto">
					<span className="text-muted-foreground">Query:</span> <span className="text-foreground">{query}</span>
				</div>

				<div className="flex gap-2 flex-wrap">
					{isRegexp !== undefined && (
						<Badge variant="secondary" className="text-xs">
							{isRegexp ? 'Regex' : 'Literal'}
						</Badge>
					)}
					{includePattern && (
						<Badge variant="outline" className="text-xs">
							<Filter className="w-3 h-3 mr-1" />
							{includePattern}
						</Badge>
					)}
					{maxResults && (
						<Badge variant="outline" className="text-xs">
							Max: {maxResults}
						</Badge>
					)}
				</div>

				{hasMatches && (
					<div className="flex gap-2 flex-wrap mt-2">
						<Badge variant="default" className="text-xs">
							<FileCode className="w-3 h-3 mr-1" />
							{stats.totalMatches} matches
						</Badge>
						<Badge variant="secondary" className="text-xs">
							{stats.filesMatched} files
						</Badge>
					</div>
				)}

				{approvalState === 'loading' && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Searching...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}

				{hasMatches && Object.keys(groupedMatches).length > 0 && (
					<Collapsible open={isResultsOpen} onOpenChange={setIsResultsOpen} className="mt-2">
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
								<span>View Search Results ({Object.keys(groupedMatches).length} files)</span>
								{isResultsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-2">
							<ScrollArea className="h-[400px] w-full rounded-md border">
								<div className="p-3 space-y-4">
									{Object.entries(groupedMatches).map(([file, fileMatches]) => (
										<div key={file} className="border-b pb-3 last:border-b-0">
											<div className="bg-muted px-2 py-1 rounded font-mono text-xs mb-2">
												<span className="text-muted-foreground">📄</span>{' '}
												<span className="text-foreground font-semibold">{file}</span>
												<span className="text-muted-foreground ml-2">
													({fileMatches.length} match{fileMatches.length !== 1 ? 'es' : ''})
												</span>
											</div>
											<div className="space-y-2 ml-2">
												{fileMatches.map((match, idx) => (
													<div key={idx} className="bg-secondary/20 p-2 rounded text-xs">
														<div className="text-muted-foreground mb-1 font-semibold">Line {match.line}:</div>
														<pre className="whitespace-pre-wrap text-pretty font-mono text-[10px]">{match.preview}</pre>
													</div>
												))}
											</div>
										</div>
									))}
								</div>
								<ScrollBar orientation="vertical" />
							</ScrollArea>
						</CollapsibleContent>
					</Collapsible>
				)}

				{content && !hasMatches && approvalState === 'approved' && (
					<div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
						No matches found for the specified query.
					</div>
				)}

				{approvalState === 'approved' && hasMatches && (
					<p className="text-xs mt-2 text-success">
						Found {stats.totalMatches} matches in {stats.filesMatched} files.
					</p>
				)}

				{approvalState === 'error' && (
					<p className="text-xs mt-2 text-destructive">Search failed. Please check the query syntax and try again.</p>
				)}

				{userFeedback && (
					<div className="mt-2 p-2 bg-destructive/10 border border-destructive rounded text-xs">
						<span className="font-semibold">User Feedback:</span> {userFeedback}
					</div>
				)}
			</div>
		</div>
	)
}

// ============================================================================
// Pattern Search Tool
// ============================================================================
export const PatternSearchToolBlock: React.FC<PatternSearchTool & ToolAddons> = ({
	searchPattern,
	files,
	caseSensitive,
	contextLinesBefore,
	contextLinesAfter,
	content,
	approvalState,
	ts,
	userFeedback,
	isSubMsg,
}) => {
	const [isAnalysisOpen, setIsAnalysisOpen] = useState(false)
	const [isMatchesOpen, setIsMatchesOpen] = useState(false)

	const parseStatistics = (text: string) => {
		const stats: Record<string, string> = {}
		const lines = text.split('\n')

		for (const line of lines) {
			if (line.includes('Total Matches:')) {
				stats.totalMatches = line.split(':')[1]?.trim() || '0'
			} else if (line.includes('Files Containing Pattern:')) {
				stats.filesMatched = line.split(':')[1]?.trim() || '0'
			} else if (line.includes('Average Matches per File:')) {
				stats.avgPerFile = line.split(':')[1]?.trim() || '0'
			} else if (line.includes('Search Time:')) {
				stats.searchTime = line.split(':')[1]?.trim() || '0ms'
			}
		}

		return stats
	}

	const stats = content ? parseStatistics(content) : {}
	const hasMatches = stats.totalMatches && parseInt(stats.totalMatches) > 0

	const getVariant = () => {
		if (approvalState === 'loading') return 'border-info'
		if (approvalState === 'error' || approvalState === 'rejected') return 'border-destructive'
		if (approvalState === 'approved') return 'border-success'
		return 'border-muted'
	}

	const getStatusIcon = () => {
		if (approvalState === 'loading') {
			return <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-info"></div>
		}
		if (approvalState === 'error' || approvalState === 'rejected') {
			return <span className="text-destructive">✗</span>
		}
		if (approvalState === 'approved') {
			return <span className="text-success">✓</span>
		}
		return null
	}

	return (
		<div className={cn('border-l-4 p-3 bg-card text-card-foreground rounded-sm', getVariant(), isSubMsg && '!-mt-5')}>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center">
					<Search className="w-5 h-5 mr-2 text-accent" />
					<h3 className="text-sm font-semibold">Pattern Search</h3>
				</div>
				{getStatusIcon()}
			</div>

			<div className="text-sm space-y-2">
				<div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto">
					<span className="text-muted-foreground">Pattern:</span> <span className="text-foreground">{searchPattern}</span>
				</div>

				{files && files.length > 0 && (
					<div className="text-xs">
						<span className="font-semibold">Files searched:</span> {files.length} file(s)
					</div>
				)}

				{caseSensitive !== undefined && (
					<div className="text-xs">
						<span className="font-semibold">Case sensitive:</span> {caseSensitive ? 'Yes' : 'No'}
					</div>
				)}

				{hasMatches && (
					<div className="flex gap-2 flex-wrap mt-2">
						<Badge variant="secondary" className="text-xs">
							<FileCode className="w-3 h-3 mr-1" />
							{stats.totalMatches} matches
						</Badge>
						<Badge variant="secondary" className="text-xs">
							<BarChart3 className="w-3 h-3 mr-1" />
							{stats.filesMatched} files
						</Badge>
						{stats.avgPerFile && (
							<Badge variant="secondary" className="text-xs">
								<TrendingUp className="w-3 h-3 mr-1" />
								{stats.avgPerFile} avg/file
							</Badge>
						)}
					</div>
				)}

				{approvalState === 'loading' && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Analyzing pattern...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}

				{content && hasMatches && (
					<>
						<Collapsible open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen} className="mt-2">
							<CollapsibleTrigger asChild>
								<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
									<span>View Pattern Analysis</span>
									{isAnalysisOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className="mt-2">
								<ScrollArea className="h-[300px] w-full rounded-md border">
									<div className="bg-secondary/20 p-3 rounded-md text-sm">
										<pre className="whitespace-pre-wrap text-pretty font-mono text-xs">
											{content.split('DETAILED PATTERN MATCHES')[0]}
										</pre>
									</div>
									<ScrollBar orientation="vertical" />
									<ScrollBar orientation="horizontal" />
								</ScrollArea>
							</CollapsibleContent>
						</Collapsible>

						<Collapsible open={isMatchesOpen} onOpenChange={setIsMatchesOpen} className="mt-2">
							<CollapsibleTrigger asChild>
								<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
									<span>View Detailed Matches</span>
									{isMatchesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent className="mt-2">
								<ScrollArea className="h-[400px] w-full rounded-md border">
									<div className="bg-secondary/20 p-3 rounded-md text-sm">
										<pre className="whitespace-pre-wrap text-pretty font-mono text-xs">
											{content.includes('DETAILED PATTERN MATCHES')
												? content.split('DETAILED PATTERN MATCHES')[1]
												: content}
										</pre>
									</div>
									<ScrollBar orientation="vertical" />
									<ScrollBar orientation="horizontal" />
								</ScrollArea>
							</CollapsibleContent>
						</Collapsible>
					</>
				)}

				{content && !hasMatches && (
					<div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
						No matches found for the specified pattern.
					</div>
				)}

				{approvalState === 'approved' && hasMatches && (
					<p className="text-xs mt-2 text-success">
						Pattern search completed successfully. Found {stats.totalMatches} matches in {stats.filesMatched} files.
					</p>
				)}

				{approvalState === 'error' && (
					<p className="text-xs mt-2 text-destructive">
						Pattern search failed. Please check the pattern syntax and try again.
					</p>
				)}

				{userFeedback && (
					<div className="mt-2 p-2 bg-destructive/10 border border-destructive rounded text-xs">
						<span className="font-semibold">User Feedback:</span> {userFeedback}
					</div>
				)}
			</div>
		</div>
	)
}

// ============================================================================
// File Operations Tools
// ============================================================================
export const RenameToolBlock: React.FC<RenameTool & ToolAddons> = ({
	path, new_name, type, overwrite, approvalState, ts, userFeedback, isSubMsg,
}) => {
	const getIcon = () => {
		if (type === 'directory' || (type === 'auto' && !path.includes('.'))) return FolderInput
		return FileEdit
	}
	const Icon = getIcon()
	const operationType = type === 'directory' ? 'Directory' : type === 'file' ? 'File' : 'Item'
	const getVariant = () => {
		if (approvalState === 'loading') return 'border-info'
		if (approvalState === 'error' || approvalState === 'rejected') return 'border-destructive'
		if (approvalState === 'approved') return 'border-success'
		return 'border-muted'
	}
	return (
		<div className={cn('border-l-4 p-3 bg-card text-card-foreground rounded-sm', getVariant(), isSubMsg && '!-mt-5')}>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center">
					<Icon className="w-5 h-5 mr-2 text-primary" />
					<h3 className="text-sm font-semibold">Rename {operationType}</h3>
				</div>
				{approvalState === 'approved' && <CheckCircle className="w-5 h-5 text-success" />}
				{(approvalState === 'error' || approvalState === 'rejected') && <AlertCircle className="w-5 h-5 text-destructive" />}
			</div>
			<div className="space-y-2 text-xs">
				<div className="bg-muted px-2 py-1 rounded font-mono text-xs overflow-x-auto">
					<span className="text-muted-foreground">From:</span> <span className="text-foreground">{path}</span>
				</div>
				<div className="flex items-center justify-center"><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
				<div className="bg-muted px-2 py-1 rounded font-mono text-xs overflow-x-auto">
					<span className="text-muted-foreground">To:</span> <span className="text-foreground">{new_name}</span>
				</div>
				{overwrite && <Badge variant="destructive" className="text-xs">Overwrite enabled</Badge>}
				{approvalState === 'loading' && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Renaming {operationType.toLowerCase()}...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}
				{approvalState === 'approved' && <p className="text-xs mt-2 text-success">{operationType} renamed successfully to {new_name}</p>}
				{approvalState === 'error' && <p className="text-xs mt-2 text-destructive">Failed to rename {operationType.toLowerCase()}. Please check the path and try again.</p>}
				{userFeedback && (
					<div className="mt-2 p-2 bg-destructive/10 border border-destructive rounded text-xs">
						<span className="font-semibold">User Feedback:</span> {userFeedback}
					</div>
				)}
			</div>
		</div>
	)
}

export const RemoveToolBlock: React.FC<RemoveTool & ToolAddons> = ({
	path, type, recursive, approvalState, ts, userFeedback, isSubMsg,
}) => {
	const getIcon = () => {
		if (type === 'directory' || (type === 'auto' && !path.includes('.'))) return FolderInput
		return FileText
	}
	const Icon = getIcon()
	const operationType = type === 'directory' ? 'Directory' : type === 'file' ? 'File' : 'Item'
	const getVariant = () => {
		if (approvalState === 'loading') return 'border-info'
		if (approvalState === 'error' || approvalState === 'rejected') return 'border-destructive'
		if (approvalState === 'approved') return 'border-success'
		return 'border-muted'
	}
	return (
		<div className={cn('border-l-4 p-3 bg-card text-card-foreground rounded-sm', getVariant(), isSubMsg && '!-mt-5')}>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center">
					<Trash2 className="w-5 h-5 mr-2 text-destructive" />
					<h3 className="text-sm font-semibold">Remove {operationType}</h3>
				</div>
				{approvalState === 'approved' && <CheckCircle className="w-5 h-5 text-success" />}
				{(approvalState === 'error' || approvalState === 'rejected') && <AlertCircle className="w-5 h-5 text-destructive" />}
			</div>
			<div className="space-y-2 text-xs">
				<div className="bg-destructive/10 border border-destructive px-2 py-1 rounded font-mono text-xs overflow-x-auto">
					<span className="text-destructive-foreground font-semibold">Removing:</span> <span className="text-foreground">{path}</span>
				</div>
				{recursive && <Badge variant="destructive" className="text-xs">Recursive deletion</Badge>}
				{approvalState === 'loading' && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Removing {operationType.toLowerCase()}...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-destructive"></div>
					</div>
				)}
				{approvalState === 'approved' && <p className="text-xs mt-2 text-success">{operationType} removed successfully</p>}
				{approvalState === 'error' && <p className="text-xs mt-2 text-destructive">Failed to remove {operationType.toLowerCase()}. Please check the path and permissions.</p>}
				{userFeedback && (
					<div className="mt-2 p-2 bg-destructive/10 border border-destructive rounded text-xs">
						<span className="font-semibold">User Feedback:</span> {userFeedback}
					</div>
				)}
			</div>
		</div>
	)
}

export const ReplaceStringToolBlock: React.FC<ReplaceStringTool & ToolAddons> = ({
	filePath, oldString, newString, explanation, occurrences, approvalState, ts, userFeedback, isSubMsg,
}) => {
	const [isDetailsOpen, setIsDetailsOpen] = useState(false)
	const getVariant = () => {
		if (approvalState === 'loading') return 'border-info'
		if (approvalState === 'error' || approvalState === 'rejected') return 'border-destructive'
		if (approvalState === 'approved') return 'border-success'
		return 'border-muted'
	}
	
	const getStatusIcon = () => {
		if (approvalState === 'loading') {
			return <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-info"></div>
		}
		if (approvalState === 'error' || approvalState === 'rejected') {
			return <XCircle className="w-5 h-5 text-destructive" />
		}
		if (approvalState === 'approved') {
			return <CheckCircle className="w-5 h-5 text-success" />
		}
		return null
	}
	
	return (
		<div className={cn('border-l-4 p-3 bg-card text-card-foreground rounded-sm', getVariant(), isSubMsg && '!-mt-5')}>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center">
					<Edit3 className="w-5 h-5 mr-2 text-accent" />
					<h3 className="text-sm font-semibold">Replace String</h3>
				</div>
				{getStatusIcon()}
			</div>
			<div className="space-y-2 text-xs">
				<div className="bg-muted px-2 py-1 rounded font-mono text-xs overflow-x-auto">
					<span className="text-muted-foreground">File:</span> <span className="text-foreground">{filePath}</span>
				</div>
				{explanation && (
					<div className="bg-info/10 border border-info p-2 rounded-md">
						<span className="text-info-foreground">{explanation}</span>
					</div>
				)}
				{occurrences !== undefined && (
					<Badge variant="secondary" className="text-xs">{occurrences} occurrence{occurrences !== 1 ? 's' : ''}</Badge>
				)}
				<Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
							<span>View Replacement Details</span>
							{isDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2 space-y-2">
						<div className="bg-destructive/10 border border-destructive px-2 py-1 rounded font-mono text-xs overflow-x-auto">
							<div className="text-destructive font-semibold mb-1">- Old:</div>
							<pre className="whitespace-pre-wrap break-all">{oldString}</pre>
						</div>
						<div className="flex items-center justify-center"><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
						<div className="bg-success/10 border border-success px-2 py-1 rounded font-mono text-xs overflow-x-auto">
							<div className="text-success font-semibold mb-1">+ New:</div>
							<pre className="whitespace-pre-wrap break-all">{newString}</pre>
						</div>
					</CollapsibleContent>
				</Collapsible>
				{approvalState === 'loading' && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Replacing string...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}
				{approvalState === 'approved' && <p className="text-xs mt-2 text-success">String replaced successfully</p>}
				{approvalState === 'error' && <p className="text-xs mt-2 text-destructive">Failed to replace string. Please check if the old string exists in the file.</p>}
				{userFeedback && (
					<div className="mt-2 p-2 bg-destructive/10 border border-destructive rounded text-xs">
						<span className="font-semibold">User Feedback:</span> {userFeedback}
					</div>
				)}
			</div>
		</div>
	)
}

export const MultiReplaceStringToolBlock: React.FC<MultiReplaceStringTool & ToolAddons> = ({
	replacements, explanation, successes, failures, errors, summary, approvalState, ts, userFeedback, isSubMsg,
}) => {
	const [isDetailsOpen, setIsDetailsOpen] = useState(false)
	const getVariant = () => {
		if (approvalState === 'loading') return 'border-info'
		if (approvalState === 'error' || approvalState === 'rejected') return 'border-destructive'
		if (approvalState === 'approved') return 'border-success'
		return 'border-muted'
	}
	
	const getStatusIcon = () => {
		if (approvalState === 'loading') {
			return <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-info"></div>
		}
		if (approvalState === 'error' || approvalState === 'rejected') {
			return <XCircle className="w-5 h-5 text-destructive" />
		}
		if (approvalState === 'approved') {
			return <CheckCircle className="w-5 h-5 text-success" />
		}
		return null
	}
	
	// Group replacements by file
	const fileGroups = React.useMemo(() => {
		if (!replacements || !Array.isArray(replacements)) {
			return new Map()
		}
		const groups = new Map<string, Array<{
			filePath: string
			oldString: string
			newString: string
			caseInsensitive?: boolean
			useRegex?: boolean
			order?: number
		}>>()
		replacements.forEach(rep => {
			if (!rep || !rep.filePath) return
			const existing = groups.get(rep.filePath) || []
			existing.push(rep)
			groups.set(rep.filePath, existing)
		})
		return groups
	}, [replacements])
	
	return (
		<div className={cn('border-l-4 p-3 bg-card text-card-foreground rounded-sm', getVariant(), isSubMsg && '!-mt-5')}>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center">
					<RefreshCw className="w-5 h-5 mr-2 text-accent" />
					<h3 className="text-sm font-semibold">Multi-Replace String</h3>
				</div>
				{getStatusIcon()}
			</div>
			<div className="space-y-2 text-xs">
				{explanation && (
					<div className="bg-info/10 border border-info p-2 rounded-md">
						<span className="text-info-foreground">{explanation}</span>
					</div>
				)}
				<div className="flex gap-2 flex-wrap">
					<Badge variant="secondary" className="text-xs">
						{replacements?.length || 0} replacement{(replacements?.length || 0) !== 1 ? 's' : ''}
					</Badge>
					<Badge variant="outline" className="text-xs">
						{fileGroups.size} file{fileGroups.size !== 1 ? 's' : ''}
					</Badge>
					{successes !== undefined && successes > 0 && (
						<Badge variant="outline" className="text-success border-success text-xs">
							{successes} succeeded
						</Badge>
					)}
					{failures !== undefined && failures > 0 && (
						<Badge variant="outline" className="text-destructive border-destructive text-xs">
							{failures} failed
						</Badge>
					)}
				</div>
				<Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
					<CollapsibleTrigger asChild>
						<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
							<span>View All Replacements</span>
							{isDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent className="mt-2">
						<ScrollArea className="h-[200px] w-full rounded-md border">
							<div className="p-2 space-y-3">
								{Array.from(fileGroups.entries()).map(([filePath, fileReplacements], fileIdx) => (
									<div key={fileIdx} className="border-b pb-2 last:border-b-0">
										<div className="bg-muted px-2 py-1 rounded font-mono text-xs mb-2">
											<span className="text-muted-foreground">File:</span> <span className="text-foreground">{filePath}</span>
										</div>
										{fileReplacements.map((rep: { filePath: string; oldString: string; newString: string }, idx: number) => (
											<div key={idx} className="ml-2 mb-2 last:mb-0">
												<div className="text-xs text-muted-foreground mb-1">Replacement #{idx + 1}</div>
												<div className="bg-destructive/10 border border-destructive px-2 py-1 rounded font-mono text-xs mb-1">
													<div className="text-destructive font-semibold">- Old:</div>
													<pre className="whitespace-pre-wrap break-all text-[10px]">{rep.oldString}</pre>
												</div>
												<div className="bg-success/10 border border-success px-2 py-1 rounded font-mono text-xs">
													<div className="text-success font-semibold">+ New:</div>
													<pre className="whitespace-pre-wrap break-all text-[10px]">{rep.newString}</pre>
												</div>
											</div>
										))}
									</div>
								))}
							</div>
							<ScrollBar orientation="vertical" />
						</ScrollArea>
					</CollapsibleContent>
				</Collapsible>
				{approvalState === 'loading' && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">Performing {replacements?.length || 0} replacement{(replacements?.length || 0) !== 1 ? 's' : ''}...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}
				{approvalState === 'approved' && successes !== undefined && (
					<p className="text-xs mt-2 text-success">Successfully performed {successes} replacement{successes !== 1 ? 's' : ''}</p>
				)}
				{approvalState === 'error' && (
					<p className="text-xs mt-2 text-destructive">
						{failures && failures > 0 
							? `Failed to perform ${failures} replacement${failures !== 1 ? 's' : ''}. Some strings may not have been found.`
							: 'Failed to perform replacements. Some strings may not have been found.'}
					</p>
				)}
				{errors && errors.length > 0 && (
					<div className="mt-2 p-2 bg-destructive/10 border border-destructive rounded text-xs">
						<div className="font-semibold mb-1">Errors:</div>
						<ul className="space-y-1 list-disc list-inside">
							{errors.map((error, idx) => (
								<li key={idx} className="text-destructive-foreground">{error}</li>
							))}
						</ul>
					</div>
				)}
				{userFeedback && (
					<div className="mt-2 p-2 bg-destructive/10 border border-destructive rounded text-xs">
						<span className="font-semibold">User Feedback:</span> {userFeedback}
					</div>
				)}
			</div>
		</div>
	)
}

export const InsertEditToolBlock: React.FC<InsertEditTool & ToolAddons> = ({
	filePath, startLine, endLine, code, explanation, operationType, lineRange, approvalState, ts, userFeedback, isSubMsg,
}) => {
	const [isContentOpen, setIsContentOpen] = useState(false)
	const getVariant = () => {
		if (approvalState === 'loading') return 'border-info'
		if (approvalState === 'error' || approvalState === 'rejected') return 'border-destructive'
		if (approvalState === 'approved') return 'border-success'
		return 'border-muted'
	}
	
	const getStatusIcon = () => {
		if (approvalState === 'loading') {
			return <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-info"></div>
		}
		if (approvalState === 'error' || approvalState === 'rejected') {
			return <XCircle className="w-5 h-5 text-destructive" />
		}
		if (approvalState === 'approved') {
			return <CheckCircle className="w-5 h-5 text-success" />
		}
		return null
	}
	
	const isReplacement = endLine !== undefined
	const title = operationType === 'insert' ? 'Insert Edit' : operationType === 'replace' ? 'Replace Edit' : 'Insert/Replace Edit'
	
	return (
		<div className={cn('border-l-4 p-3 bg-card text-card-foreground rounded-sm', getVariant(), isSubMsg && '!-mt-5')}>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center">
					<FileEdit className="w-5 h-5 mr-2 text-primary" />
					<h3 className="text-sm font-semibold">{title}</h3>
				</div>
				{getStatusIcon()}
			</div>
			<div className="space-y-2 text-xs">
				<div className="bg-muted px-2 py-1 rounded font-mono text-xs overflow-x-auto">
					<span className="text-muted-foreground">File:</span> <span className="text-foreground">{filePath}</span>
				</div>
				{explanation && (
					<div className="bg-info/10 border border-info p-2 rounded-md">
						<span className="text-info-foreground">{explanation}</span>
					</div>
				)}
				<div className="flex gap-2 flex-wrap">
					{lineRange && (
						<Badge variant="secondary" className="text-xs">{lineRange}</Badge>
					)}
					{operationType && (
						<Badge variant={operationType === 'insert' ? 'default' : 'outline'} className="text-xs">
							{operationType.toUpperCase()}
						</Badge>
					)}
				</div>
				{!lineRange && (
					<div className="text-xs">
						<span className="font-semibold">
							{isReplacement ? 'Replace lines:' : 'Insert at line:'}
						</span>{' '}
						{isReplacement ? `${startLine}-${endLine}` : startLine}
					</div>
				)}
				{code && (
					<Collapsible open={isContentOpen} onOpenChange={setIsContentOpen}>
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
								<span>View Content to {isReplacement ? 'Replace' : 'Insert'}</span>
								{isContentOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-2">
							<ScrollArea className="h-[200px] w-full rounded-md border">
								<div className="bg-success/10 border border-success p-2 rounded-md">
									<pre className="whitespace-pre-wrap font-mono text-[10px]">{code}</pre>
								</div>
								<ScrollBar orientation="vertical" /><ScrollBar orientation="horizontal" />
							</ScrollArea>
						</CollapsibleContent>
					</Collapsible>
				)}
				{approvalState === 'loading' && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">{isReplacement ? 'Replacing' : 'Inserting'} content...</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}
				{approvalState === 'approved' && (
					<p className="text-xs mt-2 text-success">
						Content {isReplacement ? 'replaced' : 'inserted'} successfully {lineRange ? `at ${lineRange}` : isReplacement ? `at lines ${startLine}-${endLine}` : `at line ${startLine}`}
					</p>
				)}
				{approvalState === 'error' && (
					<p className="text-xs mt-2 text-destructive">
						Failed to {isReplacement ? 'replace' : 'insert'} content. Please check the line number and file.
					</p>
				)}
				{userFeedback && (
					<div className="mt-2 p-2 bg-destructive/10 border border-destructive rounded text-xs">
						<span className="font-semibold">User Feedback:</span> {userFeedback}
					</div>
				)}
			</div>
		</div>
	)
}

// ============================================================================
// Read Progress Tool
// ============================================================================
export const ReadProgressToolBlock: React.FC<ReadProgressTool & ToolAddons> = ({
	terminalId, terminalName, includeFullOutput, filterKeywords, smartSummary, waitForCompletion,
	content, approvalState, ts, userFeedback, isSubMsg,
}) => {
	const [isOutputOpen, setIsOutputOpen] = useState(false)
	const [isSummaryOpen, setIsSummaryOpen] = useState(true)

	const parseTerminalInfo = (text: string) => {
		const info: Record<string, string> = {}
		const nameMatch = text.match(/<name>(.*?)<\/name>/)
		const terminalIdMatch = text.match(/<terminal_id>(.*?)<\/terminal_id>/)
		const processIdMatch = text.match(/<process_id>(.*?)<\/process_id>/)
		const busyMatch = text.match(/<busy>(.*?)<\/busy>/)
		const hotMatch = text.match(/<hot>(.*?)<\/hot>/)
		const completedMatch = text.match(/<completed>(.*?)<\/completed>/)
		const lastCommandMatch = text.match(/<last_command>(.*?)<\/last_command>/)
		const stateMatch = text.match(/state="([^"]*?)"/)
		const progressMatch = text.match(/progress="([^"]*?)"/)
		const activityMatch = text.match(/<activity>(.*?)<\/activity>/)
		const findingsMatch = text.match(/<findings>(.*?)<\/findings>/)
		if (nameMatch) info.name = nameMatch[1]
		if (terminalIdMatch) info.terminalId = terminalIdMatch[1]
		if (processIdMatch) info.processId = processIdMatch[1]
		if (busyMatch) info.busy = busyMatch[1]
		if (hotMatch) info.hot = hotMatch[1]
		if (completedMatch) info.completed = completedMatch[1]
		if (lastCommandMatch) info.lastCommand = lastCommandMatch[1]
		if (stateMatch) info.state = stateMatch[1]
		if (progressMatch) info.progress = progressMatch[1]
		if (activityMatch) info.activity = activityMatch[1]
		if (findingsMatch) info.findings = findingsMatch[1]
		return info
	}

	const extractOutput = (text: string) => {
		const outputMatch = text.match(/<output[^>]*>(.*?)<\/output>/s)
		const filteredMatch = text.match(/<filtered[^>]*>(.*?)<\/filtered>/s)
		if (filteredMatch && filteredMatch[1]) return filteredMatch[1].trim()
		if (outputMatch && outputMatch[1]) return outputMatch[1].trim()
		return ''
	}

	const info = content ? parseTerminalInfo(content) : {}
	const output = content ? extractOutput(content) : ''
	const isBusy = info.busy === 'true'
	const isHot = info.hot === 'true'
	const isCompleted = info.completed === 'true'

	const getVariant = () => {
		if (approvalState === 'loading') return 'border-info'
		if (approvalState === 'error' || approvalState === 'rejected') return 'border-destructive'
		if (approvalState === 'approved') return 'border-success'
		return 'border-muted'
	}

	const getStatusIcon = () => {
		if (approvalState === 'loading') return <Activity className="w-5 h-5 text-info animate-pulse" />
		if (isCompleted) return <CheckCircle className="w-5 h-5 text-success" />
		if (isBusy && isHot) return <Activity className="w-5 h-5 text-info animate-pulse" />
		if (isBusy && !isHot) return <Clock className="w-5 h-5 text-warning" />
		if (approvalState === 'error') return <AlertCircle className="w-5 h-5 text-destructive" />
		return <Terminal className="w-5 h-5 text-muted-foreground" />
	}

	const getStateDescription = () => {
		if (isCompleted) return 'Completed'
		if (isBusy && isHot) return 'Running (Active)'
		if (isBusy && !isHot) return 'Running (Idle)'
		return 'Monitoring'
	}

	return (
		<div className={cn('border-l-4 p-3 bg-card text-card-foreground rounded-sm', getVariant(), isSubMsg && '!-mt-5')}>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center">
					{getStatusIcon()}
					<h3 className="text-sm font-semibold ml-2">Read Progress</h3>
				</div>
			</div>
			<div className="text-sm space-y-2">
				{info.name && (
					<div className="flex items-center gap-2">
						<Badge variant="outline" className="text-xs"><Terminal className="w-3 h-3 mr-1" />{info.name}</Badge>
						{info.terminalId && <span className="text-xs text-muted-foreground">ID: {info.terminalId}</span>}
						{info.processId && info.processId !== 'unknown' && <span className="text-xs text-muted-foreground">PID: {info.processId}</span>}
					</div>
				)}
				<div className="flex items-center gap-2">
					<Badge variant={isCompleted ? 'default' : isBusy ? 'secondary' : 'outline'} className="text-xs">{getStateDescription()}</Badge>
					{info.progress && parseInt(info.progress) > 0 && <Badge variant="secondary" className="text-xs">{info.progress}%</Badge>}
				</div>
				{info.lastCommand && info.lastCommand !== 'unknown' && (
					<div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto">
						<span className="text-muted-foreground">$</span> <span className="text-foreground">{info.lastCommand}</span>
					</div>
				)}
				{filterKeywords && filterKeywords.length > 0 && (
					<div className="text-xs">
						<span className="font-semibold">Filtering for:</span>{' '}
						{filterKeywords.map((kw, idx) => <Badge key={idx} variant="secondary" className="text-xs ml-1">{kw}</Badge>)}
					</div>
				)}
				{info.activity && (
					<Collapsible open={isSummaryOpen} onOpenChange={setIsSummaryOpen} className="mt-2">
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
								<span>Activity Summary</span>
								{isSummaryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-2">
							<div className="bg-secondary/20 p-3 rounded-md text-xs space-y-2">
								{info.activity && <div><span className="font-semibold">Activity:</span> {info.activity}</div>}
								{info.findings && <div><span className="font-semibold">Findings:</span> {info.findings}</div>}
								{info.state && <div><span className="font-semibold">State:</span> {info.state}</div>}
							</div>
						</CollapsibleContent>
					</Collapsible>
				)}
				{output && (
					<Collapsible open={isOutputOpen} onOpenChange={setIsOutputOpen} className="mt-2">
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="flex items-center w-full justify-between">
								<span>View Terminal Output</span>
								{isOutputOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-2">
							<ScrollArea className="h-[300px] w-full rounded-md border">
								<div className="bg-secondary/20 p-3 rounded-md text-sm">
									<pre className="whitespace-pre-wrap text-pretty font-mono text-xs">{output}</pre>
								</div>
								<ScrollBar orientation="vertical" /><ScrollBar orientation="horizontal" />
							</ScrollArea>
						</CollapsibleContent>
					</Collapsible>
				)}
				{approvalState === 'loading' && (
					<div className="mt-2 flex items-center">
						<span className="text-xs mr-2">{waitForCompletion ? 'Waiting for completion...' : 'Reading terminal output...'}</span>
						<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
					</div>
				)}
				{approvalState === 'approved' && !isCompleted && <p className="text-xs mt-2 text-info">Terminal monitoring active.</p>}
				{approvalState === 'approved' && isCompleted && <p className="text-xs mt-2 text-success">Process completed successfully.</p>}
				{approvalState === 'error' && <p className="text-xs mt-2 text-destructive">Failed to read terminal progress. Please check terminal status.</p>}
				{userFeedback && (
					<div className="mt-2 p-2 bg-destructive/10 border border-destructive rounded text-xs">
						<span className="font-semibold">User Feedback:</span> {userFeedback}
					</div>
				)}
			</div>
		</div>
	)
}

export const ToolRenderer: React.FC<{
	tool: ChatTool
	hasNextMessage?: boolean
}> = ({ tool }) => {
	switch (tool.tool) {
		case "execute_command":
			return <ExecuteCommandBlock hasNextMessage {...tool} />
		case "list_files":
			return <ListFilesBlock {...tool} />
		case "explore_repo_folder":
			return <ExploreRepoFolderBlock {...tool} />
		case "search_files":
			return <SearchFilesBlock {...tool} />
		case "read_file":
			return <ReadFileBlock {...tool} />
		case "file_editor":
			return <FileEditorTool {...tool} />
		case "ask_followup_question":
			return <AskFollowupQuestionBlock {...tool} />
		case "attempt_completion":
			return <AttemptCompletionBlock {...tool} />
		case "web_search":
			return <EnhancedWebSearchBlock {...tool} />
		case "url_screenshot":
			return <UrlScreenshotBlock {...tool} />
		case "server_runner":
			return <DevServerToolBlock {...tool} />
		case "search_symbol":
			return <SearchSymbolBlock {...tool} />
		case "add_interested_file":
			return <AddInterestedFileBlock {...tool} />
		case "spawn_agent":
			return <SpawnAgentBlock {...tool} />
		case "exit_agent":
			return <ExitAgentBlock {...tool} />
		case "submit_review":
			return <SubmitReviewBlock {...tool} />
		case "move":
			return <MoveToolBlock {...tool} />
		case "timer":
			return <TimerToolBlock {...tool} />
		case "think":
			return <ThinkToolBlock {...tool} />
		case "pattern_search":
			return <PatternSearchToolBlock {...tool} />
		case "grep_search":
			return <GrepSearchToolBlock {...tool} />
		case "read_progress":
			return <ReadProgressToolBlock {...tool} />
		case "rename":
			return <RenameToolBlock {...tool} />
		case "remove":
			return <RemoveToolBlock {...tool} />
		case "replace_string":
			return <ReplaceStringToolBlock {...tool} />
		case "multi_replace_string":
			return <MultiReplaceStringToolBlock {...tool} />
		case "insert_edit":
			return <InsertEditToolBlock {...tool} />
		case "fast_editor":
			return <FastEditorToolBlock {...tool} />
		default:
			return null
	}
}
