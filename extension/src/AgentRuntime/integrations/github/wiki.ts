/**
 * Wiki Module - All Wiki operations
 */

import { z } from 'zod';
import { procedure } from '../../router/utils';
import { GlobalStateManager } from '../../providers/state/global-state-manager';
import { getCurrentAccountToken } from './api';
import { createDiagnosticLogger } from './index';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import simpleGit from 'simple-git';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================================
// Helper Functions
// ============================================================================

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

// ============================================================================
// Clone Operations
// ============================================================================

export const cloneWikiAndInitialize = procedure
	.input(
		z.object({
			repoFullName: z.string(),
			wikiCloneUrl: z.string(),
			targetPath: z.string().optional(),
		})
	)
	.resolve(async (ctx, input) => {
		const diagnosticLog = createDiagnosticLogger('Wiki Clone');

		try {
			diagnosticLog('Starting wiki clone', { repo: input.repoFullName });
			
			const fs = require('fs').promises;
			const globalState = GlobalStateManager.getInstance();
			
			// Determine target path
			const githubSettings = globalState.getGlobalState('githubSettings');
			const defaultCloneDir = githubSettings?.defaultCloneDirectory || path.join(os.homedir(), 'Documents', 'GitHub');
			const repoName = input.repoFullName.split('/')[1] || input.repoFullName;
			const targetPath = input.targetPath || path.join(defaultCloneDir, repoName + '.wiki');
			diagnosticLog('Target path', targetPath);
			
			// Ensure parent directory exists
			await fs.mkdir(defaultCloneDir, { recursive: true });
			diagnosticLog('Parent directory created/verified');
			
			// Check if target path already exists
			try {
				await fs.access(targetPath);
				diagnosticLog('Directory already exists but not in state', targetPath);
				
				const gitDir = path.join(targetPath, '.git');
				try {
					await fs.access(gitDir);
					diagnosticLog('Found existing Git repository');
					return { 
						success: false, 
						error: `A directory already exists at: ${targetPath}\n\nThis appears to be a Git repository. Please delete it manually or use a different location.` 
					};
				} catch {
					diagnosticLog('Directory exists but not a Git repository');
					return { 
						success: false, 
						error: `A directory already exists at: ${targetPath}\n\nPlease delete it first or choose a different location.` 
					};
				}
			} catch {
				diagnosticLog('Target directory does not exist, safe to proceed');
			}
			
			const token = await getCurrentAccountToken();
			if (!token) {
				diagnosticLog('ERROR: No authentication token found');
				return { 
					success: false, 
					error: 'Not authenticated. Please login to GitHub first.' 
				};
			}
			diagnosticLog('Token retrieved successfully');
			
			let authenticatedUrl = input.wikiCloneUrl;
			if (authenticatedUrl.startsWith('https://github.com/')) {
				authenticatedUrl = authenticatedUrl.replace('https://github.com/', `https://x-access-token:${token}@github.com/`);
				diagnosticLog('Authenticated URL created (token hidden)');
			} else {
				diagnosticLog('WARN: URL does not start with https://github.com/', input.wikiCloneUrl);
			}
			
			diagnosticLog('Starting git clone with simple-git');
			const git = simpleGit();
			
			await git.clone(authenticatedUrl, targetPath, ['--depth', '1', '--single-branch', '--no-tags']);
			diagnosticLog('Git clone completed');
			
			try {
				await fs.access(targetPath);
				diagnosticLog('Clone verified: directory exists');
			} catch {
				diagnosticLog('ERROR: Clone verification failed - directory not found');
				return { 
					success: false, 
					error: 'Clone failed: target directory not created' 
				};
			}
			
			const repoGit = simpleGit(targetPath);
			
			try {
				await repoGit.addConfig('user.name', 'Vlinder Agent', false, 'local');
				await repoGit.addConfig('user.email', 'agent@vlinder.dev', false, 'local');
				diagnosticLog('Git config set successfully');
			} catch (configError: any) {
				diagnosticLog('WARN: Git config failed', configError.message);
			}
			
			// Create Wiki README.md
			const readmePath = path.join(targetPath, 'README.md');
			const readmeContent = `# ${input.repoFullName} Wiki

## Purpose
This wiki is maintained by Vlinder's GitHub Action Agent to provide comprehensive documentation for the repository.

## Repository Information
- **Repository**: ${input.repoFullName}
- **Initialized**: ${new Date().toISOString()}

## Overview
This wiki contains documentation, guides, and technical information about the project.

---
*This file is automatically maintained by Vlinder GitHub Action Agent.*
`;
			await fs.writeFile(readmePath, readmeContent, 'utf-8');
			diagnosticLog('README.md created');
			
			// Create Changelog.md
			const changelogPath = path.join(targetPath, 'Changelog.md');
			const changelogContent = `# Changelog

## ${new Date().toISOString().split('T')[0]}
- Wiki repository initialized
- Created README.md and Changelog.md

---
*This file is automatically updated by Vlinder GitHub Action Agent.*
`;
			await fs.writeFile(changelogPath, changelogContent, 'utf-8');
			diagnosticLog('Changelog.md created');
			
			// Commit initial files
			try {
				await repoGit.add('.');
				await repoGit.commit('Initialize wiki with README and Changelog');
				diagnosticLog('Initial commit created');
			} catch (commitError: any) {
				diagnosticLog('WARN: Commit failed', commitError.message);
			}
			
			// Update clone status
			const updatedWikiCloneStatus = globalState.getGlobalState('wikiCloneStatus') || {};
			updatedWikiCloneStatus[input.repoFullName] = {
				isCloned: true,
				localPath: targetPath,
				clonedAt: new Date().toISOString(),
			};
			await globalState.updateGlobalState('wikiCloneStatus', updatedWikiCloneStatus);
			diagnosticLog('Clone status updated in global state', updatedWikiCloneStatus[input.repoFullName]);
			
			diagnosticLog('Wiki clone completed successfully');
			return { 
				success: true, 
				localPath: targetPath,
				message: 'Wiki cloned and initialized successfully',
				isCloned: true
			};
		} catch (error: any) {
			console.error('[Wiki Clone] ERROR:', error);
			console.error('[Wiki Clone] Stack:', error.stack);
			return { 
				success: false, 
				error: `Clone failed: ${error.message || error}. Check console for details.` 
			};
		}
	});

