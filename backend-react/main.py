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
from urllib.parse import urlparse

from flask import Flask, request, jsonify
from flask_cors import CORS

# Import core engine
from core.palette_engine import PaletteEngine

app = Flask(__name__)
CORS(app)

# Initialize core engine
ENGINE = PaletteEngine()

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
        url = data.get("url")

        if not url:
            return jsonify({"success": False, "error": "No URL provided"})

        # Parse and validate URL
        try:
            parsed = urlparse(url)
            if parsed.scheme not in ["http", "https"]:
                return jsonify({"success": False, "error": "Only HTTP/HTTPS URLs allowed"})
            
            # Resolve hostname to IP for SSRF check
            hostname = parsed.hostname
            if not hostname:
                return jsonify({"success": False, "error": "Invalid hostname"})
            
            ip = socket.gethostbyname(hostname)
            if is_private_ip(ip):
                return jsonify({"success": False, "error": "Private IP addresses not allowed"})
                
        except (socket.gaierror, ValueError) as e:
            return jsonify({"success": False, "error": f"Invalid URL: {str(e)}"})

        # Fetch the image
        response = requests.get(
            url,
            headers={"User-Agent": "BrewChrome-React/1.0"},
            timeout=30,
            stream=True
        )
        response.raise_for_status()

        # Check content type
        content_type = response.headers.get("content-type", "").lower()
        if not content_type.startswith("image/"):
            return jsonify({"success": False, "error": "URL does not point to an image"})

        # Read and encode image
        image_data = response.content
        if len(image_data) > 50 * 1024 * 1024:  # 50MB limit for React
            return jsonify({"success": False, "error": "Image too large (max 50MB)"})

        image_base64 = base64.b64encode(image_data).decode("utf-8")
        
        return jsonify({
            "success": True,
            "image": f"data:{content_type};base64,{image_base64}",
            "content_type": content_type,
            "size_mb": round(len(image_data) / (1024 * 1024), 2),
        })

    except requests.exceptions.Timeout:
        return jsonify({"success": False, "error": "Request timeout (30s)"})
    except requests.exceptions.RequestException as e:
        return jsonify({"success": False, "error": f"Network error: {str(e)}"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route("/process", methods=["POST"])
def process_endpoint():
    """Optimized image processing endpoint for React"""
    try:
        # Handle multipart/form-data from React frontend
        if 'image' in request.files:
            file = request.files['image']
            if file.filename == '':
                return jsonify({"success": False, "error": "No file selected"})
            
            # Convert file to base64
            file_data = file.read()
            image_base64 = base64.b64encode(file_data).decode('utf-8')
            
            # Determine content type
            content_type = file.content_type or 'image/jpeg'
            image_data = f"data:{content_type};base64,{image_base64}"
            
        else:
            # JSON fallback
            data = request.get_json()
            if not data:
                return jsonify({"success": False, "error": "No image data provided"})
            image_data = data.get("image")

        if not image_data:
            return jsonify({"success": False, "error": "No image data provided"})

        result = process_image(image_data)
        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route("/process_zip", methods=["POST"])
def process_zip_endpoint():
    """Optimized ZIP processing endpoint for React"""
    try:
        # Handle multipart/form-data from React frontend
        if 'zip_file' in request.files:
            file = request.files['zip_file']
            if file.filename == '':
                return jsonify({"success": False, "error": "No file selected"})
            
            # Convert file to base64
            file_data = file.read()
            zip_base64 = base64.b64encode(file_data).decode('utf-8')
            zip_data = f"data:application/zip;base64,{zip_base64}"
            
        else:
            # JSON fallback
            data = request.get_json()
            if not data:
                return jsonify({"success": False, "error": "No ZIP data provided"})
            zip_data = data.get("zip")

        if not zip_data:
            return jsonify({"success": False, "error": "No ZIP data provided"})

        result = process_zip_file(zip_data)
        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "brewchrome-react-backend",
        "version": "1.0.0",
        "features": ["colorthief", "zip_processing", "react_optimized"],
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

    return jsonify({"ready": ready, "dependencies": deps}), status_code

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))
