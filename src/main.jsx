import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { DataProvider } from './contexts/DataContext'
import { UIProvider } from './contexts/UIContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DataProvider>
      <UIProvider>
        <App />
      </UIProvider>
    </DataProvider>
  </React.StrictMode>
)
