/**
 * Wiki - Open Wiki File
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { GlobalStateManager } from '../../../../providers/state/global-state-manager';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export const openWikiFile = procedure
	.input(
		z.object({
			repoFullName: z.string(),
			fileName: z.string(),
			createIfNotExists: z.boolean().optional().default(false),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const wikiCloneStatus = globalState.getGlobalState('wikiCloneStatus') || {};
			const status = wikiCloneStatus[input.repoFullName];

			if (!status || !status.localPath) {
				vscode.window.showErrorMessage('Wiki not cloned locally');
				return { success: false, error: 'Wiki not cloned' };
			}

			const filePath = path.join(status.localPath, input.fileName);
			const fileExists = fs.existsSync(filePath);

			if (!fileExists && input.createIfNotExists) {
				let defaultContent = '';

				if (input.fileName.toLowerCase() === 'changelog.md') {
					defaultContent = `# Changelog

## ${new Date().toISOString().split('T')[0]}
- Wiki initialized

---
*This file tracks changes to the wiki.*
`;
				} else if (input.fileName.toLowerCase() === 'readme.md') {
					return { success: false, error: 'README.md not found in wiki' };
				}

				fs.writeFileSync(filePath, defaultContent, 'utf-8');
			}

			const document = await vscode.workspace.openTextDocument(filePath);
			await vscode.window.showTextDocument(document);

			return { success: true };
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
			return { success: false, error: error.message };
		}
	});

export const openWikiFolderInExplorer = procedure
	.input(
		z.object({
			repoFullName: z.string(),
			fileName: z.string().optional(),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const wikiCloneStatus = globalState.getGlobalState('wikiCloneStatus') || {};
			const status = wikiCloneStatus[input.repoFullName];

			if (!status || !status.localPath) {
				return { success: false, error: 'Wiki not cloned' };
			}

			const folderPath = input.fileName 
				? path.dirname(path.join(status.localPath, input.fileName))
				: status.localPath;

			await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(folderPath));

			return { success: true };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	});

