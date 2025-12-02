# PowerShell script to check metrics status

Write-Host "Checking Metrics Status..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Redis Buffer Size:" -ForegroundColor Yellow
redis-cli LLEN metrics:buffer
Write-Host ""

Write-Host "2. Redis Buffer Sample (last 3 items):" -ForegroundColor Yellow
redis-cli LRANGE metrics:buffer 0 2
Write-Host ""

Write-Host "3. Real-time Metrics Keys:" -ForegroundColor Yellow
$keys = redis-cli KEYS "metrics:realtime:*"
if ($keys) {
    $keys | ForEach-Object { Write-Host $_ }
} else {
    Write-Host "No real-time metrics found yet" -ForegroundColor Gray
}
Write-Host ""

Write-Host "4. Sample Real-time Metric:" -ForegroundColor Yellow
$firstKey = redis-cli KEYS "metrics:realtime:*" | Select-Object -First 1
if ($firstKey) {
    Write-Host "Key: $firstKey" -ForegroundColor Gray
    redis-cli HGETALL $firstKey
} else {
    Write-Host "No real-time metrics found yet" -ForegroundColor Gray
}
Write-Host ""

Write-Host "5. Last Persist Time:" -ForegroundColor Yellow
$lastPersist = redis-cli GET metrics:last_persist
if ($lastPersist) {
    $timestamp = [long]$lastPersist
    $date = [DateTimeOffset]::FromUnixTimeMilliseconds($timestamp).LocalDateTime
    Write-Host "Timestamp: $lastPersist" -ForegroundColor Gray
    Write-Host "Date: $date" -ForegroundColor Gray
} else {
    Write-Host "Not set yet" -ForegroundColor Gray
}
Write-Host ""

Write-Host "Check complete!" -ForegroundColor Green

