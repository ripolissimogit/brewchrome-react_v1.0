import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import type { ProcessedImage } from '../types';

interface ModalProps {
  isOpen: boolean;
  currentIndex: number;
  images: ProcessedImage[];
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDownload: () => void;
}

export function Modal({
  isOpen,
  currentIndex,
  images,
  onClose,
  onPrevious,
  onNext,
  onDownload,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onPrevious();
          break;
        case 'ArrowRight':
          onNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrevious, onNext]);

  if (!isOpen || !images[currentIndex]) return null;

  const currentImage = images[currentIndex];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="relative max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentImage.socialImage}
          alt={currentImage.filename}
          className="max-w-full max-h-[80vh] object-contain"
        />

        {/* Palette display */}
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-1 bg-black bg-opacity-70 p-2 rounded-lg backdrop-blur-sm">
          {currentImage.palette.map((color, index) => (
            <div
              key={index}
              className="w-8 h-8 rounded border-2 border-white border-opacity-30 hover:border-opacity-80 transition-all cursor-pointer hover:scale-110"
              style={{
                backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
              }}
              title={`rgb(${color.r}, ${color.g}, ${color.b})`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          <button
            onClick={onPrevious}
            disabled={currentIndex === 0}
            className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg backdrop-blur-sm transition-all"
          >
            <ChevronLeft size={20} className="text-white" />
          </button>

          <button
            onClick={onNext}
            disabled={currentIndex === images.length - 1}
            className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg backdrop-blur-sm transition-all"
          >
            <ChevronRight size={20} className="text-white" />
          </button>

          <button
            onClick={onDownload}
            className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg backdrop-blur-sm transition-all"
          >
            <Download size={20} className="text-white" />
          </button>

          <button
            onClick={onClose}
            className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg backdrop-blur-sm transition-all"
          >
            <X size={20} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
