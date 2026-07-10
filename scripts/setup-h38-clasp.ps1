# H38 Owner Portal Apps Script clasp setup helper
# Run this in PowerShell on your computer.
# It does not send emails, enable triggers, publish websites, request payment, or change customer-facing systems.

$ErrorActionPreference = "Stop"

$ScriptId = "13Bes6_rs3LD-Sch4Vi5DKssCnIU_qb4hzZpGpDVfoRELRAk0HtXEJ7o"
$ProjectDir = "h38-owner-portal-apps-script"

Write-Host "H38 clasp setup starting..." -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is not installed or not on PATH." -ForegroundColor Red
  Write-Host "Install Node.js first, then run this again: https://nodejs.org/" -ForegroundColor Yellow
  exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "npm is not installed or not on PATH." -ForegroundColor Red
  exit 1
}

if (-not (Get-Command clasp -ErrorAction SilentlyContinue)) {
  Write-Host "Installing @google/clasp globally..." -ForegroundColor Yellow
  npm install -g @google/clasp
}

Write-Host "Opening Google login for clasp..." -ForegroundColor Cyan
clasp login

if (-not (Test-Path $ProjectDir)) {
  New-Item -ItemType Directory -Path $ProjectDir | Out-Null
}

Set-Location $ProjectDir

if (-not (Test-Path ".clasp.json")) {
  Write-Host "Cloning existing Apps Script project..." -ForegroundColor Cyan
  clasp clone $ScriptId
} else {
  Write-Host ".clasp.json already exists. Pulling latest Apps Script files..." -ForegroundColor Cyan
  clasp pull
}

Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Next commands:" -ForegroundColor Cyan
Write-Host "  code ." -ForegroundColor White
Write-Host "  clasp pull" -ForegroundColor White
Write-Host "  clasp push" -ForegroundColor White

Write-Host "Safety reminder:" -ForegroundColor Yellow
Write-Host "Do not enable triggers. Do not send emails during setup. Do not publish website/social. Do not request payment." -ForegroundColor Yellow
