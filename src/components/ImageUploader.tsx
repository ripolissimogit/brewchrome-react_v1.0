import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, Archive } from 'lucide-react';

interface ImageUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onFileSelect,
  isLoading,
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
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/zip': ['.zip'],
    },
    multiple: false,
    disabled: isLoading,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center space-y-4">
        {isDragActive ? (
          <Upload className="w-12 h-12 text-blue-500" />
        ) : (
          <div className="flex space-x-2">
            <Image className="w-12 h-12 text-gray-400" />
            <Archive className="w-12 h-12 text-gray-400" />
          </div>
        )}

        <div>
          <p className="text-lg font-medium text-gray-700">
            {isDragActive ? 'Drop files here' : 'Drop images or ZIP files here'}
          </p>
          <p className="text-sm text-gray-500 mt-1">or click to select files</p>
          <p className="text-xs text-gray-400 mt-2">
            Supports: PNG, JPG, JPEG, WebP, ZIP
          </p>
        </div>
      </div>
    </div>
  );
};
