import React, { useState } from 'react';
import * as Icons from '../components/Icons';
import { forceFirebaseReconnect, checkFirebaseConnection } from '../utils/firebaseSync';

export const SettingsView = ({
    darkMode,
    user,
    handleLogout,
    exportToCSV,
    exportToJSON,
    notificationsEnabled,
    requestNotificationPermission,
    onOpenLegalDoc,
    manualSync,
    isSyncing,
    lastSyncTime
}) => {
    const [syncStatus, setSyncStatus] = useState(null);

    const handleFullSync = async () => {
        console.log('[SettingsView] 🔵 handleFullSync INICIADO');

        try {
            if (!manualSync) {
                console.error('[SettingsView] ❌ manualSync é undefined!');
                setSyncStatus({ type: 'error', message: '❌ Erro: Sincronização não disponível' });
                return;
            }

            console.log('[SettingsView] 🔵 Definindo status como loading...');
            setSyncStatus({ type: 'loading', message: 'Sincronizando dados...' });

            console.log('[SettingsView] 🔵 Chamando manualSync()...');
            const result = await manualSync();
            console.log('[SettingsView] ✅ manualSync completou:', result);

            if (result && result.success) {
                const message = `✅ Sincronização completa!\n📤 Enviados: ${result.pushed}\n📥 Recebidos: ${result.pulled}\n✓ Já sincronizados: ${result.merged}${result.skipped > 0 ? `\n⚠️ Ignorados (dados corrompidos): ${result.skipped}` : ''}`;
                console.log('[SettingsView] 🔵 Definindo mensagem de sucesso');
                setSyncStatus({ type: 'success', message });

                // Limpar mensagem após 15 segundos
                setTimeout(() => setSyncStatus(null), 15000);
            } else {
                console.warn('[SettingsView] ⚠️ Resultado inesperado:', result);
                setSyncStatus({ type: 'error', message: '❌ Erro: Resultado inválido' });
            }
        } catch (error) {
            console.error('[SettingsView] ❌ ERRO no handleFullSync:', error);
            console.error('[SettingsView] ❌ Stack trace:', error.stack);
            const errorMsg = error?.message || error?.toString() || 'Erro desconhecido';
            setSyncStatus({ type: 'error', message: `❌ Erro: ${errorMsg}` });

            // Limpar mensagem de erro após 10 segundos
            setTimeout(() => setSyncStatus(null), 10000);
        }
    };
    return (
        <div className="space-y-6">
            <h2 className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                Definições
            </h2>

            {/* User Info */}
            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-3 flex items-center gap-2'}>
                    <Icons.User className="w-5 h-5" />
                    Conta
                </h3>
                <div className={'space-y-3 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Email:</span>
                        <span className="text-sm">{user?.email || 'Não disponível'}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className={(darkMode ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400 border-red-700/50' : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200') + ' w-full py-3 rounded-lg transition-all font-medium border flex items-center justify-center gap-2'}
                    >
                        <Icons.LogOut className="w-4 h-4" />
                        Terminar Sessão
                    </button>
                </div>
            </div>

            {/* Data Management */}
            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-3 flex items-center gap-2'}>
                    <Icons.Database className="w-5 h-5" />
                    Dados
                </h3>
                <div className={'space-y-3 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    <p className="text-sm">
                        Exporta TODOS os teus dados (consumos, ciclos, bem-estar, pensamentos, reflexões, objetivos).
                    </p>
                    <div className="space-y-2">
                        <button
                            onClick={exportToJSON}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all font-medium flex items-center justify-center gap-2"
                        >
                            <Icons.Download className="w-4 h-4" />
                            💾 Backup Completo (JSON)
                        </button>
                        <button
                            onClick={exportToCSV}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all font-medium flex items-center justify-center gap-2"
                        >
                            <Icons.Download className="w-4 h-4" />
                            📊 Exportar para Excel (CSV)
                        </button>
                    </div>
                </div>
            </div>

            {/* Firebase Sync */}
            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-3 flex items-center gap-2'}>
                    <Icons.RefreshCw className="w-5 h-5" />
                    Sincronização Firebase
                </h3>
                <div className={'space-y-3 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    <p className="text-sm">
                        Sincroniza todos os dados entre este dispositivo e outros. Resolve diferenças usando a versão mais recente.
                    </p>

                    {lastSyncTime && (
                        <div className="text-xs text-gray-400">
                            Última sincronização: {new Date(lastSyncTime).toLocaleString('pt-PT')}
                        </div>
                    )}

                    {syncStatus && (
                        <div className={
                            'p-3 rounded-lg text-sm whitespace-pre-line ' +
                            (syncStatus.type === 'success' ? 'bg-green-900/30 text-green-300 border border-green-700/50' :
                             syncStatus.type === 'error' ? 'bg-red-900/30 text-red-300 border border-red-700/50' :
                             'bg-blue-900/30 text-blue-300 border border-blue-700/50')
                        }>
                            {syncStatus.message}
                        </div>
                    )}

                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            alert('Botão clicado! isSyncing: ' + isSyncing + ', manualSync exists: ' + !!manualSync);
                            handleFullSync();
                        }}
                        disabled={isSyncing}
                        className={
                            'w-full py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2 ' +
                            (isSyncing
                                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                                : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600')
                        }
                    >
                        <Icons.RefreshCw className={'w-4 h-4' + (isSyncing ? ' animate-spin' : '')} />
                        {isSyncing ? 'Sincronizando...' : '🔄 Sincronizar Agora'}
                    </button>

                    <div className="text-xs bg-blue-900/20 border border-blue-700/50 rounded p-2 text-blue-300">
                        💡 <strong>Dica:</strong> Usa isto se tens dados diferentes entre dispositivos. A versão mais recente sempre ganha.
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-3 flex items-center gap-2'}>
                    <Icons.Bell className="w-5 h-5" />
                    Notificações
                </h3>
                <div className={'space-y-3 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    <p className="text-sm">
                        Recebe lembretes para registar bem-estar diariamente (às 18h).
                    </p>
                    {notificationsEnabled ? (
                        <div className="flex items-center gap-2 text-green-600 py-2">
                            <Icons.CheckCircle className="w-5 h-5" />
                            <span className="font-medium">Notificações ativadas</span>
                        </div>
                    ) : (
                        <button
                            onClick={requestNotificationPermission}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all font-medium flex items-center justify-center gap-2"
                        >
                            <Icons.Bell className="w-4 h-4" />
                            Ativar Notificações
                        </button>
                    )}
                </div>
            </div>

            {/* Legal & Ethics */}
            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-3 flex items-center gap-2'}>
                    <Icons.FileText className="w-5 h-5" />
                    Legal & Ética
                </h3>
                <div className="space-y-2">
                    <button
                        onClick={() => onOpenLegalDoc('license')}
                        className={(darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200') + ' w-full py-3 px-4 rounded-lg transition-all font-medium border flex items-center justify-between'}
                    >
                        <span className="flex items-center gap-2">
                            <span>📜</span>
                            <span>Licença</span>
                        </span>
                        <Icons.ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onOpenLegalDoc('terms')}
                        className={(darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200') + ' w-full py-3 px-4 rounded-lg transition-all font-medium border flex items-center justify-between'}
                    >
                        <span className="flex items-center gap-2">
                            <span>📋</span>
                            <span>Termos de Uso</span>
                        </span>
                        <Icons.ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onOpenLegalDoc('governance')}
                        className={(darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200') + ' w-full py-3 px-4 rounded-lg transition-all font-medium border flex items-center justify-between'}
                    >
                        <span className="flex items-center gap-2">
                            <span>⚖️</span>
                            <span>Governança Ética</span>
                        </span>
                        <Icons.ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* App Info */}
            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-3 flex items-center gap-2'}>
                    <Icons.Info className="w-5 h-5" />
                    Sobre a App
                </h3>
                <div className={'space-y-2 text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    <p>
                        <strong>NEP App - Notas de Experiências e Padrões</strong>
                    </p>
                    <p className="text-xs italic">
                        Notice it. Explore it. Plan it.
                    </p>
                    <p className="text-xs italic">
                        Não Estás Perdida.
                    </p>
                    <div className={'mt-4 pt-4 border-t text-xs ' + (darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500')}>
                        <p>Versão 1.0.0</p>
                        <p className="mt-1">Copyright © Teresa Castro</p>
                        <p className="mt-1">Os teus dados são privados e seguros.</p>
                    </div>
                </div>
            </div>

            {/* Privacy & Security Info */}
            <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-700/50">
                <div className="flex items-start gap-2">
                    <Icons.Shield className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div className={'text-sm ' + (darkMode ? 'text-purple-300' : 'text-purple-700')}>
                        <p className="font-medium mb-1">🔒 Privacidade & Segurança</p>
                        <p className="text-xs opacity-90">
                            Todos os teus dados são encriptados e só tu tens acesso.
                            Nenhuma informação é partilhada com terceiros.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
