# StudyLens: one-command local run on Windows (Windows PowerShell 5.1 or PowerShell 7).
#   powershell -ExecutionPolicy Bypass -File scripts\dev.ps1          check setup, update the database, start
#   powershell -ExecutionPolicy Bypass -File scripts\dev.ps1 -Seed    also load the demo account with three weeks of history
param([switch]$Seed)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

function Fail([string]$msg) { Write-Host "`n$msg" -ForegroundColor Red; exit 1 }
function Step([string]$msg) { Write-Host "`n> $msg" -ForegroundColor Cyan }
function Note([string]$msg) { Write-Host $msg -ForegroundColor Yellow }

# Node 20+
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail "Node.js is not installed. Install the LTS from https://nodejs.org, open a new PowerShell window, and run this again." }
$major = [int]((node -v).TrimStart("v").Split(".")[0])
if ($major -lt 20) { Fail "Node $major is too old. Install Node 20 or newer from https://nodejs.org." }

# Packages
if (-not (Test-Path "node_modules")) {
  Step "Installing packages (first run only, a few minutes)"
  npm install
  if ($LASTEXITCODE -ne 0) { Fail "npm install failed. Scroll up for the error." }
}

# Environment
$envPath = "web\.env.local"
if (-not (Test-Path $envPath)) {
  Copy-Item "web\.env.example" $envPath
  Note "Created $envPath. Fill in the Supabase values, save, close Notepad, then run this again."
  notepad $envPath
  exit 0
}
$vars = @{}
foreach ($line in Get-Content $envPath) {
  if ($line -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { $vars[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'") }
}
$missing = @()
foreach ($k in @("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY")) { if (-not $vars[$k]) { $missing += $k } }
if (-not $vars["SUPABASE_SERVICE_ROLE_KEY"] -and -not $vars["SUPABASE_SERVICE_KEY"]) { $missing += "SUPABASE_SERVICE_ROLE_KEY" }
if ($missing.Count -gt 0) {
  notepad $envPath
  Fail "Missing in ${envPath}: $($missing -join ', '). Find them in Supabase under Project Settings > API, save, and run this again."
}
$site = $vars["NEXT_PUBLIC_SITE_URL"]
if ($site -and $site.TrimEnd("/") -ne "http://localhost:3000") {
  Note "Note: NEXT_PUBLIC_SITE_URL is $site but this runs on http://localhost:3000. The Claude Desktop snippet on Connect will point at $site."
}
if ($vars["ANTHROPIC_API_KEY"]) { Write-Host "Mode: server model (ANTHROPIC_API_KEY is set)" } else { Write-Host "Mode: Claude mode (no API key; your Claude Desktop does the checking)" }

# Port 3000 must be free
$busy = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($busy) { Fail "Port 3000 is already in use, probably an old dev server. Close that window (or end the node.exe process) and run this again." }

# Database
if ($vars["SUPABASE_DB_URL"]) {
  Step "Updating the database"
  node scripts\migrate.mjs
  if ($LASTEXITCODE -ne 0) { Fail "The database update failed. Check SUPABASE_DB_URL (Supabase > Connect > Session pooler URI, with your database password)." }
} else {
  Note "Skipping the database update: add SUPABASE_DB_URL to $envPath to do it automatically (Supabase > Connect > Session pooler URI)."
  Note "Or run the files in supabase\migrations that you haven't run yet in Supabase's SQL Editor."
}

# Demo data
if ($Seed) {
  Step "Loading the demo account"
  npm -w demo run seed
  if ($LASTEXITCODE -ne 0) { Fail "Seeding failed. Scroll up for the error." }
  Note "Demo login: demo@studylens.app / studylens-demo-2026"
}

# Open the browser once the server answers
$null = Start-Job -ScriptBlock {
  for ($i = 0; $i -lt 180; $i++) {
    try {
      Invoke-WebRequest -Uri "http://localhost:3000/login" -UseBasicParsing -TimeoutSec 3 | Out-Null
      Start-Process "http://localhost:3000/dashboard/setup"
      return
    } catch { Start-Sleep -Seconds 1 }
  }
}

Step "Starting StudyLens at http://localhost:3000 (leave this window open; Ctrl+C stops it)"
npm run dev:web
