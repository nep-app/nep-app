import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { LocalDataProvider } from './contexts/LocalDataContext'
import { DataProvider } from './contexts/DataContext'
import { DemoDataProvider } from './contexts/DemoDataContext'
import { MetricsProvider } from './contexts/MetricsContext'
import { UIProvider } from './contexts/UIContext'
import { DemoShell } from './components/DemoShell'
import './index.css'

// App version - atualizar quando houver mudanças importantes
const APP_VERSION = '4.6.0'; // v4.6.0: modo demo com dados falsos realistas, sem registo necessário

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
  const isDemoMode = localStorage.getItem('nep_demo') === '1';

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        {isDemoMode ? (
          // Demo tree: sem auth, sem IndexedDB, dados falsos
          <DemoDataProvider>
            <MetricsProvider>
              <UIProvider>
                <DemoShell />
              </UIProvider>
            </MetricsProvider>
          </DemoDataProvider>
        ) : (
          // Árvore normal com auth completa
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
        )}
      </ErrorBoundary>
    </React.StrictMode>
  );
}
