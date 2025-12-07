import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { dbtQuestions, reflectiveQuestions, copingStrategies, educationalResources } from './data/constants';
import { getTodayKey, genId, safeToISODate, safeDate, getTodayPT, getDateKeyFromItem, timestampToPT, formatDateTime, formatDateShort, formatDateWithWeekday, formatDateWithWeekdayFull, formatDateRange, subtractDays, getDateDaysAgo } from './utils/helpers';
import { calculateBadges } from './utils/badgesCalculator';
import * as analyticsService from './services/analyticsService';
import * as Icons from './components/Icons';
import { useData } from './contexts/DataContext';
import { useMetrics } from './contexts/MetricsContext';
import { useUI } from './contexts/UIContext';
import { useToast } from './hooks/useToast';
import { useAuth } from './hooks/useAuth';
import { useReminders } from './hooks/useReminders';
import { GOAL_TYPE_LABELS } from './constants/goalTypes';
import { validateSleepHours, validateMoodEnergy, validateText, sanitizeText, MAX_NOTE_LENGTH, MAX_THOUGHT_LENGTH } from './utils/validation';
import { themeClasses, cn, cx } from './utils/classNames';
import { analyzeMultipleNotes, identifyThemes, getSentimentDescription, getTrendDescription } from './utils/sentimentAnalysis';
import { logger } from './utils/logger';

// Lazy load heavy components (reduces initial bundle)
const WellbeingChart = lazy(() => import('./components/WellbeingChart'));

// Lazy load views (only load when user navigates to them)
const HomeViewRefactored = lazy(() => import('./views/HomeViewRefactored').then(module => ({ default: module.HomeViewRefactored })));
const PatternsView = lazy(() => import('./views/PatternsView').then(module => ({ default: module.PatternsView })));
const AnalysesView = lazy(() => import('./views/AnalysesView').then(module => ({ default: module.AnalysesView })));
const HistoryView = lazy(() => import('./views/HistoryView').then(module => ({ default: module.HistoryView })));
const SettingsView = lazy(() => import('./views/SettingsView').then(module => ({ default: module.SettingsView })));

// Lazy load modals (only load when user opens them)
const DailyLogModal = lazy(() => import('./components/modals/DailyLogModal').then(module => ({ default: module.DailyLogModal })));
const WellbeingModal = lazy(() => import('./components/modals/WellbeingModal').then(module => ({ default: module.WellbeingModal })));
const ReflectionModal = lazy(() => import('./components/modals/ReflectionModal').then(module => ({ default: module.ReflectionModal })));
const CycleModal = lazy(() => import('./components/modals/CycleModal').then(module => ({ default: module.CycleModal })));
const GoalModal = lazy(() => import('./components/modals/GoalModal').then(module => ({ default: module.GoalModal })));
const EditConsumptionModal = lazy(() => import('./components/modals/EditConsumptionModal').then(module => ({ default: module.EditConsumptionModal })));
const ThoughtsModal = lazy(() => import('./components/modals/ThoughtsModal').then(module => ({ default: module.ThoughtsModal })));
const LegalModal = lazy(() => import('./components/modals/LegalModal').then(module => ({ default: module.LegalModal })));

// Import UI components
import { AlertCard } from './components/ui/AlertCard';
import { GradientButton } from './components/ui/GradientButton';
import { InfoBadge } from './components/ui/InfoBadge';
import { MotivationalCard } from './components/ui/MotivationalCard';
import { StatCard } from './components/ui/StatCard';

