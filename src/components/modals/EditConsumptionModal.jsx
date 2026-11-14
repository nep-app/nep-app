import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../Icons';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';
import { SubstancePicker } from '../SubstancePicker';
import { IntentionPicker, OutcomeEditor, isOutcomeAskOn, OUTCOME_KEYS } from '../Intention';

// Data LOCAL 'YYYY-MM-DD' (o toISOString dava a data em UTC: um consumo entre
// a meia-noite e a 1h aparecia no dia anterior e, ao gravar, mudava de dia).
const localDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const EditConsumptionModal = ({
  isOpen,
  onClose,
  editingConsumption,
  setEditingConsumption,
  onSubmit,
  safeDate,
  substances = [],
  onAddSubstance,
  customIntentions = []
}) => {
  const { t } = useTranslation();
  useModalKeyboard(isOpen, onClose, onSubmit);
  // Intenção (opcional): fechada por defeito; abre sozinha se o consumo já tem.
  const hasIntent = !!editingConsumption && (
    (Array.isArray(editingConsumption.intentions) && editingConsumption.intentions.length > 0) ||
    (Array.isArray(editingConsumption.how) && editingConsumption.how.length > 0) ||
    OUTCOME_KEYS.includes(editingConsumption.evaluation?.outcome));
  const [intentOpen, setIntentOpen] = useState(hasIntent);
  const editingId = editingConsumption?.id;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setIntentOpen(hasIntent); }, [editingId, isOpen]);
  // "Correu como querias?" só aparece aqui se já foi respondido ou se a
  // pergunta está ligada nas Definições (desligada por defeito).
  const showOutcome = OUTCOME_KEYS.includes(editingConsumption?.evaluation?.outcome) || isOutcomeAskOn();

  if (!isOpen || !editingConsumption) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className='text-xl font-bold text-white'>{t('modals.editConsumption.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icons.X />
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className='block text-sm font-medium mb-1 text-gray-300'>{t('modals.editConsumption.dateLabel')}</label>
              <input
                type="date"
                value={(() => {
                  const d = safeDate(editingConsumption.timestamp);
                  return d ? localDateKey(d) : '';
                })()}
                onChange={(e) => {
                  const currentDate = safeDate(editingConsumption.timestamp);
                  const [y, m, dd] = (e.target.value || '').split('-').map(Number);
                  if (!currentDate || !y || !m || !dd) return;
                  const newDate = new Date(y, m - 1, dd, currentDate.getHours(), currentDate.getMinutes(), 0, 0);
                  setEditingConsumption({...editingConsumption, timestamp: newDate.toISOString(), date: localDateKey(newDate)});
                }}
                className='bg-gray-700 border-gray-600 text-white w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-400'
              />
            </div>
            <div>
              <label className='block text-sm font-medium mb-1 text-gray-300'>{t('modals.editConsumption.timeLabel')}</label>
              <input
                type="time"
                value={(() => {
                  const d = safeDate(editingConsumption.timestamp);
                  return d ? d.toLocaleTimeString('pt-PT', {hour: '2-digit', minute: '2-digit'}) : '00:00';
                })()}
                onChange={(e) => {
                  const currentDate = safeDate(editingConsumption.timestamp);
                  if (!currentDate) return;
                  const [hours, minutes] = e.target.value.split(':');
                  currentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                  setEditingConsumption({...editingConsumption, timestamp: currentDate.toISOString()});
                }}
                className='bg-gray-700 border-gray-600 text-white w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-400'
              />
            </div>
          </div>
          <SubstancePicker
            value={editingConsumption.substances || []}
            onChange={(list) => setEditingConsumption({ ...editingConsumption, substances: list })}
            substances={substances}
            onAddSubstance={onAddSubstance}
          />
          <div className="border border-gray-700 rounded-xl">
            <button
              type="button"
              onClick={() => setIntentOpen(o => !o)}
              aria-expanded={intentOpen}
              className="w-full flex justify-between items-center px-3 py-2.5 text-sm text-gray-300"
            >
              <span>{t('intention.editTitle', 'Intenção')} <span className="text-xs text-gray-500">· {t('intention.optional', 'opcional')}</span></span>
              <span className="text-gray-500" aria-hidden="true">{intentOpen ? '▾' : '▸'}</span>
            </button>
            {intentOpen && (
              <div className="px-3 pb-3 space-y-4">
                <IntentionPicker
                  intentions={editingConsumption.intentions || []}
                  how={editingConsumption.how || []}
                  customOptions={customIntentions}
                  onChange={({ intentions, how }) => setEditingConsumption({ ...editingConsumption, intentions, how })}
                />
                {showOutcome && (
                  <OutcomeEditor
                    evaluation={editingConsumption.evaluation}
                    onChange={(evaluation) => setEditingConsumption({ ...editingConsumption, evaluation })}
                  />
                )}
              </div>
            )}
          </div>
          <div>
            <label className='block text-sm font-medium mb-1 text-gray-300'>{t('modals.editConsumption.notesLabel')}</label>
            <textarea
              value={editingConsumption.notes || ''}
              onChange={(e) => setEditingConsumption({...editingConsumption, notes: e.target.value})}
              className='bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 h-24'
              placeholder={t('modals.editConsumption.notesPlaceholder')}
            />
          </div>
          <button
            onClick={onSubmit}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all font-medium"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
