import React, { useState, useEffect, useMemo, lazy, Suspense, useRef } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { dbtQuestions, reflectiveQuestions } from './data/constants';
import { getTodayKey, genId, safeDate, safeToISODate } from './utils/helpers';
import * as analyticsService from './services/analyticsService';
import * as Icons from './components/Icons';
import { useData } from './contexts/DataContext';
import { useUI } from './contexts/UIContext';
import { useToast } from './hooks/useToast';
import { useAuth } from './hooks/useAuth';
import { useReminders } from './hooks/useReminders';
import { validateMoodEnergy, validateText, sanitizeText, MAX_NOTE_LENGTH, MAX_THOUGHT_LENGTH } from './utils/validation';
import { themeClasses } from './utils/classNames';

// Lazy load Views
const SettingsView = lazy(() => import('./views/SettingsView').then(module => ({ default: module.SettingsView })));
import { HomeView } from './views/HomeView';
import { HistoryView } from './views/HistoryView';
import { PatternsView } from './views/PatternsView';
import { AnalysesView } from './views/AnalysesView';

// Lazy load Modals
const DailyLogModal = lazy(() => import('./components/modals/DailyLogModal').then(module => ({ default: module.DailyLogModal })));
const WellbeingModal = lazy(() => import('./components/modals/WellbeingModal').then(module => ({ default: module.WellbeingModal })));
const ReflectionModal = lazy(() => import('./components/modals/ReflectionModal').then(module => ({ default: module.ReflectionModal })));
const CycleModal = lazy(() => import('./components/modals/CycleModal').then(module => ({ default: module.CycleModal })));
const GoalModal = lazy(() => import('./components/modals/GoalModal').then(module => ({ default: module.GoalModal })));
const EditConsumptionModal = lazy(() => import('./components/modals/EditConsumptionModal').then(module => ({ default: module.EditConsumptionModal })));
const ThoughtsModal = lazy(() => import('./components/modals/ThoughtsModal').then(module => ({ default: module.ThoughtsModal })));
const LegalModal = lazy(() => import('./components/modals/LegalModal').then(module => ({ default: module.LegalModal })));

