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
        if ($json.Length -gt 500) { $json = $json.Substring(0, 500) + "..." }
        Write-Host "OK: $json" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Step 1: Login and get token
Write-Host "`n====== LOGIN ======" -ForegroundColor Yellow
$login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}' -TimeoutSec 10
$token = $login.data.token
Write-Host "Token obtained: $($token.Substring(0, 20))..." -ForegroundColor Green

# Auth endpoints
test-api "GET /api/auth/me" GET "/api/auth/me" $null $token
test-api "PUT /api/auth/me" PUT "/api/auth/me" '{"nickname":"超级管理员"}' $token

# App endpoints
test-api "GET /api/apps" GET "/api/apps"
test-api "GET /api/apps?page=1&pageSize=5" GET "/api/apps?page=1&pageSize=5"
test-api "GET /api/apps/vscode" GET "/api/apps/vscode"
test-api "GET /api/apps/vscode/posts" GET "/api/apps/vscode/posts"

# Ad endpoints (PUBLIC)
test-api "GET /api/ads/" GET "/api/ads/"
test-api "POST /api/ads/content/click" POST "/api/ads/content/click" '{"adId":"test"}'

# Ad endpoints (ADMIN)
test-api "POST /api/ads (create slot)" POST "/api/ads" '{"name":"Test Banner","type":"banner","position":"top","width":320,"height":50}' $token
test-api "GET /api/ads/admin/slots" GET "/api/ads/admin/slots" $null $token
test-api "GET /api/ads/admin/stats" GET "/api/ads/admin/stats" $null $token

# Comments
test-api "GET /api/comments?appId=1" GET "/api/comments?appId=1"
test-api "POST /api/comments" POST "/api/comments" '{"appId":1,"content":"Test comment"}' $token

# Requests
test-api "GET /api/requests" GET "/api/requests"
test-api "POST /api/requests" POST "/api/requests" '{"appName":"Test App","description":"Test request"}' $token

# Sign admin summary
test-api "GET /api/sign/admin/summary" GET "/api/sign/admin/summary" $null $token
test-api "GET /api/sign/admin/certificates" GET "/api/sign/admin/certificates" $null $token
test-api "GET /api/sign/admin/profiles" GET "/api/sign/admin/profiles" $null $token

# Notifications
test-api "GET /api/notifications" GET "/api/notifications" $null $token

# Admin users
test-api "GET /api/admin/users" GET "/api/admin/users" $null $token

# Settings
test-api "GET /api/settings" GET "/api/settings"
test-api "PUT /api/settings" PUT "/api/settings" '{"siteName":"Triangle"}' $token

Write-Host "`n====== ALL DONE ======" -ForegroundColor Yellow
