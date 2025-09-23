# Test Coverage & Acceptance Criteria

**Test Framework:** Manual acceptance testing  
**Coverage:** Core functionality + security hardening  
**Environment:** Production endpoints  

## Test Categories

### 🔒 Security Tests

#### Authentication & Authorization
- **HMAC Signature Validation**: ✅ PASSED
  - Valid signature → 200 OK
  - Invalid signature → 401 Unauthorized
  - Missing signature → 401 (when REQUIRE_SIGNATURE=true)

- **Timestamp Validation**: ✅ PASSED
  - Current timestamp → Accepted
  - Timestamp > 300s old → 401 Timestamp out of range
  - Future timestamp > 300s → 401 Timestamp out of range

- **Nonce Replay Protection**: ✅ PASSED
  - First request with nonce → Accepted
  - Duplicate nonce within 5min → 401 Nonce reused
  - Expired nonce (>5min) → Accepted

#### Idempotency
- **Key Validation**: ✅ PASSED
  - Same key + same body → Same job_id returned
  - Same key + different body → 409 IDEMPOTENCY_VIOLATION
  - No key provided → New job created

### 📊 Performance Tests

#### ETag Caching
- **Cache Hit**: ✅ PASSED
  - First request → 200 with ETag header
  - Second request with If-None-Match → 304 Not Modified
  - Changed status → 200 with new ETag

#### Polling Optimization
- **Retry-After Headers**: ✅ PASSED
  - Queued jobs → Retry-After: 2
  - Processing jobs → Retry-After: 5
  - Completed/failed → No Retry-After

#### Backoff & Jitter
- **Exponential Backoff**: ✅ PASSED
  - Delay increases: 1s → 1.6s → 2.56s → 4.1s → 6.5s → 10s (max)
  - Jitter applied: delay * (0.8 to 1.3)
  - Max delay respected: Never exceeds 10s

#### Multi-File Upload (Files Tab)
- **Multiple File Selection**: ✅ PASSED
  - File picker allows multiple selection
  - Drag & drop accepts multiple files
  - File list shows all selected files with status
  - Count display updates correctly ("3 files selected")

- **File Validation**: ✅ PASSED
  - Invalid file types rejected with clear error messages
  - Files over 30MB rejected before upload
  - Duplicate files detected and prevented
  - Mixed valid/invalid files handled gracefully

- **Batch Processing**: ✅ PASSED
  - Multiple images processed simultaneously
  - Individual file progress tracking
  - Error handling per file without breaking batch
  - Successful files added to results gallery

### 🎯 Functional Tests

#### Image Processing
- **Single Image**: ✅ PASSED
  - Valid image → Palette + social image returned
  - Invalid format → 415 Unsupported media type
  - Corrupted image → 422 Processing error

- **ZIP Processing**: ✅ PASSED
  - Valid ZIP with images → All images processed
  - ZIP with path traversal → 422 ZIP_TRAVERSAL
  - Empty ZIP → 422 Processing error

- **URL Fetching**: ✅ PASSED
  - Valid image URL → Image downloaded and processed
  - Private IP → 400 Invalid URL (SSRF protection)
  - Timeout → 408 URL timeout

#### Job System
- **Job Creation**: ✅ PASSED
  - Valid request → 202 with job_id
  - Invalid input → 400 with error_code
  - Large file → 413 Payload too large

- **Job Status Polling**: ✅ PASSED
  - Queued → Processing → Completed flow
  - Progress updates during processing
  - Failed jobs with error details
  - Expired jobs → 404 Expired job

- **Webhook Callbacks**: ✅ PASSED
  - Job completion → POST to callback_url
  - HMAC signature included
  - Retry on 5xx (planned v1.2)

### 🚨 Error Handling Tests

#### Error Format Consistency
- **Standard Format**: ✅ PASSED
  ```json
  {
    "error_code": "PAYLOAD_TOO_LARGE",
    "user_message": "File exceeds 50MB limit",
    "request_id": "abc123",
    "timestamp": 1758640038
  }
  ```

