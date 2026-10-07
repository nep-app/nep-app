import { createContext, useContext, useSyncExternalStore } from 'react';

// Forma do Início. No demo manda o DemoShell (Provider, sempre 'relogio').
// Na app a sério não há Provider: vale a escolha das Definições, só deste
// dispositivo ('atual' = o Início de sempre; por defeito, o relógio).
const NO_PROVIDER = { layout: null };
export const DemoPrefsContext = createContext(NO_PROVIDER);

const APP_LAYOUT_KEY = 'nep_layout';
const listeners = new Set();

// Por defeito (desde a v6.67.0) é o relógio para toda a gente; 'atual' só
// se a pessoa o escolher nas Definições.
export const readAppLayout = () => {
  try { return localStorage.getItem(APP_LAYOUT_KEY) === 'atual' ? 'atual' : 'relogio'; } catch { return 'relogio'; }
};
export const saveAppLayout = (layout) => {
  try { localStorage.setItem(APP_LAYOUT_KEY, layout === 'atual' ? 'atual' : 'relogio'); } catch { /* fica só nesta sessão */ }
  listeners.forEach(fn => fn());
};
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export const useDemoPrefs = () => {
  const ctx = useContext(DemoPrefsContext);
  const appLayout = useSyncExternalStore(subscribe, readAppLayout, () => 'relogio');
  return ctx === NO_PROVIDER ? { layout: appLayout } : ctx;
};
