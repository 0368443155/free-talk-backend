# LiveKit System Startup Script
# Khởi động toàn bộ hệ thống với LiveKit integration

Write-Host "🚀 Starting LiveKit Integrated System (API Fixed)..." -ForegroundColor Green
Write-Host "🔧 Recent fixes: API endpoints, authentication, SSR support" -ForegroundColor Yellow
Write-Host ""

# Check if backend dependencies are installed
if (-not (Test-Path "talkplatform-backend/node_modules")) {
    Write-Host "⚠️  Installing backend dependencies..." -ForegroundColor Yellow
    cd talkplatform-backend
    npm install
    cd ..
}

# Check if frontend dependencies are installed  
if (-not (Test-Path "talkplatform-frontend/node_modules")) {
    Write-Host "⚠️  Installing frontend dependencies..." -ForegroundColor Yellow
    cd talkplatform-frontend
    npm install
    cd ..
}

Write-Host "✅ Dependencies ready" -ForegroundColor Green
Write-Host ""

# Start Backend
Write-Host "🔧 Starting Backend (Port 3000)..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd talkplatform-backend; npm run start:dev" -WindowStyle Normal

# Wait for backend to start
Write-Host "⏳ Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep 10

# Start Frontend
Write-Host "🎨 Starting Frontend (Port 3001)..." -ForegroundColor Blue  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd talkplatform-frontend; npm run dev" -WindowStyle Normal

# Wait for frontend to start
Start-Sleep 5

Write-Host ""
Write-Host "🎉 System Started Successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Access Points:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3001" -ForegroundColor White
Write-Host "   Backend API: http://localhost:3000/api/v1" -ForegroundColor White
Write-Host "   Admin Dashboard: http://localhost:3001/admin" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Test LiveKit Integration:" -ForegroundColor Cyan
Write-Host "   1. Login as admin → Check Admin Dashboard" -ForegroundColor White
Write-Host "   2. Join a meeting → Select 'Join with LiveKit'" -ForegroundColor White
Write-Host "   3. Monitor real-time metrics in admin panel" -ForegroundColor White
Write-Host ""
Write-Host "🔍 API Health Check:" -ForegroundColor Cyan
Write-Host "   Backend API: http://localhost:3000/api/metrics/public/hourly" -ForegroundColor White
Write-Host "   Should return JSON data (may be empty initially)" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 LiveKit Dashboard Features:" -ForegroundColor Cyan
Write-Host "   ✅ Real-time bandwidth monitoring" -ForegroundColor White
Write-Host "   ✅ Connection quality analytics" -ForegroundColor White
Write-Host "   ✅ Active meetings tracking" -ForegroundColor White
Write-Host "   ✅ Performance metrics aggregation" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")