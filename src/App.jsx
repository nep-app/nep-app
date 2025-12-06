import React, { useState, useEffect, useMemo, lazy, Suspense, useRef } from 'react';
import { useData } from './contexts/DataContext';
import { useUI } from './contexts/UIContext';
import { useToast } from './hooks/useToast';
import { useAuth } from './hooks/useAuth';
import { useReminders } from './hooks/useReminders';
import * as Icons from './components/Icons';
import { themeClasses } from './utils/classNames';
import { getTodayKey, genId } from './utils/helpers';
import { dbtQuestions, reflectiveQuestions, copingStrategies as strategiesData } from './data/constants';
import { calculateBadges } from './utils/badgesCalculator';
import * as analyticsService from './services/analyticsService';

// Lazy load views
const HomeView = lazy(() => import('./views/HomeView').then(module => ({ default: module.HomeView })));
const PatternsView = lazy(() => import('./views/PatternsView').then(module => ({ default: module.PatternsView })));
const AnalysesView = lazy(() => import('./views/AnalysesView').then(module => ({ default: module.AnalysesView })));
const HistoryView = lazy(() => import('./views/HistoryView').then(module => ({ default: module.HistoryView })));
const SettingsView = lazy(() => import('./views/SettingsView').then(module => ({ default: module.SettingsView })));

// Lazy load modals
const DailyLogModal = lazy(() => import('./components/modals/DailyLogModal').then(module => ({ default: module.DailyLogModal })));
const WellbeingModal = lazy(() => import('./components/modals/WellbeingModal').then(module => ({ default: module.WellbeingModal })));
const ReflectionModal = lazy(() => import('./components/modals/ReflectionModal').then(module => ({ default: module.ReflectionModal })));
const CycleModal = lazy(() => import('./components/modals/CycleModal').then(module => ({ default: module.CycleModal })));
const GoalModal = lazy(() => import('./components/modals/GoalModal').then(module => ({ default: module.GoalModal })));
const EditConsumptionModal = lazy(() => import('./components/modals/EditConsumptionModal').then(module => ({ default: module.EditConsumptionModal })));
const ThoughtsModal = lazy(() => import('./components/modals/ThoughtsModal').then(module => ({ default: module.ThoughtsModal })));

