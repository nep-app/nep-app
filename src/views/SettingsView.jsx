import React, { useState } from 'react';
import * as Icons from '../components/Icons';
import { forceFirebaseReconnect, checkFirebaseConnection } from '../utils/firebaseSync';

const APP_VERSION = '1.0.1';

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

    const handleFullSync = async () => {
        if (!manualSync) {
            setSyncStatus({ type: 'error', message: '❌ Erro: Sincronização não disponível' });
            return;
        }

        setSyncStatus({ type: 'loading', message: 'Sincronizando dados...' });

        try {
            const result = await manualSync();
            console.log('SYNC RESULTADO:', result);

            if (result && result.success) {
                const message = `✅ Sincronização completa!\n📤 Enviados: ${result.pushed}\n📥 Recebidos: ${result.pulled}\n✓ Já sincronizados: ${result.merged}${result.skipped > 0 ? `\n⚠️ Ignorados (dados corrompidos): ${result.skipped}` : ''}`;
                setSyncStatus({ type: 'success', message });
                console.log('SYNC SUCESSO!', result);
            } else {
                console.log('SYNC FALHOU - resultado inválido');
                setSyncStatus({ type: 'error', message: '❌ Erro: Resultado inválido' });
            }
        } catch (error) {
            console.error('[SettingsView] Erro no sync:', error);
            const errorMsg = error?.message || error?.toString() || 'Erro desconhecido';
            setSyncStatus({ type: 'error', message: `❌ Erro: ${errorMsg}` });

            // Limpar mensagem de erro após 10 segundos
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

            // Dry-run: procurar TODOS os zombies (maxAge=0 = sem filtro de idade)
            const result = await window.syncService.cleanZombies(0, true);
            console.log('ZOMBIE SCAN:', result);

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
            console.error('[SettingsView] Erro ao procurar zombies:', error);
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

            // Limpar TODOS os zombies (maxAge=0 = sem filtro de idade)
            const result = await window.syncService.cleanZombies(0, false);
            console.log('ZOMBIE CLEAN:', result);

            setZombieStats(null);
            setCleanZombiesStatus({
                type: 'success',
                message: `✅ Limpeza concluída!\n\n❌ Deletados: ${result.totalDeleted} items corrompidos do Firebase\n\n🚀 A app vai abrir MUITO mais rápido agora!\n\n💡 Faz refresh da página (Ctrl+Shift+R) para aplicar.`
            });

            // Limpar mensagem após 15 segundos
            setTimeout(() => setCleanZombiesStatus(null), 15000);
        } catch (error) {
            console.error('[SettingsView] Erro ao limpar zombies:', error);
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

            {/* Firebase Sync */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.RefreshCw className="w-5 h-5" />
                    Sincronização Firebase
                </h3>
                <div className="space-y-3 text-gray-300">
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
                        onClick={handleFullSync}
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
