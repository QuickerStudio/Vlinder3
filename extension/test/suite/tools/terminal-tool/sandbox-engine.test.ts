import * as assert from "assert"
import { SandboxEngine } from "../../../../src/integrations/terminal/sandbox/sandbox-engine"
import { TerminalSecurityPolicy } from "../../../../src/integrations/terminal/sandbox/policy.types"
import "mocha"

describe("SandboxEngine Tests", () => {
	describe("Block List Tests", () => {
		it("should block commands matching common block patterns", () => {
			const policy: TerminalSecurityPolicy = {
				version: 1,
				common: {
					block: ["rm\\s+-rf", "format\\s+C:", "sudo\\s+rm"],
				},
			}

			const engine = new SandboxEngine(policy)
			const result = engine.evaluate("rm -rf /important/data")

			assert.strictEqual(result.decision, "block")
			assert.ok(result.reasons.some((r) => r.includes("blocked by pattern")))
		})

		it("should block commands matching platform-specific block patterns", () => {
			const policy: TerminalSecurityPolicy = {
				version: 1,
				platforms: {
					win32: {
						block: ["del\\s+/f", "rd\\s+/s"],
					},
				},
			}

			const engine = new SandboxEngine(policy)
			const result = engine.evaluate("del /f important.txt")

			assert.strictEqual(result.decision, "block")
			assert.ok(result.reasons.some((r) => r.includes("blocked by pattern")))
		})

		it("should not block safe commands", () => {
			const policy: TerminalSecurityPolicy = {
				version: 1,
				common: {
					block: ["rm\\s+-rf"],
				},
			}

			const engine = new SandboxEngine(policy)
			const result = engine.evaluate("ls -la")

			assert.notStrictEqual(result.decision, "block")
		})
	})

	describe("Risk Keywords Tests", () => {
		it("should warn on risky keywords", () => {
			const policy: TerminalSecurityPolicy = {
				version: 1,
				common: {
					riskKeywords: ["TOKEN"],
				},
			}

			const engine = new SandboxEngine(policy)
			const result = engine.evaluate("export API_TOKEN=abc123")

			assert.strictEqual(result.decision, "warn")
			assert.ok(result.reasons.some((r) => r.includes("risky keyword detected")))
		})

		it("should not warn on quoted risky keywords", () => {
			const policy: TerminalSecurityPolicy = {
				version: 1,
				common: {
					riskKeywords: ["password"],
				},
			}

			const engine = new SandboxEngine(policy)
			const result = engine.evaluate('echo "Enter your password"')

			// Should not warn because the keyword is in quotes
			assert.notStrictEqual(result.decision, "warn")
		})

		it("should prioritize block over warn", () => {
			const policy: TerminalSecurityPolicy = {
				version: 1,
				common: {
					block: ["rm\\s+-rf"],
					riskKeywords: ["important"],
				},
			}

			const engine = new SandboxEngine(policy)
			const result = engine.evaluate("rm -rf /important")

			assert.strictEqual(result.decision, "block")
		})
	})

	describe("Allow List Tests", () => {
		it("should allow commands matching allow patterns", () => {
			const policy: TerminalSecurityPolicy = {
				version: 1,
				common: {
					allow: ["^ls", "^pwd", "^echo"],
				},
			}

			const engine = new SandboxEngine(policy)
			const result = engine.evaluate("ls -la")

			assert.strictEqual(result.decision, "allow")
			assert.ok(result.reasons.some((r) => r.includes("allowed by pattern")))
		})

		it("should default to allow if no allow patterns match but no block", () => {
			const policy: TerminalSecurityPolicy = {
				version: 1,
				common: {
					allow: ["^ls"],
				},
			}

			const engine = new SandboxEngine(policy)
			const result = engine.evaluate("cat file.txt")

			assert.strictEqual(result.decision, "allow")
			assert.ok(result.reasons.some((r) => r.includes("no allow rule matched")))
		})
	})

	describe("Platform Policy Selection", () => {
		it("should apply correct platform policy", () => {
			const policy: TerminalSecurityPolicy = {
				version: 1,
				platforms: {
					win32: {
						block: ["del"],
					},
					linux: {
						block: ["rm"],
					},
				},
			}

			const engine = new SandboxEngine(policy)
			const currentPlatform = process.platform

			if (currentPlatform === "win32") {
				const result = engine.evaluate("del file.txt")
				assert.strictEqual(result.decision, "block")
			} else if (currentPlatform === "linux") {
				const result = engine.evaluate("rm file.txt")
				assert.strictEqual(result.decision, "block")
			}
		})

		it("should merge common and platform policies", () => {
			const policy: TerminalSecurityPolicy = {
				version: 1,
				common: {
					block: ["dangerous"],
				},
				platforms: {
					win32: {
						block: ["del"],
					},
				},
			}

			const engine = new SandboxEngine(policy)

			// Common block should work
			const result1 = engine.evaluate("dangerous command")
			assert.strictEqual(result1.decision, "block")

			// Platform block should work (if on Windows)
			if (process.platform === "win32") {
				const result2 = engine.evaluate("del file.txt")
				assert.strictEqual(result2.decision, "block")
			}
		})
	})

	describe("Edge Cases", () => {
		it("should handle empty policy", () => {
			const policy: TerminalSecurityPolicy = {
				version: 1,
			}

			const engine = new SandboxEngine(policy)
			const result = engine.evaluate("any command")

			assert.strictEqual(result.decision, "allow")
			assert.ok(result.reasons.some((r) => r.includes("no rules")))
		})

		it("should handle invalid regex patterns gracefully", () => {
			const policy: TerminalSecurityPolicy = {
				version: 1,
				common: {
					block: ["[invalid(regex"],
				},
			}

			const engine = new SandboxEngine(policy)
			const result = engine.evaluate("any command")

			// Should not throw, should default to allow
			assert.ok(result)
		})

		it("should handle empty command", () => {
			const policy: TerminalSecurityPolicy = {
				version: 1,
				common: {
					block: ["rm"],
				},
			}

			const engine = new SandboxEngine(policy)
			const result = engine.evaluate("")

			assert.strictEqual(result.decision, "allow")
		})

		it("should handle commands with special characters", () => {
			const policy: TerminalSecurityPolicy = {
				version: 1,
				common: {
					block: ["rm\\s+-rf"],
				},
			}

			const engine = new SandboxEngine(policy)
			const result = engine.evaluate("rm -rf $(dangerous)")

			assert.strictEqual(result.decision, "block")
		})
	})

	describe("Quote Stripping Tests", () => {
		it("should not detect keywords in single quotes", () => {
			const policy: TerminalSecurityPolicy = {
				version: 1,
				common: {
					riskKeywords: ["secret"],
				},
			}

			const engine = new SandboxEngine(policy)
			const result = engine.evaluate("echo 'This is a secret message'")

			assert.notStrictEqual(result.decision, "warn")
		})

		it("should not detect keywords in double quotes", () => {
			const policy: TerminalSecurityPolicy = {
				version: 1,
				common: {
					riskKeywords: ["password"],
				},
			}

			const engine = new SandboxEngine(policy)
			const result = engine.evaluate('echo "Enter password"')

			assert.notStrictEqual(result.decision, "warn")
		})

		it("should detect keywords outside quotes", () => {
			const policy: TerminalSecurityPolicy = {
				version: 1,
				common: {
					riskKeywords: ["token"],
				},
			}

			const engine = new SandboxEngine(policy)
			const result = engine.evaluate('export token="value"')

			assert.strictEqual(result.decision, "warn")
		})
	})
})

