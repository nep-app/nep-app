import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './utils/firebase';
import { getTodayKey, genId, safeToISODate, safeDate, getTodayPT, getDateKeyFromItem, timestampToPT, formatDateTime, formatDateShort, formatDateWithWeekday, formatDateWithWeekdayFull, formatDateRange, subtractDays, getDateDaysAgo } from './utils/helpers';
import * as analyticsService from './services/analyticsService';
import { exportAndDownloadAll, exportToCSV as exportToCSVNew, downloadCSV } from './services/exportService';
import * as Icons from './components/Icons';
import { useData } from './contexts/DataContext';
import { useMetrics } from './contexts/MetricsContext';
import { useUI } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './hooks/useToast';
import { useAuth as useFirebaseAuth } from './hooks/useAuth';
import { useReminders } from './hooks/useReminders';
import { AuthScreen } from './components/AuthScreen';
import { FirebaseLoginScreen } from './components/FirebaseLoginScreen';

import { validateSleepHours, validateMoodEnergy, validateText, sanitizeText, MAX_NOTE_LENGTH, MAX_THOUGHT_LENGTH } from './utils/validation';
import { themeClasses, cn, cx } from './utils/classNames';
import { analyzeMultipleNotes, identifyThemes, getSentimentDescription, getTrendDescription } from './utils/sentimentAnalysis';
import { logger } from './utils/logger';

// Lazy load heavy components (reduces initial bundle)
const WellbeingChart = lazy(() => import('./components/WellbeingChart'));

// ⚡ HomeView: IMPORT NORMAL (12.6KB, user SEMPRE visita, boot instantâneo)
import { HomeViewRefactored } from './views/HomeViewRefactored';

// 🔥 Views pesadas: LAZY LOAD (só carrega quando user navega)
// - AnalysesView: 143KB + recharts 243KB = 386KB
// - PatternsView: 92KB + recharts
// - HistoryView, SettingsView: carregam sob demanda
const PatternsView = lazy(() => import('./views/PatternsView').then(module => ({ default: module.PatternsView })));
const AnalysesView = lazy(() => import('./views/AnalysesView').then(module => ({ default: module.AnalysesView })));
const HistoryView = lazy(() => import('./views/HistoryView').then(module => ({ default: module.HistoryView })));
const SettingsView = lazy(() => import('./views/SettingsView').then(module => ({ default: module.SettingsView })));

// Lazy load modals (only load when user opens them)
const DailyLogModal = lazy(() => import('./components/modals/DailyLogModal').then(module => ({ default: module.DailyLogModal })));
const WellbeingModal = lazy(() => import('./components/modals/WellbeingModal').then(module => ({ default: module.WellbeingModal })));
const EmotionsModal = lazy(() => import('./components/modals/EmotionsModal').then(module => ({ default: module.EmotionsModal })));
const ReflectionModal = lazy(() => import('./components/modals/ReflectionModal').then(module => ({ default: module.ReflectionModal })));
const CycleModal = lazy(() => import('./components/modals/CycleModal').then(module => ({ default: module.CycleModal })));
const GoalModal = lazy(() => import('./components/modals/GoalModal').then(module => ({ default: module.GoalModal })));
const EditConsumptionModal = lazy(() => import('./components/modals/EditConsumptionModal').then(module => ({ default: module.EditConsumptionModal })));
const ThoughtsModal = lazy(() => import('./components/modals/ThoughtsModal').then(module => ({ default: module.ThoughtsModal })));
const LegalModal = lazy(() => import('./components/modals/LegalModal').then(module => ({ default: module.LegalModal })));
const ExportModal = lazy(() => import('./components/modals/ExportModal').then(module => ({ default: module.ExportModal })));

// PWA shortcut: read ?action= once at module load (outside component, avoids closure/mangling issues)
const _pwaAction = new URLSearchParams(window.location.search).get('action');
if (_pwaAction) {
  const _u = new URL(window.location.href);
  _u.searchParams.delete('action');
  window.history.replaceState(null, '', _u.toString());
}

function HarmReductionTracker() {
            const APP_VERSION = '4.5.6';
            const { t } = useTranslation();

            // Initialize Firebase
            const firebaseAuth = useMemo(() => {
                const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
                return getAuth(app);
            }, []);

            const [firebaseUser, setFirebaseUser] = useState(null);
            const [firebaseLoading, setFirebaseLoading] = useState(true);
            const { isAuthenticated: pinAuthenticated, loading: pinLoading, hasAccount } = useAuth();
            const [hasPinAccount, setHasPinAccount] = useState(null);

            // 1. Listen to Firebase auth state
            useEffect(() => {
                const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
                    setFirebaseUser(user);
                    setFirebaseLoading(false);
                });
                return unsubscribe;
            }, [firebaseAuth]);

            // 2. Check if PIN account exists (only when Firebase user exists)
            useEffect(() => {
                const checkPinAccount = async () => {
                    if (firebaseUser && !firebaseLoading) {
                        const exists = await hasAccount();
                        setHasPinAccount(exists);
                    }
                };
                checkPinAccount();
            }, [firebaseUser, firebaseLoading, hasAccount]);

            // Render content based on auth state
            let content;

            // LOADING: Firebase auth state checking
            if (firebaseLoading || pinLoading) {
                content = (
                    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900">
                        <div className="text-center">
                            <Icons.RefreshCw className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
                            <p className="text-purple-300">{t('auth.loading')}</p>
                        </div>
                    </div>
                );
            }
            // STEP 1: NO Firebase user → Show Firebase login
            else if (!firebaseUser) {
                content = <FirebaseLoginScreen auth={firebaseAuth} />;
            }
            // STEP 2: Checking PIN account
            else if (hasPinAccount === null) {
                content = (
                    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900">
                        <div className="text-center">
                            <Icons.RefreshCw className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
                            <p className="text-purple-300">{t('auth.verifyingPIN')}</p>
                        </div>
                    </div>
                );
            }
            // STEP 3: Firebase user exists but not PIN authenticated → Show PIN screen
            else if (!pinAuthenticated) {
                content = <AuthScreen onFirebaseLogout={() => firebaseAuth.signOut()} />;
            }
            // STEP 4: Both Firebase AND PIN authenticated → Show app
            else {
                content = <AuthenticatedApp />;
            }

            return content;
        }

/**
 * AuthenticatedApp - Only renders when user is authenticated with PIN
 * This prevents Firebase/data hooks from running before authentication
 */
