import { useRef, useEffect, useState } from 'react';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
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
}: GalleryProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  if (images.length === 0) return null;

  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollButtons);
      return () => container.removeEventListener('scroll', updateScrollButtons);
    }
  }, [images]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 280; // Width of item + gap
      const newScrollLeft = direction === 'left'
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount;

      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scrollContainerRef.current) {
      setIsDragging(true);
      setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
      setScrollLeft(scrollContainerRef.current.scrollLeft);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getFileSize = (size: number) => {
    if (size === 0) return 'ZIP';
    return size > 1024 * 1024
      ? `${(size / (1024 * 1024)).toFixed(1)}MB`
      : `${(size / 1024).toFixed(0)}KB`;
  };

  return (
    <div className="space-y-4">
      {/* Gallery Header - removed, now handled by parent */}

      {/* Carousel Container */}
      <div className="relative group">
        {/* Scroll Buttons */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border border-border rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border border-border rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="carousel-container cursor-grab select-none"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {images.map((image, index) => (
            <div
              key={image.id}
              className="carousel-item group cursor-pointer"
              onClick={() => {
                if (!isDragging) {
                  onImageClick(index);
                }
              }}
            >
              <div className="w-64 space-y-3">
                {/* Image Preview */}
                <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
                  <img
                    src={image.socialImage}
                    alt={image.filename}
                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Image Info */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground truncate">
                    {image.filename}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {image.extension.toUpperCase()} • {getFileSize(image.size)}
                  </div>
                </div>

                {/* Color Palette Preview */}
                <div className="flex gap-1">
                  {image.palette.slice(0, 6).map((color, colorIndex) => (
                    <div
                      key={colorIndex}
                      className="w-6 h-6 rounded-md border border-border flex-shrink-0"
                      style={{
                        backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
                      }}
                      title={`rgb(${color.r}, ${color.g}, ${color.b})`}
                    />
                  ))}
                  {image.palette.length > 6 && (
                    <div className="w-6 h-6 rounded-md border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      +{image.palette.length - 6}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Download Button */}
      {images.length > 0 && (
        <div className="flex justify-center">
          <button
            onClick={onDownloadAll}
            className="btn-minimal btn-primary gap-2"
          >
            <Download className="w-4 h-4" />
            Download {images.length === 1 ? 'Palette' : `All ${images.length} Palettes`}
          </button>
        </div>
      )}
    </div>
  );
}
