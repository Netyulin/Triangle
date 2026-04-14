# Test API endpoints
$base = "http://127.0.0.1:58085"

function test-api($name, $method, $path, $body = $null, $headers = @{}) {
    Write-Host "`n=== $name ===" -ForegroundColor Cyan
    try {
        $params = @{ Uri = "$base$path"; Method = $method; TimeoutSec = 10 }
        if ($body) {
            $params["Body"] = $body
            $params["ContentType"] = "application/json"
        }
        if ($headers.Count -gt 0) {
            $params["Headers"] = $headers
        }
        $r = Invoke-RestMethod @params
        Write-Host "OK: $(($r | ConvertTo-Json -Compress))" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 1. Register admin
test-api "POST /api/auth/register" POST "/api/auth/register" '{"username":"admin","password":"admin123","email":"admin@test.com","nickname":"Admin"}'

# 2. Login
test-api "POST /api/auth/login" POST "/api/auth/login" '{"username":"admin","password":"admin123"}'

# 3. Check me
test-api "GET /api/auth/me" GET "/api/auth/me"

# 4. App list
test-api "GET /api/apps" GET "/api/apps"

# 5. Ad Slots list
test-api "GET /api/ads/slots" GET "/api/ads/slots"

Write-Host "`n=== Done ===" -ForegroundColor Yellow
