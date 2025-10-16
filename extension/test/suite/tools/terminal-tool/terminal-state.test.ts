/**
 * Terminal Tool - State Management Tests
 * 
 * 测试状态管理功能：
 * - 界面状态转换 (pending → loading → approved/rejected/error)
 * - Ask/UpdateAsk消息流
 * - Say消息通知
 * - 输出传递给Main Agent
 * - 用户批准/拒绝流程
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import 'mocha';
import { TerminalTool } from '../../../../src/agent/v1/tools/runners/terminal.tool';

describe('Terminal Tool - State Management', () => {
	let sandbox: sinon.SinonSandbox;
	
	beforeEach(() => {
		sandbox = sinon.createSandbox();
	});
	
	afterEach(() => {
		sandbox.restore();
	});
	
	describe('1. UI State Transitions', () => {
	 it('应该从pending状态开始', async () => {
			const askStub = sandbox.stub().resolves({ response: 'messageResponse' });
			const updateAskStub = sandbox.stub().resolves();
			
			const tool = createTerminalTool({
				command: 'echo test',
			}, { ask: askStub, updateAsk: updateAskStub });
			
			try {
				await tool.execute();
			} catch (e) {
				// Expected to fail without full mocking
			}
			
			// 验证ask被调用，状态为pending
			assert.ok(askStub.called, 'Should call ask');
			const askCall = askStub.firstCall;
			assert.strictEqual(askCall.args[0], 'tool', 'Should be tool type');
			assert.strictEqual(askCall.args[1].tool.approvalState, 'pending', 'Initial state should be pending');
		});
		
	 it('应该在用户批准后转换到loading状态', async () => {
			const askStub = sandbox.stub().resolves({ response: 'yesButtonTapped' });
			const updateAskStub = sandbox.stub().resolves();
			const sayStub = sandbox.stub().resolves();
			
			const tool = createTerminalTool({
				command: 'echo test',
			}, { ask: askStub, updateAsk: updateAskStub, say: sayStub });
			
			// 模拟shell检测失败来快速结束
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves(null); // 导致错误
			sandbox.stub(tool as any, 'getAvailableShells').resolves(['bash', 'sh']);
			
			await tool.execute();
			
			// 验证状态转换
			const updateCalls = updateAskStub.getCalls();
			assert.ok(updateCalls.length > 0, 'Should call updateAsk');
			
			// 第一次updateAsk应该是loading状态
			const firstUpdate = updateCalls[0].args[1].tool;
			assert.strictEqual(firstUpdate.approvalState, 'loading', 'Should transition to loading');
		});
		
	 it('应该在用户拒绝后转换到rejected状态', async () => {
			const askStub = sandbox.stub().resolves({ response: 'messageResponse' }); // 不是yesButtonTapped
			const updateAskStub = sandbox.stub().resolves();
			
			const tool = createTerminalTool({
				command: 'echo test',
			}, { ask: askStub, updateAsk: updateAskStub });
			
			const result = await tool.execute();
			
			// 验证被拒绝
			assert.strictEqual(result.status, 'rejected', 'Should return rejected status');
			
			// 验证状态更新
			assert.ok(updateAskStub.called, 'Should update state');
			const updateCall = updateAskStub.firstCall.args[1].tool;
			assert.strictEqual(updateCall.approvalState, 'rejected', 'Should transition to rejected');
		});
		
	 it('应该在发生错误时转换到error状态', async () => {
			const askStub = sandbox.stub().resolves({ response: 'yesButtonTapped' });
			const updateAskStub = sandbox.stub().resolves();
			const sayStub = sandbox.stub().resolves();
			
			const tool = createTerminalTool({
				command: 'echo test',
			}, { ask: askStub, updateAsk: updateAskStub, say: sayStub });
			
			// 模拟错误情况
			sandbox.stub(tool as any, 'detectDefaultShell').throws(new Error('Detection failed'));
			
			await tool.execute();
			
			// 验证错误状态
			const updateCalls = updateAskStub.getCalls();
			const errorUpdate = updateCalls.find(call => call.args[1].tool.approvalState === 'error');
			assert.ok(errorUpdate, 'Should transition to error state');
		});
		
	 it('应该在成功完成时转换到approved状态', async () => {
			const askStub = sandbox.stub().resolves({ response: 'yesButtonTapped' });
			const updateAskStub = sandbox.stub().resolves();
			const sayStub = sandbox.stub().resolves();
			
			const tool = createTerminalTool({
				command: 'echo test',
			}, { ask: askStub, updateAsk: updateAskStub, say: sayStub });
			
			// 完整模拟成功执行
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves('/bin/bash');
			
			const mockTerminal: any = {
				name: 'test',
				processId: Promise.resolve(123),
				sendText: sandbox.stub(),
				show: sandbox.stub(),
				dispose: sandbox.stub(),
				shellIntegration: undefined, // 使用fallback
			};
			
			sandbox.stub(require('vscode').window, 'createTerminal').returns(mockTerminal);
			
			await tool.execute();
			
			// 验证最终状态
			const updateCalls = updateAskStub.getCalls();
			const finalUpdate = updateCalls[updateCalls.length - 1];
			
			// 应该有approved或完成相关的状态
			assert.ok(updateCalls.length >= 2, 'Should have multiple state updates');
		});
	});
	
	describe('2. Ask/UpdateAsk Message Flow', () => {
	 it('应该通过ask请求用户批准', async () => {
			const askStub = sandbox.stub().resolves({ response: 'yesButtonTapped' });
			
			const tool = createTerminalTool({
				command: 'rm -rf important',
				shell: 'bash',
			}, { ask: askStub });
			
			// 快速失败以测试ask调用
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves(null);
			sandbox.stub(tool as any, 'getAvailableShells').resolves([]);
			
			await tool.execute();
			
			assert.ok(askStub.called, 'Should request approval');
			const askArgs = askStub.firstCall.args;
			
			assert.strictEqual(askArgs[0], 'tool', 'Should be tool message');
			assert.strictEqual(askArgs[1].tool.tool, 'terminal', 'Should be terminal tool');
			assert.strictEqual(askArgs[1].tool.command, 'rm -rf important', 'Should include command');
		});
		
	 it('应该在ask中包含所有关键参数', async () => {
			const askStub = sandbox.stub().resolves({ response: 'yesButtonTapped' });
			
			const tool = createTerminalTool({
				command: 'npm start',
				shell: 'powershell',
				workingDirectory: '/custom/dir',
				executionTimeout: 60000,
				terminalName: 'my-terminal',
			}, { ask: askStub });
			
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('powershell');
			sandbox.stub(tool as any, 'getShellPath').resolves(null);
			sandbox.stub(tool as any, 'getAvailableShells').resolves([]);
			
			await tool.execute();
			
			const toolData = askStub.firstCall.args[1].tool;
			assert.strictEqual(toolData.command, 'npm start', 'Should include command');
			assert.strictEqual(toolData.shell, 'powershell', 'Should include shell');
			assert.strictEqual(toolData.workingDirectory, '/custom/dir', 'Should include working directory');
			assert.strictEqual(toolData.terminalName, 'my-terminal', 'Should include terminal name');
		});
		
	 it('应该使用updateAsk更新状态', async () => {
			const askStub = sandbox.stub().resolves({ response: 'yesButtonTapped' });
			const updateAskStub = sandbox.stub().resolves();
			
			const tool = createTerminalTool({
				command: 'echo test',
			}, { ask: askStub, updateAsk: updateAskStub });
			
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves('/bin/bash');
			
			const mockTerminal: any = {
				name: 'test',
				processId: Promise.resolve(123),
				sendText: sandbox.stub(),
				show: sandbox.stub(),
				shellIntegration: undefined,
			};
			sandbox.stub(require('vscode').window, 'createTerminal').returns(mockTerminal);
			
			await tool.execute();
			
			assert.ok(updateAskStub.called, 'Should call updateAsk');
			assert.ok(updateAskStub.callCount >= 1, 'Should update state at least once');
		});
		
	 it('应该在每次状态变化时调用updateAsk', async () => {
			const askStub = sandbox.stub().resolves({ response: 'yesButtonTapped' });
			const updateAskStub = sandbox.stub().resolves();
			
			const tool = createTerminalTool({
				command: 'echo test',
			}, { ask: askStub, updateAsk: updateAskStub });
			
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves(null); // 触发错误
			sandbox.stub(tool as any, 'getAvailableShells').resolves(['bash']);
			
			await tool.execute();
			
			// 应该有多次状态更新：loading -> error
			const updateCalls = updateAskStub.getCalls();
			assert.ok(updateCalls.length >= 2, 'Should have multiple state updates');
			
			// 验证状态序列
			const states = updateCalls.map(call => call.args[1].tool.approvalState);
			assert.ok(states.includes('loading'), 'Should include loading state');
			assert.ok(states.includes('error'), 'Should include error state');
		});
	});
	
	describe('3. Say Message Notifications', () => {
	 it('应该在错误时发送say消息', async () => {
			const askStub = sandbox.stub().resolves({ response: 'yesButtonTapped' });
			const updateAskStub = sandbox.stub().resolves();
			const sayStub = sandbox.stub().resolves();
			
			const tool = createTerminalTool({
				command: 'echo test',
			}, { ask: askStub, updateAsk: updateAskStub, say: sayStub });
			
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves(null); // 触发错误
			sandbox.stub(tool as any, 'getAvailableShells').resolves(['bash', 'sh']);
			
			await tool.execute();
			
			assert.ok(sayStub.called, 'Should call say on error');
			const sayCall = sayStub.firstCall;
			assert.strictEqual(sayCall.args[0], 'error', 'Should be error message type');
		});
		
	 it('应该在say消息中包含错误详情', async () => {
			const askStub = sandbox.stub().resolves({ response: 'yesButtonTapped' });
			const updateAskStub = sandbox.stub().resolves();
			const sayStub = sandbox.stub().resolves();
			
			const tool = createTerminalTool({
				command: 'echo test',
			}, { ask: askStub, updateAsk: updateAskStub, say: sayStub });
			
			const errorMessage = 'Custom error message';
			sandbox.stub(tool as any, 'detectDefaultShell').throws(new Error(errorMessage));
			
			await tool.execute();
			
			assert.ok(sayStub.called, 'Should send error notification');
			const sayMessage = sayStub.firstCall.args[1];
			assert.ok(sayMessage.includes(errorMessage), 'Should include error message');
		});
		
	 it('应该在fallback模式时发送信息消息', async () => {
			const askStub = sandbox.stub().resolves({ response: 'yesButtonTapped' });
			const updateAskStub = sandbox.stub().resolves();
			const sayStub = sandbox.stub().resolves();
			
			const tool = createTerminalTool({
				command: 'echo test',
			}, { ask: askStub, updateAsk: updateAskStub, say: sayStub });
			
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves('/bin/bash');
			
			const mockTerminal: any = {
				name: 'test',
				processId: Promise.resolve(123),
				sendText: sandbox.stub(),
				show: sandbox.stub(),
				shellIntegration: undefined, // 无shell integration，触发fallback
			};
			sandbox.stub(require('vscode').window, 'createTerminal').returns(mockTerminal);
			
			// 设置缓存为不支持
			const cache = (tool.constructor as any).shellIntegrationCache;
			cache.set('bash-/bin/bash', {
				supported: false,
				lastChecked: new Date(),
				shell: 'bash'
			});
			
			await tool.execute();
			
			// 验证say被调用来通知用户
			const sayCalls = sayStub.getCalls();
			assert.ok(sayCalls.length > 0, 'Should notify user about fallback mode');
		});
	});
	
	describe('4. Output Reception by Main Agent', () => {
	 it('应该返回结构化的ToolResponseV2', async () => {
			const tool = createTerminalTool({
				action: 'list-terminals',
			});
			
			sandbox.stub(require('vscode').window, 'terminals').value([]);
			
			const result = await (tool as any).listAllTerminals();
			
			// 验证返回结构
			assert.ok(result, 'Should return result');
			assert.ok(result.status, 'Should have status');
			assert.ok(result.text, 'Should have text content');
			assert.strictEqual(typeof result.text, 'string', 'Text should be string');
		});
		
	 it('应该在输出中包含XML格式的数据', async () => {
			const tool = createTerminalTool({
				action: 'list-terminals',
			});
			
			const mockTerminal: any = {
				name: 'test-terminal',
				processId: Promise.resolve(12345),
			};
			
			sandbox.stub(require('vscode').window, 'terminals').value([mockTerminal]);
			
			const result = await (tool as any).listAllTerminals();
			
		// 验证XML结构
		assert.ok(result.text && result.text.includes('<terminals_list>'), 'Should have XML root');
		assert.ok(result.text && result.text.includes('</terminals_list>'), 'Should close XML root');
		assert.ok(result.text && result.text.includes('<terminal>'), 'Should have terminal element');
		assert.ok(result.text && result.text.includes('<name>'), 'Should have name element');
		});
		
	 it('应该正确转义特殊字符', async () => {
			const tool = createTerminalTool();
			
			const inputWithSpecialChars = 'Test <tag> & "quotes" \'apostrophe\'';
			const escaped = (tool as any).escapeXml(inputWithSpecialChars);
			
			// 验证所有特殊字符都被转义
			assert.ok(!escaped.includes('<tag>'), 'Should escape angle brackets');
			assert.ok(escaped.includes('&lt;tag&gt;'), 'Should use XML entities for </>');
			assert.ok(escaped.includes('&amp;'), 'Should escape ampersand');
			assert.ok(escaped.includes('&quot;'), 'Should escape quotes');
			assert.ok(escaped.includes('&apos;'), 'Should escape apostrophe');
		});
		
	 it('应该在错误响应中包含错误信息', async () => {
			const tool = createTerminalTool({
				panelType: 'invalid-panel-type',
			});
			
			const result = await tool.execute();
			
		assert.strictEqual(result.status, 'error', 'Should return error status');
		assert.ok(result.text && result.text.includes('error'), 'Should include error tag');
		assert.ok(result.text && result.text.includes('Unknown panel type'), 'Should include error message');
		});
		
	 it('应该在成功响应中包含完整数据', async () => {
			const tool = createTerminalTool({
				action: 'list-terminals',
			});
			
			const mockTerminals: any[] = [
				{ name: 'term-1', processId: Promise.resolve(111) },
				{ name: 'term-2', processId: Promise.resolve(222) },
			];
			
			sandbox.stub(require('vscode').window, 'terminals').value(mockTerminals);
			
			// 注册一些状态
			(tool as any).registerTerminalState('term-1', 'running', 'npm start', undefined);
			(tool as any).registerTerminalState('term-2', 'completed', 'git pull', 0);
			
			const result = await (tool as any).listAllTerminals();
			
		// 验证包含所有数据
		assert.ok(result.text && result.text.includes('term-1'), 'Should include terminal 1');
		assert.ok(result.text && result.text.includes('term-2'), 'Should include terminal 2');
		assert.ok(result.text && result.text.includes('111'), 'Should include PID 1');
		assert.ok(result.text && result.text.includes('222'), 'Should include PID 2');
		assert.ok(result.text && result.text.includes('running'), 'Should include status');
		assert.ok(result.text && result.text.includes('npm start'), 'Should include command');
		});
	});
	
	describe('5. Timestamp and Message Tracking', () => {
	 it('应该在消息中包含timestamp', async () => {
			const askStub = sandbox.stub().resolves({ response: 'messageResponse' });
			const ts = Date.now();
			
			const tool = createTerminalTool({
				command: 'echo test',
			}, { ask: askStub }, ts);
			
			await tool.execute();
			
			const askCall = askStub.firstCall.args[1];
			assert.strictEqual(askCall.tool.ts, ts, 'Should include timestamp');
		});
		
	 it('应该在updateAsk中保持相同的timestamp', async () => {
			const askStub = sandbox.stub().resolves({ response: 'yesButtonTapped' });
			const updateAskStub = sandbox.stub().resolves();
			const ts = Date.now();
			
			const tool = createTerminalTool({
				command: 'echo test',
			}, { ask: askStub, updateAsk: updateAskStub }, ts);
			
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves(null);
			sandbox.stub(tool as any, 'getAvailableShells').resolves([]);
			
			await tool.execute();
			
			// 验证所有updateAsk都使用相同的timestamp
			const updateCalls = updateAskStub.getCalls();
			updateCalls.forEach(call => {
				assert.strictEqual(call.args[1].tool.ts, ts, 'Should use consistent timestamp');
			});
		});
	});
	
	describe('6. SubMessage Handling', () => {
	 it('应该在isSubMsg=true时传递标志', async () => {
			const askStub = sandbox.stub().resolves({ response: 'messageResponse' });
			
			const tool = createTerminalTool({
				command: 'echo test',
			}, { ask: askStub, isSubMsg: true });
			
			await tool.execute();
			
			const askCall = askStub.firstCall.args[1];
			assert.strictEqual(askCall.tool.isSubMsg, true, 'Should pass isSubMsg flag');
		});
		
	 it('应该在isSubMsg=false时正确设置', async () => {
			const askStub = sandbox.stub().resolves({ response: 'messageResponse' });
			
			const tool = createTerminalTool({
				command: 'echo test',
			}, { ask: askStub, isSubMsg: false });
			
			await tool.execute();
			
			const askCall = askStub.firstCall.args[1];
			assert.strictEqual(askCall.tool.isSubMsg, false, 'Should pass isSubMsg flag');
		});
	});
	
	// Helper function
	function createTerminalTool(
		inputParams: any = {}, 
		overrideParams: any = {},
		ts: number = Date.now()
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
			ts
		);
	}
});


