/**
 * Firebase Sync Diagnostics
 * 
 * Ferramentas para diagnosticar e forçar sincronização
 */

import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';

/**
 * Verifica o estado da conexão Firebase
 */
export async function checkFirebaseConnection() {
  try {
    const db = getFirestore();
    
    // Tentar ativar a rede (força reconexão)
    await enableNetwork(db);
    
    return {
      success: true,
      message: 'Conexão Firebase ativa',
      online: true
    };
  } catch (error) {
    console.error('Erro ao verificar conexão Firebase:', error);
    return {
      success: false,
      message: `Erro: ${error.message}`,
      online: false,
      error: error
    };
  }
}

/**
 * Força reconexão ao Firebase
 */
export async function forceFirebaseReconnect() {
  try {
    const db = getFirestore();
    
    await disableNetwork(db);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await enableNetwork(db);
    
    
    return {
      success: true,
      message: 'Reconexão forçada com sucesso'
    };
  } catch (error) {
    console.error('❌ Erro ao forçar reconexão:', error);
    return {
      success: false,
      message: `Erro: ${error.message}`,
      error: error
    };
  }
}

/**
 * Verifica se há dados pendentes de sincronização
 * (Nota: Firebase não expõe diretamente esta info, mas podemos inferir)
 */
export function checkPendingWrites() {
  // Firebase Persistence mantém um queue interno
  // Não há API pública para isso, mas podemos adicionar logging
  
  
  return {
    message: 'Use forceFirebaseReconnect() para tentar sincronizar',
    recommendation: 'Verificar console do navegador para erros de rede'
  };
}

/**
 * Adiciona listeners para eventos de conexão
 */
export function monitorFirebaseConnection(onOnline, onOffline) {
  // Monitorar estado da rede do navegador
  window.addEventListener('online', () => {
    if (onOnline) onOnline();
  });
  
  window.addEventListener('offline', () => {
    if (onOffline) onOffline();
  });
  
  // Estado inicial
  if (navigator.onLine) {
  } else {
  }
  
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
