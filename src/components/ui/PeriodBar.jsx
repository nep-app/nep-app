import React from 'react';
import * as Icons from '../Icons';

// ===== BARRA DE PERÍODO + SEPARADORES (Padrões, Análises, Histórico) =====
// Antes: um cartão com 4 botões cheios + outra fila de botões grandes, que
// juntos com o cabeçalho ocupavam quase metade do primeiro ecrã antes de
// aparecer um único dado. Agora: uma linha de texto com o período (o ativo
// sublinhado a rosa = "estás aqui") e, por baixo, os separadores em
// pílulas pequenas. O rosa só marca onde estás.

// Tira o emoji do início ("📅 Hoje" → "Hoje"): numa linha de texto curta,
// os 4 emojis ocupavam o espaço que falta para caberem num telemóvel.
const stripEmoji = (s) => String(s ?? '').replace(/^[\p{Extended_Pictographic}️‍\s]+/u, '');

export function PeriodBar({ periods, value, onChange, rangeLabel, onOlder, onNewer, canOlder = true, canNewer = true, olderLabel = 'Anterior', newerLabel = 'Seguinte' }) {
  return (
    <div className="border-b border-gray-700">
      <div className="flex items-end gap-5 overflow-x-auto">
        {periods.map(p => {
          const on = p.id === value;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(p.id)}
              className={'py-2 -mb-px border-b-2 text-sm font-semibold whitespace-nowrap transition-colors ' + (on ? 'text-white border-purple-500' : 'text-gray-400 border-transparent hover:text-gray-200')}
            >
              {stripEmoji(p.label)}
            </button>
          );
        })}
      </div>
      {rangeLabel && (
        <div className="flex items-center justify-between gap-2 py-1.5 text-xs text-gray-400">
          <button type="button" aria-label={olderLabel} onClick={onOlder} disabled={!canOlder}
            className={'p-1.5 -ml-1.5 rounded ' + (canOlder ? 'text-purple-400 hover:bg-gray-800' : 'text-gray-700 cursor-not-allowed')}>
            <Icons.ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono-theme text-center">{rangeLabel}</span>
          <button type="button" aria-label={newerLabel} onClick={onNewer} disabled={!canNewer}
            className={'p-1.5 -mr-1.5 rounded ' + (canNewer ? 'text-purple-400 hover:bg-gray-800' : 'text-gray-700 cursor-not-allowed')}>
            <Icons.ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function ViewTabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {tabs.map(tab => {
        const on = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(tab.id)}
            className={'px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ' + (on ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800')}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
