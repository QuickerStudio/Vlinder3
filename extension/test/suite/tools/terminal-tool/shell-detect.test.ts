import * as assert from "assert"
import { detectGitBashPath } from "../../../../src/AgentRuntime/integrations/terminal/shell-detect"
import "mocha"

describe("shell-detect Tests", () => {
	describe("detectGitBashPath - Real Environment", () => {
		it("should return null on non-Windows platforms", function () {
			if (process.platform === "win32") {
				this.skip()
				return
			}

			const result = detectGitBashPath()
			assert.strictEqual(result, null)
		})

		it("should return string or null on Windows", function () {
			if (process.platform !== "win32") {
				this.skip()
				return
			}

			const result = detectGitBashPath()
			// Result should be null or a valid path string
			if (result !== null) {
				assert.ok(typeof result === "string")
				assert.ok(result.endsWith("bash.exe"))
				assert.ok(result.includes("Git"))
			}
		})

		it("should handle errors gracefully", () => {
			// Just verify it doesn't throw
			assert.doesNotThrow(() => {
				detectGitBashPath()
			})
		})

		it("should check correct paths on Windows", function () {
			if (process.platform !== "win32") {
				this.skip()
				return
			}

			// This test verifies the function runs without error
			// and that it follows the expected logic
			const result = detectGitBashPath()

			// The result should either be:
			// 1. A valid bash.exe path if Git is installed
			// 2. null if Git is not installed
			assert.ok(result === null || (typeof result === "string" && result.includes("bash.exe")))
		})
	})
})