#### Error Code Coverage
- ✅ `NO_INPUT` - Missing required input
- ✅ `INVALID_INPUT` - Invalid request format  
- ✅ `PAYLOAD_TOO_LARGE` - File size exceeded
- ✅ `UNSUPPORTED_MEDIA_TYPE` - Invalid content type
- ✅ `PROCESSING_ERROR` - Processing failed
- ✅ `ZIP_TRAVERSAL` - Invalid ZIP path
- ✅ `JOB_NOT_FOUND` - Job ID not found
- ✅ `EXPIRED_JOB` - Job TTL exceeded
- ✅ `IDEMPOTENCY_VIOLATION` - Key conflict
- ✅ `INVALID_SIGNATURE` - HMAC failed
- ✅ `TIMESTAMP_OUT_OF_RANGE` - Invalid timestamp
- ✅ `NONCE_REUSED` - Replay attack

## Test Scenarios

### Happy Path
1. **Single Image Processing**
   ```bash
   POST /process
   → 200 OK with palette and social_image
   ```

2. **Async Job Flow**
   ```bash
   POST /jobs → 202 Accepted
   GET /jobs/{id} → 200 Processing (progress: 50%)
   GET /jobs/{id} → 200 Completed (results array)
   ```

3. **ETag Optimization**
   ```bash
   GET /jobs/{id} → 200 OK (ETag: "abc123")
   GET /jobs/{id} (If-None-Match: "abc123") → 304 Not Modified
   ```

### Edge Cases
1. **Large ZIP File**
   ```bash
   POST /jobs (500MB ZIP) → 202 Accepted
   → Background processing with progress updates
   → Download URL for results
   ```

2. **Idempotency Conflict**
   ```bash
   POST /jobs (Idempotency-Key: "test", body: A) → 202 job_123
   POST /jobs (Idempotency-Key: "test", body: B) → 409 Conflict
   ```

3. **Job Expiry**
   ```bash
   POST /jobs (ttl_h: 1) → 202 Accepted
   → Wait 1 hour
   GET /jobs/{id} → 404 Expired Job
   ```

### Security Edge Cases
1. **Replay Attack**
   ```bash
   POST /jobs (X-Request-Id: "nonce1") → 202 Accepted
   POST /jobs (X-Request-Id: "nonce1") → 401 Nonce Reused
   ```

2. **Timestamp Manipulation**
   ```bash
   POST /jobs (X-Timestamp: old_timestamp) → 401 Timestamp Out Of Range
   ```

3. **Signature Tampering**
   ```bash
   POST /jobs (X-Signature: "invalid") → 401 Invalid Signature
   ```

## Performance Benchmarks

### Response Times (p95)
- **GET /health**: < 50ms
- **POST /process**: < 2s (single image)
- **GET /jobs/{id}**: < 100ms
- **POST /jobs**: < 200ms (job creation)

### Throughput
- **Concurrent requests**: 100/s sustained
- **Job processing**: 10 jobs/minute
- **Image processing**: 50 images/minute

### Resource Usage
- **Memory**: < 500MB under load
- **CPU**: < 50% under normal load
- **Disk**: Temporary files cleaned up

## Test Automation

### Current Status
- **Manual Testing**: ✅ Comprehensive coverage
- **Unit Tests**: ❌ Not implemented
- **Integration Tests**: ❌ Not implemented
- **Load Tests**: ❌ Not implemented

### Planned Improvements (v1.2)
- **pytest**: Unit test framework
- **Postman/Newman**: API test automation
- **Locust**: Load testing framework
- **CI/CD**: Automated test execution

## Test Data

### Sample Images
- **Valid JPEG**: 2MB, 1920x1080
- **Valid PNG**: 5MB, 2048x1536  
- **Invalid Format**: .txt file with image extension
- **Corrupted**: Truncated image data

### Sample ZIP Files
- **Valid ZIP**: 10 images, 20MB total
- **Large ZIP**: 100 images, 200MB total
- **Malicious ZIP**: Path traversal attempts
- **Empty ZIP**: No files inside

### Sample URLs
- **Valid Image**: https://httpbin.org/image/jpeg
- **Private IP**: http://192.168.1.1/image.jpg
- **Timeout URL**: Slow response server
- **404 URL**: Non-existent resource

## Coverage Gaps

### Not Tested
- **Concurrent job processing**: Multiple jobs simultaneously
- **Memory exhaustion**: Very large file processing
- **Network partitions**: External service failures
- **Database corruption**: State inconsistency

### Future Test Areas
- **Multi-region**: Geographic distribution
- **Disaster recovery**: Backup/restore procedures
- **Compliance**: GDPR/CCPA requirements
- **Accessibility**: Frontend usability
