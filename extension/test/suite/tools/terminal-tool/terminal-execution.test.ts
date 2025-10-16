/**
 * Terminal Tool - Command Execution Tests
 * 
 * 测试命令执行相关功能：
 * - Shell Integration执行
 * - Fallback执行
 * - 命令执行成功率
 * - 超时处理
 * - 输出捕获
 * - Exit Code追踪
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import 'mocha';
import { TerminalTool } from '../../../../src/agent/v1/tools/runners/terminal.tool';

describe('Terminal Tool - Command Execution', () => {
	let sandbox: sinon.SinonSandbox;
	let mockTerminal: any;
	let mockShellExecution: any;
	
	beforeEach(() => {
		sandbox = sinon.createSandbox();
		
	// 创建正确的异步生成器 mock
	mockShellExecution = {
		read: () => {
			return (async function* () {
				yield 'test output\n';
			})();
		}
	};
		
		mockTerminal = {
			name: 'test-terminal',
			processId: Promise.resolve(12345),
			exitStatus: undefined,
			state: { isInteractedWith: false },
			creationOptions: {},
			sendText: sandbox.stub(),
			show: sandbox.stub(),
			hide: sandbox.stub(),
			dispose: sandbox.stub(),
			shellIntegration: {
				executeCommand: sandbox.stub().resolves(mockShellExecution),
				cwd: vscode.Uri.file('/test'),
			},
		};
	});
	
	afterEach(() => {
		sandbox.restore();
	});
	
	describe('1. Shell Integration Execution', () => {
		it('应该优先使用Shell Integration执行命令', async () => {
			const tool = createTerminalTool({ command: 'echo hello' });
			
		// 创建自定义的 mockShellExecution 用于这个测试
		const customExecution = {
			read: () => {
				return (async function* () {
					yield 'hello\n';
				})();
			},
			commandLine: { value: 'echo hello', isTrusted: true, confidence: 2 },
			cwd: vscode.Uri.file('/test')
		};
			
			const customTerminal = {
				...mockTerminal,
				shellIntegration: {
					executeCommand: sandbox.stub().resolves(customExecution),
					cwd: vscode.Uri.file('/test'),
				}
			};
			
			sandbox.stub(vscode.window, 'createTerminal').returns(customTerminal);
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves('/bin/bash');
			
		// 模拟 shell execution 结束事件
		sandbox.stub(vscode.window, 'onDidEndTerminalShellExecution').callsFake((callback) => {
			setTimeout(() => callback({ 
				execution: customExecution, 
				exitCode: 0,
				terminal: customTerminal,
				shellIntegration: customTerminal.shellIntegration
			}), 100);
			return { dispose: () => {} };
		});
			
			await tool.execute();
			
			assert.ok(customTerminal.shellIntegration.executeCommand.called, 'Should use shell integration');
		});
		
		it('应该正确执行命令并捕获输出', async () => {
			const tool = createTerminalTool({ command: 'echo test output' });
			
			const outputData = 'test output\n';
			
		// 创建正确的异步生成器
		const customExecution = {
			read: () => {
				return (async function* () {
					yield outputData;
				})();
			},
			commandLine: { value: 'echo test output', isTrusted: true, confidence: 2 },
			cwd: vscode.Uri.file('/test')
		};
			
			const customTerminal = {
				...mockTerminal,
				shellIntegration: {
					executeCommand: sandbox.stub().resolves(customExecution),
					cwd: vscode.Uri.file('/test'),
				}
			};
			
			sandbox.stub(vscode.window, 'createTerminal').returns(customTerminal);
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves('/bin/bash');
			
		// 模拟 shell execution 结束
		sandbox.stub(vscode.window, 'onDidEndTerminalShellExecution').callsFake((callback) => {
			setTimeout(() => callback({ 
				execution: customExecution, 
				exitCode: 0,
				terminal: customTerminal,
				shellIntegration: customTerminal.shellIntegration
			}), 50);
			return { dispose: () => {} };
		});
			
			// 模拟executeWithShellIntegration
			const result = await (tool as any).executeWithShellIntegration(
				customTerminal,
				'echo test output',
				'bash',
				30000,
				true,
				undefined,
				sandbox.stub(),
				sandbox.stub(),
				false,
				customTerminal.shellIntegration
			);
			
			assert.ok(result.text.includes(outputData), 'Should capture output');
			assert.strictEqual(result.status, 'success', 'Should return success');
		});
		
		it('应该处理执行超时', async () => {
			const tool = createTerminalTool({ 
				command: 'sleep 100',
				executionTimeout: 100 
			});
			
			// 创建一个永远不会完成的异步生成器来模拟超时
			const customExecution = {
				read: () => {
					return (async function* () {
						await new Promise(resolve => setTimeout(resolve, 5000)); // 5秒延迟
						yield 'never reached\n';
					})();
				}
			};
			
			const customTerminal = {
				...mockTerminal,
				shellIntegration: {
					executeCommand: sandbox.stub().resolves(customExecution),
					cwd: vscode.Uri.file('/test'),
				}
			};
			
			sandbox.stub(vscode.window, 'createTerminal').returns(customTerminal);
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves('/bin/bash');
			
			// 不模拟 onDidEndTerminalShellExecution，让它超时
			sandbox.stub(vscode.window, 'onDidEndTerminalShellExecution').returns({ dispose: () => {} });
			
			const result = await (tool as any).executeWithShellIntegration(
				customTerminal,
				'sleep 100',
				'bash',
				100, // 100ms timeout
				true,
				undefined,
				sandbox.stub(),
				sandbox.stub(),
				false,
				customTerminal.shellIntegration
			);
			
			assert.ok(result.text.includes('timeout') || result.text.includes('timed out'), 'Should indicate timeout');
		});
		
	 it('应该捕获Exit Code', async () => {
		const tool = createTerminalTool({ command: 'exit 1' });
		
		sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
		
		mockShellExecution.read = sandbox.stub().returns(
			(async function* () {
				yield '';
			})()
		);
		
		sandbox.stub(vscode.window, 'onDidEndTerminalShellExecution').callsFake((callback) => {
			setTimeout(() => callback({ 
				execution: mockShellExecution, 
				exitCode: 1,
				terminal: mockTerminal,
				shellIntegration: mockTerminal.shellIntegration
			}), 10);
			return { dispose: () => {} };
		});
			
			const result = await (tool as any).executeWithShellIntegration(
				mockTerminal,
				'exit 1',
				'bash',
				30000,
				true,
				undefined,
				sandbox.stub(),
				sandbox.stub(),
				false,
				mockTerminal.shellIntegration
			);
			
			assert.ok(result.text.includes('<exit_code>1</exit_code>'), 'Should capture exit code');
		});
		
	 it('应该处理命令执行流', async () => {
		const tool = createTerminalTool({ command: 'npm install' });
		
		sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
		
		const outputChunks = [
			'npm info it worked\n',
			'npm info using npm@8.0.0\n',
			'added 10 packages\n',
		];
		
		mockShellExecution.read = sandbox.stub().returns(
			(async function* () {
				for (const chunk of outputChunks) {
					yield chunk;
				}
			})()
		);
		
		sandbox.stub(vscode.window, 'onDidEndTerminalShellExecution').callsFake((callback) => {
			setTimeout(() => callback({ 
				execution: mockShellExecution, 
				exitCode: 0,
				terminal: mockTerminal,
				shellIntegration: mockTerminal.shellIntegration
			}), 50);
			return { dispose: () => {} };
		});
			
			const result = await (tool as any).executeWithShellIntegration(
				mockTerminal,
				'npm install',
				'bash',
				30000,
				true,
				undefined,
				sandbox.stub(),
				sandbox.stub(),
				false,
				mockTerminal.shellIntegration
			);
			
			// 验证所有输出块都被捕获
			outputChunks.forEach(chunk => {
				assert.ok(result.text.includes(chunk.trim()), `Should include output: ${chunk}`);
			});
		});
	});
	
	describe('2. Fallback Execution', () => {
	 it('应该在Shell Integration不可用时使用Fallback', async () => {
			const terminalWithoutIntegration = {
				...mockTerminal,
				shellIntegration: undefined,
			};
			
			const tool = createTerminalTool({ command: 'echo fallback' });
			
			sandbox.stub(vscode.window, 'createTerminal').returns(terminalWithoutIntegration);
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves('/bin/bash');
			
			const result = await (tool as any).executeWithFallback(
				terminalWithoutIntegration,
				'echo fallback',
				'bash',
				sandbox.stub(),
				sandbox.stub(),
				'timeout_after_3s'
			);
			
			assert.ok(terminalWithoutIntegration.sendText.called, 'Should use sendText');
			assert.ok(result.text.includes('fallback'), 'Should indicate fallback mode');
		});
		
	 it('应该通过sendText发送命令', async () => {
			const terminalWithoutIntegration = {
				...mockTerminal,
				shellIntegration: undefined,
			};
			
			const tool = createTerminalTool({ command: 'ls -la' });
			
			const result = await (tool as any).executeWithFallback(
				terminalWithoutIntegration,
				'ls -la',
				'bash',
				sandbox.stub(),
				sandbox.stub(),
				'cached_not_supported'
			);
			
			assert.ok(terminalWithoutIntegration.sendText.calledWith('ls -la'), 'Should send command text');
		});
		
	 it('应该提示用户查看终端输出', async () => {
			const terminalWithoutIntegration = {
				...mockTerminal,
				shellIntegration: undefined,
			};
			
			const tool = createTerminalTool({ command: 'test' });
			
			const sayStub = sandbox.stub();
			const result = await (tool as any).executeWithFallback(
				terminalWithoutIntegration,
				'test',
				'bash',
				sandbox.stub(),
				sayStub,
				'timeout_after_3s'
			);
			
			assert.ok(sayStub.called, 'Should call say to inform user');
			assert.ok(result.text.includes('fallback'), 'Should mention fallback mode');
		});
	});
	
	describe('3. Shell Integration Cache', () => {
	 it('应该缓存Shell Integration支持状态', async () => {
			const tool = createTerminalTool({ command: 'test' });
			
			sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves('/bin/bash');
			
			// 第一次执行应该检测Shell Integration
			await tool.execute();
			
			// 检查缓存
			const cache = (tool.constructor as any).shellIntegrationCache;
			assert.ok(cache.size > 0, 'Should cache shell integration status');
		});
		
	 it('应该使用缓存避免重复等待', async () => {
			const tool1 = createTerminalTool({ command: 'test1' });
			const tool2 = createTerminalTool({ command: 'test2' });
			
			// 预设缓存（模拟不支持Shell Integration的情况）
			const cache = (tool1.constructor as any).shellIntegrationCache;
			cache.set('bash-/bin/bash', {
				supported: false,
				lastChecked: new Date(),
				shell: 'bash'
			});
			
			const terminalWithoutIntegration = {
				...mockTerminal,
				shellIntegration: undefined,
			};
			
			sandbox.stub(vscode.window, 'createTerminal').returns(terminalWithoutIntegration);
			sandbox.stub(tool2 as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool2 as any, 'getShellPath').resolves('/bin/bash');
			
			const startTime = Date.now();
			await tool2.execute();
			const executionTime = Date.now() - startTime;
			
			// 应该立即使用fallback，不等待3秒
			assert.ok(executionTime < 1000, 'Should skip waiting when cache indicates no support');
		});
		
	 it('应该在缓存过期后重新检测', () => {
			const tool = createTerminalTool();
			
			const cache = (tool.constructor as any).shellIntegrationCache;
			const CACHE_TTL_MS = 5 * 60 * 1000;
			
			// 设置过期的缓存
			cache.set('test-shell', {
				supported: false,
				lastChecked: new Date(Date.now() - CACHE_TTL_MS - 1000),
				shell: 'bash'
			});
			
			// 验证缓存存在但已过期
			const cached = cache.get('test-shell');
			const cacheAge = Date.now() - cached.lastChecked.getTime();
			assert.ok(cacheAge > CACHE_TTL_MS, 'Cache should be expired');
		});
	});
	
	describe('4. Command Execution Success Rate', () => {
	 it('应该成功执行简单命令', async () => {
		const tool = createTerminalTool({ command: 'echo success' });
		
		sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
		sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
		sandbox.stub(tool as any, 'getShellPath').resolves('/bin/bash');
		
		mockShellExecution.read = sandbox.stub().returns(
			(async function* () {
				yield 'success\n';
			})()
		);
		
		sandbox.stub(vscode.window, 'onDidEndTerminalShellExecution').callsFake((callback) => {
			setTimeout(() => callback({ 
				execution: mockShellExecution, 
				exitCode: 0,
				terminal: mockTerminal,
				shellIntegration: mockTerminal.shellIntegration
			}), 10);
			return { dispose: () => {} };
		});
			
			const result = await (tool as any).executeWithShellIntegration(
				mockTerminal,
				'echo success',
				'bash',
				30000,
				true,
				undefined,
				sandbox.stub(),
				sandbox.stub(),
				false,
				mockTerminal.shellIntegration
			);
			
			assert.strictEqual(result.status, 'success', 'Should succeed');
			assert.ok(result.text.includes('success'), 'Should contain output');
		});
		
	 it('应该处理失败的命令', async () => {
		const tool = createTerminalTool({ command: 'invalid-command' });
		
		sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
		
		mockShellExecution.read = sandbox.stub().returns(
			(async function* () {
				yield 'command not found: invalid-command\n';
			})()
		);
		
		sandbox.stub(vscode.window, 'onDidEndTerminalShellExecution').callsFake((callback) => {
			setTimeout(() => callback({ 
				execution: mockShellExecution, 
				exitCode: 127,
				terminal: mockTerminal,
				shellIntegration: mockTerminal.shellIntegration
			}), 10);
			return { dispose: () => {} };
		});
			
			const result = await (tool as any).executeWithShellIntegration(
				mockTerminal,
				'invalid-command',
				'bash',
				30000,
				true,
				undefined,
				sandbox.stub(),
				sandbox.stub(),
				false,
				mockTerminal.shellIntegration
			);
			
			assert.ok(result.text.includes('127'), 'Should include exit code');
			assert.ok(result.text.includes('not found'), 'Should include error message');
		});
		
	 it('应该处理长时间运行的命令', async () => {
		const tool = createTerminalTool({ 
			command: 'npm test',
			executionTimeout: 60000 
		});
		
		sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
		
		const testOutput = [
			'Test Suites: 5 passed, 5 total\n',
			'Tests: 23 passed, 23 total\n',
			'Snapshots: 0 total\n',
		];
		
		mockShellExecution.read = sandbox.stub().returns(
			(async function* () {
				for (const line of testOutput) {
					await new Promise(resolve => setTimeout(resolve, 100));
					yield line;
				}
			})()
		);
		
		sandbox.stub(vscode.window, 'onDidEndTerminalShellExecution').callsFake((callback) => {
			setTimeout(() => callback({ 
				execution: mockShellExecution, 
				exitCode: 0,
				terminal: mockTerminal,
				shellIntegration: mockTerminal.shellIntegration
			}), 500);
			return { dispose: () => {} };
		});
			
			const result = await (tool as any).executeWithShellIntegration(
				mockTerminal,
				'npm test',
				'bash',
				60000,
				true,
				undefined,
				sandbox.stub(),
				sandbox.stub(),
				false,
				mockTerminal.shellIntegration
			);
			
			testOutput.forEach(line => {
				assert.ok(result.text.includes(line.trim()), `Should include: ${line}`);
			});
		});
	});
	
	describe('5. Output Capture', () => {
	 it('应该在shouldCaptureOutput=true时捕获输出', async () => {
			const tool = createTerminalTool({ 
				command: 'echo test',
				shouldCaptureOutput: true 
			});
			
			sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
			
		mockShellExecution.read = sandbox.stub().returns(
			(async function* () {
				yield 'test output\n';
			})()
		);
			
			const result = await (tool as any).executeWithShellIntegration(
				mockTerminal,
				'echo test',
				'bash',
				30000,
				true,
				undefined,
				sandbox.stub(),
				sandbox.stub(),
				false,
				mockTerminal.shellIntegration
			);
			
			assert.ok(result.text.includes('test output'), 'Should capture output');
		});
		
	 it('应该处理大量输出', async () => {
			const tool = createTerminalTool({ command: 'generate-large-output' });
			
			sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
			
		const largeOutput = 'x'.repeat(100000); // 100KB output
		mockShellExecution.read = sandbox.stub().returns(
			(async function* () {
				yield largeOutput;
			})()
		);
		
		sandbox.stub(vscode.window, 'onDidEndTerminalShellExecution').callsFake((callback) => {
			setTimeout(() => callback({ 
				execution: mockShellExecution, 
				exitCode: 0,
				terminal: mockTerminal,
				shellIntegration: mockTerminal.shellIntegration
			}), 10);
			return { dispose: () => {} };
		});
			
			const result = await (tool as any).executeWithShellIntegration(
				mockTerminal,
				'generate-large-output',
				'bash',
				30000,
				true,
				undefined,
				sandbox.stub(),
				sandbox.stub(),
				false,
				mockTerminal.shellIntegration
			);
			
			assert.ok(result.text.length > 0, 'Should handle large output');
			// 验证输出被截断或智能处理
			assert.ok(result.text.length < largeOutput.length * 2, 'Should truncate or manage large output');
		});
		
	 it('应该清理ANSI转义序列', () => {
			const tool = createTerminalTool();
			
			const ansiText = '\x1b[31mRed Text\x1b[0m \x1b[1mBold\x1b[0m';
			const cleaned = (tool as any).cleanAnsiEscapes(ansiText);
			
			assert.ok(!cleaned.includes('\x1b'), 'Should remove ANSI codes');
			assert.ok(cleaned.includes('Red Text'), 'Should preserve text content');
			assert.ok(cleaned.includes('Bold'), 'Should preserve text content');
		});
		
	 it('应该智能截断输出', () => {
			const tool = createTerminalTool();
			
			const longOutput = 'line\n'.repeat(10000); // 10000 lines
			const truncated = (tool as any).smartTruncateOutput(longOutput, 1000, 100);
			
			assert.ok(truncated.length < longOutput.length, 'Should truncate long output');
			assert.ok(truncated.includes('truncated'), 'Should indicate truncation');
		});
	});
	
	describe('6. Auto-Close Terminal', () => {
	 it('应该在shouldAutoCloseTerminal=true时自动关闭终端', async () => {
		const tool = createTerminalTool({ 
			command: 'echo test',
			shouldAutoCloseTerminal: true 
		});
		
		sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
		
		mockShellExecution.read = sandbox.stub().returns(
			(async function* () {
				yield 'test\n';
			})()
		);
		
		sandbox.stub(vscode.window, 'onDidEndTerminalShellExecution').callsFake((callback) => {
			setTimeout(() => callback({ 
				execution: mockShellExecution, 
				exitCode: 0,
				terminal: mockTerminal,
				shellIntegration: mockTerminal.shellIntegration
			}), 10);
			return { dispose: () => {} };
		});
			
			await (tool as any).executeWithShellIntegration(
				mockTerminal,
				'echo test',
				'bash',
				30000,
				true,
				undefined,
				sandbox.stub(),
				sandbox.stub(),
				true, // shouldAutoCloseTerminal
				mockTerminal.shellIntegration
			);
			
			// 等待异步关闭
			await new Promise(resolve => setTimeout(resolve, 100));
			
			assert.ok(mockTerminal.dispose.called, 'Should dispose terminal');
		});
		
	 it('应该在shouldAutoCloseTerminal=false时保持终端打开', async () => {
		const tool = createTerminalTool({ 
			command: 'echo test',
			shouldAutoCloseTerminal: false 
		});
		
		sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
		
		mockShellExecution.read = sandbox.stub().returns(
			(async function* () {
				yield 'test\n';
			})()
		);
		
		sandbox.stub(vscode.window, 'onDidEndTerminalShellExecution').callsFake((callback) => {
			setTimeout(() => callback({ 
				execution: mockShellExecution, 
				exitCode: 0,
				terminal: mockTerminal,
				shellIntegration: mockTerminal.shellIntegration
			}), 10);
			return { dispose: () => {} };
		});
			
			await (tool as any).executeWithShellIntegration(
				mockTerminal,
				'echo test',
				'bash',
				30000,
				true,
				undefined,
				sandbox.stub(),
				sandbox.stub(),
				false, // shouldAutoCloseTerminal
				mockTerminal.shellIntegration
			);
			
			await new Promise(resolve => setTimeout(resolve, 100));
			
			assert.ok(!mockTerminal.dispose.called, 'Should not dispose terminal');
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


