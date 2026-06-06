import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.content}>
            <h1 style={styles.heading}>Something went wrong</h1>
            <p style={styles.message}>
              An unexpected error occurred. Please try again or contact support if the problem persists.
            </p>
            {this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error details</summary>
                <pre style={styles.pre}>{this.state.error.toString()}</pre>
                {this.state.errorInfo && (
                  <pre style={styles.pre}>{this.state.errorInfo.componentStack}</pre>
                )}
              </details>
            )}
            <button onClick={this.handleRetry} style={styles.button}>
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  content: {
    maxWidth: '600px',
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    textAlign: 'center' as const,
  },
  heading: {
    color: '#d32f2f',
    marginBottom: '16px',
    fontSize: '24px',
  },
  message: {
    color: '#666',
    marginBottom: '24px',
    lineHeight: '1.5',
  },
  details: {
    textAlign: 'left' as const,
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
  },
  summary: {
    cursor: 'pointer',
    color: '#1976d2',
    marginBottom: '8px',
  },
  pre: {
    margin: '8px 0',
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '12px',
    overflow: 'auto',
    maxHeight: '200px',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};
