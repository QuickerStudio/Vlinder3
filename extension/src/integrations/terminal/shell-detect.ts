import * as fs from "fs"
import * as path from "path"
import os from "os"

export function detectGitBashPath(): string | null {
    if (os.platform() !== "win32") {return null}

    const commonPaths = [
        "C:\\Program Files\\Git\\bin\\bash.exe",
        "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
        "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
        "C:\\Program Files (x86)\\Git\\usr\\bin\\bash.exe",
    ]

    for (const p of commonPaths) {
        if (fs.existsSync(p)) {return p}
    }

    try {
        const { execSync } = require("child_process")
        const gitPath: string = execSync("where git", { encoding: "utf-8" }).trim().split("\n")[0]
        if (gitPath) {
            const gitDir = path.dirname(path.dirname(gitPath))
            const bashPath = path.join(gitDir, "bin", "bash.exe")
            if (fs.existsSync(bashPath)) {return bashPath}
        }
    } catch {}

    return null
}


