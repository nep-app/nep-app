import React, { useEffect, useState } from 'react';
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
  wellbeingLogs = [],
  editingId = null
}) => {
  const { t } = useTranslation();
  const [symptomInput, setSymptomInput] = useState('');
  useModalKeyboard(isOpen, onClose, onSubmit);

  // Derive selected date from form datetime (fallback to today)
  const selectedDate = wellbeingForm.datetime
    ? wellbeingForm.datetime.split('T')[0]
    : getTodayKey();

  // Existing logs for the selected date, excluding the one being edited
  const selectedDateLogs = wellbeingLogs.filter(log => log.date === selectedDate && log.id !== editingId);

  const alreadyChecked = {
    social: selectedDateLogs.some(log => log.social === true),
    food: selectedDateLogs.some(log => log.food === true)
  };

  // When date changes, pre-populate form with most recent existing log for that date
  useEffect(() => {
    if (!isOpen) return;
    if (selectedDateLogs.length === 0) return;
    const existing = [...selectedDateLogs].sort((a, b) =>
      new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)
    )[0];
    setWellbeingForm(prev => ({
      ...prev,
      mood: existing.mood ?? prev.mood,
      energy: existing.energy ?? prev.energy,
      sleep: existing.sleep ?? prev.sleep,
      waterMl: existing.waterMl ?? (existing.waterGlasses ? existing.waterGlasses * 250 : prev.waterMl),
      notes: existing.notes || prev.notes,
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, isOpen]);

  // Reset symptom input when modal closes
  useEffect(() => {
    if (!isOpen) setSymptomInput('');
  }, [isOpen]);

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

  const waterMl = wellbeingForm.waterMl || 0;
  const waterDisplay = waterMl >= 1000
    ? `${(waterMl / 1000).toFixed(waterMl % 1000 === 0 ? 0 : 1)}L`
    : `${waterMl}ml`;

  const addSymptom = () => {
    const s = symptomInput.trim();
    if (!s) return;
    const current = wellbeingForm.symptoms || [];
    if (!current.includes(s)) {
      setWellbeingForm({...wellbeingForm, symptoms: [...current, s]});
    }
    setSymptomInput('');
  };

  const removeSymptom = (idx) => {
    const updated = (wellbeingForm.symptoms || []).filter((_, i) => i !== idx);
    setWellbeingForm({...wellbeingForm, symptoms: updated});
  };

  if (!isOpen) return null;

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

          {/* Autocuidado */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('modals.wellbeing.selfcareLabel')}</label>
            <div className="space-y-3">

              {/* Water stepper in ml */}
              <div>
                <span className="text-sm text-gray-300 block mb-1.5">💧 {t('modals.wellbeing.water')}</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setWellbeingForm({...wellbeingForm, waterMl: Math.max(0, waterMl - 250)})}
                    className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center text-lg font-bold leading-none"
                  >−</button>
                  <span className="text-white font-semibold min-w-[4rem] text-center text-sm">
                    {waterDisplay}
                  </span>
                  <button
                    type="button"
                    onClick={() => setWellbeingForm({...wellbeingForm, waterMl: waterMl + 250})}
                    className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center text-lg font-bold leading-none"
                  >+</button>
                  <span className="text-xs text-gray-500">+250ml</span>
                </div>
              </div>

              {/* Exercise: type + minutes */}
              <div>
                <label className="text-sm text-gray-300 block mb-1.5">🏃 {t('modals.wellbeing.rest')} <span className="text-gray-500 text-xs">(opcional)</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={wellbeingForm.exerciseType || ''}
                    onChange={(e) => setWellbeingForm({...wellbeingForm, exerciseType: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-400 text-sm"
                    placeholder="Ex: caminhar, yoga..."
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={wellbeingForm.exerciseMinutes || ''}
                      onChange={(e) => setWellbeingForm({...wellbeingForm, exerciseMinutes: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-16 p-2 border rounded-lg focus:ring-2 focus:ring-blue-400 text-sm text-center"
                      placeholder="min"
                    />
                    <span className="text-xs text-gray-500">min</span>
                  </div>
                </div>
              </div>

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

          {/* Sintomas de saúde */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">🩺 Sintomas de saúde <span className="text-gray-500 text-xs">(opcional)</span></label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSymptom(); } }}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-rose-400 text-sm"
                placeholder="Ex: ansiedade, retenção de líquidos..."
              />
              <button
                type="button"
                onClick={addSymptom}
                className="px-3 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-sm font-medium"
              >+</button>
            </div>
            {(wellbeingForm.symptoms || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(wellbeingForm.symptoms || []).map((s, i) => (
                  <span key={i} className="flex items-center gap-1 bg-rose-900/40 border border-rose-700/50 text-rose-300 text-xs px-2 py-1 rounded-full">
                    {s}
                    <button type="button" onClick={() => removeSymptom(i)} className="opacity-60 hover:opacity-100 leading-none">✕</button>
                  </span>
                ))}
              </div>
            )}
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
