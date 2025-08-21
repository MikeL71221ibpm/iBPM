import React from 'react';

interface UploadStatusIndicatorProps {
  status?: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  fileName?: string;
  fileSize?: number;
  progress?: number;
  message?: string;
  error?: string;
  estimatedTime?: number;
  onDismiss?: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
  children?: React.ReactNode;
}

export default function UploadStatusIndicator(props: UploadStatusIndicatorProps) {
  // COMPLETELY DISABLED - This component was causing persistent "Processing Data" notifications
  // It should never render anything or log any messages
  return null;
}