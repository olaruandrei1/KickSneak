Write-Host "`n=== KickSneak - Test Elastic + Grafana Stack ===" -ForegroundColor Cyan
Write-Host ""

# 1. Start containers
Write-Host "[1/4] Starting containers..." -ForegroundColor Yellow
docker compose -f docker-compose.test.yml up -d
Write-Host ""

# 2. Wait for Elasticsearch to be healthy
Write-Host "[2/4] Waiting for Elasticsearch..." -ForegroundColor Yellow
$maxRetries = 30
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
        Write-Host "  Not ready yet... (attempt $retry/$maxRetries)"
    }
} while ($retry -lt $maxRetries)

if ($retry -ge $maxRetries) {
    Write-Host "  ERROR: Elasticsearch did not become healthy" -ForegroundColor Red
    exit 1
}
Write-Host "  Elasticsearch OK!" -ForegroundColor Green
Write-Host ""

# 3. Wait for Kibana
Write-Host "[3/4] Waiting for Kibana (takes 30-60s)..." -ForegroundColor Yellow
$retry = 0
do {
    Start-Sleep -Seconds 5
    $retry++
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:5601/api/status" -TimeoutSec 3 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            Write-Host "  Kibana OK!" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "  Kibana loading... (attempt $retry/$maxRetries)"
    }
} while ($retry -lt $maxRetries)
Write-Host ""

# 4. Check Grafana + Loki
Write-Host "[4/4] Checking Grafana + Loki..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $grafana = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "  Grafana OK!" -ForegroundColor Green
} catch {
    Write-Host "  Grafana not ready yet - give it a few more seconds" -ForegroundColor Yellow
}

try {
    $loki = Invoke-WebRequest -Uri "http://localhost:3100/ready" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "  Loki OK!" -ForegroundColor Green
} catch {
    Write-Host "  Loki not ready yet" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "=== OPEN IN BROWSER ===" -ForegroundColor Cyan
Write-Host "  Kibana:     http://localhost:5601" -ForegroundColor White
Write-Host "  Grafana:    http://localhost:3001  (admin / kicksneak)" -ForegroundColor White
Write-Host "  Prometheus: http://localhost:9090" -ForegroundColor White
Write-Host "  Elastic:    http://localhost:9200" -ForegroundColor White
Write-Host ""
Write-Host "To stop: docker compose -f docker-compose.test.yml down" -ForegroundColor DarkGray
