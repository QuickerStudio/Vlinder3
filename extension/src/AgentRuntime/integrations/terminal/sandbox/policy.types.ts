export type TerminalSecurityPolicy = {
    version: number
    platforms?: {
        win32?: PlatformPolicy
        darwin?: PlatformPolicy
        linux?: PlatformPolicy
    }
    common?: CommonPolicy
}

export type PlatformPolicy = {
    preferredShell?: "git-bash" | "default"
    allow?: string[]
    block?: string[]
    riskKeywords?: string[]
}

export type CommonPolicy = {
    allow?: string[]
    block?: string[]
    riskKeywords?: string[]
    notes?: string
}

export type SandboxEvaluation = {
    decision: "allow" | "block" | "warn"
    reasons: string[]
}


