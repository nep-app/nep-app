import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { firebaseConfig } from '../utils/firebase';
import { useUI } from './UIContext';

const DataContext = createContext();

export function DataProvider({ children }) {
    const { showToast } = useUI();

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
    const hasAutoAssociatedRef = useRef(false);

    // 2.3 Data State (from Firebase)
    const [consumptions, setConsumptions] = useState([]);
    const [dailyLogs, setDailyLogs] = useState([]);
    const [wellbeingLogs, setWellbeingLogs] = useState([]);
    const [reflections, setReflections] = useState([]);
    const [cycles, setCycles] = useState([]);
    const [goals, setGoals] = useState([]);

    // Initialize Firebase
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const dbInstance = getFirestore(app);
            const authInstance = getAuth(app);

            enableIndexedDbPersistence(dbInstance).catch((err) => {
                console.log('Persistence error:', err);
            });

            setDb(dbInstance);
            setAuth(authInstance);
            setFirebaseInitialized(true);
        } catch (error) {
            console.error('Firebase init error:', error);
            setAppError(error.message);
        }
    }, []);

    // Auth Listener
    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, [auth]);

    // Data Listeners
    useEffect(() => {
        if (!user || !db) return;

        const unsubs = [
            onSnapshot(collection(db, `users/${user.uid}/consumptions`), snap => setConsumptions(snap.docs.map(d => d.data()).sort((a,b) => b.timestamp.localeCompare(a.timestamp)))),
            onSnapshot(collection(db, `users/${user.uid}/dailyLogs`), snap => setDailyLogs(snap.docs.map(d => d.data()).sort((a,b) => b.date.localeCompare(a.date)))),
            onSnapshot(collection(db, `users/${user.uid}/wellbeingLogs`), snap => setWellbeingLogs(snap.docs.map(d => d.data()).sort((a,b) => b.date.localeCompare(a.date)))),
            onSnapshot(collection(db, `users/${user.uid}/reflections`), snap => setReflections(snap.docs.map(d => d.data()).sort((a,b) => b.date.localeCompare(a.date)))),
            onSnapshot(collection(db, `users/${user.uid}/cycles`), snap => setCycles(snap.docs.map(d => d.data()).sort((a,b) => b.timestamp.localeCompare(a.timestamp)))),
            onSnapshot(collection(db, `users/${user.uid}/goals`), snap => setGoals(snap.docs.map(d => d.data())))
        ];

        return () => unsubs.forEach(u => u());
    }, [user, db]);

    // Helper: Save to Firebase
    const saveToFirebase = async (collectionName, entry) => {
        if (!user || !db) return;
        await setDoc(doc(db, `users/${user.uid}/${collectionName}`, entry.id), entry);
    };

    // Helper: Delete Item
    const deleteItem = async (collectionName, id) => {
        if (!user || !db) return;

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

    // Auth Actions
    const handleAuth = async (e) => {
        e.preventDefault();
        setAuthError('');
        if (!auth) return;

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (error) {
            if (error.code === 'auth/user-not-found') setAuthError('Email não encontrado. Cria conta primeiro.');
            else if (error.code === 'auth/wrong-password') setAuthError('Password errada.');
            else if (error.code === 'auth/email-already-in-use') setAuthError('Email já existe. Faz login.');
            else if (error.code === 'auth/weak-password') setAuthError('Password fraca (mínimo 6 caracteres).');
            else if (error.code === 'auth/invalid-email') setAuthError('Email inválido.');
            else if (error.code === 'auth/invalid-credential') setAuthError('Email ou password incorretos.');
            else setAuthError('Erro: ' + error.message);
        }
    };

    const handleLogout = () => { signOut(auth); };

    // Auto-associate consumptions to cycles
    useEffect(() => {
        if (!user || !db || cycles.length === 0 || consumptions.length === 0) return;
        if (hasAutoAssociatedRef.current) return;

        const consumptionsWithoutCycle = consumptions.filter(c => !c.cycleId);
        if (consumptionsWithoutCycle.length === 0) return;

        hasAutoAssociatedRef.current = true;
        const sortedCycles = [...cycles].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        (async () => {
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
                if (!assignedCycleId) assignedCycleId = sortedCycles[0].id;
                const updatedConsumption = { ...consumption, cycleId: assignedCycleId };
                await saveToFirebase('consumptions', updatedConsumption);
            }
        })();
    }, [user, db, cycles, consumptions]);

    const value = {
        firebaseInitialized,
        db, auth, user,
        consumptions, setConsumptions,
        dailyLogs, setDailyLogs,
        wellbeingLogs, setWellbeingLogs,
        reflections, setReflections,
        cycles, setCycles,
        goals, setGoals,
        saveToFirebase, deleteItem,
        isLogin, setIsLogin,
        email, setEmail,
        password, setPassword,
        authError, setAuthError,
        handleAuth, handleLogout,
        appError, setAppError
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData deve ser usado dentro de DataProvider');
    }
    return context;
}
