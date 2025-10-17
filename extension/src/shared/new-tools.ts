import { SpawnAgentOptions } from "../agent/v1/tools/schema/agents/agent-spawner"
import { ToolStatus } from "./messages/extension-message"

// Re-export ToolStatus for external use
export type { ToolStatus }

/**
 * This is the input and output for execute_command tool
 */
export type ExecuteCommandTool = {
	tool: "execute_command"
	/**
	 * the command to execute
	 */
	command: string
	/**
	 * the output of the command
	 */
	output?: string
	/**
	 * this is a long running command so ask user if they want to continue
	 */
	earlyExit?: "pending" | "approved" | "rejected"

	commitHash?: string
	branch?: string
}

export type ListFilesTool = {
	tool: "list_files"
	path: string
	recursive?: "true" | "false"
	content?: string
}

export type ExploreRepoFolderTool = {
	tool: "explore_repo_folder"
	path: string
	content?: string
}

export type SearchFilesTool = {
	tool: "search_files"
	path: string
	regex: string
	filePattern?: string
	content?: string
}

export type ReadFileTool = {
	tool: "read_file"
	path: string
	content: string
	pageNumber?: number
	readAllPages?: boolean
}

export type WriteToFileTool = {
	tool: "write_to_file"
	mode?: "inline" | "whole"
	path: string
	content?: string
	diff?: string
	notAppliedCount?: number
	branch?: string
	commitHash?: string
}

export type AskFollowupQuestionTool = {
	tool: "ask_followup_question"
	question: string
}

export type AttemptCompletionTool = {
	tool: "attempt_completion"
	command?: string
	commandResult?: string
	result: string
}

export interface WebSearchTool {
	tool: "web_search"
	searchQuery: string
	baseLink?: string
	content?: string
	browserModel?: "smart" | "fast"
	browserMode?: "api_docs" | "generic"
	streamType?: "start" | "explore" | "summarize" | "end"
}

export type ServerRunnerTool = {
	tool: "server_runner"
	port?: number
	serverName?: string
	commandType?: "start" | "stop" | "restart" | "getLogs"
	output?: string
	commandToRun?: string
	lines?: string
}

export type UrlScreenshotTool = {
	tool: "url_screenshot"
	url: string
	base64Image?: string
}

export type UpsertMemoryTool = {
	tool: "upsert_memory"
	milestoneName?: string
	summary?: string
	content?: string
}

export type SearchSymbolsTool = {
	tool: "search_symbol"
	symbolName: string
	content?: string
}

export type AddInterestedFileTool = {
	tool: "add_interested_file"
	path: string
	why: string
}

export type FileChangePlanTool = {
	tool: "file_changes_plan"
	path: string
	what_to_accomplish: string
	innerThoughts?: string
	innerSelfCritique?: string
	rejectedString?: string
}

export type FileEditorTool = {
	tool: "file_editor"
	path: string
	mode: "edit" | "whole_write" | "rollback" | "list_versions"
	vlinder_content?: string
	vlinder_diff?: string
	list_versions?: boolean
	rollback_version?: string
	list_versions_output?: string
	saved_version?: string
	notAppliedCount?: number
	commitHash?: string
	branch?: string
}

export type SpawnAgentTool = {
	tool: "spawn_agent"
	agentName: SpawnAgentOptions
	instructions: string
	files?: string | string[]
}

export type ExitAgentTool = {
	tool: "exit_agent"
	agentName: SpawnAgentOptions
	result: string
}

export type SubmitReviewTool = {
	tool: "submit_review"
	review: string
}

export type MoveTool = {
	tool: "move"
	source_path: string
	destination_path: string
	type?: "file" | "directory" | "auto"
	overwrite?: boolean
	merge?: boolean
}

export type TimerTool = {
	tool: "timer"
	duration?: number
	note?: string
	startTime?: number
	endTime?: number
	/**
	 * Timer-specific status (independent of approvalState)
	 * - 'running': Timer is actively counting down
	 * - 'completed': Timer finished naturally
	 * - 'stopped': Timer was stopped by user
	 */
	timerStatus?: "running" | "completed" | "stopped"
	/**
	 * If true, displays local time instead of countdown timer
	 */
	showLocalTime?: boolean
}

export type ThinkTool = {
	tool: "think"
	/**
	 * The thinking process, reasoning, and analysis
	 */
	thought: string
	/**
	 * Key conclusions or insights from the thinking
	 */
	conclusion?: string
	/**
	 * What to do next based on the thinking
	 */
    next_action?: string
    /**
     * When the thinking finished on the backend (ms since epoch)
     */
    completedAt?: number
    /**
     * Total thinking duration in milliseconds
     */
    durationMs?: number
}

export type PatternSearchTool = {
	tool: "pattern_search"
	searchPattern: string
	files?: string[]
	caseSensitive?: boolean
	contextLinesBefore?: number
	contextLinesAfter?: number
	content?: string
}

