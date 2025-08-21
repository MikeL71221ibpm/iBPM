import React, { useState, useEffect, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface ErrorRecoveryProps {
  children: ReactNode;
  fallbackComponent?: ReactNode;
}

export default function ErrorRecoveryWrapper({ children, fallbackComponent }: ErrorRecoveryProps) {
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Auto-retry mechanism
  useEffect(() => {
    if (hasError && retryCount < 3) {
      const timer = setTimeout(() => {
        setIsRetrying(true);
        setTimeout(() => {
          setHasError(false);
          setRetryCount(prev => prev + 1);
          setIsRetrying(false);
        }, 1000);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [hasError, retryCount]);

  // Reset error state when children change
  useEffect(() => {
    setHasError(false);
    setRetryCount(0);
  }, [children]);

  if (isRetrying) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Recovering Connection</h2>
          <p className="text-gray-600">Attempting to restore your dashboard...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return fallbackComponent || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 border border-gray-200">
          <div className="flex flex-col items-center text-center">
            <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Issue</h2>
            <p className="text-gray-600 mb-6">
              Having trouble loading your dashboard. This is usually resolved automatically.
            </p>
            
            <div className="space-y-3 w-full">
              <Button 
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Dashboard
              </Button>
              
              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <Home className="h-4 w-4" />
                  Return to Home
                </Button>
              </Link>
            </div>

            <p className="text-sm text-gray-500 mt-4">
              Auto-retry attempts: {retryCount}/3
            </p>
          </div>
        </div>
      </div>
    );
  }

  try {
    return <>{children}</>;
  } catch (error) {
    console.error('ErrorRecoveryWrapper caught error:', error);
    setHasError(true);
    return null;
  }
}