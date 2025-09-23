# Changelog

All notable changes to BrewChrome React will be documented in this file.

## [1.1.2] - 2025-09-23

### 🐛 Bug Fixes
- **Fixed** File status tracking in multi-file upload UI
- **Fixed** Files remaining "queued" after successful processing
- **Added** Real-time status updates with color coding (queued/uploading/completed/failed)
- **Added** Auto-clear file list after 2 seconds showing completed status
- **Improved** Visual feedback for individual file processing states

## [1.1.1] - 2025-09-23

### ✨ Enhanced User Experience
- **Added** Multi-file upload support in Files tab
- **Added** File list UI with individual file status and size display
- **Added** Duplicate file detection and prevention
- **Improved** File selection feedback with count display
- **Enhanced** Drag & drop to accept multiple image files simultaneously

### 🔧 Technical Improvements
- **Updated** OriginalUploader component to handle multiple files
- **Enhanced** File validation with better error messages
- **Improved** Batch processing for multiple image files
- **Maintained** Single file behavior for Archive tab (ZIP files)

## [1.1.0] - 2025-09-23

### 🔒 Security Hardening
- **Added** HMAC signature validation for webhooks
- **Added** Nonce cache for replay attack protection  
- **Added** Timestamp validation (±300s window)
- **Added** Enhanced idempotency with body hash validation
- **Added** 409 Conflict response for idempotency violations

### 📊 Enhanced Observability
- **Added** ETag caching with 304 Not Modified responses
- **Added** Comprehensive Prometheus metrics suite
- **Added** Structured JSON logging with request correlation
- **Added** Enhanced error taxonomy with standardized codes
- **Added** Retry-After hints for adaptive polling

### 🚀 Performance Improvements
- **Added** Exponential backoff with jitter for polling
- **Added** Bandwidth optimization via ETag 304 responses
- **Improved** Request ID propagation end-to-end
- **Improved** Error messages with user/developer separation

### 🧪 Testing
- **Added** Security hardening acceptance tests
- **Added** Idempotency conflict validation
- **Added** ETag 304 response validation
- **Verified** All production endpoints

## [1.0.0] - 2025-09-23

### 🎯 Async Job System
- **Added** POST /jobs endpoint for batch processing
- **Added** GET /jobs/{id} for status polling
- **Added** ThreadPoolExecutor worker system
- **Added** Job lifecycle management (queued → processing → completed/failed)
- **Added** Progress tracking with real-time updates

### 🌐 Frontend Integration
- **Added** JobStatus React component with polling UI
- **Added** Exponential backoff polling strategy
- **Added** Real-time progress bars and status badges
- **Added** Error handling with request ID correlation

### 📈 Monitoring & Metrics
- **Added** Prometheus metrics endpoint (/metrics)
- **Added** Job processing counters and histograms
- **Added** Request duration and error rate tracking
- **Added** Health and readiness endpoints with uptime

### 🔧 Core Features
- **Added** Image processing with PaletteEngine
- **Added** ZIP batch processing support
- **Added** URL fetching with SSRF protection
- **Added** Social image generation (1080x720px)
- **Added** CORS support for React frontend

### 🚀 Deployment
- **Deployed** Backend to Google Cloud Run
- **Deployed** Frontend to Vercel
- **Configured** Production environment variables
- **Verified** End-to-end functionality

## [0.1.0] - Initial Development

### Core Implementation
- Basic Flask backend with palette extraction
- React frontend with file upload
- Docker containerization
- Initial API endpoints
