import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../Icons';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

export const CycleModal = ({
  isOpen,
  onClose,
  editingCycle,
  cycleForm,
  setCycleForm,
  onSubmit
}) => {
  const { t } = useTranslation();
  useModalKeyboard(isOpen, onClose, onSubmit);

  useEffect(() => {
    if (isOpen) {
      if (editingCycle) {
        setCycleForm({
          bedtime: editingCycle.bedtime || '',
          sleep: editingCycle.sleep !== undefined && editingCycle.sleep !== null ? String(editingCycle.sleep) : '',
          triggers: editingCycle.triggers || [],
          notes: editingCycle.notes || '',
          createdAt: editingCycle.timestamp ? editingCycle.timestamp.slice(0, 16) : ''
        });
      } else if (!cycleForm.createdAt) {
        const now = new Date();
        const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
          .toISOString()
          .slice(0, 16);
        setCycleForm(prev => ({ ...prev, createdAt: localDateTime }));
      }
    }
  }, [editingCycle, isOpen, setCycleForm, cycleForm.createdAt]);

  if (!isOpen) return null;

  const triggersList = [
    'Stress', 'Ansiedade', 'Solidão', 'Festa', 'Trabalho', 'Família',
    'Hábito', 'Tristeza', 'Dependência', 'Tédio', 'Cansaço', 'Dor física',
    'Insónia', 'Conflito', 'Celebração'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[90dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">
            🌙 {editingCycle ? t('modals.cycle.editTitle') : t('modals.cycle.newTitle')}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <Icons.X />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto pr-2">
          {!editingCycle && (
            <p className="text-sm text-gray-300">{t('modals.cycle.description')}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t('modals.cycle.dateLabel')} <span className="text-xs text-gray-400">({t('modals.cycle.dateHint')})</span>
            </label>
            <input
              type="datetime-local"
              value={cycleForm.createdAt}
              onChange={(e) => setCycleForm({...cycleForm, createdAt: e.target.value})}
              className="bg-gray-700 border-gray-600 text-white w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs mt-1 text-gray-400">{t('modals.cycle.dateNote')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t('modals.cycle.bedtimeLabel')} <span className="text-xs text-gray-400">({t('modals.cycle.bedtimeHint')})</span>
            </label>
            <input
              type="time"
              value={cycleForm.bedtime}
              onChange={(e) => setCycleForm({...cycleForm, bedtime: e.target.value})}
              className="bg-gray-700 border-gray-600 text-white w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {t('modals.cycle.sleepLabel')} <span className="text-xs text-gray-400">({t('modals.cycle.sleepHint')})</span>
            </label>
            <input
              type="number"
              min="0"
              max="24"
              step="any"
              value={cycleForm.sleep || ''}
              onChange={(e) => setCycleForm({...cycleForm, sleep: e.target.value})}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400"
              placeholder="Ex: 7.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('modals.cycle.triggersLabel')}</label>
            <div className="grid grid-cols-2 gap-2">
              {triggersList.map(trigger => (
                <label key={trigger} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cycleForm.triggers.includes(trigger)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCycleForm({...cycleForm, triggers: [...cycleForm.triggers, trigger]});
                      } else {
                        setCycleForm({...cycleForm, triggers: cycleForm.triggers.filter(t => t !== trigger)});
                      }
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-300">{t('triggers.' + trigger, trigger)}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">{t('modals.cycle.notesLabel')}</label>
            <textarea
              value={cycleForm.notes}
              onChange={(e) => setCycleForm({...cycleForm, notes: e.target.value})}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400 h-20"
              placeholder={t('modals.cycle.notesPlaceholder')}
            />
          </div>
          <button
            onClick={onSubmit}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all font-medium"
          >
            {editingCycle ? t('modals.cycle.submitEdit') : t('modals.cycle.submit')}
          </button>
        </div>
      </div>
    </div>
  );
};
