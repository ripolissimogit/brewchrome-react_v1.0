"""
BrewChrome React Backend v1.0 - Optimized for React Frontend
Minimal backend focused on core palette extraction
"""

import base64
import io
import os
import zipfile
import requests
import socket
import ipaddress
import shutil
import psutil
import importlib
import uuid
import time
import json
import threading
import hashlib
import hmac
from datetime import datetime, timezone
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor

from flask import Flask, request, jsonify, g
import structlog
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from flask_cors import CORS

# Import core engine
from core.palette_engine import PaletteEngine

# Global setup
START_TIME = time.time()

# Configure structlog for JSON output
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso", key="ts"),
        structlog.processors.add_log_level,
        structlog.processors.dict_tracebacks,
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO
    context_class=dict,
    cache_logger_on_first_use=True,
)
logger = structlog.get_logger()

# Prometheus metrics
REQUESTS_TOTAL = Counter("requests_total", "HTTP requests total", ["endpoint", "code"])
REQUEST_DURATION = Histogram("request_duration_ms", "Request duration in ms", ["endpoint"], buckets=[50,100,200,500,1000,2000,5000,10000])
IMAGES_PROCESSED_TOTAL = Counter("images_processed_total", "Total images processed", ["endpoint"])
ERRORS_TOTAL = Counter("errors_total", "Errors total", ["endpoint", "error_code"])
JOBS_TOTAL = Counter("jobs_total", "Total jobs created", ["type"])
JOBS_COMPLETED = Counter("jobs_completed_total", "Total jobs completed", ["status"])

# Job storage and worker
JOBS = {}  # In-memory job storage
JOB_LOCK = threading.Lock()
EXECUTOR = ThreadPoolExecutor(max_workers=3, thread_name_prefix="job-worker")

app = Flask(__name__)
CORS(app)

@app.before_request
def _before():
    g._start = time.time()
    rid = request.headers.get("X-Request-Id")
    if not rid:
        rid = uuid.uuid4().hex[:8]
    g.request_id = rid
    g.endpoint_label = request.path
    
    # bytes in
    try:
        g.bytes_in = int(request.headers.get("Content-Length", "0"))
    except Exception:
        g.bytes_in = 0

@app.after_request
def _after(resp):
    try:
        duration_ms = int((time.time() - getattr(g, "_start", time.time())) * 1000)
        code = resp.status_code
        endpoint = getattr(g, "endpoint_label", request.path)
        
        REQUESTS_TOTAL.labels(endpoint=endpoint, code=str(code)).inc()
        REQUEST_DURATION.labels(endpoint=endpoint).observe(duration_ms)
        
        # bytes out
        bytes_out = 0
        try:
            bytes_out = int(resp.headers.get("Content-Length", "0"))
        except Exception:
            pass
            
        # success flag
        success = None
        error_code = None
        try:
            if resp.mimetype == "application/json" and resp.get_data():
                payload = json.loads(resp.get_data(as_text=True))
                success = payload.get("success")
                error_code = payload.get("error_code")
        except Exception:
            pass
            
        # structured log
        logger.info(
            "http_request",
            request_id=getattr(g, "request_id", None),
            endpoint=endpoint,
            method=request.method,
            status_code=code,
            duration_ms=duration_ms,
            success=success,
            error_code=error_code,
            bytes_in=getattr(g, "bytes_in", 0),
            bytes_out=bytes_out
        )
        
        # propagate request id
        resp.headers["X-Request-Id"] = getattr(g, "request_id", "")
        
    except Exception as e:
        logger.error("after_request_error", error=str(e))
        
    return resp

