import * as vscode from "vscode"
import { GlobalStateManager } from "../../providers/state/global-state-manager"
import { TerminalSecurityPolicy } from "./sandbox/policy.types"
import * as path from "path"
import { promises as fs } from "fs"

export class TerminalSecurityState {
    private static KEY = "terminalSecurityPolicy"

    static getPolicy(): TerminalSecurityPolicy | undefined {
        try {
            const raw = GlobalStateManager.getInstance().getGlobalState(
                TerminalSecurityState.KEY as any
            ) as unknown as string | undefined
            if (!raw || typeof raw !== "string") {return undefined}
            const parsed = JSON.parse(raw)
            if (typeof parsed?.version !== "number") {return undefined}
            return parsed as TerminalSecurityPolicy
        } catch {
            return undefined
        }
    }

    static async setPolicy(jsonText: string) {
        await GlobalStateManager.getInstance().updateGlobalState(
            TerminalSecurityState.KEY as any,
            jsonText
        )
    }

    static getUserPolicyPath(context: vscode.ExtensionContext): string {
        return path.join(
            context.globalStorageUri.fsPath,
            "integrations",
            "terminal",
            "sandbox",
            "policy.json"
        )
    }

    static async ensureUserPolicy(context: vscode.ExtensionContext): Promise<string> {
        const dir = path.join(context.globalStorageUri.fsPath, "integrations", "terminal", "sandbox")
        await fs.mkdir(dir, { recursive: true })
        const userPolicyPath = path.join(dir, "policy.json")
        try {
            await fs.access(userPolicyPath)
            return userPolicyPath
        } catch {}

        const extensionPath = context.extensionPath
        const possibleTemplates = [
            path.join(extensionPath, "src", "integrations", "terminal", "sandbox", "policy.default.json"),
            path.join(extensionPath, "dist", "integrations", "terminal", "sandbox", "policy.default.json"),
            path.join(extensionPath, "integrations", "terminal", "sandbox", "policy.default.json"),
        ]
        let content: string | undefined
        for (const p of possibleTemplates) {
            try {
                await fs.access(p)
                content = await fs.readFile(p, "utf8")
                break
            } catch {}
        }
        if (!content) {
            content = JSON.stringify({ version: 1, common: { block: [], riskKeywords: [] } }, null, 2)
        }
        await fs.writeFile(userPolicyPath, content, "utf8")
        await TerminalSecurityState.setPolicy(content)
        return userPolicyPath
    }

    static async writePolicy(context: vscode.ExtensionContext, jsonText: string): Promise<void> {
        await TerminalSecurityState.setPolicy(jsonText)
        const dir = path.join(context.globalStorageUri.fsPath, "integrations", "terminal", "sandbox")
        await fs.mkdir(dir, { recursive: true })
        const userPolicyPath = path.join(dir, "policy.json")
        await fs.writeFile(userPolicyPath, jsonText ?? "", "utf8")
    }

    static async syncFromFileToState(context: vscode.ExtensionContext): Promise<boolean> {
        try {
            const userPolicyPath = TerminalSecurityState.getUserPolicyPath(context)
            const fileContent = await fs.readFile(userPolicyPath, "utf8")
            const current = GlobalStateManager.getInstance().getGlobalState(
                TerminalSecurityState.KEY as any
            ) as unknown as string | undefined
            if (current !== fileContent) {
                await TerminalSecurityState.setPolicy(fileContent)
                return true
            }
            return false
        } catch {
            return false
        }
    }
}


