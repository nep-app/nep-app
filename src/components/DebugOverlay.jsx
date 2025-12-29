import React, { useState, useEffect } from 'react';
import * as Icons from './Icons';

/**
 * DebugOverlay - Painel de debug visível para contornar problemas com console
 *
 * Mostra informação crítica diretamente no ecrã:
 * - Versão da app
 * - Firebase user (email, UID)
 * - PIN status
 * - Sync status
 * - Data counts (fetched from IndexedDB)
 */
export const DebugOverlay = ({
  appVersion,
  firebaseUser,
  pinAuthenticated,
  hasPinAccount,
  syncStatus,
  dataCounts
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [localDataCounts, setLocalDataCounts] = useState(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);

  // Read from global window.__debugLogs (set up in main.jsx BEFORE providers)
  useEffect(() => {
    // Initial load
    if (window.__debugLogs && window.__debugLogs.length > 0) {
      setSyncLogs([...window.__debugLogs]);
    }

    // Poll every 500ms for new logs
    const interval = setInterval(() => {
      if (window.__debugLogs && window.__debugLogs.length > 0) {
        setSyncLogs([...window.__debugLogs]);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Fetch data counts from IndexedDB when authenticated
  useEffect(() => {
    if (!pinAuthenticated) {
      setLocalDataCounts(null);
      return;
    }

    const fetchDataCounts = async () => {
      setLoadingCounts(true);
      try {
        // Import localDB dynamically to avoid loading before auth
        const { db } = await import('../db/localDB');

        const counts = {
          consumptions: await db.consumptions.count(),
          dailyLogs: await db.dailyLogs.count(),
          reflections: await db.reflections.count(),
          wellbeingLogs: await db.wellbeingLogs.count(),
          cycles: await db.cycles.count(),
          goals: await db.goals.count(),
          copingStrategies: await db.copingStrategies.count(),
          thoughts: await db.thoughts.count(),
        };

        setLocalDataCounts(counts);
      } catch (error) {
        console.error('[DebugOverlay] Error fetching counts:', error);
        setLocalDataCounts({ error: error.message });
      } finally {
        setLoadingCounts(false);
      }
    };

    fetchDataCounts();

    // Refresh counts every 3 seconds while overlay is open
    const interval = setInterval(fetchDataCounts, 3000);
    return () => clearInterval(interval);
  }, [pinAuthenticated]);

  if (!isOpen) {
    // Botão flutuante para reabrir
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-yellow-500 text-black p-3 rounded-full shadow-lg hover:bg-yellow-400 transition-all"
        title="Abrir Debug Panel"
      >
        <Icons.Info className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className={`fixed ${isMinimized ? 'bottom-4 right-4' : 'top-4 right-4'} z-50 bg-black/90 backdrop-blur-sm border-2 border-yellow-500 rounded-lg shadow-2xl ${isMinimized ? 'w-auto' : 'w-96 max-h-[80vh] overflow-y-auto'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-yellow-500/30 bg-yellow-500/10">
        <div className="flex items-center gap-2">
          <Icons.Info className="w-5 h-5 text-yellow-500" />
          <span className="font-bold text-yellow-500 text-sm">DEBUG PANEL</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-yellow-500 hover:text-yellow-400 transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? (
              <Icons.ChevronUp className="w-4 h-4" />
            ) : (
              <Icons.ChevronDown className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-yellow-500 hover:text-yellow-400 transition-colors"
            title="Close"
          >
            <Icons.X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="p-4 space-y-4 text-sm">
          {/* App Version */}
          <div className="bg-purple-900/30 border border-purple-500/30 rounded p-3">
            <div className="font-bold text-purple-300 mb-2">📱 App Version</div>
            <div className="text-white font-mono">{appVersion || 'Unknown'}</div>
            <div className="text-xs text-gray-400 mt-1">
              Timestamp: {new Date().toLocaleString('pt-PT')}
            </div>
          </div>

          {/* Firebase User */}
          <div className="bg-blue-900/30 border border-blue-500/30 rounded p-3">
            <div className="font-bold text-blue-300 mb-2">🔥 Firebase User</div>
            {firebaseUser ? (
              <>
                <div className="text-white break-all">
                  <span className="text-gray-400">Email:</span> {firebaseUser.email || 'No email'}
                </div>
                <div className="text-white break-all mt-1">
                  <span className="text-gray-400">UID:</span> {firebaseUser.uid}
                </div>
              </>
            ) : (
              <div className="text-red-400">❌ No Firebase user</div>
            )}
          </div>

          {/* PIN Status */}
          <div className="bg-green-900/30 border border-green-500/30 rounded p-3">
            <div className="font-bold text-green-300 mb-2">🔑 PIN Status</div>
            <div className="space-y-1">
              <div className="text-white">
                <span className="text-gray-400">Account exists:</span>{' '}
                {hasPinAccount === null ? '...' : hasPinAccount ? '✅ Yes' : '❌ No'}
              </div>
              <div className="text-white">
                <span className="text-gray-400">Authenticated:</span>{' '}
                {pinAuthenticated ? '✅ Yes' : '❌ No'}
              </div>
            </div>
          </div>

          {/* Sync Status */}
          {syncStatus && (
            <div className="bg-orange-900/30 border border-orange-500/30 rounded p-3">
              <div className="font-bold text-orange-300 mb-2">🔄 Sync Status</div>
              <div className="space-y-1">
                <div className="text-white">
                  <span className="text-gray-400">Initialized:</span>{' '}
                  {syncStatus.initialized ? '✅ Yes' : '❌ No'}
                </div>
                <div className="text-white">
                  <span className="text-gray-400">Last sync:</span>{' '}
                  {syncStatus.lastSync || 'Never'}
                </div>
                {syncStatus.lastUID && (
                  <div className="text-white break-all text-xs">
                    <span className="text-gray-400">Last UID:</span> {syncStatus.lastUID}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data Counts - Fetched from IndexedDB */}
          {pinAuthenticated && (
            <div className="bg-pink-900/30 border border-pink-500/30 rounded p-3">
              <div className="font-bold text-pink-300 mb-2 flex items-center justify-between">
                <span>📊 IndexedDB Data</span>
                {loadingCounts && <Icons.RefreshCw className="w-3 h-3 animate-spin" />}
              </div>
              {localDataCounts?.error ? (
                <div className="text-red-400 text-xs">{localDataCounts.error}</div>
              ) : localDataCounts ? (
                <div className="space-y-1 text-xs">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="text-white">
                      <span className="text-gray-400">Consumptions:</span> <span className="font-bold">{localDataCounts.consumptions}</span>
                    </div>
                    <div className="text-white">
                      <span className="text-gray-400">Daily Logs:</span> <span className="font-bold">{localDataCounts.dailyLogs}</span>
                    </div>
                    <div className="text-white">
                      <span className="text-gray-400">Reflections:</span> <span className="font-bold">{localDataCounts.reflections}</span>
                    </div>
                    <div className="text-white">
                      <span className="text-gray-400">Wellbeing:</span> <span className="font-bold">{localDataCounts.wellbeingLogs}</span>
                    </div>
                    <div className="text-white">
                      <span className="text-gray-400">Cycles:</span> <span className="font-bold">{localDataCounts.cycles}</span>
                    </div>
                    <div className="text-white">
                      <span className="text-gray-400">Goals:</span> <span className="font-bold">{localDataCounts.goals}</span>
                    </div>
                    <div className="text-white">
                      <span className="text-gray-400">Coping:</span> <span className="font-bold">{localDataCounts.copingStrategies}</span>
                    </div>
                    <div className="text-white">
                      <span className="text-gray-400">Thoughts:</span> <span className="font-bold">{localDataCounts.thoughts}</span>
                    </div>
                  </div>
                  <div className="pt-1 mt-1 border-t border-pink-700/30 text-pink-200">
                    <span className="text-gray-400">TOTAL:</span> <span className="font-bold">{
                      (localDataCounts.consumptions || 0) +
                      (localDataCounts.dailyLogs || 0) +
                      (localDataCounts.reflections || 0) +
                      (localDataCounts.wellbeingLogs || 0) +
                      (localDataCounts.cycles || 0) +
                      (localDataCounts.goals || 0) +
                      (localDataCounts.copingStrategies || 0) +
                      (localDataCounts.thoughts || 0)
                    }</span>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-xs">Loading...</div>
              )}
              <div className="text-xs text-gray-500 mt-2">Updates every 3s</div>
            </div>
          )}

          {/* Sync Logs */}
          <div className="bg-cyan-900/30 border border-cyan-500/30 rounded p-3">
            <div className="font-bold text-cyan-300 mb-2 flex items-center justify-between">
              <span>📝 Sync Logs</span>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const { setMetadata } = await import('../db/localDB');
                      await setMetadata('lastFirebaseUID', null);
                      alert('UID limpo! Reload para forçar PULL do Firebase');
                    } catch (error) {
                      alert('Erro: ' + error.message);
                    }
                  }}
                  className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded"
                  title="Limpa UID e força PULL do Firebase no próximo reload"
                >
                  Force PULL
                </button>
                <button
                  onClick={() => {
                    alert('window.__debugLogs:\n' + JSON.stringify(window.__debugLogs || [], null, 2));
                  }}
                  className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-2 py-1 rounded"
                  title="Mostra conteúdo bruto de window.__debugLogs"
                >
                  Raw Logs
                </button>
                <button
                  onClick={async () => {
                    try {
                      setSyncLogs(prev => [...prev, {
                        level: 'log',
                        message: '[MANUAL] Forçando reload da página para re-iniciar sync...',
                        time: new Date().toLocaleTimeString('pt-PT')
                      }]);
                      setTimeout(() => window.location.reload(), 1000);
                    } catch (error) {
                      setSyncLogs(prev => [...prev, {
                        level: 'error',
                        message: `[MANUAL] Erro: ${error.message}`,
                        time: new Date().toLocaleTimeString('pt-PT')
                      }]);
                    }
                  }}
                  className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded"
                >
                  Reload Page
                </button>
                {syncLogs.length > 0 && (
                  <button
                    onClick={() => setSyncLogs([])}
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            {syncLogs.length > 0 ? (
              <div className="space-y-1 text-xs max-h-40 overflow-y-auto">
                {syncLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-yellow-400' :
                      'text-gray-300'
                    }
                  >
                    <span className="text-gray-500">[{log.time}]</span> {log.message}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-400 text-xs">
                ⚠️ Nenhum log capturado. Sync pode não estar a correr.
                <br />
                Clica "Reload Page" para forçar re-inicialização.
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-gray-800/50 border border-gray-600/30 rounded p-3 text-xs">
            <div className="font-bold text-gray-300 mb-2">ℹ️ Como usar</div>
            <ul className="text-gray-400 space-y-1 list-disc list-inside">
              <li>Este painel mostra info que deveria estar na consola</li>
              <li>Faz screenshot e envia para debug</li>
              <li>Minimize ou feche com os botões acima</li>
            </ul>
          </div>
        </div>
      )}

      {isMinimized && (
        <div className="p-3 text-yellow-500 font-bold text-sm">
          DEBUG: v{appVersion} • {firebaseUser ? '🔥' : '❌'} • {pinAuthenticated ? '🔑' : '❌'}
        </div>
      )}
    </div>
  );
};
