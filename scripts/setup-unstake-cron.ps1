# Register an hourly Windows scheduled task to process due unstake returns.
# Run from aicw_node_web: npm run unstake:setup-cron
#
# Requires: CRON_SECRET in .env.local, node on PATH, aicw_node_web running or deployed URL.

param(
  [string]$TaskName = "AICW-Unstake-Returns",
  [string]$IntervalHours = "1"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$ProcessScript = Join-Path $Root "scripts\process-unstake-returns.mjs"

if (-not (Test-Path $ProcessScript)) {
  Write-Error "Missing $ProcessScript"
}

$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCmd) {
  Write-Error "node is not on PATH"
}
$NodePath = $NodeCmd.Source

$Action = New-ScheduledTaskAction `
  -Execute $NodePath `
  -Argument "`"$ProcessScript`"" `
  -WorkingDirectory $Root

$Hours = [int]$IntervalHours
if ($Hours -lt 1) { $Hours = 1 }

$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) `
  -RepetitionInterval (New-TimeSpan -Hours $Hours) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew

try {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
} catch {}

try {
  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Description "Calls AICW node_web cron API to return unstaked SOL after the 72-hour waiting period." `
    -RunLevel Limited | Out-Null
} catch {
  Write-Host ""
  Write-Host "Could not register scheduled task (admin may be required)."
  Write-Host "Run PowerShell as Administrator, then:"
  Write-Host "  cd $Root"
  Write-Host "  npm run unstake:setup-cron"
  Write-Host ""
  Write-Host "Or run manually each hour:"
  Write-Host "  npm run unstake:process"
  exit 1
}

Write-Host "Registered scheduled task: $TaskName"
Write-Host "  Runs every $IntervalHours hour(s)"
Write-Host "  Working dir: $Root"
Write-Host ""
Write-Host "Test manually: npm run unstake:process"
Write-Host "Remove task:     Unregister-ScheduledTask -TaskName '$TaskName'"
