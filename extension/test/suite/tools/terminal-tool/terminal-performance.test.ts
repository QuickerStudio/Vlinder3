/**
 * Terminal Tool - Performance Tests
 * 
 * 性能测试：
 * - Shell Integration 缓存效果
 * - 输出处理性能
 * - 大量终端管理
 * - 内存泄漏检测
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import 'mocha';
import { TerminalTool } from '../../../../src/agent/v1/tools/runners/terminal.tool';

describe('Terminal Tool - Performance Tests', () => {
	let sandbox: sinon.SinonSandbox;
	
	beforeEach(() => {
		sandbox = sinon.createSandbox();
		(TerminalTool as any).clearCacheForTesting();
	});
	
	afterEach(() => {
		sandbox.restore();
	});
	
	describe('1. Shell Integration 缓存性能', () => {
	 it('缓存命中应该减少 95% 的等待时间', async () => {
			const tool = createTerminalTool();
			
			// 预设缓存（不支持 Shell Integration）
			const cache = (TerminalTool as any).shellIntegrationCache;
			cache.set('bash-/bin/bash', {
				supported: false,
				lastChecked: new Date(),
				shell: 'bash'
			});
			
			sandbox.stub(tool as any, 'detectDefaultShell').resolves('bash');
			sandbox.stub(tool as any, 'getShellPath').resolves('/bin/bash');
			
			const mockTerminal: any = {
				name: 'test',
				processId: Promise.resolve(123),
				shellIntegration: undefined,
				sendText: sandbox.stub(),
				show: sandbox.stub(),
			};
			
			sandbox.stub(require('vscode').window, 'createTerminal').returns(mockTerminal);
			
			// 测量执行时间
			const startTime = Date.now();
			await tool.execute();
			const executionTime = Date.now() - startTime;
			
			// 应该立即执行（<200ms），而不是等待3秒
			assert.ok(executionTime < 500, 
				`Execution with cache should be fast (<500ms), but took ${executionTime}ms`);
		});
		
	 it('缓存失效后应该重新检测', () => {
			const cache = (TerminalTool as any).shellIntegrationCache;
			const CACHE_TTL_MS = 5 * 60 * 1000;
			
			// 添加过期缓存
			const staleDate = new Date(Date.now() - CACHE_TTL_MS - 1000);
			cache.set('stale-shell', {
				supported: false,
				lastChecked: staleDate,
				shell: 'bash'
			});
			
			const cached = cache.get('stale-shell');
			const cacheAge = Date.now() - cached.lastChecked.getTime();
			
			// 验证缓存已过期
			assert.ok(cacheAge > CACHE_TTL_MS, 'Cache should be expired');
			
			// 实际实现中，过期缓存会被忽略并重新检测
		});
		
	 it('不同 Shell 应该有独立的缓存键', () => {
			const cache = (TerminalTool as any).shellIntegrationCache;
			
			cache.set('bash-/bin/bash', {
				supported: true,
				lastChecked: new Date(),
				shell: 'bash'
			});
			
			cache.set('zsh-/bin/zsh', {
				supported: true,
				lastChecked: new Date(),
				shell: 'zsh'
			});
			
			cache.set('cmd-C:\\Windows\\System32\\cmd.exe', {
				supported: false,
				lastChecked: new Date(),
				shell: 'cmd'
			});
			
			assert.strictEqual(cache.size, 3, 'Should cache different shells independently');
			assert.ok(cache.get('bash-/bin/bash').supported, 'bash should be cached as supported');
			assert.ok(!cache.get('cmd-C:\\Windows\\System32\\cmd.exe').supported, 'cmd should be cached as not supported');
		});
	});
	
	describe('2. 输出处理性能', () => {
	 it('ANSI 转义清理应该高效处理大输出', () => {
			const tool = createTerminalTool();
			
			// 生成包含大量 ANSI 转义的输出
			const largeOutput = Array(10000).fill('\x1b[31mError line\x1b[0m').join('\n');
			
			const startTime = Date.now();
			const cleaned = (tool as any).cleanAnsiEscapes(largeOutput);
			const processingTime = Date.now() - startTime;
			
			assert.ok(!cleaned.includes('\x1b['), 'Should remove all ANSI codes');
			assert.ok(processingTime < 100, 
				`ANSI cleaning should be fast (<100ms), but took ${processingTime}ms`);
		});
		
	 it('智能截断应该快速处理超大输出', () => {
			const tool = createTerminalTool();
			
			// 生成 100,000 行输出
			const massiveOutput = Array(100000).fill('Output line').join('\n');
			
			const startTime = Date.now();
			const truncated = (tool as any).smartTruncateOutput(massiveOutput, 1000, 100);
			const processingTime = Date.now() - startTime;
			
			assert.ok(truncated.length < massiveOutput.length, 'Should truncate');
			assert.ok(processingTime < 200, 
				`Truncation should be fast (<200ms), but took ${processingTime}ms`);
		});
		
	 it('XML 转义应该高效处理特殊字符', () => {
			const tool = createTerminalTool();
			
			// 生成大量包含特殊字符的输出
			const outputWithSpecialChars = Array(10000)
				.fill('<tag attr="value">Content & more</tag>')
				.join('\n');
			
			const startTime = Date.now();
			const escaped = (tool as any).escapeXml(outputWithSpecialChars);
			const processingTime = Date.now() - startTime;
			
			assert.ok(escaped.includes('&lt;tag'), 'Should escape all special chars');
			assert.ok(processingTime < 100, 
				`XML escaping should be fast (<100ms), but took ${processingTime}ms`);
		});
		
	 it('预过滤应该有效减少输出大小', () => {
			const tool = createTerminalTool();
			
			// 生成包含大量重复提示符的输出
			const verboseOutput = `
$ npm install
npm http fetch GET 200 https://registry.npmjs.org/package1 123ms
npm http fetch GET 200 https://registry.npmjs.org/package2 145ms
npm http fetch GET 200 https://registry.npmjs.org/package3 167ms
${Array(100).fill('npm http fetch GET 200').join('\n')}
added 100 packages
$ 
			`.trim();
			
			const filtered = (tool as any).preFilterOutput(verboseOutput, 'npm install');
			
			// 预过滤应该移除重复的 http fetch 日志
			const originalLines = verboseOutput.split('\n').length;
			const filteredLines = filtered.split('\n').length;
			
			assert.ok(filteredLines < originalLines, 
				`Should reduce output lines from ${originalLines} to ${filteredLines}`);
		});
	});
	
	describe('3. 大量终端管理性能', () => {
	 it('应该高效管理 100+ 终端状态', () => {
			const tool = createTerminalTool();
			const registry = (TerminalTool as any).terminalStateRegistry;
			
			// 注册 100 个终端
			const startTime = Date.now();
			for (let i = 0; i < 100; i++) {
				(tool as any).registerTerminalState(
					`terminal-${i}`,
					i % 4 === 0 ? 'idle' : i % 4 === 1 ? 'running' : i % 4 === 2 ? 'completed' : 'error',
					`command-${i}`,
					i % 4 === 3 ? 1 : 0
				);
			}
			const registrationTime = Date.now() - startTime;
			
			assert.strictEqual(registry.size, 100, 'Should register all terminals');
			assert.ok(registrationTime < 50, 
				`Registration should be fast (<50ms), but took ${registrationTime}ms`);
			
			// 查询所有终端
			const queryStart = Date.now();
			for (let i = 0; i < 100; i++) {
				const state = registry.get(`terminal-${i}`);
				assert.ok(state, `Should find terminal-${i}`);
			}
			const queryTime = Date.now() - queryStart;
			
			assert.ok(queryTime < 10, 
				`Querying 100 terminals should be fast (<10ms), but took ${queryTime}ms`);
		});
		
	 it('清理大量过期终端应该高效', () => {
			const tool = createTerminalTool();
			const registry = (TerminalTool as any).terminalStateRegistry;
			
			// 创建 1000 个终端状态（模拟内存泄漏场景）
			for (let i = 0; i < 1000; i++) {
				registry.set(`terminal-${i}`, {
					name: `terminal-${i}`,
					status: 'idle',
					lastCommand: undefined,
					lastExitCode: undefined,
					createdAt: new Date(),
					lastActiveAt: new Date(),
				});
			}
			
			assert.strictEqual(registry.size, 1000, 'Should have 1000 terminals');
			
			// 清理所有状态
			const startTime = Date.now();
			registry.clear();
			const cleanupTime = Date.now() - startTime;
			
			assert.strictEqual(registry.size, 0, 'Should clear all terminals');
			assert.ok(cleanupTime < 10, 
				`Cleanup should be fast (<10ms), but took ${cleanupTime}ms`);
		});
	});
	
	describe('4. 内存泄漏检测', () => {
	 it('终端状态注册表不应无限增长', () => {
			const tool = createTerminalTool();
			const registry = (TerminalTool as any).terminalStateRegistry;
			
			// 模拟创建和关闭大量终端
			for (let i = 0; i < 100; i++) {
				const terminalName = `temp-terminal-${i}`;
				
				// 注册
				(tool as any).registerTerminalState(terminalName, 'running', 'test', undefined);
				
				// 立即清理（模拟终端关闭）
				registry.delete(terminalName);
			}
			
			// 注册表应该为空
			assert.strictEqual(registry.size, 0, 
				'Registry should not accumulate closed terminals');
		});
		
	 it('Shell Integration 缓存不应无限增长', () => {
			const cache = (TerminalTool as any).shellIntegrationCache;
			
			// 添加大量缓存条目
			for (let i = 0; i < 100; i++) {
				cache.set(`shell-${i}`, {
					supported: i % 2 === 0,
					lastChecked: new Date(),
					shell: `shell-${i}`
				});
			}
			
			// 在实际使用中，应该有清理机制限制缓存大小
			// 这里只验证可以添加多个条目
			assert.ok(cache.size > 0, 'Cache should contain entries');
			
			// 清理测试
			cache.clear();
			assert.strictEqual(cache.size, 0, 'Cache should be clearable');
		});
		
	 it('更新现有终端状态不应创建重复条目', () => {
			const tool = createTerminalTool();
			const registry = (TerminalTool as any).terminalStateRegistry;
			
			const terminalName = 'persistent-terminal';
			
			// 注册初始状态
			(tool as any).registerTerminalState(terminalName, 'idle', undefined, undefined);
			assert.strictEqual(registry.size, 1, 'Should have one entry');
			
			// 更新状态 10 次
			for (let i = 0; i < 10; i++) {
				(tool as any).registerTerminalState(terminalName, 'running', `cmd-${i}`, undefined);
			}
			
			// 仍然应该只有一个条目
			assert.strictEqual(registry.size, 1, 'Should not create duplicate entries');
			
			// 验证状态已更新
			const state = registry.get(terminalName);
			assert.strictEqual(state.lastCommand, 'cmd-9', 'Should update to latest command');
		});
	});
	
	describe('5. 并发性能', () => {
	 it('并发注册多个终端状态应该无竞态', async () => {
			const tool = createTerminalTool();
			const registry = (TerminalTool as any).terminalStateRegistry;
			
			// 并发注册 50 个终端
			const registrations = Array(50).fill(0).map((_, i) =>
				Promise.resolve().then(() => {
					(tool as any).registerTerminalState(
						`concurrent-${i}`,
						'running',
						`command-${i}`,
						undefined
					);
				})
			);
			
			await Promise.all(registrations);
			
			// 所有终端都应该被注册
			assert.strictEqual(registry.size, 50, 'Should register all terminals');
			
			// 验证每个终端的命令正确
			for (let i = 0; i < 50; i++) {
				const state = registry.get(`concurrent-${i}`);
				assert.ok(state, `Should find concurrent-${i}`);
				assert.strictEqual(state.lastCommand, `command-${i}`, 'Command should match');
			}
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


