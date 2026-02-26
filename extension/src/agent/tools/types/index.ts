import { ClaudeAsk, ClaudeSay } from "../../../AgentRuntime/shared/messages/extension-message"
import { ClaudeAskResponse } from "../../../AgentRuntime/shared/messages/client-message"
import { MainAgent } from "../../main-agent"
import { TaskExecutorUtils } from "../../task-executor/utils"
import { ServerRunnerTool } from "../../../AgentRuntime/shared/new-tools"
import { AddInterestedFileToolParams } from "../schema/add_interested_file"
import { AskFollowupQuestionToolParams } from "../schema/ask_followup_question"
import { AttemptCompletionToolParams } from "../schema/attempt_completion"
import { ServerRunnerToolParams } from "../schema/dev_server"
import { TerminalToolParams } from "../schema/terminal"
import { ExploreRepoFolderToolParams } from "../schema/explore-repo-folder.schema"
import { ListFilesToolParams } from "../schema/list_files"
import { ReadFileToolParams } from "../schema/read_file"
import { SearchFilesToolParams } from "../schema/search_files"
import { SearchSymbolsToolParams } from "../schema/search_symbols"
import { UrlScreenshotToolParams } from "../schema/url_screenshot"
import { WebSearchToolParams } from "../schema/web_search"
import { EditFileBlocksToolParams, WriteToFileToolParams } from "../schema/write_to_file"
import { FileChangePlanParams } from "../schema/file-change-plan"
import { RejectFileChangesParams } from "../schema/reject-file-changes"
import { FileEditorToolParams } from "../schema/file_editor_tool"
import { SpawnAgentOptions, SpawnAgentToolParams } from "../schema/agents/agent-spawner"
import { ExitAgentToolParams } from "../schema/agents/agent-exit"
import { SubmitReviewToolParams } from "../schema/submit_review"
import { MoveToolParams } from "../schema/move"
import { RemoveToolParams } from "../schema/remove"
import { RenameToolParams } from "../schema/rename"
import { ThinkToolParams } from "../schema/think"
import { ReadImageToolParams } from "../schema/read-image"
import { GrepSearchToolParams } from "../schema/grep-search"
import { PatternSearchToolParams } from "../schema/pattern-search"
import { FastEditorToolParams } from "../schema/fast-editor"
import { ReplaceStringToolParams } from "../schema/replace-string"
import { MultiReplaceStringToolParams } from "../schema/multi-replace-string"
import { InsertEditToolParams } from "../schema/insert-edit"
import { TimerToolParams } from "../schema/timer"
import { VscodeApiToolParams } from "../schema/vscode-api"
import { UpdateTodoToolParams } from "../schema/update-todo"

export type UpsertMemoryInput = {
	milestoneName: string
	summary: string
	content: string
}

export type ToolParams =
	| AddInterestedFileToolParams
	| AskFollowupQuestionToolParams
	| AttemptCompletionToolParams
	| ServerRunnerToolParams
	| TerminalToolParams
	| ExploreRepoFolderToolParams
	| ListFilesToolParams
	| ReadFileToolParams
	| ReadImageToolParams
	| SearchFilesToolParams
	| SearchSymbolsToolParams
	| UrlScreenshotToolParams
	| WebSearchToolParams
	| FileChangePlanParams
	| RejectFileChangesParams
	| WriteToFileToolParams
	| EditFileBlocksToolParams
	| FileEditorToolParams
	| FastEditorToolParams
	| ReplaceStringToolParams
	| MultiReplaceStringToolParams
	| InsertEditToolParams
	| SpawnAgentToolParams
	| ExitAgentToolParams
	| SubmitReviewToolParams
	| MoveToolParams
	| RemoveToolParams
	| RenameToolParams
	| ThinkToolParams
	| GrepSearchToolParams
	| PatternSearchToolParams
	| VscodeApiToolParams
	| TimerToolParams
	| UpdateTodoToolParams

export type ToolName = ToolParams["name"]

export type AgentToolParams = {
	name: ToolParams["name"]
	id: string
	input: ToolParams["input"]
	ts: number
	/**
	 * If this is a sub message, it will force it to stick to previous tool call in the ui (same message)
	 */
	isSubMsg?: boolean
	isLastWriteToFile: boolean
	isFinal?: boolean
	ask: TaskExecutorUtils["ask"]
	say: TaskExecutorUtils["say"]
	updateAsk: TaskExecutorUtils["updateAsk"]
	returnEmptyStringOnSuccess?: boolean
}

export type AskConfirmationResponse = {
	response: ClaudeAskResponse
	text?: string
	images?: string[]
}

export type AgentToolOptions = {
	cwd: string
	alwaysAllowReadOnly: boolean
	alwaysAllowWriteOnly: boolean
	vlinders: MainAgent
	setRunningProcessId?: (pid: number | undefined) => void
	agentName?: SpawnAgentOptions
}

export type CommitInfo = {
	branch: string
	commitHash: string
	preCommitHash?: string
}
