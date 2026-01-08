<#
Script: start-docker-and-run-migrations.ps1
Purpose: Ensure Docker Desktop is running, wait for daemon readiness, bring up infra/dev docker-compose, and apply SQL migrations.
Usage: Run from repository root (requires PowerShell elevated if Docker Desktop needs elevation to start):
  .\scripts\start-docker-and-run-migrations.ps1
#>

param(
  [string]$ComposeFile = 'infra/dev/docker-compose.yml',
  [string]$MigrationPath = 'infra/db-migrations/001_initial_schema.sql',
  [int]$WaitSeconds = 60
)

function Exec([string]$cmd) {
  Write-Host "> $cmd"
  & cmd /c $cmd
  return $LASTEXITCODE
}

Write-Host "Checking Docker availability..."
try {
  docker info > $null 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "docker not responding"
  }
  Write-Host "Docker is available."
} catch {
  Write-Host "Docker not available; attempting to start Docker Desktop..."
  $dockerDesktop = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
  if (Test-Path $dockerDesktop) {
    Start-Process -FilePath $dockerDesktop
    Write-Host "Waiting up to $WaitSeconds seconds for Docker to be ready..."
    $end = (Get-Date).AddSeconds($WaitSeconds)
    while ((Get-Date) -lt $end) {
      Start-Sleep -Seconds 2
      docker info > $null 2>&1
      if ($LASTEXITCODE -eq 0) { break }
    }
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
      Write-Error "Docker did not become available. Please ensure Docker Desktop is running and retry."
      exit 1
    }
    Write-Host "Docker is ready."
  } else {
    Write-Error "Docker Desktop not found at $dockerDesktop. Start Docker manually and retry."
    exit 1
  }
}

# Bring up Postgres service
Write-Host "Starting docker compose services from $ComposeFile"
Exec "docker compose -f $ComposeFile up -d"

# Wait for Postgres to accept connections
Write-Host "Waiting for Postgres to accept connections..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  $res = Exec "docker compose -f $ComposeFile exec -T db pg_isready -U postgres" 
  if ($res -eq 0) { $ready = $true; break }
}
if (-not $ready) { Write-Error "Postgres did not become ready."; exit 1 }

# Apply migration
Write-Host "Applying migration $MigrationPath inside container"
Exec "docker compose -f $ComposeFile exec -T db psql -U postgres -d postgres -f /migrations/001_initial_schema.sql"

Write-Host "Migration script executed. Verify with: docker compose -f $ComposeFile exec -T db psql -U postgres -d postgres -c \"\dt\""
