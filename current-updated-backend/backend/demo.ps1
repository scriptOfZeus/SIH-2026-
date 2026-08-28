$Base = "http://localhost:5000/api/v1"

Write-Host "=== 1. Admin login ===" -ForegroundColor Cyan
$adminLogin = Invoke-RestMethod -Uri "$Base/auth/admin/login" -Method Post -ContentType "application/json" -Body '{"email":"admin@demo.com","password":"admin123"}'
$adminToken = $adminLogin.data.token
Write-Host "Admin token acquired"

Write-Host "`n=== 2. Admin creates a worker ===" -ForegroundColor Cyan
$testPhone = "+9198765" + (Get-Random -Minimum 10000 -Maximum 99999)
$workerBody = "{`"full_name`":`"Ramesh Kumar`",`"phone`":`"$testPhone`",`"skill_category`":`"electrician`",`"skill_certificate_number`":`"NSDC12345`"}"
$workerResp = Invoke-RestMethod -Uri "$Base/admin/workers" -Method Post -ContentType "application/json" -Headers @{Authorization="Bearer $adminToken"} -Body $workerBody
$workerId = $workerResp.data.id
$workerResp.data | Format-List

Write-Host "`n=== 3. Verify certificate + approve worker ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$Base/admin/workers/$workerId/verify-certificate" -Method Patch -Headers @{Authorization="Bearer $adminToken"} | Out-Null
$approveBody = '{"decision":"approved"}'
Invoke-RestMethod -Uri "$Base/admin/workers/$workerId/verify" -Method Patch -ContentType "application/json" -Headers @{Authorization="Bearer $adminToken"} -Body $approveBody | Out-Null
Write-Host "Worker approved"

Write-Host "`n=== 4. Worker logs in via OTP (always 123456 in this demo build) ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$Base/auth/otp/request" -Method Post -ContentType "application/json" -Body "{`"phone`":`"$testPhone`",`"role`":`"worker`"}" | Out-Null
$workerLogin = Invoke-RestMethod -Uri "$Base/auth/otp/verify" -Method Post -ContentType "application/json" -Body "{`"phone`":`"$testPhone`",`"code`":`"123456`",`"role`":`"worker`"}"
$workerToken = $workerLogin.data.token
Write-Host "Worker token acquired"

Write-Host "`n=== 5. Worker sets location ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$Base/workers/me" -Method Patch -ContentType "application/json" -Headers @{Authorization="Bearer $workerToken"} -Body '{"lat":22.5726,"lng":88.3639}' | Out-Null
Write-Host "Location set"

Write-Host "`n=== 6. Customer logs in via OTP ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$Base/auth/otp/request" -Method Post -ContentType "application/json" -Body '{"phone":"+919000011111","role":"customer"}' | Out-Null
$custLogin = Invoke-RestMethod -Uri "$Base/auth/otp/verify" -Method Post -ContentType "application/json" -Body '{"phone":"+919000011111","code":"123456","role":"customer"}'
$custToken = $custLogin.data.token
Write-Host "Customer token acquired"

Write-Host "`n=== 7. Customer searches nearby workers ===" -ForegroundColor Cyan
$nearby = Invoke-RestMethod -Uri "$Base/workers/nearby?lat=22.57&lng=88.36&skill_category=electrician&radius_km=10"
$nearby.data | Format-Table full_name, skill_category, distance_km

Write-Host "`n=== 8. Customer creates a booking (auto-matches nearest worker) ===" -ForegroundColor Cyan
$bookingBody = '{"skill_category":"electrician","service_address":"12 Park Street, Kolkata","service_lat":22.57,"service_lng":88.36,"scheduled_time":"2026-08-29T10:00:00Z"}'
$bookingResp = Invoke-RestMethod -Uri "$Base/bookings" -Method Post -ContentType "application/json" -Headers @{Authorization="Bearer $custToken"} -Body $bookingBody
$bookingId = $bookingResp.data.id
$bookingResp.data | Format-List

Write-Host "`n=== 9. Worker accepts ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$Base/bookings/$bookingId/accept" -Method Patch -Headers @{Authorization="Bearer $workerToken"} | Out-Null
Write-Host "Accepted"

Write-Host "`n=== 10. Two-sided completion ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$Base/bookings/$bookingId/complete" -Method Patch -Headers @{Authorization="Bearer $custToken"} | Out-Null
$final = Invoke-RestMethod -Uri "$Base/bookings/$bookingId/complete" -Method Patch -Headers @{Authorization="Bearer $workerToken"}
Write-Host "Booking status: $($final.data.status)"

Write-Host "`n=== 11. Payment ===" -ForegroundColor Cyan
$payBody = "{`"booking_id`":`"$bookingId`",`"amount`":500}"
$payResp = Invoke-RestMethod -Uri "$Base/payments/initiate" -Method Post -ContentType "application/json" -Headers @{Authorization="Bearer $custToken"} -Body $payBody
$payResp.data | Format-List

Write-Host "`n=== 12. Rating ===" -ForegroundColor Cyan
$rateBody = "{`"booking_id`":`"$bookingId`",`"rating`":5,`"comment`":`"Great work`"}"
Invoke-RestMethod -Uri "$Base/ratings" -Method Post -ContentType "application/json" -Headers @{Authorization="Bearer $custToken"} -Body $rateBody | Out-Null
Write-Host "Rating submitted"

Write-Host "`n=== 13. Admin analytics summary ===" -ForegroundColor Cyan
$summary = Invoke-RestMethod -Uri "$Base/admin/analytics/summary" -Headers @{Authorization="Bearer $adminToken"}
$summary.data | Format-List

Write-Host "`n✅ FULL LOOP COMPLETE" -ForegroundColor Green
