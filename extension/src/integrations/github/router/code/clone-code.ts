/**
 * Code - Clone Code Repository
 */

import { z } from 'zod';
import { procedure } from '../../../../router/utils';
import { GlobalStateManager } from '../../../../providers/state/global-state-manager';
import { getCurrentAccountToken } from '../../api/api';
import * as path from 'path';
import * as os from 'os';
import simpleGit from 'simple-git';
import { createDiagnosticLogger } from '..';

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
			
			const fs = require('fs').promises;
			const globalState = GlobalStateManager.getInstance();
			
		// Determine target path
		const githubSettings = globalState.getGlobalState('githubSettings');
		const defaultCloneDir = githubSettings?.defaultCloneDirectory || path.join(os.homedir(), 'Documents', 'GitHub');
		// Only use project name, not "username-projectname"
		const repoName = input.repoFullName.split('/')[1] || input.repoFullName;
		const targetPath = input.targetPath || path.join(defaultCloneDir, repoName);
		diagnosticLog('Target path', targetPath);
			
		// Ensure parent directory exists
		await fs.mkdir(defaultCloneDir, { recursive: true });
		diagnosticLog('Parent directory created/verified');
		
		// Check if target path already exists (prevent directory conflicts)
		try {
			await fs.access(targetPath);
			diagnosticLog('Directory already exists but not in state', targetPath);
			
			// Check if it's a Git repository
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
				await fs.access(targetPath);
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

