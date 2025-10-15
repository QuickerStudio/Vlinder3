// schema/index.ts
import { executeCommandTool } from "./execute_command"
import { listFilesTool } from "./list_files"
import { ExploreRepoFolderTool } from "./explore-repo-folder.schema"
import { searchFilesTool } from "./search_files"
import { readFileTool } from "./read_file"
import { writeToFileTool } from "./write_to_file"
import { askFollowupQuestionTool } from "./ask_followup_question"
import { attemptCompletionTool } from "./attempt_completion"
import { webSearchTool } from "./web_search"
import { urlScreenshotTool } from "./url_screenshot"
import { devServerTool } from "./dev_server"
import { searchSymbolTool } from "./search_symbols"
import { addInterestedFileTool } from "./add_interested_file"
import { fileEditorTool } from "./file_editor_tool"
import { spawnAgentTool } from "./agents/agent-spawner"
import { exitAgentTool } from "./agents/agent-exit"
import { moveTool } from "./move"
import { removeTool } from "./remove"
import { renameTool } from "./rename"
import { thinkTool } from "./think"
import { gitBashTool } from "./git-bash"
import { terminalTool } from "./terminal"
import { readImageTool } from "./read-image"
import { grepSearchTool } from "./grep-search"
import { patternSearchTool } from "./pattern-search"
import { fastEditorTool } from "./fast-editor"
import { replaceStringTool } from "./replace-string"
import { multiReplaceStringTool } from "./multi-replace-string"
import { insertEditTool } from "./insert-edit"
import { killBashTool } from "./kill-bash"
import { readProgressTool } from "./read-progress"
import { timerTool } from "./timer"
import { vscodeApiTool } from "./vscode-api"

export const tools = [
	thinkTool,
	executeCommandTool,
	listFilesTool,
	ExploreRepoFolderTool,
	searchFilesTool,
	readFileTool,
	readImageTool,
	askFollowupQuestionTool,
	attemptCompletionTool,
	webSearchTool,
	urlScreenshotTool,
	devServerTool,
	searchSymbolTool,
	addInterestedFileTool,
	fileEditorTool,
	fastEditorTool,
	replaceStringTool,
	multiReplaceStringTool,
	insertEditTool,
	moveTool,
	removeTool,
	renameTool,
	gitBashTool,
	terminalTool,
	killBashTool,
	readProgressTool,
	grepSearchTool,
	patternSearchTool,
	vscodeApiTool,
	timerTool,
	spawnAgentTool,
	exitAgentTool,
] as const

export type Tool = (typeof tools)[number]
export {
	executeCommandTool,
	listFilesTool,
	ExploreRepoFolderTool,
	searchFilesTool,
	readFileTool,
	readImageTool,
	writeToFileTool,
	askFollowupQuestionTool,
	attemptCompletionTool,
	webSearchTool,
	urlScreenshotTool,
	searchSymbolTool as searchSymbolsTool,
	addInterestedFileTool,
	fileEditorTool,
	fastEditorTool,
	replaceStringTool,
	multiReplaceStringTool,
	insertEditTool,
	moveTool,
	removeTool,
	renameTool,
	gitBashTool,
	terminalTool,
	killBashTool,
	readProgressTool,
	grepSearchTool,
	patternSearchTool,
	vscodeApiTool,
	timerTool,
	thinkTool,
	spawnAgentTool as subAgentTool,
	exitAgentTool as exitSubAgentTool,
}
