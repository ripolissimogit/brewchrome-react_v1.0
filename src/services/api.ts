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

  async createJob(files: File[], options: { callback_url?: string; ttl_h?: number } = {}): Promise<{ job_id: string; status: string; eta_s: number; request_id: string }> {
    const requestId = generateRequestId();
    
    try {
      const formData = new FormData();
      
      // For now, support single ZIP file
      if (files.length === 1 && files[0].name.endsWith('.zip')) {
        formData.append('zip_file', files[0]);
      } else {
        throw new Error('Job API currently supports single ZIP files only');
      }
      
      if (options.callback_url) {
        formData.append('callback_url', options.callback_url);
      }
      if (options.ttl_h) {
        formData.append('ttl_h', options.ttl_h.toString());
      }

      logger.debug('API Call: create job', { 
        fileCount: files.length,
        request_id: requestId,
        options 
      });

      const response = await fetch(`${API_BASE}/jobs`, {
        method: 'POST',
        headers: {
          'X-Request-Id': requestId,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = getErrorMessage(response.status, data);
        logger.error('API Error: create job', { 
          status: response.status, 
          error_code: data.error_code,
          message: data.message,
          request_id: requestId,
        });
        throw new Error(`${errorMsg} — id ${requestId}`);
      }

      logger.info('API Success: job created', { 
        job_id: data.job_id,
        eta_s: data.eta_s,
        request_id: requestId 
      });

      return data;
    } catch (error) {
      logger.apiError('/jobs', error);
      throw error;
    }
  },

  async getJobStatus(jobId: string): Promise<{ status: string; progress?: number; results?: any[]; error_code?: string; message?: string; request_id: string }> {
    const requestId = generateRequestId();
    
    try {
      logger.debug('API Call: get job status', { job_id: jobId, request_id: requestId });

      const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
        method: 'GET',
        headers: {
          'X-Request-Id': requestId,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = getErrorMessage(response.status, data);
        logger.error('API Error: get job status', { 
          status: response.status, 
          error_code: data.error_code,
          message: data.message,
          job_id: jobId,
          request_id: requestId,
        });
        throw new Error(`${errorMsg} — id ${requestId}`);
      }

      logger.debug('API Success: job status', { 
        job_id: jobId,
        status: data.status,
        progress: data.progress,
        request_id: requestId 
      });

      return data;
    } catch (error) {
      logger.apiError(`/jobs/${jobId}`, error);
      throw error;
    }
  },

  async waitForJob(
    jobId: string, 
    options: {
      startDelayMs?: number;
      maxDelayMs?: number;
      factor?: number;
      maxTimeMs?: number;
      onProgress?: (status: string, progress?: number) => void;
    } = {}
  ): Promise<{ status: string; results?: any[]; error_code?: string; message?: string; request_id: string }> {
    const {
      startDelayMs = 1000,
      maxDelayMs = 10000,
      factor = 1.6,
      maxTimeMs = 10 * 60 * 1000, // 10 minutes
      onProgress
    } = options;

    const startTime = Date.now();
    let currentDelay = startDelayMs;

    while (Date.now() - startTime < maxTimeMs) {
      try {
        const status = await this.getJobStatus(jobId);
        
        if (onProgress) {
          onProgress(status.status, status.progress);
        }

        if (status.status === 'completed' || status.status === 'failed') {
          return status;
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay = Math.min(currentDelay * factor, maxDelayMs);

      } catch (error) {
        logger.warn('Job polling failed, retrying...', { job_id: jobId, error: error instanceof Error ? error.message : 'Unknown error' });
        
        // Wait before retry on error
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay = Math.min(currentDelay * factor, maxDelayMs);
      }
    }

    throw new Error(`Job polling timeout after ${maxTimeMs}ms`);
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
