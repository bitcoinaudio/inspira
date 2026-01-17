#!/usr/bin/env pwsh
# Test the publish flow end-to-end

Write-Host "🧪 Testing Inspira Publish to Beatfeed Flow" -ForegroundColor Cyan
Write-Host ""

# Configuration
$packId = "c38cf983-76db-4301-a80e-fd2e2d3f034d"
$gatewayUrl = "http://localhost:3003"
$beatfeedUrl = "http://api.beatfeed.local/api"
$adminKey = "beatfeed_dev_key_change_in_production"
$creatorHandle = "bitcoinaudio"

Write-Host "Step 1: Testing Gateway Manifest Endpoint" -ForegroundColor Yellow
try {
    $manifestResponse = Invoke-WebRequest -Uri "$gatewayUrl/packs/$packId/manifest" -Method GET -UseBasicParsing
    $manifest = $manifestResponse.Content | ConvertFrom-Json
    Write-Host "✓ Manifest retrieved successfully" -ForegroundColor Green
    Write-Host "  Title: $($manifest.artifact.title)" -ForegroundColor Gray
    Write-Host "  Source: $($manifest.artifact.source_app)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to get manifest: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Testing Beatfeed Publish Endpoint" -ForegroundColor Yellow

$publishBody = @{
    creator_handle = $creatorHandle
    manifest_url = "$gatewayUrl/packs/$packId/manifest"
    price_sats = 0
    visibility = "public"
    auto_publish = $true
} | ConvertTo-Json

try {
    $headers = @{
        "Content-Type" = "application/json"
        "X-Admin-Key" = $adminKey
    }
    
    $publishResponse = Invoke-WebRequest -Uri "$beatfeedUrl/admin/publish-from-manifest" -Method POST -Body $publishBody -Headers $headers -UseBasicParsing
    $result = $publishResponse.Content | ConvertFrom-Json
    
    Write-Host "✓ Pack published successfully!" -ForegroundColor Green
    Write-Host "  Product Slug: $($result.slug)" -ForegroundColor Gray
    Write-Host "  Status: $($result.status)" -ForegroundColor Gray
    if ($result.url) {
        Write-Host "  View at: $($result.url)" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Failed to publish: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "  Error details: $responseBody" -ForegroundColor Red
    }
    exit 1
}

Write-Host ""
Write-Host "✅ All tests passed! Publish flow is working correctly." -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Open Inspira at http://localhost:5174" -ForegroundColor White
Write-Host "2. Navigate to Sample Packs page" -ForegroundColor White
Write-Host "3. Click 'Publish to Beatfeed' button on any pack" -ForegroundColor White
Write-Host "4. Enter admin key: $adminKey" -ForegroundColor White
Write-Host "5. Configure options and click Publish" -ForegroundColor White
