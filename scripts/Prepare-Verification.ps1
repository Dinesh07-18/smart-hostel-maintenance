[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$RequiredFiles = @(
    "backend/package.json",
    "backend/package-lock.json",
    "backend/.env.example",
    "backend/src/server.js",
    "backend/scripts/seed-demo.js",
    "frontend/package.json",
    "frontend/package-lock.json",
    "frontend/.env.example",
    "database/create_database.sql",
    "database/migrations/001_initial_schema.sql",
    "database/migrations/002_complaint_embedding_jobs.sql",
    "database/seeds/001_reference_data.sql",
    "database/tests/verify_demo_seed.sql",
    "infrastructure/qdrant/docker-compose.yml",
    "docs/testing/FINAL_TEST_MATRIX.md"
)

$Missing = @($RequiredFiles | Where-Object { !(Test-Path (Join-Path $ProjectRoot $_)) })
if ($Missing.Count -gt 0) {
    Write-Host "Required project files are missing:" -ForegroundColor Red
    $Missing | ForEach-Object { Write-Host " - $_" }
    exit 1
}

Write-Host "Project structure: complete for local setup." -ForegroundColor Green
foreach ($tool in @("node","npm","python","docker","mysql")) {
    $cmd = Get-Command $tool -ErrorAction SilentlyContinue
    if ($cmd) { Write-Host ("{0}: {1}" -f $tool,$cmd.Source) -ForegroundColor Green }
    else { Write-Host ("{0}: not found (install/configure if required for your verification)" -f $tool) -ForegroundColor Yellow }
}

$BackendEnv = Join-Path $ProjectRoot "backend/.env"
$FrontendEnv = Join-Path $ProjectRoot "frontend/.env.local"
if (!(Test-Path $BackendEnv) -or !(Test-Path $FrontendEnv)) {
    Write-Host "`nEnvironment files are not initialized. Run:" -ForegroundColor Yellow
    Write-Host ".\scripts\Initialize-LocalEnvironment.ps1"
} else {
    $backendText = Get-Content $BackendEnv -Raw
    foreach ($key in @("DB_HOST","DB_PORT","DB_NAME","DB_USER","DB_PASSWORD","JWT_SECRET")) {
        if ($backendText -notmatch "(?m)^$key=.+$") {
            Write-Host "backend/.env needs a value for $key" -ForegroundColor Yellow
        }
    }
    if ($backendText -notmatch '(?m)^DEMO_SEED_PASSWORD=.{12,128}$') {
        Write-Host "Set DEMO_SEED_PASSWORD (12-128 chars) before creating demo accounts." -ForegroundColor Yellow
    }
}

Write-Host "`nThis is a setup preflight only. It does not install packages, run tests, modify the database, or start services." -ForegroundColor Cyan
Write-Host "When ready for final verification, run: .\scripts\Verify-Integration.ps1 -InstallDependencies"
