import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Processing...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <div className="w-8 h-8 border-2 border-border rounded-full"></div>
        <div className="absolute top-0 left-0 w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-muted-foreground mt-4 text-sm font-medium">{message}</p>
    </div>
  );
};
