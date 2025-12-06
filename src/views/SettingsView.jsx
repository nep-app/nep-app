import React from 'react';
import * as Icons from '../components/Icons';

export const SettingsView = ({
    darkMode,
    user,
    handleLogout,
    exportToCSV,
    notificationsEnabled,
    requestNotificationPermission
}) => {
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
                        Exporta todos os teus dados para um ficheiro CSV que podes guardar ou analisar noutra ferramenta.
                    </p>
                    <button
                        onClick={exportToCSV}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all font-medium flex items-center justify-center gap-2"
                    >
                        <Icons.Download className="w-4 h-4" />
                        Exportar Dados (CSV)
                    </button>
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

            {/* App Info */}
            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-3 flex items-center gap-2'}>
                    <Icons.Info className="w-5 h-5" />
                    Sobre a App
                </h3>
                <div className={'space-y-2 text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    <p>
                        <strong>NEP - Notas de Experiências e Padrões</strong>
                    </p>
                    <p className="text-xs italic">
                        Notice it. Explore it. Plan it.
                    </p>
                    <p className="text-xs italic">
                        Não Estás Perdida.
                    </p>
                    <div className={'mt-4 pt-4 border-t text-xs ' + (darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500')}>
                        <p>Versão 1.0.0</p>
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
