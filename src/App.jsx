import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { dbtQuestions, reflectiveQuestions, copingStrategies, educationalResources } from './data/constants';
import { getTodayKey, genId, safeToISODate, safeDate } from './utils/helpers';
import { firebaseConfig } from './utils/firebase';
import * as Icons from './components/Icons';

// ===== UTILITY FUNCTIONS =====
// Calculate Pearson correlation coefficient
const calculatePearsonCorrelation = (data, xKey, yKey) => {
    if (data.length < 2) return null;
    const n = data.length;
    const sumX = data.reduce((sum, d) => sum + d[xKey], 0);
    const sumY = data.reduce((sum, d) => sum + d[yKey], 0);
    const sumXY = data.reduce((sum, d) => sum + d[xKey] * d[yKey], 0);
    const sumX2 = data.reduce((sum, d) => sum + d[xKey] * d[xKey], 0);
    const sumY2 = data.reduce((sum, d) => sum + d[yKey] * d[yKey], 0);
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    return denominator === 0 ? null : numerator / denominator;
};

        function HarmReductionTracker() {
            // ===== 2. STATE MANAGEMENT =====
            // 2.1 Firebase & Auth State
            const [firebaseInitialized, setFirebaseInitialized] = useState(false);
            const [db, setDb] = useState(null);
            const [auth, setAuth] = useState(null);
            const [user, setUser] = useState(null);
            const [isLogin, setIsLogin] = useState(true);
            const [email, setEmail] = useState('');
            const [password, setPassword] = useState('');
            const [authError, setAuthError] = useState('');
            const [appError, setAppError] = useState(null);
            const hasAutoAssociatedRef = React.useRef(false);

            // 2.2 UI Navigation State
            const [currentView, setCurrentView] = useState('home');

            // 2.3 Data State (from Firebase)
            const [consumptions, setConsumptions] = useState([]);
            const [dailyLogs, setDailyLogs] = useState([]);
            const [wellbeingLogs, setWellbeingLogs] = useState([]);
            const [reflections, setReflections] = useState([]);
            const [cycles, setCycles] = useState([]);
            const [goals, setGoals] = useState([]);
            const [darkMode, setDarkMode] = useState(() => {
                // Check if user has a saved preference
                const saved = localStorage.getItem('darkMode');
                if (saved !== null) return saved === 'true';

                // Otherwise, auto-enable dark mode between 19h-7h
                const hour = new Date().getHours();
                return hour >= 19 || hour < 7;
            });
            const [timeFilter, setTimeFilter] = useState('all');
            const [patternsPeriod, setPatternsPeriod] = useState('tudo'); // hoje, semana, mes, tudo
            const [patternsPeriodOffset, setPatternsPeriodOffset] = useState(0); // 0 = current, 1 = previous, etc
            const [historyPeriod, setHistoryPeriod] = useState('tudo');
            const [historyPeriodOffset, setHistoryPeriodOffset] = useState(0);
            const [historyTopic, setHistoryTopic] = useState('todos'); // todos, consumo, reflexoes, ciclos, bem-estar, dbt

            // Modal states
            const [showDailyLogModal, setShowDailyLogModal] = useState(false);
            const [showWellbeingModal, setShowWellbeingModal] = useState(false);
            const [showReflectionModal, setShowReflectionModal] = useState(false);
            const [showCycleModal, setShowCycleModal] = useState(false);
            const [showGoalModal, setShowGoalModal] = useState(false);
            const [showEditConsumptionModal, setShowEditConsumptionModal] = useState(false);
            const [editingConsumption, setEditingConsumption] = useState(null);
            const [editingGoal, setEditingGoal] = useState(null);
            const [patternView, setPatternView] = useState('dashboard');
            const [patternsSubView, setPatternsSubView] = useState('temporal'); // For patterns tab: temporal, structural, correlations
            const [analysisSubView, setAnalysisSubView] = useState('temporal'); // For analyses tab: temporal, structural, correlations

            // 2.4 Pagination States
            const [consumptionsToShow, setConsumptionsToShow] = useState(20);
            const [reflectionsToShow, setReflectionsToShow] = useState(10);
            const [wellbeingToShow, setWellbeingToShow] = useState(14);
            const [cyclesHistoryToShow, setCyclesHistoryToShow] = useState(10);

            // 2.5 Form States
            const [dailyForm, setDailyForm] = useState({ mg: 30, notes: '' });
            const [wellbeingForm, setWellbeingForm] = useState({ sleep: '', mood: '', energy: '', water: false, rest: false, social: false, food: false, emotions: [], notes: '' });
            const [reflectionAnswer, setReflectionAnswer] = useState('');
            const [cycleForm, setCycleForm] = useState({ bedtime: '', triggers: [], notes: '', lastBefore00: false });
            const [goalForm, setGoalForm] = useState({ type: 'reduce_frequency', target: '', deadline: '', period: 'daily' });

            // ===== 3. TOAST & NOTIFICATION SYSTEM =====
            const [toasts, setToasts] = useState([]);
            const showToast = (message, type = 'success') => {
                const id = genId();
                setToasts(prev => [...prev, { id, message, type }]);
                setTimeout(() => {
                    setToasts(prev => prev.filter(t => t.id !== id));
                }, 3000);
            };

            // Reminder/notification system
            const [reminderDismissed, setReminderDismissed] = useState(() => {
                const dismissed = localStorage.getItem('reminderDismissed');
                return dismissed ? JSON.parse(dismissed) : {};
            });

            const dismissReminder = (type) => {
                const today = getTodayKey();
                const updated = { ...reminderDismissed, [type]: today };
                setReminderDismissed(updated);
                localStorage.setItem('reminderDismissed', JSON.stringify(updated));
            };

            const shouldShowReminder = (type) => {
                const today = getTodayKey();
                return reminderDismissed[type] !== today;
            };

            // Browser notification support
            const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
                try {
                    return localStorage.getItem('notificationsEnabled') === 'true';
                } catch (e) {
                    console.error('Error reading notificationsEnabled:', e);
                    return false;
                }
            });

            const requestNotificationPermission = async () => {
                if (!('Notification' in window)) {
                    showToast('✗ Notificações não suportadas no teu browser', 'error');
                    return;
                }

                // Check current permission state
                if (Notification.permission === 'denied') {
                    showToast('✗ Notificações bloqueadas. Vai às definições do browser para permitir', 'error');
                    return;
                }

                if (Notification.permission === 'granted') {
                    setNotificationsEnabled(true);
                    localStorage.setItem('notificationsEnabled', 'true');
                    showToast('✓ Notificações já estavam ativadas', 'success');
                    return;
                }

                try {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        setNotificationsEnabled(true);
                        localStorage.setItem('notificationsEnabled', 'true');
                        showToast('✓ Notificações ativadas com sucesso', 'success');
                    } else if (permission === 'denied') {
                        showToast('✗ Negaste a permissão. Vai às definições do browser para ativar', 'error');
                    } else {
                        showToast('✗ Permissão não concedida', 'error');
                    }
                } catch (error) {
                    console.error('Error requesting notification permission:', error);
                    showToast('✗ Erro ao pedir permissão de notificações', 'error');
                }
            };

            const showBrowserNotification = (title, body) => {
                try {
                    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
                        new Notification(title, {
                            body,
                            icon: '/favicon.ico',
                            badge: '/favicon.ico'
                        });
                    }
                } catch (e) {
                    console.error('Error showing notification:', e);
                }
            };

            // Check for reminders every minute
            useEffect(() => {
                if (!user) return;

                const checkReminders = () => {
                    try {
                        const now = new Date();
                        const hour = now.getHours();
                        const today = getTodayKey();

                        // Only show reminders between 10h and 22h
                        if (hour < 10 || hour > 22) return;

                        // Check if user hasn't logged wellbeing today
                        const hasWellbeingToday = wellbeingLogs.some(w => w.date === today);
                        if (!hasWellbeingToday && shouldShowReminder('wellbeing') && hour >= 18) {
                            showToast('💭 Lembrete: Ainda não registaste bem-estar hoje', 'info');
                            showBrowserNotification('Lembrete - NEP', 'Ainda não registaste bem-estar hoje');
                            dismissReminder('wellbeing');
                        }
                    } catch (e) {
                        console.error('Error checking reminders:', e);
                    }
                };

                // Check immediately and then every hour
                try {
                    checkReminders();
                    const interval = setInterval(checkReminders, 60 * 60 * 1000); // Every hour
                    return () => clearInterval(interval);
                } catch (e) {
                    console.error('Error setting up reminders:', e);
                }
            }, [user, wellbeingLogs, notificationsEnabled]);

            // ===== 4. FIREBASE OPERATIONS (CRUD) =====
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

            // Save dark mode preference and apply to body
            useEffect(() => {
                try {
                    localStorage.setItem('darkMode', darkMode);
                    if (darkMode) {
                        document.body.classList.add('dark');
                    } else {
                        document.body.classList.remove('dark');
                    }
                } catch (e) {
                    console.error('Error setting dark mode:', e);
                }
            }, [darkMode]);

            useEffect(() => { const app = initializeApp(firebaseConfig); const dbInstance = getFirestore(app); const authInstance = getAuth(app); enableIndexedDbPersistence(dbInstance).catch(() => {}); setDb(dbInstance); setAuth(authInstance); setFirebaseInitialized(true); }, []);

            useEffect(() => { if (!auth) return; onAuthStateChanged(auth, (user) => { setUser(user); }); }, [auth]);

            useEffect(() => { if (!user || !db) return; const unsubs = [onSnapshot(collection(db, `users/${user.uid}/consumptions`), snap => setConsumptions(snap.docs.map(d => d.data()).sort((a,b) => b.timestamp.localeCompare(a.timestamp)))), onSnapshot(collection(db, `users/${user.uid}/dailyLogs`), snap => setDailyLogs(snap.docs.map(d => d.data()).sort((a,b) => b.date.localeCompare(a.date)))), onSnapshot(collection(db, `users/${user.uid}/wellbeingLogs`), snap => setWellbeingLogs(snap.docs.map(d => d.data()).sort((a,b) => b.date.localeCompare(a.date)))), onSnapshot(collection(db, `users/${user.uid}/reflections`), snap => setReflections(snap.docs.map(d => d.data()).sort((a,b) => b.date.localeCompare(a.date)))), onSnapshot(collection(db, `users/${user.uid}/cycles`), snap => setCycles(snap.docs.map(d => d.data()).sort((a,b) => b.timestamp.localeCompare(a.timestamp)))), onSnapshot(collection(db, `users/${user.uid}/goals`), snap => setGoals(snap.docs.map(d => d.data())))]; return () => unsubs.forEach(u => u()); }, [user, db]);

            // Auto-associate consumptions to cycles when data is loaded
            useEffect(() => {
                if (!user || !db || cycles.length === 0 || consumptions.length === 0) return;
                if (hasAutoAssociatedRef.current) return; // Only run once

                const consumptionsWithoutCycle = consumptions.filter(c => !c.cycleId);
                if (consumptionsWithoutCycle.length === 0) {
                    console.log('✅ Todos os consumos já têm cycleId');
                    return;
                }

                hasAutoAssociatedRef.current = true;

                const sortedCycles = [...cycles].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

                console.log('🔄 ASSOCIAÇÃO AUTOMÁTICA DE CONSUMOS A CICLOS');
                console.log(`📊 Total ciclos criados: ${sortedCycles.length}`);
                console.log(`📊 Total consumos: ${consumptions.length}`);
                console.log(`📊 Consumos com cycleId: ${consumptions.filter(c => c.cycleId).length}`);
                console.log(`📊 Consumos SEM cycleId: ${consumptionsWithoutCycle.length}`);
                console.log('\n🗓️ CICLOS (ordenados por timestamp):');
                sortedCycles.forEach((cycle, i) => {
                    console.log(`  ${i + 1}. Ciclo ${cycle.id.substring(0, 8)} → ${new Date(cycle.timestamp).toLocaleString('pt-PT')}`);
                });

                // Run association asynchronously to avoid blocking
                (async () => {
                    let updatedCount = 0;
                    const consumptionsByCycle = {};

                    for (const consumption of consumptionsWithoutCycle) {
                        let assignedCycleId = null;

                        for (let i = 0; i < sortedCycles.length; i++) {
                            const cycle = sortedCycles[i];
                            const nextCycle = i < sortedCycles.length - 1 ? sortedCycles[i + 1] : null;

                            const isAfterCycleStart = consumption.timestamp >= cycle.timestamp;
                            const isBeforeNextCycle = !nextCycle || consumption.timestamp < nextCycle.timestamp;

                            if (isAfterCycleStart && isBeforeNextCycle) {
                                assignedCycleId = cycle.id;
                                break;
                            }
                        }

                        if (!assignedCycleId) {
                            assignedCycleId = sortedCycles[0].id;
                        }

                        if (!consumptionsByCycle[assignedCycleId]) consumptionsByCycle[assignedCycleId] = [];
                        consumptionsByCycle[assignedCycleId].push(consumption);

                        const updatedConsumption = { ...consumption, cycleId: assignedCycleId };
                        await saveToFirebase('consumptions', updatedConsumption);
                        updatedCount++;
                    }

                    console.log('\n✅ RESULTADO DA ASSOCIAÇÃO:');
                    console.log(`📊 ${updatedCount} consumos associados`);
                    console.log('\n📋 DISTRIBUIÇÃO POR CICLO:');
                    sortedCycles.forEach((cycle, i) => {
                        const count = consumptionsByCycle[cycle.id]?.length || 0;
                        console.log(`  ${i + 1}. Ciclo ${cycle.id.substring(0, 8)} → ${count} consumos associados`);
                    });
                })();
            }, [user, db, cycles, consumptions]);

            const toggleDarkMode = () => { const newMode = !darkMode; setDarkMode(newMode); localStorage.setItem('darkMode', newMode); document.body.classList.toggle('dark', newMode); };

            const handleAuth = async (e) => { e.preventDefault(); setAuthError(''); if (!auth) return;  try { if (isLogin) await signInWithEmailAndPassword(auth, email, password); else await createUserWithEmailAndPassword(auth, email, password); } catch (error) { if (error.code === 'auth/user-not-found') setAuthError('Email não encontrado. Cria conta primeiro.'); else if (error.code === 'auth/wrong-password') setAuthError('Password errada.'); else if (error.code === 'auth/email-already-in-use') setAuthError('Email já existe. Faz login.'); else if (error.code === 'auth/weak-password') setAuthError('Password fraca (mínimo 6 caracteres).'); else if (error.code === 'auth/invalid-email') setAuthError('Email inválido.'); else if (error.code === 'auth/invalid-credential') setAuthError('Email ou password incorretos.'); else setAuthError('Erro: ' + error.message); } };

            const handleLogout = () => { signOut(auth); };

            const saveToFirebase = async (collectionName, entry) => { if (!user || !db) return;  await setDoc(doc(db, `users/${user.uid}/${collectionName}`, entry.id), entry); };

            const markConsumption = async () => {
                try {
                    const now = new Date();
                    const currentCycle = getCurrentCycleId();
                    const item = { id: genId(), timestamp: now.toISOString(), date: getTodayKey(), cycleId: currentCycle, notes: '' };
                    setConsumptions(prev => [item, ...prev]);
                    await saveToFirebase('consumptions', item);
                    showToast('✓ Consumo registado', 'success');
                } catch (error) {
                    showToast('✗ Erro ao guardar consumo', 'error');
                    console.error(error);
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
                    'goals': 'esta meta'
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
                    console.error('Erro ao apagar:', error);
                }
            };

            const openEditConsumption = (consumption) => { setEditingConsumption({...consumption}); setShowEditConsumptionModal(true); };

            const saveEditedConsumption = async () => {
                if (!editingConsumption || !user || !db) return;
                
                try {
                    await setDoc(doc(db, `users/${user.uid}/consumptions`, editingConsumption.id), editingConsumption);
                    setConsumptions(prev => prev.map(c => c.id === editingConsumption.id ? editingConsumption : c));
                    setShowEditConsumptionModal(false);
                    setEditingConsumption(null);
                    showToast('✓ Consumo editado', 'success');
                } catch (error) {
                    showToast('✗ Erro ao editar consumo', 'error');
                    console.error('Erro ao editar:', error);
                }
            };

            const getCurrentCycleId = () => {
                if (cycles.length === 0) return null;
                return cycles[0].id; // Most recent cycle (sorted by timestamp desc)
            };

            const submitDailyLog = async () => {
                try {
                    const currentCycle = getCurrentCycleId();
                    const todayConsumptions = consumptions.filter(c => c.date === getTodayKey()).length;
                    const item = { id: genId(), date: getTodayKey(), timestamp: new Date().toISOString(), cycleId: currentCycle, times: todayConsumptions, mg: parseInt(dailyForm.mg), notes: dailyForm.notes };
                    setDailyLogs(prev => [item, ...prev]);
                    await saveToFirebase('dailyLogs', item);
                    setDailyForm({ mg: 30, notes: '' });
                    setShowDailyLogModal(false);
                    showToast('✓ Registo diário guardado', 'success');
                } catch (error) {
                    showToast('✗ Erro ao guardar registo', 'error');
                    console.error(error);
                }
            };

            const submitWellbeing = async () => {
                try {
                    const currentCycle = getCurrentCycleId();
                    const item = { id: genId(), date: getTodayKey(), timestamp: new Date().toISOString(), cycleId: currentCycle, sleep: parseFloat(wellbeingForm.sleep), mood: parseInt(wellbeingForm.mood), energy: parseInt(wellbeingForm.energy), water: wellbeingForm.water, rest: wellbeingForm.rest, social: wellbeingForm.social, food: wellbeingForm.food, emotions: wellbeingForm.emotions, notes: wellbeingForm.notes };
                    setWellbeingLogs(prev => [item, ...prev]);
                    await saveToFirebase('wellbeingLogs', item);
                    setWellbeingForm({ sleep: 7, mood: 5, energy: 5, water: false, rest: false, social: false, food: false, emotions: [], notes: '' });
                    setShowWellbeingModal(false);
                    showToast('✓ Bem-estar guardado', 'success');
                } catch (error) {
                    showToast('✗ Erro ao guardar bem-estar', 'error');
                    console.error(error);
                }
            };

            const submitReflection = async () => {
                try {
                    const item = { id: genId(), date: getTodayKey(), timestamp: new Date().toISOString(), question: currentDbtQuestion, answer: reflectionAnswer };
                    setReflections(prev => [item, ...prev]);
                    await saveToFirebase('reflections', item);
                    setReflectionAnswer('');
                    setShowReflectionModal(false);
                    showToast('✓ Reflexão guardada', 'success');
                } catch (error) {
                    showToast('✗ Erro ao guardar reflexão', 'error');
                    console.error(error);
                }
            };

            const submitCycle = async () => {
                try {
                    const item = { id: genId(), timestamp: new Date().toISOString(), bedtime: cycleForm.bedtime, triggers: cycleForm.triggers, notes: cycleForm.notes, lastBefore00: cycleForm.lastBefore00 };
                    setCycles(prev => [item, ...prev]);
                    await saveToFirebase('cycles', item);
                    setCycleForm({ bedtime: '', triggers: [], notes: '', lastBefore00: false });
                    setShowCycleModal(false);
                    showToast('✓ Novo ciclo criado', 'success');
                } catch (error) {
                    showToast('✗ Erro ao criar ciclo', 'error');
                    console.error(error);
                }
            };

            const submitGoal = async () => {
                try {
                    const target = goalForm.type.includes('delay') || goalForm.type.includes('limit') ? goalForm.target : parseFloat(goalForm.target);

                    if (editingGoal) {
                        // Update existing goal
                        const updatedGoal = { ...editingGoal, type: goalForm.type, target, deadline: goalForm.deadline };
                        setGoals(prev => prev.map(g => g.id === editingGoal.id ? updatedGoal : g));
                        await saveToFirebase('goals', updatedGoal);
                        setEditingGoal(null);
                        showToast('✓ Meta atualizada', 'success');
                    } else {
                        // Create new goal
                        const item = { id: genId(), type: goalForm.type, target, deadline: goalForm.deadline, createdAt: new Date().toISOString(), completed: false };
                        setGoals(prev => [...prev, item]);
                        await saveToFirebase('goals', item);
                        showToast('✓ Meta criada', 'success');
                    }

                    setGoalForm({ type: 'reduce_frequency', target: '', deadline: '' });
                    setShowGoalModal(false);
                } catch (error) {
                    showToast('✗ Erro ao ' + (editingGoal ? 'atualizar' : 'criar') + ' meta', 'error');
                    console.error(error);
                }
            };

            // ===== 5. DATA PROCESSING & ANALYTICS =====
            const getIntervalStats = () => {
                if (consumptions.length < 2) return null;
                const sorted = [...consumptions].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
                const last20 = sorted.slice(-20);
                const intervals = [];
                for (let i = 1; i < last20.length; i++) {
                    const diff = (new Date(last20[i].timestamp) - new Date(last20[i-1].timestamp)) / (1000 * 60 * 60);
                    intervals.push({ hours: diff, date: last20[i].date, timestamp: last20[i].timestamp });
                }
                const avgHours = intervals.reduce((sum, i) => sum + i.hours, 0) / intervals.length;
                const shortIntervals = intervals.filter(i => i.hours < 2);
                const shortByDay = {};
                shortIntervals.forEach(i => { shortByDay[i.date] = (shortByDay[i.date] || 0) + 1; });
                return { avgHours: avgHours.toFixed(1), intervals: intervals.slice(-10).reverse(), shortIntervals: shortIntervals.length, shortByDay };
            };

            const getLastInterval = () => {
                if (consumptions.length < 2) return null;
                const sorted = [...consumptions].sort((a,b) => b.timestamp.localeCompare(a.timestamp));
                const last = new Date(sorted[0].timestamp);
                const secondLast = new Date(sorted[1].timestamp);
                const diffMs = last - secondLast;
                const hours = diffMs / (1000 * 60 * 60);
                return { hours: hours.toFixed(1), isShort: hours < 2 };
            };

            const getTimeSinceLastConsumption = () => {
                if (consumptions.length === 0) return null;
                const sorted = [...consumptions].sort((a,b) => b.timestamp.localeCompare(a.timestamp));
                const last = new Date(sorted[0].timestamp);
                const now = new Date();
                const diffMs = now - last;
                const hours = diffMs / (1000 * 60 * 60);

                if (hours < 1) {
                    const minutes = Math.floor((diffMs / (1000 * 60)));
                    return { value: minutes, unit: 'min', hours: hours };
                } else if (hours < 24) {
                    return { value: hours.toFixed(1), unit: 'h', hours: hours };
                } else {
                    const days = Math.floor(hours / 24);
                    const remainingHours = Math.floor(hours % 24);
                    return { value: days, unit: days === 1 ? 'dia' : 'dias', subValue: remainingHours, subUnit: 'h', hours: hours };
                }
            };

            const getTodayConsumptions = () => consumptions.filter(c => c.date === getTodayKey());

            const getDateRangeForPeriod = (period, offset = 0) => {
                console.log('🕐 getDateRangeForPeriod called:', { period, offset });
                const now = new Date();
                now.setHours(23, 59, 59, 999); // End of today
                let start, end;

                if (period === 'hoje') {
                    // Today
                    end = new Date(now);
                    end.setDate(end.getDate() - offset);
                    start = new Date(end);
                    start.setHours(0, 0, 0, 0);
                } else if (period === 'semana') {
                    // Week (last 7 days)
                    end = new Date(now);
                    end.setDate(end.getDate() - (offset * 7));
                    start = new Date(end);
                    start.setDate(start.getDate() - 6);
                    start.setHours(0, 0, 0, 0);
                } else if (period === 'mes') {
                    // Month (last 30 days)
                    end = new Date(now);
                    end.setDate(end.getDate() - (offset * 30));
                    start = new Date(end);
                    start.setDate(start.getDate() - 29);
                    start.setHours(0, 0, 0, 0);
                } else {
                    // tudo (all time)
                    console.log('⚠️ Returning null range (period = tudo)');
                    return { start: null, end: null };
                }

                console.log('✅ Returning date range:', { start, end });
                return { start, end };
            };

            const filterByDateRange = (items, dateRange, dateField = 'timestamp') => {
                if (!dateRange.start || !dateRange.end) {
                    console.log('⚠️ filterByDateRange: Sem range definido, retornando todos os items:', items.length);
                    return items;
                }

                const filtered = items.filter(item => {
                    const itemDate = new Date(item[dateField]);
                    const isInRange = itemDate >= dateRange.start && itemDate <= dateRange.end;
                    return isInRange;
                });

                console.log(`🔎 filterByDateRange: ${items.length} items → ${filtered.length} filtrados (campo: ${dateField})`, {
                    start: dateRange.start,
                    end: dateRange.end
                });

                return filtered;
            };

            const getPeriodLabel = (period, offset) => {
                if (offset === 0) {
                    if (period === 'hoje') return 'Hoje';
                    if (period === 'semana') return 'Últimos 7 dias';
                    if (period === 'mes') return 'Últimos 30 dias';
                    return 'Todo o período';
                }

                if (period === 'hoje') {
                    const date = new Date();
                    date.setDate(date.getDate() - offset);
                    return date.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });
                }
                if (period === 'semana') return `${offset} ${offset === 1 ? 'semana' : 'semanas'} atrás`;
                if (period === 'mes') return `${offset} ${offset === 1 ? 'mês' : 'meses'} atrás`;
                return 'Todo o período';
            };

            // Helper: Exclude today from general analyses (since day is not complete)
            const excludeToday = (items, dateField = 'date') => {
                const today = getTodayKey();
                return items.filter(item => item[dateField] !== today);
            };

            const getLast7Days = () => {
                // Calculate avgTimes from actual consumptions in last 7 complete days
                const last7Dates = [...Array(7)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (i + 1)); // Start from yesterday (exclude today)
                    return d.toISOString().split('T')[0];
                });

                const totalConsumptions = last7Dates.reduce((sum, date) => {
                    return sum + consumptions.filter(c => c.date === date).length;
                }, 0);

                const avgTimes = (totalConsumptions / 7).toFixed(1);

                // Calculate avgMg from dailyLogs that have mg registered IN THE LAST 7 DAYS
                const logsWithMg = dailyLogs.filter(l => {
                    // Only include logs from last 7 days with valid mg
                    return last7Dates.includes(l.date) && l.mg !== undefined && !isNaN(l.mg);
                });
                const avgMg = logsWithMg.length > 0 ? (logsWithMg.reduce((sum, l) => sum + l.mg, 0) / logsWithMg.length).toFixed(0) : 0;

                return { avgTimes, avgMg };
            };

            const exportToCSV = () => { const headers = ['Data', 'Hora', 'Tipo', 'Detalhes']; const rows = [...consumptions.map(c => [new Date(c.timestamp).toLocaleDateString('pt-PT'), new Date(c.timestamp).toLocaleTimeString('pt-PT'), 'Consumo', c.notes || '']), ...dailyLogs.map(l => [l.date, '', 'Dosagem', l.times + 'x, ' + l.mg + 'mg' + (l.notes ? ', ' + l.notes : '')]), ...wellbeingLogs.map(w => [w.date, '', 'Bem-estar', 'Sono: ' + w.sleep + '/10, Humor: ' + w.mood + '/10'])]; const csv = [headers, ...rows].map(row => row.map(cell => '"' + cell + '"').join(',')).join('\n'); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'reducao-danos-' + getTodayKey() + '.csv'; a.click(); };

            // Helper: Get average frequency with new rules (2h+ intervals)
            const getAvgFrequencyLast7Days = () => {
                // Exclude today (day 0) and get last 7 completed days (days 1-7)
                const last7Dates = [...Array(7)].map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (i + 1)); // Start from yesterday
                    return d.toISOString().split('T')[0];
                });

                let validDaysCount = 0;
                let totalConsumptions = 0;

                last7Dates.forEach(date => {
                    const dayConsumptions = consumptions.filter(c => c.date === date);
                    if (dayConsumptions.length === 0) return;

                    // Check interval rule if more than 1 consumption
                    if (dayConsumptions.length === 1) {
                        validDaysCount++;
                        totalConsumptions += 1;
                        return;
                    }

                    const sorted = dayConsumptions.sort((a, b) => a.timestamp - b.timestamp);
                    let longIntervals = 0;
                    for (let i = 1; i < sorted.length; i++) {
                        const intervalHours = (sorted[i].timestamp - sorted[i - 1].timestamp) / (1000 * 60 * 60);
                        if (intervalHours >= 2) longIntervals++;
                    }

                    const totalIntervals = sorted.length - 1;
                    if (longIntervals >= totalIntervals / 2) {
                        validDaysCount++;
                        totalConsumptions += dayConsumptions.length;
                    }
                });

                return validDaysCount > 0 ? (totalConsumptions / validDaysCount) : 0;
            };

            // ALTERAÇÃO 2 e 7: Corrigir progresso de metas + adicionar meta "hora do último consumo"
            const getGoalProgress = (goal) => {
                if (goal.type === 'reduce_frequency') {
                    const avgLast7 = getAvgFrequencyLast7Days();
                    if (avgLast7 === 0) return 100; // No consumptions = goal achieved
                    if (avgLast7 <= goal.target) return 100;
                    const baseline = Math.max(avgLast7, goal.target * 2);
                    const progress = ((baseline - avgLast7) / (baseline - goal.target)) * 100;
                    return Math.max(0, Math.min(100, progress));
                }
                
                if (goal.type === 'reduce_quantity') {
                    const avgLast7Mg = parseFloat(getLast7Days().avgMg);
                    if (avgLast7Mg === 0) return 0;
                    if (avgLast7Mg < goal.target) return 100;
                    const baseline = Math.max(avgLast7Mg, goal.target * 2);
                    const progress = ((baseline - avgLast7Mg) / (baseline - goal.target)) * 100;
                    return Math.max(0, Math.min(100, progress));
                }
                
                if (goal.type === 'delay_first') {
                    const recentConsumptions = consumptions.slice(0, 21);
                    if (recentConsumptions.length === 0) return 0;
                    const firstOfDays = {};
                    recentConsumptions.forEach(c => { if (!firstOfDays[c.date] || c.timestamp < firstOfDays[c.date]) { firstOfDays[c.date] = c.timestamp; } });
                    const targetParts = goal.target.split(':');
                    const targetMinutes = parseInt(targetParts[0]) * 60 + parseInt(targetParts[1]);
                    let successDays = 0;
                    Object.values(firstOfDays).forEach(timestamp => { const d = new Date(timestamp); const firstMinutes = d.getHours() * 60 + d.getMinutes(); if (firstMinutes >= targetMinutes) successDays++; });
                    return Math.min(100, (successDays / Object.keys(firstOfDays).length) * 100);
                }
                
                if (goal.type === 'increase_interval') {
                    const intervalStats = getIntervalStats();
                    if (!intervalStats) return 0;
                    const avg = parseFloat(intervalStats.avgHours);
                    if (avg >= goal.target) return 100;
                    const progress = (avg / goal.target) * 100;
                    return Math.max(0, Math.min(100, progress));
                }
                
                // ALTERAÇÃO 7: Nova meta "Hora do último consumo diário"
                if (goal.type === 'limit_last') {
                    const recentConsumptions = consumptions.slice(0, 21);
                    if (recentConsumptions.length === 0) return 0;
                    const lastOfDays = {};
                    recentConsumptions.forEach(c => { if (!lastOfDays[c.date] || c.timestamp > lastOfDays[c.date]) { lastOfDays[c.date] = c.timestamp; } });
                    const targetParts = goal.target.split(':');
                    const targetMinutes = parseInt(targetParts[0]) * 60 + parseInt(targetParts[1]);
                    let successDays = 0;
                    Object.values(lastOfDays).forEach(timestamp => { const d = new Date(timestamp); const lastMinutes = d.getHours() * 60 + d.getMinutes(); if (lastMinutes <= targetMinutes) successDays++; });
                    return Math.min(100, (successDays / Object.keys(lastOfDays).length) * 100);
                }

                if (goal.type === 'sleep_hours') {
                    const recentLogs = wellbeingLogs.slice(0, 7);
                    if (recentLogs.length === 0) return 0;
                    const logsWithSleep = recentLogs.filter(w => w.sleep && !isNaN(parseFloat(w.sleep)));
                    if (logsWithSleep.length === 0) return 0;
                    const avgSleep = logsWithSleep.reduce((sum, w) => sum + parseFloat(w.sleep), 0) / logsWithSleep.length;
                    if (avgSleep >= goal.target) return 100;
                    const progress = (avgSleep / goal.target) * 100;
                    return Math.max(0, Math.min(100, progress));
                }

                if (goal.type === 'bedtime_before') {
                    const recentCycles = cycles.slice(0, 7);
                    if (recentCycles.length === 0) return 0;
                    const cyclesWithBedtime = recentCycles.filter(c => c.bedtime);
                    if (cyclesWithBedtime.length === 0) return 0;

                    const targetStr = typeof goal.target === 'string' ? goal.target : String(goal.target).padStart(2, '0') + ':00';
                    const targetParts = targetStr.split(':');
                    const targetMinutes = parseInt(targetParts[0]) * 60 + (targetParts[1] ? parseInt(targetParts[1]) : 0);

                    let successCount = 0;
                    cyclesWithBedtime.forEach(cycle => {
                        const bedtimeParts = cycle.bedtime.split(':');
                        let bedtimeMinutes = parseInt(bedtimeParts[0]) * 60 + parseInt(bedtimeParts[1]);

                        // Filtrar horas inválidas (06:00-20:59 não é hora de deitar)
                        if (bedtimeMinutes >= 360 && bedtimeMinutes < 1260) return;

                        // Ajustar madrugada
                        if (bedtimeMinutes >= 0 && bedtimeMinutes < 360) {
                            bedtimeMinutes += 1440;
                        }

                        let targetAdjusted = targetMinutes;
                        if (targetMinutes >= 0 && targetMinutes < 360) {
                            targetAdjusted += 1440;
                        }

                        if (bedtimeMinutes <= targetAdjusted) successCount++;
                    });

                    return Math.min(100, (successCount / cyclesWithBedtime.length) * 100);
                }

                return 0;
            };

            const getGoalAchievementCount = (goal, filteredConsumptions = null, filteredDailyLogs = null, filteredCycles = null, filteredWellbeing = null) => {
                // Usar dados filtrados se fornecidos, caso contrário usar todos os dados
                const dataConsumptions = filteredConsumptions || consumptions;
                const dataDailyLogs = filteredDailyLogs || dailyLogs;
                const dataCycles = filteredCycles || cycles;
                const dataWellbeing = filteredWellbeing || wellbeingLogs;

                let achievedCount = 0;
                console.log('🎯 Calculando meta:', goal.type, 'target:', goal.target);

                if (goal.type === 'reduce_frequency') {
                    // REGRA: Conta dias com consumos ABAIXO do target (excluindo o target)
                    // Ex: target=10 → conta dias com <10 consumos (0-9)
                    // IMPORTANTE: Exclui dia atual (que ainda não acabou)
                    const today = new Date().toLocaleDateString('pt-PT');
                    const consumptionsByDate = {};

                    dataConsumptions.forEach(c => {
                        // Derivar data do timestamp para garantir consistência
                        const dateKey = new Date(c.timestamp).toLocaleDateString('pt-PT');
                        if (!consumptionsByDate[dateKey]) consumptionsByDate[dateKey] = 0;
                        consumptionsByDate[dateKey]++;
                    });

                    // Remove dia atual da contagem
                    const completedDays = { ...consumptionsByDate };
                    delete completedDays[today];

                    console.log('📉 META REDUCE_FREQUENCY:', {
                        target: goal.target,
                        totalDias: Object.keys(consumptionsByDate).length,
                        diasCompletos: Object.keys(completedDays).length,
                        hoje: today,
                        consumosHoje: consumptionsByDate[today] || 0
                    });

                    Object.entries(completedDays).forEach(([date, count]) => {
                        const isAchieved = count < goal.target;
                        console.log('  📅', date, '→', count, 'consumos →', isAchieved ? '✅' : '❌');
                        if (isAchieved) achievedCount++;
                    });
                }

                if (goal.type === 'reduce_quantity') {
                    // REGRA: Conta dias com mg ABAIXO do target (excluindo o target)
                    // Ex: target=200 → conta dias com <200mg
                    // IMPORTANTE: Exclui dia atual (que ainda não acabou)
                    const today = new Date().toLocaleDateString('pt-PT');

                    console.log('⚖️ META REDUCE_QUANTITY:', {
                        target: goal.target,
                        totalLogs: dataDailyLogs.length,
                        logsComMg: dataDailyLogs.filter(d => d.mg).length,
                        hoje: today
                    });

                    dataDailyLogs.forEach(log => {
                        if (log.mg) {
                            const logDate = new Date(log.timestamp).toLocaleDateString('pt-PT');
                            if (logDate === today) {
                                console.log('  📊', logDate, '→', log.mg, 'mg → ⏭️ Dia atual (ignorado)');
                                return; // Skip today
                            }

                            const isAchieved = log.mg < goal.target;
                            console.log('  📊', logDate, '→', log.mg, 'mg →', isAchieved ? '✅' : '❌');
                            if (isAchieved) achievedCount++;
                        }
                    });
                }

                if (goal.type === 'delay_first') {
                    // REGRA: Conta dias onde primeiro consumo foi >= target
                    // IMPORTANTE: Exclui dia atual (que ainda não acabou)
                    const today = new Date().toLocaleDateString('pt-PT');
                    const firstOfDays = {};

                    dataConsumptions.forEach(c => {
                        // Derivar data do timestamp para garantir consistência
                        const dateKey = new Date(c.timestamp).toLocaleDateString('pt-PT');
                        if (!firstOfDays[dateKey] || c.timestamp < firstOfDays[dateKey]) {
                            firstOfDays[dateKey] = c.timestamp;
                        }
                    });

                    // Remove dia atual da contagem
                    delete firstOfDays[today];

                    const targetParts = goal.target.split(':');
                    const targetMinutes = parseInt(targetParts[0]) * 60 + parseInt(targetParts[1]);

                    console.log('⏰ META DELAY_FIRST:', {
                        target: goal.target,
                        targetMinutes,
                        totalDias: Object.keys(firstOfDays).length,
                        hoje: today
                    });

                    Object.entries(firstOfDays).forEach(([date, timestamp]) => {
                        const d = new Date(timestamp);
                        const firstMinutes = d.getHours() * 60 + d.getMinutes();
                        const isAchieved = firstMinutes >= targetMinutes;
                        const timeStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
                        console.log('  📅', date, '→ primeiro consumo às', timeStr, '→', isAchieved ? '✅' : '❌');
                        if (isAchieved) achievedCount++;
                    });
                }

                if (goal.type === 'limit_last') {
                    // REGRA: Conta CICLOS onde user marcou lastBefore00=true
                    dataCycles.forEach(cycle => {
                        if (cycle.lastBefore00 === true) achievedCount++;
                    });
                }

                if (goal.type === 'increase_interval') {
                    // REGRA: Conta DIAS onde ≥50% dos intervalos são >target
                    // IMPORTANTE: Exclui dia atual (que ainda não acabou)
                    const today = new Date().toLocaleDateString('pt-PT');
                    const consumptionsByDate = {};

                    dataConsumptions.forEach(c => {
                        const dateKey = new Date(c.timestamp).toLocaleDateString('pt-PT');
                        if (!consumptionsByDate[dateKey]) consumptionsByDate[dateKey] = [];
                        consumptionsByDate[dateKey].push(c);
                    });

                    // Remove dia atual da contagem
                    delete consumptionsByDate[today];

                    console.log('⏱️ META INCREASE_INTERVAL:', {
                        target: goal.target + 'h',
                        totalConsumptions: dataConsumptions.length,
                        totalDias: Object.keys(consumptionsByDate).length,
                        hoje: today
                    });

                    Object.entries(consumptionsByDate).forEach(([date, dayConsumptions]) => {
                        if (dayConsumptions.length < 2) {
                            console.log('  📅', date, '→', dayConsumptions.length, 'consumo(s) → ⏭️ Precisa de ≥2');
                            return;
                        }

                        const sorted = dayConsumptions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                        let longIntervals = 0;
                        let totalIntervals = 0;
                        const intervalDetails = [];

                        for (let i = 1; i < sorted.length; i++) {
                            const intervalHours = (new Date(sorted[i].timestamp) - new Date(sorted[i - 1].timestamp)) / (1000 * 60 * 60);
                            totalIntervals++;
                            const isLong = intervalHours > goal.target;
                            if (isLong) longIntervals++;
                            intervalDetails.push({
                                from: new Date(sorted[i-1].timestamp).toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'}),
                                to: new Date(sorted[i].timestamp).toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'}),
                                hours: intervalHours.toFixed(1),
                                isLong
                            });
                        }

                        const percentage = (longIntervals / totalIntervals) * 100;
                        const isAchieved = longIntervals >= totalIntervals / 2;
                        console.log('  📅', date, '→', longIntervals, 'de', totalIntervals, 'intervalos >' + goal.target + 'h (' + percentage.toFixed(0) + '%) →', isAchieved ? '✅' : '❌');
                        console.log('    Detalhes:', intervalDetails);

                        if (isAchieved) achievedCount++;
                    });
                }

                if (goal.type === 'sleep_hours') {
                    // REGRA: Conta dias com sono ≥ target (7h ou mais)
                    // IMPORTANTE: Exclui dia atual (que ainda não acabou)
                    const today = new Date().toLocaleDateString('pt-PT');

                    console.log('😴 META SLEEP_HOURS:', {
                        target: goal.target + 'h',
                        totalLogs: dataWellbeing.length,
                        logsComSono: dataWellbeing.filter(w => w.sleep != null).length,
                        hoje: today
                    });

                    dataWellbeing.forEach(log => {
                        if (log.sleep != null) {
                            const logDate = new Date(log.timestamp).toLocaleDateString('pt-PT');
                            if (logDate === today) {
                                console.log('  😴', logDate, '→', log.sleep, 'h → ⏭️ Dia atual (ignorado)');
                                return; // Skip today
                            }

                            const isAchieved = parseFloat(log.sleep) >= parseFloat(goal.target);
                            console.log('  😴', logDate, '→', log.sleep, 'h →', isAchieved ? '✅' : '❌');
                            if (isAchieved) achievedCount++;
                        }
                    });
                }

                if (goal.type === 'bedtime_before') {
                    // REGRA: Conta ciclos onde hora de deitar foi ATÉ o target (incluindo a hora exata)
                    // Ex: target="02:00" → conta ciclos com bedtime <= 02:00
                    const targetStr = typeof goal.target === 'string' ? goal.target : String(goal.target).padStart(2, '0') + ':00';
                    const targetParts = targetStr.split(':');
                    const targetMinutes = parseInt(targetParts[0]) * 60 + (targetParts[1] ? parseInt(targetParts[1]) : 0);

                    console.log('🛏️ META BEDTIME_BEFORE:', {
                        target: goal.target,
                        targetStr,
                        targetMinutes,
                        totalCycles: dataCycles.length
                    });

                    dataCycles.forEach(cycle => {
                        if (!cycle.bedtime) return;
                        const bedtimeParts = cycle.bedtime.split(':');
                        let bedtimeMinutes = parseInt(bedtimeParts[0]) * 60 + parseInt(bedtimeParts[1]);
                        const originalBedtime = cycle.bedtime;

                        // Filtrar horas inválidas (06:00-20:59 não é hora de deitar)
                        if (bedtimeMinutes >= 360 && bedtimeMinutes < 1260) { // 06:00-20:59
                            console.log('  🕐', originalBedtime, '→ ⏰ Não é hora de deitar → ❌');
                            return;
                        }

                        // Ajustar madrugada (00:00-05:59 → 24:00-29:59)
                        if (bedtimeMinutes >= 0 && bedtimeMinutes < 360) { // 0-5:59
                            bedtimeMinutes += 1440; // +24h
                        }

                        // Ajustar target se for madrugada
                        let targetAdjusted = targetMinutes;
                        if (targetMinutes >= 0 && targetMinutes < 360) {
                            targetAdjusted += 1440;
                        }

                        const isAchieved = bedtimeMinutes <= targetAdjusted; // Incluir a hora exata
                        console.log('  🕐', originalBedtime, '→', bedtimeMinutes, 'min vs', targetAdjusted, 'min →', isAchieved ? '✅' : '❌');

                        if (isAchieved) achievedCount++;
                    });
                }

                console.log('🎯 Resultado:', achievedCount, 'vezes atingido');
                return achievedCount;
            };

            // Get goal progress with percentage
            const getGoalProgressStats = (goal, filteredConsumptions = null, filteredDailyLogs = null, filteredCycles = null, filteredWellbeing = null) => {
                const dataConsumptions = filteredConsumptions || consumptions;
                const dataDailyLogs = filteredDailyLogs || dailyLogs;
                const dataCycles = filteredCycles || cycles;
                const dataWellbeing = filteredWellbeing || wellbeingLogs;

                let achieved = 0;
                let total = 0;

                const today = new Date().toLocaleDateString('pt-PT');

                if (goal.type === 'increase_interval') {
                    const consumptionsByCycle = {};
                    dataConsumptions.forEach(c => {
                        if (!c.cycleId) return;
                        if (!consumptionsByCycle[c.cycleId]) consumptionsByCycle[c.cycleId] = [];
                        consumptionsByCycle[c.cycleId].push(c);
                    });

                    Object.values(consumptionsByCycle).forEach(cycleConsumptions => {
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
                        const dateKey = new Date(c.timestamp).toLocaleDateString('pt-PT');
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
                    dataDailyLogs.forEach(log => {
                        if (!log.mg) return;
                        const logDate = new Date(log.timestamp).toLocaleDateString('pt-PT');
                        if (logDate === today) return; // Skip today
                        total++;
                        if (log.mg < goal.target) achieved++;
                    });
                }

                if (goal.type === 'delay_first') {
                    const firstOfDays = {};
                    dataConsumptions.forEach(c => {
                        const dateKey = new Date(c.timestamp).toLocaleDateString('pt-PT');
                        if (!firstOfDays[dateKey] || c.timestamp < firstOfDays[dateKey]) {
                            firstOfDays[dateKey] = c.timestamp;
                        }
                    });

                    delete firstOfDays[today]; // Skip today

                    const targetParts = goal.target.split(':');
                    const targetMinutes = parseInt(targetParts[0]) * 60 + parseInt(targetParts[1]);

                    Object.values(firstOfDays).forEach(timestamp => {
                        total++;
                        const d = new Date(timestamp);
                        const firstMinutes = d.getHours() * 60 + d.getMinutes();
                        if (firstMinutes >= targetMinutes) achieved++;
                    });
                }

                if (goal.type === 'limit_last') {
                    console.log('🌙 META LIMIT_LAST (STATS):', { target: goal.target, totalCycles: dataCycles.length });
                    total = dataCycles.length;
                    dataCycles.forEach(cycle => {
                        const isAchieved = cycle.lastBefore00 === true;
                        if (isAchieved) achieved++;
                        console.log(`  🌙 Ciclo ${cycle.id.slice(0, 8)} → lastBefore00=${cycle.lastBefore00} → ${isAchieved ? '✅' : '❌'}`);
                    });
                }

                if (goal.type === 'sleep_hours') {
                    dataWellbeing.forEach(log => {
                        if (log.sleep == null) return;
                        const logDate = new Date(log.timestamp).toLocaleDateString('pt-PT');
                        if (logDate === today) return; // Skip today
                        total++;
                        if (parseFloat(log.sleep) >= parseFloat(goal.target)) achieved++;
                    });
                }

                if (goal.type === 'bedtime_before') {
                    console.log('🛏️ META BEDTIME_BEFORE (STATS):', { target: goal.target, totalCycles: dataCycles.length });
                    const targetStr = typeof goal.target === 'string' ? goal.target : String(goal.target).padStart(2, '0') + ':00';
                    const targetParts = targetStr.split(':');
                    const targetMinutes = parseInt(targetParts[0]) * 60 + (targetParts[1] ? parseInt(targetParts[1]) : 0);

                    dataCycles.forEach(cycle => {
                        if (!cycle.bedtime) {
                            console.log(`  🛏️ Ciclo ${cycle.id.slice(0, 8)} → sem bedtime → ⏭️ Ignorado`);
                            return;
                        }
                        const bedtimeParts = cycle.bedtime.split(':');
                        let bedtimeMinutes = parseInt(bedtimeParts[0]) * 60 + parseInt(bedtimeParts[1]);

                        // Filter invalid times (06:00-20:59 is not bedtime)
                        if (bedtimeMinutes >= 360 && bedtimeMinutes < 1260) {
                            console.log(`  🛏️ Ciclo ${cycle.id.slice(0, 8)} → ${cycle.bedtime} (inválido, dia) → ⏭️ Ignorado`);
                            return;
                        }

                        total++;

                        // Adjust for early morning (00:00-05:59 → 24:00-29:59)
                        if (bedtimeMinutes >= 0 && bedtimeMinutes < 360) {
                            bedtimeMinutes += 1440;
                        }

                        let targetAdjusted = targetMinutes;
                        if (targetMinutes >= 0 && targetMinutes < 360) {
                            targetAdjusted += 1440;
                        }

                        const isAchieved = bedtimeMinutes <= targetAdjusted;
                        if (isAchieved) achieved++;
                        console.log(`  🛏️ Ciclo ${cycle.id.slice(0, 8)} → ${cycle.bedtime} → ${isAchieved ? '✅' : '❌'}`);
                    });
                }

                const percentage = total > 0 ? Math.round((achieved / total) * 100) : 0;

                return { achieved, total, percentage };
            };

            // Streak calculation
            const getStreaks = () => {
                if (consumptions.length === 0 && wellbeingLogs.length === 0) return { current: 0, max: 0 };

                const allDates = [...new Set([...consumptions.map(c => c.date), ...wellbeingLogs.map(w => w.date)])].sort();
                const today = getTodayKey();

                let currentStreak = 0;
                let maxStreak = 1;
                let streak = 1;

                // Calculate max streak
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

                // Calculate current streak (working backwards from today)
                if (allDates.includes(today)) {
                    currentStreak = 1;
                    let checkDate = new Date(today);
                    for (let i = allDates.length - 2; i >= 0; i--) {
                        checkDate.setDate(checkDate.getDate() - 1);
                        const checkKey = checkDate.toISOString().split('T')[0];
                        if (allDates[i] === checkKey) {
                            currentStreak++;
                        } else {
                            break;
                        }
                    }
                }

                return { current: currentStreak, max: maxStreak };
            };

            // ===== 7. BADGES & ACHIEVEMENTS =====
            const getBadges = () => {
                const badges = [];

                // Long intervals badge (5 days with >2h intervals)
                if (consumptions.length >= 2) {
                    const sorted = [...consumptions].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
                    const intervalsByDate = {};
                    for (let i = 1; i < sorted.length; i++) {
                        const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000 * 60 * 60);
                        if (diff >= 2) {
                            intervalsByDate[sorted[i].date] = (intervalsByDate[sorted[i].date] || 0) + 1;
                        }
                    }
                    const daysWithLongIntervals = Object.keys(intervalsByDate).length;
                    if (daysWithLongIntervals >= 5) badges.push({ id: 'long_intervals_5', title: '5 Dias com Intervalos Saudáveis', description: daysWithLongIntervals + ' dias com intervalos >2h', icon: '⏱️', color: 'green' });
                    if (daysWithLongIntervals >= 10) badges.push({ id: 'long_intervals_10', title: '10 Dias com Intervalos Saudáveis', description: daysWithLongIntervals + ' dias com intervalos >2h', icon: '🏆', color: 'green' });
                }

                // DBT reflections badge
                if (reflections.length >= 5) badges.push({ id: 'reflections_5', title: '5 Reflexões DBT', description: 'Completaste ' + reflections.length + ' reflexões', icon: '🧠', color: 'purple' });
                if (reflections.length >= 10) badges.push({ id: 'reflections_10', title: '10 Reflexões DBT', description: 'Completaste ' + reflections.length + ' reflexões', icon: '💜', color: 'purple' });
                if (reflections.length >= 20) badges.push({ id: 'reflections_20', title: '20 Reflexões DBT', description: 'Completaste ' + reflections.length + ' reflexões', icon: '🌟', color: 'purple' });

                // Wellbeing check-ins badge
                if (wellbeingLogs.length >= 7) badges.push({ id: 'wellbeing_7', title: 'Semana de Autocuidado', description: wellbeingLogs.length + ' check-ins de bem-estar', icon: '💚', color: 'blue' });
                if (wellbeingLogs.length >= 30) badges.push({ id: 'wellbeing_30', title: 'Mês de Autocuidado', description: wellbeingLogs.length + ' check-ins de bem-estar', icon: '💎', color: 'blue' });

                // Cycle tracking badge
                if (cycles.length >= 5) badges.push({ id: 'cycles_5', title: 'Rastreador Dedicado', description: cycles.length + ' ciclos marcados', icon: '🌙', color: 'indigo' });

                // Goal completion badge
                const completedGoals = goals.filter(g => getGoalProgress(g) >= 100);
                if (completedGoals.length >= 1) badges.push({ id: 'goal_1', title: 'Meta Atingida', description: completedGoals.length + ' meta(s) completa(s)', icon: '🎯', color: 'pink' });

                // Reduction badge (compare first week vs last week)
                if (consumptions.length > 0) {
                    const dates = [...new Set(consumptions.map(c => c.date))].sort();
                    if (dates.length >= 14) {
                        const firstWeekDates = dates.slice(0, 7);
                        const lastWeekDates = dates.slice(-7);
                        const firstWeekCount = consumptions.filter(c => firstWeekDates.includes(c.date)).length;
                        const lastWeekCount = consumptions.filter(c => lastWeekDates.includes(c.date)).length;
                        if (lastWeekCount < firstWeekCount) {
                            badges.push({ id: 'reduction', title: 'Redução de Consumo', description: 'Reduziste ' + (firstWeekCount - lastWeekCount) + ' consumos vs primeira semana', icon: '📉', color: 'green' });
                        }
                    }
                }

                // Consistency badge (tracked for 7 days in a row)
                if (consumptions.length > 0 || wellbeingLogs.length > 0) {
                    const allDates = [...new Set([...consumptions.map(c => c.date), ...wellbeingLogs.map(w => w.date)])].sort();
                    let streak = 1;
                    let maxStreak = 1;
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
                    if (maxStreak >= 7) badges.push({ id: 'streak_7', title: '7 Dias Consecutivos', description: 'Maior sequência: ' + maxStreak + ' dias', icon: '🔥', color: 'orange' });
                    if (maxStreak >= 14) badges.push({ id: 'streak_14', title: '14 Dias Consecutivos', description: 'Maior sequência: ' + maxStreak + ' dias', icon: '🔥', color: 'orange' });
                    if (maxStreak >= 30) badges.push({ id: 'streak_30', title: '30 Dias Consecutivos', description: 'Maior sequência: ' + maxStreak + ' dias', icon: '💪', color: 'orange' });
                }

                // Self-care champion (checked all 4 items at least once)
                const hasAllSelfCare = wellbeingLogs.some(w => w.water && w.rest && w.social && w.food);
                if (hasAllSelfCare) badges.push({ id: 'selfcare_complete', title: 'Autocuidado Completo', description: 'Completaste todos os itens de autocuidado', icon: '✨', color: 'yellow' });

                return badges;
            };

            // ===== INTELLIGENT INSIGHTS & SENTIMENT ANALYSIS =====
            // Analyze sentiment in text using keyword matching
            const analyzeSentiment = (text) => {
                if (!text || text.trim().length === 0) return { score: 0, label: 'neutro' };

                const lowerText = text.toLowerCase();

                const positiveWords = ['bem', 'melhor', 'bom', 'boa', 'feliz', 'alegre', 'calmo', 'calma', 'paz', 'tranquilo', 'tranquila', 'consegui', 'vitória', 'sucesso', 'grato', 'grata', 'esperança', 'motivado', 'motivada', 'forte', 'resiliente', 'orgulho', 'orgulhoso', 'amor', 'amado', 'amada', 'confiante', 'positivo', 'positiva', 'otimista', 'satisfeito', 'satisfeita', 'equilibrado', 'equilibrada'];

                const negativeWords = ['mal', 'pior', 'triste', 'tristeza', 'ansioso', 'ansiosa', 'ansiedade', 'medo', 'preocupado', 'preocupada', 'stress', 'stressado', 'stressada', 'irritado', 'irritada', 'frustrado', 'frustrada', 'culpa', 'culpado', 'culpada', 'vergonha', 'sozinho', 'sozinha', 'solidão', 'deprimido', 'deprimida', 'desesperado', 'desesperada', 'fraco', 'fraca', 'cansado', 'cansada', 'exausto', 'exausta', 'difícil', 'dificuldade', 'problema'];

                let positiveCount = 0;
                let negativeCount = 0;

                positiveWords.forEach(word => {
                    const regex = new RegExp('\\b' + word + '\\b', 'gi');
                    const matches = lowerText.match(regex);
                    if (matches) positiveCount += matches.length;
                });

                negativeWords.forEach(word => {
                    const regex = new RegExp('\\b' + word + '\\b', 'gi');
                    const matches = lowerText.match(regex);
                    if (matches) negativeCount += matches.length;
                });

                const score = positiveCount - negativeCount;
                let label = 'neutro';
                if (score > 1) label = 'positivo';
                else if (score < -1) label = 'negativo';

                return { score, positiveCount, negativeCount, label };
            };

            // Analyze temporal correlation with lag (e.g., sleep yesterday vs consumption today)
            const getTemporalCorrelations = () => {
                if (wellbeingLogs.length < 2 || consumptions.length < 2) return null;

                // Create daily data structure
                const dailyData = {};

                // Add wellbeing data
                wellbeingLogs.forEach(w => {
                    if (!dailyData[w.date]) dailyData[w.date] = {};
                    dailyData[w.date].sleep = w.sleep;
                    dailyData[w.date].mood = w.mood;
                    dailyData[w.date].energy = w.energy;
                });

                // Add consumption counts
                consumptions.forEach(c => {
                    if (!dailyData[c.date]) dailyData[c.date] = {};
                    dailyData[c.date].consumptions = (dailyData[c.date].consumptions || 0) + 1;
                });

                // Get sorted dates
                const dates = Object.keys(dailyData).sort();

                // Calculate lag-1 correlations (yesterday's value vs today's consumption)
                const sleepLag1Data = [];
                const moodLag1Data = [];

                for (let i = 1; i < dates.length; i++) {
                    const yesterday = dailyData[dates[i - 1]];
                    const today = dailyData[dates[i]];

                    if (yesterday.sleep && today.consumptions) {
                        sleepLag1Data.push({ yesterdaySleep: yesterday.sleep, todayConsumptions: today.consumptions });
                    }

                    if (yesterday.mood && today.consumptions) {
                        moodLag1Data.push({ yesterdayMood: yesterday.mood, todayConsumptions: today.consumptions });
                    }
                }

                return {
                    sleepLag1: {
                        correlation: calculatePearsonCorrelation(sleepLag1Data, 'yesterdaySleep', 'todayConsumptions'),
                        dataPoints: sleepLag1Data.length
                    },
                    moodLag1: {
                        correlation: calculatePearsonCorrelation(moodLag1Data, 'yesterdayMood', 'todayConsumptions'),
                        dataPoints: moodLag1Data.length
                    }
                };
            };

            // Analyze bidirectional impact: Consumo → Bem-estar (same day + next day)
            const getBidirectionalAnalysis = () => {
                if (wellbeingLogs.length < 2 || consumptions.length < 2) return null;

                // Create daily data structure
                const dailyData = {};

                // Add wellbeing data
                wellbeingLogs.forEach(w => {
                    if (!dailyData[w.date]) dailyData[w.date] = {};
                    const sleep = parseFloat(w.sleep);
                    const mood = parseInt(w.mood);
                    const energy = parseInt(w.energy);
                    if (!isNaN(sleep) && sleep > 0) dailyData[w.date].sleep = sleep;
                    if (!isNaN(mood) && mood > 0) dailyData[w.date].mood = mood;
                    if (!isNaN(energy) && energy > 0) dailyData[w.date].energy = energy;
                });

                // Add consumption counts
                consumptions.forEach(c => {
                    if (!dailyData[c.date]) dailyData[c.date] = {};
                    dailyData[c.date].consumptions = (dailyData[c.date].consumptions || 0) + 1;
                });

                // Get sorted dates
                const dates = Object.keys(dailyData).sort();

                // Same Day Impact: Today's consumption → Tonight's sleep
                const consumptionToSleepSameDay = [];
                dates.forEach(date => {
                    const day = dailyData[date];
                    if (day.consumptions && day.sleep) {
                        consumptionToSleepSameDay.push({ consumptions: day.consumptions, sleep: day.sleep });
                    }
                });

                // Same Day Impact: Morning consumption → Evening mood
                const consumptionToMoodSameDay = [];
                dates.forEach(date => {
                    const day = dailyData[date];
                    if (day.consumptions && day.mood) {
                        consumptionToMoodSameDay.push({ consumptions: day.consumptions, mood: day.mood });
                    }
                });

                // Same Day Impact: Consumption → Energy
                const consumptionToEnergySameDay = [];
                dates.forEach(date => {
                    const day = dailyData[date];
                    if (day.consumptions && day.energy) {
                        consumptionToEnergySameDay.push({ consumptions: day.consumptions, energy: day.energy });
                    }
                });

                // Next Day Impact: Today's consumption → Tomorrow's sleep
                const consumptionToSleepNextDay = [];
                for (let i = 0; i < dates.length - 1; i++) {
                    const today = dailyData[dates[i]];
                    const tomorrow = dailyData[dates[i + 1]];

                    if (today.consumptions && tomorrow.sleep) {
                        consumptionToSleepNextDay.push({ consumptions: today.consumptions, sleep: tomorrow.sleep });
                    }
                }

                // Next Day Impact: Today's consumption → Tomorrow's mood
                const consumptionToMoodNextDay = [];
                for (let i = 0; i < dates.length - 1; i++) {
                    const today = dailyData[dates[i]];
                    const tomorrow = dailyData[dates[i + 1]];

                    if (today.consumptions && tomorrow.mood) {
                        consumptionToMoodNextDay.push({ consumptions: today.consumptions, mood: tomorrow.mood });
                    }
                }

                // Next Day Impact: Today's consumption → Tomorrow's energy
                const consumptionToEnergyNextDay = [];
                for (let i = 0; i < dates.length - 1; i++) {
                    const today = dailyData[dates[i]];
                    const tomorrow = dailyData[dates[i + 1]];

                    if (today.consumptions && tomorrow.energy) {
                        consumptionToEnergyNextDay.push({ consumptions: today.consumptions, energy: tomorrow.energy });
                    }
                }

                // NEW: Sleep → Mood correlations
                // Same Day: Tonight's sleep → Mood (registered later or next morning)
                const sleepToMoodSameDay = [];
                dates.forEach(date => {
                    const day = dailyData[date];
                    if (day.sleep && day.mood) {
                        sleepToMoodSameDay.push({ sleep: day.sleep, mood: day.mood });
                    }
                });

                // Next Day: Tonight's sleep → Tomorrow's mood
                const sleepToMoodNextDay = [];
                for (let i = 0; i < dates.length - 1; i++) {
                    const today = dailyData[dates[i]];
                    const tomorrow = dailyData[dates[i + 1]];

                    if (today.sleep && tomorrow.mood) {
                        sleepToMoodNextDay.push({ sleep: today.sleep, mood: tomorrow.mood });
                    }
                }

                return {
                    sameDay: {
                        sleep: {
                            correlation: calculatePearsonCorrelation(consumptionToSleepSameDay, 'consumptions', 'sleep'),
                            dataPoints: consumptionToSleepSameDay.length
                        },
                        mood: {
                            correlation: calculatePearsonCorrelation(consumptionToMoodSameDay, 'consumptions', 'mood'),
                            dataPoints: consumptionToMoodSameDay.length
                        },
                        energy: {
                            correlation: calculatePearsonCorrelation(consumptionToEnergySameDay, 'consumptions', 'energy'),
                            dataPoints: consumptionToEnergySameDay.length
                        }
                    },
                    nextDay: {
                        sleep: {
                            correlation: calculatePearsonCorrelation(consumptionToSleepNextDay, 'consumptions', 'sleep'),
                            dataPoints: consumptionToSleepNextDay.length
                        },
                        mood: {
                            correlation: calculatePearsonCorrelation(consumptionToMoodNextDay, 'consumptions', 'mood'),
                            dataPoints: consumptionToMoodNextDay.length
                        },
                        energy: {
                            correlation: calculatePearsonCorrelation(consumptionToEnergyNextDay, 'consumptions', 'energy'),
                            dataPoints: consumptionToEnergyNextDay.length
                        }
                    },
                    sleepToMood: {
                        sameDay: {
                            correlation: calculatePearsonCorrelation(sleepToMoodSameDay, 'sleep', 'mood'),
                            dataPoints: sleepToMoodSameDay.length
                        },
                        nextDay: {
                            correlation: calculatePearsonCorrelation(sleepToMoodNextDay, 'sleep', 'mood'),
                            dataPoints: sleepToMoodNextDay.length
                        }
                    }
                };
            };

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
            const intervalStats = getIntervalStats();
            const todayCount = getTodayConsumptions().length;
            // Use the FIRST cycle (most recent, since sorted by timestamp desc)
            const currentCycle = cycles.length > 0 ? cycles[0] : null;
            const currentCycleCount = currentCycle ? consumptions.filter(c => c.cycleId === currentCycle.id || (!c.cycleId && c.timestamp >= currentCycle.timestamp)).length : 0;
            console.log('🔄 Ciclo Atual:', {
                cycleId: currentCycle?.id,
                cycleTimestamp: currentCycle?.timestamp,
                cycleDate: currentCycle ? new Date(currentCycle.timestamp).toLocaleString('pt-PT') : null,
                totalCycles: cycles.length,
                consumosNesteCiclo: currentCycleCount,
                totalConsumptions: consumptions.length,
                consumptionsWithCycleId: consumptions.filter(c => c.cycleId).length,
                consumptionsWithMatchingCycleId: consumptions.filter(c => c.cycleId === currentCycle?.id).length,
                consumptionsWithoutCycleId: consumptions.filter(c => !c.cycleId).length,
                consumptionsWithoutCycleIdAfterCycleStart: currentCycle ? consumptions.filter(c => !c.cycleId && c.timestamp >= currentCycle.timestamp).length : 0,
                first5Consumptions: consumptions.slice(0, 5).map(c => ({
                    id: c.id.substring(0, 8),
                    cycleId: c.cycleId ? c.cycleId.substring(0, 8) : 'SEM CYCLEID',
                    timestamp: c.timestamp,
                    date: new Date(c.timestamp).toLocaleString('pt-PT'),
                    matchesCycle: c.cycleId === currentCycle?.id,
                    isAfterCycleStart: currentCycle ? c.timestamp >= currentCycle.timestamp : false
                }))
            });
            // ===== PRE-RENDER DATA PREPARATION =====
            const last7 = useMemo(() => getLast7Days(), [consumptions, dailyLogs, wellbeingLogs]);
            const streaks = useMemo(() => getStreaks(), [consumptions, wellbeingLogs]);
            const badges = useMemo(() => getBadges(), [consumptions, reflections, wellbeingLogs, cycles, goals]);

            // Coping strategies based on triggers
            const getCopingStrategies = () => {
                const allTriggers = cycles.flatMap(c => c.triggers || []);
                const triggerCount = {};
                allTriggers.forEach(t => { triggerCount[t] = (triggerCount[t] || 0) + 1; });
                const topTriggers = Object.entries(triggerCount).sort((a,b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);

                const strategies = {
                    'Stress': ['Pratica respiração profunda (4-7-8)', 'Faz uma caminhada de 10 minutos', 'Ouve música relaxante'],
                    'Ansiedade': ['Nomeia 5 coisas que vês, 4 que ouves, 3 que tocas', 'Pratica grounding: pés no chão, respira fundo', 'Escreve os teus pensamentos num papel'],
                    'Solidão': ['Liga a alguém de confiança', 'Vai a um espaço público (café, biblioteca)', 'Participa numa atividade de grupo'],
                    'Festa': ['Define limite antes de sair', 'Leva alguém de confiança contigo', 'Planeia transporte seguro de volta'],
                    'Trabalho': ['Faz pausas regulares (técnica pomodoro)', 'Define prioridades claras para o dia', 'Conversa com supervisor sobre carga de trabalho'],
                    'Família': ['Estabelece limites saudáveis', 'Pratica auto-compaixão', 'Procura apoio externo (amigos, terapeuta)'],
                    'Hábito': ['Muda a tua rotina habitual', 'Substitui o comportamento (chá, exercício)', 'Identifica o gatilho antes do hábito'],
                    'Tristeza': ['Permite-te sentir sem julgamento', 'Pratica auto-cuidado básico', 'Liga para linha de apoio se necessário'],
                    'Dependência': ['Liga para linha de apoio: SOS Voz Amiga (21 354 45 45)', 'Pratica técnica HALT (com fome/zangado/sozinho/cansado?)', 'Adia 15 minutos e reavalia']
                };

                if (topTriggers.length === 0) {
                    return [
                        'Mantém-te hidratado/a ao longo do dia',
                        'Pratica mindfulness: 5 minutos de respiração consciente',
                        'Define um horário regular de sono'
                    ];
                }

                const selectedStrategies = [];
                topTriggers.forEach(trigger => {
                    if (strategies[trigger]) {
                        selectedStrategies.push(...strategies[trigger].slice(0, 1));
                    }
                });

                return selectedStrategies.length > 0 ? selectedStrategies : strategies['Stress'];
            };

            const copingStrategies = getCopingStrategies();

            // Positive daily feedback
            const getPositiveFeedback = () => {
                const messages = [];

                // Check streak
                if (streaks.current >= 7) messages.push(`🔥 Incrível! ${streaks.current} dias consecutivos de registo!`);
                else if (streaks.current >= 3) messages.push(`💪 Mantém o ritmo! ${streaks.current} dias seguidos!`);

                // Check interval quality
                if (consumptions.length >= 2) {
                    const lastInterval = getLastInterval();
                    if (lastInterval && !lastInterval.isShort) {
                        messages.push(`✨ Ótimo trabalho! Último intervalo de ${lastInterval.hours}h`);
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
            };

            const positiveFeedback = getPositiveFeedback();

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

            if (!firebaseInitialized) return (<div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4"><div className="text-purple-600 text-xl">A carregar... 🔄</div></div>);

            // ALTERAÇÃO 3: Título do login "NEP app"
            if (!user) return (<div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4"><div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full"><h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">NEP app</h1><p className="text-gray-600 mb-6">Sincroniza entre dispositivos 💜</p><form onSubmit={handleAuth} className="space-y-4"><input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400" required /><input type="password" placeholder="Password (mínimo 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400" required />{authError && (<div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{authError}</div>)}<button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium">{isLogin ? 'Entrar' : 'Criar Conta'}</button><button type="button" onClick={() => setIsLogin(!isLogin)} className="w-full text-purple-600 text-sm hover:underline">{isLogin ? 'Criar conta nova' : 'Já tenho conta'}</button></form><p className="text-xs text-gray-500 mt-6">💡 Usa o mesmo email e password no PC e telemóvel para sincronizar</p></div></div>);

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
                                            <span className={'text-2xl font-light ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>otas de</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-black text-pink-600 leading-none">E</span>
                                            <span className={'text-2xl font-light ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>xperiências e</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-black text-blue-600 leading-none">P</span>
                                            <span className={'text-2xl font-light ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>adrões</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Subtítulo e Slogan - Direita */}
                                <div className="flex flex-col items-end gap-3">
                                    <div className="text-right space-y-1">
                                        <p className={'text-sm font-medium tracking-wide ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
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

                                    <div className="flex gap-1">
                                        <button onClick={toggleDarkMode} className={(darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600') + ' p-2 rounded-lg transition-colors'} title={darkMode ? "Modo claro" : "Modo escuro"}>{darkMode ? <Icons.Sun className="w-4 h-4" /> : <Icons.Moon className="w-4 h-4" />}</button>
                                        <button onClick={exportToCSV} className={(darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600') + ' p-2 rounded-lg transition-colors'} title="Exportar dados"><Icons.Download className="w-4 h-4" /></button>
                                        <button onClick={handleLogout} className={(darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600') + ' p-2 rounded-lg transition-colors'} title="Sair"><Icons.LogOut className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={(darkMode ? 'bg-gray-800/50' : 'bg-white') + ' rounded-3xl shadow-xl p-6 mb-6'}>
                            {currentView === 'home' && (
                                <div className="space-y-6">
                                    {/* Mensagem Motivacional */}
                                    <div className={(darkMode ? 'bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-blue-900/20' : 'bg-gradient-to-r from-purple-100/50 via-pink-100/50 to-blue-100/50') + ' rounded-2xl p-5'}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                                                <span className="text-white text-sm">💜</span>
                                            </div>
                                            <span className={(darkMode ? 'text-purple-300' : 'text-purple-700') + ' text-xs font-semibold tracking-wide uppercase'}>Mensagem de Hoje</span>
                                        </div>
                                        <p className={(darkMode ? 'text-gray-200' : 'text-gray-800') + ' text-sm leading-relaxed font-medium ml-11'}>{currentReflection}</p>
                                    </div>

                                    {(() => {
                                        const alerts = [];

                                        // Check last interval
                                        const lastInterval = getLastInterval();
                                        if (lastInterval) {
                                            if (lastInterval.isShort) {
                                                // Negative alert for <2h
                                                alerts.push({
                                                    text: `Intervalo curto: ${lastInterval.hours}h`,
                                                    emoji: '⚠️',
                                                    color: 'orange',
                                                    type: 'negative'
                                                });
                                            } else if (lastInterval.hours >= 2) {
                                                // Positive alert for >=2h
                                                alerts.push({
                                                    text: `Bom intervalo! ${lastInterval.hours}h`,
                                                    emoji: '✨',
                                                    color: 'green',
                                                    type: 'positive'
                                                });
                                            }
                                        }

                                        // Check high dosage (fixed threshold >=200mg) - ONLY check the most recent log (last cycle)
                                        // Since there's only ONE log per cycle, check ONLY the most recent log
                                        const lastLog = dailyLogs
                                            .filter(l => l.mg !== undefined)
                                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

                                        if (lastLog && lastLog.mg >= 200) {
                                            const logDate = new Date(lastLog.timestamp);
                                            const isToday = lastLog.date === getTodayKey();
                                            const yesterday = new Date();
                                            yesterday.setDate(yesterday.getDate() - 1);
                                            const isYesterday = lastLog.date === yesterday.toISOString().split('T')[0];

                                            const dateLabel = isToday ? 'hoje' : isYesterday ? 'ontem' : `há ${Math.floor((new Date() - logDate) / (1000 * 60 * 60 * 24))} dias`;

                                            alerts.push({
                                                text: `Dosagem alta ${dateLabel}! (≥200mg)`,
                                                emoji: '📊',
                                                color: isToday ? 'red' : 'orange',
                                                type: 'negative'
                                            });
                                        }

                                        return alerts.length > 0 && (
                                            <div className="space-y-2">
                                                {alerts.map((alert, i) => (
                                                    <div key={i} className={'bg-gradient-to-r rounded-lg p-2 border ' + (alert.type === 'positive' ? (darkMode ? 'from-green-900/30 to-emerald-900/30 border-green-700/50' : 'from-green-50 to-emerald-50 border-green-200') : alert.color === 'orange' ? (darkMode ? 'from-orange-900/30 to-yellow-900/30 border-orange-700/50' : 'from-orange-50 to-yellow-50 border-orange-200') : (darkMode ? 'from-red-900/30 to-pink-900/30 border-red-700/50' : 'from-red-50 to-pink-50 border-red-200'))}>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm">{alert.emoji}</span>
                                                            <span className={'text-xs font-medium ' + (alert.type === 'positive' ? (darkMode ? 'text-green-400' : 'text-green-700') : alert.color === 'orange' ? (darkMode ? 'text-orange-400' : 'text-orange-700') : (darkMode ? 'text-red-400' : 'text-red-700'))}>{alert.text}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}

                                    <button onClick={markConsumption} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl p-8 text-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl flex flex-col items-center"><Icons.Clock className="w-6 h-6" /><div className="mt-2">Marcar Consumo Agora</div></button>

                                    {(() => {
                                        const timeSince = getTimeSinceLastConsumption();
                                        if (timeSince) {
                                            const isLong = timeSince.hours >= 2;
                                            return (
                                                <div className="flex justify-center -mt-2">
                                                    <div className={'bg-gradient-to-r rounded-full px-4 py-1.5 border inline-flex items-center gap-2 ' + (isLong ? (darkMode ? 'from-green-900/40 to-blue-900/40 border-green-700/50' : 'from-green-50 to-blue-50 border-green-200') : (darkMode ? 'from-yellow-900/40 to-orange-900/40 border-yellow-700/50' : 'from-yellow-50 to-orange-50 border-yellow-200'))}>
                                                        <span className={'text-xs font-medium ' + (isLong ? (darkMode ? 'text-green-400' : 'text-green-700') : (darkMode ? 'text-yellow-400' : 'text-yellow-700'))}>Sem consumir há</span>
                                                        <span className={'text-sm font-bold ' + (isLong ? (darkMode ? 'text-green-300' : 'text-green-900') : (darkMode ? 'text-yellow-300' : 'text-yellow-900'))}>
                                                            {timeSince.value}{timeSince.unit}
                                                            {timeSince.subValue && <span className="text-xs ml-0.5">{timeSince.subValue}{timeSince.subUnit}</span>}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}

                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => setShowDailyLogModal(true)} className="bg-gradient-to-br from-pink-500 to-rose-500 text-white rounded-xl p-4 font-medium hover:from-pink-600 hover:to-rose-600 transition-all shadow-md hover:shadow-lg flex flex-col items-center">
                                            <Icons.BarChart3 className="w-5 h-5 mb-2" />
                                            <div className="text-sm">Registar Dosagem do Dia</div>
                                        </button>
                                        <button onClick={() => setShowWellbeingModal(true)} className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl p-4 font-medium hover:from-blue-600 hover:to-cyan-600 transition-all shadow-md hover:shadow-lg flex flex-col items-center">
                                            <Icons.Heart className="w-5 h-5 mb-2" />
                                            <div className="text-sm">Check-in Bem-Estar</div>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => setShowReflectionModal(true)} className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white rounded-xl p-4 font-medium hover:from-purple-600 hover:to-indigo-600 transition-all shadow-md hover:shadow-lg flex flex-col items-center">
                                            <Icons.Brain className="w-5 h-5 mb-2" />
                                            <div className="text-sm">Reflexão DBT</div>
                                        </button>
                                        <button onClick={() => setShowCycleModal(true)} className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-xl p-4 font-medium hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg flex flex-col items-center">
                                            <div className="text-xl mb-1">🌙</div>
                                            <div className="text-sm">Novo Ciclo</div>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className={(darkMode ? 'bg-gradient-to-br from-purple-900/20 to-purple-800/10' : 'bg-gradient-to-br from-purple-50 to-purple-100/50') + ' rounded-xl p-3'}>
                                            <div className={(darkMode ? 'text-purple-400' : 'text-purple-600') + ' text-xs font-medium mb-1'}>Este Ciclo</div>
                                            <div className="flex items-baseline gap-1">
                                                <span className={'text-2xl font-black ' + (darkMode ? 'text-purple-300' : 'text-purple-600')}>{currentCycleCount}</span>
                                                <span className={(darkMode ? 'text-purple-400' : 'text-purple-500') + ' text-sm font-medium'}>x</span>
                                            </div>
                                        </div>
                                        <div className={(darkMode ? 'bg-gradient-to-br from-pink-900/20 to-pink-800/10' : 'bg-gradient-to-br from-pink-50 to-pink-100/50') + ' rounded-xl p-3'}>
                                            <div className={(darkMode ? 'text-pink-400' : 'text-pink-600') + ' text-xs font-medium mb-1'}>Média 7 dias</div>
                                            <div className="flex items-baseline gap-1">
                                                <span className={'text-2xl font-black ' + (darkMode ? 'text-pink-300' : 'text-pink-600')}>{last7.avgTimes}</span>
                                                <span className={(darkMode ? 'text-pink-400' : 'text-pink-500') + ' text-sm font-medium'}>x</span>
                                            </div>
                                            <div className={(darkMode ? 'text-pink-500' : 'text-pink-400') + ' text-xs font-medium mt-0.5'}>{last7.avgMg}mg/dia</div>
                                        </div>
                                    </div>


                                    <div className={(darkMode ? 'bg-gradient-to-br from-blue-900/20 to-cyan-900/20' : 'bg-gradient-to-r from-blue-50 to-cyan-50') + ' rounded-xl p-4'}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-xl">💡</span>
                                            <h3 className={'font-semibold ' + (darkMode ? 'text-blue-300' : 'text-gray-800')}>Estratégias para Hoje</h3>
                                        </div>
                                        <div className="space-y-2">
                                            {copingStrategies.map((strategy, i) => (
                                                <div key={i} className={'flex items-start gap-2 text-sm p-2.5 rounded-lg ' + (darkMode ? 'text-gray-200 bg-blue-950/30' : 'text-gray-700 bg-white/80')}>
                                                    <span className={(darkMode ? 'text-cyan-400' : 'text-blue-500') + ' font-bold'}>•</span>
                                                    <span>{strategy}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {cycles.length > 0 && cycles.some(c => c.triggers && c.triggers.length > 0) && (
                                            <div className={'text-xs mt-3 italic ' + (darkMode ? 'text-cyan-400' : 'text-blue-600')}>Baseado nos teus gatilhos identificados</div>
                                        )}
                                    </div>

                                    {/* Conquistas */}
                                    {badges.length > 0 && (
                                        <div className={(darkMode ? 'bg-gradient-to-br from-yellow-900/30 via-orange-900/20 to-amber-900/30 border-yellow-700/50' : 'bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 border-yellow-300') + ' rounded-xl p-4 border-2'}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="text-2xl">🏆</div>
                                                <div>
                                                    <h3 className={'font-bold ' + (darkMode ? 'text-yellow-300' : 'text-yellow-800')}>Conquistas</h3>
                                                    <p className={'text-xs ' + (darkMode ? 'text-yellow-400/70' : 'text-yellow-700/70')}>{badges.length + (streaks.current >= 3 ? 1 : 0)} vitórias</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {badges.slice(0, 4).map(badge => (
                                                    <div key={badge.id} className={(darkMode ? 'bg-gradient-to-br from-gray-800/80 to-gray-700/80 border-gray-600' : 'bg-gradient-to-br from-white to-gray-50 border-' + badge.color + '-300') + ' rounded-lg p-3 border flex items-center gap-2'}>
                                                        <div className="text-xl">{badge.icon}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={'font-bold text-xs truncate ' + (darkMode ? 'text-gray-100' : 'text-' + badge.color + '-800')}>{badge.title}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {streaks.current >= 3 && (
                                                    <div className={(darkMode ? 'bg-gradient-to-br from-orange-900/80 to-red-900/80 border-orange-600' : 'bg-gradient-to-br from-orange-100 to-red-100 border-orange-300') + ' rounded-lg p-3 border flex items-center gap-2'}>
                                                        <div className="text-xl">💪</div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={'font-bold text-xs ' + (darkMode ? 'text-orange-300' : 'text-orange-800')}>Streak! {streaks.current} dias</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}


                                    {consumptions.length > 0 && (
                                        <div className={(darkMode ? 'bg-gradient-to-br from-purple-900/20 to-pink-900/20' : 'bg-white') + ' rounded-xl p-4'}>
                                            <h3 className={'font-semibold mb-3 ' + (darkMode ? 'text-purple-300' : 'text-gray-800')}>Consumos Recentes</h3>
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {consumptions.slice(0, consumptionsToShow).map(c => (
                                                    <div key={c.id} className={'flex items-center justify-between py-2.5 px-3 rounded-lg ' + (darkMode ? 'bg-purple-950/30' : 'bg-gray-50')}>
                                                        <div className="flex-1">
                                                            <div className={'text-sm font-medium ' + (darkMode ? 'text-gray-200' : 'text-gray-800')}>
                                                                {new Date(c.timestamp).toLocaleDateString('pt-PT')} - {new Date(c.timestamp).toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}
                                                            </div>
                                                            {c.notes && <div className={'text-xs mt-1 ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>{c.notes}</div>}
                                                        </div>
                                                        <div className="flex gap-2 ml-2">
                                                            <button onClick={() => openEditConsumption(c)} className={(darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-600')}><Icons.Edit className="w-4 h-4" /></button>
                                                            <button onClick={() => deleteItem('consumptions', c.id)} className={(darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-600')}><Icons.Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {consumptions.length > consumptionsToShow && (
                                                <button onClick={() => setConsumptionsToShow(prev => prev + 20)} className={(darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700') + ' text-sm font-medium mt-3 w-full py-2'}>
                                                    Ver mais ({consumptions.length - consumptionsToShow} restantes)
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            {currentView === 'patterns' && (
                                <div className="space-y-6">
                                    <h2 className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>Padrões</h2>

                                    {/* Temporal Filters */}
                                    <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-4 border'}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex gap-2 flex-wrap">
                                                {['hoje', 'semana', 'mes', 'tudo'].map(period => (
                                                    <button key={period} onClick={() => { setPatternsPeriod(period); setPatternsPeriodOffset(0); }} className={'px-4 py-2 rounded-lg font-medium transition-colors text-sm ' + (patternsPeriod === period ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                                        {period === 'hoje' && '📅 Hoje'}
                                                        {period === 'semana' && '📊 Semana'}
                                                        {period === 'mes' && '📈 Mês'}
                                                        {period === 'tudo' && '🌐 Tudo'}
                                                    </button>
                                                ))}
                                            </div>
                                            {patternsPeriod !== 'tudo' && (
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setPatternsPeriodOffset(patternsPeriodOffset + 1)} className={'text-purple-600 p-2 rounded-lg transition-colors ' + (darkMode ? 'hover:bg-gray-700' : 'hover:bg-purple-50')}>
                                                        <Icons.ChevronLeft className="w-5 h-5" />
                                                    </button>
                                                    <span className={'text-sm font-medium min-w-[120px] text-center ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>{getPeriodLabel(patternsPeriod, patternsPeriodOffset)}</span>
                                                    <button onClick={() => setPatternsPeriodOffset(Math.max(0, patternsPeriodOffset - 1))} disabled={patternsPeriodOffset === 0} className={'p-2 rounded-lg transition-colors ' + (patternsPeriodOffset === 0 ? (darkMode ? 'text-gray-600' : 'text-gray-300') + ' cursor-not-allowed' : 'text-purple-600 ' + (darkMode ? 'hover:bg-gray-700' : 'hover:bg-purple-50'))}>
                                                        <Icons.ChevronRight className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>


                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {['dashboard', 'progress', 'coach'].map(view => (
                                            <button key={view} onClick={() => setPatternView(view)} className={'px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ' + (patternView === view ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                                {view === 'dashboard' && '📊 Dashboard'}
                                                {view === 'progress' && '📈 Progresso'}
                                                {view === 'coach' && '💬 Coach'}
                                            </button>
                                        ))}
                                    </div>

                                    {(() => {
                                        // Apply temporal filter to all data
                                        const dateRange = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);
                                        console.log('🔬 Análises - Filtro Temporal:', {
                                            period: patternsPeriod,
                                            offset: patternsPeriodOffset,
                                            dateRange: dateRange,
                                            view: patternView
                                        });

                                        const filteredConsumptions = filterByDateRange(consumptions, dateRange);
                                        const filteredWellbeingLogs = filterByDateRange(wellbeingLogs, dateRange);
                                        const filteredCycles = filterByDateRange(cycles, dateRange);
                                        const filteredDailyLogs = filterByDateRange(dailyLogs, dateRange);

                                        console.log('📊 Análises - Dados filtrados:', {
                                            consumos: filteredConsumptions.length,
                                            bemEstar: filteredWellbeingLogs.length,
                                            ciclos: filteredCycles.length,
                                            dailyLogs: filteredDailyLogs.length
                                        });

                                        // DASHBOARD (COMPACTO)
                                        if (patternView === 'dashboard') {
                                            if (filteredConsumptions.length === 0 && filteredWellbeingLogs.length === 0) return (<div className={(darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500') + ' rounded-xl p-6 border text-center'}>Sem dados para este período</div>);

                                            // Calculate metrics
                                            const totalConsumptions = filteredConsumptions.length;
                                            const byDate = {};
                                            filteredConsumptions.forEach(c => { byDate[c.date] = (byDate[c.date] || 0) + 1; });
                                            const uniqueDays = Object.keys(byDate).length;
                                            const avgPerDay = uniqueDays > 0 ? (totalConsumptions / uniqueDays).toFixed(1) : 0;

                                            // Calculate average interval
                                            const sorted = [...filteredConsumptions].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
                                            const intervals = [];
                                            for (let i = 1; i < sorted.length; i++) {
                                                const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000 * 60 * 60);
                                                intervals.push(diff);
                                            }
                                            const avgInterval = intervals.length > 0 ? (intervals.reduce((sum, i) => sum + i, 0) / intervals.length).toFixed(1) : 0;

                                            // Get dates for calendar
                                            const dates = Object.keys(byDate).sort();

                                            // By part of day
                                            const byPartOfDay = { manha: 0, tarde: 0, noite: 0, madrugada: 0 };
                                            filteredConsumptions.forEach(c => {
                                                const hour = new Date(c.timestamp).getHours();
                                                if (hour >= 6 && hour < 12) byPartOfDay.manha++;
                                                else if (hour >= 12 && hour < 18) byPartOfDay.tarde++;
                                                else if (hour >= 18 && hour < 24) byPartOfDay.noite++;
                                                else byPartOfDay.madrugada++;
                                            });

                                            // Generate insights
                                            const insights = [];

                                            // Best day insight (excluir o dia de hoje exceto quando filtrado por "dia")
                                            if (dates.length > 0) {
                                                const today = new Date().toISOString().split('T')[0];
                                                const completedDates = patternsPeriod === 'hoje' ? dates : dates.filter(d => d !== today);
                                                if (completedDates.length > 0) {
                                                    const sortedDates = completedDates.sort((a, b) => byDate[a] - byDate[b]);
                                                    const bestDate = sortedDates[0];
                                                    const bestCount = byDate[bestDate];
                                                    const bestDayName = new Date(bestDate).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'short' });
                                                    const prefix = completedDates.length === 1 ? 'Neste dia registaste' : 'Teu melhor dia foi';
                                                    insights.push({
                                                        text: `${prefix} ${bestDayName} com ${bestCount === 1 ? 'apenas 1 consumo' : `${bestCount} consumos`}. ${bestCount <= 2 ? 'Identifica o que funcionou! ⭐' : 'Continua a melhorar! 💪'}`,
                                                        type: 'positive'
                                                    });
                                                }
                                            }

                                            // Time pattern insight
                                            const maxPartOfDay = Object.entries(byPartOfDay).reduce((max, curr) => curr[1] > max[1] ? curr : max, ['', 0]);
                                            if (maxPartOfDay[1] > 0) {
                                                const partNames = { manha: 'manhã', tarde: 'tarde', noite: 'noite', madrugada: 'madrugada' };
                                                const percentage = ((maxPartOfDay[1] / filteredConsumptions.length) * 100).toFixed(0);
                                                insights.push({
                                                    text: `Padrão identificado: ${percentage}% dos consumos ocorrem à ${partNames[maxPartOfDay[0]]}. Prepara estratégias para esse período. 🎯`,
                                                    type: 'info'
                                                });
                                            }

                                            // Calculate goals analysis for dashboard
                                            let goalsAnalysis = null;
                                            if (goals.length > 0) {
                                                const periodDays = patternsPeriod === 'hoje' ? 1 :
                                                                 patternsPeriod === 'semana' ? 7 :
                                                                 patternsPeriod === 'mes' ? 30 :
                                                                 uniqueDays || 1;

                                                const totalAchievements = goals.reduce((sum, g) => sum + getGoalAchievementCount(g, filteredConsumptions, filteredDailyLogs, filteredCycles, filteredWellbeingLogs), 0);

                                                const goalBreakdown = goals.map(g => {
                                                    const achievementCount = getGoalAchievementCount(g, filteredConsumptions, filteredDailyLogs, filteredCycles, filteredWellbeingLogs);

                                                    // Calculate total possible based on goal type
                                                    let totalPossible = 0;

                                                    if (g.type === 'increase_interval') {
                                                        // For increase_interval: count days with ≥2 consumptions (need at least 2 to have intervals)
                                                        const today = new Date().toLocaleDateString('pt-PT');
                                                        const consumptionsByDate = {};
                                                        filteredConsumptions.forEach(c => {
                                                            const dateKey = new Date(c.timestamp).toLocaleDateString('pt-PT');
                                                            if (dateKey === today) return; // Skip today
                                                            if (!consumptionsByDate[dateKey]) consumptionsByDate[dateKey] = [];
                                                            consumptionsByDate[dateKey].push(c);
                                                        });
                                                        totalPossible = Object.values(consumptionsByDate).filter(arr => arr.length >= 2).length;
                                                    } else if (g.type === 'limit_last') {
                                                        // For limit_last: count all cycles
                                                        totalPossible = filteredCycles.length;
                                                    } else {
                                                        // For day-based goals: count unique days (excluding today)
                                                        const today = new Date().toLocaleDateString('pt-PT');
                                                        const allDates = new Set();

                                                        if (g.type === 'reduce_frequency' || g.type === 'delay_first') {
                                                            filteredConsumptions.forEach(c => {
                                                                const dateKey = new Date(c.timestamp).toLocaleDateString('pt-PT');
                                                                if (dateKey !== today) allDates.add(dateKey);
                                                            });
                                                        } else if (g.type === 'reduce_quantity') {
                                                            filteredDailyLogs.forEach(log => {
                                                                const dateKey = new Date(log.timestamp).toLocaleDateString('pt-PT');
                                                                if (dateKey !== today) allDates.add(dateKey);
                                                            });
                                                        } else if (g.type === 'sleep_hours' || g.type === 'bedtime_before') {
                                                            filteredWellbeingLogs.forEach(log => {
                                                                const dateKey = new Date(log.timestamp).toLocaleDateString('pt-PT');
                                                                if (dateKey !== today) allDates.add(dateKey);
                                                            });
                                                        }

                                                        totalPossible = allDates.size;
                                                    }

                                                    const successRate = totalPossible > 0 ? (achievementCount / totalPossible) * 100 : 0;

                                                    return {
                                                        ...g,
                                                        achievementCount,
                                                        totalPossible,
                                                        successRate
                                                    };
                                                });

                                                const avgAchievementsPerDay = periodDays > 0 ? totalAchievements / periodDays : 0;
                                                const goalsWithAchievements = goalBreakdown.filter(g => g.achievementCount > 0).length;

                                                goalsAnalysis = {
                                                    totalAchievements,
                                                    totalGoals: goals.length,
                                                    avgAchievementsPerDay: avgAchievementsPerDay.toFixed(1),
                                                    goalsWithAchievements,
                                                    goalBreakdown,
                                                    activeGoals: goals.filter(g => !g.completed).length,
                                                    periodDays
                                                };
                                            }

                                            return (
                                                <div className="space-y-4">
                                                    {/* Mini-resumo contextual */}
                                                    <div className={(darkMode ? 'bg-indigo-900/30 border-indigo-700/50' : 'bg-indigo-50 border-indigo-200') + ' rounded-lg p-4 border'}>
                                                        <p className={'text-sm leading-relaxed ' + (darkMode ? 'text-gray-200' : 'text-gray-700')}>
                                                            {`Tiveste ${totalConsumptions} ${totalConsumptions === 1 ? 'consumo' : 'consumos'} (média ${avgPerDay}/dia).${avgInterval > 0 ? ` Intervalo médio: ${avgInterval}h.` : ''}`}
                                                        </p>
                                                    </div>

                                                    {/* Métricas essenciais */}
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className={(darkMode ? 'bg-purple-900/30 border border-purple-700/50' : 'bg-purple-50 border-purple-200') + ' rounded-lg p-4 text-center border'}>
                                                            <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>Total</div>
                                                            <div className={(darkMode ? 'text-purple-400' : 'text-purple-600') + ' text-2xl font-bold'}>{totalConsumptions}x</div>
                                                        </div>
                                                        <div className={(darkMode ? 'bg-blue-900/30 border border-blue-700/50' : 'bg-blue-50 border-blue-200') + ' rounded-lg p-4 text-center border'}>
                                                            <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>Média/dia</div>
                                                            <div className={(darkMode ? 'text-blue-400' : 'text-blue-600') + ' text-2xl font-bold'}>{avgPerDay}</div>
                                                        </div>
                                                        <div className={(darkMode ? 'bg-green-900/30 border border-green-700/50' : 'bg-green-50 border-green-200') + ' rounded-lg p-4 text-center border'}>
                                                            <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>Intervalo médio</div>
                                                            <div className={(darkMode ? 'text-green-400' : 'text-green-600') + ' text-2xl font-bold'}>{avgInterval}h</div>
                                                        </div>
                                                    </div>

                                                    {/* Insights Summary */}
                                                    {insights.length > 0 && (
                                                        <div className={(darkMode ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-700/50' : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200') + ' rounded-xl p-6 border'}>
                                                            <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-4 flex items-center gap-2'}>
                                                                <span className="text-xl">💡</span>
                                                                Padrões Identificados
                                                            </h3>
                                                            <div className="space-y-3">
                                                                {insights.map((insight, i) => (
                                                                    <div key={i} className={'flex items-start gap-3 p-3 rounded-lg ' + (darkMode ? 'bg-gray-700/50 border-gray-600' : insight.type === 'positive' ? 'bg-green-50 border border-green-200' : insight.type === 'neutral' ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200')}>
                                                                        <div className={'flex-1 text-sm leading-relaxed ' + (darkMode ? 'text-gray-200' : insight.type === 'positive' ? 'text-green-800' : insight.type === 'neutral' ? 'text-orange-800' : 'text-blue-800')}>
                                                                            {insight.text}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Análise de Metas */}
                                                    {goalsAnalysis && (
                                                        <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                                🎯 Metas
                                                            </h3>

                                                            {/* Main stats */}
                                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                                <div className={(darkMode ? 'bg-gradient-to-br from-pink-900/30 to-purple-900/30 border-pink-700/50' : 'bg-gradient-to-br from-pink-50 to-purple-50 border-pink-200') + ' rounded-lg p-4 border'}>
                                                                    <div className={'text-xs font-semibold mb-1 uppercase tracking-wide ' + (darkMode ? 'text-pink-400' : 'text-pink-700')}>
                                                                        Total de Cumprimentos
                                                                    </div>
                                                                    <div className="flex items-baseline gap-1">
                                                                        <span className={'text-3xl font-black ' + (darkMode ? 'text-pink-400' : 'text-pink-600')}>
                                                                            {goalsAnalysis.totalAchievements}
                                                                        </span>
                                                                        <span className={'text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                            vezes
                                                                        </span>
                                                                    </div>
                                                                    <div className={'text-xs mt-1 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                        {goalsAnalysis.goalsWithAchievements}/{goalsAnalysis.totalGoals} metas cumpridas
                                                                    </div>
                                                                </div>

                                                                <div className={(darkMode ? 'bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border-blue-700/50' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200') + ' rounded-lg p-4 border'}>
                                                                    <div className={'text-xs font-semibold mb-1 uppercase tracking-wide ' + (darkMode ? 'text-blue-400' : 'text-blue-700')}>
                                                                        Média por Dia
                                                                    </div>
                                                                    <div className="flex items-baseline gap-1">
                                                                        <span className={'text-3xl font-black ' + (darkMode ? 'text-blue-400' : 'text-blue-600')}>
                                                                            {goalsAnalysis.avgAchievementsPerDay}
                                                                        </span>
                                                                        <span className={'text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                            cumprimentos
                                                                        </span>
                                                                    </div>
                                                                    <div className={'text-xs mt-1 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                        nos últimos {goalsAnalysis.periodDays} dias
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Per-goal breakdown */}
                                                            <div className={(darkMode ? 'bg-gray-700/30' : 'bg-gray-50') + ' rounded-lg p-4'}>
                                                                <div className={'text-xs font-semibold mb-3 uppercase tracking-wide ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                    Detalhes por Meta
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {goalsAnalysis.goalBreakdown.map((goal, i) => {
                                                                        const goalTypeLabels = {
                                                                            'reduce_frequency': '🔢 Reduzir frequência',
                                                                            'reduce_quantity': '⚖️ Reduzir quantidade',
                                                                            'delay_first': '⏰ Adiar primeiro consumo',
                                                                            'limit_last': '🌙 Limitar último consumo',
                                                                            'increase_interval': '⏳ Aumentar intervalo',
                                                                            'sleep_hours': '😴 Horas de sono',
                                                                            'bedtime_before': '🛏️ Deitar antes de'
                                                                        };
                                                                        const explanations = {
                                                                            'reduce_frequency': `Dias com <${goal.target} consumos`,
                                                                            'reduce_quantity': `Dias com <${goal.target}mg`,
                                                                            'delay_first': `Dias com 1º consumo ≥${goal.target}`,
                                                                            'limit_last': `Ciclos com último antes da meia-noite`,
                                                                            'increase_interval': `Dias com ≥50% intervalos >${goal.target}h`,
                                                                            'sleep_hours': `Noites com ≥${goal.target}h de sono`,
                                                                            'bedtime_before': `Noites a dormir antes de ${goal.target}`
                                                                        };
                                                                        return (
                                                                            <div key={i} className={(darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-white border-gray-200') + ' rounded-lg p-3 border'}>
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <div className="flex-1">
                                                                                        <div className={'text-sm font-medium mb-1 ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                                                            {goalTypeLabels[goal.type] || goal.type}
                                                                                        </div>
                                                                                        <div className={'text-xs italic ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                                            {explanations[goal.type] || 'Cumprimentos registados'} - Meta: {goal.type === 'increase_interval' ? '50%' : goal.target + (goal.type === 'reduce_frequency' ? 'x/dia' : goal.type === 'reduce_quantity' ? 'mg' : goal.type === 'sleep_hours' ? 'h' : '')}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-right">
                                                                                        <div className={'text-2xl font-black ' + (goal.achievementCount > 0 ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-gray-500' : 'text-gray-400'))}>
                                                                                            {goal.achievementCount}
                                                                                        </div>
                                                                                        <div className={'text-xs ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                            vezes
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                {/* Progress Bar */}
                                                                                <div>
                                                                                    <div className="flex items-center justify-between mb-1">
                                                                                        <span className={'text-xs font-medium ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                                            {goal.achievementCount} / {goal.totalPossible}
                                                                                        </span>
                                                                                        <span className={'text-xs font-bold ' + (goal.successRate >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') : goal.successRate >= 40 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>
                                                                                            {goal.successRate.toFixed(0)}%
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className={(darkMode ? 'bg-gray-600' : 'bg-gray-200') + ' rounded-full h-2 overflow-hidden'}>
                                                                                        <div
                                                                                            className={'h-full transition-all duration-500 ' + (goal.successRate >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : goal.successRate >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-orange-500 to-red-500')}
                                                                                            style={{width: `${Math.min(100, goal.successRate)}%`}}
                                                                                        ></div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Mini Calendar (dinâmico baseado no filtro) */}
                                                    <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border relative'}>
                                                        <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-4'}>
                                                            📅 {patternsPeriod === 'hoje' ? 'Hoje' : patternsPeriod === 'semana' ? 'Esta Semana' : patternsPeriod === 'mes' ? 'Este Mês' : 'Todo o Período'}
                                                        </h3>
                                                        <div className="space-y-2 max-h-[400px] overflow-y-auto" style={{scrollbarWidth: 'thin'}}>
                                                            {dates.reverse().map(date => {
                                                                const count = byDate[date];
                                                                const dayConsumptions = filteredConsumptions.filter(c => c.date === date).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
                                                                return (
                                                                    <div key={date} className={(darkMode ? 'border-gray-700' : 'border-gray-200') + ' border rounded-lg p-3'}>
                                                                        <div className="flex justify-between items-center mb-2">
                                                                            <div className={'text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-800')}>{new Date(date).toLocaleDateString('pt-PT', {weekday: 'short', day: '2-digit', month: 'short'})}</div>
                                                                            <div className={'text-lg font-bold ' + (count >= 10 ? (darkMode ? 'text-red-400' : 'text-red-600') : count > 6 ? (darkMode ? 'text-orange-400' : 'text-orange-600') : count > 3 ? (darkMode ? 'text-yellow-500' : 'text-yellow-600') : (darkMode ? 'text-green-400' : 'text-green-600'))}>{count}x</div>
                                                                        </div>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {dayConsumptions.map((c, i) => (
                                                                                <span key={i} className={'text-xs px-2 py-1 rounded ' + (darkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700')}>{new Date(c.timestamp).toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}</span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {dates.length > 3 && (
                                                            <div className={'absolute bottom-2 left-1/2 transform -translate-x-1/2 pointer-events-none ' + (darkMode ? 'text-purple-400' : 'text-purple-600')}>
                                                                <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        // ANÁLISE DE PROGRESSO TEMPORAL
                                        if (patternView === 'progress') {
                                            // Define two periods to compare: recent vs previous
                                            const now = new Date();
                                            let recentStart, recentEnd, previousStart, previousEnd, periodDays;

                                            if (patternsPeriod === 'hoje') {
                                                // HOJE: Comparar dia atual (até agora) vs dia anterior (completo)
                                                // Dia atual: 00:00:00 de hoje → agora
                                                recentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                                                recentEnd = now;

                                                // Dia anterior: 00:00:00 ontem → 23:59:59 ontem
                                                previousStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
                                                previousEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
                                                periodDays = 1;
                                            } else if (patternsPeriod === 'semana') {
                                                // SEMANA: Esta semana vs semana anterior
                                                periodDays = 7;
                                                recentStart = new Date(now);
                                                recentStart.setDate(now.getDate() - periodDays);
                                                recentEnd = now;

                                                previousStart = new Date(now);
                                                previousStart.setDate(now.getDate() - (periodDays * 2));
                                                previousEnd = recentStart;
                                            } else if (patternsPeriod === 'mes') {
                                                // MÊS: Este mês vs mês anterior
                                                periodDays = 30;
                                                recentStart = new Date(now);
                                                recentStart.setDate(now.getDate() - periodDays);
                                                recentEnd = now;

                                                previousStart = new Date(now);
                                                previousStart.setDate(now.getDate() - (periodDays * 2));
                                                previousEnd = recentStart;
                                            } else {
                                                // TUDO: Últimos 30 dias vs 30 dias anteriores
                                                periodDays = 30;
                                                recentStart = new Date(now);
                                                recentStart.setDate(now.getDate() - periodDays);
                                                recentEnd = now;

                                                previousStart = new Date(now);
                                                previousStart.setDate(now.getDate() - (periodDays * 2));
                                                previousEnd = recentStart;
                                            }

                                            // Filter data for both periods
                                            const recentConsumptions = consumptions.filter(c => {
                                                const d = new Date(c.timestamp);
                                                return d >= recentStart && d <= recentEnd;
                                            });
                                            const previousConsumptions = consumptions.filter(c => {
                                                const d = new Date(c.timestamp);
                                                return d >= previousStart && d <= previousEnd;
                                            });

                                            const recentWellbeing = wellbeingLogs.filter(w => {
                                                const d = new Date(w.timestamp);
                                                return d >= recentStart && d <= recentEnd;
                                            });
                                            const previousWellbeing = wellbeingLogs.filter(w => {
                                                const d = new Date(w.timestamp);
                                                return d >= previousStart && d <= previousEnd;
                                            });

                                            const recentCycles = cycles.filter(c => {
                                                const d = new Date(c.timestamp);
                                                return d >= recentStart && d <= recentEnd;
                                            });
                                            const previousCycles = cycles.filter(c => {
                                                const d = new Date(c.timestamp);
                                                return d >= previousStart && d <= previousEnd;
                                            });

                                            // Helper to calculate change percentage and direction
                                            const calculateChange = (recent, previous, lowerIsBetter = true) => {
                                                // Se ambos são 0, não há mudança
                                                if (previous === 0 && recent === 0) return { percent: 0, direction: 'stable', isImprovement: false };

                                                // Se previous é 0 mas há dados recentes, tratar como dados novos
                                                if (previous === 0 && recent > 0) {
                                                    // Não podemos calcular % de mudança, mas consideramos como "up" (começou a registar)
                                                    return { percent: 100, direction: 'up', isImprovement: false, rawChange: recent, isNew: true };
                                                }

                                                // Se previous > 0 mas recent é 0, tudo parou
                                                if (previous > 0 && recent === 0) {
                                                    return { percent: 100, direction: 'down', isImprovement: lowerIsBetter, rawChange: -previous };
                                                }

                                                // Caso normal: ambos têm valores
                                                const change = ((recent - previous) / previous) * 100;
                                                const direction = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
                                                const isImprovement = lowerIsBetter ? change < 0 : change > 0;
                                                return { percent: Math.abs(change), direction, isImprovement, rawChange: change };
                                            };

                                            const progressData = {};

                                            // 1. CONSUMO - Frequência
                                            if (recentConsumptions.length > 0 || previousConsumptions.length > 0) {
                                                // Group by date to get daily frequency
                                                const recentByDate = {};
                                                recentConsumptions.forEach(c => { recentByDate[c.date] = (recentByDate[c.date] || 0) + 1; });
                                                const previousByDate = {};
                                                previousConsumptions.forEach(c => { previousByDate[c.date] = (previousByDate[c.date] || 0) + 1; });

                                                const recentAvgFreq = Object.keys(recentByDate).length > 0 ? recentConsumptions.length / Object.keys(recentByDate).length : 0;
                                                const previousAvgFreq = Object.keys(previousByDate).length > 0 ? previousConsumptions.length / Object.keys(previousByDate).length : 0;

                                                progressData.frequency = {
                                                    recent: recentAvgFreq,
                                                    previous: previousAvgFreq,
                                                    change: calculateChange(recentAvgFreq, previousAvgFreq, true),
                                                    label: 'Frequência média diária'
                                                };
                                            }

                                            // 2. CONSUMO - Dosagem (from dailyLogs)
                                            const recentDailyLogs = dailyLogs.filter(d => {
                                                const date = new Date(d.date);
                                                return date >= recentStart && date <= recentEnd;
                                            });
                                            const previousDailyLogs = dailyLogs.filter(d => {
                                                const date = new Date(d.date);
                                                return date >= previousStart && date < previousEnd;
                                            });

                                            if (recentDailyLogs.length > 0 || previousDailyLogs.length > 0) {
                                                const recentLogsWithDosage = recentDailyLogs.filter(d => d.mg && d.mg > 0);
                                                const previousLogsWithDosage = previousDailyLogs.filter(d => d.mg && d.mg > 0);

                                                // Média dos dias em que houve registo de dosagem
                                                const recentAvgDosage = recentLogsWithDosage.length > 0
                                                    ? recentLogsWithDosage.reduce((sum, d) => sum + d.mg, 0) / recentLogsWithDosage.length
                                                    : 0;
                                                const previousAvgDosage = previousLogsWithDosage.length > 0
                                                    ? previousLogsWithDosage.reduce((sum, d) => sum + d.mg, 0) / previousLogsWithDosage.length
                                                    : 0;

                                                progressData.dosage = {
                                                    recent: recentAvgDosage,
                                                    previous: previousAvgDosage,
                                                    change: calculateChange(recentAvgDosage, previousAvgDosage, true),
                                                    label: 'Dosagem média diária'
                                                };
                                            }

                                            // 3. BEM-ESTAR - Sono
                                            const recentSleepLogs = recentWellbeing.filter(w => w.sleep !== undefined && w.sleep !== null && w.sleep !== '' && !isNaN(parseFloat(w.sleep)));
                                            const previousSleepLogs = previousWellbeing.filter(w => w.sleep !== undefined && w.sleep !== null && w.sleep !== '' && !isNaN(parseFloat(w.sleep)));

                                            if (recentSleepLogs.length > 0 || previousSleepLogs.length > 0) {
                                                const recentAvgSleep = recentSleepLogs.length > 0
                                                    ? recentSleepLogs.reduce((sum, w) => sum + parseFloat(w.sleep), 0) / recentSleepLogs.length
                                                    : 0;
                                                const previousAvgSleep = previousSleepLogs.length > 0
                                                    ? previousSleepLogs.reduce((sum, w) => sum + parseFloat(w.sleep), 0) / previousSleepLogs.length
                                                    : 0;

                                                progressData.sleep = {
                                                    recent: recentAvgSleep,
                                                    previous: previousAvgSleep,
                                                    change: calculateChange(recentAvgSleep, previousAvgSleep, false), // Higher sleep is better
                                                    label: 'Horas de sono médias'
                                                };
                                            }

                                            // 4. BEM-ESTAR - Humor
                                            const recentMoodLogs = recentWellbeing.filter(w => w.mood !== undefined && w.mood !== null && w.mood !== '' && !isNaN(parseInt(w.mood)));
                                            const previousMoodLogs = previousWellbeing.filter(w => w.mood !== undefined && w.mood !== null && w.mood !== '' && !isNaN(parseInt(w.mood)));

                                            if (recentMoodLogs.length > 0 || previousMoodLogs.length > 0) {
                                                const recentAvgMood = recentMoodLogs.length > 0
                                                    ? recentMoodLogs.reduce((sum, w) => sum + parseInt(w.mood), 0) / recentMoodLogs.length
                                                    : 0;
                                                const previousAvgMood = previousMoodLogs.length > 0
                                                    ? previousMoodLogs.reduce((sum, w) => sum + parseInt(w.mood), 0) / previousMoodLogs.length
                                                    : 0;

                                                progressData.mood = {
                                                    recent: recentAvgMood,
                                                    previous: previousAvgMood,
                                                    change: calculateChange(recentAvgMood, previousAvgMood, false), // Higher mood is better
                                                    label: 'Humor médio'
                                                };
                                            }

                                            // 5. BEM-ESTAR - Energia
                                            const recentEnergyLogs = recentWellbeing.filter(w => w.energy !== undefined && w.energy !== null && w.energy !== '' && !isNaN(parseInt(w.energy)));
                                            const previousEnergyLogs = previousWellbeing.filter(w => w.energy !== undefined && w.energy !== null && w.energy !== '' && !isNaN(parseInt(w.energy)));

                                            if (recentEnergyLogs.length > 0 || previousEnergyLogs.length > 0) {
                                                const recentAvgEnergy = recentEnergyLogs.length > 0
                                                    ? recentEnergyLogs.reduce((sum, w) => sum + parseInt(w.energy), 0) / recentEnergyLogs.length
                                                    : 0;
                                                const previousAvgEnergy = previousEnergyLogs.length > 0
                                                    ? previousEnergyLogs.reduce((sum, w) => sum + parseInt(w.energy), 0) / previousEnergyLogs.length
                                                    : 0;

                                                progressData.energy = {
                                                    recent: recentAvgEnergy,
                                                    previous: previousAvgEnergy,
                                                    change: calculateChange(recentAvgEnergy, previousAvgEnergy, false), // Higher energy is better
                                                    label: 'Energia média'
                                                };
                                            }

                                            // 6. CICLOS - Consistência da hora de deitar + Média
                                            if (recentCycles.length > 0 || previousCycles.length > 0) {
                                                const getBedtimeMinutes = (bedtime) => {
                                                    const [hours, minutes] = bedtime.split(':').map(Number);
                                                    // Adjust for late night/early morning (00:00-13:59 = next day)
                                                    // Horas de deitar antes das 14h são consideradas "manhã/tarde do dia seguinte"
                                                    if (hours >= 0 && hours < 14) {
                                                        return (hours + 24) * 60 + minutes; // Treat as 24:00-37:59
                                                    }
                                                    return hours * 60 + minutes;
                                                };

                                                const minutesToTime = (mins) => {
                                                    const adjustedMins = mins >= 1440 ? mins - 1440 : mins; // Convert back from 24h+ to 0-23h
                                                    const h = Math.floor(adjustedMins / 60);
                                                    const m = Math.round(adjustedMins % 60);
                                                    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                                                };

                                                const recentBedtimes = recentCycles.filter(c => c.bedtime).map(c => getBedtimeMinutes(c.bedtime));
                                                const previousBedtimes = previousCycles.filter(c => c.bedtime).map(c => getBedtimeMinutes(c.bedtime));

                                                if (recentBedtimes.length > 0 || previousBedtimes.length > 0) {
                                                    // Calculate standard deviation (lower is better = more consistent)
                                                    const getStdDev = (arr) => {
                                                        if (arr.length === 0) return 0;
                                                        const mean = arr.reduce((sum, v) => sum + v, 0) / arr.length;
                                                        const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / arr.length;
                                                        return Math.sqrt(variance);
                                                    };

                                                    const recentStdDev = getStdDev(recentBedtimes);
                                                    const previousStdDev = getStdDev(previousBedtimes);

                                                    progressData.bedtimeConsistency = {
                                                        recent: recentStdDev,
                                                        previous: previousStdDev,
                                                        change: calculateChange(recentStdDev, previousStdDev, true), // Lower std dev is better
                                                        label: 'Consistência da hora de deitar'
                                                    };

                                                    // Calculate average bedtime
                                                    const recentAvgBedtime = recentBedtimes.length > 0
                                                        ? recentBedtimes.reduce((sum, v) => sum + v, 0) / recentBedtimes.length
                                                        : 0;
                                                    const previousAvgBedtime = previousBedtimes.length > 0
                                                        ? previousBedtimes.reduce((sum, v) => sum + v, 0) / previousBedtimes.length
                                                        : 0;

                                                    progressData.avgBedtime = {
                                                        recent: recentAvgBedtime,
                                                        previous: previousAvgBedtime,
                                                        recentTime: minutesToTime(recentAvgBedtime),
                                                        previousTime: minutesToTime(previousAvgBedtime),
                                                        // Earlier bedtime is generally better (but depends on sleep quality)
                                                        change: calculateChange(recentAvgBedtime, previousAvgBedtime, true),
                                                        label: 'Hora média de deitar'
                                                    };
                                                }
                                            }

                                            // 7. AUTOCUIDADO - Análise detalhada por área
                                            const recentSelfCareActivities = recentCycles.flatMap(c => c.selfCareActivities || []);
                                            const previousSelfCareActivities = previousCycles.flatMap(c => c.selfCareActivities || []);

                                            if (recentSelfCareActivities.length > 0 || previousSelfCareActivities.length > 0) {
                                                const recentAvgSelfCare = recentCycles.length > 0 ? recentSelfCareActivities.length / recentCycles.length : 0;
                                                const previousAvgSelfCare = previousCycles.length > 0 ? previousSelfCareActivities.length / previousCycles.length : 0;

                                                progressData.selfCare = {
                                                    recent: recentAvgSelfCare,
                                                    previous: previousAvgSelfCare,
                                                    change: calculateChange(recentAvgSelfCare, previousAvgSelfCare, false), // More is better
                                                    label: 'Atividades de autocuidado por ciclo'
                                                };
                                            }

                                            // AUTOCUIDADO - Análise por área (water, rest, social, food)
                                            if (recentWellbeing.length > 0) {
                                                const areas = {
                                                    water: { name: 'Hidratação', emoji: '💧' },
                                                    food: { name: 'Alimentação', emoji: '🍎' },
                                                    rest: { name: 'Descanso', emoji: '😴' },
                                                    social: { name: 'Socialização', emoji: '👥' }
                                                };

                                                const recentAreaStats = {};
                                                const previousAreaStats = {};

                                                // Agrupar wellbeing por data (1 data = 1 ciclo aprox)
                                                const recentDates = new Set(recentWellbeing.map(w => w.date));
                                                const previousDates = new Set(previousWellbeing.map(w => w.date));

                                                Object.keys(areas).forEach(area => {
                                                    // Para cada ciclo (data), verificar se ALGUM registo tem area:true
                                                    const recentCyclesWithArea = Array.from(recentDates).filter(date => {
                                                        return recentWellbeing.some(w => w.date === date && w[area] === true);
                                                    }).length;

                                                    const previousCyclesWithArea = Array.from(previousDates).filter(date => {
                                                        return previousWellbeing.some(w => w.date === date && w[area] === true);
                                                    }).length;

                                                    const recentPercent = recentDates.size > 0 ? (recentCyclesWithArea / recentDates.size) * 100 : 0;
                                                    const previousPercent = previousDates.size > 0 ? (previousCyclesWithArea / previousDates.size) * 100 : 0;

                                                    recentAreaStats[area] = recentPercent;
                                                    previousAreaStats[area] = previousPercent;
                                                });

                                                // Calculate overall completion rate (média dos indicadores)
                                                const recentOverall = Object.values(recentAreaStats).reduce((sum, v) => sum + v, 0) / 4;
                                                const previousOverall = Object.values(previousAreaStats).reduce((sum, v) => sum + v, 0) / 4;

                                                // Calculate complete cycles (ciclos onde completaste os 4 indicadores)
                                                const recentCompleteCycles = Array.from(recentDates).filter(date => {
                                                    return Object.keys(areas).every(area => {
                                                        return recentWellbeing.some(w => w.date === date && w[area] === true);
                                                    });
                                                }).length;

                                                const previousCompleteCycles = Array.from(previousDates).filter(date => {
                                                    return Object.keys(areas).every(area => {
                                                        return previousWellbeing.some(w => w.date === date && w[area] === true);
                                                    });
                                                }).length;

                                                const recentCompleteCyclesPercent = recentDates.size > 0 ? (recentCompleteCycles / recentDates.size) * 100 : 0;
                                                const previousCompleteCyclesPercent = previousDates.size > 0 ? (previousCompleteCycles / previousDates.size) * 100 : 0;

                                                // Identify low areas (< 50%)
                                                const lowAreas = Object.entries(recentAreaStats)
                                                    .filter(([_, percent]) => percent < 50)
                                                    .map(([area, percent]) => ({ area, percent, ...areas[area] }))
                                                    .sort((a, b) => a.percent - b.percent);

                                                // Generate suggestions
                                                let suggestion = '';
                                                if (lowAreas.length >= 3) {
                                                    // Mencionar as 2 áreas MAIS BAIXAS
                                                    suggestion = `Abaixo de 50% em várias áreas. Pequenos hábitos diários fazem diferença - começa por ${lowAreas[0].name.toLowerCase()} e ${lowAreas[1].name.toLowerCase()}.`;
                                                } else if (lowAreas.length === 2) {
                                                    suggestion = `Atenção a ${lowAreas[0].name.toLowerCase()} e ${lowAreas[1].name.toLowerCase()}. Criar rotinas simples pode ajudar!`;
                                                } else if (lowAreas.length === 1) {
                                                    suggestion = `Foca em melhorar ${lowAreas[0].name.toLowerCase()} - pequenos passos contam!`;
                                                } else {
                                                    suggestion = `Excelente! Estás a manter bons hábitos de autocuidado em todas as áreas (≥50%).`;
                                                }

                                                progressData.selfCareDetailed = {
                                                    recentOverall,
                                                    previousOverall,
                                                    areas: recentAreaStats,
                                                    previousAreas: previousAreaStats,
                                                    lowAreas,
                                                    suggestion,
                                                    change: calculateChange(recentOverall, previousOverall, false),
                                                    // Ciclos completos (onde completaste os 4 indicadores)
                                                    completeCycles: {
                                                        recent: recentCompleteCyclesPercent,
                                                        previous: previousCompleteCyclesPercent,
                                                        recentCount: recentCompleteCycles,
                                                        recentTotal: recentDates.size,
                                                        previousCount: previousCompleteCycles,
                                                        previousTotal: previousDates.size,
                                                        change: calculateChange(recentCompleteCyclesPercent, previousCompleteCyclesPercent, false)
                                                    }
                                                };
                                            }

                                            // 8. EMOÇÕES E TRIGGERS
                                            const recentEmotions = recentWellbeing.flatMap(w => w.emotions || []);
                                            const previousEmotions = previousWellbeing.flatMap(w => w.emotions || []);
                                            const recentTriggers = recentCycles.flatMap(c => c.triggers || []);
                                            const previousTriggers = previousCycles.flatMap(c => c.triggers || []);

                                            // Count negative emotions
                                            const negativeEmotions = ['😰 Ansioso/a', '😢 Triste', '😤 Irritado/a', '😓 Stressado/a', '😫 Frustrado/a', '🥺 Solitário/a', '😖 Culpado/a', '😞 Envergonhado/a', '😣 Arrependido/a', '😩 Overwhelmed', '🔌 Desconectado/a', '😔 Inseguro/a', '😕 Confuso/a', '😐 Entediado/a', '🔥 Com craving', '😴 Cansado/a', '🤗 Vulnerável'];
                                            const recentNegativeCount = recentEmotions.filter(e => negativeEmotions.includes(e)).length;
                                            const previousNegativeCount = previousEmotions.filter(e => negativeEmotions.includes(e)).length;

                                            // Só mostrar emoções negativas se houver pelo menos uma emoção negativa registada
                                            if (recentNegativeCount > 0 || previousNegativeCount > 0) {
                                                const recentNegativePercent = recentEmotions.length > 0 ? (recentNegativeCount / recentEmotions.length) * 100 : 0;
                                                const previousNegativePercent = previousEmotions.length > 0 ? (previousNegativeCount / previousEmotions.length) * 100 : 0;

                                                progressData.negativeEmotions = {
                                                    recent: recentNegativePercent,
                                                    previous: previousNegativePercent,
                                                    change: calculateChange(recentNegativePercent, previousNegativePercent, true), // Lower is better
                                                    label: 'Emoções negativas (% do total)',
                                                    recentCount: recentNegativeCount,
                                                    recentTotal: recentEmotions.length,
                                                    previousCount: previousNegativeCount,
                                                    previousTotal: previousEmotions.length
                                                };
                                            }

                                            // Só mostrar gatilhos se houver pelo menos um gatilho registado
                                            if (recentTriggers.length > 0 || previousTriggers.length > 0) {
                                                const recentAvgTriggers = recentCycles.length > 0 ? recentTriggers.length / recentCycles.length : 0;
                                                const previousAvgTriggers = previousCycles.length > 0 ? previousTriggers.length / previousCycles.length : 0;

                                                progressData.triggers = {
                                                    recent: recentAvgTriggers,
                                                    previous: previousAvgTriggers,
                                                    change: calculateChange(recentAvgTriggers, previousAvgTriggers, true), // Lower is better
                                                    label: 'Gatilhos por ciclo'
                                                };
                                            }

                                            // Calculate overall progress score (0-100)
                                            // Excluir métricas com isNew (dados novos sem comparação válida)
                                            const scorableMetrics = Object.values(progressData).filter(m => m.change && m.change.direction !== 'stable' && !m.change.isNew);
                                            const improvements = scorableMetrics.filter(m => m.change.isImprovement).length;
                                            const total = scorableMetrics.length;
                                            const progressScore = total > 0 ? Math.round((improvements / total) * 100) : 50;

                                            return (
                                                <div className="space-y-4">
                                                    {/* Period comparison header */}
                                                    <div className={(darkMode ? 'bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-700/50' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200') + ' rounded-xl p-6 border'}>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h3 className={'text-xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                                📈 Análise de Progresso Temporal
                                                            </h3>
                                                            <div className={'text-4xl font-black ' + (progressScore >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') : progressScore >= 40 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>
                                                                {progressScore}%
                                                            </div>
                                                        </div>
                                                        <p className={'text-sm mb-3 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                            {patternsPeriod === 'hoje' ? 'Comparação entre hoje (até agora) vs ontem (dia completo)' :
                                                             patternsPeriod === 'semana' ? 'Comparação entre esta semana vs semana anterior' :
                                                             patternsPeriod === 'mes' ? 'Comparação entre este mês vs mês anterior' :
                                                             `Comparação entre os últimos ${periodDays} dias vs os ${periodDays} dias anteriores`}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <div className={'flex-1 h-3 rounded-full overflow-hidden ' + (darkMode ? 'bg-gray-700' : 'bg-gray-200')}>
                                                                <div className={'h-full transition-all duration-500 ' + (progressScore >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : progressScore >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-orange-500 to-red-500')} style={{width: progressScore + '%'}}></div>
                                                            </div>
                                                            <span className={'text-xs font-medium ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                {improvements} de {total} métricas em melhoria
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Consumption metrics */}
                                                    {(progressData.frequency || progressData.dosage) && (
                                                        <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                                💊 Consumo
                                                            </h3>
                                                            <div className="space-y-3">
                                                                {progressData.frequency && (
                                                                    <div className={(darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200') + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                                                {progressData.frequency.label}
                                                                            </span>
                                                                            {progressData.frequency.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.frequency.change.isImprovement ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))}>
                                                                                    {progressData.frequency.change.direction === 'up' ? '↑' : '↓'} {progressData.frequency.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                                                                                {progressData.frequency.recent.toFixed(1)}
                                                                            </span>
                                                                            <span className={'text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>
                                                                                consumos/dia
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                antes: {progressData.frequency.previous.toFixed(1)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {progressData.dosage && (
                                                                    <div className={(darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200') + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                                                {progressData.dosage.label}
                                                                            </span>
                                                                            {progressData.dosage.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.dosage.change.isImprovement ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))}>
                                                                                    {progressData.dosage.change.direction === 'up' ? '↑' : '↓'} {progressData.dosage.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                                                                                {progressData.dosage.recent.toFixed(0)}
                                                                            </span>
                                                                            <span className={'text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>
                                                                                mg/dia
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                antes: {progressData.dosage.previous.toFixed(0)} mg
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Wellbeing metrics */}
                                                    {(progressData.sleep || progressData.mood || progressData.energy) && (
                                                        <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                                💚 Bem-Estar
                                                            </h3>
                                                            <div className="space-y-3">
                                                                {progressData.sleep && (
                                                                    <div className={(darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200') + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                                                {progressData.sleep.label}
                                                                            </span>
                                                                            {progressData.sleep.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.sleep.change.isImprovement ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))}>
                                                                                    {progressData.sleep.change.direction === 'up' ? '↑' : '↓'} {progressData.sleep.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                                                                                {progressData.sleep.recent.toFixed(1)}
                                                                            </span>
                                                                            <span className={'text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>
                                                                                horas
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                antes: {progressData.sleep.previous.toFixed(1)}h
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {progressData.mood && (
                                                                    <div className={(darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200') + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                                                {progressData.mood.label}
                                                                            </span>
                                                                            {progressData.mood.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.mood.change.isImprovement ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))}>
                                                                                    {progressData.mood.change.direction === 'up' ? '↑' : '↓'} {progressData.mood.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                                                                                {progressData.mood.recent.toFixed(1)}
                                                                            </span>
                                                                            <span className={'text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>
                                                                                /10
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                antes: {progressData.mood.previous.toFixed(1)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {progressData.energy && (
                                                                    <div className={(darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200') + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                                                {progressData.energy.label}
                                                                            </span>
                                                                            {progressData.energy.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.energy.change.isImprovement ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))}>
                                                                                    {progressData.energy.change.direction === 'up' ? '↑' : '↓'} {progressData.energy.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                                                                                {progressData.energy.recent.toFixed(1)}
                                                                            </span>
                                                                            <span className={'text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>
                                                                                /10
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                antes: {progressData.energy.previous.toFixed(1)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Lifestyle metrics */}
                                                    {(progressData.bedtimeConsistency || progressData.selfCare) && (
                                                        <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                                🌙 Rotinas e Autocuidado
                                                            </h3>
                                                            <div className="space-y-3">
                                                                {progressData.bedtimeConsistency && (
                                                                    <div className={(darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200') + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                                                {progressData.bedtimeConsistency.label}
                                                                            </span>
                                                                            {progressData.bedtimeConsistency.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.bedtimeConsistency.change.isImprovement ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))}>
                                                                                    {progressData.bedtimeConsistency.change.isImprovement ? 'Melhor' : 'Pior'} {progressData.bedtimeConsistency.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2 mb-2">
                                                                            <span className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                                                                                {progressData.bedtimeConsistency.recent < 30 ? 'Muito consistente' : progressData.bedtimeConsistency.recent < 60 ? 'Consistente' : 'Variável'}
                                                                            </span>
                                                                            <span className={'text-xs ml-auto ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                variação: ±{(progressData.bedtimeConsistency.recent / 60).toFixed(0)}h
                                                                            </span>
                                                                        </div>
                                                                        <div className={(darkMode ? 'bg-gray-800/50' : 'bg-gray-100') + ' rounded px-3 py-2'}>
                                                                            <p className={'text-xs italic ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                                {progressData.bedtimeConsistency.recent < 30
                                                                                    ? 'Deitas-te sempre a horas semelhantes (variação <30min). Excelente para a qualidade do sono!'
                                                                                    : progressData.bedtimeConsistency.recent < 60
                                                                                    ? 'Variação moderada nas horas de deitar. Tenta manter uma rotina mais regular.'
                                                                                    : `Horas de deitar muito variáveis (±${(progressData.bedtimeConsistency.recent / 60).toFixed(0)}h). Rotinas consistentes melhoram o sono.`}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {progressData.avgBedtime && (
                                                                    <div className={(darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200') + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                                                {progressData.avgBedtime.label}
                                                                            </span>
                                                                            {progressData.avgBedtime.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.avgBedtime.change.isImprovement ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))}>
                                                                                    {progressData.avgBedtime.change.direction === 'up' ? 'Mais tarde' : 'Mais cedo'}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                                                                                {progressData.avgBedtime.recentTime}
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                era: {progressData.avgBedtime.previousTime}
                                                                            </span>
                                                                        </div>
                                                                        {(() => {
                                                                            const hour = parseInt(progressData.avgBedtime.recentTime.split(':')[0]);
                                                                            let feedback = '';
                                                                            if (hour >= 0 && hour < 6) {
                                                                                feedback = 'Atenção: deitar muito tarde (madrugada) pode afetar a qualidade do sono.';
                                                                            } else if (hour >= 22 && hour < 24) {
                                                                                feedback = 'Boa janela para deitar! (22h-00h)';
                                                                            } else if (hour >= 6 && hour < 12) {
                                                                                feedback = 'Dormir de manhã pode indicar inversão do ciclo.';
                                                                            }
                                                                            return feedback ? (
                                                                                <div className={'text-xs mt-2 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                                    {feedback}
                                                                                </div>
                                                                            ) : null;
                                                                        })()}
                                                                    </div>
                                                                )}
                                                                {progressData.selfCare && (
                                                                    <div className={(darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200') + ' rounded-lg p-4 border'}>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className={'text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                                                {progressData.selfCare.label}
                                                                            </span>
                                                                            {progressData.selfCare.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-1 rounded-full font-medium ' + (progressData.selfCare.change.isImprovement ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'))}>
                                                                                    {progressData.selfCare.change.direction === 'up' ? '↑' : '↓'} {progressData.selfCare.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-baseline gap-2">
                                                                            <span className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-900')}>
                                                                                {progressData.selfCare.recent.toFixed(1)}
                                                                            </span>
                                                                            <span className={'text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>
                                                                                atividades/ciclo
                                                                            </span>
                                                                            <span className={'text-sm ml-auto ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>
                                                                                antes: {progressData.selfCare.previous.toFixed(1)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Emotional metrics */}
                                                    {(progressData.negativeEmotions || progressData.triggers) && (
                                                        <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                                🧠 Estado Emocional
                                                            </h3>
                                                            <div className="space-y-3">
                                                                {progressData.negativeEmotions && (
                                                                    <div className={(darkMode ? 'bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-700/50' : 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200') + ' rounded-lg p-3 border'}>
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <span className="text-lg">😔</span>
                                                                            <span className={'text-xs font-semibold uppercase tracking-wide ' + (darkMode ? 'text-purple-400' : 'text-purple-700')}>
                                                                                Emoções Negativas
                                                                            </span>
                                                                            {progressData.negativeEmotions.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-0.5 rounded-full font-bold ml-auto ' + (progressData.negativeEmotions.change.isImprovement ? (darkMode ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-green-100 text-green-700 border border-green-300') : (darkMode ? 'bg-red-900/50 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-300'))}>
                                                                                    {progressData.negativeEmotions.change.direction === 'up' ? '↑' : '↓'}{progressData.negativeEmotions.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center justify-between">
                                                                            <div>
                                                                                <div className="flex items-baseline gap-1">
                                                                                    <span className={'text-3xl font-black ' + (darkMode ? 'text-purple-400' : 'text-purple-600')}>
                                                                                        {progressData.negativeEmotions.recent.toFixed(0)}%
                                                                                    </span>
                                                                                    <span className={'text-xs font-medium ' + (darkMode ? 'text-purple-300/70' : 'text-purple-600/70')}>
                                                                                        do total
                                                                                    </span>
                                                                                </div>
                                                                                <div className={'text-xs mt-1 ' + (darkMode ? 'text-purple-400/60' : 'text-purple-600/60')}>
                                                                                    {progressData.negativeEmotions.recentCount} de {progressData.negativeEmotions.recentTotal} emoções
                                                                                </div>
                                                                            </div>
                                                                            <div className={'text-xs px-2 py-1 rounded ' + (darkMode ? 'bg-gray-800/50 text-gray-400' : 'bg-white/70 text-gray-600')}>
                                                                                era {progressData.negativeEmotions.previous.toFixed(0)}%
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {progressData.triggers && (
                                                                    <div className={(darkMode ? 'bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-700/50' : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200') + ' rounded-lg p-3 border'}>
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            <span className="text-lg">⚡</span>
                                                                            <span className={'text-xs font-semibold uppercase tracking-wide ' + (darkMode ? 'text-red-400' : 'text-red-700')}>
                                                                                Gatilhos Identificados
                                                                            </span>
                                                                            {progressData.triggers.change.direction !== 'stable' && (
                                                                                <span className={'text-xs px-2 py-0.5 rounded-full font-bold ml-auto ' + (progressData.triggers.change.isImprovement ? (darkMode ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-green-100 text-green-700 border border-green-300') : (darkMode ? 'bg-red-900/50 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-300'))}>
                                                                                    {progressData.triggers.change.direction === 'up' ? '↑' : '↓'}{progressData.triggers.change.percent.toFixed(0)}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-baseline gap-1">
                                                                                <span className={'text-3xl font-black ' + (darkMode ? 'text-red-400' : 'text-red-600')}>
                                                                                    {progressData.triggers.recent.toFixed(1)}
                                                                                </span>
                                                                                <span className={'text-xs font-medium ' + (darkMode ? 'text-red-300/70' : 'text-red-600/70')}>
                                                                                    /ciclo
                                                                                </span>
                                                                            </div>
                                                                            <div className={'text-xs px-2 py-1 rounded ' + (darkMode ? 'bg-gray-800/50 text-gray-400' : 'bg-white/70 text-gray-600')}>
                                                                                era {progressData.triggers.previous.toFixed(1)}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Autocuidado Detalhado */}
                                                    {progressData.selfCareDetailed && (
                                                        <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                            <h3 className={'text-lg font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                                💚 Análise de Autocuidado
                                                            </h3>

                                                            {/* Overall score */}
                                                            <div className={(darkMode ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-700/50' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200') + ' rounded-lg p-4 border mb-4'}>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className={'text-sm font-semibold ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                                        Taxa geral de autocuidado
                                                                    </span>
                                                                    <span className={'text-2xl font-black ' + (progressData.selfCareDetailed.recentOverall >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>
                                                                        {progressData.selfCareDetailed.recentOverall.toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                                <div className={(darkMode ? 'bg-gray-700' : 'bg-gray-200') + ' rounded-full h-3 overflow-hidden'}>
                                                                    <div
                                                                        className={'h-full transition-all duration-500 ' + (progressData.selfCareDetailed.recentOverall >= 70 ? 'bg-green-500' : 'bg-orange-500')}
                                                                        style={{width: `${progressData.selfCareDetailed.recentOverall}%`}}
                                                                    ></div>
                                                                </div>
                                                                <div className={'text-xs mt-2 italic ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                    {progressData.selfCareDetailed.suggestion}
                                                                </div>
                                                            </div>

                                                            {/* Complete cycles */}
                                                            <div className={(darkMode ? 'bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border-blue-700/50' : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200') + ' rounded-lg p-4 border mb-4'}>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className={'text-sm font-semibold ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                                        🎯 Ciclos completos (4 indicadores)
                                                                    </span>
                                                                    <span className={'text-2xl font-black ' + (progressData.selfCareDetailed.completeCycles.recent >= 50 ? (darkMode ? 'text-blue-400' : 'text-blue-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>
                                                                        {progressData.selfCareDetailed.completeCycles.recent.toFixed(0)}%
                                                                    </span>
                                                                </div>
                                                                <div className={(darkMode ? 'bg-gray-700' : 'bg-gray-200') + ' rounded-full h-3 overflow-hidden'}>
                                                                    <div
                                                                        className={'h-full transition-all duration-500 ' + (progressData.selfCareDetailed.completeCycles.recent >= 50 ? 'bg-blue-500' : 'bg-orange-500')}
                                                                        style={{width: `${progressData.selfCareDetailed.completeCycles.recent}%`}}
                                                                    ></div>
                                                                </div>
                                                                <div className={'text-xs mt-2 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                    {progressData.selfCareDetailed.completeCycles.recentCount} de {progressData.selfCareDetailed.completeCycles.recentTotal} ciclos com todos os indicadores
                                                                </div>
                                                            </div>

                                                            {/* Per-area breakdown */}
                                                            <div className="grid grid-cols-2 gap-3">
                                                                {Object.entries(progressData.selfCareDetailed.areas).map(([areaKey, percent]) => {
                                                                    const areaNames = {
                                                                        water: { name: 'Hidratação', emoji: '💧' },
                                                                        food: { name: 'Alimentação', emoji: '🍎' },
                                                                        rest: { name: 'Descanso', emoji: '😴' },
                                                                        social: { name: 'Socialização', emoji: '👥' }
                                                                    };
                                                                    const area = areaNames[areaKey];
                                                                    return (
                                                                        <div key={areaKey} className={(darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200') + ' rounded-lg p-3 border'}>
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <span className="text-lg">{area.emoji}</span>
                                                                                <span className={'text-xs font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                                                    {area.name}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-baseline gap-1">
                                                                                <span className={'text-2xl font-bold ' + (percent >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>
                                                                                    {percent.toFixed(0)}%
                                                                                </span>
                                                                            </div>
                                                                            <div className={(darkMode ? 'bg-gray-600' : 'bg-gray-200') + ' rounded-full h-1.5 overflow-hidden mt-2'}>
                                                                                <div
                                                                                    className={'h-full ' + (percent >= 70 ? 'bg-green-500' : 'bg-orange-500')}
                                                                                    style={{width: `${percent}%`}}
                                                                                ></div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Summary insights */}
                                                    <div className={(darkMode ? 'bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-indigo-700/50' : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200') + ' rounded-xl p-6 border'}>
                                                        <h3 className={'text-lg font-semibold mb-3 ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                            💡 Resumo do Progresso
                                                        </h3>
                                                        <div className={'text-sm leading-relaxed space-y-2 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                            {progressScore >= 70 && (
                                                                <p>🎉 <strong>Excelente progresso!</strong> A maioria das métricas mostra melhoria clara. Continua neste caminho!</p>
                                                            )}
                                                            {progressScore >= 40 && progressScore < 70 && (
                                                                <p>👍 <strong>Progresso moderado.</strong> Algumas áreas melhoraram, outras mantiveram-se estáveis. Identifica o que funcionou nas áreas positivas.</p>
                                                            )}
                                                            {progressScore < 40 && (
                                                                <p>💪 <strong>Momento desafiante.</strong> Os dados mostram dificuldades em várias áreas. Lembra-te: recaídas fazem parte da recuperação. Foca-te em pequenas vitórias.</p>
                                                            )}
                                                            <div className={'mt-3 pt-3 border-t ' + (darkMode ? 'border-gray-700' : 'border-gray-200')}>
                                                                <p className="text-xs font-medium mb-1">Áreas com maior melhoria:</p>
                                                                <ul className="text-xs space-y-1">
                                                                    {Object.entries(progressData)
                                                                        .filter(([_, data]) => data.change && data.change.isImprovement && data.change.direction !== 'stable')
                                                                        .sort((a, b) => b[1].change.percent - a[1].change.percent)
                                                                        .slice(0, 3)
                                                                        .map(([key, data], i) => (
                                                                            <li key={i}>✅ {data.label} ({data.change.direction === 'up' ? '↑' : '↓'}{data.change.percent.toFixed(0)}%)</li>
                                                                        ))}
                                                                    {Object.entries(progressData).filter(([_, data]) => data.change && data.change.isImprovement && data.change.direction !== 'stable').length === 0 && (
                                                                        <li className="text-gray-500 italic">Nenhuma melhoria significativa detetada (mudanças &lt;5%)</li>
                                                                    )}
                                                                </ul>
                                                            </div>
                                                            {Object.entries(progressData).filter(([_, data]) => data.change && !data.change.isImprovement && data.change.direction !== 'stable' && !data.change.isNew).length > 0 && (
                                                                <div className={'mt-3 pt-3 border-t ' + (darkMode ? 'border-gray-700' : 'border-gray-200')}>
                                                                    <p className="text-xs font-medium mb-1">Áreas que precisam de atenção:</p>
                                                                    <ul className="text-xs space-y-1">
                                                                        {Object.entries(progressData)
                                                                            .filter(([_, data]) => data.change && !data.change.isImprovement && data.change.direction !== 'stable' && !data.change.isNew)
                                                                            .sort((a, b) => b[1].change.percent - a[1].change.percent)
                                                                            .slice(0, 3)
                                                                            .map(([key, data], i) => (
                                                                                <li key={i}>⚠️ {data.label} ({data.change.direction === 'up' ? '↑' : '↓'}{data.change.percent.toFixed(0)}%)</li>
                                                                            ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // PADRÕES & ANÁLISES (NOVA - EM DESENVOLVIMENTO)

                                        // COACH
                                        if (patternView === 'coach') {
                                            if (filteredConsumptions.length === 0 && filteredWellbeingLogs.length === 0) {
                                                return (<div className={(darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500') + ' rounded-xl p-6 border text-center'}>Sem dados para este período</div>);
                                            }

                                            // Calculate all metrics for narrative
                                            const totalConsumptions = filteredConsumptions.length;
                                            const byDate = {};
                                            filteredConsumptions.forEach(c => { byDate[c.date] = (byDate[c.date] || 0) + 1; });
                                            const uniqueDays = Object.keys(byDate).length;
                                            const avgPerDay = uniqueDays > 0 ? (totalConsumptions / uniqueDays).toFixed(1) : 0;

                                            // Wellbeing averages
                                            const validSleep = filteredWellbeingLogs.filter(w => w.sleep && !isNaN(parseFloat(w.sleep)));
                                            const avgSleep = validSleep.length > 0 ? (validSleep.reduce((sum, w) => sum + parseFloat(w.sleep), 0) / validSleep.length).toFixed(1) : null;

                                            const validMood = filteredWellbeingLogs.filter(w => w.mood && !isNaN(parseInt(w.mood)));
                                            const avgMood = validMood.length > 0 ? (validMood.reduce((sum, w) => sum + parseInt(w.mood), 0) / validMood.length).toFixed(1) : null;

                                            const validEnergy = filteredWellbeingLogs.filter(w => w.energy && !isNaN(parseInt(w.energy)));
                                            const avgEnergy = validEnergy.length > 0 ? (validEnergy.reduce((sum, w) => sum + parseInt(w.energy), 0) / validEnergy.length).toFixed(1) : null;

                                            // Trending
                                            const sorted = [...filteredConsumptions].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
                                            const intervals = [];
                                            for (let i = 1; i < sorted.length; i++) {
                                                const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000 * 60 * 60);
                                                intervals.push(diff);
                                            }
                                            const avgInterval = intervals.length > 0 ? (intervals.reduce((sum, i) => sum + i, 0) / intervals.length).toFixed(1) : 0;
                                            const goodIntervals = intervals.filter(i => i >= 2).length;
                                            const goodPercent = intervals.length > 0 ? Math.round((goodIntervals / intervals.length) * 100) : 0;

                                            // Best/worst days (excluir o dia de hoje exceto quando filtrado por "dia")
                                            const dates = Object.keys(byDate).sort();
                                            const today = new Date().toISOString().split('T')[0];
                                            const completedDates = patternsPeriod === 'hoje' ? dates : dates.filter(d => d !== today);
                                            const sortedDates = completedDates.sort((a, b) => byDate[a] - byDate[b]);
                                            const bestDate = sortedDates.length > 0 ? sortedDates[0] : null;
                                            const worstDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
                                            const bestCount = bestDate ? byDate[bestDate] : 0;
                                            const worstCount = worstDate ? byDate[worstDate] : 0;

                                            // Time pattern
                                            const byPartOfDay = { manha: 0, tarde: 0, noite: 0, madrugada: 0 };
                                            filteredConsumptions.forEach(c => {
                                                const hour = new Date(c.timestamp).getHours();
                                                if (hour >= 6 && hour < 12) byPartOfDay.manha++;
                                                else if (hour >= 12 && hour < 18) byPartOfDay.tarde++;
                                                else if (hour >= 18 && hour < 24) byPartOfDay.noite++;
                                                else byPartOfDay.madrugada++;
                                            });
                                            const maxPartOfDay = Object.entries(byPartOfDay).reduce((max, curr) => curr[1] > max[1] ? curr : max, ['', 0]);
                                            const partNames = { manha: 'manhã', tarde: 'tarde', noite: 'noite', madrugada: 'madrugada' };

                                            // Sentiment analysis (if we have notes)
                                            const allNotes = [...filteredConsumptions.map(c => c.note || ''), ...filteredWellbeingLogs.map(w => w.note || ''), ...filteredCycles.map(c => c.notes || '')].filter(n => n.length > 0).join(' ');

                                            const positiveWords = ['bem', 'bom', 'boa', 'melhor', 'óptimo', 'ótimo', 'feliz', 'calmo', 'calma', 'tranquilo', 'tranquila', 'forte', 'consegui', 'progresso', 'sucesso', 'vitória', 'orgulho', 'confiante', 'motivado', 'esperança'];
                                            const negativeWords = ['mal', 'mau', 'má', 'pior', 'péssimo', 'triste', 'ansioso', 'ansiosa', 'stressado', 'stressada', 'difícil', 'fraco', 'fraca', 'falhei', 'desistir', 'sozinho', 'sozinha', 'perdido', 'perdida', 'cansado', 'cansada'];

                                            const positiveCount = positiveWords.reduce((count, word) => count + (allNotes.toLowerCase().match(new RegExp('\\b' + word + '\\b', 'g')) || []).length, 0);
                                            const negativeCount = negativeWords.reduce((count, word) => count + (allNotes.toLowerCase().match(new RegExp('\\b' + word + '\\b', 'g')) || []).length, 0);

                                            const sentimentScore = positiveCount - negativeCount;

                                            return (
                                                <div className="space-y-4">
                                                    {/* Header */}
                                                    <div className={(darkMode ? 'bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-700/50' : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200') + ' rounded-xl p-6 border'}>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="text-4xl">💬</span>
                                                            <h3 className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                                O Teu Coach
                                                            </h3>
                                                        </div>
                                                        <p className={'text-xs ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                            Resumo personalizado do período selecionado
                                                        </p>
                                                    </div>

                                                    {/* Narrative Summary */}
                                                    <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                        <div className={'space-y-4 leading-relaxed ' + (darkMode ? 'text-gray-200' : 'text-gray-700')}>
                                                            {/* Paragraph 1: Overview */}
                                                            <p>
                                                                Olá! Vamos refletir sobre este período juntos.
                                                                {totalConsumptions > 0 ? (
                                                                    <> Registaste <strong className={(darkMode ? 'text-purple-400' : 'text-purple-600')}>{totalConsumptions} {totalConsumptions === 1 ? 'consumo' : 'consumos'}</strong> ao longo de {uniqueDays} {uniqueDays === 1 ? 'dia' : 'dias'}, com uma média de <strong>{avgPerDay} consumos/dia</strong>.</>
                                                                ) : (
                                                                    <> Não tens consumos registados neste período - isso é excelente! </>
                                                                )}
                                                            </p>

                                                            {/* Paragraph 2: Patterns and Progress */}
                                                            {totalConsumptions > 0 && (
                                                                <p>
                                                                    {intervals.length > 0 ? (
                                                                        <>
                                                                            Notei que tens um intervalo médio de <strong className={(darkMode ? 'text-blue-400' : 'text-blue-600')}>{avgInterval} horas</strong> entre consumos.
                                                                            {goodPercent >= 50 ? (
                                                                                <> <span className={'font-medium ' + (darkMode ? 'text-green-400' : 'text-green-600')}>Isso é fantástico - {goodPercent}% dos teus intervalos são ≥2h!</span> Estás a conseguir espaçar bem os consumos, o que demonstra grande controlo.</>
                                                                            ) : (
                                                                                <> Há espaço para melhorar aqui - atualmente {goodPercent}% dos intervalos são ≥2h. Pequenas mudanças, como adicionar uma atividade entre consumos, podem fazer grande diferença.</>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <> Neste período ainda não tenho dados suficientes sobre intervalos, mas vamos continuar a acompanhar juntos.</>
                                                                    )}
                                                                </p>
                                                            )}

                                                            {/* Paragraph 3: Time Patterns */}
                                                            {totalConsumptions > 0 && maxPartOfDay[1] > 0 && (
                                                                <p>
                                                                    Reparei que a maioria dos teus consumos ({Math.round((maxPartOfDay[1] / totalConsumptions) * 100)}%) acontece à <strong className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>{partNames[maxPartOfDay[0]]}</strong>.
                                                                    {maxPartOfDay[0] === 'madrugada' && (
                                                                        <> Consumir durante a madrugada pode indicar dificuldades com o sono ou ansiedade noturna. Tens pensado no que te leva a consumir nesse período? Talvez seja útil explorar técnicas de relaxamento para a noite.</>
                                                                    )}
                                                                    {maxPartOfDay[0] === 'noite' && (
                                                                        <> A noite é um período comum para consumo, muitas vezes ligado ao descontrair após o dia. Considera se há formas alternativas de relaxar que te fazem sentir bem.</>
                                                                    )}
                                                                    {maxPartOfDay[0] === 'tarde' && (
                                                                        <> As tardes podem ser desafiantes, especialmente se há rotinas ou gatilhos específicos. Identifica o que precede esses momentos.</>
                                                                    )}
                                                                    {maxPartOfDay[0] === 'manha' && (
                                                                        <> Consumir pela manhã pode estar relacionado com o acordar ou com a gestão de ansiedade matinal. Observa como te sentes ao acordar e se há padrões.</>
                                                                    )}
                                                                </p>
                                                            )}

                                                            {/* Paragraph 3b: Hourly Consumption Analysis */}
                                                            {(() => {
                                                                if (totalConsumptions === 0) return null;

                                                                const renderID = Math.random().toString(36).substr(2, 9);

                                                                // Calcular consumos por hora (inicializar todas as 24 horas com 0)
                                                                const byHour = {};
                                                                for (let h = 0; h < 24; h++) {
                                                                    byHour[h] = 0;
                                                                }

                                                                filteredConsumptions.forEach(c => {
                                                                    const hour = new Date(c.timestamp).getHours();
                                                                    byHour[hour]++;
                                                                });

                                                                console.log(`🕐 ANÁLISE POR HORA [${renderID}]:`, {
                                                                    totalConsumptions: filteredConsumptions.length,
                                                                    byHour: byHour,
                                                                    consumptions: filteredConsumptions.map(c => ({
                                                                        timestamp: c.timestamp,
                                                                        hour: new Date(c.timestamp).getHours(),
                                                                        date: new Date(c.timestamp).toLocaleDateString('pt-PT')
                                                                    }))
                                                                });

                                                                if (filteredConsumptions.length === 0) return null;

                                                                // Encontrar hora com mais e menos consumos (todas as 24 horas)
                                                                const hourEntries = Object.entries(byHour).map(([h, count]) => ({ hour: parseInt(h), count }));

                                                                console.log(`🔍 BEFORE SORT [${renderID}]:`, JSON.parse(JSON.stringify(hourEntries)));

                                                                hourEntries.sort((a, b) => b.count - a.count);

                                                                console.log(`🔍 AFTER SORT [${renderID}]:`, JSON.parse(JSON.stringify(hourEntries)));

                                                                const worstHour = hourEntries[0];
                                                                const bestHour = hourEntries[hourEntries.length - 1];

                                                                console.log(`📊 WORST/BEST HOUR [${renderID}]:`, {
                                                                    hourEntries,
                                                                    worstHour,
                                                                    bestHour,
                                                                    worstFormatted: `${String(worstHour.hour).padStart(2, '0')}:00-${String(worstHour.hour + 1).padStart(2, '0')}:00`,
                                                                    bestFormatted: `${String(bestHour.hour).padStart(2, '0')}:00-${String(bestHour.hour + 1).padStart(2, '0')}:00`
                                                                });

                                                                const formatHourRange = (h) => `${String(h).padStart(2, '0')}:00-${String(h + 1).padStart(2, '0')}:00`;

                                                                // Só mostrar se houver variação significativa entre horas
                                                                // Se melhor hora tem 0, qualquer pior hora > 0 é significativo
                                                                // Caso contrário, pior hora precisa ter pelo menos 2x mais que melhor
                                                                const hasSignificantVariation = bestHour.count === 0
                                                                    ? worstHour.count > 0
                                                                    : worstHour.count >= bestHour.count * 2;

                                                                if (!hasSignificantVariation) return null;

                                                                return (
                                                                    <p>
                                                                        A tua <strong className={(darkMode ? 'text-red-400' : 'text-red-600')}>hora de maior risco</strong> é das <strong>{formatHourRange(worstHour.hour)}</strong> ({worstHour.count} {worstHour.count === 1 ? 'consumo' : 'consumos'}).
                                                                        {bestHour.count === 0 ? (
                                                                            <> Por outro lado, das <strong className={(darkMode ? 'text-green-400' : 'text-green-600')}>{formatHourRange(bestHour.hour)}</strong> <strong>nunca registas consumos</strong>. <span className={(darkMode ? 'text-blue-400' : 'text-blue-600')}>O que fazes diferente nesse horário? Esse padrão pode ser uma pista valiosa para estratégias de redução de risco.</span></>
                                                                        ) : (
                                                                            <> Por outro lado, das <strong className={(darkMode ? 'text-green-400' : 'text-green-600')}>{formatHourRange(bestHour.hour)}</strong> registas menos consumos ({bestHour.count}x). <span className={(darkMode ? 'text-blue-400' : 'text-blue-600')}>O que fazes diferente nesse horário? Esse padrão pode ser uma pista valiosa para estratégias de redução de risco.</span></>
                                                                        )}
                                                                    </p>
                                                                );
                                                            })()}

                                                            {/* Paragraph 4: Wellbeing Integration */}
                                                            {(avgMood || avgEnergy || avgSleep) && (
                                                                <p>
                                                                    Sobre o teu bem-estar geral:
                                                                    {avgSleep && <> estás a dormir em média <strong className={(darkMode ? 'text-cyan-400' : 'text-cyan-600')}>{avgSleep} horas</strong>{parseFloat(avgSleep) < 6 ? ', o que é abaixo do recomendado - o sono é fundamental para a recuperação e regulação emocional' : parseFloat(avgSleep) > 9 ? ', o que pode indicar necessidade de descanso extra ou até depressão - observa como te sentes' : parseFloat(avgSleep) >= 7 && parseFloat(avgSleep) <= 9 ? ' - excelente! Esse é o intervalo ideal para a maioria das pessoas' : ' - um valor razoável'}.</>}
                                                                    {avgMood && <> O teu humor médio foi de <strong className={(parseFloat(avgMood) >= 7 ? (darkMode ? 'text-green-400' : 'text-green-600') : parseFloat(avgMood) >= 5 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') : (darkMode ? 'text-red-400' : 'text-red-600'))}>{avgMood}/10</strong>{parseFloat(avgMood) >= 7 ? ' - isso é muito positivo!' : parseFloat(avgMood) >= 5 ? ' - moderado, com espaço para melhorias.' : ' - isto preocupa-me. Como te podes apoiar melhor?'}.</>}
                                                                    {avgEnergy && <> Energia média: <strong className={(parseFloat(avgEnergy) >= 7 ? (darkMode ? 'text-yellow-400' : 'text-yellow-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>{avgEnergy}/10</strong>{parseFloat(avgEnergy) < 5 ? '. Níveis baixos de energia podem estar relacionados com o consumo, sono ou alimentação.' : '.'}.</>}
                                                                </p>
                                                            )}

                                                            {/* Paragraph 5: Emotional Tone & Encouragement */}
                                                            <p>
                                                                {allNotes.length > 50 ? (
                                                                    <>
                                                                        Ao ler as tuas reflexões, percebo que tens usado palavras
                                                                        {sentimentScore > 5 ? (
                                                                            <> <strong className={(darkMode ? 'text-green-400' : 'text-green-600')}>maioritariamente positivas</strong> - isso reflete resiliência e otimismo, mesmo nos desafios. Continua a cultivar essa perspetiva!</>
                                                                        ) : sentimentScore < -5 ? (
                                                                            <> <strong className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>que sugerem alguma dificuldade emocional</strong>. Quero que saibas que é completamente normal passar por fases mais difíceis. Estou aqui para te apoiar, e lembra-te: pequenos passos contam.</>
                                                                        ) : (
                                                                            <> neutras ou mistas. Isso mostra que estás a navegar os altos e baixos da vida, o que é humano e esperado.</>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <> Encorajo-te a escrever mais nas tuas reflexões - expressar pensamentos e sentimentos ajuda a processar emoções e a identificar padrões. </>
                                                                )}
                                                            </p>

                                                            {/* Paragraph 6: Highlights */}
                                                            {bestDate && totalConsumptions > 0 && (
                                                                <p>
                                                                    {bestCount <= 2 ? (
                                                                        <>
                                                                            Destaco o dia <strong className={(darkMode ? 'text-green-400' : 'text-green-600')}>{new Date(bestDate).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}</strong>, onde tiveste apenas {bestCount} {bestCount === 1 ? 'consumo' : 'consumos'}.
                                                                            <span className={'font-medium ' + (darkMode ? 'text-green-400' : 'text-green-600')}> O que fizeste diferente nesse dia? Identificar essas estratégias pode ser a chave para replicar esse sucesso.</span>
                                                                        </>
                                                                    ) : worstDate && worstCount >= 8 ? (
                                                                        <>
                                                                            Repara que em <strong className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>{new Date(worstDate).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}</strong> houve {worstCount} consumos. Não te culpes - em vez disso, pergunta-te: o que aconteceu? Houve gatilhos específicos? Stress? Tédio? Compreender é o primeiro passo para prevenir.
                                                                        </>
                                                                    ) : null}
                                                                </p>
                                                            )}

                                                            {/* Paragraph 7: Bedtime & Sleep Patterns */}
                                                            {(() => {
                                                                // Filtrar apenas bedtimes válidos (21:00-05:59, excluir 06:00-20:59)
                                                                const cyclesWithValidBedtime = filteredCycles.filter(c => {
                                                                    if (!c.bedtime) return false;
                                                                    const [hours] = c.bedtime.split(':').map(Number);
                                                                    // Excluir horas de dia (06:00-20:59) que não são horas de deitar
                                                                    if (hours >= 6 && hours < 21) return false;
                                                                    return true;
                                                                });

                                                                if (cyclesWithValidBedtime.length === 0) return null;

                                                                const getBedtimeMinutes = (bedtime) => {
                                                                    const [hours, minutes] = bedtime.split(':').map(Number);
                                                                    // Ajustar madrugada (00:00-05:59) para 24:00-29:59
                                                                    if (hours >= 0 && hours < 6) return (hours + 24) * 60 + minutes;
                                                                    return hours * 60 + minutes;
                                                                };

                                                                const avgBedtimeMinutes = cyclesWithValidBedtime.reduce((sum, c) => sum + getBedtimeMinutes(c.bedtime), 0) / cyclesWithValidBedtime.length;
                                                                // Converter de volta para 0-23h se necessário
                                                                const adjustedMinutes = avgBedtimeMinutes >= 1440 ? avgBedtimeMinutes - 1440 : avgBedtimeMinutes;
                                                                const avgBedtimeHours = Math.floor(adjustedMinutes / 60);
                                                                const avgBedtimeMins = Math.round(adjustedMinutes % 60);
                                                                const avgBedtimeStr = `${String(avgBedtimeHours).padStart(2, '0')}:${String(avgBedtimeMins).padStart(2, '0')}`;

                                                                return (
                                                                    <p>
                                                                        Sobre a tua rotina de sono: estás a deitar-te em média às <strong className={(darkMode ? 'text-indigo-400' : 'text-indigo-600')}>{avgBedtimeStr}</strong>.
                                                                        {avgBedtimeHours >= 0 && avgBedtimeHours < 6 ? (
                                                                            <> <span className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>Deitar muito tarde (madrugada) pode afetar a qualidade do sono e a recuperação.</span> Considera criar uma rotina relaxante antes de dormir para adormecer mais cedo.</>
                                                                        ) : avgBedtimeHours >= 22 && avgBedtimeHours < 24 ? (
                                                                            <> <span className={(darkMode ? 'text-green-400' : 'text-green-600')}>Essa é uma boa janela para deitar!</span> Estás a manter uma rotina saudável de sono.</>
                                                                        ) : avgBedtimeHours >= 6 && avgBedtimeHours < 12 ? (
                                                                            <> Deitar de manhã pode indicar inversão do ciclo de sono, o que pode afetar a tua energia e humor durante o dia.</>
                                                                        ) : (
                                                                            <> Continua a observar como esta rotina afeta o teu bem-estar geral.</>
                                                                        )}
                                                                    </p>
                                                                );
                                                            })()}

                                                            {/* Paragraph 8: Self-Care Analysis */}
                                                            {(() => {
                                                                const periodWellbeing = filteredWellbeingLogs;
                                                                if (periodWellbeing.length < 3) return null;

                                                                const areas = { water: 0, food: 0, rest: 0, social: 0 };
                                                                periodWellbeing.forEach(w => {
                                                                    if (w.water) areas.water++;
                                                                    if (w.food) areas.food++;
                                                                    if (w.rest) areas.rest++;
                                                                    if (w.social) areas.social++;
                                                                });

                                                                const percentages = {
                                                                    water: (areas.water / periodWellbeing.length) * 100,
                                                                    food: (areas.food / periodWellbeing.length) * 100,
                                                                    rest: (areas.rest / periodWellbeing.length) * 100,
                                                                    social: (areas.social / periodWellbeing.length) * 100
                                                                };

                                                                const lowAreas = Object.entries(percentages)
                                                                    .filter(([_, pct]) => pct < 70)
                                                                    .sort((a, b) => a[1] - b[1]);

                                                                const areaNames = { water: 'hidratação', food: 'alimentação', rest: 'descanso', social: 'socialização' };
                                                                const overall = (percentages.water + percentages.food + percentages.rest + percentages.social) / 4;

                                                                return (
                                                                    <p>
                                                                        No autocuidado, a tua taxa geral está em <strong className={(overall >= 70 ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-orange-400' : 'text-orange-600'))}>{overall.toFixed(0)}%</strong>.
                                                                        {lowAreas.length >= 3 ? (
                                                                            <> Reparei que estás abaixo dos 70% em várias áreas. <span className={(darkMode ? 'text-yellow-400' : 'text-yellow-600')}>Pequenos hábitos diários fazem diferença - começa por {areaNames[lowAreas[0][0]]} e {areaNames[lowAreas[1][0]]} regular.</span></>
                                                                        ) : lowAreas.length === 2 ? (
                                                                            <> Atenção a {areaNames[lowAreas[0][0]]} ({lowAreas[0][1].toFixed(0)}%) e {areaNames[lowAreas[1][0]]} ({lowAreas[1][1].toFixed(0)}%). Criar rotinas simples pode ajudar!</>
                                                                        ) : lowAreas.length === 1 ? (
                                                                            <> Foca em melhorar {areaNames[lowAreas[0][0]]} ({lowAreas[0][1].toFixed(0)}%) - pequenos passos contam!</>
                                                                        ) : (
                                                                            <> <span className={(darkMode ? 'text-green-400' : 'text-green-600')}>Excelente! Estás a manter bons hábitos em todas as áreas.</span></>
                                                                        )}
                                                                    </p>
                                                                );
                                                            })()}

                                                            {/* Paragraph 9: Goals Achievement */}
                                                            {goals.length > 0 && (() => {
                                                                const totalAchievements = goals.reduce((sum, g) => sum + getGoalAchievementCount(g, filteredConsumptions, filteredDailyLogs, filteredCycles, filteredWellbeingLogs), 0);
                                                                const goalsWithAchievements = goals.filter(g => getGoalAchievementCount(g, filteredConsumptions, filteredDailyLogs, filteredCycles, filteredWellbeingLogs) > 0);

                                                                return (
                                                                    <p>
                                                                        Sobre as tuas metas: cumpriste condições das tuas metas <strong className={(darkMode ? 'text-pink-400' : 'text-pink-600')}>{totalAchievements} vezes</strong> neste período!
                                                                        {goalsWithAchievements.length === goals.length ? (
                                                                            <> <span className={(darkMode ? 'text-green-400' : 'text-green-600')}>Todas as {goals.length} metas ativas tiveram pelo menos um cumprimento - isso é incrível!</span></>
                                                                        ) : goalsWithAchievements.length > 0 ? (
                                                                            <> Conseguiste progredir em {goalsWithAchievements.length} de {goals.length} metas. Continua focado/a nas que ainda não atingiste.</>
                                                                        ) : (
                                                                            <> Ainda não atingiste nenhuma meta neste período, mas não desanimes - ajustar metas ou estratégias é parte do processo.</>
                                                                        )}
                                                                    </p>
                                                                );
                                                            })()}

                                                            {/* Paragraph 10: Sleep-Mood Correlation */}
                                                            {(() => {
                                                                const dailyData = {};

                                                                filteredWellbeingLogs.forEach(w => {
                                                                    const wDate = w.date || safeToISODate(w.timestamp);
                                                                    if (!wDate) return;
                                                                    if (!dailyData[wDate]) dailyData[wDate] = { sleep: null, mood: null };
                                                                    if (w.sleep) dailyData[wDate].sleep = parseFloat(w.sleep);
                                                                    if (w.mood) dailyData[wDate].mood = parseInt(w.mood);
                                                                });

                                                                const sortedDates = Object.keys(dailyData).sort();
                                                                const nextDaySleepMood = [];

                                                                for (let i = 0; i < sortedDates.length - 1; i++) {
                                                                    const today = dailyData[sortedDates[i]];
                                                                    const tomorrow = dailyData[sortedDates[i + 1]];
                                                                    if (today.sleep !== null && tomorrow.mood !== null) {
                                                                        nextDaySleepMood.push({ sleep: today.sleep, mood: tomorrow.mood });
                                                                    }
                                                                }

                                                                if (nextDaySleepMood.length < 3) return null;

                                                                const correlation = calculatePearsonCorrelation(nextDaySleepMood, 'sleep', 'mood');
                                                                if (correlation === null) return null;

                                                                return (
                                                                    <p>
                                                                        Descobri uma correlação interessante: o sono de hoje e o humor de amanhã têm uma correlação de <strong className={(correlation > 0.4 ? (darkMode ? 'text-green-400' : 'text-green-600') : correlation < -0.2 ? (darkMode ? 'text-red-400' : 'text-red-600') : (darkMode ? 'text-gray-400' : 'text-gray-600'))}>{correlation.toFixed(2)}</strong>.
                                                                        {correlation > 0.4 ? (
                                                                            <> <span className={(darkMode ? 'text-green-400' : 'text-green-600')}>Dormir bem melhora claramente o teu humor no dia seguinte!</span> Priorizar o sono é investir no teu bem-estar emocional.</>
                                                                        ) : correlation < -0.2 ? (
                                                                            <> Curiosamente, mais sono parece correlacionar-se com pior humor - isto pode indicar que dormir demasiado (possivelmente depressão) ou má qualidade de sono afeta o humor.</>
                                                                        ) : (
                                                                            <> Não há uma relação clara entre sono e humor nos teus dados. Outros fatores podem estar a influenciar mais o teu estado emocional.</>
                                                                        )}
                                                                    </p>
                                                                );
                                                            })()}

                                                            {/* Paragraph 11: Tendência (se aplicável) */}
                                                            {(() => {
                                                                if (totalConsumptions === 0) return null;

                                                                const now = new Date();
                                                                let recentPeriod, previousPeriod, periodLabel;

                                                                // Adaptar comparação ao filtro selecionado
                                                                if (patternsPeriod === 'hoje') {
                                                                    // Comparar hoje vs ontem
                                                                    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                                                                    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
                                                                    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);

                                                                    recentPeriod = consumptions.filter(c => new Date(c.timestamp) >= todayStart);
                                                                    previousPeriod = consumptions.filter(c => {
                                                                        const d = new Date(c.timestamp);
                                                                        return d >= yesterdayStart && d <= yesterdayEnd;
                                                                    });
                                                                    periodLabel = { recent: 'hoje', previous: 'ontem' };
                                                                } else if (patternsPeriod === 'semana') {
                                                                    // Comparar esta semana vs semana anterior
                                                                    const sevenDaysAgo = new Date(now);
                                                                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                                                                    const fourteenDaysAgo = new Date(now);
                                                                    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

                                                                    recentPeriod = consumptions.filter(c => new Date(c.timestamp) >= sevenDaysAgo);
                                                                    previousPeriod = consumptions.filter(c => {
                                                                        const d = new Date(c.timestamp);
                                                                        return d >= fourteenDaysAgo && d < sevenDaysAgo;
                                                                    });
                                                                    periodLabel = { recent: 'nesta semana', previous: 'na anterior' };
                                                                } else if (patternsPeriod === 'mês') {
                                                                    // Comparar este mês vs mês anterior
                                                                    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                                                                    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                                                    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

                                                                    recentPeriod = consumptions.filter(c => new Date(c.timestamp) >= thisMonthStart);
                                                                    previousPeriod = consumptions.filter(c => {
                                                                        const d = new Date(c.timestamp);
                                                                        return d >= lastMonthStart && d <= lastMonthEnd;
                                                                    });
                                                                    periodLabel = { recent: 'neste mês', previous: 'no anterior' };
                                                                } else {
                                                                    // 'tudo': Comparar últimos 7 dias vs 7 dias anteriores
                                                                    const sevenDaysAgo = new Date(now);
                                                                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                                                                    const fourteenDaysAgo = new Date(now);
                                                                    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

                                                                    recentPeriod = consumptions.filter(c => new Date(c.timestamp) >= sevenDaysAgo);
                                                                    previousPeriod = consumptions.filter(c => {
                                                                        const d = new Date(c.timestamp);
                                                                        return d >= fourteenDaysAgo && d < sevenDaysAgo;
                                                                    });
                                                                    periodLabel = { recent: 'na última semana', previous: 'na anterior' };
                                                                }

                                                                if (recentPeriod.length === 0 || previousPeriod.length === 0) return null;

                                                                const percentChange = ((recentPeriod.length - previousPeriod.length) / previousPeriod.length) * 100;

                                                                // Só mostrar se mudança significativa (>20%)
                                                                if (Math.abs(percentChange) < 20) return null;

                                                                return (
                                                                    <p>
                                                                        {percentChange > 0 ? (
                                                                            <>
                                                                                📈 <strong className={(darkMode ? 'text-orange-400' : 'text-orange-600')}>Tendência:</strong> O consumo aumentou <strong>{Math.abs(percentChange).toFixed(0)}%</strong> {periodLabel.recent} comparado {periodLabel.previous} (de {previousPeriod.length} para {recentPeriod.length} consumos).
                                                                                <span className={(darkMode ? 'text-yellow-400' : 'text-yellow-600')}> Sem julgamento - só dados. O que mudou? Stress? Menos sono? Menos apoio? Identifica o trigger e ajusta o plano.</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                📉 <strong className={(darkMode ? 'text-green-400' : 'text-green-600')}>Tendência:</strong> O consumo diminuiu <strong>{Math.abs(percentChange).toFixed(0)}%</strong> {periodLabel.recent} comparado {periodLabel.previous} (de {previousPeriod.length} para {recentPeriod.length} consumos).
                                                                                <span className={'font-medium ' + (darkMode ? 'text-green-400' : 'text-green-600')}> Parabéns! Isto é progresso real. O que fizeste diferente? Identifica essas estratégias para continuar este caminho!</span>
                                                                            </>
                                                                        )}
                                                                    </p>
                                                                );
                                                            })()}

                                                            {/* Paragraph 12: Autoconhecimento */}
                                                            {(filteredWellbeingLogs.length > 3 || filteredCycles.length > 2) && (
                                                                <p>
                                                                    ✨ <strong className={(darkMode ? 'text-cyan-400' : 'text-cyan-600')}>Autoconhecimento:</strong> Estás a registar de forma consistente
                                                                    {filteredWellbeingLogs.length > 0 && <> (bem-estar)</>}
                                                                    {filteredCycles.length > 0 && <>{filteredWellbeingLogs.length > 0 && ','} ciclos de sono</>}.
                                                                    <span className={'font-medium ' + (darkMode ? 'text-cyan-400' : 'text-cyan-600')}> Isto já é um passo enorme! Registar é autoconsciência. Os padrões vão-se tornando mais claros com o tempo, e isso dá-te poder para agir.</span>
                                                                </p>
                                                            )}

                                                            {/* Paragraph 13: Tu Tens o Controlo */}
                                                            <p className={'font-medium ' + (darkMode ? 'text-purple-300' : 'text-purple-700')}>
                                                                💪 <strong>Tu tens o controlo.</strong> Estes dados são teus. Este progresso é teu. Este poder de escolha é teu.
                                                                <span className={(darkMode ? 'text-purple-400' : 'text-purple-600')}> Cada decisão que tomas - registar, refletir, ajustar - é um ato de autonomia. Continua a usar esta app, continua a analisar, continua a crescer. 🚀</span>
                                                            </p>

                                                            {/* Paragraph 14: Closing & Next Steps */}
                                                            <p className={'font-medium pt-2 border-t ' + (darkMode ? 'border-gray-700 text-purple-400' : 'border-gray-200 text-purple-600')}>
                                                                🤝 <strong>Compromisso:</strong> O simples facto de estares aqui, a registar, a refletir, a analisar - isso já é mudança.
                                                                <span> Redução de danos não é perfeição, é progresso. E tu estás a progredir, um dia de cada vez.</span>
                                                                <br/><br/>
                                                                Lembra-te: a recuperação não é linear. Haverá dias melhores e piores, e isso é normal. O importante é continuares a aparecer.
                                                                Estou orgulhoso/a do caminho que estás a percorrer. Vamos continuar juntos. 💜
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            )}
                            {currentView === 'analyses' && (
                                <div className="space-y-6">
                                    <h2 className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>Análises</h2>

                                    {/* Temporal Filters */}
                                    <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-4 border'}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className={'text-sm font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800')}>Período de análise</div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setPatternsPeriodOffset(prev => prev - 1)} disabled={patternsPeriodOffset >= 0 || patternsPeriod === 'tudo'} className={(patternsPeriodOffset >= 0 || patternsPeriod === 'tudo') ? 'opacity-30 cursor-not-allowed p-1.5 rounded transition' : 'p-1.5 rounded transition hover:bg-gray-700'}>
                                                    <Icons.ChevronLeft className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setPatternsPeriodOffset(prev => prev + 1)} disabled={patternsPeriodOffset === 0 || patternsPeriod === 'tudo'} className={(patternsPeriodOffset === 0 || patternsPeriod === 'tudo') ? 'opacity-30 cursor-not-allowed p-1.5 rounded transition' : 'p-1.5 rounded transition hover:bg-gray-700'}>
                                                    <Icons.ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 overflow-x-auto pb-2">
                                            {['hoje', 'semana', 'mes', 'tudo'].map(period => (
                                                <button key={period} onClick={() => { setPatternsPeriod(period); setPatternsPeriodOffset(0); }} className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ' + (patternsPeriod === period ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                                    {period === 'hoje' && 'Hoje'}
                                                    {period === 'semana' && 'Semana'}
                                                    {period === 'mes' && 'Mês'}
                                                    {period === 'tudo' && 'Tudo'}
                                                </button>
                                            ))}
                                        </div>
                                        {patternsPeriod !== 'tudo' && (
                                            <div className={'text-xs mt-2 text-center ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                {(() => {
                                                    const dateRange = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);
                                                    return new Date(dateRange.start).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) + ' - ' + new Date(dateRange.end).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
                                                })()}
                                            </div>
                                        )}
                                    </div>

                                    {(() => {
                                        // Apply temporal filter to all data
                                        const dateRange = getDateRangeForPeriod(patternsPeriod, patternsPeriodOffset);
                                        const filteredConsumptions = filterByDateRange(consumptions, dateRange);
                                        const filteredWellbeingLogs = filterByDateRange(wellbeingLogs, dateRange);
                                        const filteredCycles = filterByDateRange(cycles, dateRange);
                                        const filteredReflections = filterByDateRange(reflections, dateRange);

                                        // Usar dados filtrados diretamente (sem excluir dia atual)
                                        const analysisConsumptions = filteredConsumptions;
                                        const analysisWellbeing = filteredWellbeingLogs;
                                        const analysisCycles = filteredCycles;

                                            // Calculate all needed data
                                            const byHour = {};
                                            analysisConsumptions.forEach(c => {
                                                const hour = new Date(c.timestamp).getHours();
                                                byHour[hour] = (byHour[hour] || 0) + 1;
                                            });

                                            const byPartOfDay = { manha: 0, tarde: 0, noite: 0, madrugada: 0 };
                                            analysisConsumptions.forEach(c => {
                                                const hour = new Date(c.timestamp).getHours();
                                                if (hour >= 6 && hour < 12) byPartOfDay.manha++;
                                                else if (hour >= 12 && hour < 18) byPartOfDay.tarde++;
                                                else if (hour >= 18 && hour < 24) byPartOfDay.noite++;
                                                else byPartOfDay.madrugada++;
                                            });

                                            const byWeekday = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
                                            const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                                            analysisConsumptions.forEach(c => {
                                                const day = new Date(c.timestamp).getDay();
                                                byWeekday[day]++;
                                            });

                                            const sorted = [...analysisConsumptions].sort((a,b) => a.timestamp.localeCompare(b.timestamp));
                                            const intervals = [];
                                            for (let i = 1; i < sorted.length; i++) {
                                                const diff = (new Date(sorted[i].timestamp) - new Date(sorted[i-1].timestamp)) / (1000 * 60 * 60);
                                                intervals.push({ hours: diff, date: sorted[i].date });
                                            }

                                            return (
                                                <div className="space-y-4">
                                                    {/* Sub-tab navigation */}
                                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                                        {['temporal', 'estrutural', 'correlacoes'].map(subView => (
                                                            <button
                                                                key={subView}
                                                                onClick={() => setAnalysisSubView(subView)}
                                                                className={'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ' + (analysisSubView === subView ? (darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white') : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}
                                                            >
                                                                {subView === 'temporal' && '⏰ Temporal'}
                                                                {subView === 'estrutural' && '📊 Estrutural'}
                                                                {subView === 'correlacoes' && '🔗 Correlações'}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* TEMPORAL */}
                                                    {analysisSubView === 'temporal' && (
                                                        <div className="space-y-4">
                                                            {/* Análise de Intervalos Simplificada */}
                                                            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                                <h3 className={'font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>⏱️ Intervalos Entre Consumos</h3>
                                                                {intervals.length === 0 ? (
                                                                    <div className={'text-center py-4 text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>
                                                                        Sem intervalos (necessário ≥2 consumos)
                                                                    </div>
                                                                ) : (() => {
                                                                    const goodIntervals = intervals.filter(i => i.hours >= 2);
                                                                    const shortIntervals = intervals.filter(i => i.hours < 2);
                                                                    const avgInterval = intervals.reduce((sum, i) => sum + i.hours, 0) / intervals.length;
                                                                    const maxInterval = Math.max(...intervals.map(i => i.hours));
                                                                    const goodPercent = ((goodIntervals.length / intervals.length) * 100).toFixed(0);
                                                                    const shortPercent = ((shortIntervals.length / intervals.length) * 100).toFixed(0);

                                                                    return (
                                                                        <>
                                                                            <div className="grid grid-cols-3 gap-3 mb-4">
                                                                                <div className={`${darkMode ? 'bg-purple-900/30 border border-purple-700/50' : 'bg-purple-50 border-purple-200'} rounded-lg p-3 text-center border`}>
                                                                                    <div className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{intervals.length}</div>
                                                                                    <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Total</div>
                                                                                </div>
                                                                                <div className={`${darkMode ? 'bg-blue-900/30 border border-blue-700/50' : 'bg-blue-50 border-blue-200'} rounded-lg p-3 text-center border`}>
                                                                                    <div className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{avgInterval.toFixed(1)}h</div>
                                                                                    <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Média</div>
                                                                                </div>
                                                                                <div className={`${darkMode ? 'bg-green-900/30 border border-green-700/50' : 'bg-green-50 border-green-200'} rounded-lg p-3 text-center border`}>
                                                                                    <div className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{maxInterval.toFixed(1)}h</div>
                                                                                    <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Máximo</div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="space-y-3">
                                                                                {/* Bons intervalos (≥2h) */}
                                                                                <div className={`${darkMode ? 'bg-green-900/20 border border-green-700/50' : 'bg-green-50 border border-green-200'} rounded-lg p-4`}>
                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                        <div className={`text-sm font-medium flex items-center gap-2 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                                                                                            <span>✅</span>
                                                                                            <span>Intervalos Bons (≥2h)</span>
                                                                                        </div>
                                                                                        <div className={`text-sm font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                                                                                            {goodIntervals.length} ({goodPercent}%)
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} rounded-full h-3 overflow-hidden`}>
                                                                                        <div className="bg-green-500 h-full transition-all duration-500" style={{width: goodPercent + '%'}}></div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Intervalos curtos (<2h) */}
                                                                                <div className={`${darkMode ? 'bg-orange-900/20 border border-orange-700/50' : 'bg-orange-50 border border-orange-200'} rounded-lg p-4`}>
                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                        <div className={`text-sm font-medium flex items-center gap-2 ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>
                                                                                            <span>⚠️</span>
                                                                                            <span>Intervalos Curtos (&lt;2h)</span>
                                                                                        </div>
                                                                                        <div className={`text-sm font-bold ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>
                                                                                            {shortIntervals.length} ({shortPercent}%)
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className={`${darkMode ? 'bg-gray-700' : 'bg-white'} rounded-full h-3 overflow-hidden`}>
                                                                                        <div className="bg-orange-500 h-full transition-all duration-500" style={{width: shortPercent + '%'}}></div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className={`${darkMode ? 'bg-indigo-900/20 border-indigo-700/50' : 'bg-indigo-50 border-indigo-200'} rounded-lg p-3 mt-4 border`}>
                                                                                <p className={`text-xs leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                                                    {goodPercent >= 50
                                                                                        ? '🌟 Ótimo! Mais de metade dos intervalos são ≥2h. Continua assim!'
                                                                                        : '💪 Foca-te em aumentar o tempo entre consumos. Cada melhoria conta!'}
                                                                                </p>
                                                                            </div>
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>

                                                            {/* Gatilhos */}
                                                            {filteredCycles.length > 0 && filteredCycles.some(c => c.triggers && c.triggers.length > 0) && (
                                                                <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-4 border'}>
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <span className="text-lg">⚡</span>
                                                                        <h3 className={'font-semibold text-sm ' + (darkMode ? 'text-white' : 'text-gray-800')}>Análise de Gatilhos</h3>
                                                                    </div>
                                                                    {(() => {
                                                                        // Calcular gatilhos e média de consumos por gatilho
                                                                        const triggerData = {};

                                                                        filteredCycles.forEach(cycle => {
                                                                            if (!cycle.triggers || cycle.triggers.length === 0) return;

                                                                            // Encontrar data do ciclo usando o timestamp
                                                                            const cycleDate = safeToISODate(cycle.timestamp);
                                                                            if (!cycleDate) return;

                                                                            // Contar consumos nesse dia
                                                                            const dayConsumptions = filteredConsumptions.filter(c => c.date === cycleDate).length;

                                                                            cycle.triggers.forEach(trigger => {
                                                                                if (!triggerData[trigger]) {
                                                                                    triggerData[trigger] = { count: 0, totalConsumptions: 0, days: [] };
                                                                                }
                                                                                triggerData[trigger].count++;
                                                                                triggerData[trigger].totalConsumptions += dayConsumptions;
                                                                                triggerData[trigger].days.push(cycleDate);
                                                                            });
                                                                        });

                                                                        // Calcular média de consumos para cada gatilho
                                                                        const triggersWithAvg = Object.entries(triggerData).map(([trigger, data]) => ({
                                                                            trigger,
                                                                            count: data.count,
                                                                            avgConsumptions: data.count > 0 ? data.totalConsumptions / data.count : 0
                                                                        }));

                                                                        // Gatilhos com MAIOR consumo (top 3)
                                                                        const highRiskTriggers = triggersWithAvg
                                                                            .filter(t => t.count >= 2)
                                                                            .sort((a, b) => b.avgConsumptions - a.avgConsumptions)
                                                                            .slice(0, 3);

                                                                        // Gatilhos com MENOR consumo (bottom 2)
                                                                        const lowRiskTriggers = triggersWithAvg
                                                                            .filter(t => t.count >= 2 && t.avgConsumptions < 10)
                                                                            .sort((a, b) => a.avgConsumptions - b.avgConsumptions)
                                                                            .slice(0, 2);

                                                                        // Análise de emoções correlacionadas com consumo
                                                                        const emotionData = {};

                                                                        // Para cada registo de bem-estar
                                                                        filteredWellbeingLogs.forEach(log => {
                                                                            if (!log.emotions || log.emotions.length === 0) return;

                                                                            const logDate = safeToISODate(log.timestamp);
                                                                            if (!logDate) return;

                                                                            // Contar consumos nesse dia
                                                                            const dayConsumptions = filteredConsumptions.filter(c => c.date === logDate).length;

                                                                            log.emotions.forEach(emotion => {
                                                                                if (!emotionData[emotion]) {
                                                                                    emotionData[emotion] = { count: 0, totalConsumptions: 0, days: [] };
                                                                                }
                                                                                emotionData[emotion].count++;
                                                                                emotionData[emotion].totalConsumptions += dayConsumptions;
                                                                                emotionData[emotion].days.push(logDate);
                                                                            });
                                                                        });

                                                                        // Calcular média de consumos para cada emoção e ordenar
                                                                        const emotionsWithAvg = Object.entries(emotionData).map(([emotion, data]) => ({
                                                                            emotion,
                                                                            count: data.count,
                                                                            avgConsumptions: data.count > 0 ? data.totalConsumptions / data.count : 0
                                                                        }));

                                                                        // Emoções com MAIOR consumo (top 2)
                                                                        const highRiskEmotions = emotionsWithAvg
                                                                            .filter(e => e.count >= 2) // Apenas emoções registadas 2+ vezes
                                                                            .sort((a, b) => b.avgConsumptions - a.avgConsumptions)
                                                                            .slice(0, 2);

                                                                        // Emoções com MENOR consumo (bottom 2)
                                                                        const lowRiskEmotions = emotionsWithAvg
                                                                            .filter(e => e.count >= 2 && e.avgConsumptions < 10) // Menos de 10 consumos em média
                                                                            .sort((a, b) => a.avgConsumptions - b.avgConsumptions)
                                                                            .slice(0, 2);

                                                                        return (
                                                                            <div className="space-y-3">
                                                                                {/* GATILHOS (situações/contextos) */}
                                                                                <div>
                                                                                    <h4 className={'text-xs font-semibold mb-2 uppercase tracking-wide ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                                        Análise de Gatilhos
                                                                                    </h4>

                                                                                    {highRiskTriggers.length === 0 && lowRiskTriggers.length === 0 ? (
                                                                                        <div className={'text-center py-3 text-sm rounded-lg ' + (darkMode ? 'bg-gray-700/30 text-gray-400' : 'bg-gray-50 text-gray-500')}>
                                                                                            Sem dados suficientes de gatilhos neste período
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="space-y-2">
                                                                                            {/* Gatilhos de ALTO risco (mais consumo) */}
                                                                                            {highRiskTriggers.length > 0 && (
                                                                                                <div>
                                                                                                    <div className={'text-xs font-medium mb-1 ' + (darkMode ? 'text-red-400' : 'text-red-600')}>
                                                                                                        🔴 Alto Risco (mais consumo)
                                                                                                    </div>
                                                                                                    {highRiskTriggers.map(t => (
                                                                                                        <div key={t.trigger} className={(darkMode ? 'bg-red-900/20 border-red-700/50' : 'bg-red-50 border-red-200') + ' rounded-lg p-3 border mb-2'}>
                                                                                                            <div className="flex items-center justify-between mb-1">
                                                                                                                <span className={'font-medium text-sm ' + (darkMode ? 'text-red-300' : 'text-red-700')}>{t.trigger}</span>
                                                                                                                <span className={(darkMode ? 'bg-red-700/50 text-red-200' : 'bg-red-200 text-red-800') + ' rounded-full px-2 py-0.5 text-xs font-bold'}>{t.count}x</span>
                                                                                                            </div>
                                                                                                            <div className={'text-xs ' + (darkMode ? 'text-red-400/70' : 'text-red-600/70')}>
                                                                                                                ⚠️ Nos dias com este gatilho: média de <span className="font-bold">{t.avgConsumptions.toFixed(1)} consumos</span>. Esta situação é um fator de risco - prepara um plano de ação para quando surgir.
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Gatilhos de BAIXO risco (menos consumo) */}
                                                                                            {lowRiskTriggers.length > 0 && (
                                                                                                <div>
                                                                                                    <div className={'text-xs font-medium mb-1 ' + (darkMode ? 'text-green-400' : 'text-green-600')}>
                                                                                                        🟢 Baixo Risco (menos consumo)
                                                                                                    </div>
                                                                                                    {lowRiskTriggers.map(t => (
                                                                                                        <div key={t.trigger} className={(darkMode ? 'bg-green-900/20 border-green-700/50' : 'bg-green-50 border-green-200') + ' rounded-lg p-3 border mb-2'}>
                                                                                                            <div className="flex items-center justify-between mb-1">
                                                                                                                <span className={'font-medium text-sm ' + (darkMode ? 'text-green-300' : 'text-green-700')}>{t.trigger}</span>
                                                                                                                <span className={(darkMode ? 'bg-green-700/50 text-green-200' : 'bg-green-200 text-green-800') + ' rounded-full px-2 py-0.5 text-xs font-bold'}>{t.count}x</span>
                                                                                                            </div>
                                                                                                            <div className={'text-xs ' + (darkMode ? 'text-green-400/70' : 'text-green-600/70')}>
                                                                                                                ✓ Nos dias com este gatilho: média de <span className="font-bold">{t.avgConsumptions.toFixed(1)} consumos</span>. Esta situação é mais segura para ti!
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {/* EMOÇÕES (estados emocionais) */}
                                                                                <div>
                                                                                    <h4 className={'text-xs font-semibold mb-2 uppercase tracking-wide ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                                        Análise de Emoções
                                                                                    </h4>

                                                                                    {highRiskEmotions.length === 0 && lowRiskEmotions.length === 0 ? (
                                                                                        <div className={'text-center py-3 text-sm rounded-lg ' + (darkMode ? 'bg-gray-700/30 text-gray-400' : 'bg-gray-50 text-gray-500')}>
                                                                                            Sem dados suficientes de emoções neste período
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="space-y-2">
                                                                                            {/* Emoções de ALTO risco (mais consumo) */}
                                                                                            {highRiskEmotions.length > 0 && (
                                                                                                <div>
                                                                                                    <div className={'text-xs font-medium mb-1 ' + (darkMode ? 'text-red-400' : 'text-red-600')}>
                                                                                                        🔴 Alto Risco (mais consumo)
                                                                                                    </div>
                                                                                                    {highRiskEmotions.map(e => (
                                                                                                        <div key={e.emotion} className={(darkMode ? 'bg-red-900/20 border-red-700/50' : 'bg-red-50 border-red-200') + ' rounded-lg p-3 border mb-2'}>
                                                                                                            <div className="flex items-center justify-between mb-1">
                                                                                                                <span className={'font-medium text-sm ' + (darkMode ? 'text-red-300' : 'text-red-700')}>{e.emotion}</span>
                                                                                                                <span className={(darkMode ? 'bg-red-700/50 text-red-200' : 'bg-red-200 text-red-800') + ' rounded-full px-2 py-0.5 text-xs font-bold'}>{e.count}x</span>
                                                                                                            </div>
                                                                                                            <div className={'text-xs ' + (darkMode ? 'text-red-400/70' : 'text-red-600/70')}>
                                                                                                                ⚠️ Quando sentes isto: média de <span className="font-bold">{e.avgConsumptions.toFixed(1)} consumos</span>. Esta emoção é um momento crítico - prepara estratégias DBT para quando surgir.
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Emoções de BAIXO risco (menos consumo) */}
                                                                                            {lowRiskEmotions.length > 0 && (
                                                                                                <div>
                                                                                                    <div className={'text-xs font-medium mb-1 ' + (darkMode ? 'text-green-400' : 'text-green-600')}>
                                                                                                        🟢 Baixo Risco (menos consumo)
                                                                                                    </div>
                                                                                                    {lowRiskEmotions.map(e => (
                                                                                                        <div key={e.emotion} className={(darkMode ? 'bg-green-900/20 border-green-700/50' : 'bg-green-50 border-green-200') + ' rounded-lg p-3 border mb-2'}>
                                                                                                            <div className="flex items-center justify-between mb-1">
                                                                                                                <span className={'font-medium text-sm ' + (darkMode ? 'text-green-300' : 'text-green-700')}>{e.emotion}</span>
                                                                                                                <span className={(darkMode ? 'bg-green-700/50 text-green-200' : 'bg-green-200 text-green-800') + ' rounded-full px-2 py-0.5 text-xs font-bold'}>{e.count}x</span>
                                                                                                            </div>
                                                                                                            <div className={'text-xs ' + (darkMode ? 'text-green-400/70' : 'text-green-600/70')}>
                                                                                                                ✓ Quando sentes isto: média de <span className="font-bold">{e.avgConsumptions.toFixed(1)} consumos</span>. Este é um estado emocional mais seguro para ti!
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* ESTRUTURAL */}
                                                    {analysisSubView === 'estrutural' && (
                                                        <div className="space-y-4">
                                                            {/* Por horário */}
                                                            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                                <h3 className={'font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>🕐 Consumo por Horário</h3>
                                                                {Object.keys(byHour).length === 0 ? (
                                                                    <div className={'text-center py-4 text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>Sem dados</div>
                                                                ) : (() => {
                                                                    const totalHour = Object.values(byHour).reduce((a, b) => a + b, 0);
                                                                    const maxCount = Math.max(...Object.values(byHour));

                                                                    // Agrupar horas em blocos de 3h para melhor visualização
                                                                    const hourBlocks = [
                                                                        { range: '00-02', hours: [0,1,2], icon: '🌙', label: 'Madrugada' },
                                                                        { range: '03-05', hours: [3,4,5], icon: '🌙', label: 'Madrugada' },
                                                                        { range: '06-08', hours: [6,7,8], icon: '🌅', label: 'Manhã' },
                                                                        { range: '09-11', hours: [9,10,11], icon: '☀️', label: 'Manhã' },
                                                                        { range: '12-14', hours: [12,13,14], icon: '🌤️', label: 'Tarde' },
                                                                        { range: '15-17', hours: [15,16,17], icon: '🌤️', label: 'Tarde' },
                                                                        { range: '18-20', hours: [18,19,20], icon: '🌆', label: 'Noite' },
                                                                        { range: '21-23', hours: [21,22,23], icon: '🌃', label: 'Noite' }
                                                                    ];

                                                                    return (
                                                                        <div className="space-y-2">
                                                                            {hourBlocks.map(block => {
                                                                                const blockCount = block.hours.reduce((sum, h) => sum + (byHour[h] || 0), 0);
                                                                                const blockPercent = totalHour > 0 ? Math.round((blockCount / totalHour) * 100) : 0;
                                                                                const intensity = maxCount > 0 ? (blockCount / maxCount) : 0;

                                                                                // Cores por período
                                                                                let colorClass = '';
                                                                                if (block.label === 'Madrugada') {
                                                                                    colorClass = intensity > 0.7 ? 'bg-purple-600' : intensity > 0.4 ? 'bg-purple-500' : intensity > 0.1 ? 'bg-purple-400' : (darkMode ? 'bg-gray-700' : 'bg-gray-100');
                                                                                } else if (block.label === 'Manhã') {
                                                                                    colorClass = intensity > 0.7 ? 'bg-orange-600' : intensity > 0.4 ? 'bg-orange-500' : intensity > 0.1 ? 'bg-orange-400' : (darkMode ? 'bg-gray-700' : 'bg-gray-100');
                                                                                } else if (block.label === 'Tarde') {
                                                                                    colorClass = intensity > 0.7 ? 'bg-yellow-600' : intensity > 0.4 ? 'bg-yellow-500' : intensity > 0.1 ? 'bg-yellow-400' : (darkMode ? 'bg-gray-700' : 'bg-gray-100');
                                                                                } else {
                                                                                    colorClass = intensity > 0.7 ? 'bg-blue-600' : intensity > 0.4 ? 'bg-blue-500' : intensity > 0.1 ? 'bg-blue-400' : (darkMode ? 'bg-gray-700' : 'bg-gray-100');
                                                                                }

                                                                                return (
                                                                                    <div key={block.range} className="flex items-center gap-3">
                                                                                        <div className={'text-xl w-8 text-center'}>
                                                                                            {block.icon}
                                                                                        </div>
                                                                                        <div className={'text-sm font-medium w-16 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                                                            {block.range}h
                                                                                        </div>
                                                                                        <div className="flex-1">
                                                                                            <div className={(darkMode ? 'bg-gray-700' : 'bg-gray-200') + ' rounded-full h-8 overflow-hidden relative'}>
                                                                                                <div className={colorClass + ' h-full flex items-center px-4 text-white text-sm font-bold transition-all duration-300'} style={{width: Math.max(blockPercent, blockCount > 0 ? 8 : 0) + '%'}}>
                                                                                                    {blockCount > 0 && (
                                                                                                        <span className="whitespace-nowrap">
                                                                                                            {blockCount}x {blockPercent > 0 && `· ${blockPercent}%`}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}

                                                                            {/* Legenda */}
                                                                            <div className={'text-xs mt-4 pt-3 border-t flex items-center justify-center gap-4 ' + (darkMode ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200')}>
                                                                                <span>💡 Intensidade de cor = frequência de consumos</span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>

                                                            {/* Por período do dia */}
                                                            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                                <h3 className={'font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>🌅 Por Período do Dia</h3>
                                                                {(() => {
                                                                    const total = byPartOfDay.manha + byPartOfDay.tarde + byPartOfDay.noite + byPartOfDay.madrugada;
                                                                    if (total === 0) return <div className={'text-center py-4 text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>Sem dados</div>;

                                                                    const manhaPercent = Math.round((byPartOfDay.manha / total) * 100);
                                                                    const tardePercent = Math.round((byPartOfDay.tarde / total) * 100);
                                                                    const noitePercent = Math.round((byPartOfDay.noite / total) * 100);
                                                                    const madrugadaPercent = Math.round((byPartOfDay.madrugada / total) * 100);

                                                                    return (
                                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                                            <div className={(darkMode ? 'bg-yellow-900/30 border-yellow-700/50' : 'bg-yellow-50 border-yellow-200') + ' rounded-lg p-4 text-center border'}>
                                                                                <div className="text-2xl mb-2">🌅</div>
                                                                                <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Manhã</div>
                                                                                <div className={'text-xs mb-2 ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>6h-12h</div>
                                                                                <div className={'text-xl font-bold ' + (darkMode ? 'text-yellow-400' : 'text-yellow-600')}>{manhaPercent}%</div>
                                                                                <div className={'text-xs mt-1 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>{byPartOfDay.manha}x</div>
                                                                            </div>
                                                                            <div className={(darkMode ? 'bg-orange-900/30 border-orange-700/50' : 'bg-orange-50 border-orange-200') + ' rounded-lg p-4 text-center border'}>
                                                                                <div className="text-2xl mb-2">☀️</div>
                                                                                <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Tarde</div>
                                                                                <div className={'text-xs mb-2 ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>12h-18h</div>
                                                                                <div className={'text-xl font-bold ' + (darkMode ? 'text-orange-400' : 'text-orange-600')}>{tardePercent}%</div>
                                                                                <div className={'text-xs mt-1 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>{byPartOfDay.tarde}x</div>
                                                                            </div>
                                                                            <div className={(darkMode ? 'bg-indigo-900/30 border-indigo-700/50' : 'bg-indigo-50 border-indigo-200') + ' rounded-lg p-4 text-center border'}>
                                                                                <div className="text-2xl mb-2">🌙</div>
                                                                                <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Noite</div>
                                                                                <div className={'text-xs mb-2 ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>18h-24h</div>
                                                                                <div className={'text-xl font-bold ' + (darkMode ? 'text-indigo-400' : 'text-indigo-600')}>{noitePercent}%</div>
                                                                                <div className={'text-xs mt-1 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>{byPartOfDay.noite}x</div>
                                                                            </div>
                                                                            <div className={(darkMode ? 'bg-purple-900/30 border-purple-700/50' : 'bg-purple-50 border-purple-200') + ' rounded-lg p-4 text-center border'}>
                                                                                <div className="text-2xl mb-2">⭐</div>
                                                                                <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Madrugada</div>
                                                                                <div className={'text-xs mb-2 ' + (darkMode ? 'text-gray-500' : 'text-gray-400')}>0h-6h</div>
                                                                                <div className={'text-xl font-bold ' + (darkMode ? 'text-purple-400' : 'text-purple-600')}>{madrugadaPercent}%</div>
                                                                                <div className={'text-xs mt-1 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>{byPartOfDay.madrugada}x</div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>

                                                            {/* Por dia da semana */}
                                                            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                                <h3 className={'font-semibold mb-4 ' + (darkMode ? 'text-white' : 'text-gray-800')}>📅 Por Dia da Semana</h3>
                                                                <div className="space-y-3">
                                                                    {Object.values(byWeekday).every(v => v === 0) ? (
                                                                        <div className={'text-center py-4 text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>Sem dados</div>
                                                                    ) : (() => {
                                                                        const totalWeekday = Object.values(byWeekday).reduce((a, b) => a + b, 0);
                                                                        return Object.entries(byWeekday).map(([day, count]) => {
                                                                            const percent = totalWeekday > 0 ? Math.round((count / totalWeekday) * 100) : 0;
                                                                            return (
                                                                                <div key={day} className="flex items-center gap-2">
                                                                                    <div className={'text-xs w-10 font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>{weekdayNames[parseInt(day)]}</div>
                                                                                    <div className={'flex-1 rounded-full h-7 overflow-hidden ' + (darkMode ? 'bg-gray-700' : 'bg-gray-100')}>
                                                                                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full flex items-center justify-between px-3 text-white text-xs font-medium transition-all" style={{width: Math.min(100, (count / Math.max(...Object.values(byWeekday))) * 100) + '%'}}>
                                                                                            <span>{count}x</span>
                                                                                            <span>{percent}%</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        });
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* CORRELAÇÕES */}
                                                    {analysisSubView === 'correlacoes' && (() => {
                                                        console.log('🔍 DEBUG CORRELAÇÕES:', {
                                                            totalConsumptions: consumptions.length,
                                                            analysisConsumptions: analysisConsumptions.length,
                                                            totalWellbeing: wellbeingLogs.length,
                                                            analysisWellbeing: analysisWellbeing.length
                                                        });

                                                        if (analysisConsumptions.length < 5) {
                                                            return (
                                                                <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-8 border text-center'}>
                                                                    <div className="text-6xl mb-4">🔗</div>
                                                                    <h3 className={'text-xl font-bold mb-2 ' + (darkMode ? 'text-white' : 'text-gray-800')}>Correlações</h3>
                                                                    <p className={'text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                        Precisas de mais dados para análise de correlações. (Tens {analysisConsumptions.length} consumos filtrados, precisas de pelo menos 5)
                                                                    </p>
                                                                </div>
                                                            );
                                                        }

                                                        // ===== 1. CORRELAÇÕES BIDIRECIONAIS =====
                                                        // Agregar dados por dia
                                                        const dailyData = {};

                                                        console.log('🔍 Amostra consumo:', analysisConsumptions[0]);
                                                        console.log('🔍 Amostra bem-estar:', analysisWellbeing[0]);

                                                        // Contar consumos por dia
                                                        analysisConsumptions.forEach(c => {
                                                            if (!dailyData[c.date]) dailyData[c.date] = { consumptions: 0, sleep: null, mood: null, energy: null };
                                                            dailyData[c.date].consumptions++;
                                                        });

                                                        // Adicionar bem-estar
                                                        analysisWellbeing.forEach(w => {
                                                            // Extrair data do timestamp se não houver campo date
                                                            const wDate = w.date || safeToISODate(w.timestamp);
                                                            if (!wDate) return; // Skip if invalid date
                                                            if (!dailyData[wDate]) dailyData[wDate] = { consumptions: 0, sleep: null, mood: null, energy: null };
                                                            if (w.sleep && !isNaN(parseFloat(w.sleep))) dailyData[wDate].sleep = parseFloat(w.sleep);
                                                            if (w.mood && !isNaN(parseInt(w.mood))) dailyData[wDate].mood = parseInt(w.mood);
                                                            if (w.energy && !isNaN(parseInt(w.energy))) dailyData[wDate].energy = parseInt(w.energy);
                                                        });

                                                        console.log('🔍 dailyData keys:', Object.keys(dailyData));
                                                        console.log('🔍 dailyData sample:', Object.entries(dailyData).slice(0, 3));

                                                        // Calcular correlações simples (comparar dias com mais vs menos consumo)
                                                        // IMPORTANTE: Filtrar apenas dias que têm CONSUMO E PELO MENOS UM DADO DE BEM-ESTAR
                                                        const daysWithData = Object.values(dailyData).filter(d =>
                                                            d.consumptions > 0 && (d.sleep !== null || d.mood !== null || d.energy !== null)
                                                        );

                                                        console.log('🔍 daysWithData length:', daysWithData.length);
                                                        console.log('🔍 daysWithData sample:', daysWithData.slice(0, 3));

                                                        if (daysWithData.length < 3) {
                                                            return (
                                                                <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-8 border text-center'}>
                                                                    <div className="text-6xl mb-4">🔗</div>
                                                                    <h3 className={'text-xl font-bold mb-2 ' + (darkMode ? 'text-white' : 'text-gray-800')}>Correlações</h3>
                                                                    <p className={'text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                        Precisas de pelo menos 3 dias com dados para análise de correlações.
                                                                    </p>
                                                                </div>
                                                            );
                                                        }

                                                        const correlations = [];
                                                        const averages = [];

                                                        // SONO
                                                        const sleepData = daysWithData.filter(d => d.sleep !== null);
                                                        if (sleepData.length >= 3) {
                                                            const correlation = calculatePearsonCorrelation(sleepData, 'consumptions', 'sleep');
                                                            const avgSleep = sleepData.reduce((sum, d) => sum + d.sleep, 0) / sleepData.length;
                                                            correlations.push({
                                                                name: 'Sono',
                                                                icon: '😴',
                                                                correlation: correlation,
                                                                average: avgSleep.toFixed(1),
                                                                unit: 'h',
                                                                dataPoints: sleepData.length
                                                            });
                                                        }

                                                        // HUMOR
                                                        const moodData = daysWithData.filter(d => d.mood !== null);
                                                        if (moodData.length >= 3) {
                                                            const correlation = calculatePearsonCorrelation(moodData, 'consumptions', 'mood');
                                                            const avgMood = moodData.reduce((sum, d) => sum + d.mood, 0) / moodData.length;
                                                            correlations.push({
                                                                name: 'Humor',
                                                                icon: '😊',
                                                                correlation: correlation,
                                                                average: avgMood.toFixed(1),
                                                                unit: '/10',
                                                                dataPoints: moodData.length
                                                            });
                                                        }

                                                        // ENERGIA
                                                        const energyData = daysWithData.filter(d => d.energy !== null);
                                                        if (energyData.length >= 3) {
                                                            const correlation = calculatePearsonCorrelation(energyData, 'consumptions', 'energy');
                                                            const avgEnergy = energyData.reduce((sum, d) => sum + d.energy, 0) / energyData.length;
                                                            correlations.push({
                                                                name: 'Energia',
                                                                icon: '⚡',
                                                                correlation: correlation,
                                                                average: avgEnergy.toFixed(1),
                                                                unit: '/10',
                                                                dataPoints: energyData.length
                                                            });
                                                        }

                                                        if (correlations.length === 0) {
                                                            return (
                                                                <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-8 border text-center'}>
                                                                    <div className="text-6xl mb-4">🔗</div>
                                                                    <h3 className={'text-xl font-bold mb-2 ' + (darkMode ? 'text-white' : 'text-gray-800')}>Correlações</h3>
                                                                    <p className={'text-sm ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                        Regista bem-estar (sono, humor, energia) para ver correlações com consumo.
                                                                    </p>
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div className="space-y-4">
                                                                <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                                    <h3 className={'font-semibold mb-2 ' + (darkMode ? 'text-white' : 'text-gray-800')}>📊 Análise de Bem-Estar</h3>
                                                                    <p className={'text-xs mb-4 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                        Correlação entre nº de consumos e bem-estar nos dias com dados
                                                                    </p>
                                                                    <div className="space-y-3">
                                                                        {correlations.map((corr, i) => {
                                                                            const getCorrelationLabel = (r) => {
                                                                                if (r === null) return { text: 'Sem dados', color: 'gray', desc: '' };
                                                                                const abs = Math.abs(r);
                                                                                if (r < -0.7) return { text: 'Forte Negativa', color: 'red', desc: 'Mais consumos → Muito pior' };
                                                                                if (r < -0.4) return { text: 'Negativa', color: 'orange', desc: 'Mais consumos → Pior' };
                                                                                if (r < -0.2) return { text: 'Fraca Negativa', color: 'yellow', desc: 'Algum impacto negativo' };
                                                                                if (r > 0.7) return { text: 'Forte Positiva', color: 'green', desc: 'Mais consumos → Muito melhor' };
                                                                                if (r > 0.4) return { text: 'Positiva', color: 'green', desc: 'Mais consumos → Melhor' };
                                                                                if (r > 0.2) return { text: 'Fraca Positiva', color: 'green', desc: 'Algum impacto positivo' };
                                                                                return { text: 'Sem Correlação', color: 'gray', desc: 'Sem relação clara' };
                                                                            };
                                                                            const corrLabel = getCorrelationLabel(corr.correlation);
                                                                            return (
                                                                                <div key={i} className={(darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200') + ' rounded-lg p-4 border'}>
                                                                                    <div className="flex items-center justify-between mb-3">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-2xl">{corr.icon}</span>
                                                                                            <div>
                                                                                                <div className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800')}>{corr.name}</div>
                                                                                                <div className={'text-xs ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>Média: {corr.average}{corr.unit}</div>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className={'text-xs px-2 py-1 rounded-full font-medium ' + (corrLabel.color === 'red' ? (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700') : corrLabel.color === 'orange' ? (darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-100 text-orange-700') : corrLabel.color === 'green' ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'))}>
                                                                                            {corrLabel.text}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className={'text-xs ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                                        {corrLabel.desc && <span>💡 {corrLabel.desc}</span>}
                                                                                        {corr.correlation !== null && <span className="ml-2">• r = {corr.correlation.toFixed(2)}</span>}
                                                                                        <span className="ml-2">• {corr.dataPoints} dias</span>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>

                                                                {/* Consumo → Bem-estar (dia seguinte) */}
                                                                {(() => {
                                                                    const bidirectional = [];
                                                                    const sortedDates = Object.keys(dailyData).sort();

                                                                    sortedDates.forEach((date, i) => {
                                                                        if (i < sortedDates.length - 1) {
                                                                            const today = dailyData[date];
                                                                            const nextDay = dailyData[sortedDates[i + 1]];

                                                                            if (today.consumptions > 0 && (nextDay.sleep !== null || nextDay.mood !== null || nextDay.energy !== null)) {
                                                                                bidirectional.push({
                                                                                    consumptions: today.consumptions,
                                                                                    nextSleep: nextDay.sleep,
                                                                                    nextMood: nextDay.mood,
                                                                                    nextEnergy: nextDay.energy
                                                                                });
                                                                            }
                                                                        }
                                                                    });

                                                                    if (bidirectional.length >= 3) {
                                                                        const getCorrelationLabel = (r) => {
                                                                            if (r === null) return { text: 'Sem dados', color: 'gray', desc: '' };
                                                                            if (r < -0.7) return { text: 'Forte Negativa', color: 'red', desc: 'Mais consumos → Muito pior amanhã' };
                                                                            if (r < -0.4) return { text: 'Negativa', color: 'orange', desc: 'Mais consumos → Pior amanhã' };
                                                                            if (r < -0.2) return { text: 'Fraca Negativa', color: 'yellow', desc: 'Algum impacto negativo' };
                                                                            if (r > 0.7) return { text: 'Forte Positiva', color: 'green', desc: 'Mais consumos → Muito melhor amanhã' };
                                                                            if (r > 0.4) return { text: 'Positiva', color: 'green', desc: 'Mais consumos → Melhor amanhã' };
                                                                            if (r > 0.2) return { text: 'Fraca Positiva', color: 'green', desc: 'Algum impacto positivo' };
                                                                            return { text: 'Sem Correlação', color: 'gray', desc: 'Sem relação clara' };
                                                                        };

                                                                        const bidirCorrelations = [];

                                                                        // Sono
                                                                        const sleepCorr = calculatePearsonCorrelation(bidirectional, 'consumptions', 'nextSleep');
                                                                        const sleepData = bidirectional.filter(d => d.nextSleep !== null);
                                                                        if (sleepData.length >= 3) {
                                                                            const avgNextSleep = sleepData.reduce((sum, d) => sum + d.nextSleep, 0) / sleepData.length;
                                                                            bidirCorrelations.push({
                                                                                name: 'Sono',
                                                                                icon: '😴',
                                                                                correlation: sleepCorr,
                                                                                average: avgNextSleep.toFixed(1),
                                                                                unit: 'h',
                                                                                dataPoints: sleepData.length
                                                                            });
                                                                        }

                                                                        // Humor
                                                                        const moodCorr = calculatePearsonCorrelation(bidirectional, 'consumptions', 'nextMood');
                                                                        const moodData = bidirectional.filter(d => d.nextMood !== null);
                                                                        if (moodData.length >= 3) {
                                                                            const avgNextMood = moodData.reduce((sum, d) => sum + d.nextMood, 0) / moodData.length;
                                                                            bidirCorrelations.push({
                                                                                name: 'Humor',
                                                                                icon: '😊',
                                                                                correlation: moodCorr,
                                                                                average: avgNextMood.toFixed(1),
                                                                                unit: '/5',
                                                                                dataPoints: moodData.length
                                                                            });
                                                                        }

                                                                        // Energia
                                                                        const energyCorr = calculatePearsonCorrelation(bidirectional, 'consumptions', 'nextEnergy');
                                                                        const energyData = bidirectional.filter(d => d.nextEnergy !== null);
                                                                        if (energyData.length >= 3) {
                                                                            const avgNextEnergy = energyData.reduce((sum, d) => sum + d.nextEnergy, 0) / energyData.length;
                                                                            bidirCorrelations.push({
                                                                                name: 'Energia',
                                                                                icon: '⚡',
                                                                                correlation: energyCorr,
                                                                                average: avgNextEnergy.toFixed(1),
                                                                                unit: '/5',
                                                                                dataPoints: energyData.length
                                                                            });
                                                                        }

                                                                        if (bidirCorrelations.length > 0) {
                                                                            return (
                                                                                <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                                                    <h3 className={'font-semibold mb-2 ' + (darkMode ? 'text-white' : 'text-gray-800')}>↔️ Consumo Afeta Bem-Estar</h3>
                                                                                    <p className={'text-xs mb-4 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                                        Correlação entre consumo hoje e bem-estar no dia seguinte
                                                                                    </p>
                                                                                    {bidirCorrelations.map((corr, i) => {
                                                                                        const label = getCorrelationLabel(corr.correlation);
                                                                                        const colorClasses = {
                                                                                            red: darkMode ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-50 text-red-700 border-red-200',
                                                                                            orange: darkMode ? 'bg-orange-900/30 text-orange-400 border-orange-800' : 'bg-orange-50 text-orange-700 border-orange-200',
                                                                                            yellow: darkMode ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' : 'bg-yellow-50 text-yellow-700 border-yellow-200',
                                                                                            green: darkMode ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-50 text-green-700 border-green-200',
                                                                                            gray: darkMode ? 'bg-gray-700/50 text-gray-400 border-gray-600' : 'bg-gray-50 text-gray-600 border-gray-200'
                                                                                        };
                                                                                        return (
                                                                                            <div key={i} className={'rounded-lg p-4 border mb-3 last:mb-0 ' + colorClasses[label.color]}>
                                                                                                <div className="flex items-center justify-between mb-2">
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <span className="text-xl">{corr.icon}</span>
                                                                                                        <span className="font-semibold">{corr.name} amanhã</span>
                                                                                                    </div>
                                                                                                    <div className="text-sm px-2 py-1 rounded-full font-medium bg-black/10">
                                                                                                        {label.text}
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="flex items-center justify-between text-sm">
                                                                                                    <div>
                                                                                                        <span className="opacity-75">Média: </span>
                                                                                                        <span className="font-bold">{corr.average}{corr.unit}</span>
                                                                                                    </div>
                                                                                                    <div className="opacity-75">
                                                                                                        r = {corr.correlation !== null ? corr.correlation.toFixed(2) : 'N/A'} ({corr.dataPoints} dias)
                                                                                                    </div>
                                                                                                </div>
                                                                                                {label.desc && (
                                                                                                    <div className="text-xs opacity-75 mt-2">{label.desc}</div>
                                                                                                )}
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            );
                                                                        }
                                                                    }
                                                                    return null;
                                                                })()}

                                                                {/* Sono → Humor */}
                                                                {(() => {
                                                                    const sleepToMoodData = [];
                                                                    const sortedDates = Object.keys(dailyData).sort();

                                                                    // Same day: Sleep → Mood
                                                                    const sameDaySleepMood = sortedDates
                                                                        .map(date => dailyData[date])
                                                                        .filter(day => day.sleep !== null && day.mood !== null)
                                                                        .map(day => ({ sleep: day.sleep, mood: day.mood }));

                                                                    // Next day: Tonight's sleep → Tomorrow's mood
                                                                    const nextDaySleepMood = [];
                                                                    sortedDates.forEach((date, i) => {
                                                                        if (i < sortedDates.length - 1) {
                                                                            const today = dailyData[date];
                                                                            const tomorrow = dailyData[sortedDates[i + 1]];
                                                                            if (today.sleep !== null && tomorrow.mood !== null) {
                                                                                nextDaySleepMood.push({ sleep: today.sleep, mood: tomorrow.mood });
                                                                            }
                                                                        }
                                                                    });

                                                                    if (sameDaySleepMood.length >= 3 || nextDaySleepMood.length >= 3) {
                                                                        const getCorrelationLabel = (r) => {
                                                                            if (r === null) return { text: 'Sem dados', color: 'gray', desc: '' };
                                                                            if (r > 0.7) return { text: 'Forte Positiva', color: 'green', desc: 'Mais sono → Muito melhor humor' };
                                                                            if (r > 0.4) return { text: 'Positiva', color: 'green', desc: 'Mais sono → Melhor humor' };
                                                                            if (r > 0.2) return { text: 'Fraca Positiva', color: 'green', desc: 'Sono ajuda o humor' };
                                                                            if (r < -0.7) return { text: 'Forte Negativa', color: 'red', desc: 'Mais sono → Muito pior humor (incomum)' };
                                                                            if (r < -0.4) return { text: 'Negativa', color: 'orange', desc: 'Mais sono → Pior humor (incomum)' };
                                                                            if (r < -0.2) return { text: 'Fraca Negativa', color: 'yellow', desc: 'Possível correlação negativa' };
                                                                            return { text: 'Sem Correlação', color: 'gray', desc: 'Sem relação clara' };
                                                                        };

                                                                        const sleepMoodCorrelations = [];

                                                                        if (sameDaySleepMood.length >= 3) {
                                                                            const corr = calculatePearsonCorrelation(sameDaySleepMood, 'sleep', 'mood');
                                                                            const avgSleep = sameDaySleepMood.reduce((s, d) => s + d.sleep, 0) / sameDaySleepMood.length;
                                                                            const avgMood = sameDaySleepMood.reduce((s, d) => s + d.mood, 0) / sameDaySleepMood.length;
                                                                            sleepMoodCorrelations.push({
                                                                                name: 'Sono → Humor (mesmo dia)',
                                                                                icon: '😴➡️😊',
                                                                                correlation: corr,
                                                                                avgSleep: avgSleep.toFixed(1),
                                                                                avgMood: avgMood.toFixed(1),
                                                                                dataPoints: sameDaySleepMood.length
                                                                            });
                                                                        }

                                                                        if (nextDaySleepMood.length >= 3) {
                                                                            const corr = calculatePearsonCorrelation(nextDaySleepMood, 'sleep', 'mood');
                                                                            const avgSleep = nextDaySleepMood.reduce((s, d) => s + d.sleep, 0) / nextDaySleepMood.length;
                                                                            const avgMood = nextDaySleepMood.reduce((s, d) => s + d.mood, 0) / nextDaySleepMood.length;
                                                                            sleepMoodCorrelations.push({
                                                                                name: 'Sono → Humor amanhã',
                                                                                icon: '😴💤😊',
                                                                                correlation: corr,
                                                                                avgSleep: avgSleep.toFixed(1),
                                                                                avgMood: avgMood.toFixed(1),
                                                                                dataPoints: nextDaySleepMood.length
                                                                            });
                                                                        }

                                                                        if (sleepMoodCorrelations.length > 0) {
                                                                            return (
                                                                                <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                                                    <h3 className={'font-semibold mb-2 ' + (darkMode ? 'text-white' : 'text-gray-800')}>😴💭 Sono → Humor</h3>
                                                                                    <p className={'text-xs mb-4 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                                        Como a qualidade/quantidade de sono influencia o humor
                                                                                    </p>
                                                                                    <div className="space-y-3">
                                                                                        {sleepMoodCorrelations.map((corr, i) => {
                                                                                            const label = getCorrelationLabel(corr.correlation);
                                                                                            const colorClasses = {
                                                                                                red: darkMode ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-50 text-red-700 border-red-200',
                                                                                                orange: darkMode ? 'bg-orange-900/30 text-orange-400 border-orange-800' : 'bg-orange-50 text-orange-700 border-orange-200',
                                                                                                yellow: darkMode ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' : 'bg-yellow-50 text-yellow-700 border-yellow-200',
                                                                                                green: darkMode ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-50 text-green-700 border-green-200',
                                                                                                gray: darkMode ? 'bg-gray-700/50 text-gray-400 border-gray-600' : 'bg-gray-50 text-gray-600 border-gray-200'
                                                                                            };
                                                                                            return (
                                                                                                <div key={i} className={'rounded-lg p-4 border ' + colorClasses[label.color]}>
                                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                                        <div className="flex items-center gap-2">
                                                                                                            <span className="text-xl">{corr.icon}</span>
                                                                                                            <span className="font-semibold">{corr.name}</span>
                                                                                                        </div>
                                                                                                        <div className="text-sm px-2 py-1 rounded-full font-medium bg-black/10">
                                                                                                            {label.text}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="flex items-center justify-between text-sm">
                                                                                                        <div>
                                                                                                            <span className="opacity-75">Sono: </span>
                                                                                                            <span className="font-bold">{corr.avgSleep}h</span>
                                                                                                            <span className="opacity-75"> • Humor: </span>
                                                                                                            <span className="font-bold">{corr.avgMood}/10</span>
                                                                                                        </div>
                                                                                                        <div className="opacity-75">
                                                                                                            r = {corr.correlation !== null ? corr.correlation.toFixed(2) : 'N/A'} ({corr.dataPoints} dias)
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    {label.desc && (
                                                                                                        <div className="text-xs opacity-75 mt-2">💡 {label.desc}</div>
                                                                                                    )}
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        }
                                                                    }

                                                                    return null;
                                                                })()}

                                                                {/* Hora de Deitar ↔ Consumo */}
                                                                {(() => {
                                                                    // Correlação entre hora de deitar e consumo
                                                                    const bedtimeConsumptionData = [];

                                                                    analysisCycles.forEach(cycle => {
                                                                        if (!cycle.bedtime) return;

                                                                        // Filtrar horas inválidas (06:00-20:59 não é hora de deitar)
                                                                        const [hours] = cycle.bedtime.split(':').map(Number);
                                                                        if (hours >= 6 && hours < 21) return;

                                                                        // Converter bedtime para minutos
                                                                        const [h, m] = cycle.bedtime.split(':').map(Number);
                                                                        let bedtimeMinutes = h * 60 + m;
                                                                        // Ajustar madrugada (00:00-05:59 → 24:00-29:59)
                                                                        if (h >= 0 && h < 6) bedtimeMinutes += 1440;

                                                                        // Encontrar data do ciclo
                                                                        const cycleDate = safeToISODate(cycle.timestamp);
                                                                        if (!cycleDate) return;

                                                                        // Contar consumos nesse dia
                                                                        const dayConsumptions = analysisConsumptions.filter(c => c.date === cycleDate).length;

                                                                        bedtimeConsumptionData.push({
                                                                            bedtime: bedtimeMinutes,
                                                                            consumptions: dayConsumptions
                                                                        });
                                                                    });

                                                                    if (bedtimeConsumptionData.length >= 3) {
                                                                        const correlation = calculatePearsonCorrelation(bedtimeConsumptionData, 'bedtime', 'consumptions');

                                                                        const getCorrelationLabel = (r) => {
                                                                            if (r === null) return { text: 'Sem dados', color: 'gray', desc: '' };
                                                                            if (r < -0.7) return { text: 'Forte Negativa', color: 'green', desc: 'Deitar mais cedo → Menos consumo' };
                                                                            if (r < -0.4) return { text: 'Negativa', color: 'green', desc: 'Deitar cedo pode ajudar a reduzir consumo' };
                                                                            if (r < -0.2) return { text: 'Fraca Negativa', color: 'yellow', desc: 'Leve tendência: deitar cedo → menos consumo' };
                                                                            if (r > 0.7) return { text: 'Forte Positiva', color: 'red', desc: 'Deitar tarde → Muito mais consumo' };
                                                                            if (r > 0.4) return { text: 'Positiva', color: 'orange', desc: 'Deitar tarde → Mais consumo' };
                                                                            if (r > 0.2) return { text: 'Fraca Positiva', color: 'yellow', desc: 'Leve tendência: deitar tarde → mais consumo' };
                                                                            return { text: 'Sem Correlação', color: 'gray', desc: 'Hora de deitar não parece afetar consumo' };
                                                                        };

                                                                        const label = getCorrelationLabel(correlation);
                                                                        const avgBedtime = bedtimeConsumptionData.reduce((s, d) => s + d.bedtime, 0) / bedtimeConsumptionData.length;
                                                                        const adjustedMinutes = avgBedtime >= 1440 ? avgBedtime - 1440 : avgBedtime;
                                                                        const avgBedtimeHours = Math.floor(adjustedMinutes / 60);
                                                                        const avgBedtimeMins = Math.round(adjustedMinutes % 60);
                                                                        const avgBedtimeStr = `${String(avgBedtimeHours).padStart(2, '0')}:${String(avgBedtimeMins).padStart(2, '0')}`;
                                                                        const avgConsumptions = (bedtimeConsumptionData.reduce((s, d) => s + d.consumptions, 0) / bedtimeConsumptionData.length).toFixed(1);

                                                                        const colorClasses = {
                                                                            red: darkMode ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-50 text-red-700 border-red-200',
                                                                            orange: darkMode ? 'bg-orange-900/30 text-orange-400 border-orange-800' : 'bg-orange-50 text-orange-700 border-orange-200',
                                                                            yellow: darkMode ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' : 'bg-yellow-50 text-yellow-700 border-yellow-200',
                                                                            green: darkMode ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-green-50 text-green-700 border-green-200',
                                                                            gray: darkMode ? 'bg-gray-700/50 text-gray-400 border-gray-600' : 'bg-gray-50 text-gray-600 border-gray-200'
                                                                        };

                                                                        return (
                                                                            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                                                <h3 className={'font-semibold mb-2 ' + (darkMode ? 'text-white' : 'text-gray-800')}>🕐💊 Hora de Deitar vs Consumo</h3>
                                                                                <p className={'text-xs mb-4 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                                    Correlação entre a hora que te deitas e o consumo desse dia
                                                                                </p>
                                                                                <div className={'rounded-lg p-4 border ' + colorClasses[label.color]}>
                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-xl">🕐➡️💊</span>
                                                                                            <span className="font-semibold">Bedtime → Consumo</span>
                                                                                        </div>
                                                                                        <div className="text-sm px-2 py-1 rounded-full font-medium bg-black/10">
                                                                                            {label.text}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-sm mb-2">
                                                                                        <span className="opacity-75">Hora média de deitar: </span>
                                                                                        <span className="font-bold">{avgBedtimeStr}</span>
                                                                                        <span className="opacity-75"> • Consumo médio: </span>
                                                                                        <span className="font-bold">{avgConsumptions}/dia</span>
                                                                                    </div>
                                                                                    <div className="text-xs opacity-75">
                                                                                        {label.desc && <span>💡 {label.desc}</span>}
                                                                                        {correlation !== null && <span className="ml-2">• r = {correlation.toFixed(2)}</span>}
                                                                                        <span className="ml-2">• {bedtimeConsumptionData.length} dias</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }

                                                                    return null;
                                                                })()}

                                                                {/* Análise Intraciclo */}
                                                                {(() => {
                                                                    const cycleData = {};

                                                                    analysisConsumptions.forEach(c => {
                                                                        if (!c.cycleId) return;
                                                                        if (!cycleData[c.cycleId]) cycleData[c.cycleId] = { consumptions: [], wellbeing: [] };
                                                                        cycleData[c.cycleId].consumptions.push({ timestamp: c.timestamp, type: 'consumption' });
                                                                    });

                                                                    analysisWellbeing.forEach(w => {
                                                                        if (!w.cycleId) return;
                                                                        if (!cycleData[w.cycleId]) cycleData[w.cycleId] = { consumptions: [], wellbeing: [] };
                                                                        if (w.mood && !isNaN(parseInt(w.mood))) {
                                                                            cycleData[w.cycleId].wellbeing.push({ timestamp: w.timestamp, mood: parseInt(w.mood), energy: parseInt(w.energy) || null });
                                                                        }
                                                                    });

                                                                    const cyclesWithData = Object.values(cycleData).filter(c => c.consumptions.length > 0 && c.wellbeing.length >= 2);

                                                                    console.log('🔄 Análise Intraciclo DEBUG:', {
                                                                        periodo: patternsPeriod,
                                                                        totalCiclos: Object.keys(cycleData).length,
                                                                        ciclosComDados: cyclesWithData.length,
                                                                        cycleIds: Object.keys(cycleData)
                                                                    });

                                                                    if (cyclesWithData.length >= 2) {
                                                                        // 1. Evolução de Humor e Energia ao longo do ciclo
                                                                        let moodProgression = { start: [], middle: [], end: [] };
                                                                        let energyProgression = { start: [], middle: [], end: [] };
                                                                        let moodImproves = 0;
                                                                        let moodWorsens = 0;
                                                                        let energyImproves = 0;
                                                                        let energyWorsens = 0;

                                                                        // 2. Padrão temporal de consumo
                                                                        let consumptionTiming = { start: 0, middle: 0, end: 0 };

                                                                        // 3. Intervalos entre consumos
                                                                        let intervals = [];

                                                                        // 4. Impacto do consumo
                                                                        let moodAfterCons = { better: 0, worse: 0, same: 0 };
                                                                        let energyAfterCons = { better: 0, worse: 0, same: 0 };

                                                                        cyclesWithData.forEach(cycle => {
                                                                            const sortedWellbeing = cycle.wellbeing.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                                                                            const sortedConsumptions = cycle.consumptions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                                                                            if (sortedWellbeing.length >= 2) {
                                                                                // Dividir ciclo em 3 partes (início, meio, fim)
                                                                                const third = Math.floor(sortedWellbeing.length / 3);

                                                                                const startSegment = sortedWellbeing.slice(0, Math.max(1, third));
                                                                                const middleSegment = sortedWellbeing.slice(third, sortedWellbeing.length - third);
                                                                                const endSegment = sortedWellbeing.slice(-Math.max(1, third));

                                                                                // Calcular médias de cada segmento
                                                                                const startMood = startSegment.reduce((s, w) => s + w.mood, 0) / startSegment.length;
                                                                                const endMood = endSegment.reduce((s, w) => s + w.mood, 0) / endSegment.length;

                                                                                moodProgression.start.push(startMood);
                                                                                if (middleSegment.length > 0) {
                                                                                    moodProgression.middle.push(middleSegment.reduce((s, w) => s + w.mood, 0) / middleSegment.length);
                                                                                }
                                                                                moodProgression.end.push(endMood);

                                                                                // Tendência de humor
                                                                                if (endMood > startMood + 0.5) moodImproves++;
                                                                                else if (endMood < startMood - 0.5) moodWorsens++;

                                                                                // Energia
                                                                                const startEnergy = startSegment.filter(w => w.energy).reduce((s, w) => s + w.energy, 0) / startSegment.filter(w => w.energy).length;
                                                                                const endEnergy = endSegment.filter(w => w.energy).reduce((s, w) => s + w.energy, 0) / endSegment.filter(w => w.energy).length;

                                                                                if (!isNaN(startEnergy) && !isNaN(endEnergy)) {
                                                                                    energyProgression.start.push(startEnergy);
                                                                                    energyProgression.end.push(endEnergy);

                                                                                    if (endEnergy > startEnergy + 0.5) energyImproves++;
                                                                                    else if (endEnergy < startEnergy - 0.5) energyWorsens++;
                                                                                }
                                                                            }

                                                                            // Padrão temporal de consumo
                                                                            if (sortedConsumptions.length > 0 && sortedWellbeing.length >= 2) {
                                                                                const cycleStart = new Date(sortedWellbeing[0].timestamp);
                                                                                const cycleEnd = new Date(sortedWellbeing[sortedWellbeing.length - 1].timestamp);
                                                                                const cycleDuration = cycleEnd - cycleStart;

                                                                                sortedConsumptions.forEach(cons => {
                                                                                    const consTime = new Date(cons.timestamp);
                                                                                    const elapsed = consTime - cycleStart;
                                                                                    const position = elapsed / cycleDuration;

                                                                                    if (position < 0.33) consumptionTiming.start++;
                                                                                    else if (position < 0.67) consumptionTiming.middle++;
                                                                                    else consumptionTiming.end++;
                                                                                });
                                                                            }

                                                                            // Intervalos entre consumos
                                                                            for (let i = 1; i < sortedConsumptions.length; i++) {
                                                                                const interval = (new Date(sortedConsumptions[i].timestamp) - new Date(sortedConsumptions[i-1].timestamp)) / (1000 * 60 * 60);
                                                                                intervals.push(interval);
                                                                            }

                                                                            // Impacto do consumo no humor/energia
                                                                            cycle.consumptions.forEach(cons => {
                                                                                const consTime = new Date(cons.timestamp);
                                                                                const afterWellbeing = cycle.wellbeing.filter(w => {
                                                                                    const wTime = new Date(w.timestamp);
                                                                                    const hoursDiff = (wTime - consTime) / (1000 * 60 * 60);
                                                                                    return hoursDiff > 0 && hoursDiff <= 3; // Nas 3h seguintes
                                                                                });
                                                                                const beforeWellbeing = cycle.wellbeing.filter(w => {
                                                                                    const wTime = new Date(w.timestamp);
                                                                                    const hoursDiff = (consTime - wTime) / (1000 * 60 * 60);
                                                                                    return hoursDiff > 0 && hoursDiff <= 3; // Nas 3h anteriores
                                                                                });

                                                                                if (afterWellbeing.length > 0 && beforeWellbeing.length > 0) {
                                                                                    const avgMoodBefore = beforeWellbeing.reduce((s, w) => s + w.mood, 0) / beforeWellbeing.length;
                                                                                    const avgMoodAfter = afterWellbeing.reduce((s, w) => s + w.mood, 0) / afterWellbeing.length;

                                                                                    if (avgMoodAfter > avgMoodBefore + 0.5) moodAfterCons.better++;
                                                                                    else if (avgMoodAfter < avgMoodBefore - 0.5) moodAfterCons.worse++;
                                                                                    else moodAfterCons.same++;

                                                                                    const energyBefore = beforeWellbeing.filter(w => w.energy);
                                                                                    const energyAfter = afterWellbeing.filter(w => w.energy);

                                                                                    if (energyBefore.length > 0 && energyAfter.length > 0) {
                                                                                        const avgEnergyBefore = energyBefore.reduce((s, w) => s + w.energy, 0) / energyBefore.length;
                                                                                        const avgEnergyAfter = energyAfter.reduce((s, w) => s + w.energy, 0) / energyAfter.length;

                                                                                        if (avgEnergyAfter > avgEnergyBefore + 0.5) energyAfterCons.better++;
                                                                                        else if (avgEnergyAfter < avgEnergyBefore - 0.5) energyAfterCons.worse++;
                                                                                        else energyAfterCons.same++;
                                                                                    }
                                                                                }
                                                                            });
                                                                        });

                                                                        // Calcular médias globais
                                                                        const avgMoodStart = moodProgression.start.length > 0 ? (moodProgression.start.reduce((a,b) => a+b, 0) / moodProgression.start.length).toFixed(1) : null;
                                                                        const avgMoodMiddle = moodProgression.middle.length > 0 ? (moodProgression.middle.reduce((a,b) => a+b, 0) / moodProgression.middle.length).toFixed(1) : null;
                                                                        const avgMoodEnd = moodProgression.end.length > 0 ? (moodProgression.end.reduce((a,b) => a+b, 0) / moodProgression.end.length).toFixed(1) : null;

                                                                        const avgEnergyStart = energyProgression.start.length > 0 ? (energyProgression.start.reduce((a,b) => a+b, 0) / energyProgression.start.length).toFixed(1) : null;
                                                                        const avgEnergyEnd = energyProgression.end.length > 0 ? (energyProgression.end.reduce((a,b) => a+b, 0) / energyProgression.end.length).toFixed(1) : null;

                                                                        const avgInterval = intervals.length > 0 ? (intervals.reduce((a,b) => a+b, 0) / intervals.length).toFixed(1) : null;

                                                                        console.log('📊 Intervalos calculados:', {
                                                                            totalIntervalos: intervals.length,
                                                                            intervalos: intervals.map(i => i.toFixed(2) + 'h'),
                                                                            media: avgInterval
                                                                        });

                                                                        const totalCons = consumptionTiming.start + consumptionTiming.middle + consumptionTiming.end;

                                                                        return (
                                                                            <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                                                <h3 className={'font-semibold mb-2 ' + (darkMode ? 'text-white' : 'text-gray-800')}>🔄 Análise Intraciclo Detalhada</h3>
                                                                                <p className={'text-xs mb-4 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                                    Como evoluem humor, energia e consumo dentro do mesmo ciclo de sono
                                                                                </p>
                                                                                <div className="space-y-4">
                                                                                    {/* Evolução de Humor */}
                                                                                    <div className={(darkMode ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-50 border-blue-200') + ' rounded-lg p-4 border'}>
                                                                                        <div className={'text-sm font-semibold mb-3 ' + (darkMode ? 'text-blue-300' : 'text-blue-800')}>📊 Evolução de Humor no Ciclo</div>

                                                                                        {avgMoodStart && avgMoodEnd && (
                                                                                            <div className="space-y-2">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <div className={'text-xs w-12 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>Início</div>
                                                                                                    <div className="flex-1 flex items-center gap-2">
                                                                                                        <div className={(darkMode ? 'bg-gray-700' : 'bg-gray-200') + ' rounded-full h-6 flex-1 overflow-hidden'}>
                                                                                                            <div className={'h-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold'} style={{width: (parseFloat(avgMoodStart) / 10 * 100) + '%'}}>
                                                                                                                {avgMoodStart}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                                {avgMoodMiddle && (
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <div className={'text-xs w-12 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>Meio</div>
                                                                                                        <div className="flex-1 flex items-center gap-2">
                                                                                                            <div className={(darkMode ? 'bg-gray-700' : 'bg-gray-200') + ' rounded-full h-6 flex-1 overflow-hidden'}>
                                                                                                                <div className={'h-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold'} style={{width: (parseFloat(avgMoodMiddle) / 10 * 100) + '%'}}>
                                                                                                                    {avgMoodMiddle}
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <div className={'text-xs w-12 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>Fim</div>
                                                                                                    <div className="flex-1 flex items-center gap-2">
                                                                                                        <div className={(darkMode ? 'bg-gray-700' : 'bg-gray-200') + ' rounded-full h-6 flex-1 overflow-hidden'}>
                                                                                                            <div className={'h-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold'} style={{width: (parseFloat(avgMoodEnd) / 10 * 100) + '%'}}>
                                                                                                                {avgMoodEnd}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="flex gap-2 mt-3 text-xs">
                                                                                                    <div className={'px-2 py-1 rounded ' + (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')}>
                                                                                                        ↑ {moodImproves} ciclos melhoram
                                                                                                    </div>
                                                                                                    <div className={'px-2 py-1 rounded ' + (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')}>
                                                                                                        ↓ {moodWorsens} ciclos pioram
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Evolução de Energia */}
                                                                                    {avgEnergyStart && avgEnergyEnd && (
                                                                                        <div className={(darkMode ? 'bg-yellow-900/20 border-yellow-700/50' : 'bg-yellow-50 border-yellow-200') + ' rounded-lg p-4 border'}>
                                                                                            <div className={'text-sm font-semibold mb-3 ' + (darkMode ? 'text-yellow-300' : 'text-yellow-800')}>⚡ Evolução de Energia no Ciclo</div>
                                                                                            <div className="space-y-2">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <div className={'text-xs w-12 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>Início</div>
                                                                                                    <div className="flex-1">
                                                                                                        <div className={(darkMode ? 'bg-gray-700' : 'bg-gray-200') + ' rounded-full h-6 overflow-hidden'}>
                                                                                                            <div className={'h-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold'} style={{width: (parseFloat(avgEnergyStart) / 10 * 100) + '%'}}>
                                                                                                                {avgEnergyStart}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <div className={'text-xs w-12 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>Fim</div>
                                                                                                    <div className="flex-1">
                                                                                                        <div className={(darkMode ? 'bg-gray-700' : 'bg-gray-200') + ' rounded-full h-6 overflow-hidden'}>
                                                                                                            <div className={'h-full bg-yellow-600 flex items-center justify-center text-white text-xs font-bold'} style={{width: (parseFloat(avgEnergyEnd) / 10 * 100) + '%'}}>
                                                                                                                {avgEnergyEnd}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="flex gap-2 mt-3 text-xs">
                                                                                                    <div className={'px-2 py-1 rounded ' + (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')}>
                                                                                                        ↑ {energyImproves} ciclos melhoram
                                                                                                    </div>
                                                                                                    <div className={'px-2 py-1 rounded ' + (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')}>
                                                                                                        ↓ {energyWorsens} ciclos pioram
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Padrão Temporal de Consumo */}
                                                                                    {totalCons > 0 && (
                                                                                        <div className={(darkMode ? 'bg-purple-900/20 border-purple-700/50' : 'bg-purple-50 border-purple-200') + ' rounded-lg p-4 border'}>
                                                                                            <div className={'text-sm font-semibold mb-3 ' + (darkMode ? 'text-purple-300' : 'text-purple-800')}>⏰ Quando Consomes no Ciclo</div>
                                                                                            <div className="space-y-2">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <div className={'text-xs w-16 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>Início (primeiras 33%)</div>
                                                                                                    <div className="flex-1">
                                                                                                        <div className={(darkMode ? 'bg-gray-700' : 'bg-gray-200') + ' rounded-full h-6 overflow-hidden'}>
                                                                                                            <div className={'h-full bg-purple-500 flex items-center px-2 text-white text-xs font-bold'} style={{width: Math.max(5, (consumptionTiming.start / totalCons * 100)) + '%'}}>
                                                                                                                {consumptionTiming.start}x ({Math.round(consumptionTiming.start / totalCons * 100)}%)
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <div className={'text-xs w-16 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>Meio</div>
                                                                                                    <div className="flex-1">
                                                                                                        <div className={(darkMode ? 'bg-gray-700' : 'bg-gray-200') + ' rounded-full h-6 overflow-hidden'}>
                                                                                                            <div className={'h-full bg-purple-500 flex items-center px-2 text-white text-xs font-bold'} style={{width: Math.max(5, (consumptionTiming.middle / totalCons * 100)) + '%'}}>
                                                                                                                {consumptionTiming.middle}x ({Math.round(consumptionTiming.middle / totalCons * 100)}%)
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <div className={'text-xs w-16 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>Fim (últimas 33%)</div>
                                                                                                    <div className="flex-1">
                                                                                                        <div className={(darkMode ? 'bg-gray-700' : 'bg-gray-200') + ' rounded-full h-6 overflow-hidden'}>
                                                                                                            <div className={'h-full bg-purple-600 flex items-center px-2 text-white text-xs font-bold'} style={{width: Math.max(5, (consumptionTiming.end / totalCons * 100)) + '%'}}>
                                                                                                                {consumptionTiming.end}x ({Math.round(consumptionTiming.end / totalCons * 100)}%)
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Impacto do Consumo */}
                                                                                    <div className={(darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200') + ' rounded-lg p-4 border'}>
                                                                                        <div className={'text-sm font-semibold mb-3 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>💊 Impacto nas 3h Seguintes ao Consumo</div>
                                                                                        <div className="space-y-3">
                                                                                            <div>
                                                                                                <div className={'text-xs mb-2 font-medium ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>No Humor:</div>
                                                                                                <div className="flex gap-2 text-xs flex-wrap">
                                                                                                    <div className={'px-2 py-1 rounded ' + (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')}>
                                                                                                        ↑ {moodAfterCons.better}x melhora
                                                                                                    </div>
                                                                                                    <div className={'px-2 py-1 rounded ' + (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')}>
                                                                                                        ↓ {moodAfterCons.worse}x piora
                                                                                                    </div>
                                                                                                    <div className={'px-2 py-1 rounded ' + (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600')}>
                                                                                                        = {moodAfterCons.same}x igual
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                            {(energyAfterCons.better + energyAfterCons.worse + energyAfterCons.same) > 0 && (
                                                                                                <div>
                                                                                                    <div className={'text-xs mb-2 font-medium ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>Na Energia:</div>
                                                                                                    <div className="flex gap-2 text-xs flex-wrap">
                                                                                                        <div className={'px-2 py-1 rounded ' + (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700')}>
                                                                                                            ↑ {energyAfterCons.better}x aumenta
                                                                                                        </div>
                                                                                                        <div className={'px-2 py-1 rounded ' + (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700')}>
                                                                                                            ↓ {energyAfterCons.worse}x diminui
                                                                                                        </div>
                                                                                                        <div className={'px-2 py-1 rounded ' + (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600')}>
                                                                                                            = {energyAfterCons.same}x igual
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Intervalo Médio */}
                                                                                    {avgInterval && (
                                                                                        <div className={(darkMode ? 'bg-indigo-900/20 border-indigo-700/50' : 'bg-indigo-50 border-indigo-200') + ' rounded-lg p-4 border'}>
                                                                                            <div className={'text-sm font-semibold mb-2 ' + (darkMode ? 'text-indigo-300' : 'text-indigo-800')}>⏱️ Intervalo Médio Entre Consumos</div>
                                                                                            <div className={'text-2xl font-bold ' + (darkMode ? 'text-indigo-400' : 'text-indigo-600')}>
                                                                                                {avgInterval}h
                                                                                            </div>
                                                                                            <div className={'text-xs mt-1 ' + (darkMode ? 'text-gray-400' : 'text-gray-600')}>
                                                                                                Tempo médio entre consumos dentro do mesmo ciclo
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            );
                                    })()}
                                </div>
                            )}
                            {currentView === 'history' && (
                                <div className="space-y-6">
                                    <h2 className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>Histórico</h2>

                                    {/* Temporal Filters */}
                                    <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-4 border'}>
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex gap-2 flex-wrap">
                                                {['hoje', 'semana', 'mes', 'tudo'].map(period => (
                                                    <button key={period} onClick={() => { setHistoryPeriod(period); setHistoryPeriodOffset(0); }} className={'px-4 py-2 rounded-lg font-medium transition-colors text-sm ' + (historyPeriod === period ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                                        {period === 'hoje' && '📅 Hoje'}
                                                        {period === 'semana' && '📊 Semana'}
                                                        {period === 'mes' && '📈 Mês'}
                                                        {period === 'tudo' && '🌐 Tudo'}
                                                    </button>
                                                ))}
                                            </div>
                                            {historyPeriod !== 'tudo' && (
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => setHistoryPeriodOffset(historyPeriodOffset + 1)} className={'text-purple-600 p-2 rounded-lg transition-colors ' + (darkMode ? 'hover:bg-gray-700' : 'hover:bg-purple-50')}>
                                                        <Icons.ChevronLeft className="w-5 h-5" />
                                                    </button>
                                                    <span className={'text-sm font-medium min-w-[120px] text-center ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>{getPeriodLabel(historyPeriod, historyPeriodOffset)}</span>
                                                    <button onClick={() => setHistoryPeriodOffset(Math.max(0, historyPeriodOffset - 1))} disabled={historyPeriodOffset === 0} className={'p-2 rounded-lg transition-colors ' + (historyPeriodOffset === 0 ? (darkMode ? 'text-gray-600' : 'text-gray-300') + ' cursor-not-allowed' : 'text-purple-600 ' + (darkMode ? 'hover:bg-gray-700' : 'hover:bg-purple-50'))}>
                                                        <Icons.ChevronRight className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Topic Filters */}
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {[
                                            { id: 'todos', label: '📋 Todos' },
                                            { id: 'consumo', label: '💊 Consumos' },
                                            { id: 'ciclos', label: '🌙 Ciclos' },
                                            { id: 'bem-estar', label: '💚 Bem-estar' },
                                            { id: 'registos', label: '📝 Registos Diários' },
                                            { id: 'dbt', label: '🎯 DBT' }
                                        ].map(topic => (
                                            <button key={topic.id} onClick={() => setHistoryTopic(topic.id)} className={'px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-sm ' + (historyTopic === topic.id ? 'bg-indigo-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                                {topic.label}
                                            </button>
                                        ))}
                                    </div>

                                    {(() => {
                                        // Apply temporal filter
                                        const dateRange = getDateRangeForPeriod(historyPeriod, historyPeriodOffset);
                                        console.log('🔍 Histórico - Filtro Temporal:', {
                                            period: historyPeriod,
                                            offset: historyPeriodOffset,
                                            dateRange: dateRange,
                                            topic: historyTopic
                                        });

                                        const tempFilteredReflections = filterByDateRange(reflections, dateRange);
                                        const tempFilteredWellbeing = filterByDateRange(wellbeingLogs, dateRange);
                                        const tempFilteredDailyLogs = filterByDateRange(dailyLogs, dateRange, 'date');
                                        const tempFilteredConsumptions = filterByDateRange(consumptions, dateRange);
                                        const tempFilteredCycles = filterByDateRange(cycles, dateRange);

                                        console.log('📊 Dados após filtro temporal:', {
                                            reflexões: tempFilteredReflections.length,
                                            bemEstar: tempFilteredWellbeing.length,
                                            registosDiarios: tempFilteredDailyLogs.length,
                                            consumos: tempFilteredConsumptions.length,
                                            ciclos: tempFilteredCycles.length
                                        });

                                        // Apply topic filter
                                        let filteredReflections = tempFilteredReflections;
                                        let filteredWellbeing = tempFilteredWellbeing;
                                        let filteredDailyLogs = tempFilteredDailyLogs;
                                        let filteredConsumptions = tempFilteredConsumptions;
                                        let filteredCycles = tempFilteredCycles;

                                        if (historyTopic === 'consumo') {
                                            filteredReflections = [];
                                            filteredWellbeing = [];
                                            filteredDailyLogs = [];
                                            filteredCycles = [];
                                        } else if (historyTopic === 'ciclos') {
                                            filteredConsumptions = [];
                                            filteredWellbeing = [];
                                            filteredDailyLogs = [];
                                            filteredReflections = [];
                                        } else if (historyTopic === 'bem-estar') {
                                            filteredConsumptions = [];
                                            filteredReflections = [];
                                            filteredDailyLogs = [];
                                            filteredCycles = [];
                                        } else if (historyTopic === 'dbt') {
                                            filteredConsumptions = [];
                                            filteredWellbeing = [];
                                            filteredDailyLogs = [];
                                            filteredCycles = [];
                                        } else if (historyTopic === 'registos') {
                                            filteredConsumptions = [];
                                            filteredReflections = [];
                                            filteredWellbeing = [];
                                            filteredCycles = [];
                                        }

                                        console.log('✅ Dados após filtro de tópico:', {
                                            reflexões: filteredReflections.length,
                                            bemEstar: filteredWellbeing.length,
                                            registosDiarios: filteredDailyLogs.length,
                                            consumos: filteredConsumptions.length,
                                            ciclos: filteredCycles.length
                                        });

                                        const hasData = filteredReflections.length > 0 || filteredWellbeing.length > 0 || filteredDailyLogs.length > 0 || filteredConsumptions.length > 0 || filteredCycles.length > 0;

                                        if (!hasData) return (<div className="bg-white rounded-xl p-6 border border-gray-200 text-center text-gray-500">Sem registos neste período</div>);

                                        return (
                                            <div className="space-y-6">
                                                {filteredReflections.length > 0 && (
                                                    <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                        <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-4 flex items-center gap-2'}><Icons.Brain className={'w-4 h-4 ' + (darkMode ? 'text-purple-400' : 'text-purple-600')} /> Reflexões DBT ({filteredReflections.length})</h3>
                                                        <div className="space-y-4">
                                                            {filteredReflections.slice(0, reflectionsToShow).map(r => (
                                                                <div key={r.id} className={(darkMode ? 'border-purple-500 bg-purple-900/30' : 'border-purple-400 bg-purple-50') + ' border-l-4 pl-4 py-2 rounded-r-lg'}>
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <div className={'text-xs ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>
                                                                            {(() => {
                                                                                const d = safeDate(r.timestamp || r.date);
                                                                                if (!d) return 'Data inválida';
                                                                                const dateStr = d.toLocaleDateString('pt-PT');
                                                                                const timeStr = r.timestamp ? ` ${d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}` : '';
                                                                                return dateStr + timeStr;
                                                                            })()}
                                                                        </div>
                                                                        <button onClick={() => deleteItem('reflections', r.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                    </div>
                                                                    <div className={'text-sm font-medium mb-1 ' + (darkMode ? 'text-purple-400' : 'text-purple-700')}>{r.question}</div>
                                                                    <div className={'text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>{r.answer}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {filteredReflections.length > reflectionsToShow && (
                                                            <button onClick={() => setReflectionsToShow(prev => prev + 10)} className={(darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700') + ' text-sm font-medium mt-3 w-full py-2'}>
                                                                Ver mais ({filteredReflections.length - reflectionsToShow} restantes)
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {filteredWellbeing.length > 0 && (
                                                    <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                        <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-4 flex items-center gap-2'}><Icons.Heart className={'w-4 h-4 ' + (darkMode ? 'text-blue-400' : 'text-blue-600')} /> Bem-Estar ({filteredWellbeing.length})</h3>
                                                        <div className="space-y-3">
                                                            {filteredWellbeing.slice(0, wellbeingToShow).map(w => (
                                                                <div key={w.id} className={(darkMode ? 'bg-blue-900/30 border-blue-700/50' : 'bg-blue-50 border-blue-200') + ' p-3 rounded-lg border'}>
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <div className={'text-sm font-medium ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                                            {(() => {
                                                                                const d = safeDate(w.timestamp || w.date);
                                                                                return d ? d.toLocaleDateString('pt-PT') : 'Data inválida';
                                                                            })()}
                                                                        </div>
                                                                        <button onClick={() => deleteItem('wellbeingLogs', w.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                    </div>
                                                                    <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                                                                        <div className="text-center">
                                                                            <div className={'text-xs ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>Sono</div>
                                                                            <div className={'text-lg font-bold ' + (darkMode ? 'text-blue-400' : 'text-blue-600')}>{w.sleep}h</div>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <div className={'text-xs ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>Humor</div>
                                                                            <div className={'text-lg font-bold ' + (darkMode ? 'text-blue-400' : 'text-blue-600')}>{w.mood}/10</div>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <div className={'text-xs ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>Energia</div>
                                                                            <div className={'text-lg font-bold ' + (darkMode ? 'text-blue-400' : 'text-blue-600')}>{w.energy || '-'}/10</div>
                                                                        </div>
                                                                    </div>
                                                                    {w.emotions && w.emotions.length > 0 && (
                                                                        <div className="mb-2">
                                                                            <div className={'text-xs mb-1 ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>Emoções:</div>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {w.emotions.map((emotion, i) => (
                                                                                    <span key={i} className={(darkMode ? 'bg-blue-800/50 text-blue-300' : 'bg-blue-100 text-blue-700') + ' text-xs px-2 py-1 rounded'}>
                                                                                        {emotion}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {w.notes && (
                                                                        <div className={'text-sm mt-2 italic ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>
                                                                            💭 {w.notes}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {filteredWellbeing.length > wellbeingToShow && (
                                                            <button onClick={() => setWellbeingToShow(prev => prev + 14)} className={(darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700') + ' text-sm font-medium mt-3 w-full py-2'}>
                                                                Ver mais ({filteredWellbeing.length - wellbeingToShow} restantes)
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {filteredDailyLogs.length > 0 && (
                                                    <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                        <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-4 flex items-center gap-2'}>📊 Registos Diários ({filteredDailyLogs.length})</h3>
                                                        <div className="space-y-3">
                                                            {filteredDailyLogs.map(l => (
                                                                <div key={l.id} className={(darkMode ? 'bg-pink-900/30 border-pink-700/50' : 'bg-pink-50 border-pink-200') + ' p-3 rounded-lg border'}>
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <div className={'text-sm font-medium ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                                            {(() => {
                                                                                const d = safeDate(l.timestamp || l.date);
                                                                                return d ? d.toLocaleDateString('pt-PT') : 'Data inválida';
                                                                            })()}
                                                                        </div>
                                                                        <button onClick={() => deleteItem('dailyLogs', l.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                    </div>
                                                                    <div className="flex gap-4 text-sm">
                                                                        <div>
                                                                            <span className={(darkMode ? 'text-gray-300' : 'text-gray-600')}>Quantidade: </span>
                                                                            <span className={'font-bold ' + (darkMode ? 'text-pink-400' : 'text-pink-600')}>{l.mg}mg</span>
                                                                        </div>
                                                                    </div>
                                                                    {l.notes && <div className={'text-sm mt-2 italic ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>💭 {l.notes}</div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {filteredConsumptions.length > 0 && (
                                                    <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                        <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-4 flex items-center gap-2'}><Icons.Clock className="w-4 h-4 text-purple-600" /> Consumos ({filteredConsumptions.length})</h3>
                                                        <div className="space-y-3">
                                                            {filteredConsumptions.map(c => (
                                                                <div key={c.id} className={(darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200') + ' p-3 rounded-lg border'}>
                                                                    <div className="flex justify-between items-center">
                                                                        <div>
                                                                            <div className={'font-medium ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                                                {new Date(c.timestamp).toLocaleDateString('pt-PT')} - {new Date(c.timestamp).toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}
                                                                            </div>
                                                                            {c.notes && <div className={'text-sm mt-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>💭 {c.notes}</div>}
                                                                        </div>
                                                                        <div className="flex gap-2 ml-2">
                                                                            <button onClick={() => openEditConsumption(c)} className="text-blue-500 hover:text-blue-600"><Icons.Edit className="w-4 h-4" /></button>
                                                                            <button onClick={() => deleteItem('consumptions', c.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-4 h-4" /></button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {filteredCycles.length > 0 && (
                                                    <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                                        <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-4 flex items-center gap-2'}>🌙 Ciclos ({filteredCycles.length})</h3>
                                                        <div className="space-y-3">
                                                            {filteredCycles.map(cycle => (
                                                                <div key={cycle.id} className={(darkMode ? 'bg-indigo-900/30 border-indigo-700/50' : 'bg-indigo-50 border-indigo-200') + ' p-3 rounded-lg border'}>
                                                                    <div className="flex justify-between items-center mb-2">
                                                                        <div className={'text-sm font-medium ' + (darkMode ? 'text-white' : 'text-gray-800')}>
                                                                            {(() => {
                                                                                const d = safeDate(cycle.timestamp);
                                                                                return d ? `${d.toLocaleDateString('pt-PT')} ${d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'})}` : 'Data inválida';
                                                                            })()}
                                                                        </div>
                                                                        <button onClick={() => deleteItem('cycles', cycle.id)} className="text-red-600 hover:text-red-700"><Icons.Trash2 className="w-3 h-3" /></button>
                                                                    </div>
                                                                    {cycle.bedtime && (
                                                                        <div className={'text-sm mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                                            <span className={(darkMode ? 'text-gray-400' : 'text-gray-600')}>Hora de deitar: </span>
                                                                            <span className="font-medium">{cycle.bedtime}</span>
                                                                        </div>
                                                                    )}
                                                                    {cycle.triggers && cycle.triggers.length > 0 && (
                                                                        <div className={'text-sm mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                                                            <span className={(darkMode ? 'text-gray-400' : 'text-gray-600')}>Gatilhos: </span>
                                                                            <span className="font-medium">{cycle.triggers.join(', ')}</span>
                                                                        </div>
                                                                    )}
                                                                    {cycle.notes && <div className={'text-sm mt-2 italic ' + (darkMode ? 'text-gray-300' : 'text-gray-600')}>💭 {cycle.notes}</div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                            {currentView === 'resources' && (
                                <div className="space-y-6">
                                    <h2 className={'text-2xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>Recursos</h2>
                                    <div className="bg-red-50 rounded-xl p-6 border border-red-200"><h3 className="font-semibold text-red-800 mb-3">🚨 Emergência</h3><div className="space-y-2 text-red-700"><p><strong>INEM:</strong> 112</p><p><strong>Linha Vida:</strong> 1414</p></div></div>
                                    <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}><h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-3'}>📞 Linhas de Apoio</h3><div className={'space-y-2 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}><p><strong>SOS Droga:</strong> 1414 (24h)</p><p><strong>SNS 24:</strong> 808 24 24 24</p></div></div>
                                    <div className={(darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') + ' rounded-xl p-6 border'}>
                                        <h3 className={'font-semibold ' + (darkMode ? 'text-white' : 'text-gray-800') + ' mb-3'}>🔔 Notificações & Lembretes</h3>
                                        <div className={'space-y-3 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>
                                            <p className="text-sm">Recebe lembretes para registar bem-estar diariamente (às 18h).</p>
                                            {notificationsEnabled ? (
                                                <div className="flex items-center gap-2 text-green-600">
                                                    <span>✓ Notificações ativadas</span>
                                                </div>
                                            ) : (
                                                <button onClick={requestNotificationPermission} className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all font-medium">
                                                    Ativar Notificações
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {educationalResources.map((resource, i) => (
                                        <div key={i} className="bg-purple-50 rounded-xl p-4 border border-purple-200"><h4 className="font-medium text-purple-800 mb-2">{resource.title}</h4><p className="text-sm text-purple-700">{resource.content}</p></div>
                                    ))}
                                </div>
                            )}

                        </div>

                        {/* Modals */}
                        {showDailyLogModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowDailyLogModal(false)}>
                                <div className={(darkMode ? 'bg-gray-800' : 'bg-white') + ' rounded-2xl p-6 max-w-md w-full shadow-2xl'} onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className={'text-xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>Registar Dosagem do Dia</h3>
                                        <button onClick={() => setShowDailyLogModal(false)} className={(darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}><Icons.X /></button>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className={'block text-sm font-medium mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Total aproximado (mg)</label>
                                            <input type="number" value={dailyForm.mg} onChange={(e) => setDailyForm({...dailyForm, mg: e.target.value})} className={(darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400'} min="0" />
                                        </div>
                                        <div>
                                            <label className={'block text-sm font-medium mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Notas (opcional)</label>
                                            <textarea value={dailyForm.notes} onChange={(e) => setDailyForm({...dailyForm, notes: e.target.value})} className={(darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 h-20'} placeholder="Como te sentiste? Contexto..."></textarea>
                                        </div>
                                        <button onClick={submitDailyLog} className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all font-medium shadow-lg">Guardar</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showWellbeingModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowWellbeingModal(false)}>
                                <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className={'text-xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>Check-in Bem-Estar</h3>
                                        <button onClick={() => setShowWellbeingModal(false)} className="text-gray-400 hover:text-gray-600"><Icons.X /></button>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-1'}>Horas de sono</label>
                                            <input type="number" min="0" max="24" step="0.5" value={wellbeingForm.sleep} onChange={(e) => setWellbeingForm({...wellbeingForm, sleep: e.target.value})} className={(darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400'} placeholder="Ex: 7.5" />
                                        </div>
                                        <div>
                                            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-2'}>Humor: {wellbeingForm.mood}/10</label>
                                            <input type="range" min="1" max="10" value={wellbeingForm.mood} onChange={(e) => setWellbeingForm({...wellbeingForm, mood: e.target.value})} className="w-full" />
                                        </div>
                                        <div>
                                            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-2'}>Energia: {wellbeingForm.energy}/10</label>
                                            <input type="range" min="1" max="10" value={wellbeingForm.energy} onChange={(e) => setWellbeingForm({...wellbeingForm, energy: e.target.value})} className="w-full" />
                                        </div>
                                        <div>
                                            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-2'}>Autocuidado hoje</label>
                                            <div className="space-y-2">
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={wellbeingForm.water} onChange={(e) => setWellbeingForm({...wellbeingForm, water: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                                                    <span className={'text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ''}>💧 Bebi água suficiente</span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={wellbeingForm.rest} onChange={(e) => setWellbeingForm({...wellbeingForm, rest: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                                                    <span className={'text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ''}>😴 Descansei o suficiente</span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={wellbeingForm.social} onChange={(e) => setWellbeingForm({...wellbeingForm, social: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                                                    <span className={'text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ''}>👥 Tive contacto social</span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer">
                                                    <input type="checkbox" checked={wellbeingForm.food} onChange={(e) => setWellbeingForm({...wellbeingForm, food: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                                                    <span className={'text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ''}>🍽️ Comi refeições nutritivas</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <label className={'block text-sm font-medium mb-2 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Emoções do dia (opcional)</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['😊 Feliz', '😢 Triste', '😰 Ansioso/a', '😌 Calmo/a', '😤 Irritado/a', '💪 Motivado/a', '😴 Cansado/a', '🙏 Grato/a', '😫 Frustrado/a', '🌟 Esperançoso/a', '😐 Entediado/a', '😓 Stressado/a', '💯 Confiante', '😔 Inseguro/a', '🥺 Solitário/a', '🥰 Amado/a', '🎉 Entusiasmado/a', '😕 Confuso/a', '🌱 Orgulhoso/a', '😖 Culpado/a', '😞 Envergonhado/a', '🤗 Vulnerável', '⚡ Empoderado/a', '😣 Arrependido/a', '😊 Satisfeito/a', '🔌 Desconectado/a', '🔥 Com craving', '✨ Resiliente', '🌈 Otimista', '😩 Overwhelmed', '🤝 Apoiado/a', '🧘 Em paz'].map(emotion => (
                                                    <label key={emotion} className="flex items-center space-x-2 cursor-pointer">
                                                        <input type="checkbox" checked={wellbeingForm.emotions.includes(emotion)} onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setWellbeingForm({...wellbeingForm, emotions: [...wellbeingForm.emotions, emotion]});
                                                            } else {
                                                                setWellbeingForm({...wellbeingForm, emotions: wellbeingForm.emotions.filter(em => em !== emotion)});
                                                            }
                                                        }} className="rounded text-purple-600 focus:ring-purple-500" />
                                                        <span className={'text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>{emotion}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-1'}>Notas (opcional)</label>
                                            <textarea value={wellbeingForm.notes} onChange={(e) => setWellbeingForm({...wellbeingForm, notes: e.target.value})} className={(darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 h-20'} placeholder="Como te sentes hoje?"></textarea>
                                        </div>
                                        <button onClick={submitWellbeing} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all font-medium">Guardar</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showReflectionModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowReflectionModal(false)}>
                                <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className={'text-xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>Reflexão DBT</h3>
                                        <button onClick={() => setShowReflectionModal(false)} className="text-gray-400 hover:text-gray-600"><Icons.X /></button>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                                            <p className="text-purple-900 font-medium">{currentDbtQuestion}</p>
                                        </div>
                                        <div>
                                            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-1'}>A tua reflexão</label>
                                            <textarea value={reflectionAnswer} onChange={(e) => setReflectionAnswer(e.target.value)} className={(darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 h-32'} placeholder="Escreve os teus pensamentos..."></textarea>
                                        </div>
                                        <button onClick={submitReflection} className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all font-medium">Guardar</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showCycleModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowCycleModal(false)}>
                                <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className={'text-xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>🌙 Novo Ciclo</h3>
                                        <button onClick={() => setShowCycleModal(false)} className="text-gray-400 hover:text-gray-600"><Icons.X /></button>
                                    </div>
                                    <div className="space-y-4">
                                        <p className={'text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-600') + ''}>Marcar um novo ciclo muda a frase motivacional e a reflexão diária.</p>
                                        <div>
                                            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-1'}>Hora a que te deitaste</label>
                                            <input type="time" value={cycleForm.bedtime} onChange={(e) => setCycleForm({...cycleForm, bedtime: e.target.value})} className={(darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400'} />
                                        </div>
                                        <div>
                                            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-2'}>Gatilhos identificados</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['Stress', 'Ansiedade', 'Solidão', 'Festa', 'Trabalho', 'Família', 'Hábito', 'Tristeza', 'Dependência', 'Tédio', 'Cansaço', 'Dor física', 'Insónia', 'Conflito', 'Celebração'].map(trigger => (
                                                    <label key={trigger} className="flex items-center space-x-2 cursor-pointer">
                                                        <input type="checkbox" checked={cycleForm.triggers.includes(trigger)} onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setCycleForm({...cycleForm, triggers: [...cycleForm.triggers, trigger]});
                                                            } else {
                                                                setCycleForm({...cycleForm, triggers: cycleForm.triggers.filter(t => t !== trigger)});
                                                            }
                                                        }} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                                        <span className={'text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ''}>{trigger}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className={'block text-sm font-medium mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Notas sobre este ciclo (opcional)</label>
                                            <textarea value={cycleForm.notes} onChange={(e) => setCycleForm({...cycleForm, notes: e.target.value})} className={(darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400 h-20'} placeholder="Como foi o ciclo? O que observaste?"></textarea>
                                        </div>
                                        <div className={(darkMode ? 'bg-green-900/20 border-green-700/50' : 'bg-green-50 border-green-200') + ' rounded-lg p-3 border'}>
                                            <label className="flex items-center space-x-2 cursor-pointer">
                                                <input type="checkbox" checked={cycleForm.lastBefore00} onChange={(e) => setCycleForm({...cycleForm, lastBefore00: e.target.checked})} className="rounded text-green-600 focus:ring-green-500 w-5 h-5" />
                                                <span className={'text-sm font-medium ' + (darkMode ? 'text-green-300' : 'text-green-800')}>✓ Último consumo do ciclo foi antes da meia-noite (00h)</span>
                                            </label>
                                        </div>
                                        <button onClick={submitCycle} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all font-medium">Iniciar Novo Ciclo</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showGoalModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowGoalModal(false)}>
                                <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className={'text-xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>{editingGoal ? 'Editar Meta' : 'Nova Meta'}</h3>
                                        <button onClick={() => { setShowGoalModal(false); setEditingGoal(null); }} className="text-gray-400 hover:text-gray-600"><Icons.X /></button>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-1'}>Tipo de Meta</label>
                                            <select value={goalForm.type} onChange={(e) => setGoalForm({...goalForm, type: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400">
                                                <option value="reduce_frequency">Reduzir Frequência</option>
                                                <option value="reduce_quantity">Reduzir Quantidade (mg)</option>
                                                <option value="delay_first">Adiar Primeiro Consumo</option>
                                                <option value="increase_interval">Aumentar Intervalo (horas)</option>
                                                <option value="limit_last">Hora do Último Consumo</option>
                                                <option value="sleep_hours">Horas de Sono por Dia</option>
                                                <option value="bedtime_before">Deitar Antes de</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-1'}>Período</label>
                                            <select value={goalForm.period} onChange={(e) => setGoalForm({...goalForm, period: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400">
                                                <option value="daily">Diário</option>
                                                <option value="weekly">Semanal</option>
                                                <option value="monthly">Mensal</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-1'}>
                                                Meta {goalForm.type.includes('delay') || goalForm.type.includes('limit') || goalForm.type.includes('bedtime') ? '(HH:MM)' : '(número)'}
                                            </label>
                                            <input type={goalForm.type.includes('delay') || goalForm.type.includes('limit') || goalForm.type.includes('bedtime') ? 'time' : 'number'} value={goalForm.target} onChange={(e) => setGoalForm({...goalForm, target: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400" required />
                                        </div>
                                        <div>
                                            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-1'}>Prazo</label>
                                            <input type="date" value={goalForm.deadline} onChange={(e) => setGoalForm({...goalForm, deadline: e.target.value})} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400" required />
                                        </div>
                                        <button onClick={submitGoal} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium">{editingGoal ? 'Atualizar Meta' : 'Criar Meta'}</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showEditConsumptionModal && editingConsumption && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowEditConsumptionModal(false)}>
                                <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className={'text-xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>Editar Consumo</h3>
                                        <button onClick={() => setShowEditConsumptionModal(false)} className="text-gray-400 hover:text-gray-600"><Icons.X /></button>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={'block text-sm font-medium mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Data</label>
                                                <input
                                                    type="date"
                                                    value={editingConsumption.timestamp.split('T')[0]}
                                                    onChange={(e) => {
                                                        const currentDate = safeDate(editingConsumption.timestamp);
                                                        if (!currentDate) return;
                                                        const newDate = new Date(e.target.value);
                                                        newDate.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);
                                                        setEditingConsumption({...editingConsumption, timestamp: newDate.toISOString(), date: e.target.value});
                                                    }}
                                                    className={(darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300') + ' w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-400'}
                                                />
                                            </div>
                                            <div>
                                                <label className={'block text-sm font-medium mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Hora</label>
                                                <input
                                                    type="time"
                                                    value={(() => {
                                                        const d = safeDate(editingConsumption.timestamp);
                                                        return d ? d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'}) : '00:00';
                                                    })()}
                                                    onChange={(e) => {
                                                        const currentDate = safeDate(editingConsumption.timestamp);
                                                        if (!currentDate) return;
                                                        const [hours, minutes] = e.target.value.split(':');
                                                        currentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                                                        setEditingConsumption({...editingConsumption, timestamp: currentDate.toISOString()});
                                                    }}
                                                    className={(darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300') + ' w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-400'}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={'block text-sm font-medium mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Notas</label>
                                            <textarea value={editingConsumption.notes || ''} onChange={(e) => setEditingConsumption({...editingConsumption, notes: e.target.value})} className={(darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 h-24'} placeholder="Adiciona notas sobre este consumo..."></textarea>
                                        </div>
                                        <button onClick={saveEditedConsumption} className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all font-medium">Guardar</button>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                    <button onClick={() => setCurrentView('resources')} className={'p-2 rounded-xl transition-colors flex flex-col items-center ' + (currentView === 'resources' ? 'bg-purple-600 text-white' : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'))}>
                                        <Icons.TrendingDown className="w-5 h-5" />
                                        <div className="text-xs font-medium mt-1">Recursos</div>
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
