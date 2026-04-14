$ErrorActionPreference = "Continue"
$base = "http://127.0.0.1:58085"

# Get admin token
try {
    $login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}' -TimeoutSec 10
    $token = $login.data.token
    Write-Host "[LOGIN] OK, token: $($token.Substring(0,20))..." -ForegroundColor Green
} catch {
    Write-Host "[LOGIN] FAIL: $_" -ForegroundColor Red; exit 1
}

# Create slot
try {
    $slot = Invoke-RestMethod -Uri "$base/api/ads" -Method POST -Headers @{"Authorization"="Bearer $token"} -ContentType "application/json" -Body '{"name":"Test Banner 2","type":"banner","position":"top","width":320,"height":50}' -TimeoutSec 10
    $slotId = $slot.data.id
    Write-Host "[CREATE SLOT] OK: $slotId" -ForegroundColor Green
} catch {
    Write-Host "[CREATE SLOT] FAIL: $_" -ForegroundColor Red; $slotId = $null
}

if ($slotId) {
    # Create ad content
    try {
        $body = @{
            slotId = $slotId
            title = "Test Ad Content"
            imageUrl = "https://example.com/ad.png"
            targetUrl = "https://example.com"
            advertiser = "TestCorp"
        } | ConvertTo-Json -Compress
        $content = Invoke-RestMethod -Uri "$base/api/ads/admin/contents" -Method POST -Headers @{"Authorization"="Bearer $token"} -ContentType "application/json" -Body $body -TimeoutSec 10
        $adId = $content.data.id
        Write-Host "[CREATE CONTENT] OK: $adId" -ForegroundColor Green
    } catch {
        Write-Host "[CREATE CONTENT] FAIL: $_" -ForegroundColor Red; $adId = $null
    }

    # Test GET /content/:slotId
    try {
        $r = Invoke-RestMethod -Uri "$base/api/ads/content/$slotId" -TimeoutSec 10
        Write-Host "[GET /content/slotId] OK" -ForegroundColor Green
    } catch {
        Write-Host "[GET /content/slotId] FAIL ($($_.Exception.Response.StatusCode)): $_" -ForegroundColor Red
    }

    # Test POST /content/click (with adId)
    if ($adId) {
        try {
            $body = @{adId=$adId; slotId=$slotId} | ConvertTo-Json -Compress
            $r = Invoke-RestMethod -Uri "$base/api/ads/content/click" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 10
            Write-Host "[POST /content/click] OK: $($r | ConvertTo-Json -Compress)" -ForegroundColor Green
        } catch {
            $status = $_.Exception.Response.StatusCode
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $bodyText = $reader.ReadToEnd()
            Write-Host "[POST /content/click] FAIL HTTP $status - $bodyText" -ForegroundColor Red
        }
    }
}

# Test GET /api/ads/admin/stats
try {
    $r = Invoke-RestMethod -Uri "$base/api/ads/admin/stats" -Headers @{"Authorization"="Bearer $token"} -TimeoutSec 10
    Write-Host "[GET /admin/stats] OK: $($r | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    $status = $_.Exception.Response.StatusCode
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $bodyText = $reader.ReadToEnd()
    Write-Host "[GET /admin/stats] FAIL HTTP $status - $bodyText" -ForegroundColor Red
}

# Test comments (correct params: contentId=slug, contentType=app)
try {
    $r = Invoke-RestMethod -Uri "$base/api/comments?contentId=vscode&contentType=app" -TimeoutSec 10
    Write-Host "[GET /comments] OK" -ForegroundColor Green
} catch {
    Write-Host "[GET /comments] FAIL: $_" -ForegroundColor Red
}

try {
    $body = @{contentId="vscode"; contentType="app"; content="Great app!"} | ConvertTo-Json -Compress
    $r = Invoke-RestMethod -Uri "$base/api/comments" -Method POST -Headers @{"Authorization"="Bearer $token"} -ContentType "application/json" -Body $body -TimeoutSec 10
    Write-Host "[POST /comments] OK: $($r | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    $status = $_.Exception.Response.StatusCode
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $bodyText = $reader.ReadToEnd()
    Write-Host "[POST /comments] FAIL HTTP $status - $bodyText" -ForegroundColor Red
}

# Test request create
try {
    $body = @{title="Test App Request"; description="Please add this app"} | ConvertTo-Json -Compress
    $r = Invoke-RestMethod -Uri "$base/api/requests" -Method POST -Headers @{"Authorization"="Bearer $token"} -ContentType "application/json" -Body $body -TimeoutSec 10
    Write-Host "[POST /requests] OK: $($r | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    $status = $_.Exception.Response.StatusCode
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $bodyText = $reader.ReadToEnd()
    Write-Host "[POST /requests] FAIL HTTP $status - $bodyText" -ForegroundColor Red
}

# Test PUT /api/auth/me
try {
    $body = @{name="管理员更新"} | ConvertTo-Json -Compress
    $r = Invoke-RestMethod -Uri "$base/api/auth/me" -Method PUT -Headers @{"Authorization"="Bearer $token"; "Content-Type"="application/json"} -Body $body -TimeoutSec 10
    Write-Host "[PUT /auth/me] OK: $($r | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    $status = $_.Exception.Response.StatusCode
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $bodyText = $reader.ReadToEnd()
    Write-Host "[PUT /auth/me] FAIL HTTP $status - $bodyText" -ForegroundColor Red
}

Write-Host "`n[DONE]" -ForegroundColor Yellow
