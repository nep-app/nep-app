import { useState, useEffect } from 'react';

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const load = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
};

const GLASS_ML = 250;

export function DailyHealthWidget({ darkMode }) {
  const storageKey = `healthLog_${localToday()}`;

  const [data, setData] = useState(() => load(storageKey) || { water: 0, exercise: [] });
  const [showExForm, setShowExForm] = useState(false);
  const [exType, setExType] = useState('');
  const [exMin, setExMin] = useState('');

  // Reload if day changes (app left open overnight)
  useEffect(() => {
    const key = `healthLog_${localToday()}`;
    setData(load(key) || { water: 0, exercise: [] });
  }, [localToday()]);

  const save = (next) => {
    setData(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const addWater   = () => save({ ...data, water: data.water + 1 });
  const removeWater = () => { if (data.water > 0) save({ ...data, water: data.water - 1 }); };

  const submitExercise = () => {
    if (!exType.trim()) return;
    const session = { type: exType.trim(), min: exMin ? parseInt(exMin) : null };
    save({ ...data, exercise: [...data.exercise, session] });
    setExType(''); setExMin(''); setShowExForm(false);
  };

  const removeExercise = (i) =>
    save({ ...data, exercise: data.exercise.filter((_, idx) => idx !== i) });

  const totalMl = data.water * GLASS_ML;
  const liters  = totalMl >= 1000
    ? `${(totalMl / 1000).toFixed(1)}L`
    : `${totalMl}ml`;

  const card  = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const muted = darkMode ? 'text-gray-400' : 'text-gray-500';
  const text  = darkMode ? 'text-gray-200' : 'text-gray-700';
  const input = darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400';
  const tag   = darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600';

  return (
    <div className={`rounded-xl border p-3 ${card}`}>
      {/* Water */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">💧</span>
        <span className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Água</span>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={removeWater}
            className={`w-7 h-7 rounded-lg font-bold text-base flex items-center justify-center transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
          >−</button>
          <span className={`text-sm font-semibold min-w-[72px] text-center ${text}`}>
            {data.water} {data.water === 1 ? 'copo' : 'copos'}
            {totalMl > 0 && <span className={`ml-1 font-normal ${muted}`}>({liters})</span>}
          </span>
          <button
            onClick={addWater}
            className="w-7 h-7 rounded-lg font-bold text-base flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >+</button>
        </div>
      </div>

      {/* Divider */}
      <div className={`border-t mb-2 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`} />

      {/* Exercise */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">🏃</span>
          <span className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Exercício</span>
          <button
            onClick={() => setShowExForm(v => !v)}
            className="ml-auto text-xs font-medium px-2 py-1 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors"
          >+ Adicionar</button>
        </div>

        {data.exercise.length === 0 && !showExForm && (
          <p className={`text-xs ${muted}`}>Nenhum registo hoje</p>
        )}

        {data.exercise.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {data.exercise.map((s, i) => (
              <span key={i} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${tag}`}>
                {s.type}{s.min ? ` · ${s.min}min` : ''}
                <button onClick={() => removeExercise(i)} className={`ml-0.5 ${muted} hover:text-red-400`}>×</button>
              </span>
            ))}
          </div>
        )}

        {showExForm && (
          <div className="flex gap-1 mt-1">
            <input
              autoFocus
              value={exType}
              onChange={e => setExType(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitExercise()}
              placeholder="ex: caminhada"
              className={`flex-1 text-xs border rounded-lg px-2 py-1.5 ${input}`}
            />
            <input
              value={exMin}
              onChange={e => setExMin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitExercise()}
              placeholder="min"
              type="number"
              min="1"
              className={`w-14 text-xs border rounded-lg px-2 py-1.5 ${input}`}
            />
            <button onClick={submitExercise} className="px-2 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-medium">✓</button>
            <button onClick={() => setShowExForm(false)} className={`px-2 py-1.5 rounded-lg text-xs ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>✕</button>
          </div>
        )}
      </div>
    </div>
  );
}
