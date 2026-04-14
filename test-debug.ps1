$base = "http://127.0.0.1:58085"
$login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}' -TimeoutSec 10
$token = $login.data.token

# Create a real ad content first for testing
$slot = Invoke-RestMethod -Uri "$base/api/ads" -Method POST -Headers @{"Authorization"="Bearer $token"} -ContentType "application/json" -Body '{"name":"Test Banner X","type":"banner","position":"top","width":320,"height":50}' -TimeoutSec 10
$slotId = $slot.data.id
Write-Host "Created slot: $slotId" -ForegroundColor Yellow

$content = Invoke-RestMethod -Uri "$base/api/ads/admin/contents" -Method POST -Headers @{"Authorization"="Bearer $token"} -ContentType "application/json" -Body (@{ slotId=$slotId; title="Test Ad"; imageUrl="https://x.com/a.png"; targetUrl="https://x.com"; advertiser="Test" } | ConvertTo-Json -Compress) -TimeoutSec 10
$adId = $content.data.id
Write-Host "Created content: $adId" -ForegroundColor Yellow

# Test trackClick with real adId
Write-Host "`n--- trackClick with real adId ---" -ForegroundColor Cyan
try {
    $body = @{adId=$adId; slotId=$slotId} | ConvertTo-Json -Compress
    $r = Invoke-RestMethod -Uri "$base/api/ads/content/click" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 10
    Write-Host "OK: $(($r | ConvertTo-Json -Compress))" -ForegroundColor Green
} catch {
    $s = $_.Exception.Response.StatusCode
    $st = $_.Exception.Response.GetResponseStream()
    $rd = New-Object System.IO.StreamReader($st)
    $bd = $rd.ReadToEnd()
    Write-Host "HTTP $s - Body: $bd" -ForegroundColor Red
}

# Test PUT profile with detailed error
Write-Host "`n--- PUT profile ---" -ForegroundColor Cyan
try {
    $body = '{"name":"超级管理员","gender":"other"}'
    $r = Invoke-RestMethod -Uri "$base/api/auth/profile" -Method PUT -ContentType "application/json" -Body $body -Headers @{"Authorization"="Bearer $token"} -TimeoutSec 10
    Write-Host "OK: $(($r | ConvertTo-Json -Compress))" -ForegroundColor Green
} catch {
    $s = $_.Exception.Response.StatusCode
    $st = $_.Exception.Response.GetResponseStream()
    $rd = New-Object System.IO.StreamReader($st)
    $bd = $rd.ReadToEnd()
    Write-Host "HTTP $s - Body: $bd" -ForegroundColor Red
}

# Test with minimal body
Write-Host "`n--- PUT profile (minimal) ---" -ForegroundColor Cyan
try {
    $body = '{"name":"Admin"}'
    $r = Invoke-RestMethod -Uri "$base/api/auth/profile" -Method PUT -ContentType "application/json" -Body $body -Headers @{"Authorization"="Bearer $token"} -TimeoutSec 10
    Write-Host "OK: $(($r | ConvertTo-Json -Compress))" -ForegroundColor Green
} catch {
    $s = $_.Exception.Response.StatusCode
    $st = $_.Exception.Response.GetResponseStream()
    $rd = New-Object System.IO.StreamReader($st)
    $bd = $rd.ReadToEnd()
    Write-Host "HTTP $s - Body: $bd" -ForegroundColor Red
}

Write-Host "`n[DONE]" -ForegroundColor Yellow
