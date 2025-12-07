import React from 'react';
import * as Icons from '../Icons';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

export const CycleModal = ({
  isOpen,
  onClose,
  darkMode,
  cycleForm,
  setCycleForm,
  onSubmit
}) => {
  useModalKeyboard(isOpen, onClose, onSubmit);

  if (!isOpen) return null;

  const triggersList = [
    'Stress', 'Ansiedade', 'Solidão', 'Festa', 'Trabalho', 'Família',
    'Hábito', 'Tristeza', 'Dependência', 'Tédio', 'Cansaço', 'Dor física',
    'Insónia', 'Conflito', 'Celebração'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className={(darkMode ? 'bg-gray-800' : 'bg-white') + ' rounded-2xl p-6 max-w-md w-full max-h-[90vh] flex flex-col'} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={'text-xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>🌙 Novo Ciclo</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icons.X />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto pr-2">
          <p className={'text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-600') + ''}>
            Cria um novo ciclo quando acordas. Este registo documenta o período que acabou (desde o último acordar até agora).
          </p>
          <div>
            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-1'}>
              Hora a que te deitaste <span className={'text-xs ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>(ciclo anterior)</span>
            </label>
            <input
              type="time"
              value={cycleForm.bedtime}
              onChange={(e) => setCycleForm({...cycleForm, bedtime: e.target.value})}
              className={(darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400'}
            />
          </div>
          <div>
            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-1'}>
              Horas de sono <span className={'text-xs ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>(última noite)</span>
            </label>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={cycleForm.sleep || ''}
              onChange={(e) => setCycleForm({...cycleForm, sleep: e.target.value})}
              className={(darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400'}
              placeholder="Ex: 7.5"
            />
          </div>
          <div>
            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-2'}>Gatilhos identificados</label>
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
                  <span className={'text-sm ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ''}>{trigger}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-1'}>
              Dosagem total consumida (mg) <span className={'text-xs ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>(pesada, dia anterior)</span>
            </label>
            <input
              type="number"
              value={cycleForm.mg || ''}
              onChange={(e) => setCycleForm({...cycleForm, mg: e.target.value})}
              className={(darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400'}
              placeholder="Dosagem total pesada de ontem"
            />
          </div>
          <div>
            <label className={'block text-sm font-medium mb-1 ' + (darkMode ? 'text-gray-300' : 'text-gray-700')}>Notas sobre este ciclo (opcional)</label>
            <textarea
              value={cycleForm.notes}
              onChange={(e) => setCycleForm({...cycleForm, notes: e.target.value})}
              className={(darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400 h-20'}
              placeholder="Como foi o ciclo? O que observaste?"
            />
          </div>
          <div className={(darkMode ? 'bg-green-900/20 border-green-700/50' : 'bg-green-50 border-green-200') + ' rounded-lg p-3 border'}>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cycleForm.lastBefore00}
                onChange={(e) => setCycleForm({...cycleForm, lastBefore00: e.target.checked})}
                className="rounded text-green-600 focus:ring-green-500 w-5 h-5"
              />
              <span className={'text-sm font-medium ' + (darkMode ? 'text-green-300' : 'text-green-800')}>✓ Último consumo do ciclo foi antes da meia-noite (00h)</span>
            </label>
          </div>
          <button
            onClick={onSubmit}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all font-medium"
          >
            Iniciar Novo Ciclo
          </button>
        </div>
      </div>
    </div>
  );
};
