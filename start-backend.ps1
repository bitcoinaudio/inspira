#!/usr/bin/env pwsh
# Quick Start Script for SamplePacker Backend
# This script starts the Docker services required for the Inspira frontend

Write-Host "🚀 Starting SamplePacker Backend Services..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Navigate to samplepacker.ai directory
$sampPackerPath = "t:\automatic1111\samplepacker.ai"
if (Test-Path $sampPackerPath) {
    Set-Location $sampPackerPath
    Write-Host "✓ Found samplepacker.ai directory" -ForegroundColor Green
} else {
    Write-Host "✗ Cannot find samplepacker.ai directory at: $sampPackerPath" -ForegroundColor Red
    exit 1
}

# Check if services are already running
$runningContainers = docker ps --format "{{.Names}}"
if ($runningContainers -match "gateway" -and $runningContainers -match "comfy") {
    Write-Host "✓ Services are already running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Container Status:" -ForegroundColor Yellow
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    Write-Host ""
    Write-Host "You can now start the frontend with:" -ForegroundColor Cyan
    Write-Host "  cd t:\BITCOINAUDIO.AI\inspira" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
    exit 0
}

Write-Host ""
Write-Host "Starting Docker Compose services..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Services started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Waiting for services to be healthy (this may take 2-3 minutes)..." -ForegroundColor Yellow
    
    $maxWait = 180 # 3 minutes
    $waited = 0
    $interval = 5
    
    while ($waited -lt $maxWait) {
        Start-Sleep -Seconds $interval
        $waited += $interval
        
        $gatewayStatus = docker inspect --format='{{.State.Health.Status}}' gateway 2>$null
        $comfyStatus = docker inspect --format='{{.State.Health.Status}}' comfy 2>$null
        
        Write-Host "  Gateway: $gatewayStatus | ComfyUI: $comfyStatus" -ForegroundColor Gray
        
        if ($gatewayStatus -eq "healthy" -and $comfyStatus -eq "healthy") {
            Write-Host ""
            Write-Host "✓ All services are healthy!" -ForegroundColor Green
            break
        }
    }
    
    Write-Host ""
    Write-Host "Current Container Status:" -ForegroundColor Yellow
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    Write-Host ""
    Write-Host "Testing Gateway API..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3003/health" -UseBasicParsing -TimeoutSec 5
        Write-Host "✓ Gateway API is responding!" -ForegroundColor Green
        Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
    } catch {
        Write-Host "⚠ Gateway API is not responding yet (this is normal if services just started)" -ForegroundColor Yellow
        Write-Host "  Run this command to check logs: docker logs gateway -f" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "🎉 Backend is ready! You can now:" -ForegroundColor Green
    Write-Host ""
    Write-Host "  1. Start the frontend:" -ForegroundColor White
    Write-Host "     cd t:\BITCOINAUDIO.AI\inspira" -ForegroundColor Gray
    Write-Host "     npm run dev" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. View logs:" -ForegroundColor White
    Write-Host "     docker logs gateway -f" -ForegroundColor Gray
    Write-Host "     docker logs comfy -f" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Stop services:" -ForegroundColor White
    Write-Host "     docker-compose down" -ForegroundColor Gray
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    
} else {
    Write-Host ""
    Write-Host "✗ Failed to start services" -ForegroundColor Red
    Write-Host "Check the error messages above for details" -ForegroundColor Yellow
    exit 1
}
