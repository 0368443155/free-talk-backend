# Rollback Database Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database Rollback Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get database credentials from .env
$envFile = "talkplatform-backend\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    Write-Host "Please check database manually" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Reading database configuration..." -ForegroundColor Yellow

$dbHost = "localhost"
$dbPort = "3306"
$dbUser = ""
$dbPassword = ""
$dbName = ""

Get-Content $envFile | ForEach-Object {
    if ($_ -match "DATABASE_HOST=(.+)") { $dbHost = $matches[1].Trim() }
    if ($_ -match "DATABASE_PORT=(.+)") { $dbPort = $matches[1].Trim() }
    if ($_ -match "DATABASE_USER=(.+)") { $dbUser = $matches[1].Trim() }
    if ($_ -match "DATABASE_PASSWORD=(.+)") { $dbPassword = $matches[1].Trim() }
    if ($_ -match "DATABASE_NAME=(.+)") { $dbName = $matches[1].Trim() }
}

if (-not $dbUser -or -not $dbName) {
    Write-Host "❌ Missing database credentials" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Database: $dbName @ $dbHost:$dbPort" -ForegroundColor Green
Write-Host ""

Write-Host "📊 Checking database state..." -ForegroundColor Yellow
Write-Host ""

# Create check script
$checkScript = @"
SELECT 'Migrations:' as info;
SELECT name FROM migrations ORDER BY timestamp DESC LIMIT 5;

SELECT 'Tables:' as info;
SHOW TABLES LIKE '%classroom%';

SELECT 'Meetings:' as info;
SELECT COUNT(*) as total FROM meetings;
"@

$checkScript | Out-File -FilePath "temp-check.sql" -Encoding UTF8

# Run check
try {
    if ($dbPassword) {
        Get-Content "temp-check.sql" | mysql -h $dbHost -P $dbPort -u $dbUser "-p$dbPassword" $dbName 2>&1
    } else {
        Get-Content "temp-check.sql" | mysql -h $dbHost -P $dbPort -u $dbUser $dbName 2>&1
    }
} catch {
    Write-Host "⚠️  Could not connect to database" -ForegroundColor Yellow
}

Remove-Item "temp-check.sql" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "MANUAL ROLLBACK INSTRUCTIONS" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Nếu có bảng 'classroom_chat_messages':" -ForegroundColor Yellow
Write-Host "  DROP TABLE IF EXISTS classroom_chat_messages;" -ForegroundColor White
Write-Host ""
Write-Host "Nếu meeting_type bị thay đổi:" -ForegroundColor Yellow
Write-Host "  ALTER TABLE meetings" -ForegroundColor White
Write-Host "  MODIFY COLUMN meeting_type enum('class','free_talk') DEFAULT 'class';" -ForegroundColor White
Write-Host ""
Write-Host "Xóa migrations đã chạy:" -ForegroundColor Yellow  
Write-Host "  DELETE FROM migrations WHERE name LIKE '%Classroom%';" -ForegroundColor White
Write-Host "  DELETE FROM migrations WHERE name LIKE '%FreeTalk%';" -ForegroundColor White
Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Xem file ROLLBACK-DATABASE.sql để có đầy đủ commands" -ForegroundColor Green
Write-Host ""

$runNow = Read-Host "Bạn có muốn tôi chạy rollback tự động không? (y/N)"
if ($runNow -eq "y" -or $runNow -eq "Y") {
    Write-Host ""
    Write-Host "🚀 Running rollback..." -ForegroundColor Cyan
    
    $rollbackScript = @"
-- Drop classroom table if exists
DROP TABLE IF EXISTS classroom_chat_messages;

-- Delete classroom migrations
DELETE FROM migrations WHERE name LIKE '%Classroom%';
DELETE FROM migrations WHERE name LIKE '%FreeTalk%';
DELETE FROM migrations WHERE name LIKE '%AddMeetingType%';

-- Show remaining migrations
SELECT name FROM migrations ORDER BY timestamp DESC LIMIT 5;
"@
    
    $rollbackScript | Out-File -FilePath "temp-rollback.sql" -Encoding UTF8
    
    try {
        if ($dbPassword) {
            Get-Content "temp-rollback.sql" | mysql -h $dbHost -P $dbPort -u $dbUser "-p$dbPassword" $dbName 2>&1
        } else {
            Get-Content "temp-rollback.sql" | mysql -h $dbHost -P $dbPort -u $dbUser $dbName 2>&1
        }
        
        Write-Host ""
        Write-Host "✅ Rollback completed!" -ForegroundColor Green
        
    } catch {
        Write-Host ""
        Write-Host "❌ Error during rollback" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
    
    Remove-Item "temp-rollback.sql" -ErrorAction SilentlyContinue
} else {
    Write-Host "⏭️  Skipped automatic rollback" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Code đã rollback về commit 3a8e3c8" -ForegroundColor Green
Write-Host "✅ Kiểm tra database và chạy rollback nếu cần" -ForegroundColor Green
Write-Host ""
