# Security Policy

**Security Level:** Enterprise-Grade  
**Last Assessment:** 2025-09-23  
**Next Review:** Q1 2026  

## Security Posture

### Current Security Score: A+

| Component | Status | Implementation |
|-----------|--------|----------------|
| Replay Protection | ✅ | Nonce cache + timestamp validation |
| Data Integrity | ✅ | HMAC signatures for webhooks |
| Idempotency Safety | ✅ | Conflict detection for duplicate keys |
| Input Validation | ✅ | File size limits, MIME type checking |
| Error Handling | ✅ | Sanitized error messages |
| SSRF Protection | ✅ | Private IP blocking for URL fetching |

## Implemented Security Measures

### Authentication & Authorization
- **HMAC Signatures**: SHA256 signatures for webhook payloads
- **Timestamp Validation**: ±300 second window for request freshness
- **Nonce Cache**: 5-minute TTL to prevent replay attacks
- **Request ID Correlation**: End-to-end tracing for audit trails

### Input Validation & Sanitization
- **File Size Limits**: 50MB for images, 500MB for ZIP files
- **MIME Type Validation**: Strict content-type checking
- **ZIP Path Traversal**: Protection against zip-slip attacks
- **URL Validation**: SSRF protection with private IP blocking

### Data Protection
- **Idempotency Keys**: Body hash validation prevents conflicts
- **TTL Enforcement**: Automatic cleanup of expired jobs
- **Error Message Sanitization**: Separate user/developer messages
- **Request Correlation**: Structured logging without PII exposure

## Security Configuration

### Environment Variables
```bash
# Optional: Enable signature validation (default: false)
REQUIRE_SIGNATURE=true

# Webhook HMAC secret (default: brewchrome-default-secret)
WEBHOOK_SECRET=your-secure-secret-here
```

### Headers Required for Secure Endpoints
```http
X-Timestamp: 1758640038
X-Signature: sha256=abc123...
X-Request-Id: unique-nonce
```

### Signature Calculation
```
message = <timestamp>\n<method>\n<path>\n<sha256(body)>
signature = HMAC-SHA256(webhook_secret, message)
```

## Threat Model

### Mitigated Threats
- **Replay Attacks**: Nonce cache + timestamp validation
- **Data Tampering**: HMAC signature verification
- **SSRF Attacks**: Private IP range blocking
- **Zip Slip**: Path traversal validation
- **Resource Exhaustion**: File size limits + TTL cleanup
- **Information Disclosure**: Sanitized error responses

### Residual Risks
- **DDoS**: Rate limiting not implemented (planned v1.2)
- **Webhook Retry Storms**: Single attempt only (planned v1.2)
- **Memory Exhaustion**: In-memory storage (acceptable for current scale)

## Incident Response

### Security Incident Classification
- **P0**: Data breach, authentication bypass
- **P1**: Service disruption, unauthorized access
- **P2**: Vulnerability disclosure, configuration drift

### Response Procedures
1. **Immediate**: Isolate affected systems
2. **Assessment**: Determine scope and impact
3. **Mitigation**: Apply temporary fixes
4. **Communication**: Notify stakeholders
5. **Resolution**: Implement permanent fixes
6. **Post-mortem**: Document lessons learned

## Compliance & Auditing

### Logging & Monitoring
- **Structured Logs**: JSON format with request correlation
- **Security Events**: Authentication failures, signature mismatches
- **Audit Trail**: All job operations with timestamps
- **Metrics**: Security-related counters and histograms

### Data Retention
- **Job Data**: TTL-based cleanup (24h default, 7d max)
- **Nonce Cache**: 5-minute automatic expiry
- **Logs**: Retention per platform policy
- **Metrics**: Prometheus retention configuration

## Security Alerts

### High Priority
```yaml
webhook_signature_failures > 5 in 5m
nonce_reuse_attempts > 3 in 5m
timestamp_out_of_range > 10 in 5m
```

### Medium Priority
```yaml
idempotency_conflicts > 5 in 5m
file_size_limit_exceeded > 20 in 5m
ssrf_blocked_requests > 10 in 5m
```

## Vulnerability Reporting

### Responsible Disclosure
- **Contact**: security@brewchrome.com
- **Response Time**: 24 hours acknowledgment
- **Resolution**: 90 days maximum
- **Recognition**: Security hall of fame

### Scope
- **In Scope**: All production endpoints, authentication mechanisms
- **Out of Scope**: Social engineering, physical attacks, third-party services

## Security Roadmap

### v1.2 Planned Improvements
- Rate limiting per client IP
- Webhook retry with exponential backoff
- Enhanced audit logging
- Redis-based session storage

### Future Considerations
- OAuth2/OIDC integration
- Certificate pinning
- Content Security Policy headers
- Advanced threat detection
