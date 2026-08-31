import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info.componentStack);
  }

  handleReset = () => {
    const isChunkError =
      this.state.error?.message.includes('dynamically imported module') ||
      this.state.error?.message.includes('Loading chunk') ||
      this.state.error?.message.includes('Failed to fetch');

    this.setState({ hasError: false, error: null });

    if (isChunkError) {
      window.location.reload();
    } else {
      window.location.hash = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.message.includes('dynamically imported module') ||
        this.state.error?.message.includes('Loading chunk') ||
        this.state.error?.message.includes('Failed to fetch');

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-500 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-2">
              {isChunkError ? 'New Version Available' : 'Something went wrong'}
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
              {isChunkError
                ? 'A new update was deployed. Click below to load the latest version.'
                : 'An unexpected error occurred. Your session data is safe in local storage.'}
            </p>
            {this.state.error && !isChunkError && (
              <pre className="text-left text-xs bg-gray-100 dark:bg-slate-800 text-red-600 dark:text-red-400 rounded-lg p-3 mb-6 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              id="error-boundary-reset-btn"
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              {isChunkError ? 'Refresh & Update App' : 'Go to Dashboard'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
