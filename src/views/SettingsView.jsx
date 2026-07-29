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
    const toggleDisguise = () => {
        const next = !disguiseOn;
        safeLocalStorage.set('nep_disguise_enabled', next);
        safeLocalStorage.set('nep_disguise_code', ''); // versão nova usa o PIN, não um código separado
        setDisguiseOn(next);
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
            </Section>

            {/* ── Surfar o impulso (visível e óbvio, junto às notificações) ── */}
            <div className="bg-gray-800 border-gray-700 rounded-xl p-4 border">
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
            </div>

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
                    ? 'Guardar cópia, sincronizar e recuperar.'
                    : 'Back up, sync and restore.'}
            >
                <div className="space-y-3 text-gray-300">
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

            {/* ── Modo de dados (abre/fecha, pequeno) ── */}
            <Section
                icon={<span>🛡️</span>}
                title={pt ? 'Modo de dados' : 'Data mode'}
                subtitle={pt ? 'Como os teus dados são guardados e partilhados.' : 'How your data is stored and shared.'}
            >
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
            </Section>

            {/* ── Bloqueio automático (abre/fecha, pequeno) ── */}
            <Section
                icon={<Icons.Shield className="w-5 h-5 text-purple-400" />}
                title={t('settings.autoLock')}
                subtitle={t('settings.autoLockSubtitle')}
            >
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
            </Section>

            {/* ── Modo disfarce (calculadora + código) ── */}
            <Section
                icon={<span>🎭</span>}
                title={pt ? 'Modo disfarce' : 'Disguise mode'}
                subtitle={pt ? 'A app abre como calculadora; só um código secreto revela a NEP.' : 'The app opens as a calculator; only a secret code reveals NEP.'}
            >
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <span className={'text-sm ' + (disguiseOn ? 'text-green-300' : 'text-gray-300')}>
                            {disguiseOn ? (pt ? '✅ Ativado' : '✅ Enabled') : (pt ? 'Desativado' : 'Disabled')}
                        </span>
                        <button
                            onClick={toggleDisguise}
                            aria-label={pt ? 'Modo disfarce' : 'Disguise mode'}
                            className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${disguiseOn ? 'bg-purple-500' : 'bg-gray-600'}`}
                        >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${disguiseOn ? 'translate-x-7' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        {pt
                            ? 'Ao abrir a app aparece uma calculadora. Escreve o teu PIN de sempre e carrega em "=" para entrar na NEP. Um número errado só faz de calculadora — não revela nada, nem bloqueia. (Se usares uma operação +−×÷, o "=" faz mesmo a conta.)'
                            : 'When you open the app a calculator appears. Type your usual PIN and press "=" to enter NEP. A wrong number just acts as a calculator — it reveals nothing and never locks. (If you use an operation +−×÷, "=" does the actual maths.)'}
                    </p>
                    {disguiseOn && (
                        <p className="text-xs text-gray-500">
                            {pt ? 'Testa: fecha a app por completo, reabre, e confirma que consegues entrar com o PIN + "=".' : 'Test it: fully close the app, reopen, and confirm you can get in with your PIN + "=".'}
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

            {/* ── Sobre e ajuda (abre/fecha): sobre + como usar + legal ── */}
            <Section
                icon={<Icons.Info className="w-5 h-5 text-purple-400" />}
                title={pt ? 'Sobre e ajuda' : 'About & help'}
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
                </div>
            </Section>

            {/* ── Legal e ética (à parte do "Sobre") ── */}
            <Section
                icon={<Icons.FileText className="w-5 h-5 text-purple-400" />}
                title={pt ? 'Legal e ética' : 'Legal & ethics'}
                subtitle={pt
                    ? 'Licença, termos de uso e governança ética.'
                    : 'Licence, terms of use and ethical governance.'}
            >
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
