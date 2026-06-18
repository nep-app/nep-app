import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// ── Timer 15 min ──────────────────────────────────────────────────────────────
function TimerExercise({ onBack }) {
  const { t } = useTranslation();
  const TOTAL = 15 * 60;
  const [seconds, setSeconds] = useState(TOTAL);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(id); setRunning(false); setDone(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  const progress = ((TOTAL - seconds) / TOTAL) * 100;

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <p className="text-sm text-gray-300 text-center leading-relaxed px-2">
        {t('urge.timerDesc')}
      </p>
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 144 144">
          <circle cx="72" cy="72" r="60" fill="none" stroke="#374151" strokeWidth="10" />
          <circle cx="72" cy="72" r="60" fill="none"
            stroke={done ? '#10b981' : '#8b5cf6'} strokeWidth="10"
            strokeDasharray={`${2 * Math.PI * 60}`}
            strokeDashoffset={`${2 * Math.PI * 60 * (1 - progress / 100)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-mono font-bold text-white">{mins}:{secs}</span>
          {!done && <span className="text-xs text-gray-400">{t('urge.timerLabel')}</span>}
        </div>
      </div>
      {done ? (
        <div className="text-center space-y-1 px-4">
          <p className="text-green-400 font-semibold text-lg">✅ {t('urge.timerDoneTitle')}</p>
          <p className="text-sm text-gray-300">{t('urge.timerDoneDesc')}</p>
        </div>
      ) : (
        <p className="text-xs text-purple-300 italic text-center px-6">{t('urge.timerQuote')}</p>
      )}
      <div className="flex gap-3">
        {!done && (
          <button onClick={() => setRunning(r => !r)}
            className={`px-5 py-2 rounded-full font-semibold text-sm transition-all ${running ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
            {running ? t('urge.pause') : (seconds === TOTAL ? t('urge.start') : t('urge.resume'))}
          </button>
        )}
        {!running && seconds < TOTAL && !done && (
          <button onClick={() => { setSeconds(TOTAL); setDone(false); }}
            className="px-4 py-2 rounded-full text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 transition-all">
            {t('urge.reset')}
          </button>
        )}
      </div>
      <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-300 mt-1">{t('urge.backToMenu')}</button>
    </div>
  );
}

// ── Respiração 4-7-8 ──────────────────────────────────────────────────────────
const PHASES = [
  { key: 'inhale', duration: 4,  label: 'urge.breatheIn',   color: '#8b5cf6', scale: 1.4 },
  { key: 'hold',   duration: 7,  label: 'urge.breatheHold', color: '#f59e0b', scale: 1.4 },
  { key: 'exhale', duration: 8,  label: 'urge.breatheOut',  color: '#3b82f6', scale: 0.7 },
];
const TOTAL_CYCLES = 4;