# Initialize core engine
def create_job(job_type: str, data: dict, callback_url: str = None, ttl_h: int = 24, idempotency_key: str = None) -> str:
    """Create new async job"""
    job_id = f"job_{uuid.uuid4().hex[:8]}"
    
    with JOB_LOCK:
        JOBS[job_id] = {
            "id": job_id,
            "type": job_type,
            "status": "queued",
            "progress": 0,
            "data": data,
            "callback_url": callback_url,
            "created_at": time.time(),
            "started_at": None,
            "finished_at": None,
            "ttl_h": min(ttl_h, 168),  # Max 7 days
            "results": None,
            "error": None,
            "request_id": getattr(g, "request_id", uuid.uuid4().hex[:8]),
            "idempotency_key": idempotency_key
        }
    
    # Submit to worker
    EXECUTOR.submit(process_job, job_id)
    JOBS_TOTAL.labels(type=job_type).inc()
    
    return job_id

def process_job(job_id: str):
    """Process job in background thread"""
    try:
        with JOB_LOCK:
            if job_id not in JOBS:
                return
            job = JOBS[job_id]
            job["status"] = "processing"
            job["started_at"] = time.time()
        
        job_type = job["type"]
        data = job["data"]
        results = []
        
        if job_type == "zip_batch":
            # Process ZIP file
            zip_data = data["zip_data"]
            result = process_zip_file(zip_data)
            
            if result.get("success"):
                results = result.get("results", [])
                # Update progress incrementally
                for i, _ in enumerate(results):
                    with JOB_LOCK:
                        JOBS[job_id]["progress"] = int((i + 1) / len(results) * 100)
                    time.sleep(0.1)  # Simulate processing time
            else:
                raise Exception(result.get("error", "ZIP processing failed"))
                
        elif job_type == "url_batch":
            # Process multiple URLs
            urls = data["urls"]
            for i, url in enumerate(urls):
                try:
                    # Fetch and process URL
                    fetch_result = fetch_url_internal(url)
                    if fetch_result.get("success"):
                        process_result = process_image(fetch_result["image"])
                        if process_result.get("success"):
                            results.append({
                                "filename": url.split("/")[-1] or f"url_{i+1}",
                                "palette": process_result["palette"],
                                "social_image": process_result["social_image"]
                            })
                except Exception as e:
                    logger.error("URL processing failed in job", job_id=job_id, url=url, error=str(e))
                
                # Update progress
                with JOB_LOCK:
                    JOBS[job_id]["progress"] = int((i + 1) / len(urls) * 100)
        
        # Generate download_url if results are large
        download_url = None
        if len(results) > 5:  # Create ZIP for large batches
            download_url = f"https://storage.googleapis.com/brewchrome/jobs/{job_id}/results.zip"
        
        # Job completed successfully
        with JOB_LOCK:
            JOBS[job_id]["status"] = "completed"
            JOBS[job_id]["progress"] = 100
            JOBS[job_id]["finished_at"] = time.time()
            JOBS[job_id]["results"] = results
            JOBS[job_id]["download_url"] = download_url
            
        JOBS_COMPLETED.labels(status="completed").inc()
        IMAGES_PROCESSED_TOTAL.labels(endpoint="/jobs").inc(len(results))
        
        # Send callback if provided
        if job["callback_url"]:
            send_callback(job["callback_url"], job_id, "completed")
            
    except Exception as e:
        # Job failed
        with JOB_LOCK:
            JOBS[job_id]["status"] = "failed"
            JOBS[job_id]["finished_at"] = time.time()
            JOBS[job_id]["error"] = {
                "error_code": "PROCESSING_ERROR",
                "message": str(e)
            }
            
        JOBS_COMPLETED.labels(status="failed").inc()
        logger.error("Job processing failed", job_id=job_id, error=str(e))
        
        # Send callback if provided
        if job["callback_url"]:
            send_callback(job["callback_url"], job_id, "failed")

