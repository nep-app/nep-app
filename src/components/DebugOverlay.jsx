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
 * - Data counts
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

          {/* Data Counts */}
          {dataCounts && (
            <div className="bg-pink-900/30 border border-pink-500/30 rounded p-3">
              <div className="font-bold text-pink-300 mb-2">📊 Local Data</div>
              <div className="space-y-1">
                <div className="text-white">
                  <span className="text-gray-400">Consumptions:</span>{' '}
                  {dataCounts.consumptions ?? 0}
                </div>
                <div className="text-white">
                  <span className="text-gray-400">Substances:</span>{' '}
                  {dataCounts.substances ?? 0}
                </div>
                <div className="text-white">
                  <span className="text-gray-400">Places:</span>{' '}
                  {dataCounts.places ?? 0}
                </div>
                <div className="text-white">
                  <span className="text-gray-400">People:</span>{' '}
                  {dataCounts.people ?? 0}
                </div>
              </div>
            </div>
          )}

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
