import type {
  PaletteResponse,
  HealthResponse,
  FetchUrlResponse,
  ZipProcessResponse,
} from '../types';
import { logger } from './logger';

const API_BASE = 'https://brewchrome-backend-736130833520.us-central1.run.app';

export const api = {
  async health(): Promise<HealthResponse> {
    try {
      logger.debug('API Call: health check');
      const response = await fetch(`${API_BASE}/health`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('API Success: health check', { version: data.version });
      return data;
    } catch (error) {
      logger.apiError('/health', error);
      throw error;
    }
  },

  async ready(): Promise<{ ready: boolean; dependencies: Record<string, boolean> }> {
    try {
      logger.debug('API Call: readiness check');
      const response = await fetch(`${API_BASE}/ready`);

      const data = await response.json();
      
      if (!response.ok) {
        logger.warn('Readiness check failed', { status: response.status, data });
      } else {
        logger.info('API Success: readiness check', { ready: data.ready });
      }
      
      return data;
    } catch (error) {
      logger.apiError('/ready', error);
      throw error;
    }
  },

  async processImage(file: File): Promise<PaletteResponse> {
    try {
      logger.fileProcessing('start', file.name, {
        size: file.size,
        type: file.type,
      });

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch(`${API_BASE}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64 }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Fix format incompatibility: backend returns [[r,g,b]] arrays
      if (data.success && data.palette) {
        data.palette = data.palette.map((color: number[]) => ({
          r: color[0],
          g: color[1],
          b: color[2],
        }));
      }

      if (data.success) {
        logger.info('API Success: image processed', {
          fileName: file.name,
          colorsCount: data.palette?.length,
        });
      } else {
        logger.warn('API Warning: image processing failed', {
          fileName: file.name,
          error: data.error,
        });
      }

      return data;
    } catch (error) {
      logger.apiError('/process', error, { fileName: file.name });
      throw error;
    }
  },

  async processZip(file: File): Promise<ZipProcessResponse> {
    try {
      logger.fileProcessing('start ZIP', file.name, {
        size: file.size,
        type: file.type,
      });

      const formData = new FormData();
      formData.append('zip_file', file);

      const response = await fetch(`${API_BASE}/process_zip`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Process results to fix format incompatibility
      if (data.success && data.results) {
        data.results = data.results.map((result: any) => ({
          ...result,
          palette: result.palette?.map((color: number[]) => ({
            r: color[0],
            g: color[1],
            b: color[2],
          })) || [],
        }));
      }

      if (data.success) {
        logger.info('API Success: ZIP processed', {
          fileName: file.name,
          resultsCount: data.results?.length,
        });
      } else {
        logger.warn('API Warning: ZIP processing failed', {
          fileName: file.name,
          error: data.error,
        });
      }

      return data;
    } catch (error) {
      logger.apiError('/process_zip', error, { fileName: file.name });
      throw error;
    }
  },

  async fetchUrl(url: string): Promise<FetchUrlResponse> {
    try {
      logger.debug('API Call: fetch URL', { url });

      const response = await fetch(`${API_BASE}/fetch_url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        logger.info('API Success: URL fetched', {
          url,
          contentType: data.content_type,
          sizeMB: data.size_mb,
        });
      } else {
        logger.warn('API Warning: URL fetch failed', {
          url,
          error: data.error,
        });
      }

      return data;
    } catch (error) {
      logger.apiError('/fetch_url', error, { url });
      throw error;
    }
  },

  async processDataUrl(dataUrl: string): Promise<PaletteResponse> {
    try {
      logger.debug('API Call: process data URL');

      const response = await fetch(`${API_BASE}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: dataUrl }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('API Success: process data URL', { 
        success: data.success,
        colorsCount: data.palette?.length 
      });
      return data;
    } catch (error) {
      logger.apiError('/process (data URL)', error);
      throw error;
    }
  },
};
