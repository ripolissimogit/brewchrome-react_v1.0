#!/usr/bin/env python3
import base64
import io
from typing import Any, Dict, List

from PIL import Image

from .enhanced_palette_generator import EnhancedPaletteGenerator


class PaletteEngine:
    def __init__(self, n_colors: int = 10):
        self.n_colors = n_colors
        self.generator = EnhancedPaletteGenerator(n_colors=n_colors)

    def process_image_data(self, image_data: bytes, format_hint: str | None = None) -> Dict[str, Any]:
        try:
            image = Image.open(io.BytesIO(image_data))
            if image.width * image.height > 4_000_000:
                ratio = (4_000_000 / (image.width * image.height)) ** 0.5
                new_size = (int(image.width * ratio), int(image.height * ratio))
                image = image.resize(new_size, Image.Resampling.LANCZOS)

            # DISABLED: smart_crop is too slow, using original image
            # cropped_image = self.generator.smart_crop_3_2(image)
            cropped_image = image  # Use original image directly
            palette = self.generator.extract_colors(cropped_image)
            social_img = self.generator.create_social_image(cropped_image, palette)

            social_buffer = io.BytesIO()
            social_img.save(social_buffer, format="PNG")
            social_base64 = base64.b64encode(social_buffer.getvalue()).decode()

            return {
                "success": True,
                "social_image": f"data:image/png;base64,{social_base64}",
                "palette": [{"hex": f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}", "rgb": list(c)} for c in palette],
                "cropped_image": cropped_image,
                "raw_palette": palette,
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def process_base64_image(self, base64_data: str) -> Dict[str, Any]:
        try:
            if "base64," in base64_data:
                base64_data = base64_data.split("base64,")[1]
            image_data = base64.b64decode(base64_data)
            return self.process_image_data(image_data)
        except Exception as e:
            return {"success": False, "error": f"Base64 decode error: {str(e)}"}


class BatchProcessor:
    def __init__(self, n_colors: int = 10):
        self.engine = PaletteEngine(n_colors)

    def process_batch(self, images: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        results = []
        for img in images:
            res = self.engine.process_image_data(img["data"]) 
            res["name"] = img["name"]
            res["type"] = img.get("type", "unknown")
            results.append(res)
        return results