export type GrepSearchTool = {
	tool: "grep_search"
	query: string
	isRegexp?: boolean
	includePattern?: string
	maxResults?: number
	content?: string
}

export type ReadProgressTool = {
	tool: "read_progress"
	terminalId?: number
	terminalName?: string
	includeFullOutput?: boolean
	filterKeywords?: string[]
	contextLines?: number
	extractData?: boolean
	smartSummary?: boolean
	waitForCompletion?: boolean
	maxWaitTime?: number
	maxChars?: number
	content?: string
}

export type RenameTool = {
	tool: "rename"
	path: string
	new_name: string
	type?: "file" | "directory" | "auto"
	overwrite?: boolean
}

export type RemoveTool = {
	tool: "remove"
	path: string
	type?: "file" | "directory" | "auto"
	recursive?: boolean
	force?: boolean
}

export type ReplaceStringTool = {
	tool: "replace_string"
	path?: string
	old_string?: string
	new_string?: string
	oldString?: string
	newString?: string
	explanation?: string
	filePath?: string
	occurrences?: number
}

export type MultiReplaceStringTool = {
	tool: "multi_replace_string"
	path?: string
	replacements: Array<{ 
		filePath: string
		oldString: string
		newString: string
		caseInsensitive?: boolean
		useRegex?: boolean
		order?: number
	}>
	explanation?: string
	successes?: number
	failures?: number
	errors?: any[]
	summary?: string | string[]
}

export type InsertEditTool = {
	tool: "insert_edit"
	path?: string
	insert_line?: number
	content?: string
	explanation?: string
	filePath?: string
	startLine?: number
	endLine?: number
	code?: string
	operationType?: string
	lineRange?: string
}

export type FastEditorTool = {
	tool: "fast_editor"
	path?: string
	mode?: "create" | "update" | "delete"
	content?: string
	edits?: Array<{
		path: string
		oldString: string
		newString: string
	}>
	explanation?: string
	results?: Array<any>
	successCount?: number
	failureCount?: number
}

export type GitBashTool = {
	tool: "git_bash"
	command: string
	output?: string
}

export type TerminalTool = {
	tool: "terminal"
	command?: string
	action?: string
	terminalId?: number
	terminalName?: string
	output?: string
	panelType?: string
	shell?: string
	expression?: string
	channelName?: string
	collectionName?: string
	portNumber?: number
	workingDirectory?: string
	message?: string
	executionTimeout?: number
	terminalType?: string
}

export type KillBashTool = {
	tool: "kill_bash"
	terminalId?: number
	terminalName?: string
	output?: string
	lastCommand?: string
	isBusy?: boolean
	force?: boolean
	result?: string
}

export type ReadImageTool = {
	tool: "read_image"
	path: string
	imageData?: string
	metadata?: any
}

export type VscodeApiTool = {
	tool: "vscode_api"
	query: string
	content?: string
}

export type LocalTimeTool = {
	tool: "local_time"
	note?: string
	localTime?: number
}

export type ChatTool = (
	| ExitAgentTool
	| SpawnAgentTool
	| ExecuteCommandTool
	| ListFilesTool
	| ExploreRepoFolderTool
	| SearchFilesTool
	| ReadFileTool
	| WriteToFileTool
	| AskFollowupQuestionTool
	| AttemptCompletionTool
	| WebSearchTool
	| UrlScreenshotTool
	| ServerRunnerTool
	| SearchSymbolsTool
	| FileEditorTool
	| AddInterestedFileTool
	| FileChangePlanTool
	| SubmitReviewTool
	| MoveTool
	| TimerTool
	| ThinkTool
	| PatternSearchTool
	| GrepSearchTool
	| ReadProgressTool
	| RenameTool
	| RemoveTool
	| ReplaceStringTool
	| MultiReplaceStringTool
	| InsertEditTool
	| FastEditorTool
	| GitBashTool
	| TerminalTool
	| KillBashTool
	| ReadImageTool
	| VscodeApiTool
	| LocalTimeTool
) & {
	ts: number
	approvalState?: ToolStatus
	/**
	 * If this is a sub message, it will force it to stick to previous tool call in the ui (same message)
	 */
	isSubMsg?: boolean
	error?: string
	userFeedback?: string
}
export const readOnlyTools: ChatTool["tool"][] = [
	"read_file",
	"list_files",
	"search_files",
	"explore_repo_folder",
	"search_symbol",
	"web_search",
	"url_screenshot",
	"add_interested_file",
	"think",
] as const

export const mustRequestApprovalTypes: (ChatTool["tool"] | string)[] = [
	"completion_result",
	"resume_completed_task",
	"resume_task",
	"request_limit_reached",
	"followup",
	"ask_followup_question",
] as const

export const mustRequestApprovalTools: ChatTool["tool"][] = ["ask_followup_question", "attempt_completion"] as const
