import { createContext, useContext } from 'react';

// Preferências SÓ do modo demo (ex.: experimentar o novo Início com relógio).
// Fora do demo não há Provider e o valor é sempre o de defeito — a app real
// não muda.
export const DemoPrefsContext = createContext({ layout: 'atual' });
export const useDemoPrefs = () => useContext(DemoPrefsContext);
