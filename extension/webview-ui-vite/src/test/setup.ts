import "@testing-library/jest-dom"
import { vi } from "vitest"

// Mock vscode postMessage
vi.mock("@/utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
		getState: vi.fn(),
		setState: vi.fn(),
	},
}))