function HarmReductionTracker() {
            // ===== 2. STATE MANAGEMENT =====
            // Use contexts for data and UI state
            const { auth, db, user, loading: dataLoading, consumptions, dailyLogs, reflections, wellbeingLogs, cycles, goals, copingStrategies: copingStrategiesData, thoughts, addConsumption, deleteConsumption, addDailyLog, addReflection, addWellbeingLog, addCycle, updateCycle, deleteCycle, addGoal, updateGoal, deleteGoal, addCopingStrategy, deleteCopingStrategy, addThought } = useData();
            const { darkMode, showDailyLogModal, setShowDailyLogModal, showWellbeingModal, setShowWellbeingModal, showReflectionModal, setShowReflectionModal, showCycleModal, setShowCycleModal, showGoalModal, setShowGoalModal, showEditConsumptionModal, setShowEditConsumptionModal, showThoughtsModal, setShowThoughtsModal, editingConsumption, setEditingConsumption, editingGoal, setEditingGoal } = useUI();

            // Use custom hooks
            const { toasts, showToast } = useToast();
            const { isLogin, setIsLogin, email, setEmail, password, setPassword, authError, handleAuth, handleLogout } = useAuth(auth);
            const { notificationsEnabled, requestNotificationPermission } = useReminders(user, wellbeingLogs, consumptions, cycles, showToast);

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
            const [analysisSubView, setAnalysisSubView] = useState('estrutural'); // For analyses tab: temporal, structural, correlations

            // Pagination States
            const [consumptionsToShow, setConsumptionsToShow] = useState(20);
            const [reflectionsToShow, setReflectionsToShow] = useState(10);
            const [wellbeingToShow, setWellbeingToShow] = useState(14);
            const [cyclesHistoryToShow, setCyclesHistoryToShow] = useState(10);
            const [thoughtsToShow, setThoughtsToShow] = useState(10);

            // Legal Modal State
            const [showLegalModal, setShowLegalModal] = useState(false);
            const [legalDocType, setLegalDocType] = useState(null); // 'license', 'terms', 'governance'

            // Form States
            const [dailyForm, setDailyForm] = useState({ mg: 30, notes: '' });
            const [wellbeingForm, setWellbeingForm] = useState({ mood: '', energy: '', water: false, rest: false, social: false, food: false, emotions: [], notes: '' });
            const [reflectionAnswer, setReflectionAnswer] = useState('');
            const [cycleForm, setCycleForm] = useState({ bedtime: '', sleep: '', triggers: [], notes: '', lastBefore00: false, mg: '' });
            const [goalForm, setGoalForm] = useState({ type: 'reduce_frequency', target: '', period: 'daily' });

            // ===== 3. FIREBASE OPERATIONS (CRUD) =====
            const getCurrentCycleIndex = () => {
                if (cycles.length === 0) return 0;
                return cycles.length - 1;
            };

            const currentDbtQuestion = useMemo(() => {
                const cycleIndex = getCurrentCycleIndex();
                return dbtQuestions[cycleIndex % dbtQuestions.length];
            }, [cycles.length]);

            const currentReflection = useMemo(() => {
                const cycleIndex = getCurrentCycleIndex();
                return reflectiveQuestions[cycleIndex % reflectiveQuestions.length];
            }, [cycles.length]);

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

            // Firebase initialization and listeners now handled by DataContext


            const markConsumption = async () => {
                try {
                    const now = new Date();
                    const item = { id: genId(), timestamp: now.toISOString(), date: getTodayKey(), notes: '' };
                    await addConsumption(item);
                    showToast('✓ Consumo registado', 'success');
                } catch (error) {
                    logger.error('❌ ERRO COMPLETO:', error);
                    logger.error('❌ Mensagem:', error.message);
                    logger.error('❌ Stack:', error.stack);
                    showToast('✗ Erro ao guardar consumo', 'error');
                }
            };

            const deleteItem = async (collectionName, id) => {
                if (!user || !db) return;

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
                    await deleteDoc(doc(db, `users/${user.uid}/${collectionName}`, id));
                    showToast('✓ Item apagado', 'success');
                } catch (error) {
                    showToast('✗ Erro ao apagar item', 'error');
                    logger.error('Erro ao apagar:', error);
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
                    logger.error('Erro ao editar:', error);
                }
            };

            const submitDailyLog = async () => {
                try {
                    const item = { id: genId(), date: getTodayKey(), timestamp: new Date().toISOString(), times: metrics.todayConsumptions.length, mg: parseInt(dailyForm.mg), notes: dailyForm.notes };
                    await addDailyLog(item);
                    setDailyForm({ mg: 30, notes: '' });
                    setShowDailyLogModal(false);
                    showToast('✓ Registo diário guardado', 'success');
                } catch (error) {
                    showToast('✗ Erro ao guardar registo', 'error');
                    logger.error(error);
                }
            };

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

                    const item = {
                        id: genId(),
                        date: getTodayKey(),
                        timestamp: new Date().toISOString(),
                        mood: wellbeingForm.mood !== '' ? parseInt(wellbeingForm.mood) : null,
                        energy: wellbeingForm.energy !== '' ? parseInt(wellbeingForm.energy) : null,
                        water: wellbeingForm.water,
                        rest: wellbeingForm.rest,
                        social: wellbeingForm.social,
                        food: wellbeingForm.food,
                        emotions: wellbeingForm.emotions,
                        notes: sanitizeText(wellbeingForm.notes)
                    };
                    await addWellbeingLog(item);
                    setWellbeingForm({ mood: '', energy: '', water: false, rest: false, social: false, food: false, emotions: [], notes: '' });
                    setShowWellbeingModal(false);
                    showToast('✓ Bem-estar guardado', 'success');
                } catch (error) {
                    logger.error('❌ ERRO COMPLETO:', error);
                    logger.error('❌ Mensagem:', error.message);
                    logger.error('❌ Stack:', error.stack);
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

                    const item = {
                        id: genId(),
                        date: getTodayKey(),
                        timestamp: new Date().toISOString(),
                        content: sanitizeText(thoughtsText)
                    };
                    await addThought(item);
                    setShowThoughtsModal(false);
                    showToast('✓ Pensamento guardado no diário', 'success');
                } catch (error) {
                    showToast('✗ Erro ao guardar pensamento', 'error');
                    logger.error(error);
                }
            };

            const submitCycle = async () => {
                try {
                    const item = {
                        id: genId(),
                        timestamp: new Date().toISOString(),
                        date: getTodayKey(),
                        bedtime: cycleForm.bedtime,
                        triggers: cycleForm.triggers,
                        notes: cycleForm.notes,
                        lastBefore00: cycleForm.lastBefore00,
                        // Converter mg e sleep para número (se tiver valor)
                        ...(cycleForm.mg && cycleForm.mg !== '' ? { mg: parseFloat(cycleForm.mg) } : {}),
                        ...(cycleForm.sleep && cycleForm.sleep !== '' ? { sleep: parseFloat(cycleForm.sleep) } : {})
                    };
                    await addCycle(item);
                    setCycleForm({ bedtime: '', sleep: '', triggers: [], notes: '', lastBefore00: false, mg: '' });
                    setShowCycleModal(false);
                    showToast('✓ Novo ciclo criado', 'success');
                } catch (error) {
                    showToast('✗ Erro ao criar ciclo', 'error');
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
                        showToast('✓ Meta atualizada', 'success');
                    } else {
                        // Check if goal of this type already exists
                        const existingGoal = goals.find(g => g.type === goalForm.type);

                        if (existingGoal) {
                            // Replace existing goal
                            const updatedData = { type: goalForm.type, target };
                            await updateGoal(existingGoal.id, updatedData);
                            showToast('✓ Meta substituída', 'success');
                        } else {
                            // Create new goal
                            const item = { id: genId(), type: goalForm.type, target, createdAt: new Date().toISOString(), completed: false };
                            await addGoal(item);
                            showToast('✓ Meta criada', 'success');
                        }
                    }

                    setGoalForm({ type: 'reduce_frequency', target: '', period: 'daily' });
                    setShowGoalModal(false);
                } catch (error) {
                    showToast('✗ Erro ao ' + (editingGoal ? 'atualizar' : 'criar') + ' meta', 'error');
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

            const exportToCSV = () => { const headers = ['Data', 'Hora', 'Tipo', 'Detalhes']; const rows = [...consumptions.map(c => [new Date(c.timestamp).toLocaleDateString('pt-PT'), new Date(c.timestamp).toLocaleTimeString('pt-PT'), 'Consumo', c.notes || '']), ...dailyLogs.map(l => [l.date, '', 'Dosagem', l.times + 'x, ' + l.mg + 'mg' + (l.notes ? ', ' + l.notes : '')]), ...wellbeingLogs.map(w => [w.date, '', 'Bem-estar', 'Sono: ' + w.sleep + '/10, Humor: ' + w.mood + '/10'])]; const csv = [headers, ...rows].map(row => row.map(cell => '"' + cell + '"').join(',')).join('\n'); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'reducao-danos-' + getTodayKey() + '.csv'; a.click(); };

            // Get goal progress with percentage
            const getGoalProgressStats = (goal, filteredConsumptions = null, filteredDailyLogs = null, filteredCycles = null, filteredWellbeing = null) => {
                const dataConsumptions = filteredConsumptions || consumptions;
                const dataDailyLogs = filteredDailyLogs || dailyLogs;
                const dataCycles = filteredCycles || cycles;
                const dataWellbeing = filteredWellbeing || wellbeingLogs;

                let achieved = 0;
                let total = 0;

                const today = getTodayPT();

                if (goal.type === 'increase_interval') {
                    const consumptionsByDay = {};
                    dataConsumptions.forEach(c => {
                        const dateKey = c.date || new Date(c.timestamp).toISOString().split('T')[0];
                        if (!dateKey) return;
                        if (!consumptionsByDay[dateKey]) consumptionsByDay[dateKey] = [];
                        consumptionsByDay[dateKey].push(c);
                    });

                    Object.values(consumptionsByDay).forEach(cycleConsumptions => {
                        if (cycleConsumptions.length < 2) return; // Skip cycles with <2 consumptions
                        total++;

                        const sorted = cycleConsumptions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                        let longIntervals = 0;
                        let totalIntervals = 0;

                        for (let i = 1; i < sorted.length; i++) {
                            const intervalHours = (new Date(sorted[i].timestamp) - new Date(sorted[i - 1].timestamp)) / (1000 * 60 * 60);
                            totalIntervals++;
                            if (intervalHours > 2) longIntervals++;
                        }

                        if (longIntervals >= totalIntervals / 2) achieved++;
                    });
                }

                if (goal.type === 'reduce_frequency') {
                    const consumptionsByDate = {};
                    dataConsumptions.forEach(c => {
                        const dateKey = timestampToPT(c.timestamp);
                        if (!consumptionsByDate[dateKey]) consumptionsByDate[dateKey] = 0;
                        consumptionsByDate[dateKey]++;
                    });

                    Object.entries(consumptionsByDate).forEach(([date, count]) => {
                        if (date === today) return; // Skip today
                        total++;
                        if (count < goal.target) achieved++;
                    });
                }

                if (goal.type === 'reduce_quantity') {
                    // Agrupar dailyLogs por data
                    const mgByDate = {};
                    dataDailyLogs.forEach(log => {
                        if (!log.date || !log.mg) return;
                        if (!mgByDate[log.date]) mgByDate[log.date] = 0;
                        const mgValue = typeof log.mg === 'number' ? log.mg : parseFloat(log.mg);
                        if (!isNaN(mgValue)) mgByDate[log.date] += mgValue;
                    });

                    // Contar dias (excluindo hoje)
                    Object.entries(mgByDate).forEach(([date, totalMg]) => {
                        if (date === today) return; // Excluir dia atual
                        total++;
                        const isAchieved = totalMg < parseFloat(goal.target);
                        if (isAchieved) achieved++;
                    });
                }

                if (goal.type === 'limit_last') {
                    total = dataCycles.length;
                    dataCycles.forEach(cycle => {
                        const isAchieved = cycle.lastBefore00 === true;
                        if (isAchieved) achieved++;
                    });
                }

                if (goal.type === 'sleep_hours') {
                    // COMPATIBILIDADE: Busca sono de cycles.sleep (novo) ou wellbeingLogs.sleep (antigo)
                    // Coletar datas únicas de cycles e wellbeingLogs
                    const allDates = new Set([
                        ...dataCycles.map(c => getDateKeyFromItem(c)),
                        ...dataWellbeing.map(w => getDateKeyFromItem(w))
                    ]);

                    allDates.forEach(date => {
                        const dateObj = new Date(date);
                        const dateStr = dateObj.toLocaleDateString('pt-PT');
                        if (dateStr === today) return; // Skip today

                        // Primeiro tenta buscar em cycles
                        const cycle = dataCycles.find(c => {
                            const cycleDate = getDateKeyFromItem(c);
                            return cycleDate === date && c.sleep != null;
                        });
                        if (cycle) {
                            total++;
                            if (parseFloat(cycle.sleep) >= parseFloat(goal.target)) achieved++;
                            return;
                        }

                        // Fallback: buscar em wellbeingLogs
                        const wellbeing = dataWellbeing.find(w => {
                            const wDate = getDateKeyFromItem(w);
                            return wDate === date && w.sleep != null;
                        });
                        if (wellbeing) {
                            total++;
                            if (parseFloat(wellbeing.sleep) >= parseFloat(goal.target)) achieved++;
                        }
                    });
                }

                if (goal.type === 'bedtime_before') {
                    const targetStr = typeof goal.target === 'string' ? goal.target : String(goal.target).padStart(2, '0') + ':00';
                    const targetParts = targetStr.split(':');
                    const targetMinutes = parseInt(targetParts[0]) * 60 + (targetParts[1] ? parseInt(targetParts[1]) : 0);

                    dataCycles.forEach(cycle => {
                        if (!cycle.bedtime) {
                            return;
                        }
                        const bedtimeParts = cycle.bedtime.split(':');
                        let bedtimeMinutes = parseInt(bedtimeParts[0]) * 60 + parseInt(bedtimeParts[1]);
                        const bedtimeOriginalMinutes = bedtimeMinutes;

                        // Meta SÓ é cumprida se hora for entre 21:00-02:00
                        const isHealthyBedtime = bedtimeOriginalMinutes >= 1260 || bedtimeOriginalMinutes <= 120;

                        total++;

                        // Adjust for early morning (00:00-05:59 → 24:00-29:59)
                        if (bedtimeMinutes >= 0 && bedtimeMinutes < 360) {
                            bedtimeMinutes += 1440;
                        }

                        let targetAdjusted = targetMinutes;
                        if (targetMinutes >= 0 && targetMinutes < 360) {
                            targetAdjusted += 1440;
                        }

                        const isAchieved = bedtimeMinutes <= targetAdjusted && isHealthyBedtime;
                        if (isAchieved) achieved++;
                    });
                }

                const percentage = total > 0 ? Math.min(100, Math.round((achieved / total) * 100)) : 0;

                return { achieved, total, percentage };
            };

            // Streak calculation
            // getStreaks() removed - using metrics.streaks from useAnalysis hook

            // ===== 7. BADGES & ACHIEVEMENTS =====
            // Memoized badges calculation (extracted to separate file for better organization)
            const badges = useMemo(() => calculateBadges({
                consumptions,
                reflections,
                wellbeingLogs,
                cycles,
                goals,
                getGoalProgress: metrics.getGoalProgress
            }), [consumptions, reflections, wellbeingLogs, cycles, goals, metrics.getGoalProgress]);

            // ===== INTELLIGENT INSIGHTS & SENTIMENT ANALYSIS =====
            // Analyze sentiment in text using keyword matching
            const analyzeSentiment = (text) => {
                if (!text || text.trim().length === 0) return { score: 0, label: 'neutro' };

                const lowerText = text.toLowerCase();

                let positiveCount = 0;
                let negativeCount = 0;

               const sentimentResult = analyzeMultipleNotes([lowerText]);
return { 
    score: sentimentResult.score, 
    positiveCount: sentimentResult.distribution.positive + sentimentResult.distribution.very_positive,
    negativeCount: sentimentResult.distribution.negative + sentimentResult.distribution.very_negative, 
    label: sentimentResult.overall 
};
            };

            // Memoized temporal correlation analysis (optimized)
            // NOTE: temporalCorrelations and bidirectionalAnalysis removed (dead code - never used)
            // If needed, these are available via metrics.temporalCorrelations and metrics.bidirectionalAnalysis from useAnalysis hook

            // Analyze intra-day variation (how mood/energy change throughout the same day)
            const getIntraDayVariation = () => {
                if (wellbeingLogs.length < 2) return null;

                // Group by date
                const logsByDate = {};
                wellbeingLogs.forEach(log => {
                    if (!logsByDate[log.date]) logsByDate[log.date] = [];
                    logsByDate[log.date].push(log);
                });

                // Filter days with multiple entries
                const daysWithMultipleEntries = Object.entries(logsByDate).filter(([_, logs]) => logs.length > 1);

                if (daysWithMultipleEntries.length === 0) return null;

                const variations = [];

                daysWithMultipleEntries.forEach(([date, logs]) => {
                    // Sort by timestamp
                    const sorted = logs.sort((a, b) => new Date(a.timestamp || a.date).getTime() - new Date(b.timestamp || b.date).getTime());

                    const first = sorted[0];
                    const last = sorted[sorted.length - 1];

                    // Calculate variations
                    const moodChange = last.mood && first.mood ? parseInt(last.mood) - parseInt(first.mood) : null;
                    const energyChange = last.energy && first.energy ? parseInt(last.energy) - parseInt(first.energy) : null;
                    const sleepTotal = sorted.reduce((sum, log) => sum + (parseFloat(log.sleep) || 0), 0);

                    if (moodChange !== null || energyChange !== null) {
                        variations.push({
                            date,
                            moodChange,
                            energyChange,
                            sleepTotal,
                            entriesCount: sorted.length,
                            firstMood: first.mood ? parseInt(first.mood) : null,
                            lastMood: last.mood ? parseInt(last.mood) : null,
                            firstEnergy: first.energy ? parseInt(first.energy) : null,
                            lastEnergy: last.energy ? parseInt(last.energy) : null
                        });
                    }
                });

                if (variations.length === 0) return null;

                // Calculate averages
                const avgMoodChange = variations.filter(v => v.moodChange !== null).reduce((sum, v) => sum + v.moodChange, 0) / variations.filter(v => v.moodChange !== null).length;
                const avgEnergyChange = variations.filter(v => v.energyChange !== null).reduce((sum, v) => sum + v.energyChange, 0) / variations.filter(v => v.energyChange !== null).length;

                // Find patterns
                const improvingDays = variations.filter(v => (v.moodChange && v.moodChange > 1) || (v.energyChange && v.energyChange > 1)).length;
                const decliningDays = variations.filter(v => (v.moodChange && v.moodChange < -1) || (v.energyChange && v.energyChange < -1)).length;
                const stableDays = variations.length - improvingDays - decliningDays;

                return {
                    variations,
                    avgMoodChange: isNaN(avgMoodChange) ? null : avgMoodChange,
                    avgEnergyChange: isNaN(avgEnergyChange) ? null : avgEnergyChange,
                    improvingDays,
                    decliningDays,
                    stableDays,
                    totalDays: variations.length
                };
            };

            // Analyze emotional patterns (which emotions correlate with consumption)
            const todayCount = metrics.todayConsumptions.length;
            // Use the FIRST cycle (most recent, since sorted by timestamp desc)
            const currentCycle = cycles.length > 0 ? cycles[0] : null;

            // Calculate cycle start time based on bedtime, not cycle creation timestamp
            const getCycleStartTime = (cycle) => {
                if (!cycle || !cycle.bedtime) return cycle.timestamp;

                // Parse the bedtime (format "HH:MM") and create a timestamp
                const cycleDate = new Date(cycle.timestamp);
                const [hours, minutes] = cycle.bedtime.split(':').map(Number);

                // Create a date with the bedtime
                const bedtimeDate = new Date(cycleDate);
                bedtimeDate.setHours(hours, minutes, 0, 0);

                // If bedtime is after the cycle creation time (e.g., bedtime was yesterday)
                // subtract one day
                if (bedtimeDate > cycleDate) {
                    const adjustedDate = subtractDays(bedtimeDate, 1);
                    bedtimeDate.setTime(adjustedDate.getTime());
                }

                return bedtimeDate.toISOString();
            };

            const cycleStartTime = currentCycle ? getCycleStartTime(currentCycle) : null;
            const today = getTodayKey();
            const currentCycleCount = consumptions.filter(c => c.date === today).length;
            // ===== PRE-RENDER DATA PREPARATION =====
            const last7 = metrics.last7Days;
            const streaks = metrics.streaks;

            // Memoized coping strategies based on triggers
            const copingStrategies = useMemo(() => {
                const allTriggers = cycles.flatMap(c => c.triggers || []);
                const triggerCount = {};
                allTriggers.forEach(t => { triggerCount[t] = (triggerCount[t] || 0) + 1; });
                const topTriggers = Object.entries(triggerCount).sort((a,b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);

                const strategies = {
                    'Stress': [
                        'Respiração 4-7-8: inspira 4seg, segura 7seg, expira 8seg. Repete 4x quando sentires tensão aumentar',
                        'Técnica STOP: Stop (para), Take a breath (respira), Observe (observa o que sentes), Proceed (continua com escolha consciente)',
                        'Escreve 3 coisas que consegues controlar agora (ex: beber água, sair 5min, avisar alguém)'
                    ],
                    'Ansiedade': [
                        '5-4-3-2-1: Nomeia 5 coisas que vês, 4 que ouves, 3 que tocas, 2 que cheiras, 1 que saboreias',
                        'Gelo nas mãos ou rosto 30seg: sensação intensa traz-te ao presente (skill DBT - TIP)',
                        'Desafia o pensamento: "É facto ou interpretação? Qual a probabilidade real? O que diria a um amigo?"'
                    ],
                    'Solidão': [
                        'Mensagem para 3 pessoas (sem expectativa de resposta imediata): partilha algo neutro, cria conexão',
                        'Sai de casa 15min: café, passeio, biblioteca. Presença de outros ajuda mesmo sem interação',
                        'Atividade online com pessoas (discord, gaming, livestream): conexão conta, mesmo virtual'
                    ],
                    'Festa': [
                        'Define limite ANTES: máximo X consumos, horário de saída, orçamento. Diz a alguém o teu plano',
                        'Alterna: 1 bebida → 1 água/sumo. Mantém copo na mão (menos pressão social para beber)',
                        'Identifica pessoa de confiança perto + transporte de volta planeado + local seguro se precisares sair'
                    ],
                    'Trabalho': [
                        'Micro-pausas: cada 25min para 5min (lavar cara, esticar, snack). Evita burnout acumulado',
                        'Prioriza 3 tarefas máximo/dia: resto é bonus. Pressão irrealista é gatilho para consumo',
                        'Se overwhelmed: email/mensagem para chefe "preciso ajuste prazo/carga". Pedir ajuda ≠ fraqueza'
                    ],
                    'Família': [
                        'Limites claros: "Não consigo falar sobre X agora" ou "Preciso de espaço, falo contigo amanhã"',
                        'Auto-compaixão: "Estou a fazer o melhor que consigo com o que tenho agora". Culpa não ajuda',
                        'Rede de apoio fora da família: amigo, terapeuta, grupo online. Não dependas só de quem te gatilha'
                    ],
                    'Hábito': [
                        'Quebra padrão: muda 1 passo da rotina (caminho diferente, hora diferente, contexto diferente)',
                        'Substitui: chá/café especial, duche frio, 10 flexões, 5min de jogo. Ocupa mãos + mente',
                        'Adia 15min: "Posso fazer isto daqui a 15min se ainda quiser". Muitas vezes o impulso passa'
                    ],
                    'Tristeza': [
                        'Valida emoção: "Faz sentido sentir isto". Tristeza não é fraqueza, é informação sobre o que importa',
                        'Auto-cuidado radical: banho quente, refeição que gostas, roupa limpa. Corpo afeta mente',
                        'Fala com alguém (amigo, familiar, terapeuta): partilhar alivia, não precisas resolver sozinho/a'
                    ],
                    'Dependência': [
                        'HALT check: tenho Fome? Raiva? Solidão? Cansaço? Resolve a necessidade real primeiro',
                        'Surfar impulso: imagina como onda - sobe, pico (3-15min), desce. Não preciso agir no pico',
                        'Se vou usar: planeia harm reduction (dose menor, contexto seguro, alguém sabe onde estou, água/comida preparada)'
                    ]
                };

                if (topTriggers.length === 0) {
                    return [
                        'Check HALT: tenho Fome, Raiva (anger), Solidão (lonely) ou Cansaço (tired)? Resolve isso primeiro',
                        'Hidratação + snack: cérebro funciona melhor, decisões são melhores, impulsos mais controláveis',
                        'Rotina de sono (mesmo fim-de-semana): deita 21h-02h, acordar mesma hora ±1h. Padrões ajudam regulação emocional'
                    ];
                }

                const selectedStrategies = [];
                topTriggers.forEach(trigger => {
                    if (strategies[trigger]) {
                        selectedStrategies.push(...strategies[trigger].slice(0, 1));
                    }
                });

                return selectedStrategies.length > 0 ? selectedStrategies : strategies['Stress'];
            }, [cycles]);

            // Memoized positive daily feedback
            const positiveFeedback = useMemo(() => {
                const messages = [];

                // Check streak
                if (streaks.current >= 7) messages.push(`🔥 Incrível! ${streaks.current} dias consecutivos de registo!`);
                else if (streaks.current >= 3) messages.push(`💪 Mantém o ritmo! ${streaks.current} dias seguidos!`);

                // Check interval quality
                if (consumptions.length >= 2) {
                    const lastIntervalData = metrics.lastInterval;
                    if (lastIntervalData && !lastIntervalData.isShort) {
                        messages.push(`✨ Ótimo trabalho! Último intervalo de ${lastIntervalData.hours}h`);
                    }
                }

                // Check wellbeing completion
                if (wellbeingLogs.length > 0) {
                    const recent = wellbeingLogs[0];
                    const completedItems = [recent.water, recent.rest, recent.social, recent.food].filter(Boolean).length;
                    if (completedItems >= 3) messages.push(`💚 Autocuidado em dia! ${completedItems}/4 itens`);
                }

                // Check reduction trend
                if (dailyLogs.length >= 2) {
                    const last = dailyLogs[0];
                    const prev = dailyLogs[1];
                    if (last.times < prev.times) {
                        messages.push(`📉 Progresso visível! Menos ${prev.times - last.times} consumo(s) que antes`);
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
                            Recarregar Página
                        </button>
                        <p className="text-xs text-gray-500 mt-4">Se o problema persistir, abre o browser numa janela privada ou limpa o cache.</p>
                    </div>
                </div>
            );

            if (dataLoading) return (<div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4"><div className="text-purple-600 text-xl">A carregar... 🔄</div></div>);

            // Auth Screen
            if (!user) return (
                <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
                            NEP App
                        </h1>
                        <p className="text-gray-600 mb-6">Sincroniza entre dispositivos 💜</p>
                        <form onSubmit={handleAuth} className="space-y-4">
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400"
                                required
                            />
                            <input
                                type="password"
                                placeholder="Password (mínimo 6 caracteres)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400"
                                required
                            />
                            {authError && (
                                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{authError}</div>
                            )}
                            {!isLogin && (
                                <div className="bg-purple-50 p-3 rounded-lg text-xs text-purple-900">
                                    <p className="mb-2">
                                        Ao criar conta, concordas com os{' '}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLegalDocType('terms');
                                                setShowLegalModal(true);
                                            }}
                                            className="text-purple-600 font-semibold hover:underline"
                                        >
                                            Termos de Uso
                                        </button>
                                        .
                                    </p>
                                </div>
                            )}
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium"
                            >
                                {isLogin ? 'Entrar' : 'Criar Conta'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsLogin(!isLogin)}
                                className="w-full text-purple-600 text-sm hover:underline"
                            >
                                {isLogin ? 'Criar conta nova' : 'Já tenho conta'}
                            </button>
                        </form>
                        <p className="text-xs text-gray-500 mt-6">
                            💡 Usa o mesmo email e password no PC e telemóvel para sincronizar
                        </p>
                        <p className="text-xs text-gray-400 mt-2 text-center">
                            Copyright © Teresa Castro
                        </p>
                    </div>

                    {/* Legal Modal for auth screen */}
                    <Suspense fallback={null}>
                        <LegalModal
                            isOpen={showLegalModal}
                            onClose={() => setShowLegalModal(false)}
                            darkMode={false}
                            documentType={legalDocType}
                        />
                    </Suspense>
                </div>
            );

            return (
                <div className={'min-h-screen ' + (darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50') + ' p-4 transition-colors pb-24'}>
                    <div className="max-w-2xl mx-auto">
                        <div className={(darkMode ? 'bg-gray-800 text-white' : 'bg-white') + ' rounded-3xl shadow-xl p-8 mb-6'}>
                            <div className="flex justify-between items-center gap-8">
                                {/* Título - Esquerda */}
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

                                {/* Subtítulo e Slogan - Direita */}
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

                        <div className={(darkMode ? 'bg-gray-800/50' : 'bg-white') + ' rounded-3xl shadow-xl p-6 mb-6'}>
                            {currentView === 'home' && (
                                <Suspense fallback={<div className="text-center py-8">Carregando...</div>}>
                                    <HomeViewRefactored
                                        currentReflection={currentReflection}
                                        markConsumption={markConsumption}
                                        openEditConsumption={openEditConsumption}
                                        deleteItem={deleteItem}
                                        last7={last7}
                                        copingStrategies={copingStrategies}
                                        badges={badges}
                                        currentCycleCount={currentCycleCount}
                                        consumptionsToShow={consumptionsToShow}
                                        setConsumptionsToShow={setConsumptionsToShow}
                                    />
                                </Suspense>
                            )}
                            {currentView === 'patterns' && (
                                <Suspense fallback={<div className="text-center py-8">Carregando...</div>}>
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
                                <Suspense fallback={<div className="text-center py-8">Carregando...</div>}>
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
                                <Suspense fallback={<div className="text-center py-8">Carregando...</div>}>
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
                                        openEditConsumption={openEditConsumption}
                                        deleteItem={deleteItem}
                                    />
                                </Suspense>
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

                        {/* Modals - Lazy loaded with Suspense */}
                        <Suspense fallback={null}>
                            <DailyLogModal
                                isOpen={showDailyLogModal}
                                onClose={() => setShowDailyLogModal(false)}
                                darkMode={darkMode}
                                dailyForm={dailyForm}
                                setDailyForm={setDailyForm}
                                onSubmit={submitDailyLog}
                            />
                        </Suspense>

                        <Suspense fallback={null}>
                            <WellbeingModal
                                isOpen={showWellbeingModal}
                                onClose={() => setShowWellbeingModal(false)}
                                darkMode={darkMode}
                                wellbeingForm={wellbeingForm}
                                setWellbeingForm={setWellbeingForm}
                                onSubmit={submitWellbeing}
                                wellbeingLogs={wellbeingLogs}
                            />
                        </Suspense>

                        <Suspense fallback={null}>
                            <ReflectionModal
                                isOpen={showReflectionModal}
                                onClose={() => setShowReflectionModal(false)}
                                darkMode={darkMode}
                                currentDbtQuestion={currentDbtQuestion}
                                reflectionAnswer={reflectionAnswer}
                                setReflectionAnswer={setReflectionAnswer}
                                onSubmit={submitReflection}
                            />
                        </Suspense>

                        <Suspense fallback={null}>
                            <CycleModal
                                isOpen={showCycleModal}
                                onClose={() => setShowCycleModal(false)}
                                darkMode={darkMode}
                                cycleForm={cycleForm}
                                setCycleForm={setCycleForm}
                                onSubmit={submitCycle}
                            />
                        </Suspense>

                        <Suspense fallback={null}>
                            <GoalModal
                                isOpen={showGoalModal}
                                onClose={() => { setShowGoalModal(false); setEditingGoal(null); }}
                                darkMode={darkMode}
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
                                darkMode={darkMode}
                                editingConsumption={editingConsumption}
                                setEditingConsumption={setEditingConsumption}
                                onSubmit={saveEditedConsumption}
                                safeDate={safeDate}
                            />
                        </Suspense>

                        <Suspense fallback={null}>
                            <ThoughtsModal
                                isOpen={showThoughtsModal}
                                onClose={() => setShowThoughtsModal(false)}
                                darkMode={darkMode}
                                onSubmit={submitThoughts}
                            />
                        </Suspense>

                        <Suspense fallback={null}>
                            <LegalModal
                                isOpen={showLegalModal}
                                onClose={() => setShowLegalModal(false)}
                                darkMode={darkMode}
                                documentType={legalDocType}
                            />
                        </Suspense>

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
