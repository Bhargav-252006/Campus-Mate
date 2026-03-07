import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {hasError: false, error: null};
    }

    static getDerivedStateFromError(error) {
        return {hasError: true, error};
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    minHeight: '50vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <h2 style={{marginBottom: '1rem'}}>Something went wrong</h2>
                    <p style={{color: '#666', marginBottom: '1.5rem'}}>
                        {this.state.error?.message || 'An unexpected error occurred.'}
                    </p>
                    <button
                        onClick={() => {
                            this.setState({hasError: false, error: null});
                            window.location.reload();
                        }}
                        style={{
                            padding: '0.5rem 1.5rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#3b82f6',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
