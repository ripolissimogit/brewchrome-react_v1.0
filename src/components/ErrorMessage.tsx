import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onDismiss,
}) => {
  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start space-x-3">
      <div className="p-1 bg-destructive/10 rounded-full flex-shrink-0">
        <AlertCircle className="w-4 h-4 text-destructive" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-destructive text-sm font-medium">{message}</p>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          aria-label="Dismiss error"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
