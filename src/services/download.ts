import JSZip from 'jszip';
import type { ProcessedImage } from '../types';
import { logger } from './logger';

export const downloadService = {
  downloadImage(dataUrl: string, filename: string) {
    if (!dataUrl || dataUrl.trim() === '') {
      logger.warn('Download failed: no image data', { filename });
      throw new Error('Download not available - no image data');
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `palette-${filename}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logger.userAction('image_downloaded', { filename });
  },

  async downloadAllAsZip(images: ProcessedImage[]) {
    if (images.length === 0) {
      logger.warn('No images to download');
      throw new Error('No images to download');
    }

    // Check if any images are missing socialImage
    const imagesWithoutData = images.filter(img => !img.socialImage || img.socialImage.trim() === '');
    if (imagesWithoutData.length > 0) {
      logger.warn('Some images missing data', { 
        missing: imagesWithoutData.length,
        total: images.length 
      });
      throw new Error(`${imagesWithoutData.length} images missing data - download not available`);
    }

    // Single image - download directly
    if (images.length === 1) {
      const image = images[0];
      this.downloadImage(image.socialImage, image.filename);
      logger.userAction('single_image_downloaded', {
        filename: image.filename,
      });
      return;
    }

    try {
      logger.userAction('zip_download_started', { count: images.length });

      const zip = new JSZip();

      // Group by tab
      const groupedImages = {
        files: images.filter((img) => img.tab === 'files'),
        urls: images.filter((img) => img.tab === 'urls'),
        archive: images.filter((img) => img.tab === 'archive'),
      };

      // Add images to respective folders
      for (const [tabName, tabImages] of Object.entries(groupedImages)) {
        if (tabImages.length === 0) continue;

        for (let i = 0; i < tabImages.length; i++) {
          const image = tabImages[i];

          // Convert base64 to blob
          const response = await fetch(image.socialImage);
          const blob = await response.blob();

          const filename = `palette-${i + 1}-${image.filename}`;
          zip.file(`${tabName}/${filename}`, blob);
        }
      }

      // Generate ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Download ZIP
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `brewchrome-palettes-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      URL.revokeObjectURL(link.href);

      logger.userAction('zip_download_completed', {
        count: images.length,
        folders: Object.keys(groupedImages).filter(
          (key) => groupedImages[key as keyof typeof groupedImages].length > 0
        ),
      });
    } catch (error) {
      logger.error('ZIP download failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback: download individually
      logger.info('Falling back to individual downloads');
      images.forEach((image, index) => {
        setTimeout(() => {
          this.downloadImage(image.socialImage, image.filename);
        }, index * 500);
      });
    }
  },
};
