#!/usr/bin/env pwsh
# Fix imports of agent/utils functions that were incorrectly pointed to AgentRuntime/utils

# Functions that live in agent/utils.ts (NOT in AgentRuntime/utils)
$agentUtilsFunctions = @('getCwd', 'getReadablePath', 'formatImagesIntoBlocks', 'isTextBlock', 
    'cleanUIMessages', 'formatFilesList', 'formatToolResponse', 'formatToolResponseText',
    'formatGenericToolFeedback', 'createToolMessage', 'isImageBlock', 'cwd')

function Fix-File($filePath) {
    $content = Get-Content $filePath -Raw -Encoding UTF8
    $original = $content
    $relPath = $filePath -replace '\\', '/'

    # Only process files in src/agent/
    if ($relPath -notmatch '/src/agent/') { return $false }

    # Determine depth from agent/ root
    $agentIndex = $relPath.IndexOf('/src/agent/')
    $afterAgent = $relPath.Substring($agentIndex + '/src/agent/'.Length)
    $depth = ($afterAgent -split '/').Count - 1  # number of subdirs below agent/

    # Build relative path prefix to agent/utils
    $prefix = if ($depth -eq 0) { "./" } else { "../" * $depth }

    # Find all imports from AgentRuntime/utils that include agent-utils functions
    # Pattern: import { X, Y } from "../../AgentRuntime/utils"
    # We need to split these into two imports if they mix AgentRuntime/utils and agent/utils functions
    
    # Simple approach: for each import line that imports from AgentRuntime/utils,
    # check if any imported names are agent-utils functions
    $lines = $content -split "`n"
    $newLines = @()
    $changed = $false

    foreach ($line in $lines) {
        # Match import lines from AgentRuntime/utils (with any relative prefix)
        if ($line -match 'from\s+"([^"]*AgentRuntime/utils)"' -or $line -match "from\s+'([^']*AgentRuntime/utils)'") {
            $importPath = $matches[1]
            
            # Extract imported names
            if ($line -match 'import\s+\{([^}]+)\}') {
                $importedNames = $matches[1] -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
                
                $agentNames = $importedNames | Where-Object { $agentUtilsFunctions -contains $_ }
                $runtimeNames = $importedNames | Where-Object { $agentUtilsFunctions -notcontains $_ }
                
                if ($agentNames.Count -gt 0) {
                    $changed = $true
                    # Emit agent/utils import
                    $agentUtilsPath = "${prefix}utils"
                    $agentImport = "import { $($agentNames -join ', ') } from `"$agentUtilsPath`""
                    $newLines += $agentImport
                    
                    # Emit AgentRuntime/utils import for remaining names
                    if ($runtimeNames.Count -gt 0) {
                        $runtimeImport = "import { $($runtimeNames -join ', ') } from `"$importPath`""
                        $newLines += $runtimeImport
                    }
                    continue
                }
            }
        }
        $newLines += $line
    }

    if ($changed) {
        $newContent = $newLines -join "`n"
        Set-Content $filePath $newContent -Encoding UTF8 -NoNewline
        Write-Host "Fixed agent-utils imports: $filePath"
        return $true
    }
    return $false
}

$files = Get-ChildItem -Path "src/agent" -Recurse -Include "*.ts"
$fixedCount = 0
foreach ($file in $files) {
    if (Fix-File $file.FullName) {
        $fixedCount++
    }
}
Write-Host "`nFixed $fixedCount files"
