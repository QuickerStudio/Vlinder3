/**
 * Terminal Tool - Integration Tests
 * 
 * 集成测试：测试完整的执行流程
 * - 端到端命令执行
 * - Shell Integration 检测流程
 * - 缓存机制集成
 * - 多终端并发管理
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import 'mocha';
import { TerminalTool } from '../../../../src/agent/v1/tools/runners/terminal.tool';

describe('Terminal Tool - Integration Tests', () => {
	let sandbox: sinon.SinonSandbox;
	
	beforeEach(() => {
		sandbox = sinon.createSandbox();
		// 清理静态缓存
		(TerminalTool as any).clearCacheForTesting();
	});
	
	afterEach(() => {
		sandbox.restore();
	});
	
	describe('1. 端到端命令执行流程', () => {
	 it('完整流程：用户批准 → Shell检测 → 终端创建 → 命令执行 → 状态更新', async () => {
			const askStub = sandbox.stub().resolves({ response: 'yesButtonTapped' });
			const updateAskStub = sandbox.stub().resolves();
			const sayStub = sandbox.stub().resolves();
			
			const tool = createTerminalTool({
				command: 'echo "Hello World"',
				shell: 'bash',
			}, { ask: askStub, updateAsk: updateAskStub, say: sayStub });
			
			// Mock shell 检测
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves('/bin/bash');
			
			// Mock 终端创建
		const mockShellExecution: any = {
			read: sandbox.stub().returns(
				(async function* () {
					yield 'Hello World\n';
				})()
			),
		};
			
			const mockTerminal: any = {
				name: 'echo-1',
				processId: Promise.resolve(12345),
				shellIntegration: {
					executeCommand: sandbox.stub().resolves(mockShellExecution),
					cwd: vscode.Uri.file('/test'),
				},
				show: sandbox.stub(),
			};
			
			sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
		sandbox.stub(vscode.window, 'onDidEndTerminalShellExecution').callsFake((callback) => {
			setTimeout(() => callback({ 
				execution: mockShellExecution, 
				exitCode: 0,
				terminal: mockTerminal,
				shellIntegration: mockTerminal.shellIntegration
			}), 10);
			return { dispose: () => {} };
		});
			
			// 执行
			const result = await tool.execute();
			
		// 验证流程
		assert.ok(askStub.called, '1. Should ask for approval');
		assert.ok(updateAskStub.called, '2. Should update status');
		assert.strictEqual(result.status, 'success', '3. Should succeed');
		assert.ok(result.text && result.text.includes('Hello World'), '4. Should capture output');
		assert.ok(result.text && result.text.includes('<exit_code>0</exit_code>'), '5. Should include exit code');
			
			// 验证状态序列
			const states = updateAskStub.getCalls().map(call => call.args[1].tool.approvalState);
			assert.ok(states.includes('loading'), 'Should go through loading state');
			assert.ok(states.includes('approved'), 'Should end with approved state');
		});
		
	 it('错误流程：命令失败 → 错误分析 → 建议生成', async () => {
			const askStub = sandbox.stub().resolves({ response: 'yesButtonTapped' });
			const updateAskStub = sandbox.stub().resolves();
			const sayStub = sandbox.stub().resolves();
			
			const tool = createTerminalTool({
				command: 'npm install express',
				shell: 'bash',
			}, { ask: askStub, updateAsk: updateAskStub, say: sayStub });
			
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves('/bin/bash');
			
			const errorOutput = 'npm ERR! Cannot find module \'package.json\'\nnpm ERR! enoent ENOENT';
		const mockShellExecution: any = {
			read: sandbox.stub().returns(
				(async function* () {
					yield errorOutput;
				})()
			),
		};
			
			const mockTerminal: any = {
				name: 'npm-1',
				processId: Promise.resolve(12345),
				shellIntegration: {
					executeCommand: sandbox.stub().resolves(mockShellExecution),
					cwd: vscode.Uri.file('/test'),
				},
				show: sandbox.stub(),
			};
			
			sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
		sandbox.stub(vscode.window, 'onDidEndTerminalShellExecution').callsFake((callback) => {
			setTimeout(() => callback({ 
				execution: mockShellExecution, 
				exitCode: 1,
				terminal: mockTerminal,
				shellIntegration: mockTerminal.shellIntegration
			}), 10);
			return { dispose: () => {} };
		});
			
			const result = await tool.execute();
			
		// 验证错误处理
		assert.strictEqual(result.status, 'success', 'Should return success status (command executed)');
		assert.ok(result.text && result.text.includes('<exit_code>1</exit_code>'), 'Should show exit code 1');
		assert.ok(result.text && result.text.includes('<error_type>'), 'Should identify error type');
		assert.ok(result.text && result.text.includes('<suggestion>'), 'Should provide suggestion');
		assert.ok(result.text && result.text.includes('<related_commands>'), 'Should provide related commands');
		});
		
	 it('拒绝流程：用户拒绝 → 返回rejected状态', async () => {
			const askStub = sandbox.stub().resolves({ response: 'messageResponse' }); // 不是 yesButtonTapped
			const updateAskStub = sandbox.stub().resolves();
			
			const tool = createTerminalTool({
				command: 'rm -rf /',
			}, { ask: askStub, updateAsk: updateAskStub });
			
			const result = await tool.execute();
			
			assert.ok(askStub.called, 'Should ask for approval');
			assert.strictEqual(result.status, 'rejected', 'Should return rejected status');
			assert.ok(updateAskStub.called, 'Should update to rejected state');
			
			const finalUpdate = updateAskStub.lastCall.args[1].tool;
			assert.strictEqual(finalUpdate.approvalState, 'rejected', 'Should set rejected state');
		});
	});
	
	describe('2. Shell Integration 检测流程', () => {
	 it('检测流程：等待Shell Integration → 成功检测 → 缓存', async () => {
			const tool = createTerminalTool({
				command: 'echo test',
			});
			
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves('/bin/bash');
			
			let shellIntegrationEventFired = false;
		const mockShellExecution: any = {
			read: sandbox.stub().returns(
				(async function* () {
					yield 'test\n';
				})()
			),
		};
			
			const mockTerminal: any = {
				name: 'test',
				processId: Promise.resolve(123),
				shellIntegration: undefined, // 初始无 shell integration
				show: sandbox.stub(),
			};
			
			sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
			
			// 模拟 Shell Integration 激活事件
			sandbox.stub(vscode.window, 'onDidChangeTerminalShellIntegration').callsFake((callback) => {
				setTimeout(() => {
					shellIntegrationEventFired = true;
					mockTerminal.shellIntegration = {
						executeCommand: sandbox.stub().resolves(mockShellExecution),
						cwd: vscode.Uri.file('/test'),
					};
					callback({
						terminal: mockTerminal,
						shellIntegration: mockTerminal.shellIntegration,
					});
				}, 100);
				return { dispose: () => {} };
			});
			
		sandbox.stub(vscode.window, 'onDidEndTerminalShellExecution').callsFake((callback) => {
			setTimeout(() => callback({ 
				execution: mockShellExecution, 
				exitCode: 0,
				terminal: mockTerminal,
				shellIntegration: mockTerminal.shellIntegration
			}), 200);
			return { dispose: () => {} };
		});
			
			const result = await tool.execute();
			
			assert.ok(shellIntegrationEventFired, 'Should wait for shell integration event');
			assert.strictEqual(result.status, 'success', 'Should succeed with shell integration');
			
			// 验证缓存
			const cache = (TerminalTool as any).shellIntegrationCache;
			const cacheKey = 'bash-/bin/bash';
			assert.ok(cache.has(cacheKey), 'Should cache shell integration support');
			assert.strictEqual(cache.get(cacheKey).supported, true, 'Should cache as supported');
		});
		
	 it('检测流程：等待超时 → 使用Fallback → 缓存为不支持', async () => {
			const sayStub = sandbox.stub().resolves();
			const tool = createTerminalTool({
				command: 'echo test',
			}, { say: sayStub });
			
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('cmd');
			sandbox.stub(tool as any, 'getShellPath').resolves('C:\\Windows\\System32\\cmd.exe');
			
			const mockTerminal: any = {
				name: 'test',
				processId: Promise.resolve(123),
				shellIntegration: undefined, // 一直没有 shell integration
				sendText: sandbox.stub(),
				show: sandbox.stub(),
			};
			
			sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
			
			// 模拟超时（3秒内没有触发事件）
			sandbox.stub(vscode.window, 'onDidChangeTerminalShellIntegration').callsFake((callback) => {
				// 不触发回调，让其超时
				return { dispose: () => {} };
			});
			
			const result = await tool.execute();
			
			assert.ok(mockTerminal.sendText.called, 'Should use fallback sendText');
			assert.ok(sayStub.called, 'Should notify user about fallback mode');
			
			// 验证缓存
			const cache = (TerminalTool as any).shellIntegrationCache;
			const cacheKey = 'cmd-C:\\Windows\\System32\\cmd.exe';
			assert.ok(cache.has(cacheKey), 'Should cache shell integration status');
			assert.strictEqual(cache.get(cacheKey).supported, false, 'Should cache as not supported');
		});
		
	 it('缓存流程：第二次执行直接使用缓存（跳过等待）', async () => {
			const tool1 = createTerminalTool({ command: 'echo first' });
			const tool2 = createTerminalTool({ command: 'echo second' });
			
			sandbox.stub(tool1 as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool1 as any, 'getShellPath').resolves('/bin/bash');
			sandbox.stub(tool2 as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool2 as any, 'getShellPath').resolves('/bin/bash');
			
			// 预设缓存（不支持 Shell Integration）
			const cache = (TerminalTool as any).shellIntegrationCache;
			cache.set('bash-/bin/bash', {
				supported: false,
				lastChecked: new Date(),
				shell: 'bash'
			});
			
			const mockTerminal: any = {
				name: 'test',
				processId: Promise.resolve(123),
				shellIntegration: undefined,
				sendText: sandbox.stub(),
				show: sandbox.stub(),
			};
			
			sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
			
			const startTime = Date.now();
			await tool2.execute();
			const executionTime = Date.now() - startTime;
			
			// 应该立即使用fallback，不等待3秒
			assert.ok(executionTime < 1000, 'Should skip waiting when cache indicates no support');
			assert.ok(mockTerminal.sendText.called, 'Should use fallback immediately');
		});
	});
	
	describe('3. 多终端管理', () => {
	 it('应该能并发跟踪多个终端的状态', async () => {
			const tool = createTerminalTool();
			
			// 创建多个终端状态
			const terminals = [
				{ name: 'dev-server', status: 'running' as const, command: 'npm run dev' },
				{ name: 'test-runner', status: 'completed' as const, command: 'npm test' },
				{ name: 'build-process', status: 'error' as const, command: 'npm run build' },
				{ name: 'idle-terminal', status: 'idle' as const, command: undefined },
			];
			
			terminals.forEach(({ name, status, command }) => {
				(tool as any).registerTerminalState(name, status, command, status === 'error' ? 1 : 0);
			});
			
			// Mock vscode terminals
			const mockTerminals = terminals.map(({ name }, index) => ({
				name,
				processId: Promise.resolve(1000 + index),
			}));
			
			sandbox.stub(vscode.window, 'terminals').value(mockTerminals);
			
			const result = await (tool as any).listAllTerminals();
			
		// 验证所有终端都被列出
		assert.ok(result.text && result.text.includes('<total_count>4</total_count>'), 'Should list all terminals');
		terminals.forEach(({ name, status }) => {
			assert.ok(result.text && result.text.includes(`<name>${name}</name>`), `Should list ${name}`);
			assert.ok(result.text && result.text.includes(`<status>${status}</status>`), `Should show status ${status}`);
		});
		});
		
	 it('应该能复用现有终端', async () => {
			const existingTerminal: any = {
				name: 'reusable-terminal',
				processId: Promise.resolve(5555),
				shellIntegration: {
				executeCommand: sandbox.stub().resolves({
					read: () => (async function* () {
						yield 'reused output\n';
					})(),
					commandLine: { value: 'echo test', isTrusted: true, confidence: 2 },
					cwd: vscode.Uri.file('/test')
				}),
					cwd: vscode.Uri.file('/test'),
				},
				show: sandbox.stub(),
			};
			
			sandbox.stub(vscode.window, 'terminals').value([existingTerminal]);
			const createTerminalSpy = sandbox.stub(vscode.window, 'createTerminal');
			
			const tool = createTerminalTool({
				command: 'echo test',
				terminalName: 'reusable-terminal',
				shouldReuseTerminal: true,
			});
			
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves('/bin/bash');
			
			sandbox.stub(vscode.window, 'onDidEndTerminalShellExecution').callsFake((callback) => {
				setTimeout(() => callback({ 
					execution: { 
						read: () => (async function* () {})(),
						commandLine: { value: 'echo test', isTrusted: true, confidence: 2 },
						cwd: vscode.Uri.file('/test')
					}, 
					exitCode: 0,
					terminal: existingTerminal,
					shellIntegration: existingTerminal.shellIntegration
				}), 10);
				return { dispose: () => {} };
			});
			
			await tool.execute();
			
			// 不应该创建新终端
			assert.ok(!createTerminalSpy.called, 'Should not create new terminal');
			assert.ok(existingTerminal.shellIntegration.executeCommand.called, 'Should use existing terminal');
		});
		
	 it('应该在终端不存在时创建新终端（即使设置了复用）', async () => {
			sandbox.stub(vscode.window, 'terminals').value([]); // 没有现有终端
			
			const mockTerminal: any = {
				name: 'new-terminal',
				processId: Promise.resolve(6666),
				shellIntegration: undefined,
				sendText: sandbox.stub(),
				show: sandbox.stub(),
			};
			
			const createTerminalStub = sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
			
			const tool = createTerminalTool({
				command: 'echo test',
				terminalName: 'non-existent-terminal',
				shouldReuseTerminal: true, // 尝试复用
			});
			
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves('/bin/bash');
			
			// 设置缓存避免等待
			const cache = (TerminalTool as any).shellIntegrationCache;
			cache.set('bash-/bin/bash', {
				supported: false,
				lastChecked: new Date(),
				shell: 'bash'
			});
			
			await tool.execute();
			
			// 应该创建新终端
			assert.ok(createTerminalStub.called, 'Should create new terminal when reuse target not found');
		});
	});
	
	describe('4. 自动清理机制', () => {
	 it('应该在终端自动关闭时清理状态', () => {
			const tool = createTerminalTool();
			
			// 注册状态
			(tool as any).registerTerminalState('temp-term', 'running', 'test', undefined);
			
			const registry = (TerminalTool as any).terminalStateRegistry;
			assert.ok(registry.has('temp-term'), 'Should have registered state');
			
			// 模拟终端关闭事件（手动清理，实际会通过 onDidCloseTerminal）
			registry.delete('temp-term');
			
			assert.ok(!registry.has('temp-term'), 'Should clean up state');
		});
		
	 it('应该清理过期的缓存条目', () => {
			const cache = (TerminalTool as any).shellIntegrationCache;
			const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
			
			// 添加新鲜的缓存
			cache.set('fresh-shell', {
				supported: true,
				lastChecked: new Date(),
				shell: 'bash'
			});
			
			// 添加过期的缓存
			cache.set('stale-shell', {
				supported: false,
				lastChecked: new Date(Date.now() - CACHE_TTL_MS - 1000),
				shell: 'cmd'
			});
			
			// 验证过期状态
			const freshCache = cache.get('fresh-shell');
			const staleCache = cache.get('stale-shell');
			
			const freshAge = Date.now() - freshCache.lastChecked.getTime();
			const staleAge = Date.now() - staleCache.lastChecked.getTime();
			
			assert.ok(freshAge < CACHE_TTL_MS, 'Fresh cache should not be expired');
			assert.ok(staleAge > CACHE_TTL_MS, 'Stale cache should be expired');
		});
	});
	
	describe('5. 完整的错误恢复流程', () => {
	 it('Shell 检测失败 → 提供可用 Shell 列表 → 错误恢复', async () => {
			const askStub = sandbox.stub().resolves({ response: 'yesButtonTapped' });
			const updateAskStub = sandbox.stub().resolves();
			const sayStub = sandbox.stub().resolves();
			
			const tool = createTerminalTool({
				command: 'echo test',
				shell: 'invalid-shell',
			}, { ask: askStub, updateAsk: updateAskStub, say: sayStub });
			
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('invalid-shell');
			sandbox.stub(tool as any, 'getShellPath').resolves(null); // Shell 不可用
			sandbox.stub(tool as any, 'getAvailableShells').resolves(['bash', 'sh', 'zsh']);
			
			const result = await tool.execute();
			
		// 验证错误处理
		assert.strictEqual(result.status, 'error', 'Should return error status');
		assert.ok(result.text && result.text.includes('invalid-shell'), 'Should mention invalid shell');
		assert.ok(result.text && result.text.includes('bash'), 'Should list available shells');
			
			// 验证用户收到通知
			assert.ok(sayStub.called, 'Should notify user');
			const sayMessage = sayStub.firstCall.args[1];
			assert.ok(sayMessage.includes('bash'), 'Notification should include available shells');
			
			// 验证状态更新为 error
			const errorUpdate = updateAskStub.getCalls().find(
				call => call.args[1].tool.approvalState === 'error'
			);
			assert.ok(errorUpdate, 'Should update to error state');
		});
	});
	
	// Helper function
	function createTerminalTool(
		inputParams: any = {}, 
		overrideParams: any = {}
	): TerminalTool {
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
			...overrideParams,
		};
		
		return new (TerminalTool as any)(
			defaultParams,
			'/test/cwd',
			'test-api-conversation-history',
			Date.now()
		);
	}
});


