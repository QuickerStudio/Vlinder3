import * as assert from "assert"
import * as vscode from "vscode"
import * as sinon from "sinon"
import {
	TerminalRegistry,
	TerminalManager,
	TerminalInfo,
} from "../../../../src/integrations/terminal/terminal-manager"
import "mocha"

describe("TerminalRegistry Tests", () => {
	let terminalStub: any
	let createTerminalStub: sinon.SinonStub

	beforeEach(() => {
		// Clean up any existing stubs
		sinon.restore()

		// Create a mock terminal
		terminalStub = {
			sendText: sinon.stub(),
			show: sinon.stub(),
			hide: sinon.stub(),
			dispose: sinon.stub(),
			exitStatus: undefined,
			shellIntegration: undefined,
		}
	})

	afterEach(() => {
		// Clean up all terminals
		const terminals = TerminalRegistry.getAllTerminals()
		terminals.forEach((t) => TerminalRegistry.removeTerminal(t.id))
		
		// Restore stubs
		sinon.restore()
	})

	describe("createTerminal", () => {
		it("should create a terminal with default name", () => {
			sinon.stub(vscode.window, "createTerminal").returns(terminalStub as any)

			const terminalInfo = TerminalRegistry.createTerminal("/test/path")

			assert.ok(terminalInfo)
			assert.strictEqual(terminalInfo.busy, false)
			assert.strictEqual(terminalInfo.lastCommand, "")
			assert.ok(terminalInfo.id > 0)
		})

		it("should create a terminal with custom name", () => {
			sinon.stub(vscode.window, "createTerminal").returns(terminalStub as any)

			const terminalInfo = TerminalRegistry.createTerminal("/test/path", "Custom Terminal")

			assert.strictEqual(terminalInfo.name, "Custom Terminal")
		})

		it("should assign unique IDs to terminals", () => {
			sinon.stub(vscode.window, "createTerminal").returns(terminalStub as any)

			const terminal1 = TerminalRegistry.createTerminal("/test/path")
			const terminal2 = TerminalRegistry.createTerminal("/test/path")

			assert.notStrictEqual(terminal1.id, terminal2.id)
		})

		it("should initialize output tracking for new terminal", () => {
			sinon.stub(vscode.window, "createTerminal").returns(terminalStub as any)

			const terminalInfo = TerminalRegistry.createTerminal("/test/path")
			const logs = TerminalRegistry.getTerminalLogs(terminalInfo.id)

			assert.ok(Array.isArray(logs))
			assert.strictEqual(logs.length, 0)
		})
	})

	describe("getTerminal", () => {
		it("should retrieve terminal by ID", () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const created = TerminalRegistry.createTerminal("/test/path")
			const retrieved = TerminalRegistry.getTerminal(created.id)

			assert.ok(retrieved)
			assert.strictEqual(retrieved.id, created.id)

		})

		it("should return undefined for non-existent ID", () => {
			const retrieved = TerminalRegistry.getTerminal(99999)
			assert.strictEqual(retrieved, undefined)
		})

		it("should return undefined for closed terminal", () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const created = TerminalRegistry.createTerminal("/test/path")

			// Simulate terminal closure
			terminalStub.exitStatus = { code: 0 }

			const retrieved = TerminalRegistry.getTerminal(created.id)
			assert.strictEqual(retrieved, undefined)

		})
	})

	describe("getTerminalByName", () => {
		it("should retrieve terminal by name", () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			TerminalRegistry.createTerminal("/test/path", "MyTerminal")
			const retrieved = TerminalRegistry.getTerminalByName("MyTerminal")

			assert.ok(retrieved)
			assert.strictEqual(retrieved.name, "MyTerminal")

		})

		it("should return undefined for non-existent name", () => {
			const retrieved = TerminalRegistry.getTerminalByName("NonExistent")
			assert.strictEqual(retrieved, undefined)
		})
	})

	describe("updateTerminal", () => {
		it("should update terminal properties", () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminal = TerminalRegistry.createTerminal("/test/path")

			TerminalRegistry.updateTerminal(terminal.id, {
				busy: true,
				lastCommand: "test command",
			})

			const updated = TerminalRegistry.getTerminal(terminal.id)
			assert.ok(updated)
			assert.strictEqual(updated.busy, true)
			assert.strictEqual(updated.lastCommand, "test command")

		})
	})

	describe("closeTerminal", () => {
		it("should close terminal and remove from registry", () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminal = TerminalRegistry.createTerminal("/test/path")
			const closed = TerminalRegistry.closeTerminal(terminal.id)

			assert.strictEqual(closed, true)
			assert.ok(terminalStub.dispose.called)

			const retrieved = TerminalRegistry.getTerminal(terminal.id)
			assert.strictEqual(retrieved, undefined)

		})

		it("should return false for non-existent terminal", () => {
			const closed = TerminalRegistry.closeTerminal(99999)
			assert.strictEqual(closed, false)
		})
	})

	describe("addOutput", () => {
		it("should add output lines to terminal logs", () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminal = TerminalRegistry.createTerminal("/test/path")
			TerminalRegistry.addOutput(terminal.id, "Line 1\nLine 2\n")

			const logs = TerminalRegistry.getTerminalLogs(terminal.id)
			assert.ok(logs.length >= 2)

		})

		it("should buffer incomplete lines", () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminal = TerminalRegistry.createTerminal("/test/path")

			// Add partial line
			TerminalRegistry.addOutput(terminal.id, "Partial")
			let logs = TerminalRegistry.getTerminalLogs(terminal.id)
			assert.strictEqual(logs.length, 0)

			// Complete the line
			TerminalRegistry.addOutput(terminal.id, " line\n")
			logs = TerminalRegistry.getTerminalLogs(terminal.id)
			assert.ok(logs.length > 0)

		})

		it("should flush buffer when flush=true", () => {
			sinon.stub(vscode.window, "createTerminal").returns(terminalStub as any)

			const terminal = TerminalRegistry.createTerminal("/test/path")

			// Add output with newline to force flush
			TerminalRegistry.addOutput(terminal.id, "Complete line\n", true)
			const logs = TerminalRegistry.getTerminalLogs(terminal.id)
			assert.ok(logs.length >= 1)
			assert.ok(logs[0].includes("Complete"))
		})
	})

	describe("DevServer Management", () => {
		it("should add dev server", () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminal = TerminalRegistry.createTerminal("/test/path")
			TerminalRegistry.addDevServer(terminal, "http://localhost:3000")

			const devServer = TerminalRegistry.getDevServer(terminal.id)
			assert.ok(devServer)
			assert.strictEqual(devServer.url, "http://localhost:3000")
			assert.strictEqual(devServer.status, "starting")

		})

		it("should update dev server URL", () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminal = TerminalRegistry.createTerminal("/test/path")
			TerminalRegistry.addDevServer(terminal)
			TerminalRegistry.updateDevServerUrl(terminal.id, "http://localhost:4000")

			const devServer = TerminalRegistry.getDevServer(terminal.id)
			assert.ok(devServer)
			assert.strictEqual(devServer.url, "http://localhost:4000")
			assert.strictEqual(devServer.status, "running")

		})

		it("should update dev server status", () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminal = TerminalRegistry.createTerminal("/test/path")
			TerminalRegistry.addDevServer(terminal)
			TerminalRegistry.updateDevServerStatus(terminal.id, "error", "Connection failed")

			const devServer = TerminalRegistry.getDevServer(terminal.id)
			assert.ok(devServer)
			assert.strictEqual(devServer.status, "error")
			assert.strictEqual(devServer.error, "Connection failed")

		})

		it("should check if dev server is running", () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminal = TerminalRegistry.createTerminal("/test/path")
			TerminalRegistry.addDevServer(terminal)

			assert.strictEqual(TerminalRegistry.isDevServerRunning(terminal.id), false)

			TerminalRegistry.updateDevServerStatus(terminal.id, "running")
			assert.strictEqual(TerminalRegistry.isDevServerRunning(terminal.id), true)

		})

		it("should get dev server by name", () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminal = TerminalRegistry.createTerminal("/test/path", "MyDevServer")
			TerminalRegistry.addDevServer(terminal, "http://localhost:3000")

			const devServer = TerminalRegistry.getDevServerByName("MyDevServer")
			assert.ok(devServer)
			assert.strictEqual(devServer.url, "http://localhost:3000")

		})

		it("should clear all dev servers", () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminal1 = TerminalRegistry.createTerminal("/test/path")
			const terminal2 = TerminalRegistry.createTerminal("/test/path")
			TerminalRegistry.addDevServer(terminal1)
			TerminalRegistry.addDevServer(terminal2)

			TerminalRegistry.clearAllDevServers()

			const devServers = TerminalRegistry.getAllDevServers()
			assert.strictEqual(devServers.length, 0)

		})
	})

	describe("getAllTerminals", () => {
		it("should return all active terminals", () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminal1 = TerminalRegistry.createTerminal("/test/path")
			const terminal2 = TerminalRegistry.createTerminal("/test/path")

			const terminals = TerminalRegistry.getAllTerminals()
			assert.ok(terminals.length >= 2)

		})

		it("should filter out closed terminals", () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			TerminalRegistry.createTerminal("/test/path")

			// Simulate terminal closure
			terminalStub.exitStatus = { code: 0 }

			const terminals = TerminalRegistry.getAllTerminals()
			// The closed terminal should be filtered out
			assert.ok(terminals)

		})
	})
})

