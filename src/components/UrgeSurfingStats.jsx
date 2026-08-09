import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/DataContext';
import { getUrgeEvents } from '../utils/urgeLog';
import { computeUrgeStats } from '../utils/urgeStats';

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
  const { urgeEvents } = useData();

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

  const stats = useMemo(() => computeUrgeStats(events, dateRange), [events, dateRange]);

  if (!stats.hasData) return null;

  const subtitle = dateRange ? t('urgeStats.subtitlePeriod') : t('urgeStats.subtitleAll');
  const reinforce = stats.surfed === 0
    ? t('urgeStats.reinforceNone')
    : t('urgeStats.reinforceMany', { surfed: stats.surfed, delayed: stats.delayed });

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 motion-safe:animate-fadeInUp">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-sm font-semibold text-white flex items-center gap-2">
          <span aria-hidden="true">🌊</span>
          {t('urgeStats.title')}
        </div>
        <span className="text-xs text-gray-400">{subtitle}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-900/50 rounded-lg py-3 px-2 text-center">
          <div className="text-2xl font-bold text-pink-300 tabular-nums">{stats.surfed}</div>
          <div className="text-[11px] text-gray-400 leading-tight mt-0.5">{t('urgeStats.surfed')}</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg py-3 px-2 text-center">
          <div className="text-2xl font-bold text-green-300 tabular-nums">{stats.delayed}</div>
          <div className="text-[11px] text-gray-400 leading-tight mt-0.5">{t('urgeStats.delayed')}</div>
        </div>
      </div>

      <p className="text-xs text-purple-200/90 leading-relaxed mt-3">{reinforce}</p>
      {stats.openedNoUse > 0 && (
        <p className="text-[11px] text-gray-500 leading-relaxed mt-2">
          {t('urgeStats.openedNoUseNote', { count: stats.openedNoUse })}
        </p>
      )}
    </div>
  );
}
