import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: '#ef4444' }}>Something went wrong.</h1>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>The application encountered an unexpected error.</p>
          <pre style={{ textAlign: 'left', background: '#f3f4f6', padding: '1rem', borderRadius: '8px', overflowX: 'auto' }}>
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '2rem', padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Reload Default View
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
