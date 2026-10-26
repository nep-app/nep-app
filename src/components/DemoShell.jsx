import React, { useEffect } from 'react';
import { AuthenticatedApp } from '../App';
import { applyDemoTheme, readDemoTheme, subscribeAppTheme } from '../demo/themes';
import { DemoPrefsContext } from '../demo/DemoPrefsContext';

// As letras dos temas vêm com demo/themes.js.

const DEMO_PREFS = { layout: 'relogio' };

export function DemoShell() {
  // As cores do demo escolhem-se nas Definições (como na app a sério).
  useEffect(() => {
    const apply = () => applyDemoTheme(readDemoTheme());
    apply();
    return subscribeAppTheme(apply);
  }, []);

  return (
    <DemoPrefsContext.Provider value={DEMO_PREFS}>
      <AuthenticatedApp />
    </DemoPrefsContext.Provider>
  );
}
