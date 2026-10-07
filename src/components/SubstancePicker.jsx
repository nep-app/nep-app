import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { sortSubstances, sameName, cleanName, MAX_NAME, MAX_AMOUNT } from '../utils/substances';

// Escolher o que foi num consumo: toca-se nas substâncias da lista (pode ser
// mais do que uma) e, se se quiser, escreve-se a quantidade de cada uma.
// Usado ao editar um registo e no "consumo de outra hora" — nunca no botão
// de registo rápido, que tem de continuar a ser um toque só.
export function SubstancePicker({ value = [], onChange, substances = [], onAddSubstance }) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const list = sortSubstances(substances);
  const isOn = (name) => value.some(e => sameName(e.name, name));
  // Nomes que estão no registo mas já não estão na lista (ex.: tirados nas
  // Definições) continuam a aparecer, para não se perderem ao gravar.
  const extra = value.filter(e => !list.some(s => sameName(s.name, e.name)));

  const toggle = (name) => {
    onChange(isOn(name) ? value.filter(e => !sameName(e.name, name)) : [...value, { name }]);
  };
  const setAmount = (name, amount) => {
    onChange(value.map(e => (sameName(e.name, name) ? { ...e, amount } : e)));
  };
  const addNew = async () => {
    const name = cleanName(newName);
    if (!name) return;
    if (!isOn(name)) onChange([...value, { name }]);
    if (onAddSubstance && !list.some(s => sameName(s.name, name))) {
      try { await onAddSubstance(name); } catch { /* fica só neste registo */ }
    }
    setNewName('');
    setAdding(false);
  };

  const chip = (name, on) => (
    <button
      key={name}
      type="button"
      onClick={() => toggle(name)}
      aria-pressed={on}
      className={'px-3 py-1.5 rounded-full text-sm border transition-colors ' +
        (on ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600')}
    >
      {on ? '✓ ' : ''}{name}
    </button>
  );

  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-300">{t('substances.pickerLabel')}</label>
      {list.length === 0 && extra.length === 0 && (
        <p className="text-xs text-gray-400 mb-2">{t('substances.pickerEmpty')}</p>
      )}
      <div className="flex flex-wrap gap-2 mb-2">
        {list.map(s => chip(s.name, isOn(s.name)))}
        {extra.map(e => chip(e.name, true))}
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 rounded-full text-sm border border-dashed border-gray-500 text-gray-300 hover:bg-gray-700"
          >
            + {t('substances.addOther')}
          </button>
        )}
      </div>

      {adding && (
        <div className="flex gap-2 mb-2">
          <input
            autoFocus
            value={newName}
            maxLength={MAX_NAME}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); addNew(); } }}
            placeholder={t('substances.namePlaceholder')}
            aria-label={t('substances.namePlaceholder')}
            className="flex-1 min-w-0 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 p-2 rounded-lg focus:ring-2 focus:ring-purple-400"
          />
          <button type="button" onClick={addNew} className="px-3 rounded-lg bg-purple-600 text-white text-sm font-medium">
            {t('substances.add')}
          </button>
        </div>
      )}

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map(e => (
            <div key={e.name} className="flex items-center gap-2">
              <span className="text-sm text-gray-200 flex-1 min-w-0 truncate">{e.name}</span>
              <input
                value={e.amount || ''}
                maxLength={MAX_AMOUNT}
                onChange={(ev) => setAmount(e.name, ev.target.value)}
                onKeyDown={(ev) => { if (ev.key === 'Enter') ev.stopPropagation(); }}
                placeholder={t('substances.amountPlaceholder')}
                aria-label={t('substances.amountLabel', { name: e.name })}
                className="w-32 bg-gray-700 border border-gray-600 text-white placeholder-gray-500 p-1.5 text-sm rounded-lg focus:ring-2 focus:ring-purple-400"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
