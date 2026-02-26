/**
 * WorkSpace module — unified exports
 *
 * Centralises all workspace-related utilities previously scattered across:
 *   - extension/src/agent/utils.ts              → cwd.ts
 *   - extension/src/AgentRuntime/utils/fs.ts    → fs.ts
 *   - extension/src/AgentRuntime/utils/path-helpers.ts → path-helpers.ts
 *   - extension/src/AgentRuntime/utils/ripgrep.ts      → ripgrep.ts
 *   - extension/src/AgentRuntime/utils/get-python-env.ts → get-python-env.ts
 *   - extension/src/AgentRuntime/integrations/github/code.ts (Workspace Operations section) → workspace-operations.ts
 */

export * from "./cwd"
export * from "./fs"
// path-helpers also exports fileExistsAtPath; use the fs version as canonical
export { arePathsEqual } from "./path-helpers"
export * from "./ripgrep"
export * from "./get-python-env"
export * from "./workspace-operations"
