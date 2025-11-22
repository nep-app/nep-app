import React, { useState, useEffect } from 'react';
import * as Icons from '../Icons';

export const GoalModal = ({
  isOpen,
  onClose,
  darkMode,
  editingGoal,
  goalForm,
  setGoalForm,
  onSubmit
}) => {
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedType(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const goalOptions = [
    { type: 'reduce_quantity', icon: '📉', label: 'Reduzir quantidade diária', unit: 'mg' },
    { type: 'reduce_frequency', icon: '🔢', label: 'Reduzir frequência diária', unit: 'consumos' },
    { type: 'increase_interval', icon: '⏱️', label: 'Definir intervalo de consumo mínimo', unit: 'horas' },
    { type: 'limit_last', icon: '🌙', label: 'Definir horário de último consumo', unit: 'hora' },
    { type: 'bedtime_before', icon: '🛏️', label: 'Definir hora de ir deitar', unit: 'hora' },
    { type: 'sleep_hours', icon: '😴', label: 'Definir horas de sono diárias', unit: 'horas' }
  ];

  const handleSelectType = (type) => {
    setSelectedType(type);
    setGoalForm({...goalForm, type: type, period: 'daily'});
  };

  const handleBack = () => {
    setSelectedType(null);
  };

  const handleSubmit = () => {
    onSubmit();
    setSelectedType(null);
  };

  const selectedOption = goalOptions.find(opt => opt.type === selectedType);
  const isTimeType = selectedType === 'limit_last' || selectedType === 'bedtime_before';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className={(darkMode ? 'bg-gray-800' : 'bg-white') + ' rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto'} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {selectedType && (
              <button onClick={handleBack} className={(darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}>
                <Icons.ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h3 className={'text-xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>
              {selectedType ? selectedOption?.label : 'Escolher Meta'}
            </h3>
          </div>
          <button onClick={onClose} className={(darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600')}>
            <Icons.X />
          </button>
        </div>

        {!selectedType ? (
          <div className="space-y-2">
            {goalOptions.map((option) => (
              <button
                key={option.type}
                onClick={() => handleSelectType(option.type)}
                className={(darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' : 'bg-white hover:bg-gray-50 text-gray-800 border-gray-200') + ' w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3'}
              >
                <span className="text-2xl">{option.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  <div className={'text-xs ' + (darkMode ? 'text-gray-400' : 'text-gray-500')}>
                    Meta em {option.unit}
                  </div>
                </div>
                <Icons.ChevronRight className={(darkMode ? 'text-gray-400' : 'text-gray-400') + ' w-5 h-5'} />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-1'}>
                {isTimeType ? 'Hora limite' : `Meta (${selectedOption?.unit})`}
              </label>
              <input
                type={isTimeType ? 'time' : 'number'}
                value={goalForm.target}
                onChange={(e) => setGoalForm({...goalForm, target: e.target.value})}
                className={(darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400'}
                placeholder={isTimeType ? '00:00' : `Ex: ${selectedOption?.unit === 'mg' ? '300' : selectedOption?.unit === 'consumos' ? '5' : '2'}`}
                required
              />
            </div>
            <div>
              <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-1'}>Prazo</label>
              <input
                type="date"
                value={goalForm.deadline}
                onChange={(e) => setGoalForm({...goalForm, deadline: e.target.value})}
                className={(darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400'}
                required
              />
            </div>
            <button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium"
            >
              Criar Meta
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
