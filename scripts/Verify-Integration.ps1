[CmdletBinding()]
param([switch]$InstallDependencies)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $ProjectRoot "backend"
$Frontend = Join-Path $ProjectRoot "frontend"

function Invoke-Npm([string]$WorkingDirectory, [string[]]$Arguments, [string]$Label) {
    Write-Host "`n=== $Label ===" -ForegroundColor Cyan
    Push-Location $WorkingDirectory
    try {
        & npm @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "$Label failed with exit code $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }
}

if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm was not found. Install Node.js LTS and reopen PowerShell."
}

if ($InstallDependencies) {
    Invoke-Npm $Backend @("ci") "Install backend dependencies"
    Invoke-Npm $Frontend @("ci") "Install frontend dependencies"
}

Invoke-Npm $Backend @("test") "Backend automated tests"
Invoke-Npm $Frontend @("run","lint") "Frontend lint"
Invoke-Npm $Frontend @("run","build") "Frontend production build"

$Python = Get-Command python -ErrorAction SilentlyContinue
if ($Python) {
    Write-Host "`n=== Python embedding service syntax check ===" -ForegroundColor Cyan
    & python -m compileall -q (Join-Path $Backend "embedding_service")
    if ($LASTEXITCODE -ne 0) { throw "Python embedding service syntax check failed." }
} else {
    Write-Warning "Python was not found; embedding service syntax check was skipped."
}

Write-Host "`nVerification commands completed successfully." -ForegroundColor Green
Write-Host "This does not replace live MySQL/API workflow testing, Qdrant indexing, model-dimension verification, role-isolation checks against a populated database, or browser-based end-to-end testing."
