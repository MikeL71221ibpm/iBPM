import React, { useState } from 'react';
import { Loader2, Database, CheckCircle, X, Minimize2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import DatabaseStatsWidget from './DatabaseStatsWidget';

interface PostUploadLoadingProps {
  isVisible: boolean;
  message?: string;
  progress?: number;
  isProcessing?: boolean;
  isBackgroundProcessing?: boolean;
  expectedSymptoms?: number;
  currentSymptoms?: number;
  databaseStats?: any; // Pass database stats from parent
  onClose?: () => void; // Add callback for closing
}

export default function PostUploadLoading({ 
  isVisible, 
  message = "Processing your upload...", 
  progress = 0, 
  isProcessing = false,
  isBackgroundProcessing = false,
  expectedSymptoms,
  currentSymptoms = 0,
  databaseStats,
  onClose
}: PostUploadLoadingProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Show during processing or when explicitly visible
  if (!isVisible) return null;

  // Minimized view - just a small indicator at bottom right
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-white shadow-lg rounded-lg p-3 border border-gray-200">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
          <span className="text-sm font-medium">Processing... {progress}%</span>
          <button
            onClick={() => setIsMinimized(false)}
            className="ml-2 text-gray-500 hover:text-gray-700"
            aria-label="Expand"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 10h4v4H2zm8-8h4v4h-4z"/>
              <path d="M2 2l4 4m8 8l-4-4"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-loading-spinner>
      <div className="w-full max-w-md">
        {/* Control buttons in top right corner of modal */}
        <div className="flex justify-end mb-2 space-x-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 bg-white rounded-md shadow-sm hover:bg-gray-100 transition-colors"
            aria-label="Minimize"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 bg-white rounded-md shadow-sm hover:bg-red-50 transition-colors"
            aria-label="Close"
            title="Close (Warning: Processing may continue in background)"
          >
            <X className="h-4 w-4 text-red-600" />
          </button>
        </div>
        
        {/* Compact Progress Card */}
        <Card className="shadow-lg">
        <CardContent className="p-4 text-center">
          <div className="flex flex-col items-center space-y-2">
            <div className="relative">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              <Database className="h-4 w-4 text-green-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-gray-900">
                {progress < 100 ? 'Processing Upload' : 'Processing Complete!'}
              </h2>
              <p className="text-xs text-gray-600">{message}</p>
            </div>
            
            {/* Compact Progress Bar Display During Processing */}
            {(isProcessing || progress > 0) && (
              <div className="w-full space-y-2">
                <div className="flex justify-between mb-1 text-xs">
                  <span className="text-gray-500">Status</span>
                  <span className="font-medium text-blue-600">
                    {progress > 0 ? `${Math.round(progress)}%` : 'Starting...'}
                  </span>
                </div>
                
                {/* Compact Progress Bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-500 bg-blue-600"
                      style={{ width: `${Math.max(progress, 10)}%` }}
                    ></div>
                  </div>
                  <Loader2 className="h-4 w-4 text-orange-500 animate-spin flex-shrink-0" />
                </div>
                
                <div className="text-xs text-blue-600">
                  {isBackgroundProcessing 
                    ? "Processing continues in background..." 
                    : "Extracting symptoms from clinical notes..."
                  }
                </div>
                
                {/* Compact Progress Indicator */}
                {currentSymptoms > 0 && (
                  <div className="text-xs bg-blue-50 p-2 rounded border">
                    <div className="font-medium text-blue-800">
                      {currentSymptoms.toLocaleString()} symptoms extracted
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center space-x-2 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" />
              <span>System is preparing your data...</span>
            </div>
            
            <div className="text-xs text-gray-500">
              This usually takes a few seconds
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}