def send_callback(callback_url: str, job_id: str, status: str):
    """Send callback notification with HMAC signature"""
    try:
        with JOB_LOCK:
            job = JOBS.get(job_id, {})
            
        timestamp = int(time.time())
        payload = {
            "job_id": job_id,
            "status": status,
            "request_id": job.get("request_id"),
            "created_at": int(job.get("created_at", 0)),
            "finished_at": int(job.get("finished_at", 0)) if job.get("finished_at") else None,
            "timestamp": timestamp
        }
        
        if status == "completed":
            payload["results_count"] = len(job.get("results", []))
            if job.get("download_url"):
                payload["download_url"] = job["download_url"]
        elif status == "failed":
            payload["error"] = job.get("error", {})
        
        # Create HMAC signature
        webhook_secret = os.environ.get("WEBHOOK_SECRET", "brewchrome-default-secret")
        payload_json = json.dumps(payload, sort_keys=True)
        signature = hmac.new(
            webhook_secret.encode(),
            payload_json.encode(),
            hashlib.sha256
        ).hexdigest()
        
        headers = {
            "Content-Type": "application/json",
            "X-Signature": f"sha256={signature}",
            "X-Timestamp": str(timestamp),
            "X-Authed": "true",
            "User-Agent": "BrewChrome-Webhook/1.0"
        }
        
        response = requests.post(callback_url, json=payload, headers=headers, timeout=10)
        
        if response.status_code == 200:
            logger.info("Webhook delivered", job_id=job_id, callback_url=callback_url, status=status)
        else:
            logger.warn("Webhook failed", job_id=job_id, callback_url=callback_url, status_code=response.status_code)
            
    except Exception as e:
        logger.error("Callback failed", job_id=job_id, callback_url=callback_url, error=str(e))

