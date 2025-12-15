import React from 'react';
import * as Icons from '../Icons';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

export const DailyLogModal = ({
  isOpen,
  onClose,
  darkMode,
  dailyForm,
  setDailyForm,
  onSubmit
}) => {
  useModalKeyboard(isOpen, onClose, onSubmit);

  if (!isOpen) return null;

  // Calcular data de hoje em formato YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className={(darkMode ? 'bg-gray-800' : 'bg-white') + ' rounded-2xl p-6 max-w-md w-full shadow-2xl'} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={'text-xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>Registar Dosagem do Dia</h3>
          <button onClick={onClose} className={(darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}>
            <Icons.X />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className={'block text-sm font-medium mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Data do registo</label>
            <input
              type="date"
              value={dailyForm.date || today}
              onChange={(e) => setDailyForm({...dailyForm, date: e.target.value})}
              max={today}
              className={(darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400'}
            />
          </div>
          <div>
            <label className={'block text-sm font-medium mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Total aproximado (mg)</label>
            <input
              type="number"
              value={dailyForm.mg}
              onChange={(e) => setDailyForm({...dailyForm, mg: e.target.value})}
              className={(darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400'}
              min="0"
            />
          </div>
          <div>
            <label className={'block text-sm font-medium mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Notas (opcional)</label>
            <textarea
              value={dailyForm.notes}
              onChange={(e) => setDailyForm({...dailyForm, notes: e.target.value})}
              className={(darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 h-20'}
              placeholder="Como te sentiste? Contexto..."
            />
          </div>
          <button
            onClick={onSubmit}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all font-medium shadow-lg"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};
