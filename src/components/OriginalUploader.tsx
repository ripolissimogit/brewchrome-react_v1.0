import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Folder, Play, Trash2, Globe } from 'lucide-react';
import type { TabType } from '../types';

interface OriginalUploaderProps {
  activeTab: TabType;
  onFileSelect: (file: File) => void;
  onProcessFiles: () => void;
  onClearFiles: () => void;
  isLoading: boolean;
  hasFiles: boolean;
  urlValue?: string;
  onUrlChange?: (url: string) => void;
  onProcessClick?: () => void;
}

export const OriginalUploader: React.FC<OriginalUploaderProps> = ({
  activeTab,
  onFileSelect,
  onProcessFiles,
  onClearFiles,
  isLoading,
  hasFiles,
  urlValue = '',
  onUrlChange,
  onProcessClick,
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: activeTab === 'files' ? {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.heic', '.avif', '.tiff', '.gif', '.bmp'],
      'image/svg+xml': ['.svg'],
    } : activeTab === 'archive' ? {
      'application/zip': ['.zip'],
    } : {},
    multiple: false,
    disabled: isLoading,
  });

  const getUploadText = () => {
    if (activeTab === 'files') return 'choose files';
    if (activeTab === 'urls') return 'enter URL';
    if (activeTab === 'archive') return 'choose archive';
    return 'choose files';
  };

  const getFileFormats = () => {
    if (activeTab === 'files') {
      return 'Max 30MB per file • Supported: JPG, PNG, WebP, HEIC, AVIF, TIFF, GIF, BMP, SVG';
    }
    if (activeTab === 'archive') {
      return 'Max 30MB per file • Supported: ZIP archives containing images';
    }
    if (activeTab === 'urls') {
      return 'Enter image URL • Supported: JPG, PNG, WebP, GIF formats';
    }
    return '';
  };

  if (activeTab === 'urls') {
    return (
      <div className="space-y-8">
        {/* URL Input Area */}
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg">
              <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
                disabled={isLoading}
                value={urlValue}
                onChange={(e) => onUrlChange?.(e.target.value)}
              />
            </div>
            <div className="text-center mt-2">
              <p className="text-xs text-gray-500">
                {urlValue.trim() ? 'URL ready to process' : 'no URL entered'}
              </p>
            </div>
          </div>
        </div>

        {/* File Formats */}
        <div className="text-center">
          <p className="text-xs text-gray-500">{getFileFormats()}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={onProcessClick}
            disabled={isLoading || !urlValue.trim()}
            className="original-button"
          >
            <Play className="w-4 h-4" />
            process URL
          </button>
          <button
            onClick={() => onUrlChange?.('')}
            disabled={isLoading || !urlValue.trim()}
            className="original-button"
          >
            <Trash2 className="w-4 h-4" />
            clean
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Upload Area */}
      <div className="flex justify-center">
        <div
          {...getRootProps()}
          className={`
            cursor-pointer transition-colors
            ${isDragActive ? 'text-gray-900' : 'text-gray-700 hover:text-gray-900'}
            ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="upload-box">
            <Folder className="w-4 h-4 text-gray-400" />
            <span>{getUploadText()}</span>
          </div>
          <div className="text-center mt-2">
            <p className="text-xs text-gray-500">
              {hasFiles ? 'file selected' : 'no file selected'}
            </p>
          </div>
        </div>
      </div>

      {/* File Formats */}
      <div className="text-center">
        <p className="text-xs text-gray-500">{getFileFormats()}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <button
          onClick={onProcessFiles}
          disabled={isLoading || !hasFiles}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Play className="w-4 h-4" />
          process files
        </button>
        <button
          onClick={onClearFiles}
          disabled={isLoading || !hasFiles}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          clean
        </button>
      </div>
    </div>
  );
};