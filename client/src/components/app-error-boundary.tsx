import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error, 
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to the console
    console.error('Application error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleRefresh = (): void => {
    // Attempt to refresh the page
    window.location.reload();
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 border border-gray-200">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Application Error</h2>
              <p className="text-gray-600 mb-6">
                The application encountered an unexpected error. This could be due to a temporary connectivity issue or a problem with the application code.
              </p>
              <Button 
                onClick={this.handleRefresh}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Application
              </Button>

              {/* Show error message if available */}
              {this.state.error && (
                <div className="mt-6 p-4 bg-gray-100 rounded-md w-full overflow-auto max-h-64 text-left">
                  <p className="text-sm font-medium text-gray-900">Error Details:</p>
                  <p className="text-sm text-gray-700 mt-1">{this.state.error.toString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default AppErrorBoundary;