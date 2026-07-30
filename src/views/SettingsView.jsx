import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../components/Icons';
import { PushRemindersSettings } from '../components/PushRemindersSettings';
import { safeLocalStorage } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { getDataMode, setDataMode } from '../services/researchService';
/* global __APP_VERSION__ */
// Versão vinda do package.json (injetada pelo Vite). Fonte única.
const APP_VERSION = __APP_VERSION__;

// Endereço fixo do fórum/comunidade (app separada, pública e anónima).
const COMMUNITY_URL = 'https://nep-app.github.io/naosei/';

// ── Secção que abre/fecha ───────────────────────────────────────────────────
// Cartão com cabeçalho clicável. Fechada por defeito para a página não ocupar
// tanto espaço — a pessoa abre só o que quer mexer.
function Section({ icon, title, subtitle, defaultOpen = false, children }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-gray-800 border-gray-700 rounded-xl border overflow-hidden">
            <button
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between p-4 text-left"
            >
                <span className="font-semibold text-white flex items-center gap-2">
                    {icon}
                    <span>{title}</span>
                </span>
                <Icons.ChevronRight className={'w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ' + (open ? 'rotate-90' : '')} />
            </button>
            {open && (
                <div className="px-4 pb-4">
                    {subtitle && <p className="text-xs text-gray-400 mb-3">{subtitle}</p>}
                    {children}
                </div>
            )}
        </div>
    );
}

