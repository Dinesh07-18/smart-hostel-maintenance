[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$OriginalProject,
  [Parameter(Mandatory=$true)][string]$HandoverProject,
  [Parameter(Mandatory=$true)][string]$OutputCsv
)
$ErrorActionPreference = "Stop"
$OriginalProject = (Resolve-Path -LiteralPath $OriginalProject).Path
$HandoverProject = (Resolve-Path -LiteralPath $HandoverProject).Path
$SkipParts = @(".git","node_modules",".next",".venv","venv","__pycache__")

function Get-ProjectFiles([string]$Root) {
  $map = @{}
  Get-ChildItem -LiteralPath $Root -Recurse -File -Force | ForEach-Object {
    $relative = $_.FullName.Substring($Root.Length).TrimStart('\','/')
    $parts = $relative -split '[\\/]'
    if ($parts | Where-Object { $SkipParts -contains $_ }) { return }
    if ($_.Name -in @(".env",".env.local")) { return }
    $map[$relative] = [PSCustomObject]@{
      Hash = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
      Bytes = $_.Length
    }
  }
  return $map
}
$a = Get-ProjectFiles $OriginalProject
$b = Get-ProjectFiles $HandoverProject
$all = @($a.Keys + $b.Keys | Sort-Object -Unique)
$result = foreach ($path in $all) {
  if (!$a.ContainsKey($path)) { $status = "ONLY_HANDOVER" }
  elseif (!$b.ContainsKey($path)) { $status = "ONLY_ORIGINAL" }
  elseif ($a[$path].Hash -eq $b[$path].Hash) { $status = "SAME_BYTES" }
  else { $status = "DIFFERENT_BYTES" }
  [PSCustomObject]@{
    Path = $path
    Status = $status
    OriginalBytes = if ($a.ContainsKey($path)) { $a[$path].Bytes } else { $null }
    HandoverBytes = if ($b.ContainsKey($path)) { $b[$path].Bytes } else { $null }
  }
}
$result | Export-Csv -LiteralPath $OutputCsv -NoTypeInformation -Encoding UTF8
$result | Group-Object Status | Select-Object Name,Count | Format-Table -AutoSize
Write-Host "Comparison written to $OutputCsv" -ForegroundColor Green
