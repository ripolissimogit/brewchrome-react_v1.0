import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { logger } from '../services/logger';

interface JobStatusProps {
  jobId: string;
  onComplete?: (results: any[]) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

export const JobStatus: React.FC<JobStatusProps> = ({ 
  jobId, 
  onComplete, 
  onError, 
  onCancel 
}) => {
  const [status, setStatus] = useState<string>('queued');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [startedAt] = useState(Date.now());

  useEffect(() => {
    if (!isPolling) return;

    const pollJob = async () => {
      try {
        const result = await api.waitForJob(jobId, {
          onProgress: (newStatus, newProgress) => {
            setStatus(newStatus);
            if (newProgress !== undefined) {
              setProgress(newProgress);
            }
          }
        });

        setIsPolling(false);

        if (result.status === 'completed') {
          logger.info('Job completed', { job_id: jobId, results_count: result.results?.length });
          onComplete?.(result.results || []);
        } else if (result.status === 'failed') {
          const errorMsg = `${result.error_code || 'UNKNOWN_ERROR'} — id ${result.request_id}`;
          setError(errorMsg);
          onError?.(errorMsg);
        }

      } catch (err) {
        setIsPolling(false);
        const errorMsg = err instanceof Error ? err.message : 'Polling failed';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    };

    pollJob();
  }, [jobId, isPolling, onComplete, onError]);

  const handleCancel = () => {
    setIsPolling(false);
    onCancel?.();
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'queued':
        return 'In coda...';
      case 'processing':
        return `Elaborazione in corso (${progress}%)...`;
      case 'completed':
        return 'Job completato';
      case 'failed':
        return `Job fallito: ${error}`;
      default:
        return `Status: ${status}`;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'queued':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const elapsedTime = Math.round((Date.now() - startedAt) / 1000);

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {status.toUpperCase()}
          </span>
          <span className="text-sm text-gray-600">
            Job: {jobId}
          </span>
        </div>
        {isPolling && (
          <button
            onClick={handleCancel}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Annulla polling
          </button>
        )}
      </div>

      <div className="mb-2">
        <p className="text-sm">{getStatusMessage()}</p>
        {status === 'processing' && (
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500">
        Tempo trascorso: {elapsedTime}s
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
};
