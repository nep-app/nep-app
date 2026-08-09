import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/DataContext';
import { getUrgeEvents } from '../utils/urgeLog';
import { computeUrgeStats, formatDelay } from '../utils/urgeStats';

/**
 * Cartão de estatísticas do "Surfar o Impulso".
 *
 * Torna visível o esforço da pessoa: impulsos surfados, consumos adiados e
 * adiamento médio. Auto-contido — lê o registo (localStorage) e os consumos do
 * contexto. Não mostra nada se ainda não houver eventos (evita ecrã vazio).
 *
 * @param {{start:string,end:string}|null} dateRange  intervalo do período (opcional)
 */
export function UrgeSurfingStats({ dateRange = null }) {
  const { t } = useTranslation();
  const { consumptions, urgeEvents } = useData();

  // Fonte principal: base cifrada/sincronizada (urgeEvents). Junta eventuais
  // registos que ainda estejam só em localStorage (antes de a migração correr),
  // sem duplicar (dedup por instante).
  const events = useMemo(() => {
    const fromDb = (urgeEvents || []).map(e => ({ ts: e.timestamp || e.ts, exercises: e.exercises, outcome: e.outcome }));
    const seen = new Set(fromDb.map(e => e.ts));
    const merged = [...fromDb];
    for (const e of getUrgeEvents()) {
      if (e && e.ts && !seen.has(e.ts)) merged.push(e);
    }
    return merged;
  }, [urgeEvents]);

  const stats = useMemo(
    () => computeUrgeStats(events, consumptions || [], dateRange),
    [events, consumptions, dateRange]
  );

  if (!stats.hasData) return null;

  const subtitle = dateRange ? t('urgeStats.subtitlePeriod') : t('urgeStats.subtitleAll');
  const reinforce = stats.total === 1
    ? t('urgeStats.reinforceOne')
    : t('urgeStats.reinforceMany', { total: stats.total, delayed: stats.delayed });

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 motion-safe:animate-fadeInUp">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-sm font-semibold text-white flex items-center gap-2">
          <span aria-hidden="true">🌊</span>
          {t('urgeStats.title')}
        </div>
        <span className="text-xs text-gray-400">{subtitle}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-900/50 rounded-lg py-3 px-2 text-center">
          <div className="text-2xl font-bold text-pink-300 tabular-nums">{stats.total}</div>
          <div className="text-[11px] text-gray-400 leading-tight mt-0.5">{t('urgeStats.surfed')}</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg py-3 px-2 text-center">
          <div className="text-2xl font-bold text-green-300 tabular-nums">{stats.delayed}</div>
          <div className="text-[11px] text-gray-400 leading-tight mt-0.5">{t('urgeStats.delayed')}</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg py-3 px-2 text-center">
          <div className="text-2xl font-bold text-blue-300 tabular-nums">{formatDelay(stats.avgDelayMin)}</div>
          <div className="text-[11px] text-gray-400 leading-tight mt-0.5">{t('urgeStats.avgDelay')}</div>
        </div>
      </div>

      <p className="text-xs text-purple-200/90 leading-relaxed mt-3">{reinforce}</p>
      {stats.avoided > 0 && (
        <p className="text-[11px] text-gray-400 mt-1">🌱 {t('urgeStats.avoidedNote', { count: stats.avoided })}</p>
      )}
      <p className="text-[11px] text-gray-500 italic mt-2">{t('urgeStats.note')}</p>
    </div>
  );
}
