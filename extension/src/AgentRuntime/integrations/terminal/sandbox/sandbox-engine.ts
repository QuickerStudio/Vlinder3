import os from "os"
import { PlatformPolicy, SandboxEvaluation, TerminalSecurityPolicy } from "../../../integrations/terminal/sandbox/policy.types"

function stripQuoted(input: string): string {
    // Remove single and double quoted substrings to reduce false positives
    return input.replace(/(["'])(?:\\.|(?!\1).)*\1/g, "")
}

function pickPlatformPolicy(policy: TerminalSecurityPolicy): PlatformPolicy | undefined {
    const platform = os.platform() as "win32" | "darwin" | "linux"
    return policy.platforms?.[platform]
}

export class SandboxEngine {
    constructor(private policy: TerminalSecurityPolicy) {}

    evaluate(command: string): SandboxEvaluation {
        const reasons: string[] = []
        const clean = stripQuoted(command)
        const platformPolicy = pickPlatformPolicy(this.policy)

        const blockList = [
            ...(this.policy.common?.block ?? []),
            ...(platformPolicy?.block ?? []),
        ]
        const allowList = [
            ...(this.policy.common?.allow ?? []),
            ...(platformPolicy?.allow ?? []),
        ]
        const riskList = [
            ...(this.policy.common?.riskKeywords ?? []),
            ...(platformPolicy?.riskKeywords ?? []),
        ]

        // Block check (highest priority)
        for (const pattern of blockList) {
            try {
                const re = new RegExp(pattern)
                if (re.test(clean)) {
                    reasons.push(`blocked by pattern: ${pattern}`)
                    return { decision: "block", reasons }
                }
            } catch {}
        }

        // Risk check (second priority)
        for (const keyword of riskList) {
            if (clean.includes(keyword)) {
                reasons.push(`risky keyword detected: ${keyword}`)
                return { decision: "warn", reasons }
            }
        }

        // Allow check (advisory)
        if (allowList.length > 0) {
            for (const pattern of allowList) {
                try {
                    const re = new RegExp(pattern)
                    if (re.test(clean)) {
                        reasons.push(`allowed by pattern: ${pattern}`)
                        return { decision: "allow", reasons }
                    }
                } catch {}
            }
            // Not matching allow does not block by default
            reasons.push("no allow rule matched; defaulting to allow")
            return { decision: "allow", reasons }
        }

        // No rules found → allow by default
        reasons.push("no rules; defaulting to allow")
        return { decision: "allow", reasons }
    }
}


