import { useState, useEffect } from 'react';
import { TabNavigation } from './components/TabNavigation';
import { OriginalUploader } from './components/OriginalUploader';
import { Gallery } from './components/Gallery';
import { Modal } from './components/Modal';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { ConsoleFooter } from './components/ConsoleFooter';
import { api } from './services/api';
import { downloadService } from './services/download';
import { logger } from './services/logger';
import type { ProcessedImage, TabType } from './types';

function App() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('files');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [backendStatus, setBackendStatus] = useState(false);
  const [urlInput, setUrlInput] = useState<string>('');

  useEffect(() => {
    logger.info('App initialized');
    api.health()
      .then(() => {
        setBackendStatus(true);
        logger.info('Backend detected');
      })
      .catch(() => {
        setBackendStatus(false);
        logger.warn('Backend not available');
      });
  }, []);

  const handleFileUpload = async (files: File[]) => {
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        files.map(async (file) => {
          const result = await api.processImage(file);
          
          // Fallback to original image only if backend doesn't provide social_image
          let socialImage = result.social_image;
          if (!socialImage) {
            const originalImageDataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            socialImage = originalImageDataUrl;
          }

          return {
            id: `${Date.now()}-${Math.random()}`,
            filename: file.name,
            size: file.size,
            extension: file.name.split('.').pop() || '',
            tab: 'files' as const,
            palette: result.palette || [],
            socialImage,
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

  const handleFileSelect = (files: File[]) => {
    // Validate files based on active tab
    const validateFile = (file: File, tab: TabType) => {
      const isImage = file.type.startsWith('image/');
      const isZip = file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip');

      if (tab === 'files' && !isImage) {
        return `Invalid file type: ${file.name}. Please select image files for Files tab`;
      }
      if (tab === 'archive' && !isZip) {
        return `Invalid file type: ${file.name}. Please select a ZIP archive for Archive tab`;
      }

      // File size validation (max 30MB)
      if (file.size > 30 * 1024 * 1024) {
        return `File too large: ${file.name}. Maximum size is 30MB.`;
      }

      return null;
    };

    // For archive tab, only allow single file
    if (activeTab === 'archive') {
      const file = files[0];
      const validationError = validateFile(file, activeTab);
      if (validationError) {
        setError(validationError);
        logger.warn('File validation failed', { fileName: file.name, tab: activeTab });
        return;
      }
      setSelectedFiles([file]);
      setError(null);
      logger.info('File selected', { fileName: file.name, tab: activeTab });
      return;
    }

    // For files tab, validate all files
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const validationError = validateFile(file, activeTab);
      if (validationError) {
        errors.push(validationError);
      } else {
        // Check for duplicates
        const isDuplicate = selectedFiles.some(existing => 
          existing.name === file.name && existing.size === file.size
        );
        if (!isDuplicate) {
          validFiles.push(file);
        }
      }
    }

    if (errors.length > 0) {
      setError(errors[0]); // Show first error
      logger.warn('File validation failed', { errors, tab: activeTab });
    } else {
      setError(null);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      logger.info('Files selected', { count: validFiles.length, tab: activeTab });
    }
  };

  const handleProcessFiles = async () => {
    if (selectedFiles.length === 0) return;

    // Handle single ZIP file for archive tab
    if (activeTab === 'archive') {
      const file = selectedFiles[0];
      const isZip = file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip');
      if (isZip) {
        await handleZipUpload(file);
        return;
      }
    }

    // Handle multiple files for files tab
    if (activeTab === 'files') {
      await handleFileUpload(selectedFiles);
    }
  };

  const handleClearFiles = () => {
    setSelectedFiles([]);
    setError(null);
    logger.info('Files cleared');
  };

  const handleProcessUrl = async () => {
    if (!urlInput.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch image from URL
      const fetchResult = await api.fetchUrl(urlInput);
      
      if (!fetchResult.success || !fetchResult.image) {
        throw new Error(fetchResult.error || 'Failed to fetch URL');
      }

      // Step 2: Process the fetched image for palette
      const processResult = await api.processDataUrl(fetchResult.image);
      
      if (!processResult.success) {
        throw new Error(processResult.error || 'Failed to process image');
      }

      // Step 3: Create processed image entry
      const processedImage: ProcessedImage = {
        id: `url-${Date.now()}`,
        filename: urlInput.split('/').pop() || 'url-image',
        size: Math.round((fetchResult.size_mb || 0) * 1024 * 1024),
        extension: (fetchResult.content_type?.split('/')[1] || 'jpg') as string,
        tab: 'urls',
        palette: processResult.palette || [],
        socialImage: processResult.social_image || fetchResult.image, // Fallback to original
      };

      setImages((prev) => [...prev, processedImage]);
      setUrlInput(''); // Clear input after success
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'URL processing failed';
      setError(message);
      logger.error('URL processing failed', { url: urlInput, error: message });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    const filteredImages = images.filter(img => img.tab === activeTab);
    
    try {
      await downloadService.downloadAllAsZip(filteredImages);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Download failed';
      setError(message);
      logger.error('Download failed', { error: message });
    }
  };

  const handleZipUpload = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.processZip(file);
      if (result.success && result.results) {
        // Create processed image entries for each image in the ZIP
        const processedImages = result.results.map((zipResult, index) => ({
          id: `${Date.now()}-zip-${index}`,
          filename: zipResult.filename,
          size: 0, // Size not available for individual ZIP images
          extension: zipResult.filename.split('.').pop() || '',
          tab: 'archive' as const,
          palette: zipResult.palette || [],
          socialImage: zipResult.social_image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg==', // Placeholder SVG
        }));

        setImages((prev) => [...prev, ...processedImages]);
        logger.info(`ZIP processed: ${processedImages.length} images extracted`);
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
    <div className="min-h-screen bg-white pb-20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-lg font-normal text-gray-900 mb-2">
            BrewChrome
          </h1>
          <p className="text-xs text-gray-500">
            FE v3.1.1-hardening • BE 3.1.1
          </p>
        </header>

        {/* Tab Navigation */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSelectedFiles([]);
            setError(null);
          }}
        />

        {/* Main Content */}
        <main className="space-y-8">
          {/* Upload/Input Area */}
          <OriginalUploader
            activeTab={activeTab}
            onFileSelect={handleFileSelect}
            onProcessFiles={handleProcessFiles}
            onClearFiles={handleClearFiles}
            isLoading={loading}
            hasFiles={selectedFiles.length > 0}
            urlValue={urlInput}
            onUrlChange={setUrlInput}
            onProcessClick={handleProcessUrl}
            selectedFiles={selectedFiles}
          />

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner message="Processing files..." />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex justify-center">
              <div className="max-w-md w-full">
                <ErrorMessage message={error} onDismiss={() => setError(null)} />
              </div>
            </div>
          )}

          {/* Results Gallery */}
          {images.length > 0 && (
            <div className="space-y-6">
              <Gallery
                images={images.filter(img => img.tab === activeTab)}
                onImageClick={(index: number) => setModalIndex(index)}
                onDownloadAll={handleDownloadAll}
                onClearAll={() => setImages([])}
              />
            </div>
          )}
        </main>

        {/* Modal */}
        {modalIndex !== null && (
          <Modal
            isOpen={true}
            images={images.filter(img => img.tab === activeTab)}
            currentIndex={modalIndex}
            onClose={() => setModalIndex(null)}
            onNext={() => {
              const filteredImages = images.filter(img => img.tab === activeTab);
              setModalIndex((modalIndex + 1) % filteredImages.length);
            }}
            onPrevious={() => {
              const filteredImages = images.filter(img => img.tab === activeTab);
              setModalIndex((modalIndex - 1 + filteredImages.length) % filteredImages.length);
            }}
            onDownload={() => {}}
          />
        )}
      </div>

      {/* Console Footer */}
      <ConsoleFooter
        frontendVersion="v3.1.1-hardening"
        backendVersion="3.1.1"
        backendStatus={backendStatus}
      />
    </div>
  );
}

export default App;
