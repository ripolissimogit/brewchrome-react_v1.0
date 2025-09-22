import React from 'react';
import { Copy, Check } from 'lucide-react';
import { logger } from '../services/logger';
import type { Color } from '../types';

interface PaletteDisplayProps {
  colors: Color[];
}

export const PaletteDisplay: React.FC<PaletteDisplayProps> = ({ colors }) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const rgbToHex = (r: number, g: number, b: number): string => {
    // Safety checks
    if (
      typeof r !== 'number' ||
      typeof g !== 'number' ||
      typeof b !== 'number'
    ) {
      logger.error('Invalid RGB values', { r, g, b });
      return '#000000';
    }

    const toHex = (n: number) => {
      const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
      return hex.padStart(2, '0');
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const copyToClipboard = async (color: Color, index: number) => {
    try {
      const hex = rgbToHex(color.r, color.g, color.b);
      await navigator.clipboard.writeText(hex);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);

      logger.userAction('color_copied', {
        colorIndex: index,
        hexValue: hex,
        rgbValue: `rgb(${color.r}, ${color.g}, ${color.b})`,
      });
    } catch (error) {
      logger.error('Failed to copy color to clipboard', {
        colorIndex: index,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Safety check for colors array
  if (!colors || !Array.isArray(colors) || colors.length === 0) {
    return null;
  }

  // Filter out invalid colors
  const validColors = colors.filter(
    (color) =>
      color &&
      typeof color === 'object' &&
      typeof color.r === 'number' &&
      typeof color.g === 'number' &&
      typeof color.b === 'number'
  );

  if (validColors.length === 0) {
    logger.warn('No valid colors found in palette', { originalColors: colors });
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Color Palette</h2>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {validColors.map((color, index) => {
          const hex = rgbToHex(color.r, color.g, color.b);
          const rgb = `rgb(${color.r}, ${color.g}, ${color.b})`;

          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div
                className="h-24 w-full cursor-pointer relative group"
                style={{ backgroundColor: rgb }}
                onClick={() => copyToClipboard(color, index)}
              >
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                  {copiedIndex === index ? (
                    <Check className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
                  ) : (
                    <Copy className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
                  )}
                </div>
              </div>

              <div className="p-3">
                <p className="text-sm font-mono text-gray-800">{hex}</p>
                <p className="text-xs text-gray-500 mt-1">{rgb}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-sm text-gray-500 mt-4 text-center">
        Click on any color to copy its hex value
      </p>
    </div>
  );
};
