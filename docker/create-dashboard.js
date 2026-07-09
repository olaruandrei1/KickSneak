const http = require('http');

const GRAFANA_URL = 'http://localhost:3001';
const AUTH = 'Basic ' + Buffer.from('admin:kicksneak').toString('base64');

async function request(method, path, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(GRAFANA_URL + path, {
            method: method,
            headers: {
                'Authorization': AUTH,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body || '{}'));
                } else {
                    console.log(`Failed ${method} ${path}: ${res.statusCode} ${body}`);
                    resolve(null);
                }
            });
        });
        req.on('error', reject);
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function main() {
    console.log("Adding Prometheus Datasource...");
    await request('POST', '/api/datasources', {
        name: 'Prometheus',
        type: 'prometheus',
        url: 'http://prometheus:9090',
        access: 'proxy',
        isDefault: true
    });

    console.log("Adding Loki Datasource...");
    await request('POST', '/api/datasources', {
        name: 'Loki',
        type: 'loki',
        url: 'http://loki:3100',
        access: 'proxy'
    });

    console.log("Creating Complex Dashboard...");
    
    // Panel factory helpers
    const basePanel = (id, title, gridPos) => ({ id, title, gridPos, datasource: "Prometheus" });

    const dashboard = {
        title: "KickSneak Master Observability",
        timezone: "browser",
        refresh: "5s",
        schemaVersion: 38,
        panels: [
            // Row 1: Key Stats
            {
                ...basePanel(1, "Total Requests (5m)", { h: 5, w: 4, x: 0, y: 0 }),
                type: "stat",
                targets: [{ expr: "sum(increase(http_server_request_duration_seconds_count[5m]))", legendFormat: "Requests" }],
                options: { colorMode: "value", graphMode: "area", justifyMode: "auto", reduceOptions: { calcs: ["lastNotNull"] } },
                fieldConfig: { defaults: { color: { mode: "thresholds" }, thresholds: { mode: "absolute", steps: [{ color: "green", value: null }] } } }
            },
            {
                ...basePanel(2, "Error Rate (5m)", { h: 5, w: 4, x: 4, y: 0 }),
                type: "stat",
                targets: [{ 
                    expr: 'sum(rate(http_server_request_duration_seconds_count{code=~"5.."}[5m])) / sum(rate(http_server_request_duration_seconds_count[5m])) * 100',
                    legendFormat: "Errors %" 
                }],
                options: { colorMode: "background", justifyMode: "auto", reduceOptions: { calcs: ["lastNotNull"] } },
                fieldConfig: { defaults: { unit: "percent", thresholds: { mode: "absolute", steps: [{ color: "green", value: null }, { color: "red", value: 5 }] } } }
            },
            {
                ...basePanel(3, "Active Connections", { h: 5, w: 4, x: 8, y: 0 }),
                type: "stat",
                targets: [{ expr: "kestrel_active_connections", legendFormat: "Connections" }],
                options: { colorMode: "value", graphMode: "area" }
            },
            {
                ...basePanel(4, "Status Codes", { h: 10, w: 6, x: 12, y: 0 }),
                type: "piechart",
                targets: [{ expr: "sum(rate(http_server_request_duration_seconds_count[5m])) by (code)", legendFormat: "{{code}}" }],
                options: { pieType: "donut", displayLabels: ["percent", "name"], legend: { displayMode: "table", placement: "right" } }
            },
            {
                ...basePanel(5, "Database Connections", { h: 5, w: 6, x: 18, y: 0 }),
                type: "gauge",
                targets: [{ expr: "dotnet_active_db_connections", legendFormat: "DB Conns" }],
                options: { reduceOptions: { calcs: ["lastNotNull"] } },
                fieldConfig: { defaults: { min: 0, max: 100, thresholds: { steps: [{ color: "green", value: null }, { color: "orange", value: 70 }, { color: "red", value: 90 }] } } }
            },
            {
                ...basePanel(6, "CPU Usage", { h: 5, w: 6, x: 18, y: 5 }),
                type: "gauge",
                targets: [{ expr: "system_runtime_cpu_usage", legendFormat: "CPU %" }],
                options: { reduceOptions: { calcs: ["lastNotNull"] } },
                fieldConfig: { defaults: { min: 0, max: 100, unit: "percent", thresholds: { steps: [{ color: "green", value: null }, { color: "red", value: 80 }] } } }
            },

            // Row 2: Charts
            {
                ...basePanel(7, "HTTP Requests Rate", { h: 8, w: 12, x: 0, y: 10 }),
                type: "timeseries",
                targets: [{ expr: "sum(rate(http_server_request_duration_seconds_count[1m])) by (route)", legendFormat: "{{route}}" }],
                fieldConfig: { defaults: { custom: { fillOpacity: 10, lineWidth: 2 } } }
            },
            {
                ...basePanel(8, "Memory Working Set", { h: 8, w: 12, x: 12, y: 10 }),
                type: "timeseries",
                targets: [{ expr: "system_runtime_working_set", legendFormat: "Memory" }],
                fieldConfig: { defaults: { unit: "bytes", custom: { fillOpacity: 20, lineWidth: 2, gradientMode: "opacity" } } }
            },

            // Row 3: Logs
            {
                ...basePanel(9, "Application Logs (Loki)", { h: 10, w: 24, x: 0, y: 18 }),
                type: "logs",
                datasource: "Loki",
                targets: [{ expr: '{job="backend"} | json' }],
                options: { showTime: true, showLabels: false, wrapLogMessage: true }
            }
        ]
    };

    const res = await request('POST', '/api/dashboards/db', {
        dashboard: dashboard,
        overwrite: true
    });

    if (res && res.url) {
        console.log("Dashboard created successfully at: " + GRAFANA_URL + res.url);
    }
}

main().catch(console.error);
