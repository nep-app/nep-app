import React, { useState, useCallback } from 'react';
import { DataContext } from './DataContext';
import { getAllDemoData } from '../demo/demoData';
import { genId, getTodayKey } from '../utils/helpers';

const DEMO_USER = { uid: 'demo-user', email: 'demo@nep.app', displayName: 'Demo' };

export const DemoDataProvider = ({ children }) => {
  const initial = getAllDemoData();
  const [consumptions,  setConsumptions]  = useState(initial.consumptions);
  const [dailyLogs,     setDailyLogs]     = useState(initial.dailyLogs);
  const [reflections,   setReflections]   = useState(initial.reflections);
  const [wellbeingLogs, setWellbeingLogs] = useState(initial.wellbeingLogs);
  const [cycles,        setCycles]        = useState(initial.cycles);
  const [goals,         setGoals]         = useState(initial.goals);
  const [thoughts,      setThoughts]      = useState(initial.thoughts);

  // Generic add/update/delete helpers
  const addTo   = (setter, item) => setter(prev => [item, ...prev]);
  const updateIn = (setter, id, updates) =>
    setter(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  const removeFrom = (setter, id) =>
    setter(prev => prev.filter(i => i.id !== id));

  const addConsumption  = useCallback(async (item) => { addTo(setConsumptions, item); return item; }, []);
  const deleteConsumption = useCallback(async (id) => { removeFrom(setConsumptions, id); }, []);
  const addDailyLog     = useCallback(async (item) => { addTo(setDailyLogs, item); return item; }, []);
  const addReflection   = useCallback(async (item) => { addTo(setReflections, item); return item; }, []);
  const addWellbeingLog = useCallback(async (item) => { addTo(setWellbeingLogs, item); return item; }, []);
  const addCycle        = useCallback(async (item) => { addTo(setCycles, item); return item; }, []);
  const updateCycle     = useCallback(async (id, u) => { updateIn(setCycles, id, u); }, []);
  const deleteCycle     = useCallback(async (id)  => { removeFrom(setCycles, id); }, []);
  const addGoal         = useCallback(async (item) => { addTo(setGoals, item); return item; }, []);
  const updateGoal      = useCallback(async (id, u) => { updateIn(setGoals, id, u); }, []);
  const deleteGoal      = useCallback(async (id)  => { removeFrom(setGoals, id); }, []);
  const addThought      = useCallback(async (item) => { addTo(setThoughts, item); return item; }, []);

  const setterMap = {
    consumptions:  setConsumptions,
    dailyLogs:     setDailyLogs,
    reflections:   setReflections,
    wellbeingLogs: setWellbeingLogs,
    cycles:        setCycles,
    goals:         setGoals,
    thoughts:      setThoughts,
  };

  const updateItem = useCallback(async (col, id, updates) => {
    if (setterMap[col]) updateIn(setterMap[col], id, updates);
  }, []);

  const deleteItem = useCallback(async (col, id) => {
    if (setterMap[col]) removeFrom(setterMap[col], id);
  }, []);

  const manualSync  = useCallback(async () => ({ pulled: 0, pushed: 0 }), []);
  const forcePushAll = useCallback(async () => ({ pulled: 0, pushed: 0 }), []);
  const countPendingItems = useCallback(async () => 0, []);
  const loadFullData = useCallback(async () => {}, []);

  const value = {
    // Fake Firebase refs (never used for real in demo)
    auth: null,
    db: null,
    user: DEMO_USER,
    loading: false,

    consumptions,
    dailyLogs,
    reflections,
    wellbeingLogs,
    cycles,
    goals,
    copingStrategies: [],
    thoughts,
    healthLogs: [],

    addConsumption, deleteConsumption,
    addDailyLog, addReflection, addWellbeingLog,
    addCycle, updateCycle, deleteCycle,
    addGoal, updateGoal, deleteGoal,
    addThought,
    updateItem,
    deleteItem,

    isSyncing: false,
    lastSyncTime: null,
    manualSync,
    forcePushAll,
    countPendingItems,

    loadFullData,
    fullDataLoaded: true,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
