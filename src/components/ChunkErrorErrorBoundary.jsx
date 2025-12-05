import React from 'react';

class ChunkErrorErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Check if the error is a chunk load error
    if (error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')) {
      return { hasError: true };
    }
    return { hasError: false };
  }

  componentDidCatch(error, errorInfo) {
    if (this.state.hasError) {
      console.error('Chunk load error detected:', error);
      // Reload the page to fetch the new version
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-center">A atualizar a aplicação...</div>;
    }

    return this.props.children;
  }
}

export default ChunkErrorErrorBoundary;
