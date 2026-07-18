import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../Icons';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

export const GoalModal = ({
  isOpen,
  onClose,
  editingGoal,
  goalForm,
  setGoalForm,
  onSubmit
}) => {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState(null);

  const handleSubmit = () => {
    onSubmit();
    setSelectedType(null);
  };

  useModalKeyboard(isOpen, onClose, selectedType ? handleSubmit : null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedType(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const goalOptions = [
    { type: 'reduce_quantity', icon: '📉', label: t('modals.goal.options.reduce_quantity'), unit: t('modals.goal.units.mg') },
    { type: 'reduce_frequency', icon: '🔢', label: t('modals.goal.options.reduce_frequency'), unit: t('modals.goal.units.consumos') },
    { type: 'increase_interval', icon: '⏱️', label: t('modals.goal.options.increase_interval'), unit: t('modals.goal.units.horas') },
    { type: 'first_not_before', icon: '☀️', label: t('modals.goal.options.first_not_before'), unit: t('modals.goal.units.horas') },
    { type: 'limit_last', icon: '🌙', label: t('modals.goal.options.limit_last'), unit: t('modals.goal.units.hora') },
    { type: 'bedtime_before', icon: '🛏️', label: t('modals.goal.options.bedtime_before'), unit: t('modals.goal.units.hora') },
    { type: 'sleep_hours', icon: '😴', label: t('modals.goal.options.sleep_hours'), unit: t('modals.goal.units.horas') }
  ];

  const handleSelectType = (type) => {
    setSelectedType(type);
    setGoalForm({...goalForm, type: type, period: 'daily'});
  };

  const handleBack = () => {
    setSelectedType(null);
  };

  const selectedOption = goalOptions.find(opt => opt.type === selectedType);
  const isTimeType = selectedType === 'limit_last' || selectedType === 'bedtime_before';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {selectedType && (
              <button onClick={handleBack} className="text-gray-400 hover:text-gray-300">
                <Icons.ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h3 className="text-xl font-bold text-white">
              {selectedType ? selectedOption?.label : t('modals.goal.title')}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <Icons.X />
          </button>
        </div>

        {!selectedType ? (
          <div className="space-y-2">
            {goalOptions.map((option) => (
              <button
                key={option.type}
                onClick={() => handleSelectType(option.type)}
                className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600 w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3"
              >
                <span className="text-2xl">{option.icon}</span>
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-gray-400">
                    {t('modals.goal.metaIn', { unit: option.unit })}
                  </div>
                </div>
                <Icons.ChevronRight className="text-gray-400 w-5 h-5" />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {isTimeType ? t('modals.goal.timeLimit') : t('modals.goal.metaUnit', { unit: selectedOption?.unit })}
              </label>
              <input
                type={isTimeType ? 'time' : 'number'}
                value={goalForm.target}
                onChange={(e) => setGoalForm({...goalForm, target: e.target.value})}
                className="bg-gray-700 border-gray-600 text-white w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400"
                placeholder={isTimeType ? '00:00' : `Ex: ${selectedOption?.unit === 'mg' ? '300' : selectedOption?.unit === 'consumos' ? '5' : '2'}`}
                required
              />
            </div>
            <button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium"
            >
              {t('modals.goal.create')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
