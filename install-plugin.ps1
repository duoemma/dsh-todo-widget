<#
  Install dsh-todo-widget into the DSH "desktop" profile.

  Needs write access outside the workspace (~/.dsh), so it must run escalated.

  Steps:
    1. copy the plugin to an ASCII-only path: %USERPROFILE%\.dsh\local-plugins\dsh-todo-widget
       (pnpm link: does not like non-ASCII / spaced paths)
    2. back up profile\package.json
    3. idempotently add the link: dependency and the dsh.profile.bundles entry
    4. run the runtime's own pnpm install with --prefer-offline
    5. roll the package.json back if pnpm fails (DSH boot is all-or-nothing)

  Usage: powershell -NoProfile -ExecutionPolicy Bypass -File install-plugin.ps1 [-Uninstall]

  ASCII only on purpose: Windows PowerShell 5.1 reads BOM-less .ps1 as ANSI.
#>
[CmdletBinding()]
param([switch]$Uninstall)

$ErrorActionPreference = 'Stop'

$srcPlugin = Split-Path -Parent $PSCommandPath
$dshHome = Join-Path $env:USERPROFILE '.dsh'
$localPlugins = Join-Path $dshHome 'local-plugins'
$dstPlugin = Join-Path $localPlugins 'dsh-todo-widget'
$profileDir = Join-Path $dshHome 'profiles\desktop'
$profilePkg = Join-Path $profileDir 'package.json'
$pnpmCjs = Join-Path $dshHome 'dsh-runtimes\dsh-primary-runtime\dependencies\pnpm\bin\pnpm.cjs'
$nodeExe = Join-Path $dshHome 'dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'

function Step($msg) { Write-Host "[install] $msg" -ForegroundColor Cyan }

if (-not (Test-Path $profilePkg)) { throw "profile not found: $profilePkg" }
if (-not (Test-Path $nodeExe)) { throw "runtime node not found: $nodeExe" }
if (-not (Test-Path $pnpmCjs)) { throw "runtime pnpm not found: $pnpmCjs" }

if (-not $Uninstall) {
    Step "sync plugin -> $dstPlugin"
    New-Item -ItemType Directory -Force -Path $localPlugins | Out-Null
    if (Test-Path $dstPlugin) { Remove-Item $dstPlugin -Recurse -Force }
    Copy-Item $srcPlugin $dstPlugin -Recurse -Force
    foreach ($x in @('node_modules', '.git')) {
        $p = Join-Path $dstPlugin $x
        if (Test-Path $p) { Remove-Item $p -Recurse -Force }
    }
}

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$bak = "$profilePkg.bak-$stamp"
Copy-Item $profilePkg $bak -Force
Step "backup -> $(Split-Path -Leaf $bak)"

$pkg = Get-Content $profilePkg -Raw | ConvertFrom-Json

if ($Uninstall) {
    if ($pkg.dependencies.PSObject.Properties['dsh-todo-widget']) {
        $pkg.dependencies.PSObject.Properties.Remove('dsh-todo-widget')
    }
    $pkg.dsh.profile.bundles = @($pkg.dsh.profile.bundles | Where-Object { $_ -ne 'dsh-todo-widget' })
}
else {
    if (-not $pkg.dependencies) {
        $pkg | Add-Member -NotePropertyName dependencies -NotePropertyValue ([pscustomobject]@{})
    }
    $linkSpec = 'link:' + ($dstPlugin -replace '\\', '/')
    if ($pkg.dependencies.PSObject.Properties['dsh-todo-widget']) {
        $pkg.dependencies.'dsh-todo-widget' = $linkSpec
    }
    else {
        $pkg.dependencies | Add-Member -NotePropertyName 'dsh-todo-widget' -NotePropertyValue $linkSpec
    }
    $bundles = @($pkg.dsh.profile.bundles)
    if ($bundles -notcontains 'dsh-todo-widget') { $bundles += 'dsh-todo-widget' }
    $pkg.dsh.profile.bundles = $bundles
}

$json = $pkg | ConvertTo-Json -Depth 20
[IO.File]::WriteAllText($profilePkg, $json, (New-Object Text.UTF8Encoding($false)))
Step 'package.json updated (dependencies + dsh.profile.bundles)'

Step 'pnpm install'
Push-Location $profileDir
try {
    & $nodeExe $pnpmCjs install --prefer-offline --ignore-scripts --reporter=append-only 2>&1 | Select-Object -Last 25
    $code = $LASTEXITCODE
}
finally {
    Pop-Location
}
Step "pnpm exit=$code"

if ($code -ne 0) {
    Copy-Item $bak $profilePkg -Force
    Write-Host '[install] pnpm failed -> package.json rolled back' -ForegroundColor Red
    Write-Host "[install] backup kept at $bak" -ForegroundColor Red
    exit $code
}

$check = Get-Content $profilePkg -Raw | ConvertFrom-Json
Write-Host ''
Write-Host '--- verify ---' -ForegroundColor Yellow
Write-Host ("dependency : " + $check.dependencies.'dsh-todo-widget')
Write-Host ("in bundles : " + ($check.dsh.profile.bundles -contains 'dsh-todo-widget'))
$linked = Join-Path $profileDir 'node_modules\dsh-todo-widget'
Write-Host ("node_modules: " + (Test-Path $linked))
Write-Host ("client.js  : " + (Test-Path (Join-Path $dstPlugin 'client\client.js')))
Write-Host ("host entry : " + (Test-Path (Join-Path $dstPlugin 'lib\index.js')))
exit 0
