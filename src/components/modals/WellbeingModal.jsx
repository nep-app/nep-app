import React from 'react';
import * as Icons from '../Icons';
import { EMOTIONS_LIST } from '../../constants/emotions';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

export const WellbeingModal = ({
  isOpen,
  onClose,
  darkMode,
  wellbeingForm,
  setWellbeingForm,
  onSubmit,
  wellbeingLogs = [],
  currentCycleId = null
}) => {
  useModalKeyboard(isOpen, onClose, onSubmit);

  if (!isOpen) return null;

  // Verificar se já existe registo de autocuidado neste ciclo
  const cycleLogs = currentCycleId
    ? wellbeingLogs.filter(log => log.cycleId === currentCycleId)
    : [];
  const alreadyChecked = {
    water: cycleLogs.some(log => log.water === true),
    rest: cycleLogs.some(log => log.rest === true),
    social: cycleLogs.some(log => log.social === true),
    food: cycleLogs.some(log => log.food === true)
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={'text-xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>Check-in Bem-Estar</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icons.X />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-2'}>Humor: {wellbeingForm.mood}/10</label>
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
            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-2'}>Energia: {wellbeingForm.energy}/10</label>
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
            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-2'}>Autocuidado hoje</label>
            <div className="space-y-2">
              <label className={'flex items-center space-x-2 ' + (alreadyChecked.water ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
                <input
                  type="checkbox"
                  checked={wellbeingForm.water || alreadyChecked.water}
                  onChange={(e) => setWellbeingForm({...wellbeingForm, water: e.target.checked})}
                  disabled={alreadyChecked.water}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className={'text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ''}>{alreadyChecked.water ? '✓ ' : ''}💧 Bebi água suficiente</span>
              </label>
              <label className={'flex items-center space-x-2 ' + (alreadyChecked.rest ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
                <input
                  type="checkbox"
                  checked={wellbeingForm.rest || alreadyChecked.rest}
                  onChange={(e) => setWellbeingForm({...wellbeingForm, rest: e.target.checked})}
                  disabled={alreadyChecked.rest}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className={'text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ''}>{alreadyChecked.rest ? '✓ ' : ''}😴 Descansei o suficiente</span>
              </label>
              <label className={'flex items-center space-x-2 ' + (alreadyChecked.social ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
                <input
                  type="checkbox"
                  checked={wellbeingForm.social || alreadyChecked.social}
                  onChange={(e) => setWellbeingForm({...wellbeingForm, social: e.target.checked})}
                  disabled={alreadyChecked.social}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className={'text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ''}>{alreadyChecked.social ? '✓ ' : ''}👥 Tive contacto social</span>
              </label>
              <label className={'flex items-center space-x-2 ' + (alreadyChecked.food ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
                <input
                  type="checkbox"
                  checked={wellbeingForm.food || alreadyChecked.food}
                  onChange={(e) => setWellbeingForm({...wellbeingForm, food: e.target.checked})}
                  disabled={alreadyChecked.food}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className={'text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ''}>{alreadyChecked.food ? '✓ ' : ''}🍽️ Comi refeições nutritivas</span>
              </label>
            </div>
          </div>
          <div>
            <label className={'block text-sm font-medium mb-2 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Emoções do dia (opcional)</label>
            <div className="grid grid-cols-2 gap-2">
              {EMOTIONS_LIST.map(emotion => (
                <label key={emotion} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wellbeingForm.emotions.includes(emotion)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setWellbeingForm({...wellbeingForm, emotions: [...wellbeingForm.emotions, emotion]});
                      } else {
                        setWellbeingForm({...wellbeingForm, emotions: wellbeingForm.emotions.filter(em => em !== emotion)});
                      }
                    }}
                    className="rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className={'text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>{emotion}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-1'}>Notas (opcional)</label>
            <textarea
              value={wellbeingForm.notes}
              onChange={(e) => setWellbeingForm({...wellbeingForm, notes: e.target.value})}
              className={(darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 h-20'}
              placeholder="Como te sentes hoje?"
            />
          </div>
          <button
            onClick={onSubmit}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all font-medium"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};
