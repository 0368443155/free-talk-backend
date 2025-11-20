$path = "d:\LamHoang\4talk\free-talk\talkplatform-frontend\section\meetings\meeting-room.tsx"
$content = Get-Content $path -Raw
$target = 'console.log("Triggering auto-join...");'
$replacement = 'console.log("Triggering auto-join with LiveKit...");
      setUseLiveKit(true);
      setLivekitPhase("meeting");
      setShowGreenRoom(false);'
$newContent = $content.Replace($target, $replacement)
$newContent | Set-Content $path -NoNewline
Write-Host "File updated successfully."
