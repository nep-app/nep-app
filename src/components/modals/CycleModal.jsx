import React, { useEffect } from 'react';
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
  useModalKeyboard(isOpen, onClose, onSubmit);

  // Preencher form quando editando ciclo existente
  useEffect(() => {
    if (editingCycle && isOpen) {
      console.log('🔍 DEBUG USEEFFECT - editingCycle.sleep:', editingCycle.sleep, 'tipo:', typeof editingCycle.sleep);
      setCycleForm({
        bedtime: editingCycle.bedtime || '',
        sleep: editingCycle.sleep || '',
        triggers: editingCycle.triggers || [],
        notes: editingCycle.notes || '',
        lastBefore00: editingCycle.lastBefore00 || false,
        createdAt: editingCycle.timestamp ? editingCycle.timestamp.slice(0, 16) : ''
      });
    }
  }, [editingCycle, isOpen, setCycleForm]);

  if (!isOpen) return null;

  const triggersList = [
    'Stress', 'Ansiedade', 'Solidão', 'Festa', 'Trabalho', 'Família',
    'Hábito', 'Tristeza', 'Dependência', 'Tédio', 'Cansaço', 'Dor física',
    'Insónia', 'Conflito', 'Celebração'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">
            🌙 {editingCycle ? 'Editar Ciclo' : 'Novo Ciclo'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <Icons.X />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto pr-2">
          {!editingCycle && (
            <p className="text-sm text-gray-300">
              Cria um novo ciclo quando acordas. Este registo documenta o período que acabou (desde o último acordar até agora).
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Data e hora de criação do ciclo <span className="text-xs text-gray-400">(opcional - deixa vazio para usar agora)</span>
            </label>
            <input
              type="datetime-local"
              value={cycleForm.createdAt}
              onChange={(e) => setCycleForm({...cycleForm, createdAt: e.target.value})}
              className="bg-gray-700 border-gray-600 text-white w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs mt-1 text-gray-400">
              💡 Usa isto se te esqueceste de criar o ciclo no passado
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Hora a que te deitaste <span className="text-xs text-gray-400">(ciclo anterior)</span>
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
              Horas de sono <span className="text-xs text-gray-400">(última noite)</span>
            </label>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={cycleForm.sleep || ''}
              onChange={(e) => {
                console.log('🔍 DEBUG INPUT SLEEP - e.target.value RAW:', e.target.value, 'tipo:', typeof e.target.value);
                setCycleForm({...cycleForm, sleep: e.target.value});
                console.log('🔍 DEBUG INPUT SLEEP - cycleForm DEPOIS:', {...cycleForm, sleep: e.target.value});
              }}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400"
              placeholder="Ex: 7.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Gatilhos identificados</label>
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
                  <span className="text-sm text-gray-300">{trigger}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Notas sobre este ciclo (opcional)</label>
            <textarea
              value={cycleForm.notes}
              onChange={(e) => setCycleForm({...cycleForm, notes: e.target.value})}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400 h-20"
              placeholder="Como foi o ciclo? O que observaste?"
            />
          </div>
          <div className="bg-green-900/20 border-green-700/50 rounded-lg p-3 border">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cycleForm.lastBefore00}
                onChange={(e) => setCycleForm({...cycleForm, lastBefore00: e.target.checked})}
                className="rounded text-green-600 focus:ring-green-500 w-5 h-5"
              />
              <span className="text-sm font-medium text-green-300">✓ Último consumo do ciclo foi antes da meia-noite (00h)</span>
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
