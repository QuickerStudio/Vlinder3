/**
 * Code Module - All Code Repository Operations
 * 
 * This module handles all operations related to GitHub code repositories:
 * - Cloning repositories
 * - Managing clone status
 * - Deleting local repositories
 * - Getting repository history
 * - Opening files and folders
 * - Workspace operations
 * - Commit activity analysis
 */

import { z } from 'zod';
import { procedure } from '../../router/utils';
import { GlobalStateManager } from '../../providers/state/global-state-manager';
import { getCurrentAccountToken, githubApiRequest, GITHUB_API_ENDPOINTS } from './api';
import { createDiagnosticLogger } from './index';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import simpleGit from 'simple-git';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================================
// Interfaces
// ============================================================================

interface GitHubWeeklyActivity {
	days: number[]; // 7 days, Sunday to Saturday
	total: number;
	week: number; // Unix timestamp
}

interface WeeklyActivity {
	weekStart: string;
	weekEnd: string;
	totalCommits: number;
	contributors: string[];
	days: number[];
}

interface CommitActivityData {
	weeks: WeeklyActivity[];
	totalCommits: number;
	totalContributors: number;
	averageCommitsPerWeek: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

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

// ============================================================================
// Clone Operations
// ============================================================================

/**
 * Clone a GitHub repository and initialize local workspace
 */
export const cloneCodeAndInitialize = procedure
	.input(
		z.object({
			repoFullName: z.string(),
			codeCloneUrl: z.string(),
			targetPath: z.string().optional(),
		})
	)
	.resolve(async (ctx, input) => {
		const diagnosticLog = createDiagnosticLogger('Code Clone');

		try {
			diagnosticLog('Starting code repository clone', { repo: input.repoFullName });
			
			const globalState = GlobalStateManager.getInstance();
			
		// Determine target path
		const githubSettings = globalState.getGlobalState('githubSettings');
		const defaultCloneDir = githubSettings?.defaultCloneDirectory || path.join(os.homedir(), 'Documents', 'GitHub');
		// Only use project name, not "username-projectname"
		const repoName = input.repoFullName.split('/')[1] || input.repoFullName;
		const targetPath = input.targetPath || path.join(defaultCloneDir, repoName);
		diagnosticLog('Target path', targetPath);
			
		// Ensure parent directory exists
		await fsPromises.mkdir(defaultCloneDir, { recursive: true });
		diagnosticLog('Parent directory created/verified');
		
		// Check if target path already exists (prevent directory conflicts)
		try {
			await fsPromises.access(targetPath);
			diagnosticLog('Directory already exists but not in state', targetPath);
			
			// Check if it's a Git repository
			const gitDir = path.join(targetPath, '.git');
			try {
				await fsPromises.access(gitDir);
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
			
			// Get current account token
			const token = await getCurrentAccountToken();
			if (!token) {
				diagnosticLog('ERROR: No authentication token found');
				return { 
					success: false, 
					error: 'Not authenticated. Please login to GitHub first.' 
				};
			}
			diagnosticLog('Token retrieved successfully');
			
			// Build authenticated clone URL
			let authenticatedUrl = input.codeCloneUrl;
			if (authenticatedUrl.startsWith('https://github.com/')) {
				authenticatedUrl = authenticatedUrl.replace('https://github.com/', `https://x-access-token:${token}@github.com/`);
				diagnosticLog('Authenticated URL created (token hidden)');
			} else {
				diagnosticLog('WARN: URL does not start with https://github.com/', input.codeCloneUrl);
			}
			
			// Clone using simple-git
			diagnosticLog('Starting git clone with simple-git');
			const git = simpleGit();
			
			await git.clone(authenticatedUrl, targetPath, ['--depth', '1', '--single-branch', '--no-tags']);
			diagnosticLog('Git clone completed');
			
			// Verify clone succeeded
			try {
				await fsPromises.access(targetPath);
				diagnosticLog('Clone verified: directory exists');
			} catch {
				diagnosticLog('ERROR: Clone verification failed - directory not found');
				return { 
					success: false, 
					error: 'Clone failed: target directory not created' 
				};
			}
			
			// Switch to cloned directory
			const repoGit = simpleGit(targetPath);
			
			// Configure Git user info
			try {
				await repoGit.addConfig('user.name', 'Vlinder Agent', false, 'local');
				await repoGit.addConfig('user.email', 'agent@vlinder.dev', false, 'local');
				diagnosticLog('Git config set successfully');
			} catch (configError: any) {
				diagnosticLog('WARN: Git config failed', configError.message);
			}
			
		// Update clone status
		const updatedCodeCloneStatus = globalState.getGlobalState('codeCloneStatus') || {};
		updatedCodeCloneStatus[input.repoFullName] = {
				isCloned: true,
				localPath: targetPath,
			clonedAt: new Date().toISOString(),
		};
		await globalState.updateGlobalState('codeCloneStatus', updatedCodeCloneStatus);
		diagnosticLog('Clone status updated in global state', updatedCodeCloneStatus[input.repoFullName]);
			
			diagnosticLog('Code repository clone completed successfully');
			return { 
				success: true, 
				localPath: targetPath,
				message: 'Code repository cloned successfully',
				isCloned: true
			};
		} catch (error: any) {
			console.error('[Code Clone] ERROR:', error);
			console.error('[Code Clone] Stack:', error.stack);
			return { 
				success: false, 
				error: `Clone failed: ${error.message || error}. Check console for details.` 
			};
		}
	});

/**
 * Get clone status for a repository
 */
export const getCodeCloneStatus = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		const globalState = GlobalStateManager.getInstance();
		const codeCloneStatus = globalState.getGlobalState('codeCloneStatus') || {};
		const status = codeCloneStatus[input.repoFullName];
		
		return {
			isCloned: status?.isCloned || false,
			localPath: status?.localPath,
			clonedAt: status?.clonedAt,
		};
	});

// ============================================================================
// Delete Operations
// ============================================================================

/**
 * Delete local code repository
 */
export const deleteLocalCode = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const codeCloneStatus = globalState.getGlobalState('codeCloneStatus') || {};
			const status = codeCloneStatus[input.repoFullName];
			
