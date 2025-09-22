import { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ImageUploader } from './components/ImageUploader';
import { Gallery } from './components/Gallery';
import { Modal } from './components/Modal';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { api } from './services/api';
import { logger } from './services/logger';
import type { ProcessedImage } from './types';

function App() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalIndex, setModalIndex] = useState<number | null>(null);

  useEffect(() => {
    logger.info('App initialized');
    api.health().catch(() => {});
  }, []);

  const handleFileUpload = async (files: File[]) => {
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        files.map(async (file) => {
          const result = await api.processImage(file);
          return {
            id: `${Date.now()}-${Math.random()}`,
            filename: file.name,
            size: file.size,
            extension: file.name.split('.').pop() || '',
            tab: 'files' as const,
            palette: result.palette || [],
            socialImage: result.social_image || '',
          } as ProcessedImage;
        })
      );

      setImages((prev) => [...prev, ...results]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSingleFile = (file: File) => {
    // Validate file type - allow images and ZIP files
    const isImage = file.type.startsWith('image/');
    const isZip = file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip');
    
    if (!isImage && !isZip) {
      setError(`Invalid file type: ${file.name}. Please upload an image or ZIP file.`);
      logger.warn('Invalid file type uploaded', { 
        fileName: file.name, 
        fileType: file.type 
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(`File too large: ${file.name}. Maximum size is 10MB.`);
      logger.warn('File too large', { 
        fileName: file.name, 
        fileSize: file.size 
      });
      return;
    }

    if (isZip) {
      handleZipUpload(file);
    } else {
      handleFileUpload([file]);
    }
  };

  const handleZipUpload = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.processZip(file);
      if (result.success) {
        // For ZIP files, create a single processed image entry
        const processedImage = {
          id: `${Date.now()}-zip`,
          filename: file.name,
          size: file.size,
          extension: 'zip',
          tab: 'archive' as const,
          palette: result.palette || [],
          socialImage: result.social_image || '',
        };
        setImages((prev) => [...prev, processedImage]);
      } else {
        throw new Error(result.error || 'ZIP processing failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ZIP upload failed';
      setError(message);
      logger.error('ZIP upload failed', { error: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Palette className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">BrewChrome</h1>
          </div>
          <p className="text-muted-foreground">
            Extract beautiful color palettes from your images
          </p>
        </header>

        <main className="space-y-8">
          <Card className="p-6">
            <ImageUploader onFileSelect={handleSingleFile} isLoading={loading} />
          </Card>

          {loading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

          {images.length > 0 && (
            <Card className="p-6">
              <Gallery
                images={images}
                onImageClick={(index: number) => setModalIndex(index)}
                onDownloadAll={() => {}}
                onClearAll={() => setImages([])}
              />
            </Card>
          )}
        </main>

        {modalIndex !== null && (
          <Modal
            isOpen={true}
            images={images}
            currentIndex={modalIndex}
            onClose={() => setModalIndex(null)}
            onNext={() => setModalIndex((modalIndex + 1) % images.length)}
            onPrevious={() => setModalIndex((modalIndex - 1 + images.length) % images.length)}
            onDownload={() => {}}
          />
        )}
      </div>
    </div>
  );
}

export default App;
