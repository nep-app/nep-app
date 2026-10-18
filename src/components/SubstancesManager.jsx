import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from './Icons';
import { useSubstances } from '../hooks/useSubstances';
import { useData } from '../contexts/DataContext';
import { MAX_NAME, principalPeriods, principalNameOn, dayBefore } from '../utils/substances';
import { getTodayKey, getDateKeyFromItem, formatDate } from '../utils/helpers';

const showDay = (day) => formatDate(`${day}T12:00:00`);

// "As minhas substâncias": a lista para escolher depressa o que foi em cada
// registo, e qual é a principal (a que conta nas contas e vai logo no registo
// rápido). Mudar a principal pede "a partir de quando", para o passado não
// mudar sem querer. Tirar daqui não mexe nos registos antigos.
export function SubstancesManager() {
  const { t } = useTranslation();
  const { substances, allSubstances, addSubstance, removeSubstance, setDefaultSubstance, setAskAmount } = useSubstances();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const current = substances.find(s => s.isDefault);
  const periods = principalPeriods(allSubstances);
  const changedOverTime = periods.length > 1 || periods.some(p => p.from);
  // Mudar a principal: escolhe-se primeiro, confirma-se com a data.
  const today = getTodayKey();
  const [change, setChange] = useState(null); // null | { id, from, always }
  const [changeBusy, setChangeBusy] = useState(false);
  const pendingName = change ? (substances.find(s => s.id === change.id)?.name || null) : null;
  const confirmChange = async () => {
    setChangeBusy(true);
    try {
      await setDefaultSubstance(change.id || null, change.always ? null : (change.from || today));
      setChange(null);
      setTagStep(null);
    } finally { setChangeBusy(false); }
  };
  const { tagConsumptionsWithoutSubstance } = useData();
  // Marcar registos antigos (sem substância) com a principal: 1.º toque conta,
  // 2.º confirma. Nunca mexe em registos que já têm substância.
  const [tagStep, setTagStep] = useState(null); // null | { count } | { done }
  const [tagBusy, setTagBusy] = useState(false);
  // Cada registo leva a principal do seu dia (se a principal já mudou).
  const nameForDay = (c) => principalNameOn(periods, getDateKeyFromItem(c));
  const countUntagged = async () => {
    if (!tagConsumptionsWithoutSubstance) return;
    setTagBusy(true);
    try { setTagStep({ count: await tagConsumptionsWithoutSubstance(nameForDay, { dryRun: true }) }); } finally { setTagBusy(false); }
  };
  const applyTag = async () => {
    setTagBusy(true);
    try { setTagStep({ done: await tagConsumptionsWithoutSubstance(nameForDay) }); } finally { setTagBusy(false); }
  };

  const add = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try { await addSubstance(name); setName(''); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      {substances.length === 0 ? (
        <p className="text-sm text-gray-400">{t('substances.settingsEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {substances.map(s => (
            <li key={s.id} className="flex items-center justify-between gap-2 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2">
              <span className="text-sm text-white min-w-0 truncate">{s.name}</span>
              <button
                onClick={() => removeSubstance(s.id)}
                aria-label={t('substances.remove', { name: s.name })}
                className="text-gray-400 hover:text-gray-200 px-1 flex-shrink-0"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={name}
          maxLength={MAX_NAME}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={t('substances.namePlaceholder')}
          aria-label={t('substances.namePlaceholder')}
          className="flex-1 min-w-0 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 p-2 rounded-lg focus:ring-2 focus:ring-purple-400"
        />
        <button onClick={add} disabled={busy || !name.trim()} className="px-4 rounded-lg bg-purple-600 text-white text-sm font-medium disabled:opacity-50">
          {t('substances.add')}
        </button>
      </div>

      {substances.length > 0 && (
        <div>
          <label htmlFor="default-substance" className="block text-sm font-medium text-gray-300 mb-1">{t('substances.defaultLabel')}</label>
          <select
            id="default-substance"
            value={change ? (change.id || '') : (current ? current.id : '')}
            onChange={(e) => {
              const id = e.target.value || null;
              setChange(id === (current?.id || null) ? null : { id, from: today, always: false });
            }}
            className="w-full bg-gray-700 border border-gray-600 text-white p-2 rounded-lg focus:ring-2 focus:ring-purple-400"
          >
            <option value="">{t('substances.defaultNone')}</option>
            {substances.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <p className="text-xs text-gray-400 mt-1">{t('substances.defaultHint')}</p>

          {current && !change && (
            <div className="mt-3">
              <label className="flex items-start gap-2 text-sm text-gray-200">
                <input type="checkbox" className="mt-1" checked={!!current.askAmount} onChange={(e) => setAskAmount(current.id, e.target.checked)} />
                <span>{t('substances.askAmountLabel', { name: current.name })}</span>
              </label>
              <p className="text-xs text-gray-400 mt-1 ml-6">{t('substances.askAmountHint')}</p>
            </div>
          )}

          {change && (
            <div className="mt-3 space-y-2 bg-gray-700 border border-gray-600 rounded-lg p-3">
              <label htmlFor="principal-from" className="block text-sm font-medium text-gray-200">{t('substances.changeFrom')}</label>
              <input
                id="principal-from"
                type="date"
                value={change.from}
                max={today}
                disabled={change.always}
                onChange={(e) => setChange(c => ({ ...c, from: e.target.value || today }))}
                className="w-full bg-gray-800 border border-gray-600 text-white p-2 rounded-lg disabled:opacity-50"
              />
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={change.always} onChange={(e) => setChange(c => ({ ...c, always: e.target.checked }))} />
                {t('substances.changeAlways')}
              </label>
              <p className="text-xs text-gray-300">
                {change.always
                  ? t(pendingName ? 'substances.changeExplainAlways' : 'substances.changeExplainAlwaysNone', { name: pendingName })
                  : <>
                      {current
                        ? t('substances.changeExplainBefore', { date: showDay(dayBefore(change.from || today)), old: current.name })
                        : t('substances.changeExplainBeforeNone', { date: showDay(dayBefore(change.from || today)) })}{' '}
                      {t(pendingName ? 'substances.changeExplainAfter' : 'substances.changeExplainAfterNone', { date: showDay(change.from || today), name: pendingName })}
                    </>}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setChange(null)} disabled={changeBusy} className="flex-1 py-2 rounded-lg text-sm bg-gray-800 text-gray-300">{t('common.cancel')}</button>
                <button onClick={confirmChange} disabled={changeBusy} className="flex-1 py-2 rounded-lg text-sm font-semibold bg-purple-600 text-white disabled:opacity-50">{t('substances.changeApply')}</button>
              </div>
            </div>
          )}

          {!change && changedOverTime && (
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-300 mb-1">{t('substances.historyTitle')}</p>
              <ul className="text-xs text-gray-400 space-y-0.5">
                {periods.map((p, i) => (
                  <li key={i}>
                    {p.name} · {p.from ? t('substances.historySince', { date: showDay(p.from) }) : t('substances.historyAlways')}
                    {' '}{p.to ? t('substances.historyUntil', { date: showDay(p.to) }) : t('substances.historyNow')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!change && periods.length > 0 && tagConsumptionsWithoutSubstance && (
            <div className="mt-3">
              {!tagStep && (
                <button onClick={countUntagged} disabled={tagBusy} className="w-full py-2 rounded-lg text-sm font-medium bg-gray-700 border border-gray-600 text-gray-200 hover:bg-gray-600 disabled:opacity-50">
                  {tagBusy ? t('substances.tagCounting') : (changedOverTime ? t('substances.tagButtonByDay') : t('substances.tagButton', { name: current?.name }))}
                </button>
              )}
              {tagStep && tagStep.count === 0 && <p className="text-xs text-gray-400">{t('substances.tagNone')}</p>}
              {tagStep && tagStep.count > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-200">{changedOverTime ? t('substances.tagConfirmByDay', { count: tagStep.count }) : t('substances.tagConfirm', { count: tagStep.count, name: current?.name })}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setTagStep(null)} disabled={tagBusy} className="flex-1 py-2 rounded-lg text-sm bg-gray-700 text-gray-300">{t('common.cancel')}</button>
                    <button onClick={applyTag} disabled={tagBusy} className="flex-1 py-2 rounded-lg text-sm font-semibold bg-purple-600 text-white disabled:opacity-50">{tagBusy ? t('substances.tagWorking') : t('substances.tagApply')}</button>
                  </div>
                </div>
              )}
              {tagStep && tagStep.done != null && <p className="text-xs text-gray-300">{changedOverTime ? t('substances.tagDoneByDay', { count: tagStep.done }) : t('substances.tagDone', { count: tagStep.done, name: current?.name })}</p>}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">{t('substances.privacyNote')}</p>
    </div>
  );
}