			if (!status || !status.localPath) {
				return { success: false, error: 'Code repository not cloned' };
			}
			
			// Delete local directory
			await fsPromises.rm(status.localPath, { recursive: true, force: true });
			
			// Update status
			delete codeCloneStatus[input.repoFullName];
			await globalState.updateGlobalState('codeCloneStatus', codeCloneStatus);
			
			return { success: true, message: 'Code repository deleted successfully' };
		} catch (error: any) {
			return { success: false, error: error.message };
		}
	});

// ============================================================================
// History Operations
// ============================================================================

/**
 * Get commit history from local repository
 */
export const getCodeHistory = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const codeCloneStatus = globalState.getGlobalState('codeCloneStatus') || {};
			const status = codeCloneStatus[input.repoFullName];

			if (!status || !status.localPath) {
				return {
					success: false,
					error: 'Code repository not cloned locally',
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
			console.error('[Code History] Error:', error);
			return {
				success: false,
				error: error.message,
				commits: []
			};
		}
	});

// ============================================================================
// File Operations
// ============================================================================

/**
 * Open a specific file in the repository
 */
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

/**
 * Open repository folder in system file explorer
 */
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

// ============================================================================
// Workspace Operations
// ============================================================================

/**
 * Open repository folder in system file explorer
 */
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

/**
 * Open repository in a new VS Code window
 */
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

/**
 * Add repository to current workspace
 */
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
				(folder: vscode.WorkspaceFolder) => folder.uri.fsPath === status.localPath
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

// ============================================================================
// Commit Activity Operations
// ============================================================================

/**
 * Get commit activity from local repository
 * Analyzes commit history and returns weekly activity statistics
 * similar to GitHub's commit activity graph
 */
