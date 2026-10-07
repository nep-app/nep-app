import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthenticatedApp } from '../App';
import { DEMO_THEMES, DEMO_THEME_KEY, applyDemoTheme } from '../demo/themes';
import { DemoPrefsContext } from '../demo/DemoPrefsContext';

// As letras dos temas vêm com demo/themes.js.

// Chave antiga do selector de início (já não existe: o demo usa sempre o
// relógio). Só se limpa ao sair.
const DEMO_LAYOUT_KEY = 'nep_demo_layout';
const DEMO_PREFS = { layout: 'relogio' };

const readTheme = () => {
  // No demo já não há 'Atual': um tema guardado que não esteja na lista
  // (ou nenhum) passa ao primeiro da lista.
  const first = DEMO_THEMES[0].id;
  try { const v = localStorage.getItem(DEMO_THEME_KEY); return DEMO_THEMES.some(t => t.id === v) ? v : first; } catch { return first; }
};

export function DemoShell() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    applyDemoTheme(theme);
    try { localStorage.setItem(DEMO_THEME_KEY, theme); } catch { /* sem storage: fica só nesta sessão */ }
  }, [theme]);

  const exit = () => {
    applyDemoTheme('atual');
    try { localStorage.removeItem(DEMO_THEME_KEY); localStorage.removeItem(DEMO_LAYOUT_KEY); } catch { /* nada a limpar */ }
    localStorage.removeItem('nep_demo');
    window.location.reload();
  };

  return (
    <>
      {/* Banner fixo de modo demo. Cores fixas de propósito: não muda com o
          tema, para se perceber sempre que se está no demo. */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'linear-gradient(90deg, #7c3aed, #db2777)',
          color: '#fff', padding: '6px 10px',
          fontSize: '12px', fontWeight: 600, display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: '8px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Numa linha só: o texto longo do banner ficou no title (toque longo). */}
        <span title={t('firebase.demoBanner')} style={{ whiteSpace: 'nowrap' }}>🎭 Demo</span>
        <label style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: '1 1 0' }}>
          <select
            aria-label={t('firebase.demoTheme')}
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.95)', color: '#1f2937', border: 0,
              borderRadius: '6px', padding: '3px 6px', fontSize: '12px', fontWeight: 600,
              minWidth: 0, width: '100%',
            }}
          >
            {DEMO_THEMES.map(th => <option key={th.id} value={th.id}>{th.name}</option>)}
          </select>
        </label>
        <button
          onClick={exit}
          style={{
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
            color: '#fff', borderRadius: '6px', padding: '2px 10px',
            cursor: 'pointer', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
          }}
        >
          {t('firebase.demoExit')}
        </button>
      </div>

      {/* Espaço para o banner não tapar conteúdo */}
      <div style={{ paddingTop: '38px' }}>
        <DemoPrefsContext.Provider value={DEMO_PREFS}>
          <AuthenticatedApp />
        </DemoPrefsContext.Provider>
      </div>
    </>
  );
}
