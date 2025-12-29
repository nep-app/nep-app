import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { LocalDataProvider } from './contexts/LocalDataContext'
import { DataProvider } from './contexts/DataContext'
import { MetricsProvider } from './contexts/MetricsContext'
import { UIProvider } from './contexts/UIContext'
import './index.css'

// App version - atualizar quando houver mudanças importantes
const APP_VERSION = '4.2.4'; // v4.2.4: Debug overlay com contagens de IndexedDB

console.log('======================');
console.log('🚀 NEP APP v' + APP_VERSION);
console.log('======================');

// Verificar se há update disponível (force cache refresh)
const checkForUpdates = () => {
  const storedVersion = localStorage.getItem('app_version');

  if (storedVersion && storedVersion !== APP_VERSION) {
    console.log(`Update detected: ${storedVersion} → ${APP_VERSION}`);

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

// Limpar cache SEMPRE (temporário para debug)
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
  });
}

// Verificar updates antes de renderizar
if (!checkForUpdates()) {
  console.log('✅ Renderizando app...');
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
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
    </React.StrictMode>
  );
}
