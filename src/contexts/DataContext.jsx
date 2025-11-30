import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, setDoc, deleteDoc, doc, updateDoc, enableIndexedDbPersistence, query, orderBy, limit } from 'firebase/firestore';
import { firebaseConfig } from '../utils/firebase';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  // Initialize Firebase (only once)
  const { app, auth, db } = useMemo(() => {
    const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const dbInstance = getFirestore(firebaseApp);

    // Enable offline persistence
    enableIndexedDbPersistence(dbInstance).catch((err) => {
      // Ignore errors (e.g. if already enabled or not supported)
    });

    return {
      app: firebaseApp,
      auth: getAuth(firebaseApp),
      db: dbInstance
    };
  }, []);

  // User state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data Loading State
  const [isFullHistoryLoaded, setIsFullHistoryLoaded] = useState(false);

  // Data states
  const [consumptions, setConsumptions] = useState([]);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [wellbeingLogs, setWellbeingLogs] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [goals, setGoals] = useState([]);
  const [copingStrategies, setCopingStrategies] = useState([]);
  const [thoughts, setThoughts] = useState([]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, [auth]);

  // Firebase listeners for all collections
  useEffect(() => {
    if (!user) {
      setConsumptions([]);
      setDailyLogs([]);
      setReflections([]);
      setWellbeingLogs([]);
      setCycles([]);
      setGoals([]);
      setCopingStrategies([]);
      setThoughts([]);
      return;
    }

    const unsubscribers = [];

    // Helper to create query based on loading state
    // If full history not requested, limit to recent items (e.g. last 50)
    // Consumptions: sort by timestamp desc
    const consumptionsQuery = isFullHistoryLoaded
        ? collection(db, `users/${user.uid}/consumptions`)
        : query(collection(db, `users/${user.uid}/consumptions`), orderBy('timestamp', 'desc'), limit(100));

    unsubscribers.push(
      onSnapshot(consumptionsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data()).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
        setConsumptions(data);
      })
    );

    // Daily logs: sort by date desc
    const dailyLogsQuery = isFullHistoryLoaded
        ? collection(db, `users/${user.uid}/dailyLogs`)
        : query(collection(db, `users/${user.uid}/dailyLogs`), orderBy('date', 'desc'), limit(30));

    unsubscribers.push(
      onSnapshot(dailyLogsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data()).sort((a,b) => b.date.localeCompare(a.date));
        setDailyLogs(data);
      })
    );

    // Reflections: sort by date desc
    const reflectionsQuery = isFullHistoryLoaded
        ? collection(db, `users/${user.uid}/reflections`)
        : query(collection(db, `users/${user.uid}/reflections`), orderBy('date', 'desc'), limit(30));

    unsubscribers.push(
      onSnapshot(reflectionsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data()).sort((a,b) => b.date.localeCompare(a.date));
        setReflections(data);
      })
    );

    // Wellbeing logs: sort by date desc
    const wellbeingQuery = isFullHistoryLoaded
        ? collection(db, `users/${user.uid}/wellbeingLogs`)
        : query(collection(db, `users/${user.uid}/wellbeingLogs`), orderBy('date', 'desc'), limit(30));

    unsubscribers.push(
      onSnapshot(wellbeingQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data()).sort((a,b) => b.date.localeCompare(a.date));
        setWellbeingLogs(data);
      })
    );

    // Cycles: sort by timestamp desc
    const cyclesQuery = isFullHistoryLoaded
        ? collection(db, `users/${user.uid}/cycles`)
        : query(collection(db, `users/${user.uid}/cycles`), orderBy('timestamp', 'desc'), limit(30));

    unsubscribers.push(
      onSnapshot(cyclesQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data()).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
        setCycles(data);
      })
    );

    // Goals: small collection, always load all
    unsubscribers.push(
      onSnapshot(collection(db, `users/${user.uid}/goals`), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data());
        setGoals(data);
      })
    );

    // Coping strategies: small collection, always load all
    unsubscribers.push(
      onSnapshot(collection(db, `users/${user.uid}/copingStrategies`), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data());
        setCopingStrategies(data);
      })
    );

    // Thoughts: sort by timestamp desc
    const thoughtsQuery = isFullHistoryLoaded
        ? collection(db, `users/${user.uid}/thoughts`)
        : query(collection(db, `users/${user.uid}/thoughts`), orderBy('timestamp', 'desc'), limit(30));

    unsubscribers.push(
      onSnapshot(thoughtsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data()).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
        setThoughts(data);
      })
    );

    return () => unsubscribers.forEach(unsub => unsub());
  }, [user, isFullHistoryLoaded]); // Re-run when user or loading preference changes

  // Action to load full history
  const loadFullHistory = () => {
      if (!isFullHistoryLoaded) {
          setIsFullHistoryLoaded(true);
      }
  };

  // CRUD operations
  const addConsumption = async (data) => {
    if (!user) return;
    return await setDoc(doc(db, `users/${user.uid}/consumptions`, data.id), data);
  };

  const deleteConsumption = async (id) => {
    if (!user) return;
    return await deleteDoc(doc(db, `users/${user.uid}/consumptions`, id));
  };

  const addDailyLog = async (data) => {
    if (!user) return;
    return await setDoc(doc(db, `users/${user.uid}/dailyLogs`, data.id), data);
  };

  const addReflection = async (data) => {
    if (!user) return;
    return await setDoc(doc(db, `users/${user.uid}/reflections`, data.id), data);
  };

  const addWellbeingLog = async (data) => {
    if (!user) return;
    return await setDoc(doc(db, `users/${user.uid}/wellbeingLogs`, data.id), data);
  };

  const addCycle = async (data) => {
    if (!user) return;
    return await setDoc(doc(db, `users/${user.uid}/cycles`, data.id), data);
  };

  const updateCycle = async (id, data) => {
    if (!user) return;
    return await updateDoc(doc(db, `users/${user.uid}/cycles`, id), data);
  };

  const deleteCycle = async (id) => {
    if (!user) return;
    return await deleteDoc(doc(db, `users/${user.uid}/cycles`, id));
  };

  const addGoal = async (data) => {
    if (!user) return;
    return await setDoc(doc(db, `users/${user.uid}/goals`, data.id), data);
  };

  const updateGoal = async (id, data) => {
    if (!user) return;
    return await updateDoc(doc(db, `users/${user.uid}/goals`, id), data);
  };

  const deleteGoal = async (id) => {
    if (!user) return;
    return await deleteDoc(doc(db, `users/${user.uid}/goals`, id));
  };

  const addCopingStrategy = async (data) => {
    if (!user) return;
    return await setDoc(doc(db, `users/${user.uid}/copingStrategies`, data.id), data);
  };

  const deleteCopingStrategy = async (id) => {
    if (!user) return;
    return await deleteDoc(doc(db, `users/${user.uid}/copingStrategies`, id));
  };

  const addThought = async (data) => {
    if (!user) return;
    return await setDoc(doc(db, `users/${user.uid}/thoughts`, data.id), data);
  };

  // Generic delete for any collection
  const deleteItem = async (collectionName, id) => {
      if (!user) return;
      return await deleteDoc(doc(db, `users/${user.uid}/${collectionName}`, id));
  };

  const value = {
    auth,
    db,
    user,
    loading,
    isFullHistoryLoaded,
    loadFullHistory,
    consumptions,
    dailyLogs,
    reflections,
    wellbeingLogs,
    cycles,
    goals,
    copingStrategies,
    thoughts,
    addConsumption,
    deleteConsumption,
    addDailyLog,
    addReflection,
    addWellbeingLog,
    addCycle,
    updateCycle,
    deleteCycle,
    addGoal,
    updateGoal,
    deleteGoal,
    addCopingStrategy,
    deleteCopingStrategy,
    addThought,
    deleteItem // Exporting generic delete
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
