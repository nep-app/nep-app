import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/DataContext';
import { getUrgeEvents } from '../utils/urgeLog';
import { computeUrgeStats, formatDelay } from '../utils/urgeStats';

/**
 * Cartão de estatísticas do "Surfar o Impulso" — vive na subtab "Estado".
 *
 * Mostra: impulsos surfados (usou estratégia), consumos adiados (não consumiu
 * na mesma) e "abriste sem usar" (abriu mas não usou nada). Auto-contido — lê o
 * registo cifrado/sincronizado do contexto (com fallback ao localStorage antes
 * da migração). Não mostra nada se ainda não houver eventos.
 *
 * @param {{start:string,end:string}|null} dateRange  intervalo do período (opcional)
 */
export function UrgeSurfingStats({ dateRange = null }) {
  const { t } = useTranslation();
  const { urgeEvents, consumptions } = useData();

  // Fonte principal: base cifrada/sincronizada; junta o que ainda esteja em
  // localStorage (antes da migração), sem duplicar (dedup por instante).
  const events = useMemo(() => {
    const fromDb = (urgeEvents || []).map(e => ({ ts: e.timestamp || e.ts, exercises: e.exercises, outcome: e.outcome }));
    const seen = new Set(fromDb.map(e => e.ts));
    const merged = [...fromDb];
    for (const e of getUrgeEvents()) {
      if (e && e.ts && !seen.has(e.ts)) merged.push(e);
    }
    return merged;
  }, [urgeEvents]);

  const stats = useMemo(() => computeUrgeStats(events, consumptions || [], dateRange), [events, consumptions, dateRange]);

  if (!stats.hasData) return null;

  const subtitle = dateRange ? t('urgeStats.subtitlePeriod') : t('urgeStats.subtitleAll');
  // REGRA DO ELOGIO (CLAUDE.md): adiar não é automaticamente "bom" — a app não
  // decide a direção. Antes: números a rosa/verde/azul e "Isso conta. 💜".
  // Agora: números neutros e uma frase que só descreve o que aconteceu.
  const summary = stats.surfed === 0
    ? t('urgeStats.reinforceNone', 'Abriste o surfar, mas ainda sem usar nenhuma estratégia.')
    : t('urgeStats.reinforceMany', { surfed: stats.surfed, delayed: stats.delayed, defaultValue: 'Das {{surfed}} vezes que usaste as estratégias, em {{delayed}} não carregaste em "consumir na mesma".' });

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 motion-safe:animate-fadeInUp">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-sm font-semibold text-white flex items-center gap-2">
          <span aria-hidden="true">🌊</span>
          {t('urgeStats.title')}
        </div>
        <span className="text-xs text-gray-400">{subtitle}</span>
      </div>

      {/* Números sem caixa nem cor de juízo, separados por linhas finas (como
          no resto do Estado). */}
      <div className="grid grid-cols-3 divide-x divide-gray-700 border-y border-gray-700 py-2">
        <div className="px-2 py-1 text-center">
          <div className="text-2xl font-bold font-mono-theme text-white tabular-nums">{stats.surfed}</div>
          <div className="text-[11px] text-gray-400 leading-tight mt-0.5">{t('urgeStats.surfed')}</div>
        </div>
        <div className="px-2 py-1 text-center">
          <div className="text-2xl font-bold font-mono-theme text-white tabular-nums">{stats.delayed}</div>
          <div className="text-[11px] text-gray-400 leading-tight mt-0.5">{t('urgeStats.delayed')}</div>
        </div>
        <div className="px-2 py-1 text-center">
          <div className="text-2xl font-bold font-mono-theme text-white tabular-nums">{formatDelay(stats.avgHeldMin)}</div>
          <div className="text-[11px] text-gray-400 leading-tight mt-0.5">{t('urgeStats.avgHeld', 'até ao consumo seguinte')}</div>
        </div>
      </div>

      <p className="text-xs text-gray-300 leading-relaxed mt-3">{summary}</p>
      {stats.heldCount > 0 && (
        <p className="text-xs text-gray-500 leading-relaxed mt-1">
          {t('urgeStats.avgHeldNote', { count: stats.heldCount, defaultValue: 'O tempo é a média de {{count}} vezes: as que tiveram um consumo nas 24 h seguintes.' })}
        </p>
      )}
    </div>
  );
}
