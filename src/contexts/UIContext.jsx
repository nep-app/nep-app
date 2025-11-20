import React, { createContext, useState, useContext } from 'react';
import { genId, getTodayKey } from '../utils/helpers';

const UIContext = createContext();

export function UIProvider({ children }) {
    // 2.2 UI Navigation State
    const [currentView, setCurrentView] = useState('home');

    // Modal states
    const [showDailyLogModal, setShowDailyLogModal] = useState(false);
    const [showWellbeingModal, setShowWellbeingModal] = useState(false);
    const [showReflectionModal, setShowReflectionModal] = useState(false);
    const [showCycleModal, setShowCycleModal] = useState(false);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [showEditConsumptionModal, setShowEditConsumptionModal] = useState(false);

    // Editing states (UI related)
    const [editingConsumption, setEditingConsumption] = useState(null);
    const [editingGoal, setEditingGoal] = useState(null);

    // Sub-views
    const [patternView, setPatternView] = useState('dashboard');
    const [patternsSubView, setPatternsSubView] = useState('temporal');
    const [analysisSubView, setAnalysisSubView] = useState('temporal');

    // 2.4 Pagination States
    const [consumptionsToShow, setConsumptionsToShow] = useState(20);
    const [reflectionsToShow, setReflectionsToShow] = useState(10);
    const [wellbeingToShow, setWellbeingToShow] = useState(14);
    const [cyclesHistoryToShow, setCyclesHistoryToShow] = useState(10);

    // Filters
    const [timeFilter, setTimeFilter] = useState('all');
    const [patternsPeriod, setPatternsPeriod] = useState('tudo');
    const [patternsPeriodOffset, setPatternsPeriodOffset] = useState(0);
    const [historyPeriod, setHistoryPeriod] = useState('tudo');
    const [historyPeriodOffset, setHistoryPeriodOffset] = useState(0);
    const [historyTopic, setHistoryTopic] = useState('todos');

    // 2.5 Form States (Temporary UI state)
    const [dailyForm, setDailyForm] = useState({ mg: 30, notes: '' });
    const [wellbeingForm, setWellbeingForm] = useState({ sleep: '', mood: '', energy: '', water: false, rest: false, social: false, food: false, emotions: [], notes: '' });
    const [reflectionAnswer, setReflectionAnswer] = useState('');
    const [cycleForm, setCycleForm] = useState({ bedtime: '', triggers: [], notes: '', lastBefore00: false });
    const [goalForm, setGoalForm] = useState({ type: 'reduce_frequency', target: '', deadline: '', period: 'daily' });

    // ===== TOAST SYSTEM =====
    const [toasts, setToasts] = useState([]);
    const showToast = (message, type = 'success') => {
        const id = genId();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    // ===== REMINDER SYSTEM (UI Part) =====
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

    const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
        try {
            return localStorage.getItem('notificationsEnabled') === 'true';
        } catch (e) {
            console.error('Error reading notificationsEnabled:', e);
            return false;
        }
    });

    // Helper actions for UI
    const openEditConsumption = (consumption) => {
        setEditingConsumption({...consumption});
        setShowEditConsumptionModal(true);
    };

    const value = {
        // State
        currentView, setCurrentView,
        showDailyLogModal, setShowDailyLogModal,
        showWellbeingModal, setShowWellbeingModal,
        showReflectionModal, setShowReflectionModal,
        showCycleModal, setShowCycleModal,
        showGoalModal, setShowGoalModal,
        showEditConsumptionModal, setShowEditConsumptionModal,
        editingConsumption, setEditingConsumption,
        editingGoal, setEditingGoal,
        patternView, setPatternView,
        patternsSubView, setPatternsSubView,
        analysisSubView, setAnalysisSubView,
        consumptionsToShow, setConsumptionsToShow,
        reflectionsToShow, setReflectionsToShow,
        wellbeingToShow, setWellbeingToShow,
        cyclesHistoryToShow, setCyclesHistoryToShow,
        timeFilter, setTimeFilter,
        patternsPeriod, setPatternsPeriod,
        patternsPeriodOffset, setPatternsPeriodOffset,
        historyPeriod, setHistoryPeriod,
        historyPeriodOffset, setHistoryPeriodOffset,
        historyTopic, setHistoryTopic,
        dailyForm, setDailyForm,
        wellbeingForm, setWellbeingForm,
        reflectionAnswer, setReflectionAnswer,
        cycleForm, setCycleForm,
        goalForm, setGoalForm,
        toasts, showToast,
        reminderDismissed, dismissReminder, shouldShowReminder,
        notificationsEnabled, setNotificationsEnabled,

        // Actions
        openEditConsumption
    };

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
}

export function useUI() {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI deve ser usado dentro de UIProvider');
    }
    return context;
}
