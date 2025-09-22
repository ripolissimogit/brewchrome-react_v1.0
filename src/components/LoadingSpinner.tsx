import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Processing...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      <p className="text-gray-600 mt-2">{message}</p>
    </div>
  );
};
