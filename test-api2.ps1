$base = "http://127.0.0.1:58085"
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsIm5hbWUiOiLns7vnu5_nrqHnkIblkZgiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NzYwNjcyMTAsImV4cCI6MTc3NjY3MjAxMH0.y4LC_GBjZJb-04AeNwbs6XFsHS7iI8eTb0Aq9wQ8UJU"

function test-api($name, $method, $path, $body = $null) {
    Write-Host "`n=== $name ===" -ForegroundColor Cyan
    try {
        $params = @{ Uri = "$base$path"; Method = $method; TimeoutSec = 10 }
        $params["Headers"] = @{ "Authorization" = $token }
        if ($body) {
            $params["Body"] = $body
            $params["ContentType"] = "application/json"
        }
        $r = Invoke-RestMethod @params
        Write-Host "OK: $(($r | ConvertTo-Json -Compress))" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

test-api "GET /api/auth/me" GET "/api/auth/me"
test-api "GET /api/ads/slots" GET "/api/ads/slots"
test-api "POST /api/ads/slots" POST "/api/ads/slots" '{"name":"Test Banner","type":"banner","position":"top","width":320,"height":50}'
test-api "GET /api/ads/slots?page=1&pageSize=10" GET "/api/ads/slots?page=1&pageSize=10"

# Test ad contents
test-api "GET /api/ads/contents" GET "/api/ads/contents"
test-api "POST /api/ads/contents" POST "/api/ads/contents" '{"slotId":"test","title":"Test Ad","imageUrl":"https://example.com/ad.png","targetUrl":"https://example.com","advertiser":"TestCorp"}'

Write-Host "`n=== Done ===" -ForegroundColor Yellow
