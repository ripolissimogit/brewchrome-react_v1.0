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
from datetime import datetime, timezone
from urllib.parse import urlparse

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
