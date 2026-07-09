Write-Host "`n=== KickSneak - Full Restart & Browser Launch ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/5] Removing all containers and volumes (down -v)..." -ForegroundColor Yellow
docker compose down -v
Write-Host ""

Write-Host "[2/5] Starting containers (up -d)..." -ForegroundColor Yellow
docker compose up -d
Write-Host ""

Write-Host "[3/5] Waiting for core infrastructure (Elasticsearch)..." -ForegroundColor Yellow
$maxRetries = 40
$retry = 0
do {
    Start-Sleep -Seconds 5
    $retry++
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:9200/_cluster/health" -TimeoutSec 3 -ErrorAction Stop
        $status = $health.status
        Write-Host "  Elastic status: $status (attempt $retry/$maxRetries)"
        if ($status -eq "green" -or $status -eq "yellow") { break }
    } catch {
        Write-Host "  Elastic not ready yet... (attempt $retry/$maxRetries)"
    }
} while ($retry -lt $maxRetries)

Write-Host ""
Write-Host "[4/5] Waiting for APIs and Apps..." -ForegroundColor Yellow
Start-Sleep -Seconds 10 # Give backend and frontend a moment to boot

$urlsToCheck = @(
    "http://localhost:5005/swagger/index.html",
    "http://localhost:3000",
    "http://localhost:3002",
    "http://localhost:5601/api/status",
    "http://localhost:3001/api/health"
)

foreach ($url in $urlsToCheck) {
    Write-Host "  Checking $url"
    $retry = 0
    do {
        Start-Sleep -Seconds 3
        $retry++
        try {
            $resp = curl.exe -s -f $url
            if ($LASTEXITCODE -eq 0) {
                Write-Host "    -> OK!" -ForegroundColor Green
                break
            } else {
                throw "HTTP Error"
            }
        } catch {
            Write-Host "    -> Waiting... (attempt $retry/20)"
        }
    } while ($retry -lt 20)
}

Write-Host ""
Write-Host "[5/5] Opening Browser Tabs..." -ForegroundColor Yellow

$urlsToOpen = @(
    "http://localhost:3001/dashboards",        # Grafana
    "http://localhost:5601/app/discover",      # Kibana
    "http://localhost:3002",                   # Admin V2
    "http://localhost:3000",                   # Client App
    "http://localhost:5005/swagger/index.html" # Backend Swagger
)

foreach ($url in $urlsToOpen) {
    Start-Process $url
}

Write-Host ""
Write-Host "All done! Enjoy your clean workspace." -ForegroundColor Green
Write-Host ""
