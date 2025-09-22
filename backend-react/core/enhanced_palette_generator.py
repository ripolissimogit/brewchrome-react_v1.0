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
        target_width = min(image.width, int(image.height * 3 / 2))
        target_height = int(target_width * 2 / 3)
        result = self.sc.crop(image, target_width, target_height)
        crop_box = (
            result["top_crop"]["x"],
            result["top_crop"]["y"],
            result["top_crop"]["x"] + result["top_crop"]["width"],
            result["top_crop"]["y"] + result["top_crop"]["height"],
        )
        return image.crop(crop_box)

    def extract_colors(self, image: Image.Image):
        img_bytes = BytesIO()
        image.save(img_bytes, format="JPEG")
        img_bytes.seek(0)
        color_thief = ColorThief(img_bytes)
        try:
            palette = color_thief.get_palette(color_count=min(self.n_colors + 5, 20), quality=1)
        except Exception:
            palette = color_thief.get_palette(color_count=self.n_colors, quality=1)
        unique = []
        seen = set()
        for c in palette:
            if c not in seen:
                seen.add(c)
                unique.append(c)
        while len(unique) < 10:
            base = unique[len(unique) % max(1, len(unique))]
            variation = tuple(max(0, min(255, v + 10)) for v in base)
            if variation not in seen:
                seen.add(variation)
                unique.append(variation)
            else:
                break
        return unique[:10]

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

