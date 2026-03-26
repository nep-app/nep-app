import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { getMetadata, setMetadata } from '../db/localDB';

const toLocalDatetimeValue = (d) => {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function BagWeightEntry({ onClose, showToast }) {
  const { t } = useTranslation();
  const { addDailyLog, dailyLogs } = useData();
  const { darkMode } = useUI();

  const [tare, setTare] = useState(null);
  const [editingTare, setEditingTare] = useState(false);
  const [tareInput, setTareInput] = useState('');
  const [grossWeight, setGrossWeight] = useState('');
  const [datetime, setDatetime] = useState(() => toLocalDatetimeValue(new Date()));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMetadata('bagTare').then(val => {
      if (val != null) {
        setTare(parseFloat(val));
        setTareInput(String(val));
      } else {
        setEditingTare(true);
      }
    });
  }, []);

  // Last bagWeight entry — new format (grossWeight) or old format (weightAfter)
  // netWeight for old entries is approximated using current tare
  const lastEntry = useMemo(() => {
    const entries = dailyLogs
      .filter(l => l.method === 'bagWeight' && (l.grossWeight != null || l.weightAfter != null))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const entry = entries[0];
    if (!entry) return null;
    if (entry.netWeight != null) return entry;
    // Old format: approximate netWeight from weightAfter minus current tare
    if (entry.weightAfter != null && tare != null) {
      return { ...entry, netWeight: entry.weightAfter - tare };
    }
    return entry;
  }, [dailyLogs, tare]);

  // Total mg from all dailyLog entries (bag weight + manual)
  const totalMgAll = useMemo(() => {
    return dailyLogs.filter(l => l.mg > 0).reduce((s, l) => s + (l.mg || 0), 0);
  }, [dailyLogs]);

  const gross = parseFloat(grossWeight);
  const hasGross = grossWeight !== '' && !isNaN(gross);
  const netWeight = hasGross && tare != null ? gross - tare : null;
  const netValid = netWeight != null && netWeight >= 0;
  const mgRemaining = netValid ? Math.round(netWeight * 1000) : null;

  // mg change since last entry: positive = consumed, negative = refilled
  const mgChangeSinceLast = useMemo(() => {
    if (!lastEntry || !netValid || lastEntry.netWeight == null) return null;
    return Math.round((lastEntry.netWeight - netWeight) * 1000);
  }, [lastEntry, netWeight, netValid]);

  const selectedDate = datetime ? datetime.split('T')[0] : new Date().toISOString().split('T')[0];

  const handleSaveTare = async () => {
    const val = parseFloat(tareInput);
    if (isNaN(val) || val < 0) return;
    await setMetadata('bagTare', val);
    setTare(val);
    setEditingTare(false);
  };

  const handleSubmit = async () => {
    if (!netValid || tare == null) return;
    setLoading(true);
    try {
      const ts = datetime ? new Date(datetime).toISOString() : new Date().toISOString();
      const mgConsumed = mgChangeSinceLast != null && mgChangeSinceLast > 0 ? mgChangeSinceLast : 0;
      await addDailyLog({
        timestamp: ts,
        date: selectedDate,
        mg: mgConsumed,
        method: 'bagWeight',
        grossWeight: gross,
        tare,
        netWeight,
        notes: `${t('home.bagWeightNote')}: ${gross}g (tara ${tare}g) → ${netWeight.toFixed(2)}g`,
      });
      showToast && showToast(t('home.bagWeightRegistered', { mg: mgRemaining }), 'success');
      setGrossWeight('');
      setDatetime(toLocalDatetimeValue(new Date()));
      onClose();
    } catch (err) {
      showToast && showToast(`✗ ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const base = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const inp = darkMode
    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-rose-500'
    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-rose-500';

  return (
    <div className={`rounded-xl border p-4 ${base} shadow-md`}>
      {/* Header */}
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

      {/* Tare row */}
      {editingTare ? (
        <div className="flex gap-2 mb-3">
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="430"
            value={tareInput}
            onChange={e => setTareInput(e.target.value)}
            className={`flex-1 px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${inp}`}
          />
          <button
            onClick={handleSaveTare}
            disabled={!tareInput || isNaN(parseFloat(tareInput))}
            className="px-3 py-2 rounded-lg bg-rose-600 text-white text-xs font-medium disabled:opacity-40"
          >
            {t('home.bagWeightSaveTare')}
          </button>
        </div>
      ) : (
        <div className={`flex items-center justify-between mb-3 text-xs ${muted}`}>
          <span>{t('home.bagWeightTareLabel', { g: tare })}</span>
          <button onClick={() => setEditingTare(true)} className="underline hover:opacity-70">
            {t('home.bagWeightChangeBag')}
          </button>
        </div>
      )}

      {/* Datetime */}
      <div className="mb-3">
        <label className={`block text-xs mb-1 ${muted}`}>{t('home.bagWeightDatetime')}</label>
        <input
          type="datetime-local"
          value={datetime}
          onChange={e => setDatetime(e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${inp}`}
        />
      </div>

      {/* Gross weight input */}
      <div className="mb-3">
        <label className={`block text-xs mb-1 ${muted}`}>{t('home.bagWeightGross')}</label>
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder={tare != null ? `> ${tare}` : '0.00'}
          value={grossWeight}
          onChange={e => setGrossWeight(e.target.value)}
          className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors ${inp}`}
        />
      </div>

      {/* Result */}
      {hasGross && tare != null && (
        <div className={`rounded-lg px-3 py-2 mb-3 text-sm text-center ${
          !netValid
            ? (darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600')
            : (darkMode ? 'bg-rose-900/30 text-rose-300' : 'bg-rose-50 text-rose-700')
        }`}>
          {!netValid
            ? t('home.bagWeightBelowTare')
            : (
              <>
                <div className="font-semibold">{t('home.bagWeightRemaining', { g: netWeight.toFixed(2), mg: mgRemaining })}</div>
                {mgChangeSinceLast != null && (
                  <div className="text-xs mt-0.5 opacity-80">
                    {mgChangeSinceLast > 0
                      ? t('home.bagWeightConsumedSince', { mg: mgChangeSinceLast })
                      : mgChangeSinceLast < 0
                        ? t('home.bagWeightRefilled', { mg: Math.abs(mgChangeSinceLast) })
                        : null}
                  </div>
                )}
              </>
            )
          }
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!netValid || tare == null || loading}
        className="w-full py-2.5 rounded-lg bg-gradient-to-r from-rose-500 to-pink-600 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:from-rose-600 hover:to-pink-700 transition-all"
      >
        {loading ? '...' : t('home.bagWeightRegister')}
      </button>

      {/* Stats */}
      {(lastEntry || totalMgAll > 0) && (
        <div className={`mt-3 pt-3 border-t grid grid-cols-2 gap-2 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          {lastEntry && (
            <div className="text-center">
              <div className={`text-xs ${muted}`}>{t('home.bagWeightLastEntry')}</div>
              <div className={`text-sm font-bold ${darkMode ? 'text-rose-300' : 'text-rose-600'}`}>
                {Math.round((lastEntry.netWeight || 0) * 1000)}mg
              </div>
              <div className={`text-xs ${muted}`}>{new Date(lastEntry.timestamp).toLocaleDateString('pt-PT')}</div>
            </div>
          )}
          {totalMgAll > 0 && (
            <div className="text-center">
              <div className={`text-xs ${muted}`}>{t('home.bagWeightTotalMg')}</div>
              <div className={`text-sm font-bold ${darkMode ? 'text-pink-300' : 'text-pink-600'}`}>
                {totalMgAll}mg
              </div>
              <div className={`text-xs ${muted}`}>{t('home.bagWeightAllLogs')}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
