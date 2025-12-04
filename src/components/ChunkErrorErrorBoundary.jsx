import React, { Component } from 'react';

// Error Boundary specifically for catching ChunkLoadErrors (lazy loading failures)
export class ChunkErrorErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Check if it's a ChunkLoadError or related dynamic import failure
    if (error.name === 'ChunkLoadError' || error.message.includes('Failed to fetch dynamically imported module') || error.message.includes('Importing a module script failed')) {
      console.log('Chunk load error detected, reloading page...');
      // Force reload to get fresh assets
      window.location.reload();
    } else {
        // Propagate other errors or handle them if needed
        console.error('Non-chunk error caught in boundary:', error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">A atualizar a aplicação...</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
