import React, { useState, useEffect } from 'react';
import * as Icons from '../components/Icons';

const APP_VERSION = '1.5.3';

export const SettingsView = ({
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
    const [cleanZombiesStatus, setCleanZombiesStatus] = useState(null);
    const [zombieStats, setZombieStats] = useState(null);
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    // Capturar evento de install PWA
    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleFullSync = async () => {
        if (!manualSync) {
            setSyncStatus({ type: 'error', message: '❌ Erro: Sincronização não disponível' });
            return;
        }

        setSyncStatus({ type: 'loading', message: 'Sincronizando dados...' });

        try {
            const result = await manualSync();

            if (result && result.success) {
                const message = `✅ Sincronização completa!\n📤 Enviados: ${result.pushed}\n📥 Recebidos: ${result.pulled}\n✓ Já sincronizados: ${result.merged}${result.skipped > 0 ? `\n⚠️ Ignorados (dados corrompidos): ${result.skipped}` : ''}`;
                setSyncStatus({ type: 'success', message });
            } else {
                setSyncStatus({ type: 'error', message: '❌ Erro: Resultado inválido' });
            }
        } catch (error) {
            const errorMsg = error?.message || error?.toString() || 'Erro desconhecido';
            setSyncStatus({ type: 'error', message: `❌ Erro: ${errorMsg}` });
            setTimeout(() => setSyncStatus(null), 10000);
        }
    };

    const handleScanZombies = async () => {
        setCleanZombiesStatus({ type: 'loading', message: '🔍 A procurar items corrompidos...' });
        setZombieStats(null);

        try {
            if (!window.syncService) {
                throw new Error('SyncService não disponível');
            }

            const result = await window.syncService.cleanZombies(0, true);

            if (result.totalZombies > 0) {
                setZombieStats(result);
                setCleanZombiesStatus({
                    type: 'warning',
                    message: `🧟 Encontrados ${result.totalZombies} items corrompidos no Firebase!\n\nEstes items tornam a app MUITO mais lenta a abrir (tentam desencriptar a cada boot).\n\n⚠️ Recomendamos LIMPAR AGORA!`
                });
            } else {
                setCleanZombiesStatus({
                    type: 'success',
                    message: '✅ Nenhum item corrompido encontrado! A tua base de dados está limpa.'
                });
            }
        } catch (error) {
            setCleanZombiesStatus({
                type: 'error',
                message: `❌ Erro: ${error?.message || 'Erro desconhecido'}`
            });
            setTimeout(() => setCleanZombiesStatus(null), 10000);
        }
    };

    const handleCleanZombies = async () => {
        if (!window.confirm('⚠️ Atenção!\n\nIsto vai DELETAR PERMANENTEMENTE TODOS os items corrompidos do Firebase.\n\nEsta ação NÃO pode ser desfeita!\n\n💡 Após limpar, a app vai abrir MUITO mais rápido.\n\nContinuar?')) {
            return;
        }

        setCleanZombiesStatus({ type: 'loading', message: '🧹 A limpar items corrompidos...' });

        try {
            if (!window.syncService) {
                throw new Error('SyncService não disponível');
            }

            const result = await window.syncService.cleanZombies(0, false);

            setZombieStats(null);
            setCleanZombiesStatus({
                type: 'success',
                message: `✅ Limpeza concluída!\n\n❌ Deletados: ${result.totalDeleted} items corrompidos do Firebase\n\n🚀 A app vai abrir MUITO mais rápido agora!\n\n💡 Faz refresh da página (Ctrl+Shift+R) para aplicar.`
            });

            setTimeout(() => setCleanZombiesStatus(null), 15000);
        } catch (error) {
            setCleanZombiesStatus({
                type: 'error',
                message: `❌ Erro: ${error?.message || 'Erro desconhecido'}`
            });
            setTimeout(() => setCleanZombiesStatus(null), 10000);
        }
    };
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">
                Definições
            </h2>

            {/* User Info */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.User className="w-5 h-5" />
                    Conta
                </h3>
                <div className="space-y-3 text-gray-300">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Email:</span>
                        <span className="text-sm">{user?.email || 'Não disponível'}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-red-900/30 hover:bg-red-900/50 text-red-400 border-red-700/50 w-full py-3 rounded-lg transition-all font-medium border flex items-center justify-center gap-2"
                    >
                        <Icons.LogOut className="w-4 h-4" />
                        Terminar Sessão
                    </button>
                </div>
            </div>

            {/* Sincronização */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.RefreshCw className="w-5 h-5" />
                    Sincronização entre Dispositivos
                </h3>
                <div className="space-y-3 text-gray-300">
                    <p className="text-sm">
                        Sincroniza dados entre PC, telemóvel e outros dispositivos via cloud (Firebase).
                    </p>

                    {lastSyncTime && (
                        <div className="text-xs text-gray-400 bg-gray-900/50 rounded p-2">
                            Última sincronização: {new Date(lastSyncTime).toLocaleString('pt-PT')}
                        </div>
                    )}

                    <button
                        onClick={async () => {
                            try {
                                await manualSync();
                            } catch (error) {
                                // Error already handled in manualSync
                            }
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
                        {isSyncing ? 'A sincronizar...' : 'Sincronizar Agora'}
                    </button>

                    <div className="text-xs bg-blue-900/20 border border-blue-700/50 rounded p-2 text-blue-300">
                        💡 <strong>Nota:</strong> Dados novos são enviados automaticamente para a cloud. Use este botão para <strong>receber</strong> dados de outros dispositivos.
                    </div>
                </div>
            </div>

            {/* PWA Update */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.RefreshCw className="w-5 h-5" />
                    Atualização da App
                </h3>
                <div className="space-y-3 text-gray-300">
                    <p className="text-sm">
                        Se a app estiver desatualizada ou com bugs após um update, força uma atualização completa.
                    </p>

                    {/* Botão Instalar (só aparece quando browser permitir) */}
                    {deferredPrompt && (
                        <button
                            onClick={async () => {
                                if (!deferredPrompt) return;
                                try {
                                    await deferredPrompt.prompt();
                                    const { outcome } = await deferredPrompt.userChoice;
                                    if (outcome === 'accepted') {
                                        setDeferredPrompt(null);
                                    }
                                } catch (error) {
                                    // Install cancelled or failed
                                }
                            }}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all font-medium flex items-center justify-center gap-2"
                        >
                            <Icons.Download className="w-4 h-4" />
                            📲 Instalar App
                        </button>
                    )}

                    <button
                        onClick={async () => {
                            try {
                                if ('serviceWorker' in navigator) {
                                    const registrations = await navigator.serviceWorker.getRegistrations();
                                    for (const registration of registrations) {
                                        await registration.unregister();
                                    }
                                }

                                if ('caches' in window) {
                                    const cacheNames = await caches.keys();
                                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                                }

                                window.location.reload(true);
                            } catch (error) {
                                alert('❌ Erro ao limpar cache. Tenta fazer refresh manual (Ctrl+Shift+R)');
                            }
                        }}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium flex items-center justify-center gap-2"
                    >
                        <Icons.RefreshCw className="w-4 h-4" />
                        🔄 Forçar Atualização
                    </button>

                    <div className="text-xs bg-yellow-900/20 border border-yellow-700/50 rounded p-2 text-yellow-300">
                        ⚠️ <strong>Atenção:</strong> Este botão limpa a cache e recarrega a app. Usa apenas se a app estiver com problemas após um update.
                    </div>

                    {!deferredPrompt && (
                        <div className="text-xs bg-blue-900/20 border border-blue-700/50 rounded p-2 text-blue-300">
                            💡 <strong>Instalação PWA:</strong> O botão "📲 Instalar App" só aparece quando o browser permite. No <strong>telemóvel/tablet</strong> funciona sempre. No <strong>PC/Desktop</strong>, Chrome raramente permite instalar (limitação do browser, não da app). A app funciona perfeitamente no browser mesmo sem instalar.
                        </div>
                    )}
                </div>
            </div>

            {/* Data Management */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.Database className="w-5 h-5" />
                    Dados
                </h3>
                <div className="space-y-3 text-gray-300">
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

            {/* Database Maintenance */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.Trash2 className="w-5 h-5" />
                    Manutenção da Base de Dados
                </h3>
                <div className="space-y-3 text-gray-300">
                    <p className="text-sm">
                        Limpar items corrompidos ("zombies") que não conseguem ser desencriptados. Estes items ocupam espaço e tornam a app mais lenta.
                    </p>

                    {cleanZombiesStatus && (
                        <div className={
                            'p-3 rounded-lg text-sm whitespace-pre-line ' +
                            (cleanZombiesStatus.type === 'success' ? 'bg-green-900/30 text-green-300 border border-green-700/50' :
                             cleanZombiesStatus.type === 'error' ? 'bg-red-900/30 text-red-300 border border-red-700/50' :
                             cleanZombiesStatus.type === 'warning' ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50' :
                             'bg-blue-900/30 text-blue-300 border border-blue-700/50')
                        }>
                            {cleanZombiesStatus.message}
                        </div>
                    )}

                    {zombieStats && zombieStats.totalZombies > 0 && (
                        <div className="text-xs bg-yellow-900/20 border border-yellow-700/50 rounded p-3">
                            <div className="font-medium text-yellow-300 mb-2">📊 Detalhes:</div>
                            {Object.entries(zombieStats.zombiesByCollection).map(([col, count]) => (
                                <div key={col} className="text-yellow-300/80">
                                    • {col}: {count} {count === 1 ? 'item' : 'items'}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-2">
                        <button
                            onClick={handleScanZombies}
                            disabled={cleanZombiesStatus?.type === 'loading'}
                            className={
                                'w-full py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2 ' +
                                (cleanZombiesStatus?.type === 'loading'
                                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600')
                            }
                        >
                            <Icons.Search className="w-4 h-4" />
                            {cleanZombiesStatus?.type === 'loading' ? 'A procurar...' : '🔍 Procurar Items Corrompidos'}
                        </button>

                        {zombieStats && zombieStats.totalZombies > 0 && (
                            <button
                                onClick={handleCleanZombies}
                                disabled={cleanZombiesStatus?.type === 'loading'}
                                className={
                                    'w-full py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2 ' +
                                    (cleanZombiesStatus?.type === 'loading'
                                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-700 hover:to-pink-700')
                                }
                            >
                                <Icons.Trash2 className="w-4 h-4" />
                                🧹 Limpar Items Corrompidos
                            </button>
                        )}
                    </div>

                    <div className="text-xs bg-red-900/20 border border-red-700/50 rounded p-2 text-red-300">
                        ⚠️ <strong>Atenção:</strong> A limpeza é PERMANENTE e não pode ser desfeita. Apenas items CORROMPIDOS (que falham desencriptação) são deletados.
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.Bell className="w-5 h-5" />
                    Notificações
                </h3>
                <div className="space-y-3 text-gray-300">
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
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.FileText className="w-5 h-5" />
                    Legal & Ética
                </h3>
                <div className="space-y-2">
                    <button
                        onClick={() => onOpenLegalDoc('license')}
                        className="bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 w-full py-3 px-4 rounded-lg transition-all font-medium border flex items-center justify-between"
                    >
                        <span className="flex items-center gap-2">
                            <span>📜</span>
                            <span>Licença</span>
                        </span>
                        <Icons.ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onOpenLegalDoc('terms')}
                        className="bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 w-full py-3 px-4 rounded-lg transition-all font-medium border flex items-center justify-between"
                    >
                        <span className="flex items-center gap-2">
                            <span>📋</span>
                            <span>Termos de Uso</span>
                        </span>
                        <Icons.ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onOpenLegalDoc('governance')}
                        className="bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 w-full py-3 px-4 rounded-lg transition-all font-medium border flex items-center justify-between"
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
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.Info className="w-5 h-5" />
                    Sobre a App
                </h3>
                <div className="space-y-2 text-sm text-gray-300">
                    <p>
                        <strong>NEP App - Notas de Experiências e Padrões</strong>
                    </p>
                    <p className="text-xs italic">
                        Notice it. Explore it. Plan it.
                    </p>
                    <p className="text-xs italic">
                        Não Estás Perdida.
                    </p>
                    <div className="mt-4 pt-4 border-t text-xs border-gray-700 text-gray-400">
                        <p>Versão {APP_VERSION}</p>
                        <p className="mt-1">Copyright © Teresa Castro</p>
                        <p className="mt-1">Os teus dados são privados e seguros.</p>
                    </div>
                </div>
            </div>

            {/* Privacy & Security Info */}
            <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-700/50">
                <div className="flex items-start gap-2">
                    <Icons.Shield className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-purple-300">
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
