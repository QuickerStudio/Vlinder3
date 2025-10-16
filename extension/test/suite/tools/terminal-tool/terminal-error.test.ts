/**
 * Terminal Tool - Error Handling Tests
 * 
 * 测试错误处理功能：
 * - 错误分析 (analyzeTerminalError)
 * - 12种错误类型识别
 * - 错误建议生成
 * - Exit Code处理
 * - 智能错误诊断
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import 'mocha';
import { TerminalTool } from '../../../../src/agent/v1/tools/runners/terminal.tool';

describe('Terminal Tool - Error Handling', () => {
	let sandbox: sinon.SinonSandbox;
	
	beforeEach(() => {
		sandbox = sinon.createSandbox();
	});
	
	afterEach(() => {
		sandbox.restore();
	});
	
	describe('1. Module Not Found Errors', () => {
	 it('应该识别模块未找到错误', () => {
			const tool = createTerminalTool();
			
			const output = 'Error: Cannot find module \'express\'\nat require (internal/modules/cjs/loader.js:834:19)';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'node app.js');
			
			assert.strictEqual(analysis.errorType, 'MODULE_NOT_FOUND', 'Should identify module not found');
			assert.strictEqual(analysis.category, 'Dependency Error', 'Should categorize correctly');
			assert.ok(analysis.suggestion.includes('npm install'), 'Should suggest npm install');
			assert.ok(analysis.suggestion.includes('express'), 'Should include module name');
		});
		
	 it('应该识别ModuleNotFoundError', () => {
			const tool = createTerminalTool();
			
			const output = 'ModuleNotFoundError: No module named \'requests\'';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'python script.py');
			
			assert.strictEqual(analysis.errorType, 'MODULE_NOT_FOUND');
			assert.ok(analysis.relatedCommands.length > 0, 'Should provide related commands');
		});
		
	 it('应该提取模块名称', () => {
			const tool = createTerminalTool();
			
			const output = 'Cannot find module \'lodash\'';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'node test.js');
			
			assert.ok(analysis.suggestion.includes('lodash'), 'Should extract module name');
		});
	});
	
	describe('2. Permission Denied Errors', () => {
	 it('应该识别EACCES错误', () => {
			const tool = createTerminalTool();
			
			const output = 'Error: EACCES: permission denied, mkdir \'/usr/local/lib\'';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'npm install -g package');
			
			assert.strictEqual(analysis.errorType, 'PERMISSION_DENIED');
			assert.strictEqual(analysis.category, 'Permission Error');
			assert.ok(analysis.suggestion.includes('sudo') || analysis.suggestion.includes('Administrator'));
		});
		
	 it('应该识别Permission Denied错误', () => {
			const tool = createTerminalTool();
			
			const output = 'bash: /etc/hosts: Permission denied';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'echo "test" > /etc/hosts');
			
			assert.strictEqual(analysis.errorType, 'PERMISSION_DENIED');
		});
		
	 it('应该识别Access is Denied错误 (Windows)', () => {
			const tool = createTerminalTool();
			
			const output = 'Access is denied.\nError: Unable to write to C:\\Windows\\System32\\config';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'copy file.txt C:\\Windows\\System32');
			
			assert.strictEqual(analysis.errorType, 'PERMISSION_DENIED');
		});
		
	 it('应该建议使用sudo（当命令未使用sudo时）', () => {
			const tool = createTerminalTool();
			
			const output = 'Permission denied';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'apt-get install package');
			
			assert.ok(analysis.suggestion.includes('sudo'), 'Should suggest using sudo');
			assert.ok(analysis.relatedCommands.some(cmd => cmd.startsWith('sudo')), 'Should provide sudo command');
		});
		
	 it('应该建议检查权限（当已使用sudo时）', () => {
			const tool = createTerminalTool();
			
			const output = 'Permission denied';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'sudo apt-get install package');
			
			assert.ok(analysis.suggestion.includes('permissions'), 'Should suggest checking permissions');
			assert.ok(analysis.relatedCommands.some(cmd => cmd === 'chmod' || cmd === 'chown'));
		});
	});
	
	describe('3. Port In Use Errors', () => {
	 it('应该识别EADDRINUSE错误', () => {
			const tool = createTerminalTool();
			
			const output = 'Error: listen EADDRINUSE: address already in use :::3000';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'npm start');
			
			assert.strictEqual(analysis.errorType, 'PORT_IN_USE');
			assert.strictEqual(analysis.category, 'Network Error');
			assert.ok(analysis.suggestion.includes('3000'), 'Should identify port number');
		});
		
	 it('应该识别"port already in use"错误', () => {
			const tool = createTerminalTool();
			
			const output = 'ERROR: Port 8080 is already in use by another process';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'java -jar app.jar');
			
			assert.strictEqual(analysis.errorType, 'PORT_IN_USE');
			assert.ok(analysis.suggestion.includes('8080'));
		});
		
	 it('应该提供平台特定的端口检查命令', () => {
			const tool = createTerminalTool();
			
			const output = 'Port 5000 already in use';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'python app.py');
			
			// 应该包含Windows (netstat) 或 Unix (lsof) 命令
			const hasWindowsCmd = analysis.relatedCommands.some(cmd => cmd.includes('netstat'));
			const hasUnixCmd = analysis.relatedCommands.some(cmd => cmd.includes('lsof'));
			assert.ok(hasWindowsCmd || hasUnixCmd, 'Should provide platform-specific commands');
		});
	});
	
	describe('4. File Not Found Errors', () => {
	 it('应该识别ENOENT错误', () => {
			const tool = createTerminalTool();
			
			const output = 'Error: ENOENT: no such file or directory, open \'config.json\'';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'node app.js');
			
			assert.strictEqual(analysis.errorType, 'FILE_NOT_FOUND');
			assert.strictEqual(analysis.category, 'File System Error');
		});
		
	 it('应该识别"no such file or directory"错误', () => {
			const tool = createTerminalTool();
			
			const output = 'bash: /path/to/file: No such file or directory';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'bash /path/to/file');
			
			assert.strictEqual(analysis.errorType, 'FILE_NOT_FOUND');
		});
		
	 it('应该识别Windows路径错误', () => {
			const tool = createTerminalTool();
			
			const output = 'The system cannot find the path specified.';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'cd C:\\invalid\\path');
			
			assert.strictEqual(analysis.errorType, 'FILE_NOT_FOUND');
		});
		
	 it('应该建议使用路径检查命令', () => {
			const tool = createTerminalTool();
			
			const output = 'No such file or directory';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'cat file.txt');
			
			const hasListCmd = analysis.relatedCommands.some(cmd => 
				cmd === 'ls -la' || cmd === 'dir' || cmd === 'pwd' || cmd === 'Get-Location'
			);
			assert.ok(hasListCmd, 'Should suggest directory listing commands');
		});
	});
	
	describe('5. Git Errors', () => {
	 it('应该识别"not a git repository"错误', () => {
			const tool = createTerminalTool();
			
			const output = 'fatal: not a git repository (or any of the parent directories): .git';
			const analysis = (tool as any).analyzeTerminalError(128, output, 'git status');
			
			assert.strictEqual(analysis.errorType, 'NOT_GIT_REPO');
			assert.strictEqual(analysis.category, 'Git Error');
			assert.ok(analysis.suggestion.includes('git init') || analysis.suggestion.includes('git repository'));
		});
		
	 it('应该识别merge conflict错误', () => {
			const tool = createTerminalTool();
			
			const output = 'CONFLICT (content): Merge conflict in file.txt\nAutomatic merge failed';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'git merge branch');
			
			assert.strictEqual(analysis.errorType, 'GIT_CONFLICT');
			assert.ok(analysis.suggestion.includes('conflict'), 'Should mention conflicts');
			assert.ok(analysis.relatedCommands.includes('git status'), 'Should suggest git status');
		});
		
	 it('应该识别push rejected错误', () => {
			const tool = createTerminalTool();
			
			const output = 'error: failed to push some refs\n! [rejected] main -> main (fetch first)';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'git push origin main');
			
			assert.strictEqual(analysis.errorType, 'GIT_PUSH_REJECTED');
			assert.ok(analysis.suggestion.includes('pull'), 'Should suggest pulling first');
			assert.ok(analysis.relatedCommands.some(cmd => cmd.includes('git pull')));
		});
	});
	
	describe('6. NPM Errors', () => {
	 it('应该识别npm错误', () => {
			const tool = createTerminalTool();
			
			const output = 'npm ERR! code ELIFECYCLE\nnpm ERR! errno 1';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'npm run build');
			
			assert.strictEqual(analysis.errorType, 'NPM_ERROR');
			assert.strictEqual(analysis.category, 'NPM Error');
		});
		
	 it('应该识别missing script错误', () => {
			const tool = createTerminalTool();
			
			const output = 'npm ERR! missing script: test';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'npm run test');
			
			assert.strictEqual(analysis.errorType, 'NPM_SCRIPT_NOT_FOUND');
			assert.ok(analysis.suggestion.includes('package.json'), 'Should mention package.json');
		});
		
	 it('应该建议清理npm缓存', () => {
			const tool = createTerminalTool();
			
			const output = 'npm ERR! Unexpected error';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'npm install');
			
			const hasCacheClean = analysis.relatedCommands.some(cmd => cmd.includes('cache clean'));
			assert.ok(hasCacheClean, 'Should suggest cache cleaning');
		});
	});
	
	describe('7. Syntax Errors', () => {
	 it('应该识别SyntaxError', () => {
			const tool = createTerminalTool();
			
			const output = 'SyntaxError: Unexpected token } in JSON at position 123';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'node script.js');
			
			assert.strictEqual(analysis.errorType, 'SYNTAX_ERROR');
			assert.strictEqual(analysis.category, 'Code Error');
		});
		
	 it('应该识别unexpected token错误', () => {
			const tool = createTerminalTool();
			
			const output = 'Unexpected token ILLEGAL at line 42';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'node app.js');
			
			assert.strictEqual(analysis.errorType, 'SYNTAX_ERROR');
		});
	});
	
	describe('8. Command Not Found Errors', () => {
	 it('应该识别"command not found"错误', () => {
			const tool = createTerminalTool();
			
			const output = 'bash: python3: command not found';
			const analysis = (tool as any).analyzeTerminalError(127, output, 'python3 script.py');
			
			assert.strictEqual(analysis.errorType, 'COMMAND_NOT_FOUND');
			assert.strictEqual(analysis.category, 'Shell Error');
			assert.ok(analysis.suggestion.includes('python3'), 'Should mention the command');
		});
		
	 it('应该识别"is not recognized"错误 (Windows)', () => {
			const tool = createTerminalTool();
			
			const output = '\'git\' is not recognized as an internal or external command';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'git --version');
			
			assert.strictEqual(analysis.errorType, 'COMMAND_NOT_FOUND');
		});
		
	 it('应该提取命令名称', () => {
			const tool = createTerminalTool();
			
			const output = 'command not found: docker';
			const analysis = (tool as any).analyzeTerminalError(127, output, 'docker ps');
			
			assert.ok(analysis.suggestion.includes('docker'), 'Should extract command name');
		});
		
	 it('应该建议使用which/where命令', () => {
			const tool = createTerminalTool();
			
			const output = 'command not found: npm';
			const analysis = (tool as any).analyzeTerminalError(127, output, 'npm install');
			
			const hasWhichCmd = analysis.relatedCommands.some(cmd => 
				cmd.includes('which') || cmd.includes('where')
			);
			assert.ok(hasWhichCmd, 'Should suggest which/where command');
		});
	});
	
	describe('9. Generic Error Handling', () => {
	 it('应该处理未知错误类型', () => {
			const tool = createTerminalTool();
			
			const output = 'Some random error that doesn\'t match any pattern';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'some-command');
			
			assert.strictEqual(analysis.errorType, 'GENERIC_ERROR');
			assert.strictEqual(analysis.category, 'Unknown Error');
			assert.ok(analysis.suggestion.length > 0, 'Should provide generic suggestion');
		});
		
	 it('应该处理空输出', () => {
			const tool = createTerminalTool();
			
			const analysis = (tool as any).analyzeTerminalError(1, '', 'test-command');
			
			assert.strictEqual(analysis.errorType, 'GENERIC_ERROR');
		});
		
	 it('应该处理非错误退出码', () => {
			const tool = createTerminalTool();
			
			const output = 'Normal output';
			const analysis = (tool as any).analyzeTerminalError(0, output, 'echo test');
			
			// 即使exit code为0，也应该能分析（虽然实际不太可能被调用）
			assert.ok(analysis.errorType, 'Should return analysis');
		});
	});
	
	describe('10. Exit Code Handling', () => {
	 it('应该正确处理exit code 0 (成功)', () => {
			// Exit code 0通常不会触发错误分析，但测试健壮性
			const tool = createTerminalTool();
			
			const analysis = (tool as any).analyzeTerminalError(0, 'Success', 'echo test');
			assert.ok(analysis, 'Should handle success exit code');
		});
		
	 it('应该处理exit code 1 (通用错误)', () => {
			const tool = createTerminalTool();
			
			const analysis = (tool as any).analyzeTerminalError(1, 'Error occurred', 'test-command');
			assert.ok(analysis.errorType, 'Should identify error type');
		});
		
	 it('应该处理exit code 127 (命令未找到)', () => {
			const tool = createTerminalTool();
			
			const output = 'command not found';
			const analysis = (tool as any).analyzeTerminalError(127, output, 'missing-cmd');
			
			// Exit code 127通常表示命令未找到
			assert.ok(analysis.errorType === 'COMMAND_NOT_FOUND' || analysis.errorType === 'GENERIC_ERROR');
		});
		
	 it('应该处理exit code 128 (Git错误)', () => {
			const tool = createTerminalTool();
			
			const output = 'fatal: not a git repository';
			const analysis = (tool as any).analyzeTerminalError(128, output, 'git status');
			
			assert.strictEqual(analysis.errorType, 'NOT_GIT_REPO');
		});
	});
	
	describe('11. Error Analysis Output Format', () => {
	 it('应该返回完整的错误分析结构', () => {
			const tool = createTerminalTool();
			
			const output = 'Cannot find module \'express\'';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'node app.js');
			
			// 验证返回结构
			assert.ok(analysis.errorType, 'Should have errorType');
			assert.ok(analysis.category, 'Should have category');
			assert.ok(analysis.suggestion, 'Should have suggestion');
			assert.ok(Array.isArray(analysis.relatedCommands), 'Should have relatedCommands array');
		});
		
	 it('应该提供相关命令数组', () => {
			const tool = createTerminalTool();
			
			const output = 'Permission denied';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'mkdir /usr/test');
			
			assert.ok(Array.isArray(analysis.relatedCommands), 'relatedCommands should be array');
			assert.ok(analysis.relatedCommands.length > 0, 'Should provide at least one related command');
		});
		
	 it('应该提供可操作的建议', () => {
			const tool = createTerminalTool();
			
			const output = 'Port 3000 already in use';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'npm start');
			
			// 建议应该包含具体的操作指导
			assert.ok(analysis.suggestion.length > 20, 'Suggestion should be descriptive');
			assert.ok(analysis.relatedCommands.length > 0, 'Should provide actionable commands');
		});
	});
	
	describe('12. Case Insensitivity', () => {
	 it('应该不区分大小写识别错误', () => {
			const tool = createTerminalTool();
			
			const outputs = [
				'Error: CANNOT FIND MODULE \'test\'',
				'error: cannot find module \'test\'',
				'ERROR: Cannot Find Module \'test\'',
			];
			
			outputs.forEach(output => {
				const analysis = (tool as any).analyzeTerminalError(1, output, 'node app.js');
				assert.strictEqual(analysis.errorType, 'MODULE_NOT_FOUND', 
					`Should identify error regardless of case: ${output}`);
			});
		});
		
	 it('应该不区分命令大小写', () => {
			const tool = createTerminalTool();
			
			const commands = ['SUDO npm install', 'Sudo npm install', 'sudo npm install'];
			
			commands.forEach(cmd => {
				const analysis = (tool as any).analyzeTerminalError(1, 'Permission denied', cmd);
				// 所有情况都应该识别到命令中包含sudo
				assert.ok(analysis.suggestion.toLowerCase().includes('permission') || 
				          analysis.suggestion.toLowerCase().includes('chmod'),
				          `Should recognize sudo in: ${cmd}`);
			});
		});
	});
	
	describe('13. Multiple Error Patterns', () => {
	 it('应该优先匹配最具体的错误模式', () => {
			const tool = createTerminalTool();
			
			// 同时包含多个错误特征的输出
			const output = `
				Error: Cannot find module 'express'
				EACCES: permission denied
				Port 3000 already in use
			`;
			
			const analysis = (tool as any).analyzeTerminalError(1, output, 'node app.js');
			
			// 应该匹配第一个出现的错误（模块未找到）
			assert.strictEqual(analysis.errorType, 'MODULE_NOT_FOUND');
		});
		
	 it('应该处理复杂的错误堆栈', () => {
			const tool = createTerminalTool();
			
			const output = `
				Error: Something went wrong
				    at Function.Module._load (internal/modules/cjs/loader.js:586:27)
				    at require (internal/modules/cjs/loader.js:692:19)
				Caused by: Cannot find module 'missing-package'
				    at resolve (internal/modules/cjs/helpers.js:24:19)
			`;
			
			const analysis = (tool as any).analyzeTerminalError(1, output, 'node app.js');
			
			// 应该能够从堆栈中识别出"Cannot find module"
			assert.strictEqual(analysis.errorType, 'MODULE_NOT_FOUND');
		});
	});
	
	describe('14. AI-Friendly Error Messages', () => {
	 it('错误建议应该是AI友好的', () => {
			const tool = createTerminalTool();
			
			const output = 'Module not found';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'node app.js');
			
			// AI友好的建议应该：
			// 1. 清晰明确
			// 2. 包含具体的命令
			// 3. 易于理解和执行
			assert.ok(analysis.suggestion.length > 10, 'Should be descriptive');
			assert.ok(/npm install|yarn add|pnpm add/.test(analysis.suggestion), 
				'Should mention package manager command');
		});
		
	 it('应该提供上下文相关的建议', () => {
			const tool = createTerminalTool();
			
			const output = 'Port 8080 already in use';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'java -jar app.jar');
			
			// 建议应该提到端口8080
			assert.ok(analysis.suggestion.includes('8080'), 'Should mention specific port');
			
			// 应该提供检查端口的命令
			const hasPortCheckCmd = analysis.relatedCommands.some(cmd => 
				cmd.includes('8080') && (cmd.includes('netstat') || cmd.includes('lsof'))
			);
			assert.ok(hasPortCheckCmd, 'Should provide port checking command');
		});
	});
	
	// Helper function
	function createTerminalTool(inputParams: any = {}): TerminalTool {
		const defaultParams = {
			input: {
				panelType: 'terminal',
				command: 'echo test',
				...inputParams,
			},
			say: sandbox.stub().resolves(),
			ask: sandbox.stub().resolves({ response: 'yesButtonTapped' }),
			updateAsk: sandbox.stub().resolves(),
			returnEmptyStringOnSuccess: false,
			isSubMsg: false,
		};
		
		return new (TerminalTool as any)(
			defaultParams,
			'/test/cwd',
			'test-api-conversation-history',
			Date.now()
		);
	}
});


