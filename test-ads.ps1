$base = "http://127.0.0.1:58085"

function test-api($name, $method, $path, $body = $null, $token = $null) {
    Write-Host "`n=== $name ===" -ForegroundColor Cyan
    try {
        $params = @{ Uri = "$base$path"; Method = $method; TimeoutSec = 10 }
        $headers = @{}
        if ($token) { $headers["Authorization"] = "Bearer $token" }
        if ($headers.Count -gt 0) { $params["Headers"] = $headers }
        if ($body) {
            $params["Body"] = $body
            $params["ContentType"] = "application/json"
        }
        $r = Invoke-RestMethod @params
        $json = $r | ConvertTo-Json -Compress -Depth 5
        if ($json.Length -gt 400) { $json = $json.Substring(0, 400) + "..." }
        Write-Host "OK: $json" -ForegroundColor Green
    } catch {
        $status = $_.Exception.Response.StatusCode
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body2 = $reader.ReadToEnd()
        Write-Host "HTTP $status - Body: $body2" -ForegroundColor Red
    }
}

# Get admin token
$login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}' -TimeoutSec 10
$token = $login.data.token
Write-Host "Token: $($token.Substring(0,20))..." -ForegroundColor Yellow

# First create a slot and ad content for testing
$slot = Invoke-RestMethod -Uri "$base/api/ads" -Method POST -Headers @{"Authorization"="Bearer $token"} -ContentType "application/json" -Body '{"name":"Test Banner 2","type":"banner","position":"top","width":320,"height":50}' -TimeoutSec 10
$slotId = $slot.data.id
Write-Host "Created slot: $slotId" -ForegroundColor Yellow

# Create ad content
$content = Invoke-RestMethod -Uri "$base/api/ads/admin/contents" -Method POST -Headers @{"Authorization"="Bearer $token"} -ContentType "application/json" -Body (@{ slotId=$slotId; title="Test Ad"; imageUrl="https://example.com/ad.png"; targetUrl="https://example.com"; advertiser="TestCorp" } | ConvertTo-Json) -TimeoutSec 10
$adId = $content.data.id
Write-Host "Created ad content: $adId" -ForegroundColor Yellow

# Test: GET /api/ads/ (public)
test-api "GET /api/ads/" GET "/api/ads/"

# Test: GET /api/ads/slots (same as above)
test-api "GET /api/ads/slots" GET "/api/ads/slots"

# Test: GET /api/ads/content/:slotId (public - should work)
test-api "GET /api/ads/content/$slotId" GET "/api/ads/content/$slotId"

# Test: POST /api/ads/content/click (public)
test-api "POST /api/ads/content/click" POST "/api/ads/content/click" (@{adId=$adId; slotId=$slotId} | ConvertTo-Json)

# Test: POST /api/ads/content/click with no adId
test-api "POST /api/ads/content/click (no adId)" POST "/api/ads/content/click" (@{slotId=$slotId} | ConvertTo-Json)

# Test: GET /api/ads/admin/slots (admin)
test-api "GET /api/ads/admin/slots" GET "/api/ads/admin/slots" $null $token

# Test: GET /api/ads/admin/stats (admin)
test-api "GET /api/ads/admin/stats" GET "/api/ads/admin/stats" $null $token

# Test: comment with correct params (contentId = slug)
test-api "GET /api/comments?contentId=vscode&contentType=app" GET "/api/comments?contentId=vscode&contentType=app"
test-api "POST /api/comments" POST "/api/comments" (@{contentId="vscode"; contentType="app"; content="Test from API"} | ConvertTo-Json) $token

# Test: request with correct params
test-api "POST /api/requests" POST "/api/requests" (@{title="Test App Request"; description="Please add this app"} | ConvertTo-Json) $token

# Test: auth/me PUT
test-api "PUT /api/auth/me" "PUT" "/api/auth/me" (@{name="管理员"} | ConvertTo-Json) $token

# Test: settings PUT (no such endpoint - correct)
test-api "PUT /api/settings" "PUT" "/api/settings" (@{siteName="Triangle Portal"} | ConvertTo-Json) $token

Write-Host "`n====== DONE ======" -ForegroundColor Yellow