export const getCommitActivity = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const globalState = GlobalStateManager.getInstance();
			const codeCloneStatus = globalState.getGlobalState('codeCloneStatus') || {};
			const status = codeCloneStatus[input.repoFullName];

			if (!status || !status.localPath) {
				return {
					success: false,
					error: 'Code repository not cloned locally',
					data: null
				};
			}

			const git = simpleGit(status.localPath);
			
			// Get commits from past year (52 weeks)
			const oneYearAgo = new Date();
			oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
			
			// Get all commit records
			const log = await git.log({
				'--since': oneYearAgo.toISOString(),
				'--all': null
			});

			// Initialize 52 weeks data structure
			const weeks: WeeklyActivity[] = [];
			const now = new Date();
			
			// Create 52 weeks of empty data
			for (let i = 51; i >= 0; i--) {
				const weekEnd = new Date(now);
				weekEnd.setDate(weekEnd.getDate() - (i * 7));
				// Adjust to end on Saturday
				weekEnd.setDate(weekEnd.getDate() - weekEnd.getDay() + 6);
				
				const weekStart = new Date(weekEnd);
				weekStart.setDate(weekStart.getDate() - 6);
				
				weeks.push({
					weekStart: weekStart.toISOString(),
					weekEnd: weekEnd.toISOString(),
					totalCommits: 0,
					contributors: [],
					days: [0, 0, 0, 0, 0, 0, 0] // Sun to Sat
				});
			}

			// Fill commit data
			const contributorsSet = new Set<string>();
			let totalCommits = 0;

			log.all.forEach((commit: any) => {
				const commitDate = new Date(commit.date);
				const author = commit.author_name;
				
				// Find corresponding week
				const weekIndex = weeks.findIndex(week => {
					const start = new Date(week.weekStart);
					const end = new Date(week.weekEnd);
					return commitDate >= start && commitDate <= end;
				});

				if (weekIndex !== -1) {
					const week = weeks[weekIndex];
					week.totalCommits++;
					totalCommits++;
					
					// Add contributor
					if (!week.contributors.includes(author)) {
						week.contributors.push(author);
					}
					contributorsSet.add(author);
					
					// Count by day of week (0 = Sunday, 6 = Saturday)
					const dayOfWeek = commitDate.getDay();
					week.days[dayOfWeek]++;
				}
			});

			const activityData: CommitActivityData = {
				weeks,
				totalCommits,
				totalContributors: contributorsSet.size,
				averageCommitsPerWeek: totalCommits / 52
			};

			return {
				success: true,
				data: activityData
			};

		} catch (error: any) {
			console.error('[Commit Activity] Error:', error);
			return {
				success: false,
				error: error.message,
				data: null
			};
		}
	});

/**
 * Get commit activity directly from GitHub API
 * Fetches commit activity statistics from GitHub's /stats/commit_activity endpoint
 */
export const getCommitActivityFromAPI = procedure
	.input(z.object({ repoFullName: z.string() }))
	.resolve(async (ctx, input) => {
		try {
			const [owner, repo] = input.repoFullName.split('/');
			
			if (!owner || !repo) {
				return {
					success: false,
					error: 'Invalid repository name format. Expected: owner/repo',
					data: null
				};
			}

			// Call GitHub API for commit activity stats
			const url = GITHUB_API_ENDPOINTS.REPO(owner, repo).COMMIT_ACTIVITY;
			
			console.log(`[Commit Activity API] Fetching from: ${url}`);
			
			const githubData = await githubApiRequest<GitHubWeeklyActivity[]>(url);

			if (!githubData || githubData.length === 0) {
				return {
					success: false,
					error: 'No commit activity data available from GitHub',
					data: null
				};
			}

			// Convert GitHub API data format to our format
			// GitHub returns data for the last 52 weeks
			const weeks: WeeklyActivity[] = githubData.map((weekData: GitHubWeeklyActivity) => {
				// week is Unix timestamp (seconds), convert to date
				const weekStartDate = new Date(weekData.week * 1000);
				const weekEndDate = new Date(weekStartDate);
				weekEndDate.setDate(weekEndDate.getDate() + 6);

				return {
					weekStart: weekStartDate.toISOString(),
					weekEnd: weekEndDate.toISOString(),
					totalCommits: weekData.total,
					contributors: [], // GitHub API doesn't provide contributor info
					days: weekData.days
				};
			});

			// Calculate totals
			const totalCommits = weeks.reduce((sum, week) => sum + week.totalCommits, 0);

			const activityData: CommitActivityData = {
				weeks,
				totalCommits,
				totalContributors: 0, // GitHub stats API doesn't provide this info
				averageCommitsPerWeek: totalCommits / weeks.length
			};

			console.log(`[Commit Activity API] Successfully fetched ${weeks.length} weeks of data`);

			return {
				success: true,
				data: activityData
			};

		} catch (error: any) {
			console.error('[Commit Activity API] Error:', error);
			
			// GitHub API may return 202 indicating stats are being computed
			if (error.response?.status === 202) {
				return {
					success: false,
					error: 'GitHub is computing commit statistics. Please try again in a few moments.',
					data: null
				};
			}
			
			// 401/403 indicates authentication issues
			if (error.response?.status === 401 || error.response?.status === 403) {
				return {
					success: false,
					error: 'Authentication failed. Please sign in to GitHub.',
					data: null
				};
			}

			// 404 indicates repository doesn't exist or no access
			if (error.response?.status === 404) {
				return {
					success: false,
					error: 'Repository not found or you do not have access to it.',
					data: null
				};
			}

			return {
				success: false,
				error: error.message || 'Failed to fetch commit activity from GitHub',
				data: null
			};
		}
	});

