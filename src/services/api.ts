import type {
  PaletteResponse,
  HealthResponse,
  FetchUrlResponse,
  ZipProcessResponse,
} from '../types';
import { logger } from './logger';

const API_BASE = 'https://brewchrome-backend-736130833520.us-central1.run.app';

function getErrorMessage(status: number, data: any): string {
  if (data?.message) return data.message;
  
  switch (status) {
    case 400: return 'Input non valido';
    case 413: return 'File troppo grande, limite 50MB';
    case 415: return 'Formato file non supportato';
    case 422: return 'Formato non valido o immagine corrotta';
    case 408: return 'Timeout durante download, riprova';
    case 500:
    case 502: return 'Errore server, riprova più tardi';
    default: return 'Errore sconosciuto';
  }
}

function generateRequestId(): string {
  return crypto.randomUUID().slice(0, 8);
}

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
    const requestId = generateRequestId();
    
    try {
      logger.fileProcessing('start', file.name, {
        size: file.size,
        type: file.type,
        request_id: requestId,
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
          'X-Request-Id': requestId,
        },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = getErrorMessage(response.status, data);
        logger.error('API Error: process image', { 
          status: response.status, 
          error_code: data.error_code,
          message: data.message,
          request_id: requestId,
        });
        throw new Error(`${errorMsg} — id ${requestId}`);
      }

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
    const requestId = generateRequestId();
    
    try {
      logger.debug('API Call: fetch URL', { url, request_id: requestId });

      const response = await fetch(`${API_BASE}/fetch_url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = getErrorMessage(response.status, data);
        logger.error('API Error: fetch URL', { 
          status: response.status, 
          error_code: data.error_code,
          message: data.message,
          request_id: requestId,
        });
        throw new Error(`${errorMsg} — id ${requestId}`);
      }

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
