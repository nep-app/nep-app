import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../components/Icons';
import { safeLocalStorage } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
const APP_VERSION = '4.6.0';

// ── Guia de utilização ────────────────────────────────────────────────────

function HowToUse() {
    const { t, i18n } = useTranslation();
    const [open, setOpen] = useState(false);
    const [openIdx, setOpenIdx] = useState(null);

    const guideSections = i18n.t('settings.guide', { returnObjects: true });

    return (
        <div className="bg-gray-800 border-gray-700 rounded-xl border overflow-hidden">
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between p-6 text-left"
            >
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <Icons.Info className="w-5 h-5 text-purple-400" />
                    {t('settings.guideHeader')}
                </h3>
                <Icons.ChevronRight className={'w-5 h-5 text-gray-400 transition-transform ' + (open ? 'rotate-90' : '')} />
            </button>

            {open && (
                <div className="px-6 pb-6 space-y-2">
                    <p className="text-xs text-gray-400 mb-3">
                        {t('settings.guideTapToLearn')}
                    </p>
                    {guideSections.map((s, i) => (
                        <div key={i} className="rounded-lg overflow-hidden border border-gray-700">
                            <button
                                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                                className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-700 hover:bg-gray-600 transition-colors"
                            >
                                <span className="flex items-center gap-2 text-sm font-medium text-gray-200">
                                    <span>{s.emoji}</span>
                                    <span>{s.title}</span>
                                </span>
                                <Icons.ChevronRight className={'w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ' + (openIdx === i ? 'rotate-90' : '')} />
                            </button>
                            {openIdx === i && (
                                <div className="px-4 py-3 bg-gray-800 text-sm text-gray-300 leading-relaxed">
                                    {s.content}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export const SettingsView = ({
    user,
    handleLogout,
    notificationsEnabled,
    requestNotificationPermission,
    onOpenLegalDoc,
    onOpenExport,
    onExportJSON,
    onForceSync,
    isSyncing,
    lastSyncTime,
    firstUseDate
}) => {
    const { t, i18n } = useTranslation();
    const [syncStatus, setSyncStatus] = useState(null);
    const [currentLang, setCurrentLang] = useState(i18n.language || 'pt');

    const [wellbeingAlarmOn, setWellbeingAlarmOn] = useState(() =>
        safeLocalStorage.get('wellbeingAlarmEnabled', false)
    );
    const [doseAlarmOn, setDoseAlarmOn] = useState(() => {
        const raw = localStorage.getItem('bagWeighAlarmHour');
        return raw !== null && raw !== 'null';
    });
    const [doseAlarmTime, setDoseAlarmTime] = useState(() => {
        const raw = localStorage.getItem('bagWeighAlarmHour');
        if (raw === null || raw === 'null') return '10:00';
        const h = parseInt(raw);
        return isNaN(h) ? '10:00' : String(h).padStart(2, '0') + ':00';
    });
    const handleWellbeingAlarmToggle = (on) => {
        setWellbeingAlarmOn(on);
        safeLocalStorage.set('wellbeingAlarmEnabled', on);
    };
    const handleDoseAlarmToggle = (on) => {
        setDoseAlarmOn(on);
        if (on) {
            const hour = parseInt(doseAlarmTime.split(':')[0]);
            safeLocalStorage.set('bagWeighAlarmHour', hour);
        } else {
            safeLocalStorage.set('bagWeighAlarmHour', null);
        }
    };
    const handleDoseAlarmTimeChange = (timeStr) => {
        setDoseAlarmTime(timeStr);
        if (doseAlarmOn && timeStr) {
            safeLocalStorage.set('bagWeighAlarmHour', parseInt(timeStr.split(':')[0]));
        }
    };

    const { lockMode, setLockMode } = useAuth();

    const LOCK_OPTIONS = [
        { value: 'never',   label: t('settings.lockNever'),   desc: t('settings.lockNeverDesc') },
        { value: 'on_hide', label: t('settings.lockOnHide'),  desc: t('settings.lockOnHideDesc') },
        { value: '5',       label: t('settings.lock5min'),    desc: t('settings.lock5minDesc') },
        { value: '15',      label: t('settings.lock15min'),   desc: t('settings.lock15minDesc') },
        { value: '60',      label: t('settings.lock60min'),   desc: t('settings.lock60minDesc') },
    ];

    const handleChangeLang = (lang) => {
        i18n.changeLanguage(lang);
        localStorage.setItem('nep_lang', lang);
        setCurrentLang(lang);
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
                        ENG
                    </button>
                </div>
            </div>

            {/* Auto-lock */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                    <Icons.Shield className="w-5 h-5" />
                    {t('settings.autoLock')}
                </h3>
                <p className="text-xs text-gray-400 mb-4">{t('settings.autoLockSubtitle')}</p>
                <div className="space-y-2">
                    {LOCK_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setLockMode(opt.value)}
                            className={
                                'w-full text-left px-4 py-3 rounded-lg border-2 transition-all ' +
                                (lockMode === opt.value
                                    ? 'bg-purple-900/40 border-purple-500 text-white'
                                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600')
                            }
                        >
                            <div className="font-medium text-sm">{opt.label}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                        </button>
                    ))}
                </div>
                {lockMode === 'never' && (
                    <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-700/40 rounded-lg text-xs text-yellow-400">
                        {t('settings.autoLockWarning')}
                    </div>
                )}
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
                    {firstUseDate && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">📅 {t('settings.firstUseLabel')}</span>
                            <span className="text-sm">{firstUseDate.toLocaleDateString(i18n.language === 'pt' ? 'pt-PT' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                    )}
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
                            setSyncStatus({ type: 'loading', message: t('settings.syncing') });
                            try {
                                const result = await onForceSync();
                                const total = (result?.pushed || 0) + (result?.pulled || 0);
                                setSyncStatus({ type: 'success', message: total > 0 ? t('settings.syncRecords', { count: total }) : t('settings.syncUpToDate') });
                            } catch (error) {
                                setSyncStatus({ type: 'error', message: `❌ ${error?.message || t('common.error')}` });
                            }
                            setTimeout(() => setSyncStatus(null), 8000);
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

                    {syncStatus && (
                        <div className={
                            'rounded p-3 text-sm flex items-start justify-between gap-2 ' +
                            (syncStatus.type === 'success' ? 'bg-green-900/40 border border-green-600/50 text-green-300' :
                             syncStatus.type === 'loading' ? 'bg-gray-700 border border-gray-600 text-gray-300' :
                             'bg-red-900/40 border border-red-600/50 text-red-300')
                        }>
                            <span>{syncStatus.message}</span>
                            {syncStatus.type !== 'loading' && (
                                <button onClick={() => setSyncStatus(null)} className="text-current opacity-60 hover:opacity-100 shrink-0">✕</button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Exportar Relatório */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.Download className="w-5 h-5" />
                    {t('settings.exportTitle')}
                </h3>
                <div className="space-y-3 text-gray-300">
                    <p className="text-sm">
                        {t('settings.exportDescription')}
                    </p>
                    <button
                        onClick={onOpenExport}
                        className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all font-medium flex items-center justify-center gap-2"
                    >
                        <Icons.Download className="w-4 h-4" />
                        {t('settings.exportButton')}
                    </button>
                    <button
                        onClick={onExportJSON}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2"
                    >
                        <Icons.Download className="w-4 h-4" />
                        {t('settings.backupJSONButton')}
                    </button>
                    <p className="text-xs text-gray-500">
                        {t('settings.backupJSONDescription')}
                    </p>
                </div>
            </div>

            {/* Reminders */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Icons.Bell className="w-5 h-5" />
                    {t('settings.alarmsTitle')}
                </h3>
                <div className="space-y-5">

                    {/* Bem-estar */}
                    <div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-200">{t('settings.alarmWellbeing')}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{t('settings.alarmWellbeingDesc')}</p>
                            </div>
                            <button
                                onClick={() => handleWellbeingAlarmToggle(!wellbeingAlarmOn)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${wellbeingAlarmOn ? 'bg-blue-500' : 'bg-gray-600'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${wellbeingAlarmOn ? 'translate-x-7' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        {wellbeingAlarmOn && (
                            <p className="text-xs text-blue-400 mt-1.5">{t('settings.alarmWellbeingActive')}</p>
                        )}
                    </div>

                    <div className="border-t border-gray-700" />

                    {/* Dose diária */}
                    <div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-200">{t('settings.alarmDose')}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{t('settings.alarmDoseDesc')}</p>
                            </div>
                            <button
                                onClick={() => handleDoseAlarmToggle(!doseAlarmOn)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${doseAlarmOn ? 'bg-rose-500' : 'bg-gray-600'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${doseAlarmOn ? 'translate-x-7' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        {doseAlarmOn && (
                            <div className="mt-2 flex items-center gap-3">
                                <input
                                    type="time"
                                    value={doseAlarmTime}
                                    onChange={e => handleDoseAlarmTimeChange(e.target.value)}
                                    className="bg-gray-700 border-gray-600 text-white px-3 py-1.5 rounded-lg border text-sm focus:ring-2 focus:ring-rose-500"
                                />
                                <p className="text-xs text-rose-400">{t('settings.alarmDoseActive')} {doseAlarmTime.slice(0,5)}</p>
                            </div>
                        )}
                    </div>

                </div>
                <p className="text-xs text-gray-600 mt-4">{t('settings.alarmNote')}</p>
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
                        {(() => {
                            try {
                                const dbg = JSON.parse(localStorage.getItem('_nep_dbg') || '{}');
                                if (!dbg.v) return null;
                                return (
                                    <p className="mt-2 text-gray-600 font-mono">
                                        dbg: modo={dbg.mode} sessão={dbg.hasSession?'✓':'✗'} neverPin={dbg.hasNeverPin?'✓':'✗'} email={dbg.hasEmail?'✓':'✗'}
                                    </p>
                                );
                            } catch { return null; }
                        })()}
                    </div>
                </div>
            </div>

            {/* Como usar a app */}
            <HowToUse />

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
