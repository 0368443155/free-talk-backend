# PowerShell script to check WebRTC metrics status in Redis

Write-Host "Checking WebRTC Metrics Status..." -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Meeting Metrics Keys:" -ForegroundColor Yellow
$keys = redis-cli KEYS "meeting:*:user:*:metrics"
if ($keys) {
    Write-Host "Found $($keys.Count) user metrics" -ForegroundColor Green
    $keys | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "No meeting metrics found yet" -ForegroundColor Gray
}
Write-Host ""

Write-Host "2. Sample User Metrics:" -ForegroundColor Yellow
$firstKey = redis-cli KEYS "meeting:*:user:*:metrics" | Select-Object -First 1
if ($firstKey) {
    Write-Host "Key: $firstKey" -ForegroundColor Gray
    $data = redis-cli GET $firstKey
    if ($data) {
        Write-Host "Data: $data" -ForegroundColor Gray
        try {
            $json = $data | ConvertFrom-Json
            Write-Host "Parsed:" -ForegroundColor Gray
            Write-Host "  Upload Bitrate: $($json.uploadBitrate) kbps" -ForegroundColor Green
            Write-Host "  Download Bitrate: $($json.downloadBitrate) kbps" -ForegroundColor Green
            Write-Host "  Latency: $($json.latency) ms" -ForegroundColor Green
            Write-Host "  Quality: $($json.quality)" -ForegroundColor Green
            Write-Host "  Using Relay: $($json.usingRelay)" -ForegroundColor $(if ($json.usingRelay) { "Yellow" } else { "Green" })
            Write-Host "  Packet Loss: $($json.packetLoss)%" -ForegroundColor Green
        } catch {
            Write-Host "Could not parse JSON" -ForegroundColor Red
        }
    } else {
        Write-Host "No data found" -ForegroundColor Gray
    }
} else {
    Write-Host "No metrics found yet" -ForegroundColor Gray
}
Write-Host ""

Write-Host "3. All Meeting IDs:" -ForegroundColor Yellow
$meetingKeys = redis-cli KEYS "meeting:*:user:*:metrics" | ForEach-Object {
    if ($_ -match "meeting:([^:]+):user") {
        $matches[1]
    }
} | Sort-Object -Unique
if ($meetingKeys) {
    $meetingKeys | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "No meetings found" -ForegroundColor Gray
}
Write-Host ""

Write-Host "4. Metrics Count by Meeting:" -ForegroundColor Yellow
if ($meetingKeys) {
    foreach ($meetingId in $meetingKeys) {
        $count = (redis-cli KEYS "meeting:$meetingId:user:*:metrics").Count
        Write-Host "  $meetingId : $count users" -ForegroundColor Gray
    }
} else {
    Write-Host "No meetings found" -ForegroundColor Gray
}
Write-Host ""

Write-Host "5. TTL Check (Time to Live):" -ForegroundColor Yellow
if ($firstKey) {
    $ttl = redis-cli TTL $firstKey
    if ($ttl -gt 0) {
        $minutes = [math]::Floor($ttl / 60)
        $seconds = $ttl % 60
        Write-Host "TTL: $ttl seconds ($minutes minutes $seconds seconds)" -ForegroundColor Gray
    } else {
        Write-Host "TTL: Expired or no TTL set" -ForegroundColor Yellow
    }
} else {
    Write-Host "No metrics found to check TTL" -ForegroundColor Gray
}
Write-Host ""

Write-Host "Check complete!" -ForegroundColor Green

