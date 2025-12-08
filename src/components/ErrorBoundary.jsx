import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 text-red-800 rounded-lg text-center">
          <h2>Algo correu mal.</h2>
          <p>Tenta recarregar a página.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
