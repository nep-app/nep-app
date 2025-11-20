import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { UIProvider } from './contexts/UIContext'
import { DataProvider } from './contexts/DataContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UIProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </UIProvider>
  </React.StrictMode>
)
