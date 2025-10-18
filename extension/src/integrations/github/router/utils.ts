/**
 * GitHub Router Utilities
 */

import * as os from 'os';
import * as path from 'path';

export function getDefaultCloneDirectory(): string {
	return path.join(os.homedir(), 'Documents', 'GitHub');
}

/**
 * Diagnostic logging helper
 */
export function createDiagnosticLogger(prefix: string) {
	return (message: string, data?: any) => {
		console.log(`[${prefix}] ${message}`, data || '');
	};
}