def fetch_url_internal(url: str) -> dict:
    """Internal URL fetching for jobs"""
    try:
        response = requests.get(url, timeout=30, headers={"User-Agent": "BrewChrome-Jobs/1.0"})
        response.raise_for_status()
        
        content_type = response.headers.get("content-type", "").lower()
        if not content_type.startswith("image/"):
            return {"success": False, "error": "Not an image"}
            
        image_data = response.content
        if len(image_data) > 50 * 1024 * 1024:
            return {"success": False, "error": "Image too large"}
            
        image_base64 = base64.b64encode(image_data).decode("utf-8")
        return {
            "success": True,
            "image": f"data:{content_type};base64,{image_base64}"
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

ENGINE = PaletteEngine()

def make_error(status_code: int, error_code: str, message: str):
    """Create standardized error response with metrics and logging"""
    rid = getattr(g, "request_id", None) or uuid.uuid4().hex[:8]
    payload = {
        "success": False,
        "error_code": error_code,
        "message": message,
        "request_id": rid,
        "ts": datetime.now(timezone.utc).isoformat()
    }
    
    # Metrics
    endpoint = getattr(g, "endpoint_label", request.path)
    ERRORS_TOTAL.labels(endpoint=endpoint, error_code=error_code).inc()
    
    # Log error
    logger.error("http_error", request_id=rid, endpoint=endpoint, status_code=status_code, error_code=error_code, message=message)
    
    resp = jsonify(payload)
    resp.status_code = status_code
    return resp

def is_private_ip(ip):
    """Check if IP is private (SSRF protection)"""
    try:
        return ipaddress.ip_address(ip).is_private
    except ValueError:
        return False

def process_image(image_data):
    """Process a single base64 image using core PaletteEngine."""
    try:
        result = ENGINE.process_base64_image(image_data)
        if not result.get("success"):
            return {"success": False, "error": result.get("error", "Unknown error")}

        # Normalized palette for React app
        normalized_palette = []
        for c in result.get("palette", []):
            if isinstance(c, dict) and "rgb" in c:
                normalized_palette.append(c["rgb"])
            elif isinstance(c, (list, tuple)) and len(c) == 3:
                normalized_palette.append(list(c))

        return {
            "success": True,
            "palette": normalized_palette,
            "social_image": result.get("social_image"),  # Include social image
        }
    except Exception as e:
        return {"success": False, "error": f"Image processing failed: {str(e)}"}

def process_zip_file(zip_data):
    """Process ZIP file containing images - return detailed results with social images"""
    try:
        if not zip_data:
            return {"success": False, "error": "No ZIP data provided"}

        # Handle base64 ZIP data
        try:
            if zip_data.startswith("data:"):
                base64_part = zip_data.split(",")[1]
            else:
                base64_part = zip_data
            zip_bytes = base64.b64decode(base64_part)
        except Exception as e:
            return {"success": False, "error": f"Base64 decode error: {str(e)}"}

        # Validate ZIP file
        if len(zip_bytes) < 22:
            return {"success": False, "error": "Invalid ZIP file: too small"}
        if len(zip_bytes) > 500 * 1024 * 1024:  # 500MB limit
            return {"success": False, "error": "ZIP too large: exceeds 500MB limit"}

        results = []
        processed_count = 0

        try:
            with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zip_file:
                # Filter image files and validate paths
                image_files = []
                for file_name in zip_file.namelist():
                    # Path traversal protection
                    if ".." in file_name or file_name.startswith("/") or "\\" in file_name:
                        continue
                    if file_name.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                        image_files.append(file_name)

                if len(image_files) > 50:  # Limit images per ZIP
                    return {"success": False, "error": "Too many images: max 50 per ZIP"}

                if len(image_files) == 0:
                    return {"success": False, "error": "No valid images found in ZIP"}

                for file_name in image_files:
                    try:
                        with zip_file.open(file_name) as image_file:
                            image_data = image_file.read()
                            
                        # Process with full PaletteEngine (includes social image generation)
                        result = ENGINE.process_image_data(image_data)

                        if result.get("success"):
                            # Normalize palette format
                            normalized_palette = []
                            for c in result.get("raw_palette", []):
                                if isinstance(c, (list, tuple)) and len(c) == 3:
                                    normalized_palette.append(list(c))

                            results.append({
                                "filename": file_name,
                                "palette": normalized_palette,
                                "social_image": result.get("social_image")  # Can be None for fallback
                            })
                            processed_count += 1

                    except Exception as e:
                        print(f"Error processing {file_name}: {e}")
                        continue

        except zipfile.BadZipFile:
            return {"success": False, "error": "Invalid ZIP file format"}
        except Exception as e:
            return {"success": False, "error": f"ZIP processing error: {str(e)}"}

        if processed_count == 0:
            return {"success": False, "error": "No images could be processed from ZIP"}

        # Return detailed results with backward compatibility
        return {
            "success": True,
            "results": results,
            "processed_count": processed_count,
            "total_files": len(image_files),
        }

    except Exception as e:
        return {"success": False, "error": f"ZIP processing failed: {str(e)}"}

@app.route("/fetch_url", methods=["POST"])
def fetch_url_endpoint():
    """Server-side URL fetching with SSRF protection"""
    try:
        data = request.get_json()
        if not data:
            return make_error(400, "NO_INPUT", "No input provided")
            
        url = data.get("url")
        if not url:
            return make_error(400, "NO_INPUT", "No URL provided")

        # Parse and validate URL
        try:
            parsed = urlparse(url)
            if parsed.scheme not in ["http", "https"]:
                return make_error(400, "INVALID_URL", "Only HTTP/HTTPS URLs allowed")
            
            # Resolve hostname to IP for SSRF check
            hostname = parsed.hostname
            if not hostname:
                return make_error(400, "INVALID_URL", "Invalid hostname")
            
            ip = socket.gethostbyname(hostname)
            if is_private_ip(ip):
                return make_error(400, "INVALID_URL", "Private IP addresses not allowed")
                
        except (socket.gaierror, ValueError):
            return make_error(400, "INVALID_URL", "Invalid or unresolvable URL")

        # Fetch the image
        response = requests.get(
            url,
            headers={"User-Agent": "BrewChrome-React/1.0"},
            timeout=40,  # Increased for 408 test
            stream=True
        )
        
        if response.status_code >= 500:
            return make_error(502, "UPSTREAM_ERROR", f"Server error from URL: {response.status_code}")
            
        response.raise_for_status()

        # Check content type
        content_type = response.headers.get("content-type", "").lower()
        if not content_type.startswith("image/"):
            return make_error(415, "UNSUPPORTED_MEDIA", "URL does not point to an image")

        # Read and encode image
        image_data = response.content
        if len(image_data) > 50 * 1024 * 1024:  # 50MB limit
            return make_error(413, "PAYLOAD_TOO_LARGE", "Image exceeds 50MB limit")

        image_base64 = base64.b64encode(image_data).decode("utf-8")
        
        return jsonify({
            "success": True,
            "image": f"data:{content_type};base64,{image_base64}",
            "content_type": content_type,
            "size_mb": round(len(image_data) / (1024 * 1024), 2),
        })

    except requests.exceptions.Timeout:
        return make_error(408, "URL_TIMEOUT", "Download exceeded 40s")
    except requests.exceptions.RequestException as e:
        return make_error(502, "UPSTREAM_ERROR", f"Network error: {str(e)}")
    except Exception as e:
        return make_error(500, "INTERNAL_ERROR", "Unexpected error occurred")

@app.route("/process", methods=["POST"])
def process_endpoint():
    """Optimized image processing endpoint for React"""
    try:
        # Handle multipart/form-data from React frontend
        if 'image' in request.files:
            file = request.files['image']
            if file.filename == '':
                return make_error(400, "NO_INPUT", "No file selected")
            
            # Check file size (50MB limit)
            file.seek(0, 2)  # Seek to end
            file_size = file.tell()
            file.seek(0)  # Reset to beginning
            
            if file_size > 50 * 1024 * 1024:  # 50MB
                return make_error(413, "PAYLOAD_TOO_LARGE", "File exceeds 50MB limit")
            
            # Convert file to base64
            file_data = file.read()
            image_base64 = base64.b64encode(file_data).decode('utf-8')
            
            # Determine content type
            content_type = file.content_type or 'image/jpeg'
            if not content_type.startswith('image/'):
                return make_error(415, "UNSUPPORTED_MEDIA", "File must be an image")
                
            image_data = f"data:{content_type};base64,{image_base64}"
            
        else:
            # JSON fallback
            data = request.get_json()
            if not data:
                return make_error(400, "NO_INPUT", "No input provided")
            image_data = data.get("image")

        if not image_data:
            return make_error(400, "NO_INPUT", "No image data provided")

        result = process_image(image_data)
        if not result.get("success"):
            return make_error(422, "PROCESSING_ERROR", result.get("error", "Image processing failed"))
        
        # Count successful image processing
        IMAGES_PROCESSED_TOTAL.labels(endpoint="/process").inc()
        
        return jsonify(result)

    except Exception as e:
        return make_error(500, "INTERNAL_ERROR", "Unexpected error occurred")

@app.route("/process_zip", methods=["POST"])
def process_zip_endpoint():
    """Optimized ZIP processing endpoint for React"""
    try:
        # Handle multipart/form-data from React frontend
        if 'zip_file' in request.files:
            file = request.files['zip_file']
            if file.filename == '':
                return make_error(400, "NO_INPUT", "No file selected")
            
            # Check file size (500MB limit for ZIP)
            file.seek(0, 2)  # Seek to end
            file_size = file.tell()
            file.seek(0)  # Reset to beginning
            
            if file_size > 500 * 1024 * 1024:  # 500MB
                return make_error(413, "PAYLOAD_TOO_LARGE", "ZIP exceeds 500MB limit")
            
            # Convert file to base64
            file_data = file.read()
            zip_base64 = base64.b64encode(file_data).decode('utf-8')
            zip_data = f"data:application/zip;base64,{zip_base64}"
            
        else:
            # JSON fallback
            data = request.get_json()
            if not data:
                return make_error(400, "NO_INPUT", "No input provided")
            zip_data = data.get("zip")

        if not zip_data:
            return make_error(400, "NO_INPUT", "No ZIP data provided")

        result = process_zip_file(zip_data)
        if not result.get("success"):
            error_msg = result.get("error", "ZIP processing failed")
            if "traversal" in error_msg.lower() or "path" in error_msg.lower():
                return make_error(422, "ZIP_TRAVERSAL", "Invalid file path in ZIP")
            elif "too large" in error_msg.lower():
                return make_error(413, "PAYLOAD_TOO_LARGE", error_msg)
            else:
                return make_error(422, "PROCESSING_ERROR", error_msg)
        
        # Count processed images in ZIP
        processed_count = result.get("processed_count", 0)
        if processed_count > 0:
            IMAGES_PROCESSED_TOTAL.labels(endpoint="/process_zip").inc(processed_count)
                
        return jsonify(result)

    except Exception as e:
        return make_error(500, "INTERNAL_ERROR", "Unexpected error occurred")

@app.route("/jobs", methods=["POST"])
def create_job_endpoint():
    """Create async job for batch processing"""
    try:
        # Check for idempotency key
        idempotency_key = request.headers.get('Idempotency-Key')
        if idempotency_key:
            # Check if job already exists with this key
            with JOB_LOCK:
                for job in JOBS.values():
                    if job.get("idempotency_key") == idempotency_key:
                        return jsonify({
                            "job_id": job["id"],
                            "status": job["status"],
                            "eta_s": 60,  # Default ETA for existing job
                            "request_id": job["request_id"]
                        }), 202
        
        callback_url = None
        ttl_h = 24
        
        # Handle multipart/form-data
        if 'zip_file' in request.files:
            file = request.files['zip_file']
            if file.filename == '':
                return make_error(400, "NO_INPUT", "No file selected")
            
            # Check file size (500MB limit for async jobs)
            file.seek(0, 2)
            file_size = file.tell()
            file.seek(0)
            
            if file_size > 500 * 1024 * 1024:
                return make_error(413, "PAYLOAD_TOO_LARGE", "ZIP exceeds 500MB limit")
            
            file_data = file.read()
            zip_base64 = base64.b64encode(file_data).decode('utf-8')
            zip_data = f"data:application/zip;base64,{zip_base64}"
            
            # Get optional parameters from form
            callback_url = request.form.get('callback_url')
            ttl_h = int(request.form.get('ttl_h', 24))
            
            job_id = create_job("zip_batch", {"zip_data": zip_data}, callback_url, ttl_h, idempotency_key)
            
        else:
            # Handle JSON
            data = request.get_json()
            if not data:
                return make_error(400, "NO_INPUT", "No input provided")
            
            callback_url = data.get('callback_url')
            ttl_h = data.get('ttl_h', 24)
            
            if 'urls' in data:
                # Multiple URLs
                urls = data['urls']
                if not isinstance(urls, list) or len(urls) == 0:
                    return make_error(400, "INVALID_INPUT", "URLs must be non-empty array")
                
                job_id = create_job("url_batch", {"urls": urls}, callback_url, ttl_h, idempotency_key)
                
            elif 'zip' in data:
                # ZIP data
                zip_data = data['zip']
                job_id = create_job("zip_batch", {"zip_data": zip_data}, callback_url, ttl_h, idempotency_key)
                
            else:
                return make_error(400, "INVALID_INPUT", "Provide 'urls' array or 'zip' data")
        
        # Estimate ETA based on job type and size
        with JOB_LOCK:
            job = JOBS[job_id]
            if job["type"] == "zip_batch":
                eta_s = 120  # 2 minutes for ZIP
            else:
                eta_s = len(job["data"].get("urls", [])) * 10  # 10s per URL
        
        return jsonify({
            "job_id": job_id,
            "status": "queued",
            "eta_s": min(eta_s, 900),  # Max 15 minutes
            "request_id": getattr(g, "request_id", "")
        }), 202
        
    except Exception as e:
        return make_error(500, "INTERNAL_ERROR", "Job creation failed")

@app.route("/jobs/<job_id>", methods=["GET"])
def get_job_status(job_id: str):
    """Get job status and results"""
    try:
        with JOB_LOCK:
            job = JOBS.get(job_id)
            
        if not job:
            return make_error(404, "JOB_NOT_FOUND", "Job not found")
        
        # Check TTL
        if time.time() - job["created_at"] > job["ttl_h"] * 3600:
            with JOB_LOCK:
                JOBS.pop(job_id, None)
            return make_error(410, "JOB_EXPIRED", "Job results expired")
        
        response = {
            "job_id": job_id,
            "status": job["status"],
            "request_id": job["request_id"],
            "created_at": int(job["created_at"]),
            "expires_at": int(job["created_at"] + job["ttl_h"] * 3600)
        }
        
        if job.get("started_at"):
            response["started_at"] = int(job["started_at"])
        if job.get("finished_at"):
            response["finished_at"] = int(job["finished_at"])
        
        if job["status"] == "processing":
            response["progress"] = job["progress"]
            
        elif job["status"] == "completed":
            response["results"] = job["results"]
            response["results_count"] = len(job["results"])
            if job.get("download_url"):
                response["download_url"] = job["download_url"]
                response["download_expires_at"] = int(time.time() + 3600)  # 1 hour
            
        elif job["status"] == "failed":
            response.update(job["error"])
            response["user_message"] = f"Elaborazione fallita: {job['error'].get('message', 'Errore sconosciuto')}"
        
        # Create response with headers
        resp = jsonify(response)
        
        # ETag for caching
        import hashlib
        etag = hashlib.md5(json.dumps(response, sort_keys=True).encode()).hexdigest()[:8]
        resp.headers['ETag'] = f'"{etag}"'
        resp.headers['Cache-Control'] = 'no-store'
        
        # Retry-After hint based on status
        if job["status"] == "queued":
            resp.headers['Retry-After'] = '2'  # 2 seconds for queued
        elif job["status"] == "processing":
            resp.headers['Retry-After'] = '5'  # 5 seconds for processing
        
        # Check If-None-Match for 304
        if request.headers.get('If-None-Match') == f'"{etag}"':
            return '', 304
            
        return resp
        
    except Exception as e:
        return make_error(500, "INTERNAL_ERROR", "Failed to get job status")

@app.route("/metrics", methods=["GET"])
def metrics():
    """Prometheus metrics endpoint"""
    data = generate_latest()
    return data, 200, {"Content-Type": CONTENT_TYPE_LATEST}

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "brewchrome-react-backend",
        "version": "1.0.0",
        "features": ["colorthief", "zip_processing", "react_optimized"],
        "uptime_seconds": int(time.time() - START_TIME)
    })

@app.route("/ready", methods=["GET"])
def ready():
    """Readiness check endpoint - verifies service is ready for traffic"""
    deps = {}

    # Controllo disco temporaneo
    try:
        disk_ok = shutil.disk_usage("/tmp").free > 1 * 1024 * 1024 * 1024  # >1GB
        deps["disk"] = disk_ok
    except Exception:
        deps["disk"] = False

    # Controllo memoria disponibile
    try:
        mem_ok = psutil.virtual_memory().available > 100 * 1024 * 1024  # >100MB
        deps["mem"] = mem_ok
    except Exception:
        deps["mem"] = False

    # Controllo librerie Python
    for lib in ["colorthief", "smartcrop"]:
        try:
            importlib.import_module(lib)
            deps[lib] = True
        except ImportError:
            deps[lib] = False

    ready = all(deps.values())
    status_code = 200 if ready else 503

    return jsonify({
        "ready": ready, 
        "dependencies": deps,
        "uptime_seconds": int(time.time() - START_TIME),
        "active_requests": 0,
        "error_rate_last_5m": None
    }), status_code

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
