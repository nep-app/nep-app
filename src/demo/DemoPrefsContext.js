import { createContext, useContext, useSyncExternalStore } from 'react';

// Forma do Início. No demo manda o DemoShell (Provider, sempre 'relogio').
// Na app a sério não há Provider: vale a escolha das Definições, só deste
// dispositivo ('atual' = o Início de sempre).
const NO_PROVIDER = { layout: null };
export const DemoPrefsContext = createContext(NO_PROVIDER);

const APP_LAYOUT_KEY = 'nep_layout';
const listeners = new Set();

export const readAppLayout = () => {
  try { return localStorage.getItem(APP_LAYOUT_KEY) === 'relogio' ? 'relogio' : 'atual'; } catch { return 'atual'; }
};
export const saveAppLayout = (layout) => {
  try {
    if (layout === 'relogio') localStorage.setItem(APP_LAYOUT_KEY, 'relogio');
    else localStorage.removeItem(APP_LAYOUT_KEY);
  } catch { /* fica só nesta sessão */ }
  listeners.forEach(fn => fn());
};
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export const useDemoPrefs = () => {
  const ctx = useContext(DemoPrefsContext);
  const appLayout = useSyncExternalStore(subscribe, readAppLayout, () => 'atual');
  return ctx === NO_PROVIDER ? { layout: appLayout } : ctx;
};
