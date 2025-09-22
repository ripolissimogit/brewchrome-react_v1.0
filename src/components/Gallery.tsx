import { Download, X } from 'lucide-react';
import type { ProcessedImage } from '../types';

interface GalleryProps {
  images: ProcessedImage[];
  onImageClick: (index: number) => void;
  onDownloadAll: () => void;
  onClearAll: () => void;
}

export function Gallery({
  images,
  onImageClick,
  onDownloadAll,
  onClearAll,
}: GalleryProps) {
  if (images.length === 0) return null;

  const downloadLabel =
    images.length === 1 ? 'download 1' : `download all ${images.length}`;

  return (
    <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Gallery ({images.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onDownloadAll}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={16} />
            {downloadLabel}
          </button>
          <button
            onClick={onClearAll}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <X size={16} />
            clear all
          </button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="flex-shrink-0 cursor-pointer group"
            onClick={() => onImageClick(index)}
          >
            <div className="relative">
              <img
                src={image.socialImage}
                alt={image.filename}
                className="w-32 h-24 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-400 transition-colors"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all" />
            </div>
            <div className="mt-2 text-xs text-gray-600 text-center max-w-32 truncate">
              {image.extension} • {(image.size / (1024 * 1024)).toFixed(1)}mb
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
