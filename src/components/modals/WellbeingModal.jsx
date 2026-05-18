import React, { useState, useEffect, useMemo } from 'react';
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

  const selectedDate = wellbeingForm.datetime
    ? wellbeingForm.datetime.split('T')[0]
    : getTodayKey();

  const selectedDateLogs = wellbeingLogs.filter(log => log.date === selectedDate && log.id !== editingId);

  const alreadyChecked = {
    social: selectedDateLogs.some(log => log.social === true),
    food: selectedDateLogs.some(log => log.food === true)
  };

  // Accumulated today values (shown as read-only context)
  const todayWater = selectedDateLogs.reduce((sum, l) => sum + (l.waterGlasses || 0), 0);
  const todayExercises = selectedDateLogs
    .filter(l => l.exerciseType)
    .map(l => `${l.exerciseType}${l.exerciseDuration ? ` · ${l.exerciseDuration}min` : ''}`);
  const todaySymptomsList = [...new Set(
    selectedDateLogs.flatMap(l => [
      ...(l.symptoms || []),
      ...(l.customSymptom ? [l.customSymptom] : [])
    ]).filter(Boolean)
  )];

  // Past symptoms for autocomplete (from all wellbeing logs)
  const allPastSymptoms = useMemo(() => {
    const set = new Set();
    wellbeingLogs.forEach(log => {
      (log.symptoms || []).forEach(s => s && set.add(s.trim().toLowerCase()));
      if (log.customSymptom) set.add(log.customSymptom.trim().toLowerCase());
    });
    return [...set].sort();
  }, [wellbeingLogs]);

  // Past exercise types for autocomplete
  const allPastExerciseTypes = useMemo(() => {
    const set = new Set();
    wellbeingLogs.forEach(log => {
      if (log.exerciseType) set.add(log.exerciseType.trim().toLowerCase());
      if (log.exercise && log.exercise.trim()) set.add(log.exercise.trim().toLowerCase());
    });
    return [...set].sort();
  }, [wellbeingLogs]);

  useEffect(() => {
    if (!isOpen) return;
    setSymptomInput('');
    if (selectedDateLogs.length === 0) return;
    const existing = [...selectedDateLogs].sort((a, b) =>
      new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)
    )[0];
    setWellbeingForm(prev => ({
      ...prev,
      mood: existing.mood ?? prev.mood,
      energy: existing.energy ?? prev.energy,
      sleep: existing.sleep ?? prev.sleep,
      notes: existing.notes || prev.notes,
      // Only pre-populate water/exercise/symptoms when editing a specific entry
      ...(editingId ? {
        waterGlasses: existing.waterGlasses ?? prev.waterGlasses,
        exerciseType: existing.exerciseType || prev.exerciseType,
        exerciseDuration: existing.exerciseDuration || prev.exerciseDuration,
        napDuration: existing.napDuration || prev.napDuration,
        symptoms: existing.symptoms || prev.symptoms,
        customSymptom: existing.customSymptom || prev.customSymptom,
      } : {})
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, isOpen]);

  const addSymptom = () => {
    const s = symptomInput.trim().toLowerCase();
    if (!s) return;
    const current = wellbeingForm.symptoms || [];
    if (!current.map(x => x.toLowerCase()).includes(s)) {
      setWellbeingForm({ ...wellbeingForm, symptoms: [...current, s] });
    }
    setSymptomInput('');
  };

  const removeSymptom = (idx) => {
    const next = (wellbeingForm.symptoms || []).filter((_, i) => i !== idx);
    setWellbeingForm({ ...wellbeingForm, symptoms: next });
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  if (!isOpen) return null;

  const hasTodayContext = todayWater > 0 || todayExercises.length > 0 || todaySymptomsList.length > 0;

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

            {/* Today's accumulated context */}
            {hasTodayContext && (
              <div className="bg-gray-700/40 border border-gray-600/30 rounded-lg p-2.5 mb-3 space-y-1">
                <div className="text-xs text-gray-400 font-medium">Hoje já registaste:</div>
                {todayWater > 0 && (
                  <div className="text-xs text-blue-300">💧 {todayWater}ml de água</div>
                )}
                {todayExercises.map((e, i) => (
                  <div key={i} className="text-xs text-green-300">🏃 {e}</div>
                ))}
                {todaySymptomsList.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center pt-0.5">
                    <span className="text-xs text-teal-400">🩺</span>
                    {todaySymptomsList.map((s, i) => (
                      <span key={i} className="text-xs bg-teal-800/40 text-teal-300 px-1.5 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              {/* Water stepper */}
              <div>
                <span className="text-sm text-gray-300 block mb-1.5">
                  💧 {t('modals.wellbeing.water')}
                  {(wellbeingForm.waterGlasses > 0) && <span className="ml-2 text-xs text-teal-400 font-medium">✓ {wellbeingForm.waterGlasses}ml</span>}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setWellbeingForm({...wellbeingForm, waterGlasses: Math.max(0, (wellbeingForm.waterGlasses || 0) - 250)})}
                    className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center text-lg font-bold leading-none"
                  >−</button>
                  <span className="text-white font-semibold min-w-[4rem] text-center text-sm">
                    {wellbeingForm.waterGlasses || 0}ml
                  </span>
                  <button
                    type="button"
                    onClick={() => setWellbeingForm({...wellbeingForm, waterGlasses: (wellbeingForm.waterGlasses || 0) + 250})}
                    className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center text-lg font-bold leading-none"
                  >+</button>
                </div>
              </div>

              {/* Exercise: type + duration */}
              <div>
                <label className="text-sm text-gray-300 block mb-1.5">
                  🏃 {t('modals.wellbeing.rest')} <span className="text-gray-500 text-xs">(opcional)</span>
                  {(wellbeingForm.exerciseType || wellbeingForm.exerciseDuration) && <span className="ml-2 text-xs text-teal-400 font-medium">✓{wellbeingForm.exerciseType ? ` ${wellbeingForm.exerciseType}` : ''}{wellbeingForm.exerciseDuration ? ` · ${wellbeingForm.exerciseDuration}min` : ''}</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    list="exercise-suggestions"
                    type="text"
                    value={wellbeingForm.exerciseType || ''}
                    onChange={(e) => setWellbeingForm({...wellbeingForm, exerciseType: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-400 text-sm"
                    placeholder="O quê? ex: caminhar"
                  />
                  <datalist id="exercise-suggestions">
                    {allPastExerciseTypes.map(t => <option key={t} value={t} />)}
                  </datalist>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="600"
                      value={wellbeingForm.exerciseDuration || ''}
                      onChange={(e) => setWellbeingForm({...wellbeingForm, exerciseDuration: e.target.value ? parseInt(e.target.value) : ''})}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-16 p-2 border rounded-lg focus:ring-2 focus:ring-blue-400 text-sm text-center"
                      placeholder="min"
                    />
                    <span className="text-gray-400 text-xs">min</span>
                  </div>
                </div>
              </div>

              {/* Nap */}
              <div>
                <label className="text-sm text-gray-300 block mb-1.5">
                  🛌 Sesta <span className="text-gray-500 text-xs">(opcional)</span>
                  {(wellbeingForm.napDuration > 0) && <span className="ml-2 text-xs text-teal-400 font-medium">✓ {wellbeingForm.napDuration}min</span>}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="600"
                    value={wellbeingForm.napDuration || ''}
                    onChange={(e) => setWellbeingForm({...wellbeingForm, napDuration: e.target.value ? parseInt(e.target.value) : ''})}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-20 p-2 border rounded-lg focus:ring-2 focus:ring-blue-400 text-sm text-center"
                    placeholder="0"
                  />
                  <span className="text-gray-400 text-xs">min</span>
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

              {/* Symptoms — free text with autocomplete */}
              <div>
                <label className="text-sm text-gray-300 block mb-1.5">
                  🩺 Sintomas de saúde <span className="text-gray-500 text-xs">(opcional)</span>
                  {(wellbeingForm.symptoms || []).length > 0 && (
                    <span className="ml-2 text-xs text-teal-400 font-medium">✓ {(wellbeingForm.symptoms || []).length}</span>
                  )}
                </label>
                {/* Current session chips */}
                {(wellbeingForm.symptoms || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(wellbeingForm.symptoms || []).map((s, i) => (
                      <span key={i} className="bg-teal-600 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                        {s}
                        <button type="button" onClick={() => removeSymptom(i)} className="text-teal-200 hover:text-white leading-none ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    list="symptom-suggestions"
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { addSymptom(); e.preventDefault(); } }}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-teal-400 text-sm"
                    placeholder="Escreve um sintoma e pressiona Enter..."
                  />
                  <datalist id="symptom-suggestions">
                    {allPastSymptoms.map(s => <option key={s} value={s} />)}
                  </datalist>
                  <button
                    type="button"
                    onClick={addSymptom}
                    className="bg-teal-600 hover:bg-teal-500 text-white px-3 rounded-lg text-sm font-medium transition-colors"
                  >+</button>
                </div>
              </div>
            </div>
          </div>

          {/* Dia atípico */}
          <div className="border border-yellow-700/40 bg-yellow-900/10 rounded-lg p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={wellbeingForm.isAtypical || false}
                onChange={(e) => setWellbeingForm({...wellbeingForm, isAtypical: e.target.checked, atypicalReason: e.target.checked ? wellbeingForm.atypicalReason : ''})}
                className="rounded focus:ring-yellow-400 w-4 h-4"
              />
              <span className="text-sm font-medium text-yellow-300">📌 Dia atípico</span>
            </label>
            {wellbeingForm.isAtypical && (
              <input
                type="text"
                value={wellbeingForm.atypicalReason || ''}
                onChange={(e) => setWellbeingForm({...wellbeingForm, atypicalReason: e.target.value})}
                className="mt-2 bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-yellow-400"
                placeholder="Razão (opcional) — ex: festa, viagem, doença..."
                maxLength={100}
              />
            )}
            <p className="text-xs text-yellow-600/80 mt-1.5">Dias atípicos são excluídos dos cálculos de metas e análises.</p>
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
