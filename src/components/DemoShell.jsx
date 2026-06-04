import React from 'react';
import { AuthenticatedApp } from '../App';

export function DemoShell() {
  const exit = () => {
    localStorage.removeItem('nep_demo');
    window.location.reload();
  };

  return (
    <>
      {/* Banner fixo de modo demo */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'linear-gradient(90deg, #7c3aed, #db2777)',
          color: '#fff', textAlign: 'center', padding: '6px 12px',
          fontSize: '13px', fontWeight: 600, display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: '12px',
        }}
      >
        <span>🎭 Modo Demo — os dados não são guardados</span>
        <button
          onClick={exit}
          style={{
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
            color: '#fff', borderRadius: '6px', padding: '2px 10px',
            cursor: 'pointer', fontSize: '12px', fontWeight: 600,
          }}
        >
          Sair do demo
        </button>
      </div>

      {/* Espaço para o banner não tapar conteúdo */}
      <div style={{ paddingTop: '34px' }}>
        <AuthenticatedApp />
      </div>
    </>
  );
}
