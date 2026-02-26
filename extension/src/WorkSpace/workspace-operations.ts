/**
 * Workspace Operations
 * Extracted from: extension/src/AgentRuntime/integrations/github/code.ts
 *
 * Handles opening/adding cloned GitHub repositories into the VS Code workspace.
 */

import { z } from "zod"
import { procedure } from "../AgentRuntime/router/utils"
import { GlobalStateManager } from "../AgentRuntime/providers/state/global-state-manager"
import * as vscode from "vscode"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

/**
 * Open folder in system file explorer (cross-platform)
 */
async function openFolderInExplorer(folderPath: string): Promise<void> {
	const platform = process.platform
	try {
		if (platform === "win32") {
			await execAsync(`explorer "${folderPath}"`)
		} else if (platform === "darwin") {
			await execAsync(`open "${folderPath}"`)
		} else {
			await execAsync(`xdg-open "${folderPath}"`)
		}
	} catch (error) {
		console.error("Failed to open folder in explorer:", error)
		throw error
	}
}

/**
 * Open repository folder in system file explorer
 */
export const openCodeFolder = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance()
			const codeCloneStatus = globalState.getGlobalState("codeCloneStatus") || {}
			const status = codeCloneStatus[input.repoFullName]

			if (!status || !status.localPath) {
				return { success: false, error: "Code repository not cloned" }
			}

			await openFolderInExplorer(status.localPath)
			return { success: true }
		} catch (error: any) {
			return { success: false, error: error.message }
		}
	})

/**
 * Open repository in a new VS Code window
 */
export const openCodeInVSCode = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance()
			const codeCloneStatus = globalState.getGlobalState("codeCloneStatus") || {}
			const status = codeCloneStatus[input.repoFullName]

			if (!status || !status.localPath) {
				return { success: false, error: "Code repository not cloned" }
			}

			await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(status.localPath), true)
			return { success: true }
		} catch (error: any) {
			return { success: false, error: error.message }
		}
	})

/**
 * Add repository to current workspace
 */
export const addCodeToWorkspace = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance()
			const codeCloneStatus = globalState.getGlobalState("codeCloneStatus") || {}
			const status = codeCloneStatus[input.repoFullName]

			if (!status || !status.localPath) {
				return { success: false, error: "Code repository not cloned" }
			}

			const workspaceFolders = vscode.workspace.workspaceFolders || []
			const folderExists = workspaceFolders.some(
				(folder: vscode.WorkspaceFolder) => folder.uri.fsPath === status.localPath
			)

			if (folderExists) {
				return { success: false, error: "Folder already in workspace" }
			}

			vscode.workspace.updateWorkspaceFolders(workspaceFolders.length, 0, {
				uri: vscode.Uri.file(status.localPath),
				name: input.repoFullName,
			})

			return { success: true }
		} catch (error: any) {
			return { success: false, error: error.message }
		}
	})