export const getWikiCloneStatus = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		const globalState = GlobalStateManager.getInstance();
		const wikiCloneStatus = globalState.getGlobalState('wikiCloneStatus') || {};
		const status = wikiCloneStatus[input.repoFullName];
		
		return {
			isCloned: status?.isCloned || false,
			localPath: status?.localPath,
			clonedAt: status?.clonedAt,
		};
	});

// ============================================================================
// Delete Operations
// ============================================================================

export const deleteLocalWiki = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const fs = require('fs').promises;
			const globalState = GlobalStateManager.getInstance();
			const wikiCloneStatus = globalState.getGlobalState('wikiCloneStatus') || {};
			const status = wikiCloneStatus[input.repoFullName];
			
			if (!status || !status.localPath) {
				return { success: false, error: 'Wiki not cloned' };
			}
			
			// Delete local directory
			await fs.rm(status.localPath, { recursive: true, force: true });
			
			// Update status
			delete wikiCloneStatus[input.repoFullName];
			await globalState.updateGlobalState('wikiCloneStatus', wikiCloneStatus);
			
			return { success: true, message: 'Wiki deleted successfully' };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	});

// ============================================================================
// History Operations
// ============================================================================

export const getWikiHistory = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const wikiCloneStatus = globalState.getGlobalState('wikiCloneStatus') || {};
			const status = wikiCloneStatus[input.repoFullName];

			if (!status || !status.localPath) {
				return {
					success: false,
					error: 'Wiki not cloned locally',
					commits: []
				};
			}

			const git = simpleGit(status.localPath);
			const log = await git.log({ maxCount: 50 });

			const commits = log.all.map((commit: any, index: number) => ({
				id: `${input.repoFullName}-${index}`,
				hash: commit.hash,
				message: commit.message,
				author: commit.author_name,
				email: commit.author_email,
				date: new Date(commit.date).toLocaleString(),
				refs: commit.refs
			}));

			return {
				success: true,
				commits
			};
		} catch (error: any) {
			console.error('[Wiki History] Error:', error);
			return {
				success: false,
				error: error.message,
				commits: []
			};
		}
	});

// ============================================================================
// Open Operations
// ============================================================================

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

// ============================================================================
// Workspace Operations
// ============================================================================

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
			(folder: vscode.WorkspaceFolder) => folder.uri.fsPath === status.localPath
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

