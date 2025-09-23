#!/usr/bin/env python3
"""Simple test script for backend functionality"""

import json
from main import process_image, process_zip_file

def test_process_image():
    """Test single image processing"""
    # Simple 1x1 red pixel PNG in base64
    test_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    
    result = process_image(test_image)
    print("Single image test:")
    print(json.dumps(result, indent=2))
    return result.get("success", False)

if __name__ == "__main__":
    print("Testing backend functionality...")
    
    success = test_process_image()
    
    if success:
        print("✅ Backend test passed!")
    else:
        print("❌ Backend test failed!")