// ── Guia de utilização (só a lista; entra dentro de "Sobre e ajuda") ────────
function GuideAccordion() {
    const { t, i18n } = useTranslation();
    const [openIdx, setOpenIdx] = useState(null);
    const guideSections = i18n.t('settings.guide', { returnObjects: true });
    if (!Array.isArray(guideSections)) return null;
    return (
        <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-1">{t('settings.guideTapToLearn')}</p>
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
    onImportJSON,
    onForceSync,
    isSyncing,
    lastSyncTime,
    firstUseDate,
    firstUseDateLocked
}) => {
    const { t, i18n } = useTranslation();
    const pt = i18n.language !== 'en';
    const [syncStatus, setSyncStatus] = useState(null);
    const importInputRef = useRef(null);
    const [pendingImportFile, setPendingImportFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [currentLang, setCurrentLang] = useState(i18n.language || 'pt');

    const handleImportPicked = (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = ''; // permite escolher o mesmo ficheiro outra vez
        if (file) setPendingImportFile(file);
    };
    const confirmImport = async () => {
        if (!pendingImportFile || !onImportJSON) return;
        setImporting(true);
        try {
            await onImportJSON(pendingImportFile);
        } finally {
            setImporting(false);
            setPendingImportFile(null);
        }
    };

    // Exercício "surfar o impulso" (gate do UrgeSurfingModal na Home). ON por defeito.
    const [urgeExerciseOn, setUrgeExerciseOn] = useState(() =>
        localStorage.getItem('nep_urge_exercise') !== 'false'
    );
    const handleUrgeExerciseToggle = (on) => {
        setUrgeExerciseOn(on);
        localStorage.setItem('nep_urge_exercise', on ? 'true' : 'false');
    };

    const { lockMode, setLockMode } = useAuth();

    const [dataMode, setDataModeState] = useState(() => getDataMode() || 'cloud');
    const handleDataModeChange = (mode) => {
        setDataMode(mode);
        setDataModeState(mode);
    };

    // Modo disfarce (calculadora — destranca com o PIN de sempre, sem código à parte)
    const [disguiseOn, setDisguiseOn] = useState(() => safeLocalStorage.get('nep_disguise_enabled', false) === true);
    const [showDisguiseConfirm, setShowDisguiseConfirm] = useState(false);
    const [disguiseAck, setDisguiseAck] = useState(false);
    const requestToggleDisguise = () => {
        if (disguiseOn) {
            // Desligar → direto.
            safeLocalStorage.set('nep_disguise_enabled', false);
            safeLocalStorage.set('nep_disguise_code', '');
            setDisguiseOn(false);
        } else {
            // Ligar → primeiro confirmar que percebeu o gesto (não se pode esquecer).
            setDisguiseAck(false);
            setShowDisguiseConfirm(true);
        }
    };
    const confirmEnableDisguise = () => {
        safeLocalStorage.set('nep_disguise_enabled', true);
        safeLocalStorage.set('nep_disguise_code', '');
        setDisguiseOn(true);
        setShowDisguiseConfirm(false);
    };

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
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">
                {t('settings.title')}
            </h2>

            {/* ── Idioma (compacto, no topo) ── */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-4 border">
                <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <Icons.Settings className="w-5 h-5" />
                    {t('settings.language')}
                </h3>
                <div className="flex gap-3">
                    <button
                        onClick={() => handleChangeLang('pt')}
                        className={
                            'flex-1 py-2.5 rounded-lg font-medium transition-all border-2 ' +
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
                            'flex-1 py-2.5 rounded-lg font-medium transition-all border-2 ' +
                            (currentLang === 'en'
                                ? 'bg-purple-600 border-purple-500 text-white'
                                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600')
                        }
                    >
                        ENG
                    </button>
                </div>
            </div>

            {/* ── Notificações (abre/fecha) ── */}
            <Section
                icon={<Icons.Bell className="w-5 h-5 text-purple-400" />}
                title={pt ? 'Notificações' : 'Notifications'}
                subtitle={pt
                    ? 'Lembretes que chegam mesmo com a app fechada.'
                    : 'Reminders that arrive even when the app is closed.'}
            >
                <PushRemindersSettings />

                {/* Surfar o impulso — ligado às metas: aparece quando consumir agora
                    quebraria uma meta. Fica aqui, junto dos outros avisos/lembretes. */}
                <div className="border-t border-gray-700 my-4" />
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-white flex items-center gap-2">
                            🌊 {t('settings.urgeExercise')}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{t('settings.urgeExerciseDesc')}</p>
                    </div>
                    <button
                        onClick={() => handleUrgeExerciseToggle(!urgeExerciseOn)}
                        aria-label={t('settings.urgeExercise')}
                        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${urgeExerciseOn ? 'bg-purple-500' : 'bg-gray-600'}`}
                    >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${urgeExerciseOn ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                </div>
            </Section>

            {/* ── Comunidade / Fórum (atalho externo) ── */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-4 border">
                <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                    💬 {pt ? 'Comunidade' : 'Community'}
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                    {pt
                        ? 'Um fórum anónimo de apoio entre pessoas — observar, não julgar.'
                        : 'An anonymous peer-support forum — notice, don\'t judge.'}
                </p>
                <a
                    href={COMMUNITY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all font-medium flex items-center justify-center gap-2"
                >
                    <span>💬</span>
                    {pt ? 'Abrir a Comunidade' : 'Open the Community'}
                    <span aria-hidden="true">↗</span>
                </a>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                    {pt
                        ? 'Abre num sítio à parte, no navegador. É público — o que escreveres lá pode ser lido por outras pessoas. O teu diário privado continua fechado à chave e não vai contigo.'
                        : 'Opens separately in your browser. It is public — what you write there can be read by others. Your private journal stays locked and does not go with you.'}
                </p>
            </div>

            {/* ── Os meus dados (abre/fecha): sincronizar + exportar/backup/importar ── */}
            <Section
                icon={<Icons.RefreshCw className="w-5 h-5 text-purple-400" />}
                title={pt ? 'Os meus dados' : 'My data'}
                subtitle={pt
                    ? 'Como são guardados, cópia de segurança, sincronizar e recuperar.'
                    : 'How they are stored, backup, sync and restore.'}
            >
                <div className="space-y-3 text-gray-300">
                    {/* Modo de dados (como são guardados/partilhados) */}
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{pt ? 'Como os dados são guardados' : 'How data is stored'}</p>
                    <div className="space-y-2">
                        {[
                            { id: 'local', icon: '📱', label: pt ? 'Só local' : 'Local only', desc: pt ? 'Dados só neste dispositivo, sem backup na cloud.' : 'Data only on this device, no cloud backup.' },
                            { id: 'cloud', icon: '🔒', label: pt ? 'Cloud encriptado' : 'Cloud encrypted', desc: pt ? 'Backup seguro na cloud. Recomendado.' : 'Secure cloud backup. Recommended.' },
                            { id: 'research', icon: '🔬', label: pt ? 'Partilhar investigação' : 'Share research', desc: pt ? 'Cloud + resumos semanais anónimos para investigação.' : 'Cloud + anonymous weekly summaries for research.' },
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => handleDataModeChange(opt.id)}
                                className={
                                    'w-full text-left px-4 py-3 rounded-lg border-2 transition-all flex items-start gap-3 ' +
                                    (dataMode === opt.id
                                        ? 'bg-purple-900/40 border-purple-500'
                                        : 'bg-gray-700 border-gray-600 hover:bg-gray-600')
                                }
                            >
                                <span className="text-xl mt-0.5">{opt.icon}</span>
                                <div>
                                    <div className="font-medium text-sm text-white">{opt.label}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
                                </div>
                                {dataMode === opt.id && <span className="ml-auto text-purple-400 text-lg">✓</span>}
                            </button>
                        ))}
                    </div>

                    <div className="border-t border-gray-700 my-1" />
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{pt ? 'Cópia de segurança e sincronização' : 'Backup and sync'}</p>
                    <p className="text-sm">{t('settings.syncDescription')}</p>

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

                    <div className="border-t border-gray-700 my-1" />

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
                    <p className="text-xs text-gray-500">{t('settings.backupJSONDescription')}</p>

                    {onImportJSON && (
                        <>
                            <div className="border-t border-gray-700 my-1" />
                            <button
                                onClick={() => importInputRef.current && importInputRef.current.click()}
                                className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2"
                            >
                                <Icons.Upload className="w-4 h-4" />
                                {t('settings.importJSONButton')}
                            </button>
                            <p className="text-xs text-gray-500">{t('settings.importJSONDescription')}</p>
                            <input
                                ref={importInputRef}
                                type="file"
                                accept="application/json,.json"
                                onChange={handleImportPicked}
                                className="hidden"
                            />
                        </>
                    )}
                </div>
            </Section>

            {/* ── Segurança e bloqueio (bloqueio automático + modo disfarce juntos) ── */}
            <Section
                icon={<Icons.Shield className="w-5 h-5 text-purple-400" />}
                title={pt ? 'Segurança e bloqueio' : 'Security & lock'}
                subtitle={pt ? 'Bloqueio automático e modo disfarce.' : 'Auto-lock and disguise mode.'}
            >
                {/* Bloqueio automático */}
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t('settings.autoLock')}</p>
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

                {/* Modo disfarce */}
                <div className="border-t border-gray-700 my-4" />
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">🎭 {pt ? 'Modo disfarce' : 'Disguise mode'}</p>
                <p className="text-xs text-gray-500 mb-3">{pt ? 'A app abre como calculadora; só um gesto secreto revela a NEP.' : 'The app opens as a calculator; only a secret gesture reveals NEP.'}</p>
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <span className={'text-sm ' + (disguiseOn ? 'text-green-300' : 'text-gray-300')}>
                            {disguiseOn ? (pt ? '✅ Ativado' : '✅ Enabled') : (pt ? 'Desativado' : 'Disabled')}
                        </span>
                        <button
                            onClick={requestToggleDisguise}
                            aria-label={pt ? 'Modo disfarce' : 'Disguise mode'}
                            className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${disguiseOn ? 'bg-purple-500' : 'bg-gray-600'}`}
                        >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${disguiseOn ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    {/* Como entrar (gesto fixo, não personalizável) */}
                    <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-3 text-xs text-gray-300 leading-relaxed">
                        <p className="font-semibold text-white mb-1">{pt ? 'Como entrar na NEP:' : 'How to enter NEP:'}</p>
                        <p>{pt
                            ? 'Ao abrir, aparece uma calculadora. Carrega em AC 3 vezes → escreve o teu PIN (aparece escondido, ••••) → "=". É sempre este gesto (não muda). Uma conta normal nunca revela nada.'
                            : 'On open, a calculator appears. Press AC 3 times → type your PIN (shown hidden, ••••) → "=". It is always this gesture (it never changes). Normal maths reveals nothing.'}</p>
                    </div>

                    {/* Rede de segurança — deixar bem claro */}
                    <div className="bg-yellow-900/15 border border-yellow-700/40 rounded-lg p-3 text-xs text-yellow-300/90 leading-relaxed">
                        {pt
                            ? '🛟 Se ficares mesmo trancada fora: apagar os dados do site / reinstalar a app DESLIGA o disfarce. Os teus dados na nuvem ficam seguros — recuperas com o teu PIN.'
                            : '🛟 If you ever get locked out: clearing the site data / reinstalling the app TURNS OFF the disguise. Your cloud data stays safe — you recover it with your PIN.'}
                    </div>

                    {/* Ajuda por email */}
                    <a
                        href="mailto:nep.app@proton.me?subject=Ajuda%20NEP"
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium border border-gray-600"
                    >
                        ✉️ {pt ? 'Preciso de ajuda (enviar email)' : 'I need help (send email)'}
                    </a>

                    {disguiseOn && (
                        <p className="text-xs text-gray-500">
                            {pt ? 'Testa: fecha a app por completo, reabre, e confirma que entras com AC 3× + PIN + "=".' : 'Test it: fully close the app, reopen, and confirm you get in with AC 3× + PIN + "=".'}
                        </p>
                    )}
                </div>
            </Section>

            {/* ── Conta (no fim, abre/fecha) ── */}
            <Section
                icon={<Icons.User className="w-5 h-5 text-purple-400" />}
                title={t('settings.account')}
            >
                <div className="space-y-3 text-gray-300">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{t('settings.emailLabel')}</span>
                        <span className="text-sm">{user?.email || t('settings.emailNotAvailable')}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">📅 {t('settings.firstUseLabel')}</span>
                        {/* O "primeiro dia" é a data do registo mais antigo (recupera-se
                            sozinho após reinstalar) — é fixo, não se edita à mão. */}
                        <span className="text-sm">
                            {firstUseDate
                                ? firstUseDate.toLocaleDateString(pt ? 'pt-PT' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                                : '—'}
                        </span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-red-900/30 hover:bg-red-900/50 text-red-400 border-red-700/50 w-full py-3 rounded-lg transition-all font-medium border flex items-center justify-center gap-2"
                    >
                        <Icons.LogOut className="w-4 h-4" />
                        {t('settings.logout')}
                    </button>
                </div>
            </Section>

            {/* ── Sobre, ajuda e legal (tudo no mesmo dropdown) ── */}
            <Section
                icon={<Icons.Info className="w-5 h-5 text-purple-400" />}
                title={pt ? 'Sobre, ajuda e legal' : 'About, help & legal'}
            >
                <div className="space-y-4 text-sm text-gray-300">
                    {/* Sobre */}
                    <div className="space-y-1">
                        <p><strong>{t('settings.appName')}</strong></p>
                        <p className="text-xs italic">{t('settings.tagline')}</p>
                        <p className="text-xs italic">{t('settings.motto')}</p>
                        <div className="mt-3 pt-3 border-t text-xs border-gray-700 text-gray-400">
                            <p>{t('settings.version', { version: APP_VERSION })}</p>
                            <p className="mt-1">{t('settings.copyright')}</p>
                        </div>
                    </div>

                    {/* Como usar */}
                    <div className="pt-2 border-t border-gray-700">
                        <p className="font-medium text-gray-200 mb-2 flex items-center gap-2">
                            <Icons.Info className="w-4 h-4 text-purple-400" />
                            {t('settings.guideHeader')}
                        </p>
                        <GuideAccordion />
                    </div>

                    {/* Contacto */}
                    <div className="pt-2 border-t border-gray-700">
                        <p className="font-medium text-gray-200 mb-2 flex items-center gap-2">
                            ✉️ {pt ? 'Contacto e ajuda' : 'Contact & help'}
                        </p>
                        <p className="text-xs text-gray-400 mb-2">
                            {pt
                                ? 'Dúvidas, sugestões ou precisas de ajuda? Escreve para:'
                                : 'Questions, suggestions or need help? Write to:'}
                        </p>
                        <a
                            href="mailto:nep.app@proton.me?subject=Ajuda%20NEP"
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium border border-gray-600"
                        >
                            ✉️ nep.app@proton.me
                        </a>
                    </div>

                    {/* Legal e ética */}
                    <div className="pt-2 border-t border-gray-700">
                        <p className="font-medium text-gray-200 mb-2 flex items-center gap-2">
                            <Icons.FileText className="w-4 h-4 text-purple-400" />
                            {pt ? 'Legal e ética' : 'Legal & ethics'}
                        </p>
                        <div className="space-y-2">
                            <button
                                onClick={() => onOpenLegalDoc('license')}
                                className="bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 w-full py-3 px-4 rounded-lg transition-all font-medium border flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2"><span>📜</span><span>{t('settings.license')}</span></span>
                                <Icons.ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onOpenLegalDoc('terms')}
                                className="bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 w-full py-3 px-4 rounded-lg transition-all font-medium border flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2"><span>📋</span><span>{t('settings.terms')}</span></span>
                                <Icons.ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onOpenLegalDoc('governance')}
                                className="bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 w-full py-3 px-4 rounded-lg transition-all font-medium border flex items-center justify-between"
                            >
                                <span className="flex items-center gap-2"><span>⚖️</span><span>{t('settings.governance')}</span></span>
                                <Icons.ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </Section>

            {/* ── Privacidade e segurança (no fundo, sem repetir) ── */}
            <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-700/50">
                <div className="flex items-start gap-2">
                    <Icons.Shield className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-purple-300">
                        <p className="font-medium mb-1">{t('settings.privacy')}</p>
                        <p className="text-xs opacity-90">{t('settings.privacyText')}</p>
                    </div>
                </div>
            </div>

            {/* Confirmação ao ATIVAR o modo disfarce — a pessoa tem de perceber o
                gesto e reconhecer que não se pode esquecer (não é personalizável). */}
            {showDisguiseConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50" onClick={() => setShowDisguiseConfirm(false)}>
                    <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-semibold text-white mb-3 flex items-center gap-2 text-lg">
                            <span>🎭</span>
                            {pt ? 'Antes de ativar o disfarce' : 'Before enabling the disguise'}
                        </h3>

                        <p className="text-sm text-gray-300 mb-3 leading-relaxed">
                            {pt
                                ? 'A partir de agora, a app abre como uma calculadora normal. Para entrares na NEP tens de fazer sempre este gesto:'
                                : 'From now on, the app opens as a normal calculator. To enter NEP you must always do this gesture:'}
                        </p>

                        <div className="bg-gray-900/50 border border-purple-700/50 rounded-lg p-4 text-sm text-white mb-3 leading-relaxed">
                            <p className="font-semibold mb-1">📱 {pt ? 'Calculadora' : 'Calculator'}</p>
                            <p className="whitespace-pre-line">{pt
                                ? '1) Carrega em AC 3 vezes seguidas.\n2) Escreve o teu PIN — vai aparecer escondido (••••).\n3) Carrega em "=".'
                                : '1) Press AC 3 times in a row.\n2) Type your PIN — it shows hidden (••••).\n3) Press "=".'}
                            </p>
                            <p className="mt-2 text-xs text-gray-400">{pt
                                ? 'É sempre este gesto — não muda e não é personalizável. Fazer contas normais nunca revela nada.'
                                : 'It is always this gesture — it never changes and can\'t be customized. Doing normal maths never reveals anything.'}</p>
                        </div>

                        <div className="bg-yellow-900/15 border border-yellow-700/40 rounded-lg p-3 text-xs text-yellow-300/90 mb-3 leading-relaxed">
                            {pt
                                ? '🛟 Rede de segurança: se alguma vez te esqueceres e ficares trancada fora, apagar os dados do site / reinstalar a app DESLIGA o disfarce. Os teus dados na nuvem ficam seguros — recuperas com o teu PIN.'
                                : '🛟 Safety net: if you ever forget and get locked out, clearing the site data / reinstalling the app TURNS OFF the disguise. Your cloud data stays safe — you recover it with your PIN.'}
                        </div>

                        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-xs text-gray-300 mb-4 leading-relaxed">
                            {pt
                                ? 'Guarda este email para pedires ajuda caso te esqueças do gesto: '
                                : 'Save this email to ask for help if you forget the gesture: '}
                            <span className="font-semibold text-white select-all">nep.app@proton.me</span>
                        </div>

                        <label className="flex items-start gap-3 mb-4 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={disguiseAck}
                                onChange={(e) => setDisguiseAck(e.target.checked)}
                                className="mt-0.5 w-5 h-5 accent-purple-500 flex-shrink-0"
                            />
                            <span className="text-sm text-gray-200">
                                {pt
                                    ? 'Percebi o gesto (AC 3× → PIN → =) e comprometo-me a não me esquecer.'
                                    : 'I understand the gesture (AC 3× → PIN → =) and I commit to not forgetting it.'}
                            </span>
                        </label>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDisguiseConfirm(false)}
                                className="flex-1 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium"
                            >
                                {pt ? 'Cancelar' : 'Cancel'}
                            </button>
                            <button
                                onClick={confirmEnableDisguise}
                                disabled={!disguiseAck}
                                className={
                                    'flex-1 py-3 rounded-lg font-medium transition-all ' +
                                    (disguiseAck
                                        ? 'bg-purple-500 hover:bg-purple-600 text-white'
                                        : 'bg-gray-700 text-gray-500 cursor-not-allowed')
                                }
                            >
                                {pt ? 'Ativar disfarce' : 'Enable disguise'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmação de importação */}
            {pendingImportFile && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => !importing && setPendingImportFile(null)}>
                    <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                            <Icons.Upload className="w-5 h-5" />
                            {t('settings.importConfirmTitle')}
                        </h3>
                        <p className="text-sm text-gray-300 mb-1">
                            {t('settings.importConfirmBody', { file: pendingImportFile.name })}
                        </p>
                        <p className="text-xs text-gray-500 mb-4">
                            {t('settings.importConfirmNote')}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setPendingImportFile(null)}
                                disabled={importing}
                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2.5 rounded-lg transition-all font-medium disabled:opacity-50"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={confirmImport}
                                disabled={importing}
                                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-2.5 rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {importing ? t('settings.importing') : t('settings.importConfirmButton')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