describe("TerminalManager Tests", () => {
	let manager: TerminalManager
	let terminalStub: any

	beforeEach(() => {
		// Clean up any existing stubs
		sinon.restore()
		
		manager = new TerminalManager()

		terminalStub = {
			sendText: sinon.stub(),
			show: sinon.stub(),
			hide: sinon.stub(),
			dispose: sinon.stub(),
			exitStatus: undefined,
			shellIntegration: undefined,
		}
	})

	afterEach(() => {
		manager.disposeAll()
		sinon.restore()
	})

	describe("getOrCreateTerminal", () => {
		it("should create new terminal when none exists", async () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminalInfo = await manager.getOrCreateTerminal("/test/cwd")

			assert.ok(terminalInfo)
			assert.strictEqual(terminalInfo.busy, false)
			assert.ok(createTerminalStub.called)

		})

		it("should reuse existing terminal with same cwd", async () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			terminalStub.shellIntegration = {
				cwd: vscode.Uri.file("/test/cwd"),
			}

			const terminal1 = await manager.getOrCreateTerminal("/test/cwd")
			const terminal2 = await manager.getOrCreateTerminal("/test/cwd")

			// Should reuse the same terminal
			assert.strictEqual(terminal1.id, terminal2.id)

		})

		it("should create new terminal for different cwd", async () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminal1 = await manager.getOrCreateTerminal("/test/cwd1")
			const terminal2 = await manager.getOrCreateTerminal("/test/cwd2")

			assert.notStrictEqual(terminal1.id, terminal2.id)

		})

		it("should not reuse busy terminal", async () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminal1 = await manager.getOrCreateTerminal("/test/cwd")
			TerminalRegistry.updateTerminal(terminal1.id, { busy: true })

			const terminal2 = await manager.getOrCreateTerminal("/test/cwd")

			assert.notStrictEqual(terminal1.id, terminal2.id)

		})

		it("should respect custom name parameter", async () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminal = await manager.getOrCreateTerminal("/test/cwd", "CustomName")

			assert.strictEqual(terminal.name, "CustomName")

		})
	})

	describe("getTerminals", () => {
		it("should return only busy terminals when busy=true", async () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminal1 = await manager.getOrCreateTerminal("/test/cwd1")
			const terminal2 = await manager.getOrCreateTerminal("/test/cwd2")

			TerminalRegistry.updateTerminal(terminal1.id, { busy: true })

			const busyTerminals = manager.getTerminals(true)
			assert.ok(busyTerminals.length > 0)
			assert.ok(busyTerminals.some((t) => t.id === terminal1.id))

		})

		it("should return only idle terminals when busy=false", async () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminal1 = await manager.getOrCreateTerminal("/test/cwd1")
			const terminal2 = await manager.getOrCreateTerminal("/test/cwd2")

			TerminalRegistry.updateTerminal(terminal1.id, { busy: true })

			const idleTerminals = manager.getTerminals(false)
			assert.ok(idleTerminals.length > 0)
			assert.ok(idleTerminals.some((t) => t.id === terminal2.id))

		})
	})

	describe("closeTerminal", () => {
		it("should close terminal by ID", async () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			const terminal = await manager.getOrCreateTerminal("/test/cwd")
			const closed = manager.closeTerminal(terminal.id)

			assert.strictEqual(closed, true)
			assert.ok(terminalStub.dispose.called)

		})

		it("should return false for non-existent terminal", () => {
			const closed = manager.closeTerminal(99999)
			assert.strictEqual(closed, false)
		})
	})

	describe("closeAllTerminals", () => {
		it("should close all managed terminals", async () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			await manager.getOrCreateTerminal("/test/cwd1")
			await manager.getOrCreateTerminal("/test/cwd2")

			manager.closeAllTerminals()

			const terminals = manager.getTerminals(false)
			assert.strictEqual(terminals.length, 0)

		})
	})

	describe("disposeAll", () => {
		it("should clean up all resources", async () => {
			const createTerminalStub = sinon
				.stub(vscode.window, "createTerminal")
				.returns(terminalStub as any)

			await manager.getOrCreateTerminal("/test/cwd1")
			await manager.getOrCreateTerminal("/test/cwd2")

			manager.disposeAll()

			const terminals = manager.getTerminals(false)
			assert.strictEqual(terminals.length, 0)

		})
	})
})

