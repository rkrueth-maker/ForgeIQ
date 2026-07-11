param(
  [string]$ScriptId = "13Bes6_rs3LD-Sch4Vi5DKssCnIU_qb4hzZpGpDVfoRELRAk0HtXEJ7o",
  [string]$WorkDir = "h38-owner-portal-apps-script"
)

$ErrorActionPreference = "Stop"

Write-Host "Highway 38 Core Engine clasp setup starting..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is not installed. Install Node.js LTS first: https://nodejs.org/"
}

if (-not (Get-Command clasp -ErrorAction SilentlyContinue)) {
  Write-Host "Installing clasp globally..."
  npm install -g @google/clasp
}

if (-not (Test-Path $WorkDir)) {
  Write-Host "Cloning Apps Script project..."
  clasp clone $ScriptId --rootDir $WorkDir
} else {
  Write-Host "Using existing folder: $WorkDir"
}

Copy-Item "apps-script/core-engine/H38OwnerApprovedEmailSend.gs" "$WorkDir/H38OwnerApprovedEmailSend.gs" -Force

Push-Location $WorkDir
Write-Host "Pushing owner-approved send module to Apps Script..."
clasp push
Pop-Location

Write-Host "Done. Refresh the Owner Review Portal spreadsheet and use the approved selected-row send action only after the approval gate is satisfied."
