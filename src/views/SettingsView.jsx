import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t, i18n } = useTranslation();
    const [syncStatus, setSyncStatus] = useState(null);
    const [cleanZombiesStatus, setCleanZombiesStatus] = useState(null);
    const [zombieStats, setZombieStats] = useState(null);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [currentLang, setCurrentLang] = useState(i18n.language || 'pt');

    // Capturar evento de install PWA
    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleChangeLang = (lang) => {
        i18n.changeLanguage(lang);
        localStorage.setItem('nep_lang', lang);
        setCurrentLang(lang);
    };

    const handleFullSync = async () => {
        if (!manualSync) {
            setSyncStatus({ type: 'error', message: `❌ ${t('common.error')}: ${t('settings.sync')} não disponível` });
            return;
        }

        setSyncStatus({ type: 'loading', message: t('settings.syncing') });

        try {
            const result = await manualSync();

            if (result && result.success) {
                const message = `✅ ${t('settings.syncNow')}!\n📤 ${result.pushed}\n📥 ${result.pulled}\n✓ ${result.merged}${result.skipped > 0 ? `\n⚠️ ${result.skipped}` : ''}`;
                setSyncStatus({ type: 'success', message });
            } else {
                setSyncStatus({ type: 'error', message: `❌ ${t('common.error')}` });
            }
        } catch (error) {
            const errorMsg = error?.message || error?.toString() || t('common.error');
            setSyncStatus({ type: 'error', message: `❌ ${t('common.error')}: ${errorMsg}` });
            setTimeout(() => setSyncStatus(null), 10000);
        }
    };

    const handleScanZombies = async () => {
        setCleanZombiesStatus({ type: 'loading', message: `🔍 ${t('settings.scanning')}` });
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
                    message: `🧟 ${result.totalZombies} items corrompidos no Firebase!\n\n⚠️ Recomendamos LIMPAR AGORA!`
                });
            } else {
                setCleanZombiesStatus({
                    type: 'success',
                    message: `✅ ${t('settings.maintenanceDescription').split('.')[0]}!`
                });
            }
        } catch (error) {
            setCleanZombiesStatus({
                type: 'error',
                message: `❌ ${t('common.error')}: ${error?.message || t('common.error')}`
            });
            setTimeout(() => setCleanZombiesStatus(null), 10000);
        }
    };

    const handleCleanZombies = async () => {
        if (!window.confirm(`⚠️ ${t('settings.cleanWarning')}`)) {
            return;
        }

        setCleanZombiesStatus({ type: 'loading', message: `🧹 ${t('settings.cleanZombies')}...` });

        try {
            if (!window.syncService) {
                throw new Error('SyncService não disponível');
            }

            const result = await window.syncService.cleanZombies(0, false);

            setZombieStats(null);
            setCleanZombiesStatus({
                type: 'success',
                message: `✅ ❌ ${result.totalDeleted} items deletados\n\n🚀 A app vai abrir MUITO mais rápido agora!`
            });

            setTimeout(() => setCleanZombiesStatus(null), 15000);
        } catch (error) {
            setCleanZombiesStatus({
                type: 'error',
                message: `❌ ${t('common.error')}: ${error?.message || t('common.error')}`
            });
            setTimeout(() => setCleanZombiesStatus(null), 10000);
        }
    };
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">
                {t('settings.title')}
            </h2>

            {/* Language Selector */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.Settings className="w-5 h-5" />
                    {t('settings.language')}
                </h3>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleChangeLang('pt')}
                        className={
                            'flex-1 py-3 rounded-lg font-medium transition-all border-2 ' +
                            (currentLang === 'pt'
                                ? 'bg-purple-600 border-purple-500 text-white'
                                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600')
                        }
                    >
                        🇵🇹 Português
                    </button>
                    <button
                        onClick={() => handleChangeLang('en')}
                        className={
                            'flex-1 py-3 rounded-lg font-medium transition-all border-2 ' +
                            (currentLang === 'en'
                                ? 'bg-purple-600 border-purple-500 text-white'
                                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600')
                        }
                    >
                        🇬🇧 English
                    </button>
                </div>
            </div>

            {/* User Info */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.User className="w-5 h-5" />
                    {t('settings.account')}
                </h3>
                <div className="space-y-3 text-gray-300">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{t('settings.emailLabel')}</span>
                        <span className="text-sm">{user?.email || t('settings.emailNotAvailable')}</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-red-900/30 hover:bg-red-900/50 text-red-400 border-red-700/50 w-full py-3 rounded-lg transition-all font-medium border flex items-center justify-center gap-2"
                    >
                        <Icons.LogOut className="w-4 h-4" />
                        {t('settings.logout')}
                    </button>
                </div>
            </div>

            {/* Sincronização */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.RefreshCw className="w-5 h-5" />
                    {t('settings.sync')}
                </h3>
                <div className="space-y-3 text-gray-300">
                    <p className="text-sm">
                        {t('settings.syncDescription')}
                    </p>

                    {lastSyncTime && (
                        <div className="text-xs text-gray-400 bg-gray-900/50 rounded p-2">
                            {t('settings.lastSync')} {new Date(lastSyncTime).toLocaleString(currentLang === 'pt' ? 'pt-PT' : 'en-GB')}
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
                        {isSyncing ? t('settings.syncing') : t('settings.syncNow')}
                    </button>

                    <div className="text-xs bg-blue-900/20 border border-blue-700/50 rounded p-2 text-blue-300">
                        {t('settings.syncNote')}
                    </div>
                </div>
            </div>

            {/* PWA Update */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.RefreshCw className="w-5 h-5" />
                    {t('settings.appUpdate')}
                </h3>
                <div className="space-y-3 text-gray-300">
                    <p className="text-sm">
                        {t('settings.appUpdateDescription')}
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
                            {t('settings.installApp')}
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
                                alert(`❌ ${t('common.error')} (Ctrl+Shift+R)`);
                            }
                        }}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium flex items-center justify-center gap-2"
                    >
                        <Icons.RefreshCw className="w-4 h-4" />
                        {t('settings.forceUpdate')}
                    </button>

                    <div className="text-xs bg-yellow-900/20 border border-yellow-700/50 rounded p-2 text-yellow-300">
                        {t('settings.forceUpdateWarning')}
                    </div>

                    {!deferredPrompt && (
                        <div className="text-xs bg-blue-900/20 border border-blue-700/50 rounded p-2 text-blue-300">
                            {t('settings.pwaNote')}
                        </div>
                    )}
                </div>
            </div>

            {/* Data Management */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.Database className="w-5 h-5" />
                    {t('settings.data')}
                </h3>
                <div className="space-y-3 text-gray-300">
                    <p className="text-sm">
                        {t('settings.dataDescription')}
                    </p>
                    <div className="space-y-2">
                        <button
                            onClick={exportToJSON}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all font-medium flex items-center justify-center gap-2"
                        >
                            <Icons.Download className="w-4 h-4" />
                            {t('settings.backupJSON')}
                        </button>
                        <button
                            onClick={exportToCSV}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all font-medium flex items-center justify-center gap-2"
                        >
                            <Icons.Download className="w-4 h-4" />
                            {t('settings.exportCSV')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Database Maintenance */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.Trash2 className="w-5 h-5" />
                    {t('settings.maintenance')}
                </h3>
                <div className="space-y-3 text-gray-300">
                    <p className="text-sm">
                        {t('settings.maintenanceDescription')}
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
                            <div className="font-medium text-yellow-300 mb-2">{t('settings.zombieDetails')}</div>
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
                            {cleanZombiesStatus?.type === 'loading' ? t('settings.scanning') : t('settings.scanZombies')}
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
                                {t('settings.cleanZombies')}
                            </button>
                        )}
                    </div>

                    <div className="text-xs bg-red-900/20 border border-red-700/50 rounded p-2 text-red-300">
                        {t('settings.cleanWarning')}
                    </div>
                </div>
            </div>

            {/* Notifications */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.Bell className="w-5 h-5" />
                    {t('settings.notifications')}
                </h3>
                <div className="space-y-3 text-gray-300">
                    <p className="text-sm">
                        {t('settings.notificationsDescription')}
                    </p>
                    {notificationsEnabled ? (
                        <div className="flex items-center gap-2 text-green-600 py-2">
                            <Icons.CheckCircle className="w-5 h-5" />
                            <span className="font-medium">{t('settings.notificationsEnabled')}</span>
                        </div>
                    ) : (
                        <button
                            onClick={requestNotificationPermission}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all font-medium flex items-center justify-center gap-2"
                        >
                            <Icons.Bell className="w-4 h-4" />
                            {t('settings.enableNotifications')}
                        </button>
                    )}
                </div>
            </div>

            {/* Legal & Ethics */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.FileText className="w-5 h-5" />
                    {t('settings.legal')}
                </h3>
                <div className="space-y-2">
                    <button
                        onClick={() => onOpenLegalDoc('license')}
                        className="bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 w-full py-3 px-4 rounded-lg transition-all font-medium border flex items-center justify-between"
                    >
                        <span className="flex items-center gap-2">
                            <span>📜</span>
                            <span>{t('settings.license')}</span>
                        </span>
                        <Icons.ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onOpenLegalDoc('terms')}
                        className="bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 w-full py-3 px-4 rounded-lg transition-all font-medium border flex items-center justify-between"
                    >
                        <span className="flex items-center gap-2">
                            <span>📋</span>
                            <span>{t('settings.terms')}</span>
                        </span>
                        <Icons.ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onOpenLegalDoc('governance')}
                        className="bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 w-full py-3 px-4 rounded-lg transition-all font-medium border flex items-center justify-between"
                    >
                        <span className="flex items-center gap-2">
                            <span>⚖️</span>
                            <span>{t('settings.governance')}</span>
                        </span>
                        <Icons.ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* App Info */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.Info className="w-5 h-5" />
                    {t('settings.about')}
                </h3>
                <div className="space-y-2 text-sm text-gray-300">
                    <p>
                        <strong>{t('settings.appName')}</strong>
                    </p>
                    <p className="text-xs italic">
                        {t('settings.tagline')}
                    </p>
                    <p className="text-xs italic">
                        {t('settings.motto')}
                    </p>
                    <div className="mt-4 pt-4 border-t text-xs border-gray-700 text-gray-400">
                        <p>{t('settings.version', { version: APP_VERSION })}</p>
                        <p className="mt-1">{t('settings.copyright')}</p>
                        <p className="mt-1">{t('settings.privacyNote')}</p>
                    </div>
                </div>
            </div>

            {/* Privacy & Security Info */}
            <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-700/50">
                <div className="flex items-start gap-2">
                    <Icons.Shield className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-purple-300">
                        <p className="font-medium mb-1">{t('settings.privacy')}</p>
                        <p className="text-xs opacity-90">
                            {t('settings.privacyText')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
