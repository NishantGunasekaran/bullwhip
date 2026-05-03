import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
            background: '#f8fafc',
            color: '#0f172a',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Something went wrong</h1>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: '13px',
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1rem',
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button
            type="button"
            style={{
              marginTop: '1rem',
              padding: '10px 16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
