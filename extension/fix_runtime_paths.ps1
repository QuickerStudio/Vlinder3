$dirs = @("api","db","integrations","parse-source-code","providers","router","shared","utils")
$allFiles = Get-ChildItem -Recurse -Include "*.ts" "src","test"
$totalFixed = 0

foreach ($file in $allFiles) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $newContent = $content
    
    foreach ($d in $dirs) {
        # Fix paths like: from "../../api/..." -> from "../../AgentRuntime/api/..."
        # But only when the target doesn't already have AgentRuntime
        $newContent = $newContent -replace "from ([""'])(\.\./+)($d)/", 'from $1$2AgentRuntime/$3/'
        $newContent = $newContent -replace "from ([""'])(\.\./+)($d)([""'])", 'from $1$2AgentRuntime/$3$4'
        # Fix: from "./api/..." -> from "./AgentRuntime/api/..."
        $newContent = $newContent -replace "from ([""'])\./($d)/", 'from $1./AgentRuntime/$2/'
        $newContent = $newContent -replace "from ([""'])\./($d)([""'])", 'from $1./AgentRuntime/$2$3'
    }
    
    # Fix double AgentRuntime
    $newContent = $newContent -replace "AgentRuntime/AgentRuntime/", "AgentRuntime/"
    
    if ($newContent -ne $content) {
        Set-Content $file.FullName $newContent -NoNewline -Encoding UTF8
        $totalFixed++
        Write-Output "Fixed: $($file.Name)"
    }
}

Write-Output "Total fixed: $totalFixed"
