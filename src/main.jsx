import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { LocalDataProvider } from './contexts/LocalDataContext'
import { DataProvider } from './contexts/DataContext'
import { MetricsProvider } from './contexts/MetricsContext'
import { UIProvider } from './contexts/UIContext'
import './index.css'

/* global __APP_VERSION__ */
// App version — fonte única em package.json (injetada pelo Vite). Não editar aqui.
const APP_VERSION = __APP_VERSION__;

// Verificar se há update disponível (force cache refresh)
const checkForUpdates = () => {
  const storedVersion = localStorage.getItem('app_version');

  if (storedVersion && storedVersion !== APP_VERSION) {

    // Limpar cache
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }

    // Atualizar versão
    localStorage.setItem('app_version', APP_VERSION);

    // Forçar reload completo (sem cache)
    window.location.reload(true);
    return true;
  }

  // Guardar versão se primeira vez
  if (!storedVersion) {
    localStorage.setItem('app_version', APP_VERSION);
  }

  return false;
};

// Verificar updates antes de renderizar
if (!checkForUpdates()) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <LocalDataProvider>
            <DataProvider>
              <MetricsProvider>
                <UIProvider>
                  <App />
                </UIProvider>
              </MetricsProvider>
            </DataProvider>
          </LocalDataProvider>
        </AuthProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
