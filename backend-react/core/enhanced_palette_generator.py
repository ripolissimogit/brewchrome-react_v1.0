#!/usr/bin/env python3
from io import BytesIO

import numpy as np
import smartcrop
from colorthief import ColorThief
from PIL import Image, ImageDraw


class EnhancedPaletteGenerator:
    def __init__(self, n_colors: int = 10):
        self.n_colors = n_colors
        self.sc = smartcrop.SmartCrop()

    def smart_crop_3_2(self, image: Image.Image) -> Image.Image:
        # Handle very small images
        if image.width < 3 or image.height < 2:
            return image
            
        target_width = min(image.width, int(image.height * 3 / 2))
        target_height = int(target_width * 2 / 3)
        
        # Ensure minimum dimensions
        if target_width < 1:
            target_width = 1
        if target_height < 1:
            target_height = 1
            
        try:
            result = self.sc.crop(image, target_width, target_height)
            crop_box = (
                result["top_crop"]["x"],
                result["top_crop"]["y"],
                result["top_crop"]["x"] + result["top_crop"]["width"],
                result["top_crop"]["y"] + result["top_crop"]["height"],
            )
            return image.crop(crop_box)
        except Exception:
            # Fallback to original image if cropping fails
            return image

    def extract_colors(self, image: Image.Image):
        img_bytes = BytesIO()
        
        # Convert RGBA to RGB if necessary
        if image.mode in ('RGBA', 'LA', 'P'):
            # Create white background
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        
        image.save(img_bytes, format="JPEG")
        img_bytes.seek(0)
        color_thief = ColorThief(img_bytes)
        try:
            palette = color_thief.get_palette(color_count=min(self.n_colors + 5, 20), quality=1)
        except Exception:
            try:
                palette = color_thief.get_palette(color_count=self.n_colors, quality=1)
            except Exception:
                # Fallback to basic colors if extraction fails
                palette = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0), (255, 0, 255)]
        
        unique = []
        seen = set()
        for c in palette:
            if c not in seen:
                seen.add(c)
                unique.append(c)
        
        # Ensure we have at least some colors
        if len(unique) == 0:
            unique = [(128, 128, 128)]  # Default gray
            seen.add((128, 128, 128))
        
        # Fill up to 10 colors with variations
        while len(unique) < 10:
            if len(unique) == 0:
                break
            base_index = len(unique) % len(unique)  # Safe modulo
            base = unique[base_index]
            variation = tuple(max(0, min(255, v + 10)) for v in base)
            if variation not in seen:
                seen.add(variation)
                unique.append(variation)
            else:
                # Try a different variation
                variation = tuple(max(0, min(255, v - 10)) for v in base)
                if variation not in seen:
                    seen.add(variation)
                    unique.append(variation)
                else:
                    break
        return unique[:10]

    def create_social_image(self, image: Image.Image, palette: list) -> str:
        """Create 1080x720 social image with palette overlay"""
        try:
            # Target dimensions
            target_width, target_height = 1080, 720
            
            # Smart crop to 3:2 ratio
            cropped_image = self.smart_crop_3_2(image)
            
            # Resize to fit 75% of target width (810px)
            main_width = int(target_width * 0.75)
            main_height = int(main_width * cropped_image.height / cropped_image.width)
            
            # If height exceeds available space, scale by height instead
            if main_height > target_height - 16:  # 8px borders top/bottom
                main_height = target_height - 16
                main_width = int(main_height * cropped_image.width / cropped_image.height)
            
            main_image = cropped_image.resize((main_width, main_height), Image.Resampling.LANCZOS)
            
            # Create social image canvas
            social = Image.new('RGB', (target_width, target_height), (255, 255, 255))
            
            # Paste main image with 8px border
            x_offset = 8
            y_offset = (target_height - main_height) // 2
            social.paste(main_image, (x_offset, y_offset))
            
            # Create palette strip (25% width = 270px)
            palette_width = target_width - main_width - 24  # 8px borders + 8px gap
            palette_height = target_height - 16  # 8px borders
            
            if palette_width > 0 and len(palette) > 0:
                color_height = palette_height // len(palette)
                
                for i, color in enumerate(palette[:10]):
                    color_rect = Image.new('RGB', (palette_width, color_height), color)
                    palette_x = main_width + 16  # 8px border + 8px gap
                    palette_y = 8 + (i * color_height)
                    social.paste(color_rect, (palette_x, palette_y))
            
            # Convert to base64
            buffer = BytesIO()
            social.save(buffer, format='PNG', optimize=True)
            buffer.seek(0)
            
            social_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            return f"data:image/png;base64,{social_base64}"
            
        except Exception as e:
            print(f"Social image generation failed: {e}")
            return None

    def create_social_image(self, image: Image.Image, palette, target_size=(1080, 720), border_size=8):
        inner_width, inner_height = target_size
        available_height = inner_height - border_size
        img_height = int(available_height * 0.75)
        aspect_ratio = image.width / image.height
        target_aspect = inner_width / img_height
        if aspect_ratio > target_aspect:
            new_height = img_height
            new_width = int(new_height * aspect_ratio)
            resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            left = (new_width - inner_width) // 2
            resized = resized.crop((left, 0, left + inner_width, new_height))
        else:
            new_width = inner_width
            new_height = int(new_width / aspect_ratio)
            resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            top = (new_height - img_height) // 2
            resized = resized.crop((0, top, new_width, top + img_height))
        canvas = Image.new("RGB", (inner_width, inner_height), "white")
        canvas.paste(resized, (0, 0))
        start_y = img_height + border_size
        draw = ImageDraw.Draw(canvas)
        if len(palette) < 10:
            while len(palette) < 10:
                palette.append(palette[-1])
        palette = palette[:10]
        num_colors = 10
        total_gap = (num_colors - 1) * border_size
        color_width_total = inner_width - total_gap
        base_w = color_width_total // num_colors
        extra = color_width_total % num_colors
        x = 0
        for i, color in enumerate(palette):
            w = base_w + (1 if i < extra else 0)
            x2 = x + w
            if i == num_colors - 1:
                x2 = inner_width
            draw.rectangle([x, start_y, x2 - 1, inner_height - 1], fill=color)
            x = x2 + border_size
        final = Image.new("RGB", (inner_width + 2 * border_size, inner_height + 2 * border_size), "white")
        final.paste(canvas, (border_size, border_size))
        return final

