$base = "http://127.0.0.1:58085"

# Get token
$login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}' -TimeoutSec 10
$token = $login.data.token

Write-Host "Token: $($token.Substring(0,20))..." -ForegroundColor Yellow

# Test 1: trackClick POST
$body = '{"adId":"test123","slotId":"slot456"}'
$result = Invoke-RestMethod -Uri "$base/api/ads/content/click" -Method POST -ContentType "application/json" -Body $body -TimeoutSec 10
Write-Host "trackClick OK: $(($result | ConvertTo-Json -Compress))" -ForegroundColor Green

# Test 2: ads/admin/stats
$result = Invoke-RestMethod -Uri "$base/api/ads/admin/stats" -Headers @{"Authorization"="Bearer $token"} -TimeoutSec 10
Write-Host "stats OK: $(($result | ConvertTo-Json -Compress))" -ForegroundColor Green

# Test 3: comments
$result = Invoke-RestMethod -Uri "$base/api/comments?contentId=vscode&contentType=app" -TimeoutSec 10
Write-Host "GET comments OK" -ForegroundColor Green

$body2 = '{"contentId":"vscode","contentType":"app","content":"Great software!"}'
$result2 = Invoke-RestMethod -Uri "$base/api/comments" -Method POST -ContentType "application/json" -Body $body2 -Headers @{"Authorization"="Bearer $token"} -TimeoutSec 10
Write-Host "POST comments OK: $(($result2 | ConvertTo-Json -Compress))" -ForegroundColor Green

# Test 4: requests
$body3 = '{"title":"Test Request","description":"Please add this"}'
$result3 = Invoke-RestMethod -Uri "$base/api/requests" -Method POST -ContentType "application/json" -Body $body3 -Headers @{"Authorization"="Bearer $token"} -TimeoutSec 10
Write-Host "POST requests OK: $(($result3 | ConvertTo-Json -Compress))" -ForegroundColor Green

# Test 5: auth/me PUT
$body4 = '{"name":"Administrator"}'
$result4 = Invoke-RestMethod -Uri "$base/api/auth/me" -Method PUT -ContentType "application/json" -Body $body4 -Headers @{"Authorization"="Bearer $token"} -TimeoutSec 10
Write-Host "PUT auth/me OK: $(($result4 | ConvertTo-Json -Compress))" -ForegroundColor Green

Write-Host "ALL DONE" -ForegroundColor Yellow
