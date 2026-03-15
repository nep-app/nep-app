import React from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../Icons';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';
import { getTodayKey } from '../../utils/helpers';

export const WellbeingModal = ({
  isOpen,
  onClose,
  wellbeingForm,
  setWellbeingForm,
  onSubmit,
  wellbeingLogs = []
}) => {
  const { t } = useTranslation();
  useModalKeyboard(isOpen, onClose, onSubmit);

  if (!isOpen) return null;

  // Verificar se já existe registo de autocuidado hoje
  const today = getTodayKey();
  const todayLogs = wellbeingLogs.filter(log => log.date === today);
  const alreadyChecked = {
    water: todayLogs.some(log => log.water === true),
    rest: todayLogs.some(log => log.rest === true),
    social: todayLogs.some(log => log.social === true),
    food: todayLogs.some(log => log.food === true)
  };

  // Get current datetime for default value (formato: YYYY-MM-DDTHH:mm)
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">{t('modals.wellbeing.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <Icons.X />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('modals.wellbeing.dateLabel')}</label>
            <input
              type="datetime-local"
              value={wellbeingForm.datetime || getCurrentDateTime()}
              onChange={(e) => setWellbeingForm({...wellbeingForm, datetime: e.target.value})}
              className="bg-gray-700 border-gray-600 text-white w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('modals.wellbeing.moodLabel', { value: wellbeingForm.mood })}</label>
            <input
              type="range"
              min="1"
              max="10"
              value={wellbeingForm.mood}
              onChange={(e) => setWellbeingForm({...wellbeingForm, mood: e.target.value})}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('modals.wellbeing.energyLabel', { value: wellbeingForm.energy })}</label>
            <input
              type="range"
              min="1"
              max="10"
              value={wellbeingForm.energy}
              onChange={(e) => setWellbeingForm({...wellbeingForm, energy: e.target.value})}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('modals.wellbeing.selfcareLabel')}</label>
            <div className="space-y-2">
              <label className={'flex items-center space-x-2 ' + (alreadyChecked.water ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
                <input
                  type="checkbox"
                  checked={wellbeingForm.water || alreadyChecked.water}
                  onChange={(e) => setWellbeingForm({...wellbeingForm, water: e.target.checked})}
                  disabled={alreadyChecked.water}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">{alreadyChecked.water ? '✓ ' : ''}{t('modals.wellbeing.water')}</span>
              </label>
              <label className={'flex items-center space-x-2 ' + (alreadyChecked.rest ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
                <input
                  type="checkbox"
                  checked={wellbeingForm.rest || alreadyChecked.rest}
                  onChange={(e) => setWellbeingForm({...wellbeingForm, rest: e.target.checked})}
                  disabled={alreadyChecked.rest}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">{alreadyChecked.rest ? '✓ ' : ''}{t('modals.wellbeing.rest')}</span>
              </label>
              <label className={'flex items-center space-x-2 ' + (alreadyChecked.social ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
                <input
                  type="checkbox"
                  checked={wellbeingForm.social || alreadyChecked.social}
                  onChange={(e) => setWellbeingForm({...wellbeingForm, social: e.target.checked})}
                  disabled={alreadyChecked.social}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">{alreadyChecked.social ? '✓ ' : ''}{t('modals.wellbeing.social')}</span>
              </label>
              <label className={'flex items-center space-x-2 ' + (alreadyChecked.food ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
                <input
                  type="checkbox"
                  checked={wellbeingForm.food || alreadyChecked.food}
                  onChange={(e) => setWellbeingForm({...wellbeingForm, food: e.target.checked})}
                  disabled={alreadyChecked.food}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">{alreadyChecked.food ? '✓ ' : ''}{t('modals.wellbeing.food')}</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t('modals.wellbeing.notesLabel')}</label>
            <textarea
              value={wellbeingForm.notes}
              onChange={(e) => setWellbeingForm({...wellbeingForm, notes: e.target.value})}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 h-20"
              placeholder={t('modals.wellbeing.notesPlaceholder')}
            />
          </div>
          <button
            onClick={onSubmit}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all font-medium"
          >
            {t('modals.wellbeing.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
