import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { DataProvider } from './contexts/DataContext'
import { MetricsProvider } from './contexts/MetricsContext'
import { UIProvider } from './contexts/UIContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DataProvider>
      <MetricsProvider>
        <UIProvider>
          <App />
        </UIProvider>
      </MetricsProvider>
    </DataProvider>
  </React.StrictMode>
)
