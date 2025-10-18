/**
 * Workspace Operations - Wiki specific
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import * as vscode from 'vscode';
import { GlobalStateManager } from '../../../../providers/state/global-state-manager';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function openFolderInExplorer(folderPath: string): Promise<void> {
	const platform = process.platform;
	
	try {
		if (platform === 'win32') {
			await execAsync(`explorer "${folderPath}"`);
		} else if (platform === 'darwin') {
			await execAsync(`open "${folderPath}"`);
		} else {
			await execAsync(`xdg-open "${folderPath}"`);
		}
	} catch (error) {
		console.error('Failed to open folder in explorer:', error);
		throw error;
	}
}

export const openWikiFolder = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const wikiCloneStatus = globalState.getGlobalState('wikiCloneStatus') || {};
			const status = wikiCloneStatus[input.repoFullName];

			if (!status || !status.localPath) {
				return { success: false, error: 'Wiki not cloned' };
			}

			await openFolderInExplorer(status.localPath);
			return { success: true };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	});

export const openWikiInVSCode = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const wikiCloneStatus = globalState.getGlobalState('wikiCloneStatus') || {};
			const status = wikiCloneStatus[input.repoFullName];

			if (!status || !status.localPath) {
				return { success: false, error: 'Wiki not cloned' };
			}

			await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(status.localPath), true);
			return { success: true };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	});

export const addWikiToWorkspace = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const wikiCloneStatus = globalState.getGlobalState('wikiCloneStatus') || {};
			const status = wikiCloneStatus[input.repoFullName];

			if (!status || !status.localPath) {
				return { success: false, error: 'Wiki not cloned' };
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
				name: input.repoFullName + '.wiki',
			});

			return { success: true };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	});

