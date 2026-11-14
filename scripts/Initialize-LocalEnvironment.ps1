[CmdletBinding()]
param(
    [ValidateRange(1,65535)]
    [int]$ApiPort = 5001
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendExample = Join-Path $ProjectRoot "backend/.env.example"
$BackendEnv = Join-Path $ProjectRoot "backend/.env"
$FrontendExample = Join-Path $ProjectRoot "frontend/.env.example"
$FrontendEnv = Join-Path $ProjectRoot "frontend/.env.local"

if (!(Test-Path $BackendExample) -or !(Test-Path $FrontendExample)) {
    throw "Run this script from the extracted project; an environment example file is missing."
}

if (!(Test-Path $BackendEnv)) {
    Copy-Item $BackendExample $BackendEnv
    Write-Host "Created backend/.env from the example." -ForegroundColor Green
}

$backendText = Get-Content $BackendEnv -Raw
if ($backendText -notmatch '(?m)^JWT_SECRET=(?!.*(?:replace-with|change-me|example)).{32,}$') {
    $bytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $secret = [Convert]::ToBase64String($bytes)
    if ($backendText -match '(?m)^JWT_SECRET=.*$') {
        $backendText = [regex]::Replace($backendText, '(?m)^JWT_SECRET=.*$', "JWT_SECRET=$secret")
    } else {
        $backendText += "`r`nJWT_SECRET=$secret`r`n"
    }
}
if ($backendText -match '(?m)^PORT=.*$') {
    $backendText = [regex]::Replace($backendText, '(?m)^PORT=.*$', "PORT=$ApiPort")
} else {
    $backendText += "`r`nPORT=$ApiPort`r`n"
}
Set-Content -Path $BackendEnv -Value $backendText -NoNewline -Encoding utf8

if (!(Test-Path $FrontendEnv)) {
    Copy-Item $FrontendExample $FrontendEnv
}
$frontendLines = @(Get-Content $FrontendEnv | Where-Object { $_ -notmatch '^NEXT_PUBLIC_API_URL=' })
$frontendLines += "NEXT_PUBLIC_API_URL=http://localhost:$ApiPort/api"
Set-Content -Path $FrontendEnv -Value $frontendLines -Encoding utf8

Write-Host "`nLocal environment files prepared." -ForegroundColor Green
Write-Host "Backend API port: $ApiPort"
Write-Host "Frontend API URL: http://localhost:$ApiPort/api"
Write-Host "`nBefore running the app, edit backend/.env and set DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASSWORD."
Write-Host "Set DEMO_SEED_PASSWORD to a unique 12-128 character value before running the demo seed."
Write-Host "The generated JWT secret is stored only in backend/.env; do not commit that file."
