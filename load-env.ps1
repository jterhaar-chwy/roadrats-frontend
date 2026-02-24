# Road Rats Backend - Environment Setup
# Uses Windows Integrated Authentication (no username/password needed)

$env:CLS_DB_URL="jdbc:sqlserver://wmssql-cls:1433;databaseName=DMSServer;encrypt=true;trustServerCertificate=true;integratedSecurity=true"
$env:IO_DB_URL="jdbc:sqlserver://wmssql-io:1433;databaseName=AAD_IMPORT_ORDER;encrypt=true;trustServerCertificate=true;integratedSecurity=true"

# Jira / Release Manager Configuration
# Reads credentials from the existing catdog jira.ini config file
$JiraConfigPath = "E:\Repos\wms-deployments\catdog\Config\jira.ini"
If (Test-Path $JiraConfigPath) {
    $JiraConfig = Get-Content $JiraConfigPath | Where-Object { $_ -match "=" } | ConvertFrom-StringData
    $env:JIRA_USER = $JiraConfig.User
    $env:JIRA_TOKEN = $JiraConfig.Token
    Write-Host "Jira credentials loaded from jira.ini" -ForegroundColor Green
} Else {
    Write-Host "WARNING: Jira config not found at $JiraConfigPath" -ForegroundColor Yellow
    Write-Host "  Set JIRA_USER and JIRA_TOKEN manually for Release Manager features" -ForegroundColor Yellow
}

# Load YARN_NPM_AUTH_TOKEN from .env file
$EnvFile = Join-Path $PSScriptRoot ".env.local"
If (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        If ($_ -match '^\s*YARN_NPM_AUTH_TOKEN\s*=\s*(.+)$') {
            $env:YARN_NPM_AUTH_TOKEN = $Matches[1].Trim().Trim('"').Trim("'")
        }
    }
    If ($env:YARN_NPM_AUTH_TOKEN) {
        Write-Host "YARN_NPM_AUTH_TOKEN loaded from .env" -ForegroundColor Green
    } Else {
        Write-Host "WARNING: YARN_NPM_AUTH_TOKEN not found in .env file" -ForegroundColor Yellow
    }
} Else {
    Write-Host "WARNING: .env file not found at $EnvFile" -ForegroundColor Yellow
}

Write-Host "Environment variables set:" -ForegroundColor Green
Write-Host "  CLS_DB_URL        = $env:CLS_DB_URL"
Write-Host "  IO_DB_URL         = $env:IO_DB_URL"
Write-Host "  JIRA_USER         = $env:JIRA_USER"
Write-Host "  JIRA_TOKEN        = $(If ($env:JIRA_TOKEN) { '[SET]' } Else { '[NOT SET]' })"
Write-Host "  YARN_NPM_AUTH_TOKEN = $(If ($env:YARN_NPM_AUTH_TOKEN) { '[SET]' } Else { '[NOT SET]' })"
Write-Host ""
Write-Host "Using Windows Integrated Authentication (integratedSecurity=true)" -ForegroundColor Cyan
Write-Host "Make sure sqljdbc_auth.dll is in build/native-libs/" -ForegroundColor Yellow
