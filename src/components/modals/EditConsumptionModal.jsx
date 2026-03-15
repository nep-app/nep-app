import React from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../Icons';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

export const EditConsumptionModal = ({
  isOpen,
  onClose,
  editingConsumption,
  setEditingConsumption,
  onSubmit,
  safeDate
}) => {
  const { t } = useTranslation();
  useModalKeyboard(isOpen, onClose, onSubmit);

  if (!isOpen || !editingConsumption) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
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
                value={editingConsumption.timestamp.split('T')[0]}
                onChange={(e) => {
                  const currentDate = safeDate(editingConsumption.timestamp);
                  if (!currentDate) return;
                  const newDate = new Date(e.target.value);
                  newDate.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);
                  setEditingConsumption({...editingConsumption, timestamp: newDate.toISOString(), date: e.target.value});
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
