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
  onSubmit,
  goals = [],
  onDelete,
  onEdit,
  onClearEdit
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

  // Abrir uma meta existente para EDITAR (prefill + mostrar o formulário do valor).
  const handleEditGoal = (g) => {
    if (onEdit) onEdit(g);
    setSelectedType(g.type);
  };

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
    if (onClearEdit) onClearEdit(); // sair do modo edição sem gravar
  };

  const selectedOption = goalOptions.find(opt => opt.type === selectedType);
  const isTimeType = selectedType === 'limit_last' || selectedType === 'bedtime_before';

  // Como mostrar o valor de uma meta já definida (hora tal-e-tal, ou número + unidade)
  const goalValueLabel = (g, opt) => {
    const timeType = g.type === 'limit_last' || g.type === 'bedtime_before';
    if (timeType) return g.target; // já é "HH:MM"
    return `${g.target} ${opt?.unit || ''}`.trim();
  };

  // Mostrar só UMA meta por tipo — a mais recente (é a que a app usa de facto).
  // Evita a lista com duplicados quando há várias metas do mesmo tipo no histórico.
  const activeGoals = (() => {
    const byType = {};
    for (const g of (goals || [])) {
      if (!byType[g.type] || new Date(g.createdAt || 0) > new Date(byType[g.type].createdAt || 0)) {
        byType[g.type] = g;
      }
    }
    return Object.values(byType);
  })();

  // Apagar remove TODAS as metas desse tipo (incl. duplicados antigos), para não
  // ficar um "zombie" a reaparecer depois de apagar a ativa.
  const deleteGoalType = (type) => {
    (goals || []).filter(x => x.type === type).forEach(x => onDelete && onDelete(x.id));
  };

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
          <div className="space-y-5">
            {/* Metas atuais — tocar para editar, caixote para apagar */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-300">{t('modals.goal.current')}</div>
              {activeGoals.length > 0 ? (
                <>
                  {activeGoals.map((g) => {
                    const opt = goalOptions.find(o => o.type === g.type);
                    return (
                      <div
                        key={g.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleEditGoal(g)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleEditGoal(g); } }}
                        className="flex items-center gap-3 bg-gray-700/60 border border-gray-600 rounded-xl p-3 cursor-pointer hover:border-purple-500/60 hover:bg-gray-700 transition-all focus:outline-none focus:ring-2 focus:ring-purple-400"
                      >
                        <span className="text-2xl" aria-hidden="true">{opt?.icon || '🎯'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-sm">{opt?.label || g.type}</div>
                          <div className="text-xs text-purple-300">{goalValueLabel(g, opt)}</div>
                        </div>
                        <Icons.Edit className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
                        {onDelete && (
                          <button
                            aria-label={t('a11y.delete')}
                            onClick={(e) => { e.stopPropagation(); deleteGoalType(g.type); }}
                            className="text-red-400 hover:text-red-300 p-1 flex-shrink-0"
                          >
                            <Icons.Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <p className="text-xs text-gray-500">{t('modals.goal.editHint')}</p>
                </>
              ) : (
                <p className="text-sm text-gray-400">{t('modals.goal.none')}</p>
              )}
            </div>

            {/* Definir nova meta — só os tipos que ainda não existem (evita duplicados) */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-gray-300">{t('modals.goal.addNew')}</div>
              {(() => {
                const available = goalOptions.filter(o => !goals.some(g => g.type === o.type));
                if (available.length === 0) {
                  return <p className="text-sm text-gray-400">{t('modals.goal.allSet')}</p>;
                }
                return available.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => handleSelectType(option.type)}
                    className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600 w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3"
                  >
                    <span className="text-2xl" aria-hidden="true">{option.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-400">
                        {t('modals.goal.metaIn', { unit: option.unit })}
                      </div>
                    </div>
                    <Icons.ChevronRight className="text-gray-400 w-5 h-5" aria-hidden="true" />
                  </button>
                ));
              })()}
            </div>
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
              {editingGoal ? t('common.save') : t('modals.goal.create')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
