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

/**
 * 🔧 XML 解析类型转换问题解决方案
 * 
 * 问题：XML 解析器会将所有参数值解析为字符串，导致 Zod 验证报错：
 * "Expected number, received string"
 * 
 * 解决方案：使用 z.coerce.number() 替代 z.number()
 * 
 * ❌ 错误写法：
 * duration: z.number().optional().default(0)
 * startLine: z.number().int().positive()
 * 
 * ✅ 正确写法：
 * duration: z.coerce.number().optional().default(0)
 * startLine: z.coerce.number().int().positive()
 * 
 * z.coerce.number() 会自动将字符串 "123" 转换为数字 123
 * 
 * 已修复的工具：
 * - insert_edit: startLine, endLine
 * - timer: duration
 * - terminal: port, startLine, startCharacter, endLine, endCharacter, code
 * - pattern_search: contextLinesBefore, contextLinesAfter
 * 
 * 注意：任何可能从 XML 接收数字值的参数都应使用 z.coerce.number()
 */

/**
 * ✅ 工具状态管理防止卡在 loading 的实践
 *
 * 背景：有些写文件/改名/移动/删除类工具在 UI 中会一直显示 “...ing”，
 * 原因通常是只发送了中间态（loading）的 update，而没有在成功/失败后
 * 推送最终态（approved 或 error）。
 *
 * 统一做法（适用于所有具副作用的工具）：
 * 1) 在工具执行开始或中间更新时，由系统统一发送 loading（见 ToolExecutor.updateToolStatus）。
 * 2) 在“执行成功”后，务必显式调用 updateAsk 推送：approvalState: "approved"。
 * 3) 在“任何校验失败/早退/异常 catch”路径，务必显式调用 updateAsk 推送：approvalState: "error"，
 *    并可携带 error 文本，帮助 UI 正确落盘为失败态。
 * 4) 即使在 alwaysAllowWriteOnly（自动批准）模式下，也需要发送最终态，避免 UI 停留在 loading。
 *
 * 参考模板（伪代码）：
 *   await updateAsk('tool', { tool: { tool: '<name>', ...params, approvalState: 'approved', ts } }, ts)
 *   await updateAsk('tool', { tool: { tool: '<name>', ...params, approvalState: 'error', error, ts } }, ts)
 *
 * 特殊注意：remove 工具
 * - UI 层的类型不接受 type: 'force_recursive'，错误/状态更新里不要下发该值；
 *   若内部语义为“强制递归删除”，请：
 *   - 仅在执行时使用（设置 recursive=true, force=true），
 *   - 在 updateAsk 时：
 *       * type 按检测到的实际类型（'file'/'directory'）下发，或在错误态时省略 type，
 *       * 可额外携带 force/recursive 布尔标记帮助 UI 展示。
 */
