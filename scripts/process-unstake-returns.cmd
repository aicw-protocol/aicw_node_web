@echo off
REM Run unstake return job once. Schedule this hourly via Task Scheduler if setup-unstake-cron.ps1 needs admin.
cd /d "%~dp0.."
node scripts\process-unstake-returns.mjs
exit /b %ERRORLEVEL%
