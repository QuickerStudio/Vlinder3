/**
 * Terminal Tool - Core Functionality Tests
 * 
 * 测试终端工具的核心功能：
 * - 终端ID生成和唯一性
 * - Process ID (PID) 跟踪
 * - 终端创建和管理
 * - 终端列表和查找
 * - 状态注册表
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import 'mocha';
import { TerminalTool } from '../../../../src/agent/v1/tools/runners/terminal.tool';
import { ToolResponseV2 } from '../../../../src/agent/v1/types';

describe('Terminal Tool - Core Functionality', () => {
	let sandbox: sinon.SinonSandbox;
	let mockTerminal: sinon.SinonStubbedInstance<vscode.Terminal>;
	let terminalTool: TerminalTool;
	
	beforeEach(() => {
		sandbox = sinon.createSandbox();
		
		// 清理静态缓存和注册表
		(TerminalTool as any).clearCacheForTesting();
		
		// 创建模拟终端
		mockTerminal = {
			name: 'test-terminal-1',
			processId: Promise.resolve(12345),
			exitStatus: undefined,
			state: { isInteractedWith: false },
			creationOptions: {},
			sendText: sandbox.stub(),
			show: sandbox.stub(),
			hide: sandbox.stub(),
			dispose: sandbox.stub(),
		} as any;
	});
	
	afterEach(() => {
		sandbox.restore();
	});
	
	describe('1. Terminal ID Generation', () => {
		it('应该生成唯一的终端ID', () => {
			// 使用反射访问私有方法（测试目的）
			const tool1 = createTerminalTool();
			const tool2 = createTerminalTool();
			
			const name1 = (tool1 as any).generateSemanticTerminalName('npm install', 'bash', '/test/project');
			const name2 = (tool2 as any).generateSemanticTerminalName('npm install', 'bash', '/test/project');
			
			assert.notStrictEqual(name1, name2, 'Terminal names should be unique');
		});
		
		it('应该基于命令生成语义化名称', () => {
			const tool = createTerminalTool();
			
			const name = (tool as any).generateSemanticTerminalName('npm install', 'bash', '/test/project');
			
			assert.ok(name.startsWith('npm'), 'Name should start with command');
			assert.ok(/\d+$/.test(name), 'Name should end with counter');
		});
		
		it('应该处理特殊字符的命令', () => {
			const tool = createTerminalTool();
			
			const name = (tool as any).generateSemanticTerminalName('git status --short', 'zsh', '/test');
			
			assert.ok(name.startsWith('git'), 'Should extract first word as command');
			assert.ok(!name.includes(' '), 'Should not contain spaces');
		});
		
		it('应该在命令为空时使用项目名', () => {
			const tool = createTerminalTool();
			
			const name = (tool as any).generateSemanticTerminalName('', 'bash', '/test/my-project');
			
			assert.ok(name.includes('my-project'), 'Should include project name');
			assert.ok(name.includes('bash'), 'Should include shell name');
		});
		
		it('应该递增计数器', () => {
			const tool = createTerminalTool();
			
			const name1 = (tool as any).generateSemanticTerminalName('test', 'bash', '/test');
			const name2 = (tool as any).generateSemanticTerminalName('test', 'bash', '/test');
			const name3 = (tool as any).generateSemanticTerminalName('test', 'bash', '/test');
			
			const counter1 = parseInt(name1.match(/\d+$/)?.[0] || '0');
			const counter2 = parseInt(name2.match(/\d+$/)?.[0] || '0');
			const counter3 = parseInt(name3.match(/\d+$/)?.[0] || '0');
			
			assert.ok(counter2 > counter1, 'Counter should increment');
			assert.ok(counter3 > counter2, 'Counter should keep incrementing');
		});
	});
	
	describe('2. Process ID (PID) Tracking', () => {
		it('应该能获取终端的PID', async () => {
			sandbox.stub(vscode.window, 'terminals').value([mockTerminal]);
			
			const tool = createTerminalTool();
			const result = await (tool as any).listAllTerminals();
			
			assert.ok(result.text.includes('12345'), 'Should include PID in output');
		});
		
		it('应该处理PID未定义的情况', async () => {
			const terminalNoPid = {
				...mockTerminal,
				processId: Promise.resolve(undefined),
			};
			sandbox.stub(vscode.window, 'terminals').value([terminalNoPid]);
			
			const tool = createTerminalTool();
			const result = await (tool as any).listAllTerminals();
			
			assert.ok(result.text.includes('unknown'), 'Should handle undefined PID');
		});
		
		it('应该跟踪多个终端的PID', async () => {
			const terminal1 = { ...mockTerminal, name: 'term-1', processId: Promise.resolve(111) };
			const terminal2 = { ...mockTerminal, name: 'term-2', processId: Promise.resolve(222) };
			const terminal3 = { ...mockTerminal, name: 'term-3', processId: Promise.resolve(333) };
			
			sandbox.stub(vscode.window, 'terminals').value([terminal1, terminal2, terminal3]);
			
			const tool = createTerminalTool();
			const result = await (tool as any).listAllTerminals();
			
			assert.ok(result.text.includes('111'), 'Should include first PID');
			assert.ok(result.text.includes('222'), 'Should include second PID');
			assert.ok(result.text.includes('333'), 'Should include third PID');
		});
	});
	
	describe('3. Terminal Creation and Management', () => {
		it('应该能创建新终端', async () => {
			// 创建带 sendText 的终端 mock
			const mockTerminalForTest = {
				...mockTerminal,
				sendText: sandbox.stub(),
				show: sandbox.stub(),
			};
			
			const createTerminalStub = sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminalForTest as any);
			
			const askStub = sandbox.stub().resolves({ response: 'yesButtonTapped' });
			const updateAskStub = sandbox.stub().resolves();
			const sayStub = sandbox.stub().resolves();
			
			const tool = createTerminalTool({
				command: 'echo test',
				shell: 'bash',
			}, { ask: askStub, updateAsk: updateAskStub, say: sayStub });
			
			// 模拟shell路径检测
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves('/bin/bash');
			
			// 设置缓存避免等待Shell Integration，直接使用 fallback
			const cache = (TerminalTool as any).shellIntegrationCache;
			cache.set('bash-/bin/bash', {
				supported: false,
				lastChecked: new Date(),
				shell: 'bash'
			});
			
			await tool.execute();
			
			// 验证 createTerminal 被调用
			assert.ok(createTerminalStub.called, 'Should create terminal');
			// 验证 sendText 被调用（fallback 模式）
			assert.ok(mockTerminalForTest.sendText.called, 'Should send command to terminal');
		});
		
		it('应该能复用已存在的终端', async () => {
			const existingTerminal = { ...mockTerminal, name: 'reusable-term' };
			sandbox.stub(vscode.window, 'terminals').value([existingTerminal]);
			sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal as any);
			
			const tool = createTerminalTool({
				command: 'echo test',
				terminalName: 'reusable-term',
				shouldReuseTerminal: true,
			});
			
			const foundTerminal = (tool as any).findExistingTerminal('reusable-term');
			
			assert.strictEqual(foundTerminal, existingTerminal, 'Should find existing terminal');
		});
		
		it('应该在终端不存在时返回undefined', () => {
			sandbox.stub(vscode.window, 'terminals').value([mockTerminal]);
			
			const tool = createTerminalTool();
			const foundTerminal = (tool as any).findExistingTerminal('non-existent');
			
			assert.strictEqual(foundTerminal, undefined, 'Should return undefined for non-existent terminal');
		});
		
		it('应该能配置终端选项', async () => {
			const createTerminalStub = sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal as any);
			
			const tool = createTerminalTool({
				command: 'test',
				shell: 'bash',
				workingDirectory: '/test/dir',
				terminalIcon: 'terminal',
				terminalColor: 'terminal.ansiBlue',
			});
			
			const askStub = sandbox.stub().resolves({ response: 'yesButtonTapped' });
			(tool as any).params.ask = askStub;
			(tool as any).params.updateAsk = sandbox.stub().resolves();
			(tool as any).params.say = sandbox.stub().resolves();
			
			// 模拟shell路径检测
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
			
			assert.ok(createTerminalStub.called, 'Should call createTerminal');
			// Note: terminal options structure may vary by VSCode version
		});
	});
	
	describe('4. Terminal List and Search', () => {
		it('应该列出所有终端', async () => {
			const terminals = [
				{ ...mockTerminal, name: 'term-1', processId: Promise.resolve(111) },
				{ ...mockTerminal, name: 'term-2', processId: Promise.resolve(222) },
			];
			sandbox.stub(vscode.window, 'terminals').value(terminals);
			
			const tool = createTerminalTool({
				action: 'list-terminals',
			});
			
			const result = await (tool as any).listAllTerminals();
			
			assert.strictEqual(result.status, 'success', 'Should return success');
			assert.ok(result.text.includes('<total_count>2</total_count>'), 'Should include count');
			assert.ok(result.text.includes('term-1'), 'Should list first terminal');
			assert.ok(result.text.includes('term-2'), 'Should list second terminal');
		});
		
		it('应该返回空列表当没有终端时', async () => {
			sandbox.stub(vscode.window, 'terminals').value([]);
			
			const tool = createTerminalTool({
				action: 'list-terminals',
			});
			
			const result = await (tool as any).listAllTerminals();
			
			assert.ok(result.text.includes('<total_count>0</total_count>'), 'Should show zero count');
		});
		
		it('应该包含终端状态信息', async () => {
			const terminal = { ...mockTerminal, name: 'status-term', processId: Promise.resolve(999) };
			sandbox.stub(vscode.window, 'terminals').value([terminal]);
			
			const tool = createTerminalTool();
			
			// 先注册状态
			(tool as any).registerTerminalState('status-term', 'running', 'npm start', undefined);
			
			const result = await (tool as any).listAllTerminals();
			
			assert.ok(result.text.includes('<status>running</status>'), 'Should include status');
			assert.ok(result.text.includes('<last_command>npm start</last_command>'), 'Should include last command');
		});
	});
	
	describe('5. State Registry', () => {
		it('应该能注册终端状态', () => {
			const tool = createTerminalTool();
			
			(tool as any).registerTerminalState('test-term', 'running', 'echo hello', undefined);
			
			// 验证状态已注册（通过列表检查）
			const registry = (tool.constructor as any).terminalStateRegistry;
			assert.ok(registry.has('test-term'), 'Should register terminal state');
		});
		
		it('应该更新已存在终端的状态', () => {
			const tool = createTerminalTool();
			
			(tool as any).registerTerminalState('test-term', 'running', 'cmd1', undefined);
			(tool as any).registerTerminalState('test-term', 'completed', 'cmd1', 0);
			
			const registry = (tool.constructor as any).terminalStateRegistry;
			const state = registry.get('test-term');
			
			assert.strictEqual(state.status, 'completed', 'Should update status');
			assert.strictEqual(state.lastExitCode, 0, 'Should update exit code');
		});
		
		it('应该追踪多个终端状态', () => {
			const tool = createTerminalTool();
			
			(tool as any).registerTerminalState('term-1', 'running', 'cmd1', undefined);
			(tool as any).registerTerminalState('term-2', 'idle', undefined, undefined);
			(tool as any).registerTerminalState('term-3', 'error', 'cmd3', 1);
			
			const registry = (tool.constructor as any).terminalStateRegistry;
			
			assert.strictEqual(registry.size, 3, 'Should track multiple terminals');
			assert.strictEqual(registry.get('term-1').status, 'running');
			assert.strictEqual(registry.get('term-2').status, 'idle');
			assert.strictEqual(registry.get('term-3').status, 'error');
			assert.strictEqual(registry.get('term-3').lastExitCode, 1);
		});
		
		it('应该保留创建时间但更新活动时间', (done) => {
			const tool = createTerminalTool();
			
			(tool as any).registerTerminalState('test-term', 'running', 'cmd1', undefined);
			const registry = (tool.constructor as any).terminalStateRegistry;
			const firstState = registry.get('test-term');
			const createdAt = firstState.createdAt;
			
			setTimeout(() => {
				(tool as any).registerTerminalState('test-term', 'completed', 'cmd1', 0);
				const updatedState = registry.get('test-term');
				
				assert.strictEqual(updatedState.createdAt.getTime(), createdAt.getTime(), 'createdAt should not change');
				assert.ok(updatedState.lastActiveAt > createdAt, 'lastActiveAt should be updated');
				done();
			}, 10);
		});
		
		it('应该处理所有状态类型', () => {
			const tool = createTerminalTool();
			const statuses: Array<'idle' | 'running' | 'completed' | 'error'> = ['idle', 'running', 'completed', 'error'];
			
			statuses.forEach((status, index) => {
				(tool as any).registerTerminalState(`term-${index}`, status, 'test', undefined);
			});
			
			const registry = (tool.constructor as any).terminalStateRegistry;
			
			statuses.forEach((status, index) => {
				const state = registry.get(`term-${index}`);
				assert.strictEqual(state.status, status, `Should handle ${status} status`);
			});
		});
	});
	
	describe('6. XML Output Formatting', () => {
		it('应该正确转义XML特殊字符', () => {
			const tool = createTerminalTool();
			
			const input = '<tag>value & "quotes" \'apostrophe\'</tag>';
			const escaped = (tool as any).escapeXml(input);
			
			assert.ok(!escaped.includes('<tag>'), 'Should escape < and >');
			assert.ok(escaped.includes('&amp;'), 'Should escape &');
			assert.ok(escaped.includes('&quot;'), 'Should escape "');
			assert.ok(escaped.includes('&apos;'), 'Should escape \'');
		});
		
		it('应该生成有效的XML结构', async () => {
			sandbox.stub(vscode.window, 'terminals').value([mockTerminal]);
			
			const tool = createTerminalTool({
				action: 'list-terminals',
			});
			
			const result = await (tool as any).listAllTerminals();
			
			// 验证XML结构
			assert.ok(result.text.includes('<terminals_list>'), 'Should have root element');
			assert.ok(result.text.includes('</terminals_list>'), 'Should close root element');
			assert.ok(result.text.includes('<terminal>'), 'Should have terminal elements');
			assert.ok(result.text.includes('</terminal>'), 'Should close terminal elements');
		});
	});
	
	// Helper function to create terminal tool instance
	function createTerminalTool(inputParams: any = {}, overrideParams: any = {}): TerminalTool {
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
			1234567890
		);
	}
});


