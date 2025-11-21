import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, where, orderBy } from 'firebase/firestore';
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
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  // User state
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [consumptions, setConsumptions] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [wellbeingLogs, setWellbeingLogs] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [goals, setGoals] = useState([]);
  const [copingStrategies, setCopingStrategies] = useState([]);

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
      setReflections([]);
      setWellbeingLogs([]);
      setCycles([]);
      setGoals([]);
      setCopingStrategies([]);
      return;
    }

    const unsubscribers = [];

    // Consumptions listener
    const consumptionsQuery = query(
      collection(db, 'consumptions'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    unsubscribers.push(
      onSnapshot(consumptionsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setConsumptions(data);
      })
    );

    // Reflections listener
    const reflectionsQuery = query(
      collection(db, 'reflections'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    unsubscribers.push(
      onSnapshot(reflectionsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReflections(data);
      })
    );

    // Wellbeing logs listener
    const wellbeingQuery = query(
      collection(db, 'wellbeingLogs'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    unsubscribers.push(
      onSnapshot(wellbeingQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setWellbeingLogs(data);
      })
    );

    // Cycles listener
    const cyclesQuery = query(
      collection(db, 'cycles'),
      where('userId', '==', user.uid),
      orderBy('startDate', 'desc')
    );
    unsubscribers.push(
      onSnapshot(cyclesQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCycles(data);
      })
    );

    // Goals listener
    const goalsQuery = query(
      collection(db, 'goals'),
      where('userId', '==', user.uid)
    );
    unsubscribers.push(
      onSnapshot(goalsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGoals(data);
      })
    );

    // Coping strategies listener
    const strategiesQuery = query(
      collection(db, 'copingStrategies'),
      where('userId', '==', user.uid)
    );
    unsubscribers.push(
      onSnapshot(strategiesQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCopingStrategies(data);
      })
    );

    return () => unsubscribers.forEach(unsub => unsub());
  }, [user]);

  // CRUD operations
  const addConsumption = async (data) => {
    return await addDoc(collection(db, 'consumptions'), { ...data, userId: user.uid });
  };

  const deleteConsumption = async (id) => {
    return await deleteDoc(doc(db, 'consumptions', id));
  };

  const addReflection = async (data) => {
    return await addDoc(collection(db, 'reflections'), { ...data, userId: user.uid });
  };

  const addWellbeingLog = async (data) => {
    return await addDoc(collection(db, 'wellbeingLogs'), { ...data, userId: user.uid });
  };

  const addCycle = async (data) => {
    return await addDoc(collection(db, 'cycles'), { ...data, userId: user.uid });
  };

  const updateCycle = async (id, data) => {
    return await updateDoc(doc(db, 'cycles', id), data);
  };

  const deleteCycle = async (id) => {
    return await deleteDoc(doc(db, 'cycles', id));
  };

  const addGoal = async (data) => {
    return await addDoc(collection(db, 'goals'), { ...data, userId: user.uid });
  };

  const updateGoal = async (id, data) => {
    return await updateDoc(doc(db, 'goals', id), data);
  };

  const deleteGoal = async (id) => {
    return await deleteDoc(doc(db, 'goals', id));
  };

  const addCopingStrategy = async (data) => {
    return await addDoc(collection(db, 'copingStrategies'), { ...data, userId: user.uid });
  };

  const deleteCopingStrategy = async (id) => {
    return await deleteDoc(doc(db, 'copingStrategies', id));
  };

  const value = {
    auth,
    db,
    user,
    loading,
    consumptions,
    reflections,
    wellbeingLogs,
    cycles,
    goals,
    copingStrategies,
    addConsumption,
    deleteConsumption,
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
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
