$ErrorActionPreference = "Stop"

$baseUrl = $env:LUMI_BASE_URL
if (-not $baseUrl) {
  $baseUrl = "http://127.0.0.1:3000"
}

Write-Output "Checking $baseUrl/api/health"
Invoke-RestMethod "$baseUrl/api/health"

Write-Output "Checking $baseUrl/api/chat"
$body = @{
  messages = @(
    @{ role = "user"; content = "Xin chao, hay gioi thieu ngan ve Lumi." }
  )
} | ConvertTo-Json -Depth 4

try {
  Invoke-RestMethod "$baseUrl/api/chat" -Method Post -ContentType "application/json" -Body $body
} catch {
  Write-Output "Chat endpoint returned an expected error if no API key is configured:"
  Write-Output $_.Exception.Message
}
