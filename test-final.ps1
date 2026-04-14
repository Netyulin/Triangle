$base = "http://127.0.0.1:58085"
$login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"admin123"}' -TimeoutSec 10
$token = $login.data.token
Write-Host "Token: $($token.Substring(0,20))..." -ForegroundColor Yellow

function ok($name, $r) { Write-Host "[OK] $name" -ForegroundColor Green }
function fail($name, $status, $body) { Write-Host "[FAIL] $name HTTP $status - $body" -ForegroundColor Red }

# 1. trackClick - 404 with fake adId is expected (route works)
try {
    $r = Invoke-RestMethod -Uri "$base/api/ads/content/click" -Method POST -ContentType "application/json" -Body '{"adId":"fake123"}' -TimeoutSec 10
    ok "trackClick" $r
} catch {
    $s = $_.Exception.Response.StatusCode; $st = $_.Exception.Response.GetResponseStream(); $rd = New-Object System.IO.StreamReader($st); $bd = $rd.ReadToEnd()
    fail "trackClick" $s $bd
}

# 2. stats
try {
    $r = Invoke-RestMethod -Uri "$base/api/ads/admin/stats" -Headers @{"Authorization"="Bearer $token"} -TimeoutSec 10
    ok "stats" $r
} catch {
    $s = $_.Exception.Response.StatusCode; $st = $_.Exception.Response.GetResponseStream(); $rd = New-Object System.IO.StreamReader($st); $bd = $rd.ReadToEnd()
    fail "stats" $s $bd
}

# 3. comment list with contentId (not appId)
try {
    $r = Invoke-RestMethod -Uri "$base/api/comments?contentId=vscode&contentType=app" -TimeoutSec 10
    ok "GET comments" $r
} catch {
    $s = $_.Exception.Response.StatusCode; $st = $_.Exception.Response.GetResponseStream(); $rd = New-Object System.IO.StreamReader($st); $bd = $rd.ReadToEnd()
    fail "GET comments" $s $bd
}

# 4. comment create with contentId
try {
    $body = '{"contentId":"vscode","contentType":"app","content":"Test comment from API"}'
    $r = Invoke-RestMethod -Uri "$base/api/comments" -Method POST -ContentType "application/json" -Body $body -Headers @{"Authorization"="Bearer $token"} -TimeoutSec 10
    ok "POST comments" $r
} catch {
    $s = $_.Exception.Response.StatusCode; $st = $_.Exception.Response.GetResponseStream(); $rd = New-Object System.IO.StreamReader($st); $bd = $rd.ReadToEnd()
    fail "POST comments" $s $bd
}

# 5. request create with title
try {
    $body = '{"title":"Test App Request","description":"Please add this app to the catalog"}'
    $r = Invoke-RestMethod -Uri "$base/api/requests" -Method POST -ContentType "application/json" -Body $body -Headers @{"Authorization"="Bearer $token"} -TimeoutSec 10
    ok "POST requests" $r
} catch {
    $s = $_.Exception.Response.StatusCode; $st = $_.Exception.Response.GetResponseStream(); $rd = New-Object System.IO.StreamReader($st); $bd = $rd.ReadToEnd()
    fail "POST requests" $s $bd
}

# 6. PUT profile (NOT /me)
try {
    $body = '{"name":"超级管理员","gender":"other"}'
    $r = Invoke-RestMethod -Uri "$base/api/auth/profile" -Method PUT -ContentType "application/json" -Body $body -Headers @{"Authorization"="Bearer $token"} -TimeoutSec 10
    ok "PUT profile" $r
} catch {
    $s = $_.Exception.Response.StatusCode; $st = $_.Exception.Response.GetResponseStream(); $rd = New-Object System.IO.StreamReader($st); $bd = $rd.ReadToEnd()
    fail "PUT profile" $s $bd
}

# 7. sign admin certificates
try {
    $r = Invoke-RestMethod -Uri "$base/api/sign/admin/certificates" -Headers @{"Authorization"="Bearer $token"} -TimeoutSec 10
    ok "sign certificates" $r
} catch {
    $s = $_.Exception.Response.StatusCode; $st = $_.Exception.Response.GetResponseStream(); $rd = New-Object System.IO.StreamReader($st); $bd = $rd.ReadToEnd()
    fail "sign certificates" $s $bd
}

# 8. sign admin profiles
try {
    $r = Invoke-RestMethod -Uri "$base/api/sign/admin/profiles" -Headers @{"Authorization"="Bearer $token"} -TimeoutSec 10
    ok "sign profiles" $r
} catch {
    $s = $_.Exception.Response.StatusCode; $st = $_.Exception.Response.GetResponseStream(); $rd = New-Object System.IO.StreamReader($st); $bd = $rd.ReadToEnd()
    fail "sign profiles" $s $bd
}

# 9. admin users
try {
    $r = Invoke-RestMethod -Uri "$base/api/admin/users" -Headers @{"Authorization"="Bearer $token"} -TimeoutSec 10
    ok "admin users" $r
} catch {
    $s = $_.Exception.Response.StatusCode; $st = $_.Exception.Response.GetResponseStream(); $rd = New-Object System.IO.StreamReader($st); $bd = $rd.ReadToEnd()
    fail "admin users" $s $bd
}

# 10. notifications
try {
    $r = Invoke-RestMethod -Uri "$base/api/notifications" -Headers @{"Authorization"="Bearer $token"} -TimeoutSec 10
    ok "notifications" $r
} catch {
    $s = $_.Exception.Response.StatusCode; $st = $_.Exception.Response.GetResponseStream(); $rd = New-Object System.IO.StreamReader($st); $bd = $rd.ReadToEnd()
    fail "notifications" $s $bd
}

# 11. settings (read only - PUT doesn't exist)
try {
    $r = Invoke-RestMethod -Uri "$base/api/settings" -TimeoutSec 10
    ok "settings" $r
} catch {
    $s = $_.Exception.Response.StatusCode; $st = $_.Exception.Response.GetResponseStream(); $rd = New-Object System.IO.StreamReader($st); $bd = $rd.ReadToEnd()
    fail "settings" $s $bd
}

Write-Host "`n==== ALL TESTS DONE ====" -ForegroundColor Yellow
