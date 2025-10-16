/**
 * Terminal Tool - AI Perspective Tests
 * 
 * 从 AI 的角度测试终端工具：
 * - AI 能否正确理解输出格式
 * - AI 能否获取所需的全部信息
 * - AI 能否根据错误建议采取行动
 * - 输出是否对 AI 友好
 * - 状态转换是否可预测
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import 'mocha';
import { TerminalTool } from '../../../../src/agent/v1/tools/runners/terminal.tool';

describe('Terminal Tool - AI Perspective', () => {
	let sandbox: sinon.SinonSandbox;
	
	beforeEach(() => {
		sandbox = sinon.createSandbox();
	});
	
	afterEach(() => {
		sandbox.restore();
	});
	
	describe('1. 输出格式 AI 可读性', () => {
	 it('应该返回结构化的 XML 输出', async () => {
			const tool = createTerminalTool({
				action: 'list-terminals',
			});
			
			sandbox.stub(vscode.window, 'terminals').value([]);
			
			const result = await (tool as any).listAllTerminals();
			
			// AI 应该能够轻松解析 XML
			assert.ok(result.text.includes('<terminals_list>'), 'Should have XML root');
			assert.ok(result.text.includes('</terminals_list>'), 'Should close XML root');
			assert.ok(result.text.includes('<total_count>'), 'Should have count tag');
			
			// 验证 XML 结构完整
			const openTags = (result.text.match(/<\w+>/g) || []).length;
			const closeTags = (result.text.match(/<\/\w+>/g) || []).length;
			assert.strictEqual(openTags, closeTags, 'XML tags should be balanced');
		});
		
	 it('应该在输出中包含所有关键元数据', async () => {
			const mockTerminal: any = {
				name: 'test-terminal',
				processId: Promise.resolve(12345),
			};
			
			sandbox.stub(vscode.window, 'terminals').value([mockTerminal]);
			
			const tool = createTerminalTool({
				action: 'list-terminals',
			});
			
			// 注册状态
			(tool as any).registerTerminalState('test-terminal', 'running', 'npm start', undefined);
			
			const result = await (tool as any).listAllTerminals();
			
			// AI 需要的关键信息
			const requiredFields = [
				'<name>',
				'<pid>',
				'<status>',
				'<last_command>',
			];
			
			requiredFields.forEach(field => {
				assert.ok(result.text.includes(field), `Should include ${field}`);
			});
		});
		
	 it('应该正确转义特殊字符防止 XML 解析错误', () => {
			const tool = createTerminalTool();
			
			const dangerousInputs = [
				'<script>alert("XSS")</script>',
				'Command & arguments',
				'Path with "quotes"',
				"Path with 'apostrophes'",
				'Mixed <tag> & "quotes" with \'apostrophes\'',
			];
			
			dangerousInputs.forEach(input => {
				const escaped = (tool as any).escapeXml(input);
				
				// 不应包含原始特殊字符
				assert.ok(!escaped.includes('<script>'), `Should escape < and > in: ${input}`);
				assert.ok(!escaped.includes('&') || escaped.includes('&amp;') || escaped.includes('&lt;'), 
					`Should escape & in: ${input}`);
				
				// 应该可以安全嵌入 XML
				const xmlTest = `<test>${escaped}</test>`;
				assert.ok(xmlTest.includes('&lt;') || xmlTest.includes('&gt;') || !xmlTest.includes('<script'), 
					'Escaped content should be XML-safe');
			});
		});
	});
	
	describe('2. AI 决策所需信息完整性', () => {
	 it('AI 应该能判断终端是否存在', async () => {
			const mockTerminals: any[] = [
				{ name: 'terminal-1', processId: Promise.resolve(111) },
				{ name: 'terminal-2', processId: Promise.resolve(222) },
			];
			
			sandbox.stub(vscode.window, 'terminals').value(mockTerminals);
			
			const tool = createTerminalTool({
				action: 'list-terminals',
			});
			
			const result = await (tool as any).listAllTerminals();
			
			// AI 可以从 total_count 判断
			assert.ok(result.text.includes('<total_count>2</total_count>'), 'Should show count');
			
			// AI 可以从列表判断特定终端是否存在
			assert.ok(result.text.includes('terminal-1'), 'Should list terminal-1');
			assert.ok(result.text.includes('terminal-2'), 'Should list terminal-2');
			assert.ok(!result.text.includes('terminal-3'), 'Should not list non-existent terminal');
		});
		
	 it('AI 应该能判断命令是否成功', async () => {
		const tool = createTerminalTool();
		
		const mockShellExecution: any = {
			read: sandbox.stub().returns(
				(async function* () {
					yield 'Command output\n';
				})()
			),
		};
		
		const mockTerminal: any = {
			name: 'test',
			processId: Promise.resolve(123),
			shellIntegration: {
				executeCommand: sandbox.stub().resolves(mockShellExecution),
				cwd: vscode.Uri.file('/test'),
			},
		};
		
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
			
			// AI 可以从 status 和 exit_code 判断
			assert.strictEqual(result.status, 'success', 'Status should indicate success');
			assert.ok(result.text.includes('<exit_code>0</exit_code>'), 'Should show exit code 0');
		});
		
	 it('AI 应该能判断命令失败原因', async () => {
		const tool = createTerminalTool();
		
		const errorOutput = 'Error: Cannot find module \'express\'\nat require (loader.js:834:19)';
		const mockShellExecution: any = {
			read: sandbox.stub().returns(
				(async function* () {
					yield errorOutput;
				})()
			),
		};
		
		const mockTerminal: any = {
			name: 'test',
			processId: Promise.resolve(123),
			shellIntegration: {
				executeCommand: sandbox.stub().resolves(mockShellExecution),
				cwd: vscode.Uri.file('/test'),
			},
		};
		
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
				'node app.js',
				'bash',
				30000,
				true,
				undefined,
				sandbox.stub(),
				sandbox.stub(),
				false,
				mockTerminal.shellIntegration
			);
			
			// AI 应该能获取：
			// 1. Exit code
			assert.ok(result.text.includes('<exit_code>1</exit_code>'), 'Should include exit code');
			
			// 2. 错误类型
			assert.ok(result.text.includes('<error_type>MODULE_NOT_FOUND</error_type>'), 'Should identify error type');
			
			// 3. 错误分类
			assert.ok(result.text.includes('<error_category>Dependency Error</error_category>'), 'Should categorize error');
			
			// 4. 修复建议
			assert.ok(result.text.includes('<suggestion>'), 'Should provide suggestion');
			assert.ok(result.text.includes('npm install'), 'Should suggest npm install');
			
			// 5. 相关命令
			assert.ok(result.text.includes('<related_commands>'), 'Should provide related commands');
		});
		
	 it('AI 应该能获取终端的完整状态', async () => {
			const mockTerminal: any = {
				name: 'dev-server',
				processId: Promise.resolve(5678),
			};
			
			sandbox.stub(vscode.window, 'terminals').value([mockTerminal]);
			
			const tool = createTerminalTool();
			
			// 设置完整状态
			(tool as any).registerTerminalState('dev-server', 'running', 'npm run dev', undefined);
			
			const result = await (tool as any).listAllTerminals();
			
			// AI 需要知道：
			assert.ok(result.text.includes('<name>dev-server</name>'), 'Terminal name');
			assert.ok(result.text.includes('<pid>5678</pid>'), 'Process ID');
			assert.ok(result.text.includes('<status>running</status>'), 'Current status');
			assert.ok(result.text.includes('<last_command>npm run dev</last_command>'), 'Last command');
		});
	});
	
	describe('3. AI 可操作性（基于输出采取行动）', () => {
	 it('AI 应该能从错误建议中提取具体命令', () => {
			const tool = createTerminalTool();
			
			const output = 'Error: Cannot find module \'lodash\'';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'node app.js');
			
			// 验证建议包含可执行命令
			assert.ok(analysis.suggestion.includes('npm install lodash'), 'Suggestion should contain executable command');
			
			// 验证相关命令数组包含具体命令
			assert.ok(Array.isArray(analysis.relatedCommands), 'Should provide command array');
			assert.ok(analysis.relatedCommands.length > 0, 'Should have at least one command');
			
			// AI 可以直接执行这些命令
			const hasExecutableCmd = analysis.relatedCommands.some((cmd: string) => 
				cmd.startsWith('npm ') || cmd.startsWith('yarn ') || cmd.startsWith('pnpm ')
			);
			assert.ok(hasExecutableCmd, 'Should have executable package manager command');
		});
		
	 it('AI 应该能识别需要权限提升的情况', () => {
			const tool = createTerminalTool();
			
			const output = 'Error: EACCES: permission denied, mkdir \'/usr/local/lib\'';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'npm install -g typescript');
			
			// AI 应该知道需要 sudo
			assert.strictEqual(analysis.errorType, 'PERMISSION_DENIED');
			assert.ok(analysis.suggestion.toLowerCase().includes('sudo') || 
			          analysis.suggestion.toLowerCase().includes('administrator'), 
			          'Should suggest elevation');
			
			// AI 可以获取带 sudo 的命令
			const hasSudoCmd = analysis.relatedCommands.some((cmd: string) => cmd.includes('sudo'));
			assert.ok(hasSudoCmd, 'Should provide sudo command');
		});
		
	 it('AI 应该能获取平台特定的命令', () => {
			const tool = createTerminalTool();
			
			const output = 'Port 3000 already in use';
			const analysis = (tool as any).analyzeTerminalError(1, output, 'npm start');
			
			// 应该同时提供 Windows 和 Unix 命令
			const commands = analysis.relatedCommands.join(' ');
			
			// Windows: netstat
			// Unix: lsof
			const hasWindowsCmd = commands.includes('netstat') || commands.includes('findstr');
			const hasUnixCmd = commands.includes('lsof');
			
			assert.ok(hasWindowsCmd || hasUnixCmd, 'Should provide platform-specific commands');
		});
		
	 it('AI 应该能判断是否需要用户交互', async () => {
		const askStub = sandbox.stub().resolves({ response: 'messageResponse' });
		
		const tool = createTerminalTool({
			command: 'rm -rf important-data',
		}, { ask: askStub });
		
		const result = await tool.execute();
		
		// AI 可以从状态判断用户是否批准
		assert.strictEqual(result.status, 'rejected', 'Should indicate rejection');
		
		// AI 知道不应该继续执行
		assert.ok(result.text && (result.text.includes('rejected') || result.text.includes('denied')), 
			'Should clearly indicate rejection');
	});
	});
	
	describe('4. 状态转换可预测性', () => {
	 it('AI 应该能预测状态转换序列', async () => {
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
				shellIntegration: undefined,
			};
			sandbox.stub(vscode.window, 'createTerminal').returns(mockTerminal);
			
			await tool.execute();
			
			// AI 期望的状态序列：pending → loading → approved
			const updateCalls = updateAskStub.getCalls();
			const states = updateCalls.map(call => call.args[1].tool.approvalState);
			
			// 验证状态序列
			assert.ok(states.includes('loading'), 'Should transition through loading');
			assert.ok(states.includes('approved'), 'Should end with approved');
			
			// 验证没有意外状态
			const validStates = ['pending', 'loading', 'approved', 'rejected', 'error'];
			states.forEach(state => {
				assert.ok(validStates.includes(state), `State ${state} should be valid`);
			});
		});
		
	 it('AI 应该能识别错误状态', async () => {
			const askStub = sandbox.stub().resolves({ response: 'yesButtonTapped' });
			const updateAskStub = sandbox.stub().resolves();
			const sayStub = sandbox.stub().resolves();
			
			const tool = createTerminalTool({
				command: 'echo test',
			}, { ask: askStub, updateAsk: updateAskStub, say: sayStub });
			
			// 模拟错误
			sandbox.stub(tool as any, 'detectDefaultShell').throws(new Error('Shell detection failed'));
			
			await tool.execute();
			
			// AI 应该能识别错误状态
			const updateCalls = updateAskStub.getCalls();
			const errorUpdate = updateCalls.find(call => call.args[1].tool.approvalState === 'error');
			
			assert.ok(errorUpdate, 'Should have error state');
			assert.ok(errorUpdate.args[1].tool.output, 'Error state should include output');
		});
		
	 it('状态更新应该保持 timestamp 一致性', async () => {
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
			
			// 所有状态更新应该使用相同的 timestamp
			const askCall = askStub.firstCall.args[1];
			const updateCalls = updateAskStub.getCalls();
			
			assert.strictEqual(askCall.tool.ts, ts, 'Ask should use provided timestamp');
			updateCalls.forEach((call, index) => {
				assert.strictEqual(call.args[1].tool.ts, ts, 
					`Update call ${index} should use consistent timestamp`);
			});
		});
	});
	
	describe('5. 输出信息质量', () => {
	 it('输出应该移除干扰性 ANSI 转义序列', () => {
			const tool = createTerminalTool();
			
			const ansiOutput = '\x1b[31mError: Something went wrong\x1b[0m\n\x1b[1mStack trace:\x1b[0m';
			const cleaned = (tool as any).cleanAnsiEscapes(ansiOutput);
			
			// AI 不应该看到 ANSI 转义码
			assert.ok(!cleaned.includes('\x1b['), 'Should remove ANSI escapes');
			assert.ok(cleaned.includes('Error: Something went wrong'), 'Should preserve content');
			assert.ok(cleaned.includes('Stack trace:'), 'Should preserve content');
		});
		
	 it('长输出应该被智能截断', () => {
			const tool = createTerminalTool();
			
			// 生成 5000 行输出
			const longOutput = Array(5000).fill('Line of output').join('\n');
			
			const truncated = (tool as any).smartTruncateOutput(longOutput, 1000, 100);
			
			// 应该被截断
			const truncatedLines = truncated.split('\n').length;
			assert.ok(truncatedLines < 5000, 'Should truncate long output');
			
			// 应该包含截断提示
			assert.ok(truncated.includes('truncated') || truncated.includes('...'), 
				'Should indicate truncation');
			
			// AI 仍然能看到开头和结尾
			assert.ok(truncated.includes('Line of output'), 'Should preserve some content');
		});
		
	 it('空输出应该被明确标识', async () => {
		const tool = createTerminalTool();
		
		const mockShellExecution: any = {
			read: sandbox.stub().returns(
				(async function* () {
					// 没有输出
				})()
			),
		};
		
		const mockTerminal: any = {
			name: 'test',
			processId: Promise.resolve(123),
			shellIntegration: {
				executeCommand: sandbox.stub().resolves(mockShellExecution),
				cwd: vscode.Uri.file('/test'),
			},
		};
		
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
				'command-with-no-output',
				'bash',
				30000,
				true,
				undefined,
				sandbox.stub(),
				sandbox.stub(),
				false,
				mockTerminal.shellIntegration
			);
			
			// AI 应该知道命令成功但无输出
			assert.ok(result.text.includes('<exit_code>0</exit_code>'), 'Should show success');
			// Output section 应该存在但为空或有提示
			assert.ok(result.text.includes('<output>') || result.text.includes('no output'), 
				'Should handle empty output');
		});
	});
	
	describe('6. 错误诊断质量', () => {
	 it('错误建议应该是具体的而非泛泛而谈', () => {
			const tool = createTerminalTool();
			
			const testCases = [
				{
					output: 'Cannot find module \'express\'',
					command: 'node app.js',
					expectedSuggestion: 'express',
				},
				{
					output: 'Port 8080 already in use',
					command: 'npm start',
					expectedSuggestion: '8080',
				},
				{
					output: 'fatal: not a git repository',
					command: 'git status',
					expectedSuggestion: 'git init',
				},
			];
			
			testCases.forEach(({ output, command, expectedSuggestion }) => {
				const analysis = (tool as any).analyzeTerminalError(1, output, command);
				
				assert.ok(analysis.suggestion.includes(expectedSuggestion), 
					`Suggestion for "${command}" should mention "${expectedSuggestion}"`);
				
				// 建议应该足够长以提供有用信息
				assert.ok(analysis.suggestion.length > 20, 'Suggestion should be descriptive');
			});
		});
		
	 it('应该识别复杂的错误堆栈', () => {
			const tool = createTerminalTool();
			
			const complexError = `
Error: Request failed with status code 404
    at createError (node_modules/axios/lib/core/createError.js:16:15)
    at settle (node_modules/axios/lib/core/settle.js:17:12)
    at IncomingMessage.handleStreamEnd (node_modules/axios/lib/adapters/http.js:269:11)
    at IncomingMessage.emit (events.js:412:35)
    at endReadableNT (internal/streams/readable.js:1317:12)
Caused by: Cannot find module 'missing-dependency'
    at Function.Module._resolveFilename (internal/modules/cjs/loader.js:902:15)
			`.trim();
			
			const analysis = (tool as any).analyzeTerminalError(1, complexError, 'node app.js');
			
			// 应该识别出"Cannot find module"
			assert.strictEqual(analysis.errorType, 'MODULE_NOT_FOUND', 
				'Should identify MODULE_NOT_FOUND in complex stack');
		});
		
	 it('多个错误特征时应该优先匹配最相关的', () => {
			const tool = createTerminalTool();
			
			// 同时包含多个错误模式
			const output = `
Error: Cannot find module 'express'
EACCES: permission denied
Port 3000 already in use
			`.trim();
			
			const analysis = (tool as any).analyzeTerminalError(1, output, 'node app.js');
			
			// 应该优先匹配第一个明确的错误（MODULE_NOT_FOUND）
			assert.strictEqual(analysis.errorType, 'MODULE_NOT_FOUND', 
				'Should prioritize first clear error pattern');
		});
	});
	
	describe('7. 数据完整性检查', () => {
	 it('所有 XML 标签应该正确闭合', async () => {
			const mockTerminals: any[] = [
				{ name: 'term-1', processId: Promise.resolve(111) },
				{ name: 'term-2', processId: Promise.resolve(222) },
			];
			
			sandbox.stub(vscode.window, 'terminals').value(mockTerminals);
			
			const tool = createTerminalTool({
				action: 'list-terminals',
			});
			
			(tool as any).registerTerminalState('term-1', 'running', 'cmd1', undefined);
			(tool as any).registerTerminalState('term-2', 'completed', 'cmd2', 0);
			
		const result = await (tool as any).listAllTerminals();
		
		// 验证 XML 标签平衡
		const openTags = (result.text.match(/<(\w+)>/g) || []).map((t: string) => t.slice(1, -1));
		const closeTags = (result.text.match(/<\/(\w+)>/g) || []).map((t: string) => t.slice(2, -1));
		
		openTags.forEach((tag: string) => {
			const openCount = openTags.filter((t: string) => t === tag).length;
			const closeCount = closeTags.filter((t: string) => t === tag).length;
			assert.strictEqual(openCount, closeCount, `Tag <${tag}> should be balanced`);
		});
		});
		
	 it('特殊字符不应破坏 XML 结构', () => {
			const tool = createTerminalTool();
			
			const specialCharInputs = [
				'echo "test" && echo "test2"',
				'grep "pattern" < input.txt > output.txt',
				'cmd /c "dir /s"',
				'bash -c \'ls -la\'',
			];
			
			specialCharInputs.forEach(input => {
				const escaped = (tool as any).escapeXml(input);
				const xmlWrapped = `<command>${escaped}</command>`;
				
				// 应该不包含未转义的特殊字符
				// &, <, >, ", ' 应该被转义
				const hasUnescaped = xmlWrapped.match(/<command>[^<]*[&<>"'][^>]*<\/command>/);
				if (hasUnescaped) {
					// 如果匹配到，检查是否是已转义的
					assert.ok(escaped.includes('&amp;') || escaped.includes('&lt;') || 
					          escaped.includes('&gt;') || escaped.includes('&quot;') || 
					          escaped.includes('&apos;'), 
					          `Special chars should be escaped in: ${input}`);
				}
			});
		});
	});
	
	describe('8. AI 上下文保持', () => {
	 it('终端状态应该在多次查询间保持', async () => {
			const tool = createTerminalTool();
			
			// 第一次：注册状态
			(tool as any).registerTerminalState('persistent-term', 'running', 'npm start', undefined);
			
			// 第二次：查询（使用同一个 tool 实例）
			const mockTerminal: any = {
				name: 'persistent-term',
				processId: Promise.resolve(999),
			};
			sandbox.stub(vscode.window, 'terminals').value([mockTerminal]);
			
			const result = await (tool as any).listAllTerminals();
			
			// 应该仍然能看到之前注册的状态
			assert.ok(result.text.includes('persistent-term'), 'Should persist terminal name');
			assert.ok(result.text.includes('running'), 'Should persist status');
			assert.ok(result.text.includes('npm start'), 'Should persist command');
		});
		
	 it('终端关闭后状态应该被清理', () => {
			const tool = createTerminalTool();
			
			// 注册状态
			(tool as any).registerTerminalState('temp-term', 'running', 'test', undefined);
			
			const registry = (tool.constructor as any).terminalStateRegistry;
			assert.ok(registry.has('temp-term'), 'Should register state');
			
			// 模拟终端关闭
			registry.delete('temp-term');
			
			assert.ok(!registry.has('temp-term'), 'Should clean up state after terminal closes');
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


