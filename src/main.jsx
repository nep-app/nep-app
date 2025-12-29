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
const APP_VERSION = '4.3.1'; // v4.3.1: FIX #2 - LocalDataContext também usar localDB

console.log('======================');
console.log('🚀 NEP APP v' + APP_VERSION);
console.log('======================');

// Global log capture for debugging - must run BEFORE providers
window.__debugLogs = [];
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

const captureLog = (level, ...args) => {
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');

  // Capture DataContext and Sync logs globally
  if (message.includes('[DataContext]') || message.includes('[Sync]')) {
    window.__debugLogs.push({
      level,
      message,
      time: new Date().toLocaleTimeString('pt-PT')
    });
    // Keep only last 50 logs
    if (window.__debugLogs.length > 50) {
      window.__debugLogs = window.__debugLogs.slice(-50);
    }
  }
};

console.log = (...args) => {
  originalLog(...args);
  captureLog('log', ...args);
};

console.error = (...args) => {
  originalError(...args);
  captureLog('error', ...args);
};

console.warn = (...args) => {
  originalWarn(...args);
  captureLog('warn', ...args);
};

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
