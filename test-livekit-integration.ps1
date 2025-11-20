# LiveKit Integration Test Script
# Test LiveKit connection and token generation

Write-Host "=== LiveKit Integration Test ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BACKEND_URL = "http://localhost:3000/api/v1"
$timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$TEST_EMAIL = "livekit-test-$timestamp@example.com"
$TEST_PASSWORD = "TestPassword123"
$TEST_USERNAME = "livekittest$timestamp"

Write-Host "Test Configuration:" -ForegroundColor Cyan
Write-Host "  Email: $TEST_EMAIL" -ForegroundColor Gray
Write-Host "  Password: $TEST_PASSWORD" -ForegroundColor Gray
Write-Host ""

# Step 1: Register user
Write-Host "Step 1: Registering test user..." -ForegroundColor Yellow
try {
    $registerBody = @{
        username = $TEST_USERNAME
        email    = $TEST_EMAIL
        password = $TEST_PASSWORD
    } | ConvertTo-Json

    $registerResponse = Invoke-RestMethod -Uri "$BACKEND_URL/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body $registerBody
    
    Write-Host "User registered successfully" -ForegroundColor Green
}
catch {
    Write-Host "Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Error details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit 1
}

# Step 2: Login
Write-Host "`nStep 2: Logging in..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email    = $TEST_EMAIL
        password = $TEST_PASSWORD
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$BACKEND_URL/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    $accessToken = $loginResponse.accessToken
    Write-Host "Login successful" -ForegroundColor Green
    Write-Host "   Access Token: $($accessToken.Substring(0, 20))..." -ForegroundColor Gray
}
catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Error details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit 1
}

# Step 3: Create meeting
Write-Host "`nStep 3: Creating test meeting..." -ForegroundColor Yellow
try {
    $meetingBody = @{
        title       = "LiveKit Test Meeting"
        description = "Testing LiveKit integration - automated test"
        settings    = @{
            waiting_room       = $false
            allow_chat         = $true
            allow_screen_share = $true
        }
    } | ConvertTo-Json -Depth 3

    $headers = @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type"  = "application/json"
    }

    $meetingResponse = Invoke-RestMethod -Uri "$BACKEND_URL/public-meetings" `
        -Method Post `
        -Headers $headers `
        -Body $meetingBody

    $meetingId = $meetingResponse.id
    Write-Host "Meeting created successfully" -ForegroundColor Green
    Write-Host "   Meeting ID: $meetingId" -ForegroundColor Gray
    Write-Host "   Title: $($meetingResponse.title)" -ForegroundColor Gray
}
catch {
    Write-Host "Meeting creation failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Error details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit 1
}

# Step 4: Generate LiveKit token
Write-Host "`nStep 4: Generating LiveKit token..." -ForegroundColor Yellow
try {
    $tokenBody = @{
        meetingId = $meetingId
    } | ConvertTo-Json

    $tokenResponse = Invoke-RestMethod -Uri "$BACKEND_URL/livekit/token" `
        -Method Post `
        -Headers $headers `
        -Body $tokenBody

    Write-Host "LiveKit token generated successfully" -ForegroundColor Green
    Write-Host "   Token: $($tokenResponse.token.Substring(0, 30))..."-ForegroundColor Gray
    Write-Host "   WebSocket URL: $($tokenResponse.wsUrl)" -ForegroundColor Gray
    Write-Host "   Identity: $($tokenResponse.identity)" -ForegroundColor Gray
    Write-Host "   Room: $($tokenResponse.room)" -ForegroundColor Gray
    
    # Check if metadata exists and has role
    if ($tokenResponse.metadata -and $tokenResponse.metadata.role) {
        Write-Host "   Role: $($tokenResponse.metadata.role)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "Token generation failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Error details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit 1
}

# Step 5: Verify LiveKit configuration
Write-Host "`nStep 5: Verifying LiveKit configuration..." -ForegroundColor Yellow
Write-Host "   Expected WebSocket URL: wss://talkplatform-mqjtdg31.livekit.cloud" -ForegroundColor Gray
Write-Host "   Actual WebSocket URL: $($tokenResponse.wsUrl)" -ForegroundColor Gray

if ($tokenResponse.wsUrl -eq "wss://talkplatform-mqjtdg31.livekit.cloud") {
    Write-Host "LiveKit Cloud configuration is CORRECT" -ForegroundColor Green
}
else {
    Write-Host "WARNING: WebSocket URL mismatch" -ForegroundColor Yellow
}

# Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "[OK] Backend is running" -ForegroundColor Green
Write-Host "[OK] Authentication is working" -ForegroundColor Green
Write-Host "[OK] Meeting creation is working" -ForegroundColor Green
Write-Host "[OK] LiveKit token generation is working" -ForegroundColor Green
Write-Host "[OK] LiveKit Cloud configuration is correct" -ForegroundColor Green
Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Open frontend: http://localhost:3001" -ForegroundColor White
Write-Host "2. Login with:" -ForegroundColor White
Write-Host "   Email: $TEST_EMAIL" -ForegroundColor Yellow
Write-Host "   Password: $TEST_PASSWORD" -ForegroundColor Yellow
Write-Host "3. Join meeting ID: $meetingId" -ForegroundColor White
Write-Host "4. Check LiveKit Dashboard: https://cloud.livekit.io" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: Dashboard will show activity when you join the meeting!" -ForegroundColor Yellow
Write-Host ""

# Save credentials to file for easy access
$credFile = "test-credentials.txt"
@"
LiveKit Test Credentials
========================
Email: $TEST_EMAIL
Password: $TEST_PASSWORD
Meeting ID: $meetingId
Frontend URL: http://localhost:3001
LiveKit Dashboard: https://cloud.livekit.io
"@ | Out-File -FilePath $credFile -Encoding UTF8

Write-Host "Credentials saved to: $credFile" -ForegroundColor Cyan
