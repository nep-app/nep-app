import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthenticatedApp } from '../App';
import { DEMO_THEMES, DEMO_THEME_KEY, applyDemoTheme } from '../demo/themes';
// Letras dos temas de experiência, servidas pela própria app (a CSP não deixa
// ir buscar letras a fora, e assim também não se avisa a Google de nada).
// Só são descarregadas se um tema que as usa for escolhido.
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/unbounded/800.css';

const readTheme = () => {
  try { return localStorage.getItem(DEMO_THEME_KEY) || 'atual'; } catch { return 'atual'; }
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
    try { localStorage.removeItem(DEMO_THEME_KEY); } catch { /* nada a limpar */ }
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
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: '1 1 auto' }}>
          <span style={{ whiteSpace: 'nowrap' }}>{t('firebase.demoTheme')}</span>
          <select
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
        <AuthenticatedApp />
      </div>
    </>
  );
}
