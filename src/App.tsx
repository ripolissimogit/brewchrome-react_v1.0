import { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { ImageUploader } from './components/ImageUploader';
import { PaletteDisplay } from './components/PaletteDisplay';
import { Gallery } from './components/Gallery';
import { Modal } from './components/Modal';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { api } from './services/api';
import { downloadService } from './services/download';
import { logger } from './services/logger';
import type { Color, ProcessedImage } from './types';

function App() {
  const [colors, setColors] = useState<Color[]>([]);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentModalIndex, setCurrentModalIndex] = useState(0);

  useEffect(() => {
    logger.info('App initialized', {
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString(),
    });

    // Test backend connection
    api
      .health()
      .then(() => logger.info('Backend connection successful'))
      .catch((err) =>
        logger.warn('Backend connection failed', { error: err.message })
      );
  }, []);

  const handleFileSelect = async (file: File) => {
    logger.userAction('file_selected', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    setIsLoading(true);
    setError(null);

    try {
      let response;

      if (file.type === 'application/zip') {
        logger.userAction('processing_zip', { fileName: file.name });
        response = await api.processZip(file);
      } else {
        logger.userAction('processing_image', { fileName: file.name });
        response = await api.processImage(file);
      }

      if (response.success && response.palette) {
        setColors(response.palette);

        // Add to gallery if social image is available
        if (response.social_image) {
          const processedImage: ProcessedImage = {
            id: Date.now().toString(),
            filename: file.name,
            socialImage: response.social_image,
            palette: response.palette,
            size: file.size,
            extension: file.name.split('.').pop()?.toLowerCase() || 'jpg',
            tab: 'files',
          };

          setProcessedImages((prev) => [...prev, processedImage]);
          logger.info('Image added to gallery', { filename: file.name });
        }

        logger.userAction('processing_success', {
          fileName: file.name,
          colorsExtracted: response.palette.length,
        });
      } else {
        throw new Error(response.error || 'Processing failed');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      logger.error('Processing failed', {
        fileName: file.name,
        error: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageClick = (index: number) => {
    setCurrentModalIndex(index);
    setModalOpen(true);
    logger.userAction('modal_opened', { imageIndex: index });
  };

  const handleModalClose = () => {
    setModalOpen(false);
    logger.userAction('modal_closed');
  };

  const handleModalPrevious = () => {
    if (currentModalIndex > 0) {
      setCurrentModalIndex(currentModalIndex - 1);
      logger.userAction('modal_previous');
    }
  };

  const handleModalNext = () => {
    if (currentModalIndex < processedImages.length - 1) {
      setCurrentModalIndex(currentModalIndex + 1);
      logger.userAction('modal_next');
    }
  };

  const handleDownloadCurrent = () => {
    const currentImage = processedImages[currentModalIndex];
    if (currentImage) {
      downloadService.downloadImage(
        currentImage.socialImage,
        currentImage.filename
      );
    }
  };

  const handleDownloadAll = () => {
    downloadService.downloadAllAsZip(processedImages);
  };

  const handleClearAll = () => {
    setProcessedImages([]);
    setColors([]);
    logger.userAction('gallery_cleared');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Palette className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-800">BrewChrome</h1>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
              React v1.0
            </span>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Extract beautiful color palettes from your images with AI-powered
            analysis. Upload single images or ZIP archives for batch processing.
          </p>
        </header>

        <main className="max-w-4xl mx-auto">
          <ImageUploader
            onFileSelect={handleFileSelect}
            isLoading={isLoading}
          />

          {isLoading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}
          {colors.length > 0 && <PaletteDisplay colors={colors} />}

          <Gallery
            images={processedImages}
            onImageClick={handleImageClick}
            onDownloadAll={handleDownloadAll}
            onClearAll={handleClearAll}
          />
        </main>
      </div>

      <Modal
        isOpen={modalOpen}
        currentIndex={currentModalIndex}
        images={processedImages}
        onClose={handleModalClose}
        onPrevious={handleModalPrevious}
        onNext={handleModalNext}
        onDownload={handleDownloadCurrent}
      />
    </div>
  );
}

export default App;
