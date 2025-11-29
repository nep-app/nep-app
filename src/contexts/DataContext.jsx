import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, setDoc, deleteDoc, doc, updateDoc, enableIndexedDbPersistence } from 'firebase/firestore';
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

    // Enable offline persistence (original behavior)
    enableIndexedDbPersistence(dbInstance).catch((err) => {
      if (err.code === 'failed-precondition') {
      } else if (err.code === 'unimplemented') {
      }
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

    // Consumptions listener (estrutura original: users/{userId}/consumptions)
    unsubscribers.push(
      onSnapshot(collection(db, `users/${user.uid}/consumptions`), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data()).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
        setConsumptions(data);
      })
    );

    // Daily logs listener
    unsubscribers.push(
      onSnapshot(collection(db, `users/${user.uid}/dailyLogs`), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data()).sort((a,b) => b.date.localeCompare(a.date));
        setDailyLogs(data);
      })
    );

    // Reflections listener
    unsubscribers.push(
      onSnapshot(collection(db, `users/${user.uid}/reflections`), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data()).sort((a,b) => b.date.localeCompare(a.date));
        setReflections(data);
      })
    );

    // Wellbeing logs listener
    unsubscribers.push(
      onSnapshot(collection(db, `users/${user.uid}/wellbeingLogs`), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data()).sort((a,b) => b.date.localeCompare(a.date));
        setWellbeingLogs(data);
      })
    );

    // Cycles listener
    unsubscribers.push(
      onSnapshot(collection(db, `users/${user.uid}/cycles`), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data()).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
        setCycles(data);
      })
    );

    // Goals listener
    unsubscribers.push(
      onSnapshot(collection(db, `users/${user.uid}/goals`), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data());
        setGoals(data);
      })
    );

    // Coping strategies listener (se existir)
    unsubscribers.push(
      onSnapshot(collection(db, `users/${user.uid}/copingStrategies`), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data());
        setCopingStrategies(data);
      })
    );

    // Thoughts listener
    unsubscribers.push(
      onSnapshot(collection(db, `users/${user.uid}/thoughts`), (snapshot) => {
        const data = snapshot.docs.map(doc => doc.data()).sort((a,b) => b.timestamp.localeCompare(a.timestamp));
        setThoughts(data);
      })
    );

    return () => unsubscribers.forEach(unsub => unsub());
  }, [user]);

  // CRUD operations (estrutura original: users/{userId}/collection)
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

  const value = {
    auth,
    db,
    user,
    loading,
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
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
