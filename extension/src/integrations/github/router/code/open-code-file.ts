/**
 * Code - Open Code File (README, Changelog, etc.)
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { GlobalStateManager } from '../../../../providers/state/global-state-manager';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export const openCodeFile = procedure
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
			const codeCloneStatus = globalState.getGlobalState('codeCloneStatus') || {};
			const status = codeCloneStatus[input.repoFullName];

			if (!status || !status.localPath) {
				vscode.window.showErrorMessage('Code repository not cloned locally');
				return { success: false, error: 'Code not cloned' };
			}

			const filePath = path.join(status.localPath, input.fileName);

			// Check if file exists
			const fileExists = fs.existsSync(filePath);

			// If file doesn't exist and createIfNotExists is true, create it
			if (!fileExists && input.createIfNotExists) {
				let defaultContent = '';

				if (input.fileName.toLowerCase() === 'changelog.md') {
					defaultContent = `# Changelog

## ${new Date().toISOString().split('T')[0]}
- Repository initialized

---
*This file tracks changes to the codebase.*
`;
				} else if (input.fileName.toLowerCase() === 'readme.md') {
					// For README, we don't create it, just try to open existing one
					return { success: false, error: 'README.md not found in repository' };
				}

				// Create the file
				fs.writeFileSync(filePath, defaultContent, 'utf-8');
			}

			// Open the file
			const document = await vscode.workspace.openTextDocument(filePath);
			await vscode.window.showTextDocument(document);

			return { success: true };
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
			return { success: false, error: error.message };
		}
	});

export const openCodeFolderInExplorer = procedure
	.input(
		z.object({
			repoFullName: z.string(),
			fileName: z.string().optional(),
		})
	)
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const codeCloneStatus = globalState.getGlobalState('codeCloneStatus') || {};
			const status = codeCloneStatus[input.repoFullName];

			if (!status || !status.localPath) {
				return { success: false, error: 'Code not cloned' };
			}

			const folderPath = input.fileName 
				? path.dirname(path.join(status.localPath, input.fileName))
				: status.localPath;

			// Open in system file explorer
			await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(folderPath));

			return { success: true };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	});

