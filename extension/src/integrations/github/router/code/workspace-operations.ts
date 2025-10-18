/**
 * Workspace Operations - Code specific
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import * as vscode from 'vscode';
import { GlobalStateManager } from '../../../../providers/state/global-state-manager';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Open folder in system file explorer
 */
async function openFolderInExplorer(folderPath: string): Promise<void> {
	const platform = process.platform;
	
	try {
		if (platform === 'win32') {
			// Windows: use explorer to open folder directly
			await execAsync(`explorer "${folderPath}"`);
		} else if (platform === 'darwin') {
			// macOS: use open command
			await execAsync(`open "${folderPath}"`);
		} else {
			// Linux: use xdg-open
			await execAsync(`xdg-open "${folderPath}"`);
		}
	} catch (error) {
		console.error('Failed to open folder in explorer:', error);
		throw error;
	}
}

export const openCodeFolder = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const codeCloneStatus = globalState.getGlobalState('codeCloneStatus') || {};
			const status = codeCloneStatus[input.repoFullName];

			if (!status || !status.localPath) {
				return { success: false, error: 'Code repository not cloned' };
			}

			// Open in system file explorer
			await openFolderInExplorer(status.localPath);
			return { success: true };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	});

export const openCodeInVSCode = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const codeCloneStatus = globalState.getGlobalState('codeCloneStatus') || {};
			const status = codeCloneStatus[input.repoFullName];

			if (!status || !status.localPath) {
				return { success: false, error: 'Code repository not cloned' };
			}

			await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(status.localPath), true);
			return { success: true };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	});

export const addCodeToWorkspace = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const codeCloneStatus = globalState.getGlobalState('codeCloneStatus') || {};
			const status = codeCloneStatus[input.repoFullName];

			if (!status || !status.localPath) {
				return { success: false, error: 'Code repository not cloned' };
			}

			const workspaceFolders = vscode.workspace.workspaceFolders || [];
			const folderExists = workspaceFolders.some(
				(folder) => folder.uri.fsPath === status.localPath
			);

			if (folderExists) {
				return { success: false, error: 'Folder already in workspace' };
			}

			vscode.workspace.updateWorkspaceFolders(workspaceFolders.length, 0, {
				uri: vscode.Uri.file(status.localPath),
				name: input.repoFullName,
			});

			return { success: true };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	});