function BreathingExercise({ onBack }) {
  const { t } = useTranslation();
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [countdown, setCountdown] = useState(PHASES[0].duration);
  const [cycle, setCycle] = useState(1);
  const [done, setDone] = useState(false);

  const advance = useCallback(() => {
    setPhaseIdx(prev => {
      const next = (prev + 1) % PHASES.length;
      if (next === 0) {
        setCycle(c => {
          if (c >= TOTAL_CYCLES) { setRunning(false); setDone(true); return c; }
          return c + 1;
        });
      }
      setCountdown(PHASES[next].duration);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!running || done) return;
    if (countdown <= 0) { advance(); return; }
    const id = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [running, countdown, done, advance]);

  const phase = PHASES[phaseIdx];

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <p className="text-sm text-gray-300 text-center px-2">{t('urge.breathingDesc')}</p>
      <div className="relative flex items-center justify-center w-40 h-40">
        <div className="w-24 h-24 rounded-full opacity-30"
          style={{ backgroundColor: phase.color, transform: running ? `scale(${phase.scale})` : 'scale(1)', transition: `transform ${phase.duration}s ease-in-out` }}
        />
        <div className="absolute flex flex-col items-center">
          <span className="text-4xl font-bold text-white">{countdown}</span>
          <span className="text-xs font-medium mt-1" style={{ color: phase.color }}>{t(phase.label)}</span>
        </div>
      </div>
      <p className="text-xs text-gray-500">{t('urge.breathingCycle', { cycle, total: TOTAL_CYCLES })}</p>
      {done ? (
        <div className="text-center space-y-1 px-4">
          <p className="text-green-400 font-semibold">✅ {t('urge.breathingDone')}</p>
          <p className="text-xs text-gray-400">{t('urge.breathingDoneDesc')}</p>
        </div>
      ) : (
        <button onClick={() => setRunning(r => !r)}
          className={`px-5 py-2 rounded-full font-semibold text-sm transition-all ${running ? 'bg-gray-700 text-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
          {running ? t('urge.pause') : (cycle === 1 && countdown === PHASES[0].duration ? t('urge.start') : t('urge.resume'))}
        </button>
      )}
      <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-300">{t('urge.backToMenu')}</button>
    </div>
  );
}

// ── Check HALT ────────────────────────────────────────────────────────────────
const HALT_ITEMS = [
  { key: 'hungry', emoji: '🍽️', labelKey: 'urge.haltHungry', tipKey: 'urge.haltHungryTip' },
  { key: 'angry',  emoji: '😠', labelKey: 'urge.haltAngry',  tipKey: 'urge.haltAngryTip' },
  { key: 'lonely', emoji: '🫂', labelKey: 'urge.haltLonely', tipKey: 'urge.haltLonelyTip' },
  { key: 'tired',  emoji: '😴', labelKey: 'urge.haltTired',  tipKey: 'urge.haltTiredTip' },
];

function HaltCheck({ onBack }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(null);

  return (
    <div className="flex flex-col gap-4 py-2">
      <p className="text-sm text-gray-300 text-center px-2">{t('urge.haltDesc')}</p>
      <div className="grid grid-cols-2 gap-3">
        {HALT_ITEMS.map(item => (
          <button key={item.key}
            onClick={() => setSelected(selected === item.key ? null : item.key)}
            className={`rounded-xl p-4 text-center border transition-all ${selected === item.key ? 'border-purple-500 bg-purple-900/40' : 'border-gray-700 bg-gray-800/60 hover:border-gray-600'}`}>
            <div className="text-2xl mb-1">{item.emoji}</div>
            <div className="text-sm font-semibold text-white">{t(item.labelKey)}</div>
          </button>
        ))}
      </div>
      {selected && (
        <div className="bg-purple-900/30 border border-purple-700/50 rounded-xl p-4 text-sm text-purple-200 leading-relaxed">
          💡 {t(HALT_ITEMS.find(i => i.key === selected).tipKey)}
        </div>
      )}
      {!selected && (
        <p className="text-xs text-gray-500 text-center italic">{t('urge.haltPrompt')}</p>
      )}
      <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-300 text-center">{t('urge.backToMenu')}</button>
    </div>
  );
}

// ── Menu principal ─────────────────────────────────────────────────────────────
const EXERCISES = [
  { key: 'timer',     emoji: '⏱️', titleKey: 'urge.timerTitle',     descKey: 'urge.timerShortDesc' },
  { key: 'breathing', emoji: '🌬️', titleKey: 'urge.breathingTitle', descKey: 'urge.breathingShortDesc' },
  { key: 'halt',      emoji: '🔍', titleKey: 'urge.haltTitle',      descKey: 'urge.haltShortDesc' },
];

export function UrgeSurfingModal({ onClose, onOpenThoughts, onProceed }) {
  const { t } = useTranslation();
  const [active, setActive] = useState(null);

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full bg-gray-900 border-t border-gray-700 rounded-t-2xl max-h-[80vh] overflow-y-auto"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>

        {/* Handle bar */}
        <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mt-3 mb-4" />

        <div className="px-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-white">💪 {t('urge.title')}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{t('urge.subtitle')}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none ml-4">✕</button>
          </div>

          {/* Exercise area */}
          {active === 'timer'     && <TimerExercise     onBack={() => setActive(null)} />}
          {active === 'breathing' && <BreathingExercise onBack={() => setActive(null)} />}
          {active === 'halt'      && <HaltCheck         onBack={() => setActive(null)} />}

          {/* Menu */}
          {!active && (
            <div className="space-y-3 pb-2">
              {EXERCISES.map(ex => (
                <button key={ex.key} onClick={() => setActive(ex.key)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800 border border-gray-700 hover:border-purple-700/50 text-left transition-all active:scale-[0.98]">
                  <span className="text-2xl w-8 text-center flex-shrink-0">{ex.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm">{t(ex.titleKey)}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{t(ex.descKey)}</div>
                  </div>
                  <span className="text-gray-500 flex-shrink-0 text-lg">›</span>
                </button>
              ))}

              <button onClick={() => { onClose(); onOpenThoughts(); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800 border border-gray-700 hover:border-purple-700/50 text-left transition-all active:scale-[0.98]">
                <span className="text-2xl w-8 text-center flex-shrink-0">✍️</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">{t('urge.thoughtsTitle')}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{t('urge.thoughtsShortDesc')}</div>
                </div>
                <span className="text-gray-500 flex-shrink-0 text-lg">›</span>
              </button>

              {onProceed && (
                <button onClick={() => { onClose(); onProceed(); }}
                  className="w-full py-3 rounded-xl text-sm text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-700 transition-all text-center">
                  {t('urge.proceedAnyway')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
