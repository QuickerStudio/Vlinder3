import { fileEditorPrompt } from './file-editor';
import { exploreRepoFolderPrompt } from './explore-repo-folder';
import { searchFilesPrompt } from './search-files';
import { searchSymbolPrompt } from './search-symbol';
import { listFilesPrompt } from './list-files';
import { readFilePrompt } from './read-file';
import { terminalPrompt } from './terminal';
import { serverRunnerPrompt } from './server-runner';
import { urlScreenshotPrompt } from './url-screenshot';
import { attemptCompletionPrompt } from './attempt-complete';
import { askFollowupQuestionPrompt } from './ask-followup-question';
import { spawnAgentPrompt } from './spawn-agent';
import { movePrompt } from './move';
import { removePrompt } from './remove';
import { renamePrompt } from './rename';
import { replaceStringPrompt } from './replace-string';
import { multiReplaceStringPrompt } from './multi-replace-string';
import { insertEditPrompt } from './insert-edit';
import { vscodeApiPrompt } from './vscode-api';
import { grepSearchPrompt } from './grep-search';
import { thinkToolPrompt } from './think';
import { fastEditorToolPrompt } from './fast-editor';
import { timerPrompt } from './timer';
import { patternSearchPrompt } from './pattern-search';
import { readImagePrompt } from './read-image';

export const toolPrompts = [
	// Core interaction
	thinkToolPrompt,
	askFollowupQuestionPrompt,
	attemptCompletionPrompt,
	
	// Terminal execution
	terminalPrompt,
	serverRunnerPrompt,
	
	// File system - Browse & Read
	readFilePrompt,
	listFilesPrompt,
	exploreRepoFolderPrompt,
	readImagePrompt,
	
	// Code search
	searchFilesPrompt,
	searchSymbolPrompt,
	grepSearchPrompt,
	patternSearchPrompt,
	
	// File editing
	fileEditorPrompt,
	fastEditorToolPrompt,
	replaceStringPrompt,
	multiReplaceStringPrompt,
	insertEditPrompt,
	
	// File operations
	movePrompt,
	removePrompt,
	renamePrompt,
	
	// Network
	urlScreenshotPrompt,
	
	// VSCode integration
	vscodeApiPrompt,
	
	// Agent management
	spawnAgentPrompt,
	
	// Advanced features
	timerPrompt,
];
