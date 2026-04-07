# PULSCO Portal Development Launcher
# Starts all subsystems and the unified portal

Write-Host "🚀 Starting Pulsco Planetary Portal Development Environment" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Function to start a service in background
function Start-Service {
    param(
        [string]$Name,
        [string]$Command,
        [string]$WorkingDir = "."
    )

    Write-Host "Starting $Name..." -ForegroundColor Yellow
    $job = Start-Job -ScriptBlock {
        param($cmd, $dir)
        Set-Location $dir
        Invoke-Expression $cmd
    } -ArgumentList $Command, $WorkingDir

    return $job
}

# Start Edge Gateway (core orchestration)
$edgeJob = Start-Service -Name "Edge Gateway" -Command "pnpm --filter pulse-connect-core dev" -WorkingDir "."

# Wait a moment for core services
Start-Sleep -Seconds 5

# Start individual UI subsystems
$uiJobs = @()

# Places & Venues UI
$uiJobs += Start-Service -Name "Places & Venues UI" -Command "pnpm --filter pulse-connect-ui dev -- -p 3001" -WorkingDir "."

# PAP Marketing UI
$uiJobs += Start-Service -Name "PAP Marketing UI" -Command "pnpm --filter pulse-connect-admin-ui dev -- -p 3002" -WorkingDir "."

# Matchmaking UI (if exists)
$uiJobs += Start-Service -Name "Matchmaking UI" -Command "pnpm --filter pulse-connect-ui dev:matchmaking -- -p 3003" -WorkingDir "."

# E-commerce UI (if exists)
$uiJobs += Start-Service -Name "E-commerce UI" -Command "pnpm --filter pulse-connect-ui dev:ecommerce -- -p 3004" -WorkingDir "."

# Localization UI (if exists)
$uiJobs += Start-Service -Name "Localization UI" -Command "pnpm --filter pulse-connect-ui dev:localization -- -p 3005" -WorkingDir "."

# Communication UI (if exists)
$uiJobs += Start-Service -Name "Communication UI" -Command "pnpm --filter pulse-connect-ui dev:communication -- -p 3006" -WorkingDir "."

# Pulse Intelligence UI (if exists)
$uiJobs += Start-Service -Name "Pulse Intelligence UI" -Command "pnpm --filter pulse-connect-ui dev:intelligence -- -p 3007" -WorkingDir "."

# Edge Gateway UI (if exists)
$uiJobs += Start-Service -Name "Edge Gateway UI" -Command "pnpm --filter pulse-connect-ui dev:edge -- -p 3008" -WorkingDir "."

# MARP Governance UI (if exists)
$uiJobs += Start-Service -Name "MARP Governance UI" -Command "pnpm --filter pulse-connect-ui dev:governance -- -p 3009" -WorkingDir "."

# Wait for UIs to start
Start-Sleep -Seconds 10

# Start the Unified Portal (Main entry point)
Write-Host "Starting Pulsco Portal..." -ForegroundColor Green
$portalJob = Start-Service -Name "Pulsco Portal" -Command "pnpm --filter pulse-portal dev -- -p 3000" -WorkingDir "."

Write-Host ""
Write-Host "🎉 Pulsco Planetary Portal is starting up!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Portal URL:        http://localhost:3000" -ForegroundColor White
Write-Host "Places & Venues:   http://localhost:3001" -ForegroundColor White
Write-Host "PAP Marketing:     http://localhost:3002" -ForegroundColor White
Write-Host "Matchmaking:       http://localhost:3003" -ForegroundColor White
Write-Host "E-commerce:        http://localhost:3004" -ForegroundColor White
Write-Host "Localization:      http://localhost:3005" -ForegroundColor White
Write-Host "Communication:     http://localhost:3006" -ForegroundColor White
Write-Host "Pulse Intelligence: http://localhost:3007" -ForegroundColor White
Write-Host "Edge Gateway:      http://localhost:3008" -ForegroundColor White
Write-Host "MARP Governance:   http://localhost:3009" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow

# Wait for all jobs
try {
    while ($true) {
        Start-Sleep -Seconds 1

        # Check if portal is still running
        if ($portalJob.State -ne "Running") {
            Write-Host "Portal stopped. Shutting down all services..." -ForegroundColor Red
            break
        }
    }
} finally {
    # Cleanup all jobs
    Write-Host "Stopping all services..." -ForegroundColor Yellow

    $edgeJob | Stop-Job -PassThru | Remove-Job
    $portalJob | Stop-Job -PassThru | Remove-Job

    foreach ($job in $uiJobs) {
        $job | Stop-Job -PassThru | Remove-Job
    }

    Write-Host "All services stopped." -ForegroundColor Green
}
