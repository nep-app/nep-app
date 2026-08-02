import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { logUrgeEvent } from '../../utils/urgeLog';

// ── Timer 15 min ──────────────────────────────────────────────────────────────
const TIMER_OPTIONS = [15, 20, 30, 45, 60]; // minutos (15 = mínimo/por defeito)

function TimerExercise({ onBack }) {
  const { t, i18n } = useTranslation();
  const pt = i18n.language !== 'en';
  const [totalMin, setTotalMin] = useState(15);
  const TOTAL = totalMin * 60;
  const [seconds, setSeconds] = useState(15 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const atStart = !running && !done && seconds === TOTAL; // ainda não começou → dá para escolher o tempo

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
      {atStart && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500">{pt ? 'Quanto tempo?' : 'How long?'}</span>
          <div className="flex flex-wrap gap-2 justify-center">
            {TIMER_OPTIONS.map(m => (
              <button key={m}
                onClick={() => { setTotalMin(m); setSeconds(m * 60); }}
                className={'px-3 py-1 rounded-full text-xs font-medium border ' + (totalMin === m ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300')}>
                {m} min
              </button>
            ))}
          </div>
        </div>
      )}
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

// ── "O que preciso agora?" (pergunta aberta e gentil, no lugar do HALT) ─────────
const NEEDS = [
  { key: 'rest',    emoji: '😴', pt: 'Descanso',       en: 'Rest',        ptTip: 'Talvez o corpo esteja só a pedir uma pausa. Consegues deitar-te ou fechar os olhos uns minutos?', enTip: 'Maybe your body just wants a break. Can you lie down or close your eyes for a bit?' },
  { key: 'food',    emoji: '🍽️', pt: 'Comida ou água', en: 'Food or water', ptTip: 'Comer qualquer coisa ou beber água muda mais o estado do que parece. Experimenta.', enTip: 'Eating something or drinking water shifts your state more than it seems. Try it.' },
  { key: 'company', emoji: '🫂', pt: 'Companhia',       en: 'Company',     ptTip: 'Falar com alguém — nem que seja uma mensagem — tira peso. Há alguém a quem possas chegar?', enTip: 'Reaching out to someone — even a text — lightens the load. Is there someone you can reach?' },
  { key: 'move',    emoji: '🚶', pt: 'Movimento',       en: 'Movement',    ptTip: 'Levantar, andar um pouco, água fria na cara — ajuda a descarregar o pico.', enTip: 'Stand up, walk a little, cold water on your face — helps the peak pass.' },
  { key: 'calm',    emoji: '🌙', pt: 'Calma',           en: 'Calm',        ptTip: 'Talvez precises de baixar o barulho — silêncio, uma música, respirar devagar.', enTip: 'Maybe you need less noise — quiet, some music, slow breathing.' },
  { key: 'care',    emoji: '💛', pt: 'Carinho',         en: 'Care',        ptTip: 'Sê gentil contigo agora, como serias com uma amiga a sentir isto.', enTip: 'Be kind to yourself right now, like you would with a friend feeling this.' },
];

function NeedCheck({ onBack }) {
  const { t, i18n } = useTranslation();
  const pt = i18n.language !== 'en';
  const [selected, setSelected] = useState(null);
  const sel = NEEDS.find(n => n.key === selected);

  return (
    <div className="flex flex-col gap-4 py-2">
      <p className="text-sm text-gray-300 text-center px-2">
        {pt ? 'Este impulso costuma esconder uma necessidade. Do que é que precisas mesmo agora?' : 'This urge often hides a need. What do you actually need right now?'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {NEEDS.map(item => (
          <button key={item.key}
            onClick={() => setSelected(selected === item.key ? null : item.key)}
            className={`rounded-xl p-4 text-center border transition-all ${selected === item.key ? 'border-purple-500 bg-purple-900/40' : 'border-gray-700 bg-gray-800/60 hover:border-gray-600'}`}>
            <div className="text-2xl mb-1">{item.emoji}</div>
            <div className="text-sm font-semibold text-white">{pt ? item.pt : item.en}</div>
          </button>
        ))}
      </div>
      {sel && (
        <div className="bg-purple-900/30 border border-purple-700/50 rounded-xl p-4 text-sm text-purple-200 leading-relaxed">
          💡 {pt ? sel.ptTip : sel.enTip}
        </div>
      )}
      {!sel && (
        <p className="text-xs text-gray-500 text-center italic">
          {pt ? 'Não faz mal se não souberes ao certo. Só parar para perguntar já ajuda.' : "It's okay not to know exactly. Just pausing to ask already helps."}
        </p>
      )}
      <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-300 text-center">{t('urge.backToMenu')}</button>
    </div>
  );
}

// ── Ancorar 5-4-3-2-1 (grounding pelos sentidos) ────────────────────────────────
function GroundingExercise({ onBack }) {
  const { t, i18n } = useTranslation();
  const pt = i18n.language !== 'en';
  const STEPS = [
    { n: 5, pt: 'coisas que consegues VER', en: 'things you can SEE', emoji: '👀' },
    { n: 4, pt: 'coisas que consegues OUVIR', en: 'things you can HEAR', emoji: '👂' },
    { n: 3, pt: 'coisas que consegues TOCAR ou sentir', en: 'things you can TOUCH or feel', emoji: '✋' },
    { n: 2, pt: 'coisas que consegues CHEIRAR', en: 'things you can SMELL', emoji: '👃' },
    { n: 1, pt: 'coisa que consegues SABOREAR', en: 'thing you can TASTE', emoji: '👅' },
  ];
  const [i, setI] = useState(0);
  const done = i >= STEPS.length;
  const step = STEPS[Math.min(i, STEPS.length - 1)];

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <p className="text-sm text-gray-300 text-center px-2">
        {pt ? 'Traz-te de volta ao momento pelos sentidos, sem pressa.' : 'Bring yourself back to the moment through your senses, no rush.'}
      </p>
      {!done ? (
        <>
          <div className="text-5xl">{step.emoji}</div>
          <div className="text-center">
            <div className="text-4xl font-bold text-white">{step.n}</div>
            <div className="text-sm text-gray-300 mt-1 px-6">{pt ? step.pt : step.en}</div>
          </div>
          <button onClick={() => setI(i + 1)}
            className="px-6 py-2 rounded-full font-semibold text-sm bg-purple-600 text-white hover:bg-purple-700">
            {i === STEPS.length - 1 ? (pt ? 'Terminar' : 'Finish') : (pt ? 'Próximo' : 'Next')}
          </button>
        </>
      ) : (
        <div className="text-center space-y-1 px-4">
          <p className="text-green-400 font-semibold text-lg">✅ {pt ? 'Ancoraste-te.' : 'You grounded yourself.'}</p>
          <p className="text-sm text-gray-300">{pt ? 'Repara como o impulso pode já não estar tão forte.' : 'Notice how the urge may not be as strong now.'}</p>
          <button onClick={() => setI(0)} className="text-xs text-purple-300 underline mt-2">{pt ? 'Fazer outra vez' : 'Do it again'}</button>
        </div>
      )}
      <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-300">{t('urge.backToMenu')}</button>
    </div>
  );
}

// ── Mexer o corpo (inclui água fria / gelo) ─────────────────────────────────────
function MoveExercise({ onBack }) {
  const { t, i18n } = useTranslation();
  const pt = i18n.language !== 'en';
  const ITEMS = [
    { emoji: '🧍', pt: 'Levanta-te e alonga 30 segundos.', en: 'Stand up and stretch for 30 seconds.' },
    { emoji: '🚶', pt: 'Anda um bocadinho — de um lado para o outro, ou até outra divisão.', en: 'Walk a little — back and forth, or to another room.' },
    { emoji: '💧', pt: 'Água fria na cara ou nos pulsos.', en: 'Cold water on your face or wrists.' },
    { emoji: '🧊', pt: 'Segura um cubo de gelo na mão até derreter um pouco — baixa a intensidade.', en: 'Hold an ice cube until it melts a bit — it lowers the intensity.' },
    { emoji: '🌬️', pt: 'Respira fundo três vezes enquanto o fazes.', en: 'Take three deep breaths while you do it.' },
  ];
  return (
    <div className="flex flex-col gap-4 py-2">
      <p className="text-sm text-gray-300 text-center px-2">
        {pt ? 'Mexer o corpo ajuda a descarregar o pico do impulso. Escolhe o que der agora:' : 'Moving your body helps the urge peak pass. Do whatever you can right now:'}
      </p>
      <div className="space-y-2">
        {ITEMS.map((it, idx) => (
          <div key={idx} className="flex items-start gap-3 bg-gray-800/60 border border-gray-700 rounded-xl p-3">
            <span className="text-xl flex-shrink-0">{it.emoji}</span>
            <span className="text-sm text-gray-200 leading-relaxed">{pt ? it.pt : it.en}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-purple-300 italic text-center px-4">
        {pt ? 'Não tens de fazer tudo. Uma coisa já chega para partir o impulso.' : "You don't have to do all of it. One thing is enough to break the urge."}
      </p>
      <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-300 text-center">{t('urge.backToMenu')}</button>
    </div>
  );
}

// ── Menu principal ─────────────────────────────────────────────────────────────
const EXERCISES = [
  { key: 'timer',     emoji: '⏱️', titleKey: 'urge.timerTitle',     descKey: 'urge.timerShortDesc' },
  { key: 'breathing', emoji: '🌬️', titleKey: 'urge.breathingTitle', descKey: 'urge.breathingShortDesc' },
  { key: 'need',      emoji: '🌊', titlePt: 'O que preciso agora?', titleEn: 'What do I need now?', descPt: 'Uma pausa para ouvir o que precisas.', descEn: 'A pause to hear what you need.' },
  { key: 'grounding', emoji: '🖐️', titlePt: 'Ancorar (5-4-3-2-1)', titleEn: 'Ground (5-4-3-2-1)', descPt: 'Voltar ao momento pelos sentidos.', descEn: 'Back to the moment through your senses.' },
  { key: 'move',      emoji: '🚶', titlePt: 'Mexer o corpo', titleEn: 'Move your body', descPt: 'Levantar, andar, água fria — descarregar o pico.', descEn: 'Stand up, walk, cold water — let the peak pass.' },
];

export function UrgeSurfingModal({ onClose, onOpenThoughts, onOpenReflection, onProceed, warnings = [] }) {
  const { t, i18n } = useTranslation();
  const pt = i18n.language !== 'en';
  const [active, setActive] = useState(null);
  // Registo do momento de impulso: que exercícios usou + o que fez. Loga UMA vez.
  const usedRef = useRef(new Set());
  const loggedRef = useRef(false);
  const logOnce = (outcome) => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    logUrgeEvent({ exercises: Array.from(usedRef.current), outcome });
  };
  const openExercise = (key) => { usedRef.current.add(key); setActive(key); };
  const handleClose = () => { logOnce('delayed'); onClose(); };
  const handleProceed = () => { logOnce('proceeded'); onClose(); if (onProceed) onProceed(); };
  const handleThoughts = () => { usedRef.current.add('thoughts'); logOnce('delayed'); onClose(); onOpenThoughts(); };
  const handleReflection = () => { usedRef.current.add('reflection'); logOnce('delayed'); onClose(); if (onOpenReflection) onOpenReflection(); };

  return (
    <div className="fixed inset-0 z-[70] flex items-end bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="w-full bg-gray-900 border-t border-gray-700 rounded-t-2xl max-h-[94dvh] overflow-y-auto"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>

        {/* Handle bar */}
        <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mt-2 mb-2" />

        <div className="px-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-white">💪 {t('urge.title')}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{t('urge.subtitle')}</p>
            </div>
            <button onClick={handleClose} className="text-gray-500 hover:text-white text-2xl leading-none ml-4">✕</button>
          </div>

          {/* Why this modal appeared */}
          {warnings.length > 0 && !active && (
            <div className="mb-4 rounded-xl border border-orange-700/50 bg-orange-900/20 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-orange-400 mb-2">{t('urge.whyLabel', 'Por que apareceu este aviso:')}</p>
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-orange-200 flex items-start gap-2">
                  <span className="flex-shrink-0">{w.emoji}</span>
                  <span>{w.text}</span>
                </p>
              ))}
            </div>
          )}

          {/* Exercise area */}
          {active === 'timer'     && <TimerExercise     onBack={() => setActive(null)} />}
          {active === 'breathing' && <BreathingExercise onBack={() => setActive(null)} />}
          {active === 'need'      && <NeedCheck         onBack={() => setActive(null)} />}
          {active === 'grounding' && <GroundingExercise onBack={() => setActive(null)} />}
          {active === 'move'      && <MoveExercise      onBack={() => setActive(null)} />}

          {/* Menu */}
          {!active && (
            <div className="space-y-2 pb-1">
              {EXERCISES.map(ex => (
                <button key={ex.key} onClick={() => openExercise(ex.key)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 hover:border-purple-700/50 text-left transition-all active:scale-[0.98]">
                  <span className="text-xl w-7 text-center flex-shrink-0">{ex.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm">{ex.titleKey ? t(ex.titleKey) : (pt ? ex.titlePt : ex.titleEn)}</div>
                    <div className="text-xs text-gray-400 leading-tight">{ex.descKey ? t(ex.descKey) : (pt ? ex.descPt : ex.descEn)}</div>
                  </div>
                  <span className="text-gray-500 flex-shrink-0 text-lg">›</span>
                </button>
              ))}

              <button onClick={handleThoughts}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 hover:border-purple-700/50 text-left transition-all active:scale-[0.98]">
                <span className="text-xl w-7 text-center flex-shrink-0">✍️</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">{t('urge.thoughtsTitle')}</div>
                  <div className="text-xs text-gray-400 leading-tight">{t('urge.thoughtsShortDesc')}</div>
                </div>
                <span className="text-gray-500 flex-shrink-0 text-lg">›</span>
              </button>

              {onOpenReflection && (
                <button onClick={handleReflection}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 hover:border-purple-700/50 text-left transition-all active:scale-[0.98]">
                  <span className="text-xl w-7 text-center flex-shrink-0">🪞</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm">{pt ? 'Responder à reflexão do dia' : 'Answer the daily reflection'}</div>
                    <div className="text-xs text-gray-400 leading-tight">{pt ? 'Uma pergunta suave para parar e pensar.' : 'A gentle prompt to pause and think.'}</div>
                  </div>
                  <span className="text-gray-500 flex-shrink-0 text-lg">›</span>
                </button>
              )}

              {onProceed && (
                <button onClick={handleProceed}
                  className="w-full py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-700 transition-all text-center">
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
