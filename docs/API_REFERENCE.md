# API Reference

**Base URL:** `https://brewchrome-backend-736130833520.us-central1.run.app`  
**Version:** v1.1  
**Content-Type:** `application/json`  

## Authentication

Optional HMAC signature validation (enabled via `REQUIRE_SIGNATURE=true`):

```http
X-Timestamp: 1758640038
X-Signature: sha256=abc123...
X-Request-Id: unique-nonce
```

## Endpoints

### Health & Monitoring

#### GET /health
Health check endpoint.

**Response 200:**
```json
{
  "status": "healthy",
  "service": "brewchrome-react-backend",
  "version": "1.0.0",
  "features": ["colorthief", "zip_processing", "react_optimized"],
  "uptime_seconds": 3600
}
```

#### GET /ready
Readiness check with dependency validation.

**Response 200:**
```json
{
  "ready": true,
  "dependencies": {
    "disk": true,
    "mem": true,
    "colorthief": true,
    "smartcrop": true
  },
  "uptime_seconds": 3600,
  "active_requests": 0,
  "error_rate_last_5m": null
}
```

#### GET /metrics
Prometheus metrics endpoint.

**Response 200:**
```
# HELP requests_total HTTP requests total
# TYPE requests_total counter
requests_total{endpoint="/process",code="200"} 42.0
...
```

### Image Processing

#### POST /process
Process single image synchronously.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA..."
}
```

**Response 200:**
```json
{
  "success": true,
  "palette": [
    {"r": 255, "g": 0, "b": 0},
    {"r": 0, "g": 255, "b": 0}
  ],
  "social_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

#### POST /process_zip
Process ZIP file synchronously.

**Request (multipart/form-data):**
```
zip_file: <binary ZIP data>
```

**Response 200:**
```json
{
  "success": true,
  "results": [
    {
      "filename": "image1.jpg",
      "palette": [{"r": 255, "g": 0, "b": 0}],
      "social_image": "data:image/png;base64,..."
    }
  ],
  "processed_count": 1
}
```

#### POST /fetch_url
Fetch and process image from URL.

**Request:**
```json
{
  "url": "https://example.com/image.jpg"
}
```

**Response 200:**
```json
{
  "success": true,
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...",
  "content_type": "image/jpeg",
  "size_mb": 2.5
}
```

### Async Job System

#### POST /jobs
Create asynchronous job for batch processing.

**Request Headers:**
```http
Idempotency-Key: unique-key-123
```

**Request (JSON):**
```json
{
  "urls": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  "callback_url": "https://webhook.site/unique-id",
  "ttl_h": 24
}
```

**Request (multipart/form-data):**
```
zip_file: <binary ZIP data>
callback_url: https://webhook.site/unique-id
ttl_h: 24
```

**Response 202:**
```json
{
  "job_id": "job_abc123",
  "status": "queued",
  "eta_s": 120,
  "request_id": "xyz789"
}
```

#### GET /jobs/{job_id}
Get job status and results.

**Response Headers:**
```http
ETag: "abc123"
Retry-After: 5
Cache-Control: no-store
```

**Response 200 (Processing):**
```json
{
  "job_id": "job_abc123",
  "status": "processing",
  "progress": 60,
  "request_id": "xyz789",
  "created_at": 1758640038,
  "started_at": 1758640040,
  "expires_at": 1758726438
}
```

**Response 200 (Completed):**
```json
{
  "job_id": "job_abc123",
  "status": "completed",
  "request_id": "xyz789",
  "created_at": 1758640038,
  "started_at": 1758640040,
  "finished_at": 1758640100,
  "expires_at": 1758726438,
  "results": [
    {
      "filename": "image1.jpg",
      "palette": [{"r": 255, "g": 0, "b": 0}],
      "social_image": "data:image/png;base64,..."
    }
  ],
  "results_count": 1,
  "download_url": "https://storage.googleapis.com/brewchrome/jobs/job_abc123/results.zip",
  "download_expires_at": 1758643638
}
```

**Response 304 (Not Modified):**
```http
Status: 304 Not Modified
ETag: "abc123"
Retry-After: 5
```

**Response 200 (Failed):**
```json
{
  "job_id": "job_abc123",
  "status": "failed",
  "request_id": "xyz789",
  "created_at": 1758640038,
  "started_at": 1758640040,
  "finished_at": 1758640050,
  "expires_at": 1758726438,
  "error_code": "PROCESSING_ERROR",
  "message": "Image processing failed",
  "user_message": "Job failed: Image processing failed"
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error_code": "PAYLOAD_TOO_LARGE",
  "user_message": "File exceeds 50MB limit",
  "request_id": "xyz789",
  "timestamp": 1758640038
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NO_INPUT` | 400 | Missing required input |
| `INVALID_INPUT` | 400 | Invalid request format |
| `INVALID_URL` | 400 | Malformed or blocked URL |
| `PAYLOAD_TOO_LARGE` | 413 | File size limit exceeded |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Invalid content type |
| `PROCESSING_ERROR` | 422 | Input valid but not processable |
| `ZIP_TRAVERSAL` | 422 | Invalid ZIP file path |
| `URL_TIMEOUT` | 408 | Download timeout exceeded |
| `UPSTREAM_ERROR` | 502 | External service error |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `JOB_NOT_FOUND` | 404 | Job ID not found |
| `EXPIRED_JOB` | 404 | Job results expired |
| `IDEMPOTENCY_VIOLATION` | 409 | Duplicate key with different body |
| `INVALID_SIGNATURE` | 401 | HMAC verification failed |
| `TIMESTAMP_OUT_OF_RANGE` | 401 | Request timestamp invalid |
| `NONCE_REUSED` | 401 | Request ID already used |

## Webhook Callbacks

When `callback_url` is provided, the system sends POST requests on job completion:

**Headers:**
```http
Content-Type: application/json
X-Signature: sha256=abc123...
X-Timestamp: 1758640100
X-Authed: true
User-Agent: BrewChrome-Webhook/1.0
```

**Payload (Completed):**
```json
{
  "job_id": "job_abc123",
  "status": "completed",
  "request_id": "xyz789",
  "created_at": 1758640038,
  "finished_at": 1758640100,
  "results_count": 3,
  "download_url": "https://storage.googleapis.com/...",
  "timestamp": 1758640100
}
```

**Payload (Failed):**
```json
{
  "job_id": "job_abc123",
  "status": "failed",
  "request_id": "xyz789",
  "created_at": 1758640038,
  "finished_at": 1758640050,
  "error": {
    "error_code": "PROCESSING_ERROR",
    "message": "Processing failed"
  },
  "timestamp": 1758640050
}
```

## Rate Limits

Currently no rate limiting implemented. Planned for v1.2.

## SDKs & Examples

See frontend implementation in `/src/services/api.ts` for TypeScript/JavaScript examples.
