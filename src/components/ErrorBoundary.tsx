import React, { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary component to catch React errors and provide graceful fallback.
 * Phase 0: Basic implementation for error recovery.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white p-8">
          <div className="max-w-md space-y-4">
            <h1 className="text-2xl font-bold text-red-400">Something went wrong</h1>
            <p className="text-slate-300">
              The application encountered an unexpected error. This might be due to corrupt data or a bug.
            </p>
            {this.state.error && (
              <details className="bg-slate-800 p-4 rounded text-sm">
                <summary className="cursor-pointer font-semibold mb-2">Error Details</summary>
                <pre className="text-xs overflow-auto text-red-300">
                  {this.state.error.toString()}
                  {this.state.error.stack && `\n${this.state.error.stack}`}
                </pre>
              </details>
            )}
            <div className="space-x-2">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  // Clear localStorage and reload
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
              >
                Clear Data & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