function AuthenticatedApp() {
            // Data and UI contexts
            const { auth, db, user, loading: dataLoading, consumptions, dailyLogs, reflections, wellbeingLogs, cycles, goals, copingStrategies: copingStrategiesData, thoughts, healthLogs, addConsumption, deleteConsumption, addDailyLog, addReflection, addWellbeingLog, addCycle, updateCycle, deleteCycle, addGoal, updateGoal, deleteGoal, addThought, updateItem, deleteItem: deleteItemFromContext, manualSync, forcePushAll, isSyncing, lastSyncTime } = useData();
            const { darkMode, showDailyLogModal, setShowDailyLogModal, showWellbeingModal, setShowWellbeingModal, showEmotionsModal, setShowEmotionsModal, showReflectionModal, setShowReflectionModal, showCycleModal, setShowCycleModal, showGoalModal, setShowGoalModal, showEditConsumptionModal, setShowEditConsumptionModal, showThoughtsModal, setShowThoughtsModal, editingConsumption, setEditingConsumption, editingGoal, setEditingGoal, editingCycle, setEditingCycle } = useUI();

            // i18n
            const { t, i18n } = useTranslation();

            // Custom hooks
            const { toasts, showToast } = useToast();
            const { handleLogout } = useFirebaseAuth(auth); // Only need logout for settings
            const { notificationsEnabled, requestNotificationPermission, dismissReminder } = useReminders(user, wellbeingLogs, consumptions, cycles, reflections, dailyLogs, showToast);

            // Use metrics context for centralized analytics and computations
            const metrics = useMetrics();

            // App error state
            const [appError, setAppError] = useState(null);

            // UI Navigation State
            const [currentView, setCurrentView] = useState('home');
            const [timeFilter, setTimeFilter] = useState('all');
            const [patternsPeriod, setPatternsPeriod] = useState('tudo'); // hoje, semana, mes, tudo
            const [patternsPeriodOffset, setPatternsPeriodOffset] = useState(0); // 0 = current, 1 = previous, etc
            const [historyPeriod, setHistoryPeriod] = useState('tudo');
            const [historyPeriodOffset, setHistoryPeriodOffset] = useState(0);
            const [historyTopic, setHistoryTopic] = useState('todos'); // todos, consumo, reflexoes, ciclos, bem-estar, dbt
            const [patternView, setPatternView] = useState('dashboard');
            const [patternsSubView, setPatternsSubView] = useState('temporal'); // For patterns tab: temporal, structural, correlations
            const [analysisSubView, setAnalysisSubView] = useState('correlacoes'); // For analyses tab: correlacoes, emocoes, gatilhos, coach

            // Pagination States
            const [consumptionsToShow, setConsumptionsToShow] = useState(20);
            const [reflectionsToShow, setReflectionsToShow] = useState(10);
            const [wellbeingToShow, setWellbeingToShow] = useState(14);
            const [cyclesHistoryToShow, setCyclesHistoryToShow] = useState(10);
            const [thoughtsToShow, setThoughtsToShow] = useState(10);
            const [allItemsToShow, setAllItemsToShow] = useState(20); // Para tab "Tudo"

            // Legal Modal State
            const [showLegalModal, setShowLegalModal] = useState(false);
            const [showExportModal, setShowExportModal] = useState(false);
            const [legalDocType, setLegalDocType] = useState(null); // 'license', 'terms', 'governance'

            // Form States
            const [dailyForm, setDailyForm] = useState({ mg: 30, notes: '', date: getTodayKey() });
            const [wellbeingForm, setWellbeingForm] = useState({ mood: '', energy: '', waterGlasses: 0, exerciseType: '', exerciseDuration: '', napDuration: '', social: false, food: false, emotions: [], symptoms: [], customSymptom: '', notes: '', datetime: '', isAtypical: false, atypicalReason: '' });
            const [emotionsForm, setEmotionsForm] = useState({ datetime: '', emotions: [], notes: '' });
            const [reflectionAnswer, setReflectionAnswer] = useState('');
            const [reflectionDatetime, setReflectionDatetime] = useState('');
            const [cycleForm, setCycleForm] = useState({ bedtime: '', sleep: '', triggers: [], notes: '', createdAt: '' });
            const [goalForm, setGoalForm] = useState({ type: 'reduce_frequency', target: '', period: 'daily' });
            const [thoughtDatetime, setThoughtDatetime] = useState('');
            const [thoughtInitialContent, setThoughtInitialContent] = useState('');

            // Editing states for items that don't use UIContext
            const [editingDailyLog, setEditingDailyLog] = useState(null);
            const [editingWellbeingLog, setEditingWellbeingLog] = useState(null);
            const [editingReflection, setEditingReflection] = useState(null);
            const [editingThought, setEditingThought] = useState(null);

            // ===== 3. FIREBASE OPERATIONS (CRUD) =====
            const getCurrentCycleIndex = () => {
                if (cycles.length === 0) return 0;
                return cycles.length - 1;
            };

            const currentDbtQuestion = useMemo(() => {
                const questions = i18n.t('dbtQuestions', { returnObjects: true });
                const cycleIndex = getCurrentCycleIndex();
                return questions[cycleIndex % questions.length];
            }, [cycles.length, i18n.language]);

            const currentReflection = useMemo(() => {
                const questions = i18n.t('reflectiveQuestions', { returnObjects: true });
                const cycleIndex = getCurrentCycleIndex();
                return questions[cycleIndex % questions.length];
            }, [cycles.length, i18n.language]);

            // Pergunta da reflexão baseada na data seleccionada (não apenas na de hoje)
            const reflectionQuestion = useMemo(() => {
                if (editingReflection) return editingReflection.question;
                const questions = i18n.t('dbtQuestions', { returnObjects: true });
                let cycleIdx;
                if (reflectionDatetime) {
                    // Contar quantos ciclos existiam até à data seleccionada
                    const selectedDate = new Date(reflectionDatetime);
                    const cyclesAtDate = cycles.filter(c => {
                        const cDate = new Date(c.timestamp || c.createdAt || c.date + 'T23:59:59');
                        return cDate <= selectedDate;
                    }).length;
                    cycleIdx = cyclesAtDate > 0 ? cyclesAtDate - 1 : 0;
                } else {
                    cycleIdx = getCurrentCycleIndex();
                }
                return questions[cycleIdx % questions.length];
            }, [editingReflection, reflectionDatetime, cycles, i18n.language]);

            // Global error handler
            useEffect(() => {
                const handleError = (event) => {
                    logger.error('Global error:', event.error);
                    setAppError(event.error?.message || 'Erro desconhecido');
                };
                const handleUnhandledRejection = (event) => {
                    logger.error('Unhandled rejection:', event.reason);
                    setAppError(event.reason?.message || 'Erro desconhecido');
                };
                window.addEventListener('error', handleError);
                window.addEventListener('unhandledrejection', handleUnhandledRejection);
                return () => {
                    window.removeEventListener('error', handleError);
                    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
                };
            }, []);

            // Apply dark mode to body (permanent)
            useEffect(() => {
                document.body.classList.add('dark');
            }, []);

            // PWA shortcut: open daily log modal when ?action=consume was in URL
            useEffect(() => {
                if (_pwaAction === 'consume') setShowDailyLogModal(true);
            // eslint-disable-next-line react-hooks/exhaustive-deps
            }, []);

            // ===== 3. FIREBASE OPERATIONS (CRUD) =====

            const markConsumption = async () => {
                try {
                    const now = new Date();
                    const item = { id: genId(), timestamp: now.toISOString(), date: getTodayKey(), notes: '' };
                    await addConsumption(item);
                    showToast(t('messages.consumptionSaved'), 'success');
                } catch (error) {
                    logger.error('❌ ERRO COMPLETO:', error);
                    logger.error('❌ Mensagem:', error.message);
                    logger.error('❌ Stack:', error.stack);
                    showToast(t('messages.consumptionSaveError'), 'error');
                }
            };

            const deleteItem = async (collectionName, id) => {
                // Confirm before deleting
                const itemNames = {
                    'consumptions': 'este consumo',
                    'reflections': 'esta reflexão',
                    'wellbeingLogs': 'este registo de bem-estar',
                    'dailyLogs': 'este registo diário',
                    'cycles': 'este ciclo',
                    'goals': 'esta meta',
                    'thoughts': 'este pensamento'
                };
                const itemName = itemNames[collectionName] || 'este item';

                if (!window.confirm(`Tens a certeza que queres apagar ${itemName}? Esta ação não pode ser desfeita.`)) {
                    return;
                }

                try {
                    await deleteItemFromContext(collectionName, id);
                    showToast(t('messages.itemDeleted'), 'success');
                } catch (error) {
                    showToast(t('messages.itemDeleteError'), 'error');
                    logger.error('Erro ao apagar:', error);
                }
            };

            const openEditConsumption = (consumption) => { setEditingConsumption({...consumption}); setShowEditConsumptionModal(true); };

            const openEditCycle = (cycle) => { setEditingCycle({...cycle}); setShowCycleModal(true); };

            const openEditDailyLog = (log) => {
                setEditingDailyLog({...log});
                const dateStr = log.date || (log.timestamp ? log.timestamp.split('T')[0] : getTodayKey());
                setDailyForm({ mg: log.mg ?? '', notes: log.notes || '', date: dateStr });
                setShowDailyLogModal(true);
            };

            const openEditWellbeingLog = (w) => {
                setEditingWellbeingLog({...w});
                const datetime = w.timestamp ? w.timestamp.slice(0, 16) : (w.date ? w.date + 'T12:00' : '');
                setWellbeingForm({
                    mood: w.mood != null ? String(w.mood) : '',
                    energy: w.energy != null ? String(w.energy) : '',
                    waterGlasses: w.waterGlasses || 0,
                    exerciseType: w.exerciseType || '',
                    exerciseDuration: w.exerciseDuration || '',
                    social: w.social || false,
                    food: w.food || false,
                    emotions: w.emotions || [],
                    symptoms: w.symptoms || [],
                    customSymptom: w.customSymptom || '',
                    notes: w.notes || '',
                    datetime,
                    isAtypical: w.isAtypical || false,
                    atypicalReason: w.atypicalReason || ''
                });
                setShowWellbeingModal(true);
            };

            const openEditReflection = (r) => {
                setEditingReflection({...r});
                setReflectionAnswer(r.answer || '');
                const datetime = r.timestamp ? r.timestamp.slice(0, 16) : (r.date ? r.date + 'T12:00' : '');
                setReflectionDatetime(datetime);
                setShowReflectionModal(true);
            };

            const openEditThought = (thought) => {
                setEditingThought({...thought});
                setThoughtInitialContent(thought.content || '');
                const datetime = thought.timestamp ? thought.timestamp.slice(0, 16) : (thought.date ? thought.date + 'T12:00' : '');
                setThoughtDatetime(datetime);
                setShowThoughtsModal(true);
            };

            // Função para preencher gaps - pré-preenche formulários com a data selecionada e abre o modal correspondente
            const handleFillGap = (type, dateKey) => {
                // dateKey formato: YYYY-MM-DD
                switch (type) {
                    case 'consumption':
                        // Para consumos, não há formulário inicial - abre o modal de edição vazio ou apenas mostra mensagem
                        // Consumos são criados via botão + na home, então aqui podemos apenas navegar para lá
                        showToast(t('messages.consumptionHint'), 'info');
                        break;

                    case 'dailyLog':
                        setDailyForm({ mg: 30, notes: '', date: dateKey });
                        setShowDailyLogModal(true);
                        break;

                    case 'cycle':
                        // Para ciclos, o createdAt deve ser um datetime. Usamos o início do dia selecionado.
                        const cycleDate = new Date(dateKey + 'T08:00'); // 8h da manhã por defeito
                        const cycleDatetimeStr = cycleDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
                        setCycleForm({ bedtime: '', sleep: '', triggers: [], notes: '', createdAt: cycleDatetimeStr });
                        setShowCycleModal(true);
                        break;

                    case 'wellbeing':
                        // Para wellbeing (estado), o datetime deve ser completo
                        const wbDate = new Date(dateKey + 'T12:00'); // meio-dia por defeito
                        const wbDatetimeStr = wbDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
                        setWellbeingForm({ mood: '', energy: '', waterGlasses: 0, exerciseType: '',
                        exerciseDuration: '', napDuration: '', social: false, food: false, emotions: [], symptoms: [], customSymptom: '', notes: '', datetime: wbDatetimeStr, isAtypical: false, atypicalReason: '' });
                        setShowWellbeingModal(true);
                        break;

                    case 'emotions':
                        // Para emoções, pré-preencher datetime com a data selecionada
                        const emDate = new Date(dateKey + 'T12:00'); // meio-dia por defeito
                        const emDatetimeStr = emDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
                        setEmotionsForm({ datetime: emDatetimeStr, emotions: [], notes: '' });
                        setShowEmotionsModal(true);
                        break;

                    case 'reflection':
                        // Para reflexão DBT, pré-preencher datetime com a data selecionada
                        const reflDate = new Date(dateKey + 'T12:00'); // meio-dia por defeito
                        const reflDatetimeStr = reflDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
                        setReflectionDatetime(reflDatetimeStr);
                        setShowReflectionModal(true);
                        break;

                    case 'thought':
                        // Para pensamentos, pré-preencher datetime com a data selecionada
                        const thDate = new Date(dateKey + 'T12:00'); // meio-dia por defeito
                        const thDatetimeStr = thDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
                        setThoughtDatetime(thDatetimeStr);
                        setShowThoughtsModal(true);
                        break;

                    default:
                        break;
                }
            };

            const saveEditedConsumption = async () => {
                if (!editingConsumption) return;

                try {
                    await updateItem('consumptions', editingConsumption.id, editingConsumption);
                    setShowEditConsumptionModal(false);
                    setEditingConsumption(null);
                    showToast(t('messages.consumptionEdited'), 'success');
                } catch (error) {
                    showToast(t('messages.consumptionEditError'), 'error');
                    logger.error('Erro ao editar:', error);
                }
            };

            const submitDailyLog = async () => {
                try {
                    if (editingDailyLog) {
                        await updateItem('dailyLogs', editingDailyLog.id, {
                            mg: dailyForm.mg !== '' ? parseFloat(dailyForm.mg) : null,
                            notes: dailyForm.notes,
                            date: dailyForm.date
                        });
                        setEditingDailyLog(null);
                        setDailyForm({ mg: 30, notes: '', date: getTodayKey() });
                        setShowDailyLogModal(false);
                        showToast(t('messages.dailyLogSaved'), 'success');
                        return;
                    }

                    // Usar data escolhida ou hoje
                    const selectedDate = dailyForm.date || getTodayKey();

                    // Usar timestamp REAL (hora atual de submissão)
                    const timestamp = new Date().toISOString();

                    // Contar consumos do dia SELECIONADO (não de hoje)
                    const consumptionsOnSelectedDate = consumptions.filter(c => c.date === selectedDate);
                    const timesCount = consumptionsOnSelectedDate.length;

                    const item = {
                        id: genId(),
                        date: selectedDate,
                        timestamp: timestamp,
                        times: timesCount,
                        mg: dailyForm.mg !== '' ? parseFloat(dailyForm.mg) : null,
                        notes: dailyForm.notes
                    };
                    await addDailyLog(item);
                    setDailyForm({ mg: 30, notes: '', date: getTodayKey() });
                    setShowDailyLogModal(false);
                    showToast(t('messages.dailyLogSaved'), 'success');
                } catch (error) {
                    showToast(t('messages.dailyLogSaveError'), 'error');
                    logger.error(error);
                }
            };

            // Função de migração para corrigir o campo "times" nos dailyLogs antigos
            const fixDailyLogsTimes = async () => {
                try {
                    let fixed = 0;
                    let errors = 0;

                    for (const log of dailyLogs) {
                        try {
                            // Contar consumos do mesmo dia
                            const consumptionsOnDate = consumptions.filter(c => c.date === log.date);
                            const correctTimes = consumptionsOnDate.length;

                            // Se o times estiver errado, corrigir
                            if (log.times !== correctTimes) {
                                // Usar updateItem para atualizar Dexie + Firebase + React state
                                await updateItem('dailyLogs', log.id, { times: correctTimes });
                                fixed++;
                                logger.info(`Fixed dailyLog ${log.id}: ${log.times} -> ${correctTimes}`);
                            }
                        } catch (error) {
                            logger.error(`Error fixing dailyLog ${log.id}:`, error);
                            errors++;
                        }
                    }

                    // Marcar migração como completa
                    localStorage.setItem('dailyLogsMigrationV1', 'done');

                    if (fixed > 0) {
                        showToast(t('messages.mgFixed', { count: fixed }), 'success');
                        logger.info(`Migration completed: ${fixed} records fixed, ${errors} errors`);
                    }
                } catch (error) {
                    logger.error('Migration error:', error);
                }
            };

            // Executar migração automaticamente uma vez
            useEffect(() => {
                const migrationDone = localStorage.getItem('dailyLogsMigrationV1');

                if (!migrationDone && user && dailyLogs.length > 0 && consumptions.length > 0) {
                    // Esperar 2 segundos após carregar para não interferir com a UI
                    const timer = setTimeout(() => {
                        fixDailyLogsTimes();
                    }, 2000);

                    return () => clearTimeout(timer);
                }
            }, [user, dailyLogs.length, consumptions.length]);

            const submitWellbeing = async () => {
                try {

                    // Validate mood
                    if (wellbeingForm.mood !== '') {
                        const moodValidation = validateMoodEnergy(wellbeingForm.mood);
                        if (!moodValidation.valid) {
                            showToast('✗ ' + moodValidation.error, 'error');
                            return;
                        }
                    }

                    // Validate energy
                    if (wellbeingForm.energy !== '') {
                        const energyValidation = validateMoodEnergy(wellbeingForm.energy);
                        if (!energyValidation.valid) {
                            showToast('✗ ' + energyValidation.error, 'error');
                            return;
                        }
                    }

                    // Validate and sanitize notes
                    const notesValidation = validateText(wellbeingForm.notes, MAX_NOTE_LENGTH);
                    if (!notesValidation.valid) {
                        showToast('✗ ' + notesValidation.error, 'error');
                        return;
                    }

                    // Parse datetime or use current timestamp
                    let timestamp = new Date().toISOString();
                    let date = getTodayKey();
                    if (wellbeingForm.datetime) {
                        const selectedDate = new Date(wellbeingForm.datetime);
                        timestamp = selectedDate.toISOString();
                        const year = selectedDate.getFullYear();
                        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                        const day = String(selectedDate.getDate()).padStart(2, '0');
                        date = `${year}-${month}-${day}`;
                    }

                    const updatedFields = {
                        date: date,
                        timestamp: timestamp,
                        mood: wellbeingForm.mood !== '' ? parseInt(wellbeingForm.mood) : null,
                        energy: wellbeingForm.energy !== '' ? parseInt(wellbeingForm.energy) : null,
                        waterGlasses: wellbeingForm.waterGlasses,
                        exerciseType: (wellbeingForm.exerciseType || '').trim().toLowerCase() || null,
                        exerciseDuration: wellbeingForm.exerciseDuration !== '' ? parseInt(wellbeingForm.exerciseDuration) : null,
                        napDuration: wellbeingForm.napDuration !== '' ? parseInt(wellbeingForm.napDuration) : null,
                        social: wellbeingForm.social,
                        food: wellbeingForm.food,
                        emotions: wellbeingForm.emotions,
                        symptoms: (wellbeingForm.symptoms || []).map(s => s.trim().toLowerCase()).filter(Boolean),
                        customSymptom: sanitizeText((wellbeingForm.customSymptom || '').trim().toLowerCase()),
                        notes: sanitizeText(wellbeingForm.notes),
                        isAtypical: wellbeingForm.isAtypical || false,
                        atypicalReason: sanitizeText(wellbeingForm.atypicalReason || '')
                    };

                    if (editingWellbeingLog) {
                        await updateItem('wellbeingLogs', editingWellbeingLog.id, updatedFields);
                        setEditingWellbeingLog(null);
                    } else {
                        await addWellbeingLog({ id: genId(), ...updatedFields });
                    }
                    setWellbeingForm({ mood: '', energy: '', waterGlasses: 0, exerciseType: '',
                        exerciseDuration: '', napDuration: '', social: false, food: false, emotions: [], symptoms: [], customSymptom: '', notes: '', datetime: '', isAtypical: false, atypicalReason: '' });
                    setShowWellbeingModal(false);

                    // Reset wellbeing-consumption reminder so it can trigger again at next 2 consumptions
                    if (dismissReminder && !editingWellbeingLog) {
                        const dismissed = JSON.parse(localStorage.getItem('reminderDismissed') || '{}');
                        delete dismissed['wellbeing-consumption'];
                        localStorage.setItem('reminderDismissed', JSON.stringify(dismissed));
                    }

                    showToast(t('messages.wellbeingSaved'), 'success');
                } catch (error) {
                    logger.error('❌ ERRO COMPLETO:', error);
                    logger.error('❌ Mensagem:', error.message);
                    logger.error('❌ Stack:', error.stack);
                    showToast(t('messages.wellbeingSaveError'), 'error');
                }
            };

            const submitEmotions = async () => {
                try {
                    // Validate notes
                    const notesValidation = validateText(emotionsForm.notes, MAX_NOTE_LENGTH);
                    if (!notesValidation.valid) {
                        showToast('✗ ' + notesValidation.error, 'error');
                        return;
                    }

                    // Check if at least one emotion is selected
                    if (emotionsForm.emotions.length === 0) {
                        showToast(t('messages.emotionRequired'), 'error');
                        return;
                    }

                    // Parse datetime or use current timestamp
                    let timestamp = new Date().toISOString();
                    let date = getTodayKey();
                    if (emotionsForm.datetime) {
                        const selectedDate = new Date(emotionsForm.datetime);
                        timestamp = selectedDate.toISOString();
                        const year = selectedDate.getFullYear();
                        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                        const day = String(selectedDate.getDate()).padStart(2, '0');
                        date = `${year}-${month}-${day}`;
                    }

                    const item = {
                        id: genId(),
                        date: date,
                        timestamp: timestamp,
                        mood: null,
                        energy: null,
                        waterGlasses: 0,
                        exerciseType: '',
                        exerciseDuration: '',
                        social: false,
                        food: false,
                        emotions: emotionsForm.emotions,
                        notes: sanitizeText(emotionsForm.notes)
                    };
                    await addWellbeingLog(item);
                    setEmotionsForm({ datetime: '', emotions: [], notes: '' });
                    setShowEmotionsModal(false);
                    showToast(t('messages.emotionsSaved'), 'success');
                } catch (error) {
                    logger.error('❌ ERRO ao guardar emoções:', error);
                    showToast(t('messages.emotionsSaveError'), 'error');
                }
            };

            const submitReflection = async () => {
                try {
                    // Se reflectionDatetime estiver preenchido, usar essa data; senão usar hoje
                    let timestamp, dateKey;
                    if (reflectionDatetime) {
                        const selectedDate = new Date(reflectionDatetime);
                        timestamp = selectedDate.toISOString();
                        dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`;
                    } else {
                        timestamp = new Date().toISOString();
                        dateKey = getTodayKey();
                    }

                    if (editingReflection) {
                        await updateItem('reflections', editingReflection.id, { date: dateKey, timestamp, answer: reflectionAnswer });
                        setEditingReflection(null);
                    } else {
                        const item = { id: genId(), date: dateKey, timestamp, question: reflectionQuestion, answer: reflectionAnswer };
                        await addReflection(item);
                    }
                    setReflectionAnswer('');
                    setReflectionDatetime('');
                    setShowReflectionModal(false);
                    showToast(t('messages.reflectionSaved'), 'success');
                } catch (error) {
                    showToast(t('messages.reflectionSaveError'), 'error');
                    logger.error(error);
                }
            };

            const submitThoughts = async (thoughtsText) => {
                try {
                    // Validate and sanitize thoughts
                    const thoughtsValidation = validateText(thoughtsText, MAX_THOUGHT_LENGTH);
                    if (!thoughtsValidation.valid) {
                        showToast('✗ ' + thoughtsValidation.error, 'error');
                        return;
                    }

                    // Se thoughtDatetime estiver preenchido, usar essa data; senão usar hoje
                    let timestamp, dateKey;
                    if (thoughtDatetime) {
                        const selectedDate = new Date(thoughtDatetime);
                        timestamp = selectedDate.toISOString();
                        dateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`;
                    } else {
                        timestamp = new Date().toISOString();
                        dateKey = getTodayKey();
                    }

                    if (editingThought) {
                        await updateItem('thoughts', editingThought.id, { date: dateKey, timestamp, content: sanitizeText(thoughtsText) });
                        setEditingThought(null);
                        setThoughtInitialContent('');
                    } else {
                        const item = { id: genId(), date: dateKey, timestamp, content: sanitizeText(thoughtsText) };
                        await addThought(item);
                    }
                    setThoughtDatetime('');
                    setShowThoughtsModal(false);
                    showToast(t('messages.thoughtSaved'), 'success');
                } catch (error) {
                    showToast(t('messages.thoughtSaveError'), 'error');
                    logger.error(error);
                }
            };

const submitCycle = async () => {
                try {
                    if (editingCycle) {
                        // UPDATE: Atualizar ciclo existente
                        const sleepValueEdit = cycleForm.sleep && cycleForm.sleep !== '' ? parseFloat(cycleForm.sleep) : null;

                        const updatedData = {
                            bedtime: cycleForm.bedtime,
                            triggers: cycleForm.triggers,
                            notes: cycleForm.notes,
                            ...(sleepValueEdit !== null ? { sleep: sleepValueEdit } : {})
                        };
                        await updateCycle(editingCycle.id, updatedData);
                        setEditingCycle(null);
                        showToast(t('messages.cycleUpdated'), 'success');
                    } else {
                        // CREATE: Criar novo ciclo
                        // Se createdAt foi fornecido, usar esse; senão usar agora
                        const customDateTime = cycleForm.createdAt ? new Date(cycleForm.createdAt) : new Date();
                        const timestampISO = customDateTime.toISOString();
                        const dateKey = (() => { const d = new Date(timestampISO); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(); // YYYY-MM-DD local

                        const sleepValue = cycleForm.sleep && cycleForm.sleep !== '' ? parseFloat(cycleForm.sleep) : null;

                        const item = {
                            id: genId(),
                            timestamp: timestampISO,
                            date: dateKey,
                            bedtime: cycleForm.bedtime,
                            triggers: cycleForm.triggers,
                            notes: cycleForm.notes,
                            // Converter sleep para número (se tiver valor)
                            ...(sleepValue !== null ? { sleep: sleepValue } : {})
                        };
                        await addCycle(item);
                        showToast(t('messages.cycleCreated'), 'success');
                    }

                    setCycleForm({ bedtime: '', sleep: '', triggers: [], notes: '', createdAt: '' });
                    setShowCycleModal(false);
                } catch (error) {
                    showToast(t('messages.cycleError', { action: t(editingCycle ? 'messages.cycleActionUpdate' : 'messages.cycleActionCreate') }), 'error');
                    logger.error(error);
                }
            };

            const submitGoal = async () => {
                try {
                    const target = goalForm.type.includes('delay') || goalForm.type.includes('limit') || goalForm.type.includes('bedtime') ? goalForm.target : parseFloat(goalForm.target);

                    if (editingGoal) {
                        // Update existing goal
                        const updatedData = { type: goalForm.type, target };
                        await updateGoal(editingGoal.id, updatedData);
                        setEditingGoal(null);
                        showToast(t('messages.goalUpdated'), 'success');
                    } else {
                        // Check if goal of this type already exists
                        const existingGoal = goals.find(g => g.type === goalForm.type);

                        if (existingGoal) {
                            // Replace existing goal
                            const updatedData = { type: goalForm.type, target };
                            await updateGoal(existingGoal.id, updatedData);
                            showToast(t('messages.goalReplaced'), 'success');
                        } else {
                            // Create new goal
                            const item = { id: genId(), type: goalForm.type, target, createdAt: new Date().toISOString(), completed: false };
                            await addGoal(item);
                            showToast(t('messages.goalCreated'), 'success');
                        }
                    }

                    setGoalForm({ type: 'reduce_frequency', target: '', period: 'daily' });
                    setShowGoalModal(false);
                } catch (error) {
                    showToast(t('messages.goalError', { action: t(editingGoal ? 'messages.goalActionUpdate' : 'messages.goalActionCreate') }), 'error');
                    logger.error(error);
                }
            };

            // ===== 5. DATA PROCESSING & ANALYTICS =====
            // NOTE: All analytics metrics are now provided by MetricsContext (via useMetrics hook)
            // Available metrics: intervalStats, lastInterval, todayConsumptions, streaks,
            //                    temporalCorrelations, bidirectionalAnalysis, timeSinceLastConsumption,
            //                    last7Days, avgFrequencyLast7Days, getGoalProgress

            // Date range and filtering functions from analytics service
            const getDateRangeForPeriod = (period, offset = 0) => analyticsService.getDateRangeForPeriod(period, offset);
            const filterByDateRange = (items, dateRange, dateField = 'timestamp') => analyticsService.filterByDateRange(items, dateRange, dateField);
            const getPeriodLabel = (period, offset) => analyticsService.getPeriodLabel(period, offset);
            const excludeToday = (items, dateField = 'date') => analyticsService.excludeToday(items, dateField);

            // REMOVED: getLast7Days - now in MetricsContext as metrics.last7Days
            // REMOVED: getAvgFrequencyLast7Days - now in MetricsContext as metrics.avgFrequencyLast7Days
            // REMOVED: getGoalProgress - now in MetricsContext as metrics.getGoalProgress(goal)
            // REMOVED: getTimeSinceLastConsumption - now in MetricsContext as metrics.timeSinceLastConsumption

            // Export functions using new service
            const exportToCSV = () => {
                const allData = {
                    consumptions,
                    cycles,
                    dailyLogs,
                    wellbeingLogs,
                    reflections,
                    thoughts,
                    goals
                };
                const csvString = exportToCSVNew(allData);
                downloadCSV(csvString);
                showToast(t('messages.csvExported'), 'success');
            };

            const exportToJSON = () => {
                const allData = {
                    consumptions,
                    cycles,
                    dailyLogs,
                    wellbeingLogs,
                    reflections,
                    thoughts,
                    goals
                };
                const result = exportAndDownloadAll(allData);
                showToast(t('messages.backupCreated', { count: result.totalRecords }), 'success');
            };

            // Streak calculation
            // getStreaks() removed - using metrics.streaks from useAnalysis hook

            const todayCount = metrics.todayConsumptions.length;
            const currentCycle = cycles.length > 0 ? cycles[0] : null;
            const today = getTodayKey();
            const currentCycleCount = consumptions.filter(c => getDateKeyFromItem(c) === today).length;
            // ===== PRE-RENDER DATA PREPARATION =====
            const last7 = metrics.last7Days;
            const streaks = metrics.streaks;

            // Memoized coping strategies based on triggers
            const copingStrategies = useMemo(() => {
                const allTriggers = cycles.flatMap(c => c.triggers || []);
                const triggerCount = {};
                allTriggers.forEach(t => { triggerCount[t] = (triggerCount[t] || 0) + 1; });
                const topTriggers = Object.entries(triggerCount).sort((a,b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);

                const strategies = i18n.t('copingStrategiesDetailed', { returnObjects: true });

                if (topTriggers.length === 0) {
                    return i18n.t('defaultStrategies', { returnObjects: true });
                }

                const selectedStrategies = [];
                topTriggers.forEach(trigger => {
                    if (strategies[trigger]) {
                        selectedStrategies.push(...strategies[trigger].slice(0, 1));
                    }
                });

                return selectedStrategies.length > 0 ? selectedStrategies : strategies['Stress'];
            }, [cycles, i18n.language]);

            // Memoized positive daily feedback
            const positiveFeedback = useMemo(() => {
                const messages = [];

                // Check streak
                if (streaks.current >= 7) messages.push(t('feedback.streakHigh', { count: streaks.current }));
                else if (streaks.current >= 3) messages.push(t('feedback.streakMid', { count: streaks.current }));

                // Check interval quality
                if (consumptions.length >= 2) {
                    const lastIntervalData = metrics.lastInterval;
                    if (lastIntervalData && !lastIntervalData.isShort) {
                        messages.push(t('feedback.intervalGood', { hours: lastIntervalData.hours }));
                    }
                }

                // Check wellbeing completion
                if (wellbeingLogs.length > 0) {
                    const recent = wellbeingLogs[0];
                    const completedItems = [(recent.waterGlasses > 0 || recent.water), (recent.exerciseType || recent.exercise || recent.rest), recent.social, recent.food].filter(Boolean).length;
                    if (completedItems >= 3) messages.push(t('feedback.selfcareGood', { count: completedItems }));
                }

                // Check reduction trend
                if (dailyLogs.length >= 2) {
                    const last = dailyLogs[0];
                    const prev = dailyLogs[1];
                    if (last.times < prev.times) {
                        messages.push(t('feedback.progressVisible', { count: prev.times - last.times }));
                    }
                }

                // Default positive messages
                if (messages.length === 0) {
                    const defaults = [
                        '🌟 Cada registo é um passo importante',
                        '💜 Estás a cuidar de ti. Isso é o que importa',
                        '🌱 O progresso não é linear, e está tudo bem',
                        '✨ A tua presença aqui já é uma vitória'
                    ];
                    messages.push(defaults[Math.floor(Math.random() * defaults.length)]);
                }

                return messages[0];
            }, [streaks, consumptions, metrics.lastInterval, wellbeingLogs, dailyLogs]);

            // Render
            if (appError) return (
                <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
                        <h1 className="text-3xl font-bold text-red-600 mb-4">⚠️ Erro</h1>
                        <p className="text-gray-700 mb-4">Ocorreu um erro ao carregar a aplicação.</p>
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4 font-mono">{appError}</div>
                        <button
                            onClick={() => {window.location.reload();}}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium"
                        >
                            {t('feedback.reloadPage')}
                        </button>
                        <p className="text-xs text-gray-500 mt-4">{t('feedback.loadingError')}</p>
                    </div>
                </div>
            );

            if (dataLoading) return (<div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4"><div className="text-purple-600 text-xl">{t('feedback.loading')}</div></div>);

            // NOTE: Firebase auth check removed - now handled in HarmReductionTracker
            // AuthenticatedApp only renders when BOTH Firebase AND PIN are authenticated

            return (
                <div className='min-h-screen dark bg-gray-900 p-4 transition-colors pb-24 overflow-x-hidden'>
                    <div className="max-w-2xl mx-auto">
                        <div className='bg-gray-800 text-white rounded-3xl shadow-xl p-5 mb-6'>
                            <div className="flex justify-between items-center gap-8">
                                {/* Título - Esquerda */}
                                <div className="flex-1">
                                    <div className="space-y-0">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-black text-purple-600 leading-none">N</span>
                                            <span className='text-2xl font-light text-gray-300'>{t('home.acrosticN')}</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-black text-pink-600 leading-none">E</span>
                                            <span className='text-2xl font-light text-gray-300'>{t('home.acrosticE')}</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-5xl font-black text-blue-600 leading-none">P</span>
                                            <span className='text-2xl font-light text-gray-300'>{t('home.acrosticP')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Subtítulo e Slogan - Direita */}
                                <div className="flex flex-col items-end gap-3">
                                    <div className="text-right space-y-1">
                                        <p className='text-sm font-medium tracking-wide text-gray-400'>
                                            <span className="text-purple-600 font-bold">N</span>otice it. <span className="text-pink-600 font-bold">E</span>xplore it. <span className="text-blue-600 font-bold">P</span>lan it.
                                        </p>
                                        <p className='text-xs italic text-gray-500'>
                                            {t('home.motto').split(' ').map((word, i) => (
                                                <span key={i}>{i > 0 ? ' ' : ''}<span className={['text-purple-500','text-pink-500','text-blue-500'][i] || ''}>{word[0]}</span>{word.slice(1)}</span>
                                            ))}
                                        </p>
                                    </div>

                                    {streaks.current > 0 ? (
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-semibold shadow-sm">
                                            <span>🔥</span>
                                            <span>{streaks.current} {t('common.day', {count: streaks.current})}</span>
                                        </div>
                                    ) : streaks.max > 0 && (
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold shadow-sm">
                                            <span>💪</span>
                                            <span>{t('home.record')}: {streaks.max} {t('common.day', {count: streaks.max})}</span>
                                        </div>
                                    )}

                                    {/* Mensagem de Hoje - ABAIXO do streak */}
                                    <div className="text-right space-y-1">
                                        <p className='text-xs font-semibold text-purple-300'>
                                            💜 {t('home.dailyMessage')}
                                        </p>
                                        <p className='text-xs italic max-w-xs text-white'>
                                            {currentReflection}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className='bg-gray-800/50 rounded-3xl shadow-xl p-6 mb-6'>
                            {currentView === 'home' && (
                                <HomeViewRefactored
                                    currentReflection={currentReflection}
                                    markConsumption={markConsumption}
                                    openEditConsumption={openEditConsumption}
                                    deleteItem={deleteItem}
                                    last7={last7}
                                    copingStrategies={copingStrategies}
                                    currentCycleCount={currentCycleCount}
                                    consumptionsToShow={consumptionsToShow}
                                    setConsumptionsToShow={setConsumptionsToShow}
                                    showToast={showToast}
                                />
                            )}
                            {currentView === 'patterns' && (
                                <Suspense fallback={<div className="text-center py-8">{t('messages.loadingView')}</div>}>
                                    <PatternsView
                                        patternsPeriod={patternsPeriod}
                                        setPatternsPeriod={setPatternsPeriod}
                                        patternsPeriodOffset={patternsPeriodOffset}
                                        setPatternsPeriodOffset={setPatternsPeriodOffset}
                                        patternView={patternView}
                                        setPatternView={setPatternView}
                                    />
                                </Suspense>
                            )}
                            {currentView === 'analyses' && (
                                <Suspense fallback={<div className="text-center py-8">{t('messages.loadingView')}</div>}>
                                    <AnalysesView
                                        analysisSubView={analysisSubView}
                                        setAnalysisSubView={setAnalysisSubView}
                                        patternsPeriod={patternsPeriod}
                                        setPatternsPeriod={setPatternsPeriod}
                                        patternsPeriodOffset={patternsPeriodOffset}
                                        setPatternsPeriodOffset={setPatternsPeriodOffset}
                                    />
                                </Suspense>
                            )}
                            {currentView === 'history' && (
                                <Suspense fallback={<div className="text-center py-8">{t('messages.loadingView')}</div>}>
                                    <HistoryView
                                        historyPeriod={historyPeriod}
                                        setHistoryPeriod={setHistoryPeriod}
                                        historyPeriodOffset={historyPeriodOffset}
                                        setHistoryPeriodOffset={setHistoryPeriodOffset}
                                        historyTopic={historyTopic}
                                        setHistoryTopic={setHistoryTopic}
                                        reflectionsToShow={reflectionsToShow}
                                        setReflectionsToShow={setReflectionsToShow}
                                        wellbeingToShow={wellbeingToShow}
                                        setWellbeingToShow={setWellbeingToShow}
                                        cyclesHistoryToShow={cyclesHistoryToShow}
                                        setCyclesHistoryToShow={setCyclesHistoryToShow}
                                        thoughtsToShow={thoughtsToShow}
                                        setThoughtsToShow={setThoughtsToShow}
                                        allItemsToShow={allItemsToShow}
                                        setAllItemsToShow={setAllItemsToShow}
                                        openEditConsumption={openEditConsumption}
                                        openEditCycle={openEditCycle}
                                        openEditDailyLog={openEditDailyLog}
                                        openEditWellbeingLog={openEditWellbeingLog}
                                        openEditReflection={openEditReflection}
                                        openEditThought={openEditThought}
                                        deleteItem={deleteItem}
                                        handleFillGap={handleFillGap}
                                    />
                                </Suspense>
                            )}
                            {currentView === 'settings' && (
                                <Suspense fallback={<div className="text-center p-8">{t('messages.loadingView')}</div>}>
                                    <SettingsView
                                        user={user}
                                        handleLogout={handleLogout}
                                        notificationsEnabled={notificationsEnabled}
                                        requestNotificationPermission={requestNotificationPermission}
                                        onForceSync={forcePushAll}
                                        isSyncing={isSyncing}
                                        lastSyncTime={lastSyncTime}
                                        onOpenExport={() => setShowExportModal(true)}
                                        onExportJSON={exportToJSON}
                                        onOpenLegalDoc={(docType) => {
                                            setLegalDocType(docType);
                                            setShowLegalModal(true);
                                        }}
                                    />
                                </Suspense>
                            )}

                        </div>

                        {/* Modals - Lazy loaded with Suspense */}
                        <Suspense fallback={null}>
                            <DailyLogModal
                                isOpen={showDailyLogModal}
                                onClose={() => { setShowDailyLogModal(false); setEditingDailyLog(null); }}
                                dailyForm={dailyForm}
                                setDailyForm={setDailyForm}
                                onSubmit={submitDailyLog}
                            />
                        </Suspense>

                        <Suspense fallback={null}>
                            <WellbeingModal
                                isOpen={showWellbeingModal}
                                onClose={() => { setShowWellbeingModal(false); setEditingWellbeingLog(null); }}
                                wellbeingForm={wellbeingForm}
                                setWellbeingForm={setWellbeingForm}
                                onSubmit={submitWellbeing}
                                wellbeingLogs={wellbeingLogs}
                                editingId={editingWellbeingLog ? editingWellbeingLog.id : null}
                            />
                        </Suspense>

                        <Suspense fallback={null}>
                            <EmotionsModal
                                isOpen={showEmotionsModal}
                                onClose={() => setShowEmotionsModal(false)}
                                emotionsForm={emotionsForm}
                                setEmotionsForm={setEmotionsForm}
                                onSubmit={submitEmotions}
                            />
                        </Suspense>

                        <Suspense fallback={null}>
                            <ReflectionModal
                                isOpen={showReflectionModal}
                                onClose={() => { setShowReflectionModal(false); setEditingReflection(null); }}
                                currentDbtQuestion={reflectionQuestion}
                                reflectionAnswer={reflectionAnswer}
                                setReflectionAnswer={setReflectionAnswer}
                                reflectionDatetime={reflectionDatetime}
                                setReflectionDatetime={setReflectionDatetime}
                                onSubmit={submitReflection}
                            />
                        </Suspense>

                        <Suspense fallback={null}>
                            <CycleModal
                                isOpen={showCycleModal}
                                onClose={() => { setShowCycleModal(false); setEditingCycle(null); }}
                                editingCycle={editingCycle}
                                cycleForm={cycleForm}
                                setCycleForm={setCycleForm}
                                onSubmit={submitCycle}
                            />
                        </Suspense>

                        <Suspense fallback={null}>
                            <GoalModal
                                isOpen={showGoalModal}
                                onClose={() => { setShowGoalModal(false); setEditingGoal(null); }}
                                editingGoal={editingGoal}
                                goalForm={goalForm}
                                setGoalForm={setGoalForm}
                                onSubmit={submitGoal}
                            />
                        </Suspense>

                        <Suspense fallback={null}>
                            <EditConsumptionModal
                                isOpen={showEditConsumptionModal}
                                onClose={() => setShowEditConsumptionModal(false)}
                                editingConsumption={editingConsumption}
                                setEditingConsumption={setEditingConsumption}
                                onSubmit={saveEditedConsumption}
                                safeDate={safeDate}
                            />
                        </Suspense>

                        <Suspense fallback={null}>
                            <ThoughtsModal
                                isOpen={showThoughtsModal}
                                onClose={() => { setShowThoughtsModal(false); setEditingThought(null); setThoughtInitialContent(''); }}
                                thoughtDatetime={thoughtDatetime}
                                setThoughtDatetime={setThoughtDatetime}
                                onSubmit={submitThoughts}
                                initialContent={thoughtInitialContent}
                            />
                        </Suspense>

                        <Suspense fallback={null}>
                            <LegalModal
                                isOpen={showLegalModal}
                                onClose={() => setShowLegalModal(false)}
                                documentType={legalDocType}
                            />
                        </Suspense>

                        <Suspense fallback={null}>
                            <ExportModal
                                isOpen={showExportModal}
                                onClose={() => setShowExportModal(false)}
                            />
                        </Suspense>

                        <div className='bg-gray-800 fixed bottom-0 left-0 right-0 shadow-xl rounded-t-3xl pt-3 px-3 z-50' style={{paddingBottom:'max(12px, env(safe-area-inset-bottom))'}}>
                            <div className="max-w-2xl mx-auto">
                                <div className="grid grid-cols-5 gap-1">
                                    <button onClick={() => setCurrentView('home')} className={'p-2 rounded-xl transition-colors flex flex-col items-center ' + (currentView === 'home' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>
                                        <Icons.Heart className="w-5 h-5" />
                                                        <div className="text-xs font-medium mt-1">{t('nav.home')}</div>
                                    </button>
                                    <button onClick={() => setCurrentView('patterns')} className={'p-2 rounded-xl transition-colors flex flex-col items-center ' + (currentView === 'patterns' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>
                                        <Icons.BarChart3 className="w-5 h-5" />
                                        <div className="text-xs font-medium mt-1">{t('nav.patterns')}</div>
                                    </button>
                                    <button onClick={() => setCurrentView('analyses')} className={'p-2 rounded-xl transition-colors flex flex-col items-center ' + (currentView === 'analyses' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>
                                        <Icons.Activity className="w-5 h-5" />
                                        <div className="text-xs font-medium mt-1">{t('nav.analyses')}</div>
                                    </button>
                                    <button onClick={() => setCurrentView('history')} className={'p-2 rounded-xl transition-colors flex flex-col items-center ' + (currentView === 'history' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>
                                        <Icons.BookOpen className="w-5 h-5" />
                                        <div className="text-xs font-medium mt-1">{t('nav.history')}</div>
                                    </button>
                                    <button onClick={() => setCurrentView('settings')} className={'p-2 rounded-xl transition-colors flex flex-col items-center ' + (currentView === 'settings' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')}>
                                        <Icons.Settings className="w-5 h-5" />
                                        <div className="text-xs font-medium mt-1">{t('nav.settings')}</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Toast Notifications */}
                    <div className="fixed bottom-20 left-0 right-0 flex flex-col items-center gap-2 px-4 pointer-events-none z-50">
                        {toasts.map(toast => (
                            <div key={toast.id} className={'px-4 py-3 rounded-lg shadow-lg font-medium text-sm pointer-events-auto transform transition-all ' + (toast.type === 'success' ? 'bg-green-500 text-white' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white')}>
                                {toast.message}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

export default HarmReductionTracker;
