import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from './Icons';
import { useSubstances } from '../hooks/useSubstances';
import { useData } from '../contexts/DataContext';
import { MAX_NAME } from '../utils/substances';

// "As minhas substâncias" (vive dentro das Metas): a lista para escolher
// depressa o que foi em cada registo, e qual vai logo no registo rápido.
// Tirar daqui não mexe nos registos antigos.
export function SubstancesManager() {
  const { t } = useTranslation();
  const { substances, addSubstance, removeSubstance, setDefaultSubstance } = useSubstances();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const current = substances.find(s => s.isDefault);
  const { tagConsumptionsWithoutSubstance } = useData();
  // Marcar registos antigos (sem substância) com a principal: 1.º toque conta,
  // 2.º confirma. Nunca mexe em registos que já têm substância.
  const [tagStep, setTagStep] = useState(null); // null | { count } | { done }
  const [tagBusy, setTagBusy] = useState(false);
  const countUntagged = async () => {
    if (!current || !tagConsumptionsWithoutSubstance) return;
    setTagBusy(true);
    try { setTagStep({ count: await tagConsumptionsWithoutSubstance(current.name, { dryRun: true }) }); } finally { setTagBusy(false); }
  };
  const applyTag = async () => {
    setTagBusy(true);
    try { setTagStep({ done: await tagConsumptionsWithoutSubstance(current.name) }); } finally { setTagBusy(false); }
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
            value={current ? current.id : ''}
            onChange={(e) => setDefaultSubstance(e.target.value || null)}
            className="w-full bg-gray-700 border border-gray-600 text-white p-2 rounded-lg focus:ring-2 focus:ring-purple-400"
          >
            <option value="">{t('substances.defaultNone')}</option>
            {substances.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <p className="text-xs text-gray-400 mt-1">{t('substances.defaultHint')}</p>
          {current && tagConsumptionsWithoutSubstance && (
            <div className="mt-3">
              {!tagStep && (
                <button onClick={countUntagged} disabled={tagBusy} className="w-full py-2 rounded-lg text-sm font-medium bg-gray-700 border border-gray-600 text-gray-200 hover:bg-gray-600 disabled:opacity-50">
                  {tagBusy ? t('substances.tagCounting') : t('substances.tagButton', { name: current.name })}
                </button>
              )}
              {tagStep && tagStep.count === 0 && <p className="text-xs text-gray-400">{t('substances.tagNone')}</p>}
              {tagStep && tagStep.count > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-200">{t('substances.tagConfirm', { count: tagStep.count, name: current.name })}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setTagStep(null)} disabled={tagBusy} className="flex-1 py-2 rounded-lg text-sm bg-gray-700 text-gray-300">{t('common.cancel')}</button>
                    <button onClick={applyTag} disabled={tagBusy} className="flex-1 py-2 rounded-lg text-sm font-semibold bg-purple-600 text-white disabled:opacity-50">{tagBusy ? t('substances.tagWorking') : t('substances.tagApply')}</button>
                  </div>
                </div>
              )}
              {tagStep && tagStep.done != null && <p className="text-xs text-gray-300">{t('substances.tagDone', { count: tagStep.done, name: current.name })}</p>}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">{t('substances.privacyNote')}</p>
    </div>
  );
}
