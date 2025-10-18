import * as vscode from "vscode"
import { GlobalStateManager } from "../../providers/state/global-state-manager"
import { TerminalSecurityPolicy } from "./sandbox/policy.types"

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
}


