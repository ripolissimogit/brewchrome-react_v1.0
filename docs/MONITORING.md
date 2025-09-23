# Monitoring & Observability

**Metrics Endpoint:** `/metrics`  
**Log Format:** Structured JSON  
**Correlation:** Request ID end-to-end  

## Prometheus Metrics

### HTTP Metrics
```
requests_total{endpoint,code}              # Total HTTP requests
request_duration_ms{endpoint}              # Request duration histogram
errors_total{endpoint,error_code}          # Error count by type
```

### Job System Metrics
```
jobs_total{type}                          # Jobs created by type
jobs_completed_total{status}              # Jobs completed by status
jobs_status_total{status}                 # Current job distribution
jobs_queue_latency_seconds                # Time in queue (histogram)
jobs_processing_duration_seconds          # Processing time (histogram)
images_processed_total{endpoint}          # Images processed count
```

### Security Metrics
```
idempotency_conflicts_total               # Duplicate key conflicts
status_poll_304_total                     # ETag cache hits
webhook_delivery_latency_seconds          # Webhook response time
webhook_failures_total{reason}            # Webhook failures by reason
retry_after_seconds_observed_total{seconds} # Server polling hints
```

### System Metrics
```
python_gc_objects_collected_total{generation} # Python GC stats
process_resident_memory_bytes              # Memory usage
process_cpu_seconds_total                  # CPU usage
```

## Service Level Objectives (SLOs)

### Availability
- **Target:** 99.9% uptime
- **Measurement:** HTTP 200 responses / total requests
- **Alert:** < 99.5% over 5 minutes

### Performance
- **Job Queue Latency:** p95 < 60 seconds
- **Processing Duration:** p95 < 300 seconds  
- **HTTP Response Time:** p95 < 2 seconds
- **Webhook Delivery:** p95 < 5 seconds

### Reliability
- **Error Rate:** < 1% of total requests
- **Job Success Rate:** > 95% completion
- **ETag Cache Hit Ratio:** > 60%

## Alert Configuration

### High Priority (P0)
```yaml
# Service Down
up == 0
for: 1m
severity: critical

# High Error Rate  
rate(errors_total[5m]) / rate(requests_total[5m]) > 0.05
for: 2m
severity: critical

# Queue Latency SLO Breach
histogram_quantile(0.95, jobs_queue_latency_seconds) > 60
for: 5m
severity: critical
```

### Medium Priority (P1)
```yaml
# Webhook Failures
rate(webhook_failures_total[5m]) > 0.1
for: 5m
severity: warning

# Processing Duration SLO Breach
histogram_quantile(0.95, jobs_processing_duration_seconds) > 300
for: 10m
severity: warning

# Idempotency Conflicts
rate(idempotency_conflicts_total[5m]) > 0.05
for: 5m
severity: warning
```

### Low Priority (P2)
```yaml
# Low ETag Cache Hit Ratio
rate(status_poll_304_total[10m]) / rate(requests_total{endpoint="/jobs"}[10m]) < 0.3
for: 15m
severity: info

# High Memory Usage
process_resident_memory_bytes > 1e9
for: 10m
severity: info
```

## Logging

### Log Format
```json
{
  "ts": "2025-09-23T15:04:32.102679Z",
  "level": "info",
  "event": "http_request",
  "request_id": "c298c805",
  "endpoint": "/jobs",
  "method": "POST",
  "status_code": 202,
  "duration_ms": 15,
  "success": null,
  "error_code": null,
  "bytes_in": 39,
  "bytes_out": 79
}
```

### Log Levels
- **ERROR**: Application errors, security violations
- **WARN**: Recoverable errors, degraded performance
- **INFO**: Normal operations, HTTP requests
- **DEBUG**: Detailed debugging information

### Key Events
- `http_request` - All HTTP requests with timing
- `http_error` - Error responses with details
- `job_created` - Async job creation
- `job_completed` - Job completion with results
- `webhook_delivered` - Webhook callback success
- `security_violation` - Authentication failures

## Dashboards

### Operational Dashboard
- Request rate and error rate
- Response time percentiles
- Job queue depth and processing rate
- System resource utilization

### Security Dashboard  
- Authentication failure rate
- Idempotency conflict rate
- Webhook delivery success rate
- Suspicious activity patterns

### Business Dashboard
- Images processed per hour
- Job completion rate
- Popular processing types
- User engagement metrics

## Health Checks

### Liveness Probe
```
GET /health
Expected: 200 OK
Frequency: 30s
Timeout: 5s
```

### Readiness Probe
```
GET /ready  
Expected: 200 OK (all dependencies healthy)
Frequency: 10s
Timeout: 3s
```

### Dependency Checks
- **Disk Space:** > 1GB available
- **Memory:** < 80% utilization
- **Libraries:** colorthief, smartcrop importable
- **Worker Threads:** Executor responsive

## Tracing

### Request Correlation
- **X-Request-Id:** Generated per request
- **Propagation:** Frontend → Backend → Logs
- **Format:** 8-character hex string
- **Usage:** Error reporting, debugging

### Distributed Tracing
Currently not implemented. Planned for v1.2 with OpenTelemetry.

## Runbook

### Common Issues

#### High Error Rate
1. Check `/metrics` for error breakdown
2. Review recent deployments
3. Validate external dependencies
4. Scale resources if needed

#### Job Queue Backup
1. Monitor `jobs_queue_latency_seconds`
2. Check worker thread health
3. Review job complexity/size
4. Consider scaling workers

#### Webhook Failures
1. Check `webhook_failures_total` by reason
2. Validate callback URLs
3. Review signature validation
4. Implement retry logic (v1.2)

### Escalation
- **P0 (Critical):** Immediate response, all hands
- **P1 (High):** 1 hour response time
- **P2 (Medium):** Next business day
- **P3 (Low):** Weekly review

## Performance Baselines

### Typical Load
- **Requests/minute:** 100-500
- **Jobs/hour:** 10-50
- **Images/job:** 1-20
- **Response time:** p95 < 500ms

### Peak Load
- **Requests/minute:** 1000+
- **Jobs/hour:** 100+
- **Images/job:** 50+
- **Response time:** p95 < 2s

### Resource Usage
- **Memory:** 200-500MB baseline
- **CPU:** 10-30% baseline
- **Disk:** < 1GB temporary files
- **Network:** 10-100MB/hour