function HarmReductionTracker() {
    // Contexts
    const {
        auth, db, user, loading: dataLoading,
        consumptions, dailyLogs, reflections, wellbeingLogs, cycles, goals, copingStrategies: userStrategies, thoughts,
        addConsumption, addDailyLog, addReflection, addWellbeingLog, addCycle, addGoal, addThought,
        deleteCopingStrategy, updateGoal, deleteCycle, deleteConsumption,
        deleteItem: deleteGenericItem
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

    // Hooks
    const { toasts, showToast } = useToast();
    const { isLogin, setIsLogin, email, setEmail, password, setPassword, authError, handleAuth, handleLogout } = useAuth(auth);
    const { notificationsEnabled, requestNotificationPermission } = useReminders(user, wellbeingLogs, consumptions, cycles, showToast);

    // App State
    const [currentView, setCurrentView] = useState('home');
    const hasAutoAssociatedRef = useRef(false);

    // Derived Data
    const lastInterval = useMemo(() => analyticsService.calculateLastInterval(consumptions), [consumptions]);

    // Helper function for goal progress (needed for badges)
    const getGoalProgress = (goal) => {
        // Basic implementation matching the logic extracted from previous App.jsx
        if (goal.type === 'increase_interval') {
            const stats = analyticsService.calculateIntervalStats(consumptions);
            if (!stats) return 0;
            const avg = parseFloat(stats.avgHours);
            if (avg >= goal.target) return 100;
            return Math.max(0, Math.min(100, (avg / goal.target) * 100));
        }
        return 0; // Simplified
    };

    const badges = useMemo(() => calculateBadges({
        consumptions,
        reflections,
        wellbeingLogs,
        cycles,
        goals,
        getGoalProgress
    }), [consumptions, reflections, wellbeingLogs, cycles, goals]);

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
            if (diffDays === 1) { streak++; maxStreak = Math.max(maxStreak, streak); }
            else { streak = 1; }
        }
        if (allDates.includes(today)) {
            currentStreak = 1;
            let checkDate = new Date(today);
            for (let i = allDates.length - 2; i >= 0; i--) {
                checkDate.setDate(checkDate.getDate() - 1);
                const checkKey = checkDate.toISOString().split('T')[0];
                if (allDates[i] === checkKey) currentStreak++; else break;
            }
        }
        return { current: currentStreak, max: maxStreak };
    }, [consumptions, wellbeingLogs]);

    // Positive Feedback Generator
    const positiveFeedback = useMemo(() => {
        const messages = [];
        if (streaks.current >= 7) messages.push(`🔥 Incrível! ${streaks.current} dias consecutivos de registo!`);
        else if (streaks.current >= 3) messages.push(`💪 Mantém o ritmo! ${streaks.current} dias seguidos!`);

        if (consumptions.length >= 2 && lastInterval && !lastInterval.isShort) {
            messages.push(`✨ Ótimo trabalho! Último intervalo de ${lastInterval.hours}h`);
        }

        if (wellbeingLogs.length > 0) {
            const recent = wellbeingLogs[0];
            const completedItems = [recent.water, recent.rest, recent.social, recent.food].filter(Boolean).length;
            if (completedItems >= 3) messages.push(`💚 Autocuidado em dia! ${completedItems}/4 itens`);
        }

        if (messages.length === 0) {
            const defaults = ['🌟 Cada registo é um passo importante', '💜 Estás a cuidar de ti', '🌱 O progresso não é linear'];
            messages.push(defaults[Math.floor(Math.random() * defaults.length)]);
        }
        return messages;
    }, [streaks, consumptions, lastInterval, wellbeingLogs]);

    const currentReflection = useMemo(() => {
        if (cycles.length === 0) return reflectiveQuestions[0];
        return reflectiveQuestions[cycles.length % reflectiveQuestions.length];
    }, [cycles.length]);

    const currentDbtQuestion = useMemo(() => {
        if (cycles.length === 0) return dbtQuestions[0];
        return dbtQuestions[cycles.length % dbtQuestions.length];
    }, [cycles.length]);

    // Coping Strategies Logic (Restored)
    const recommendedStrategies = useMemo(() => {
        const allTriggers = cycles.flatMap(c => c.triggers || []);
        const triggerCount = {};
        allTriggers.forEach(t => { triggerCount[t] = (triggerCount[t] || 0) + 1; });
        const topTriggers = Object.entries(triggerCount).sort((a,b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);

        if (topTriggers.length === 0) {
            return [
                'Check HALT: tenho Fome, Raiva (anger), Solidão (lonely) ou Cansaço (tired)?',
                'Hidratação + snack: cérebro funciona melhor',
                'Rotina de sono: padrões ajudam regulação emocional'
            ];
        }

        const selected = [];
        topTriggers.forEach(trigger => {
            if (strategiesData[trigger]) {
                selected.push(...strategiesData[trigger].slice(0, 1));
            }
        });
        return selected.length > 0 ? selected : strategiesData['Stress'];
    }, [cycles]);

    // Effects
    useEffect(() => { document.body.classList.add('dark'); }, []);

    // Actions
    const markConsumption = async () => {
        try {
            const now = new Date();
            const currentCycleId = cycles.length > 0 ? cycles[0].id : null;
            const item = { id: genId(), timestamp: now.toISOString(), date: getTodayKey(), cycleId: currentCycleId, notes: '' };
            await addConsumption(item);
            showToast('✓ Consumo registado', 'success');
        } catch (error) {
            showToast('✗ Erro ao guardar', 'error');
        }
    };

    // Modal submit handlers
    const handleSubmitDailyLog = async (item) => {
        await addDailyLog(item);
        setShowDailyLogModal(false);
        showToast('✓ Registo diário guardado', 'success');
    };

    const handleSubmitWellbeing = async (item) => {
        await addWellbeingLog(item);
        setShowWellbeingModal(false);
        showToast('✓ Bem-estar guardado', 'success');
    };

    const handleSubmitReflection = async (item) => {
        await addReflection(item);
        setShowReflectionModal(false);
        showToast('✓ Reflexão guardada', 'success');
    };

    const handleSubmitCycle = async (item) => {
        await addCycle(item);
        setShowCycleModal(false);
        showToast('✓ Novo ciclo criado', 'success');
    };

    const handleSubmitGoal = async (item) => {
        if (editingGoal) {
            await updateGoal(editingGoal.id, item);
            setEditingGoal(null);
        } else {
            await addGoal(item);
        }
        setShowGoalModal(false);
        showToast('✓ Meta guardada', 'success');
    };

    const handleSubmitThoughts = async (item) => {
        await addThought(item);
        setShowThoughtsModal(false);
        showToast('✓ Pensamento guardado', 'success');
    };

    const handleSaveEditedConsumption = async () => {
        if (!editingConsumption) return;
        await addConsumption(editingConsumption);
        setShowEditConsumptionModal(false);
        setEditingConsumption(null);
        showToast('✓ Consumo editado', 'success');
    };

    // Login Screen
    if (!user) return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">NEP app</h1>
                <p className="text-gray-600 mb-6">Sincroniza entre dispositivos 💜</p>
                <form onSubmit={handleAuth} className="space-y-4">
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded-lg" required />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-lg" required />
                    {authError && <div className="text-red-500 text-sm">{authError}</div>}
                    <button type="submit" className="w-full bg-purple-600 text-white py-3 rounded-lg">Entrar</button>
                    <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-purple-600 text-sm w-full">Criar conta</button>
                </form>
            </div>
        </div>
    );

    if (dataLoading) return <div className="min-h-screen flex items-center justify-center">A carregar...</div>;

    return (
        <div className={'min-h-screen ' + (darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-purple-50 to-blue-50') + ' p-4 pb-24 transition-colors'}>
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className={(darkMode ? 'bg-gray-800 text-white' : 'bg-white') + ' rounded-3xl shadow-xl p-8 mb-6'}>
                    <div className="flex justify-between items-center gap-8">
                        <div className="flex-1">
                            <h1 className="text-4xl font-bold"><span className="text-purple-600">NEP</span> <span className="font-light text-2xl">App</span></h1>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            <p className="text-sm font-medium">Notice it. Explore it. Plan it.</p>
                            {streaks.current > 0 && (
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-semibold shadow-sm">
                                    <span>🔥</span><span>{streaks.current} dias</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className={(darkMode ? 'bg-gray-800/50' : 'bg-white') + ' rounded-3xl shadow-xl p-6 mb-6'}>
                    <Suspense fallback={<div>A carregar vista...</div>}>
                        {currentView === 'home' && (
                            <HomeView
                                darkMode={darkMode}
                                currentReflection={currentReflection}
                                getTimeSinceLastConsumption={() => analyticsService.calculateTimeSinceLastConsumption(consumptions)}
                                markConsumption={markConsumption}
                                setShowThoughtsModal={setShowThoughtsModal}
                                goals={goals}
                                getLastInterval={() => lastInterval}
                                cycles={cycles}
                                dailyLogs={dailyLogs}
                                wellbeingLogs={wellbeingLogs}
                                consumptions={consumptions}
                                positiveFeedback={positiveFeedback}
                                badges={badges}
                                getCurrentCycleId={() => cycles.length > 0 ? cycles[0].id : null}
                                setShowDailyLogModal={setShowDailyLogModal}
                                setShowWellbeingModal={setShowWellbeingModal}
                                setShowReflectionModal={setShowReflectionModal}
                                setShowCycleModal={setShowCycleModal}
                                setShowGoalModal={setShowGoalModal}
                                copingStrategiesData={userStrategies}
                                copingStrategies={recommendedStrategies}
                                deleteCopingStrategy={deleteCopingStrategy}
                            />
                        )}
                        {currentView === 'patterns' && <PatternsView />}
                        {currentView === 'analyses' && <AnalysesView />}
                        {currentView === 'history' && <HistoryView />}
                        {currentView === 'settings' && (
                            <SettingsView
                                darkMode={darkMode}
                                user={user}
                                handleLogout={handleLogout}
                                exportToCSV={() => {}} // Placeholder
                                notificationsEnabled={notificationsEnabled}
                                requestNotificationPermission={requestNotificationPermission}
                            />
                        )}
                    </Suspense>
                </div>

                {/* Bottom Navigation */}
                <div className={(darkMode ? 'bg-gray-800' : 'bg-white') + ' fixed bottom-0 left-0 right-0 shadow-xl rounded-t-3xl p-4 z-50'}>
                    <div className="max-w-2xl mx-auto grid grid-cols-5 gap-1">
                        <NavButton icon={Icons.Heart} label="Início" active={currentView === 'home'} onClick={() => setCurrentView('home')} darkMode={darkMode} />
                        <NavButton icon={Icons.BarChart3} label="Padrões" active={currentView === 'patterns'} onClick={() => setCurrentView('patterns')} darkMode={darkMode} />
                        <NavButton icon={Icons.Activity} label="Análises" active={currentView === 'analyses'} onClick={() => setCurrentView('analyses')} darkMode={darkMode} />
                        <NavButton icon={Icons.BookOpen} label="Histórico" active={currentView === 'history'} onClick={() => setCurrentView('history')} darkMode={darkMode} />
                        <NavButton icon={Icons.Settings} label="Config" active={currentView === 'settings'} onClick={() => setCurrentView('settings')} darkMode={darkMode} />
                    </div>
                </div>
            </div>

            {/* Modals */}
            <Suspense fallback={null}>
                {showDailyLogModal && <DailyLogModal isOpen={showDailyLogModal} onClose={() => setShowDailyLogModal(false)} darkMode={darkMode} onSubmit={handleSubmitDailyLog} />}
                {showWellbeingModal && <WellbeingModal isOpen={showWellbeingModal} onClose={() => setShowWellbeingModal(false)} darkMode={darkMode} onSubmit={handleSubmitWellbeing} wellbeingLogs={wellbeingLogs} />}
                {showReflectionModal && <ReflectionModal isOpen={showReflectionModal} onClose={() => setShowReflectionModal(false)} darkMode={darkMode} currentDbtQuestion={currentDbtQuestion} onSubmit={handleSubmitReflection} />}
                {showCycleModal && <CycleModal isOpen={showCycleModal} onClose={() => setShowCycleModal(false)} darkMode={darkMode} onSubmit={handleSubmitCycle} />}
                {showGoalModal && <GoalModal isOpen={showGoalModal} onClose={() => {setShowGoalModal(false); setEditingGoal(null);}} darkMode={darkMode} editingGoal={editingGoal} onSubmit={handleSubmitGoal} />}
                {showEditConsumptionModal && <EditConsumptionModal isOpen={showEditConsumptionModal} onClose={() => setShowEditConsumptionModal(false)} darkMode={darkMode} editingConsumption={editingConsumption} onSubmit={handleSaveEditedConsumption} />}
                {showThoughtsModal && <ThoughtsModal isOpen={showThoughtsModal} onClose={() => setShowThoughtsModal(false)} darkMode={darkMode} onSubmit={handleSubmitThoughts} />}
            </Suspense>

            {/* Toasts */}
            <div className="fixed bottom-24 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none z-50">
                {toasts.map(toast => (
                    <div key={toast.id} className={'px-4 py-2 rounded-lg shadow-lg text-sm text-white ' + (toast.type === 'error' ? 'bg-red-500' : 'bg-green-500')}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </div>
    );
}

const NavButton = ({ icon: Icon, label, active, onClick, darkMode }) => (
    <button onClick={onClick} className={'p-2 rounded-xl flex flex-col items-center transition-colors ' + (active ? 'bg-purple-600 text-white' : (darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'))}>
        <Icon className="w-5 h-5" />
        <span className="text-xs mt-1">{label}</span>
    </button>
);

export default HarmReductionTracker;
