import * as path from "path"
import * as os from "os"
import * as vscode from "vscode"

/**
 * Get the current workspace root path dynamically.
 * Falls back to ~/Desktop if no workspace is open.
 */
export const getCwd = (): string =>
	vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0) ?? path.join(os.homedir(), "Desktop")

/**
 * Static snapshot of the workspace root path at extension load time.
 * Use getCwd() if you need the current value at call time.
 */
export const cwd =
	vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath).at(0) ?? path.join(os.homedir(), "Desktop")

/**
 * Get a readable path for display purposes.
 * @param relPath - The relative path to convert
 * @param customCwd - Custom current working directory (optional)
 */
export function getReadablePath(relPath: string, customCwd: string = cwd): string {
	const absolutePath = path.resolve(customCwd, relPath)
	if (customCwd === path.join(os.homedir(), "Desktop")) {
		return absolutePath
	}
	if (path.normalize(absolutePath) === path.normalize(customCwd)) {
		return path.basename(absolutePath)
	} else {
		const normalizedRelPath = path.relative(customCwd, absolutePath)
		if (absolutePath.includes(customCwd)) {
			return normalizedRelPath
		} else {
			return absolutePath
		}
	}
}