function HarmReductionTracker() {
    // ===== STATE MANAGEMENT =====
    const {
        auth, db, user, loading: dataLoading,
        consumptions, dailyLogs, reflections, wellbeingLogs, cycles, goals,
        addConsumption, addDailyLog, addReflection, addWellbeingLog,
        addCycle, updateCycle, addGoal, updateGoal, addThought
    } = useData();

    const {
        darkMode,
        showDailyLogModal, setShowDailyLogModal,
        showWellbeingModal, setShowWellbeingModal,
        showReflectionModal, setShowReflectionModal,
        showCycleModal, setShowCycleModal,
        showGoalModal, setShowGoalModal,
        showEditConsumptionModal, setShowEditConsumptionModal,
        showThoughtsModal, setShowThoughtsModal,
        editingConsumption, setEditingConsumption,
        editingGoal, setEditingGoal
    } = useUI();

    // Custom Hooks
    const { toasts, showToast } = useToast();
    const { isLogin, setIsLogin, email, setEmail, password, setPassword, authError, handleAuth, handleLogout } = useAuth(auth);
    const { notificationsEnabled, requestNotificationPermission } = useReminders(user, wellbeingLogs, consumptions, cycles, showToast);

    // App State
    const [appError, setAppError] = useState(null);
    const hasAutoAssociatedRef = useRef(false);
    const [currentView, setCurrentView] = useState('home');

    // Legal Modal State
    const [showLegalModal, setShowLegalModal] = useState(false);
    const [legalDocType, setLegalDocType] = useState(null);

    // Form States (Consider moving to context or local to modals in future refactor)
    const [dailyForm, setDailyForm] = useState({ mg: 30, notes: '' });
    const [wellbeingForm, setWellbeingForm] = useState({ mood: '', energy: '', water: false, rest: false, social: false, food: false, emotions: [], notes: '' });
    const [reflectionAnswer, setReflectionAnswer] = useState('');
    const [cycleForm, setCycleForm] = useState({ bedtime: '', sleep: '', triggers: [], notes: '', lastBefore00: false, mg: '' });
    const [goalForm, setGoalForm] = useState({ type: 'reduce_frequency', target: '', period: 'daily' });

    // ===== EFFECTS & HELPERS =====

    // Error Handling
    useEffect(() => {
        const handleError = (event) => {
            console.error('Global error:', event.error);
            setAppError(event.error?.message || 'Erro desconhecido');
        };
        const handleUnhandledRejection = (event) => {
            console.error('Unhandled rejection:', event.reason);
            setAppError(event.reason?.message || 'Erro desconhecido');
        };
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    // Dark Mode Body Class
    useEffect(() => {
        document.body.classList.add('dark');
    }, []);

    // Cycle Association Logic
    useEffect(() => {
        if (!user || !db || cycles.length === 0 || consumptions.length === 0) return;

        const dataKey = `${cycles.map(c => c.id).join(',')}-${consumptions.map(c => c.id + c.cycleId).join(',')}`;
        if (hasAutoAssociatedRef.current === dataKey) return;

        hasAutoAssociatedRef.current = dataKey;

        const sortedCycles = [...cycles].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        const getCycleStartTimestamp = (cycle) => {
            if (!cycle.bedtime) return cycle.timestamp;
            const cycleDate = new Date(cycle.timestamp);
            const [hours, minutes] = cycle.bedtime.split(':').map(Number);
            const bedtimeDate = new Date(cycleDate);
            bedtimeDate.setHours(hours, minutes, 0, 0);
            if (bedtimeDate > cycleDate) {
                bedtimeDate.setDate(bedtimeDate.getDate() - 1);
            }
            return bedtimeDate.toISOString();
        };

        (async () => {
            for (const consumption of consumptions) {
                let assignedCycleId = null;
                for (let i = 0; i < sortedCycles.length; i++) {
                    const cycle = sortedCycles[i];
                    const nextCycle = i < sortedCycles.length - 1 ? sortedCycles[i + 1] : null;
                    const cycleStart = getCycleStartTimestamp(cycle);
                    const nextCycleStart = nextCycle ? getCycleStartTimestamp(nextCycle) : null;
                    const isAfterCycleStart = consumption.timestamp >= cycleStart;
                    const isBeforeNextCycle = !nextCycleStart || consumption.timestamp < nextCycleStart;

                    if (isAfterCycleStart && isBeforeNextCycle) {
                        assignedCycleId = cycle.id;
                        break;
                    }
                }
                if (!assignedCycleId) assignedCycleId = sortedCycles[0].id;
                if (consumption.cycleId !== assignedCycleId) {
                    await addConsumption({ ...consumption, cycleId: assignedCycleId });
                }
            }
        })();
    }, [user, db, cycles, consumptions]);

    // Derived Data for UI
    const getCurrentCycleIndex = () => cycles.length === 0 ? 0 : cycles.length - 1;
    const getCurrentCycleId = () => cycles.length === 0 ? null : cycles[0].id;

    const currentDbtQuestion = useMemo(() => {
        const cycleIndex = getCurrentCycleIndex();
        return dbtQuestions[cycleIndex % dbtQuestions.length];
    }, [cycles.length]);

    const currentReflection = useMemo(() => {
        const cycleIndex = getCurrentCycleIndex();
        return reflectiveQuestions[cycleIndex % reflectiveQuestions.length];
    }, [cycles.length]);

    // Header Streaks Logic (duplicated from HomeView but needed for Header)
    const streaks = useMemo(() => {
        if (consumptions.length === 0 && wellbeingLogs.length === 0) return { current: 0, max: 0 };
        const allDates = [...new Set([...consumptions.map(c => c.date), ...wellbeingLogs.map(w => w.date)])].sort();
        const today = getTodayKey();
        let currentStreak = 0;
        let maxStreak = 1;
        let streak = 1;

        for (let i = 1; i < allDates.length; i++) {
            const prev = new Date(allDates[i-1]);
            const curr = new Date(allDates[i]);
            const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);
            if (diffDays === 1) {
                streak++;
                maxStreak = Math.max(maxStreak, streak);
            } else {
                streak = 1;
            }
        }

        if (allDates.includes(today)) {
            currentStreak = 1;
            let checkDate = new Date(today);
            for (let i = allDates.length - 2; i >= 0; i--) {
                checkDate.setDate(checkDate.getDate() - 1);
                const checkKey = checkDate.toISOString().split('T')[0];
                if (allDates[i] === checkKey) currentStreak++;
                else break;
            }
        }
        return { current: currentStreak, max: maxStreak };
    }, [consumptions, wellbeingLogs]);

    // ===== ACTIONS & HANDLERS =====

    const deleteItem = async (collectionName, id) => {
        if (!user || !db) return;
        const itemNames = { 'consumptions': 'este consumo', 'reflections': 'esta reflexão', 'wellbeingLogs': 'este registo de bem-estar', 'dailyLogs': 'este registo diário', 'cycles': 'este ciclo', 'goals': 'esta meta', 'thoughts': 'este pensamento' };
        const itemName = itemNames[collectionName] || 'este item';
        if (!window.confirm(`Tens a certeza que queres apagar ${itemName}? Esta ação não pode ser desfeita.`)) return;
        try {
            await deleteDoc(doc(db, `users/${user.uid}/${collectionName}`, id));
            showToast('✓ Item apagado', 'success');
        } catch (error) {
            showToast('✗ Erro ao apagar item', 'error');
            console.error('Erro ao apagar:', error);
        }
    };

    const openEditConsumption = (consumption) => { setEditingConsumption({...consumption}); setShowEditConsumptionModal(true); };

    const saveEditedConsumption = async () => {
        if (!editingConsumption) return;
        try {
            await addConsumption(editingConsumption);
            setShowEditConsumptionModal(false);
            setEditingConsumption(null);
            showToast('✓ Consumo editado', 'success');
        } catch (error) {
            showToast('✗ Erro ao editar consumo', 'error');
        }
    };

    const submitDailyLog = async () => {
        try {
            const currentCycle = getCurrentCycleId();
            const todayConsumptions = consumptions.filter(c => c.date === getTodayKey()).length;
            const item = { id: genId(), date: getTodayKey(), timestamp: new Date().toISOString(), cycleId: currentCycle, times: todayConsumptions, mg: parseInt(dailyForm.mg), notes: dailyForm.notes };
            await addDailyLog(item);
            setDailyForm({ mg: 30, notes: '' });
            setShowDailyLogModal(false);
            showToast('✓ Registo diário guardado', 'success');
        } catch (error) {
            showToast('✗ Erro ao guardar registo', 'error');
        }
    };

    const submitWellbeing = async () => {
        try {
            if (wellbeingForm.mood !== '') {
                const moodValidation = validateMoodEnergy(wellbeingForm.mood);
                if (!moodValidation.valid) { showToast('✗ ' + moodValidation.error, 'error'); return; }
            }
            if (wellbeingForm.energy !== '') {
                const energyValidation = validateMoodEnergy(wellbeingForm.energy);
                if (!energyValidation.valid) { showToast('✗ ' + energyValidation.error, 'error'); return; }
            }
            const notesValidation = validateText(wellbeingForm.notes, MAX_NOTE_LENGTH);
            if (!notesValidation.valid) { showToast('✗ ' + notesValidation.error, 'error'); return; }

            const currentCycle = getCurrentCycleId();
            const item = {
                id: genId(), date: getTodayKey(), timestamp: new Date().toISOString(), cycleId: currentCycle,
                mood: wellbeingForm.mood !== '' ? parseInt(wellbeingForm.mood) : null,
                energy: wellbeingForm.energy !== '' ? parseInt(wellbeingForm.energy) : null,
                water: wellbeingForm.water, rest: wellbeingForm.rest, social: wellbeingForm.social, food: wellbeingForm.food,
                emotions: wellbeingForm.emotions, notes: sanitizeText(wellbeingForm.notes)
            };
            await addWellbeingLog(item);
            setWellbeingForm({ mood: '', energy: '', water: false, rest: false, social: false, food: false, emotions: [], notes: '' });
            setShowWellbeingModal(false);
            showToast('✓ Bem-estar guardado', 'success');
        } catch (error) {
            showToast('✗ Erro ao guardar bem-estar', 'error');
        }
    };

    const submitReflection = async () => {
        try {
            const item = { id: genId(), date: getTodayKey(), timestamp: new Date().toISOString(), question: currentDbtQuestion, answer: reflectionAnswer };
            await addReflection(item);
            setReflectionAnswer('');
            setShowReflectionModal(false);
            showToast('✓ Reflexão guardada', 'success');
        } catch (error) {
            showToast('✗ Erro ao guardar reflexão', 'error');
        }
    };

    const submitThoughts = async (thoughtsText) => {
        try {
            const thoughtsValidation = validateText(thoughtsText, MAX_THOUGHT_LENGTH);
            if (!thoughtsValidation.valid) { showToast('✗ ' + thoughtsValidation.error, 'error'); return; }
            const currentCycle = getCurrentCycleId();
            const item = { id: genId(), date: getTodayKey(), timestamp: new Date().toISOString(), cycleId: currentCycle, content: sanitizeText(thoughtsText) };
            await addThought(item);
            setShowThoughtsModal(false);
            showToast('✓ Pensamento guardado no diário', 'success');
        } catch (error) {
            showToast('✗ Erro ao guardar pensamento', 'error');
        }
    };

    const submitCycle = async () => {
        try {
            const item = {
                id: genId(), timestamp: new Date().toISOString(), date: getTodayKey(),
                bedtime: cycleForm.bedtime, triggers: cycleForm.triggers, notes: cycleForm.notes, lastBefore00: cycleForm.lastBefore00,
                ...(cycleForm.mg && cycleForm.mg !== '' ? { mg: parseFloat(cycleForm.mg) } : {}),
                ...(cycleForm.sleep && cycleForm.sleep !== '' ? { sleep: parseFloat(cycleForm.sleep) } : {})
            };
            await addCycle(item);
            setCycleForm({ bedtime: '', sleep: '', triggers: [], notes: '', lastBefore00: false, mg: '' });
            setShowCycleModal(false);
            showToast('✓ Novo ciclo criado', 'success');
        } catch (error) {
            showToast('✗ Erro ao criar ciclo', 'error');
        }
    };

    const submitGoal = async () => {
        try {
            const target = goalForm.type.includes('delay') || goalForm.type.includes('limit') || goalForm.type.includes('bedtime') ? goalForm.target : parseFloat(goalForm.target);
            if (editingGoal) {
                await updateGoal(editingGoal.id, { type: goalForm.type, target });
                setEditingGoal(null);
                showToast('✓ Meta atualizada', 'success');
            } else {
                const existingGoal = goals.find(g => g.type === goalForm.type);
                if (existingGoal) {
                    await updateGoal(existingGoal.id, { type: goalForm.type, target });
                    showToast('✓ Meta substituída', 'success');
                } else {
                    await addGoal({ id: genId(), type: goalForm.type, target, createdAt: new Date().toISOString(), completed: false });
                    showToast('✓ Meta criada', 'success');
                }
            }
            setGoalForm({ type: 'reduce_frequency', target: '', period: 'daily' });
            setShowGoalModal(false);
        } catch (error) {
            showToast('✗ Erro ao salvar meta', 'error');
        }
    };

    const exportToCSV = () => {
        const headers = ['Data', 'Hora', 'Tipo', 'Detalhes'];
        const rows = [
            ...consumptions.map(c => [new Date(c.timestamp).toLocaleDateString('pt-PT'), new Date(c.timestamp).toLocaleTimeString('pt-PT'), 'Consumo', c.notes || '']),
            ...dailyLogs.map(l => [l.date, '', 'Dosagem', l.times + 'x, ' + l.mg + 'mg' + (l.notes ? ', ' + l.notes : '')]),
            ...wellbeingLogs.map(w => [w.date, '', 'Bem-estar', 'Sono: ' + w.sleep + '/10, Humor: ' + w.mood + '/10'])
        ];
        const csv = [headers, ...rows].map(row => row.map(cell => '"' + cell + '"').join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reducao-danos-' + getTodayKey() + '.csv';
        a.click();
    };

    // ===== RENDER =====

    if (appError) return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
                <h1 className="text-3xl font-bold text-red-600 mb-4">⚠️ Erro</h1>
                <p className="text-gray-700 mb-4">Ocorreu um erro ao carregar a aplicação.</p>
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4 font-mono">{appError}</div>
                <button onClick={() => window.location.reload()} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium">Recarregar Página</button>
            </div>
        </div>
    );

    if (dataLoading) return (<div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4"><div className="text-purple-600 text-xl">A carregar... 🔄</div></div>);

    // Auth Screen
    if (!user) return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">NEP App</h1>
                <p className="text-gray-600 mb-6">Sincroniza entre dispositivos 💜</p>
                <form onSubmit={handleAuth} className="space-y-4">
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400" required />
                    <input type="password" placeholder="Password (mínimo 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400" required />
                    {authError && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{authError}</div>}
                    {!isLogin && (
                        <div className="bg-purple-50 p-3 rounded-lg text-xs text-purple-900">
                            <p className="mb-2">Ao criar conta, concordas com os <button type="button" onClick={() => { setLegalDocType('terms'); setShowLegalModal(true); }} className="text-purple-600 font-semibold hover:underline">Termos de Uso</button>.</p>
                        </div>
                    )}
                    <button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium">{isLogin ? 'Entrar' : 'Criar Conta'}</button>
                    <button type="button" onClick={() => setIsLogin(!isLogin)} className="w-full text-purple-600 text-sm hover:underline">{isLogin ? 'Criar conta nova' : 'Já tenho conta'}</button>
                </form>
                <p className="text-xs text-gray-500 mt-6">💡 Usa o mesmo email e password no PC e telemóvel para sincronizar</p>
            </div>
            <Suspense fallback={null}>
                <LegalModal isOpen={showLegalModal} onClose={() => setShowLegalModal(false)} darkMode={false} documentType={legalDocType} />
            </Suspense>
        </div>
    );

    return (
        <div className={'min-h-screen ' + (darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50') + ' p-4 transition-colors pb-24'}>
            <div className="max-w-2xl mx-auto">
                {/* HEADER */}
                <div className={(darkMode ? 'bg-gray-800 text-white' : 'bg-white') + ' rounded-3xl shadow-xl p-8 mb-6'}>
                    <div className="flex justify-between items-center gap-8">
                        <div className="flex-1">
                            <div className="space-y-1">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-purple-600 leading-none">N</span>
                                    <span className={'text-2xl font-light ' + (themeClasses.textSecondary(darkMode))}>otas de</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-pink-600 leading-none">E</span>
                                    <span className={'text-2xl font-light ' + (themeClasses.textSecondary(darkMode))}>xperiências e</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-blue-600 leading-none">P</span>
                                    <span className={'text-2xl font-light ' + (themeClasses.textSecondary(darkMode))}>adrões</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            <div className="text-right space-y-1">
                                <p className={'text-sm font-medium tracking-wide ' + (themeClasses.textTertiary(darkMode))}>
                                    <span className="text-purple-600 font-bold">N</span>otice it. <span className="text-pink-600 font-bold">E</span>xplore it. <span className="text-blue-600 font-bold">P</span>lan it.
                                </p>
                                <p className={'text-xs italic ' + (darkMode ? 'text-gray-500' : 'text-gray-500')}>
                                    <span className="text-purple-500">N</span>ão <span className="text-pink-500">E</span>stás <span className="text-blue-500">P</span>erdida.
                                </p>
                            </div>
                            {streaks.current > 0 ? (
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-semibold shadow-sm">
                                    <span>🔥</span>
                                    <span>{streaks.current} {streaks.current === 1 ? 'dia' : 'dias'}</span>
                                </div>
                            ) : streaks.max > 0 && (
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold shadow-sm">
                                    <span>💪</span>
                                    <span>Recorde: {streaks.max} {streaks.max === 1 ? 'dia' : 'dias'}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className={(darkMode ? 'bg-gray-800/50' : 'bg-white') + ' rounded-3xl shadow-xl p-6 mb-6'}>
                    {currentView === 'home' && (
                        <HomeView
                            currentReflection={currentReflection}
                            openEditConsumption={openEditConsumption}
                            deleteItem={deleteItem}
                        />
                    )}
                    {currentView === 'patterns' && <PatternsView />}
                    {currentView === 'analyses' && <AnalysesView />}
                    {currentView === 'history' && (
                        <HistoryView
                            deleteItem={deleteItem}
                            openEditConsumption={openEditConsumption}
                        />
                    )}
                    {currentView === 'settings' && (
                        <Suspense fallback={<div className="text-center p-8">Carregando...</div>}>
                            <SettingsView
                                darkMode={darkMode}
                                user={user}
                                handleLogout={handleLogout}
                                exportToCSV={exportToCSV}
                                notificationsEnabled={notificationsEnabled}
                                requestNotificationPermission={requestNotificationPermission}
                                onOpenLegalDoc={(docType) => {
                                    setLegalDocType(docType);
                                    setShowLegalModal(true);
                                }}
                            />
                        </Suspense>
                    )}
                </div>

                {/* MODALS */}
                <Suspense fallback={null}>
                    <DailyLogModal isOpen={showDailyLogModal} onClose={() => setShowDailyLogModal(false)} darkMode={darkMode} dailyForm={dailyForm} setDailyForm={setDailyForm} onSubmit={submitDailyLog} />
                </Suspense>
                <Suspense fallback={null}>
                    <WellbeingModal isOpen={showWellbeingModal} onClose={() => setShowWellbeingModal(false)} darkMode={darkMode} wellbeingForm={wellbeingForm} setWellbeingForm={setWellbeingForm} onSubmit={submitWellbeing} wellbeingLogs={wellbeingLogs} currentCycleId={getCurrentCycleId()} />
                </Suspense>
                <Suspense fallback={null}>
                    <ReflectionModal isOpen={showReflectionModal} onClose={() => setShowReflectionModal(false)} darkMode={darkMode} currentDbtQuestion={currentDbtQuestion} reflectionAnswer={reflectionAnswer} setReflectionAnswer={setReflectionAnswer} onSubmit={submitReflection} />
                </Suspense>
                <Suspense fallback={null}>
                    <CycleModal isOpen={showCycleModal} onClose={() => setShowCycleModal(false)} darkMode={darkMode} cycleForm={cycleForm} setCycleForm={setCycleForm} onSubmit={submitCycle} />
                </Suspense>
                <Suspense fallback={null}>
                    <GoalModal isOpen={showGoalModal} onClose={() => { setShowGoalModal(false); setEditingGoal(null); }} darkMode={darkMode} editingGoal={editingGoal} goalForm={goalForm} setGoalForm={setGoalForm} onSubmit={submitGoal} />
                </Suspense>
                <Suspense fallback={null}>
                    <EditConsumptionModal isOpen={showEditConsumptionModal} onClose={() => setShowEditConsumptionModal(false)} darkMode={darkMode} editingConsumption={editingConsumption} setEditingConsumption={setEditingConsumption} onSubmit={saveEditedConsumption} safeDate={safeDate} />
                </Suspense>
                <Suspense fallback={null}>
                    <ThoughtsModal isOpen={showThoughtsModal} onClose={() => setShowThoughtsModal(false)} darkMode={darkMode} onSubmit={submitThoughts} />
                </Suspense>
                <Suspense fallback={null}>
                    <LegalModal isOpen={showLegalModal} onClose={() => setShowLegalModal(false)} darkMode={darkMode} documentType={legalDocType} />
                </Suspense>

                {/* BOTTOM NAVIGATION */}
                <div className={(darkMode ? 'bg-gray-800' : 'bg-white') + ' fixed bottom-0 left-0 right-0 shadow-xl rounded-t-3xl p-4'}>
                    <div className="max-w-2xl mx-auto">
                        <div className="grid grid-cols-5 gap-1">
                            <button onClick={() => setCurrentView('home')} className={'p-2 rounded-xl transition-colors flex flex-col items-center ' + (currentView === 'home' ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                <Icons.Heart className="w-5 h-5" />
                                <div className="text-xs font-medium mt-1">Início</div>
                            </button>
                            <button onClick={() => setCurrentView('patterns')} className={'p-2 rounded-xl transition-colors flex flex-col items-center ' + (currentView === 'patterns' ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                <Icons.BarChart3 className="w-5 h-5" />
                                <div className="text-xs font-medium mt-1">Padrões</div>
                            </button>
                            <button onClick={() => setCurrentView('analyses')} className={'p-2 rounded-xl transition-colors flex flex-col items-center ' + (currentView === 'analyses' ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                <Icons.Activity className="w-5 h-5" />
                                <div className="text-xs font-medium mt-1">Análises</div>
                            </button>
                            <button onClick={() => setCurrentView('history')} className={'p-2 rounded-xl transition-colors flex flex-col items-center ' + (currentView === 'history' ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                <Icons.BookOpen className="w-5 h-5" />
                                <div className="text-xs font-medium mt-1">Histórico</div>
                            </button>
                            <button onClick={() => setCurrentView('settings')} className={'p-2 rounded-xl transition-colors flex flex-col items-center ' + (currentView === 'settings' ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                <Icons.Settings className="w-5 h-5" />
                                <div className="text-xs font-medium mt-1">Config</div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* TOASTS */}
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
