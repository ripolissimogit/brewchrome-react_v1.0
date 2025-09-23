import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, ImageIcon, FolderArchive } from 'lucide-react';

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
        relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200
        ${isDragActive
          ? 'border-primary bg-accent/50 scale-102'
          : 'border-border hover:border-primary/50 hover:bg-accent/20'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center space-y-6">
        <div className={`
          p-4 rounded-2xl transition-colors duration-200
          ${isDragActive ? 'bg-primary/10' : 'bg-accent'}
        `}>
          {isDragActive ? (
            <Upload className="w-8 h-8 text-primary" />
          ) : (
            <div className="flex space-x-1">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
              <FolderArchive className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-medium text-foreground">
            {isDragActive ? 'Drop your files here' : 'Upload Images or ZIP'}
          </h3>
          <p className="text-muted-foreground">
            Drag and drop files or click to browse
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>PNG</span>
            <span>•</span>
            <span>JPG</span>
            <span>•</span>
            <span>WebP</span>
            <span>•</span>
            <span>ZIP</span>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-xl">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};
