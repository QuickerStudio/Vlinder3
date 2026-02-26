#!/usr/bin/env pwsh
# Fix all broken import paths after moving directories to AgentRuntime/

$srcDir = "src"

function Fix-File($filePath) {
    $content = Get-Content $filePath -Raw -Encoding UTF8
    $original = $content

    # ============================================================
    # PATTERN 1: Double-prefix inside AgentRuntime/ files
    # e.g. "../AgentRuntime/router/..." -> "../router/..."
    # e.g. "../../AgentRuntime/router/..." -> "../../router/..."
    # e.g. "./AgentRuntime/utils/..." -> "./utils/..."
    # ============================================================
    
    # Fix ./AgentRuntime/X -> ./X  (same-level double prefix)
    $content = $content -replace '(from\s+")(\./)AgentRuntime/', '$1$2'
    $content = $content -replace "(from\s+')(\./)AgentRuntime/", '$1$2'
    
    # Fix ../AgentRuntime/X -> ../X  (one-level double prefix)
    $content = $content -replace '(from\s+")(\.\./)AgentRuntime/', '$1$2'
    $content = $content -replace "(from\s+')(\.\./)AgentRuntime/", '$1$2'
    
    # Fix ../../AgentRuntime/X -> ../../X  (two-level double prefix)
    $content = $content -replace '(from\s+")(\.\.\/\.\./)AgentRuntime/', '$1$2'
    $content = $content -replace "(from\s+')(\.\.\/\.\./)AgentRuntime/", '$1$2'
    
    # Fix ../../../AgentRuntime/X -> ../../../X  (three-level double prefix)
    $content = $content -replace '(from\s+")(\.\.\/\.\.\/\.\./)AgentRuntime/', '$1$2'
    $content = $content -replace "(from\s+')(\.\.\/\.\.\/\.\./)AgentRuntime/", '$1$2'

    # ============================================================
    # PATTERN 2: Files inside src/agent/ referencing old sibling paths
    # that now live under AgentRuntime/
    # ============================================================
    $relPath = $filePath -replace '\\', '/'
    $isInAgent = $relPath -match '/src/agent/'
    $isInAgentRuntime = $relPath -match '/src/AgentRuntime/'
    $isInTest = $relPath -match '/test/'

    if ($isInAgent) {
        # From agent/, the moved dirs are now at ../AgentRuntime/X
        # Fix: from "../../api/..." -> from "../../AgentRuntime/api/..."
        # Fix: from "../shared/..." -> from "../AgentRuntime/shared/..."
        # Fix: from "../utils/..." -> from "../AgentRuntime/utils/..."
        # Fix: from "../providers/..." -> from "../AgentRuntime/providers/..."
        # Fix: from "../router/..." -> from "../AgentRuntime/router/..."
        # Fix: from "../integrations/..." -> from "../AgentRuntime/integrations/..."
        # Fix: from "../parse-source-code/..." -> from "../AgentRuntime/parse-source-code/..."
        # Fix: from "../db/..." -> from "../AgentRuntime/db/..."
        
        $movedDirs = @('api', 'db', 'integrations', 'parse-source-code', 'providers', 'router', 'shared', 'utils')
        foreach ($dir in $movedDirs) {
            # ../dir/ -> ../AgentRuntime/dir/
            $content = $content -replace "(from\s+[`"'])(\.\./)($dir/)", "`$1`$2AgentRuntime/`$3"
            $content = $content -replace "(from\s+[`"'])(\.\./)($dir[`"'])", "`$1`$2AgentRuntime/`$3"
            # ../../dir/ -> ../../AgentRuntime/dir/  (from deeper subdirs like task-executor/, tools/)
            $content = $content -replace "(from\s+[`"'])(\.\.\/\.\./)($dir/)", "`$1`$2AgentRuntime/`$3"
            $content = $content -replace "(from\s+[`"'])(\.\.\/\.\./)($dir[`"'])", "`$1`$2AgentRuntime/`$3"
            # ../../../dir/ -> ../../../AgentRuntime/dir/  (from deeper subdirs)
            $content = $content -replace "(from\s+[`"'])(\.\.\/\.\.\/\.\./)($dir/)", "`$1`$2AgentRuntime/`$3"
            $content = $content -replace "(from\s+[`"'])(\.\.\/\.\.\/\.\./)($dir[`"'])", "`$1`$2AgentRuntime/`$3"
            # ../../../../dir/ -> ../../../../AgentRuntime/dir/
            $content = $content -replace "(from\s+[`"'])(\.\.\/\.\.\/\.\.\/\.\./)($dir/)", "`$1`$2AgentRuntime/`$3"
            $content = $content -replace "(from\s+[`"'])(\.\.\/\.\.\/\.\.\/\.\./)($dir[`"'])", "`$1`$2AgentRuntime/`$3"
        }
    }

    if ($isInAgentRuntime) {
        # From AgentRuntime/, references to agent/ are fine (agent/ didn't move)
        # But references to old sibling paths that are now inside AgentRuntime/ need fixing
        # e.g. from "../../router/..." when file is in AgentRuntime/api/ -> should be "../router/..."
        # These should already be fixed by double-prefix removal above
        # But also fix references like "../../parse-source-code/queries" -> "./queries" (within same dir)
        
        # Fix parse-source-code self-references
        if ($relPath -match '/AgentRuntime/parse-source-code/') {
            $content = $content -replace "(from\s+[`"'])(\.\.\/\.\./)parse-source-code/", '$1$2'
        }
    }

    if ($isInTest) {
        $movedDirs = @('api', 'db', 'integrations', 'parse-source-code', 'providers', 'router', 'shared', 'utils')
        foreach ($dir in $movedDirs) {
            # ../../../../src/dir/ -> ../../../../src/AgentRuntime/dir/
            $content = $content -replace "(from\s+[`"'])(\.+/src/)($dir/)", "`$1`$2AgentRuntime/`$3"
            $content = $content -replace "(from\s+[`"'])(\.+/src/)($dir[`"'])", "`$1`$2AgentRuntime/`$3"
        }
    }

    if ($content -ne $original) {
        Set-Content $filePath $content -Encoding UTF8 -NoNewline
        Write-Host "Fixed: $filePath"
        return $true
    }
    return $false
}

$files = Get-ChildItem -Path $srcDir -Recurse -Include "*.ts" | Where-Object { $_.FullName -notmatch 'node_modules' }
$testFiles = Get-ChildItem -Path "test" -Recurse -Include "*.ts" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch 'node_modules' }
$allFiles = @($files) + @($testFiles)

$fixedCount = 0
foreach ($file in $allFiles) {
    if (Fix-File $file.FullName) {
        $fixedCount++
    }
}

Write-Host "`nFixed $fixedCount files"
