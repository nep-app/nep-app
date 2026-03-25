import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';

export function BagWeightEntry({ onClose, showToast }) {
  const { t } = useTranslation();
  const { addConsumption, consumptions } = useData();
  const { darkMode } = useUI();

  const [weightBefore, setWeightBefore] = useState('');
  const [weightAfter, setWeightAfter] = useState('');
  const [loading, setLoading] = useState(false);

  const before = parseFloat(weightBefore);
  const after = parseFloat(weightAfter);
  const hasValues = weightBefore !== '' && weightAfter !== '';
  const isNegative = hasValues && after >= before;
  const mgConsumed = hasValues && !isNegative ? Math.round((before - after) * 1000) : null;

  const todayMg = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return consumptions
      .filter(c => c.method === 'bagWeight' && c.date === today && c.amount > 0)
      .reduce((sum, c) => sum + (c.amount || 0), 0);
  }, [consumptions]);

  const avgMgPerConsumption = useMemo(() => {
    const weighted = consumptions.filter(c => c.method === 'bagWeight' && c.amount > 0);
    if (weighted.length === 0) return null;
    const total = weighted.reduce((sum, c) => sum + (c.amount || 0), 0);
    return Math.round(total / weighted.length);
  }, [consumptions]);

  const handleSubmit = async () => {
    if (!mgConsumed || mgConsumed <= 0) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await addConsumption({
        timestamp: new Date().toISOString(),
        date: today,
        amount: mgConsumed,
        unit: 'mg',
        method: 'bagWeight',
        weightBefore: before,
        weightAfter: after,
        notes: `${t('home.bagWeightNote')}: ${weightBefore}g → ${weightAfter}g`
      });
      showToast && showToast(`✓ ${mgConsumed} mg ${t('home.bagWeightRegistered')}`, 'success');
      setWeightBefore('');
      setWeightAfter('');
      onClose();
    } catch (err) {
      showToast && showToast(`✗ ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const base = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const label = darkMode ? 'text-gray-400' : 'text-gray-500';
  const input = darkMode
    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-rose-500'
    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-rose-500';

  return (
    <div className={`rounded-xl border p-4 ${base} shadow-md`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚖️</span>
          <span className={`font-semibold text-sm ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
            {t('home.bagWeight')}
          </span>
        </div>
        <button onClick={onClose} className={`text-xs px-2 py-1 rounded ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className={`block text-xs mb-1 ${label}`}>{t('home.bagWeightBefore')}</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={weightBefore}
            onChange={e => setWeightBefore(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${input}`}
          />
        </div>
        <div>
          <label className={`block text-xs mb-1 ${label}`}>{t('home.bagWeightAfter')}</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={weightAfter}
            onChange={e => setWeightAfter(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${input}`}
          />
        </div>
      </div>

      {hasValues && (
        <div className={`rounded-lg px-3 py-2 mb-3 text-sm font-medium text-center ${
          isNegative
            ? (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600')
            : (darkMode ? 'bg-rose-900/30 text-rose-300' : 'bg-rose-50 text-rose-700')
        }`}>
          {isNegative
            ? t('home.bagWeightNegative')
            : t('home.bagWeightResult', { mg: mgConsumed })}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!mgConsumed || mgConsumed <= 0 || loading}
        className="w-full py-2.5 rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:from-rose-600 hover:to-pink-700 transition-all"
      >
        {loading ? '...' : t('home.bagWeightRegister')}
      </button>

      {(todayMg > 0 || avgMgPerConsumption !== null) && (
        <div className={`grid grid-cols-2 gap-2 mt-3 pt-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          {todayMg > 0 && (
            <div className="text-center">
              <div className={`text-xs ${label}`}>{t('home.bagWeightTodayMg')}</div>
              <div className={`text-lg font-bold ${darkMode ? 'text-rose-300' : 'text-rose-600'}`}>{todayMg}</div>
              <div className={`text-xs ${label}`}>mg</div>
            </div>
          )}
          {avgMgPerConsumption !== null && (
            <div className="text-center">
              <div className={`text-xs ${label}`}>{t('home.bagWeightAvgMg')}</div>
              <div className={`text-lg font-bold ${darkMode ? 'text-pink-300' : 'text-pink-600'}`}>{avgMgPerConsumption}</div>
              <div className={`text-xs ${label}`}>mg</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
