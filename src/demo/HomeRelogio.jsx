import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import { getTodayKey, safeToISODate } from '../utils/helpers';
import { periodInfoForClosing } from '../utils/mgDerivation';

// ===== INÍCIO COM RELÓGIO (experiência do modo demo) =====
// Desenho escolhido pela Teresa na tela "novas formas de mostrar" (A, versão 2):
// relógio das últimas 24 horas → botão grande de registar consumo → todas as
// opções de registo → um cartão de mensagens. A linha do dia abre ao tocar no
// relógio.
//
// Tudo o que aparece vem dos registos. Regras do CLAUDE.md respeitadas:
//  - sem elogio nem cor de juízo; a meta só aparece se ela a definiu;
//  - "sem registo" nunca é zero: sem dados, o relógio e as mensagens dizem-no
//    em vez de inventarem um número.

const DAY_MS = 86400000;
const C = 150; // centro do relógio (viewBox -20 -20 340 340)
const R = 120;

const hourOf = (ms) => { const d = new Date(ms); return d.getHours() + d.getMinutes() / 60; };
const pt = (h, r = R) => {
  const a = (h / 24) * 2 * Math.PI - Math.PI / 2;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
const arcPath = (h1, h2, r = R) => {
  const span = ((h2 - h1) % 24 + 24) % 24;
  const [x1, y1] = pt(h1, r);
  const [x2, y2] = pt(h2, r);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${span > 12 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};
const hhmm = (ms) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const agoText = (ms) => {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h}h${String(min % 60).padStart(2, '0')}`;
  return `${Math.floor(h / 24)} dias`;
};
const tsOf = (x) => { const t = new Date(x?.timestamp || x?.createdAt || 0).getTime(); return isNaN(t) ? null : t; };

// Sono de um ciclo: o ciclo guarda a hora de deitar ("07:00") e as horas
// dormidas; o timestamp é quando foi registado (ao acordar ou depois). O início
// é a ocorrência dessa hora de deitar mais próxima de (registo − horas dormidas).
const sleepInterval = (cycle) => {
  const reg = tsOf(cycle);
  const h = parseFloat(cycle?.sleep);
  if (reg == null || !cycle?.bedtime || isNaN(h) || h <= 0) return null;
  const [bh, bm] = cycle.bedtime.split(':').map(Number);
  if (isNaN(bh)) return null;
  const target = reg - h * 3600000;
  let best = null;
  for (const dayOffset of [-2, -1, 0]) {
    const d = new Date(reg); d.setDate(d.getDate() + dayOffset); d.setHours(bh, bm || 0, 0, 0);
    const s = d.getTime();
    if (s > reg) continue;
    if (best == null || Math.abs(s - target) < Math.abs(best - target)) best = s;
  }
  return best == null ? null : { start: best, end: best + h * 3600000, hours: h };
};

const OPTION = 'min-h-[64px] rounded-2xl border px-1 py-2 text-[11px] leading-tight font-medium flex flex-col items-center justify-center gap-1 transition-colors';

export function HomeRelogio({ onMarkConsumption, onLogPast, alerts = [] }) {
  const { t, i18n } = useTranslation();
  const { consumptions = [], cycles = [], wellbeingLogs = [], weighings = [], goals = [] } = useData();
  const { setShowGoalModal, setShowWellbeingModal, setShowEmotionsModal, setShowReflectionModal, setShowCycleModal, setShowDailyLogModal, setShowThoughtsModal } = useUI();

  // Relógio a andar: recalcula de minuto a minuto.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(id); }, []);
  const from = now - DAY_MS;

  const data = useMemo(() => {
    const cons = consumptions.map(tsOf).filter(x => x != null).sort((a, b) => a - b);
    const last = cons.length ? cons[cons.length - 1] : null;
    const cons24 = cons.filter(x => x > from && x <= now);

    const sleeps = cycles
      .map(c => sleepInterval(c))
      .filter(s => s && s.end > from && s.start < now)
      .map(s => ({ ...s, start: Math.max(s.start, from), end: Math.min(s.end, now) }));

    const states24 = wellbeingLogs
      .map(w => ({ ms: tsOf(w), mood: w.mood, energy: w.energy }))
      .filter(w => w.ms != null && w.ms > from && w.ms <= now);
    const weigh24 = weighings
      .filter(w => !w.notWeighed)
      .map(w => ({ ms: tsOf(w), w }))
      .filter(x => x.ms != null && x.ms > from && x.ms <= now);

    const todayKey = getTodayKey();
    const todayCount = consumptions.filter(c => (c.date || safeToISODate(c.timestamp)) === todayKey).length;
    return { last, cons24, sleeps, states24, weigh24, todayCount };
  }, [consumptions, cycles, wellbeingLogs, weighings, now, from]);

  // ----- Mensagens (cada uma só aparece se houver dados para ela) -----
  const messages = useMemo(() => {
    const out = [];
    if (data.last != null) {
      out.push({ label: t('demoHome.msgLastLabel'), text: t('demoHome.msgLast', { time: hhmm(data.last), ago: agoText(now - data.last) }) });
    }
    const freqGoal = goals.find(g => g.type === 'reduce_frequency');
    out.push({
      label: t('demoHome.msgTodayLabel'),
      text: t('demoHome.msgToday', { count: data.todayCount }) + (freqGoal ? ' ' + t('demoHome.msgTodayGoal', { target: freqGoal.target }) : ''),
    });
    const lastW = [...weighings].filter(w => !w.notWeighed && tsOf(w) != null).sort((a, b) => tsOf(b) - tsOf(a))[0];
    if (lastW) {
      const info = periodInfoForClosing(weighings, consumptions, lastW.id);
      if (info && info.consumed != null && !lastW.forgottenRefill) {
        out.push({ label: t('demoHome.msgWeighLabel'), text: t('demoHome.msgWeigh', { when: `${new Date(tsOf(lastW)).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })} ${hhmm(tsOf(lastW))}`, mg: info.consumed, n: info.doseCount }) });
      }
    }
    const lastSleep = [...cycles].filter(c => c.sleep != null && c.sleep !== '' && tsOf(c) != null).sort((a, b) => tsOf(b) - tsOf(a))[0];
    if (lastSleep) {
      const h = parseFloat(lastSleep.sleep);
      out.push({ label: t('demoHome.msgSleepLabel'), text: h === 0 ? t('demoHome.msgNoSleep') : t('demoHome.msgSleep', { h }) });
    }
    for (const a of alerts) {
      if (a && a.text) out.push({ label: t('demoHome.msgGoalLabel'), text: a.text });
    }
    // A Mensagem de Hoje passou para o cabeçalho, à vista; aqui só repetia.
    return out;
  }, [data, goals, weighings, consumptions, cycles, alerts, now, t, i18n.language]);

  const [msgIdx, setMsgIdx] = useState(0);
  const msg = messages[msgIdx % Math.max(1, messages.length)];
  const [showLine, setShowLine] = useState(false);

  const nowH = hourOf(now);
  const [hx, hy] = pt(nowH, 108);
  // O ponteiro começa fora do centro, para não passar por cima do texto.
  const [hx0, hy0] = pt(nowH, 74);
  const hasAnything = data.cons24.length + data.sleeps.length + data.states24.length + data.weigh24.length > 0;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Relógio das últimas 24 horas */}
      <button
        type="button"
        onClick={() => setShowLine(true)}
        aria-label={t('demoHome.openTimeline')}
        className="relative w-64 h-64 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
      >
        <svg width="256" height="256" viewBox="-20 -20 340 340" aria-hidden="true">
          <circle cx={C} cy={C} r={R} fill="none" className="stroke-gray-700" strokeWidth="22" />
          {data.sleeps.map((s, i) => (
            <path key={`s${i}`} d={arcPath(hourOf(s.start), hourOf(s.end))} fill="none" className="stroke-amber-300/70" strokeWidth="22" strokeLinecap="round" />
          ))}
          {data.cons24.map((ms, i) => { const [x, y] = pt(hourOf(ms), 96); return <circle key={`c${i}`} cx={x} cy={y} r="8" className="fill-rose-300" />; })}
          {data.states24.map((s, i) => { const [x, y] = pt(hourOf(s.ms), R); return <rect key={`w${i}`} x={x - 6} y={y - 6} width="12" height="12" rx="3" className="fill-sky-300" />; })}
          {data.weigh24.map((s, i) => { const [x, y] = pt(hourOf(s.ms), R); return <rect key={`p${i}`} x={x - 6} y={y - 6} width="12" height="12" rx="3" className="fill-violet-300" />; })}
          <line x1={hx0} y1={hy0} x2={hx} y2={hy} className="stroke-gray-200" strokeWidth="3" strokeLinecap="round" />
          <circle cx={hx} cy={hy} r="6" className="fill-gray-200" />
          {[['00h', 0, 'middle', 150, 2], ['06h', 6, 'start', 296, 155], ['12h', 12, 'middle', 150, 310], ['18h', 18, 'end', 4, 155]].map(([lbl, , anchor, x, y]) => (
            <text key={lbl} x={x} y={y} textAnchor={anchor} fontSize="14" className="fill-gray-500">{lbl}</text>
          ))}
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          {data.last != null ? (
            <>
              <span className="text-3xl font-semibold text-gray-100 leading-none">{agoText(now - data.last)}</span>
              <span className="text-[11px] text-gray-400 mt-1">{t('demoHome.sinceLast')}</span>
              <span className="text-[10px] text-violet-300 mt-1.5">{t('demoHome.tapHint')}</span>
            </>
          ) : (
            <span className="text-xs text-gray-400 px-10">{t('demoHome.noneYet')}</span>
          )}
        </span>
      </button>
      {!hasAnything && <p className="text-xs text-gray-500 -mt-2">{t('demoHome.tlEmpty')}</p>}
      <button
        type="button"
        onClick={() => setShowLine(true)}
        className="-mt-1 inline-flex items-center gap-2 px-4 h-11 rounded-full bg-violet-500/15 border border-violet-400/40 text-violet-100 text-sm font-medium hover:bg-violet-500/25 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 3v18M7 7h10M7 12h10M7 17h6" /></svg>
        {t('demoHome.seeDay')}
        <span aria-hidden="true">›</span>
      </button>
      {hasAnything && (
        <div className="-mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-gray-400" aria-hidden="true">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-300" />{t('demoHome.tlUse')}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-amber-300/70" />{t('demoHome.msgSleepLabel')}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-sky-300" />{t('demoHome.legendState')}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-300" />{t('demoHome.tlWeigh')}</span>
        </div>
      )}

      {/* Botão principal */}
      <button
        type="button"
        onClick={onMarkConsumption}
        className="w-full h-14 rounded-full bg-rose-500/25 border border-rose-400/50 text-rose-50 text-base font-semibold hover:bg-rose-500/35 transition-colors"
      >
        {t('home.markConsumption')}
      </button>

      {/* Todas as opções de registo */}
      <div className="w-full grid grid-cols-4 gap-2">
        <button type="button" onClick={onLogPast} className={`${OPTION} bg-rose-500/10 border-rose-500/25 text-rose-100 hover:bg-rose-500/20`}><span aria-hidden="true">🕓</span>{t('demoHome.past')}</button>
        <button type="button" onClick={() => setShowCycleModal(true)} className={`${OPTION} bg-amber-500/10 border-amber-500/25 text-amber-100 hover:bg-amber-500/20`}><span aria-hidden="true">🌙</span>{t('home.newCycle')}</button>
        <button type="button" onClick={() => setShowDailyLogModal(true)} className={`${OPTION} bg-rose-500/10 border-rose-500/25 text-rose-100 hover:bg-rose-500/20`}><span aria-hidden="true">📊</span>{t('home.registerMg')}</button>
        <button type="button" onClick={() => setShowWellbeingModal(true)} className={`${OPTION} bg-sky-500/10 border-sky-500/25 text-sky-100 hover:bg-sky-500/20`}><span aria-hidden="true">💙</span>{t('home.wellbeing')}</button>
        <button type="button" onClick={() => setShowEmotionsModal(true)} className={`${OPTION} bg-sky-500/10 border-sky-500/25 text-sky-100 hover:bg-sky-500/20`}><span aria-hidden="true">🫧</span>{t('home.emotions')}</button>
        <button type="button" onClick={() => setShowThoughtsModal(true)} className={`${OPTION} bg-violet-500/10 border-violet-500/25 text-violet-100 hover:bg-violet-500/20`}><span aria-hidden="true">💭</span>{t('home.thoughts')}</button>
        <button type="button" onClick={() => setShowReflectionModal(true)} className={`${OPTION} bg-violet-500/10 border-violet-500/25 text-violet-100 hover:bg-violet-500/20`}><span aria-hidden="true">📝</span>{t('home.dailyReflection')}</button>
        <button type="button" onClick={() => setShowGoalModal(true)} className={`${OPTION} bg-violet-500/10 border-violet-500/25 text-violet-100 hover:bg-violet-500/20`}><span aria-hidden="true">🎯</span>{t('home.goals')}</button>
      </div>

      {/* Cartão de mensagens */}
      {msg && (
        <section className="w-full min-h-[140px] rounded-3xl bg-gray-800/70 border border-gray-700/60 p-4 flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-gray-400">{msg.label}</span>
            <p className="text-base leading-snug text-gray-100">{msg.text}</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5" aria-hidden="true">
              {messages.map((_, k) => (
                <span key={k} className={k === msgIdx % messages.length ? 'w-4 h-1.5 rounded-full bg-gray-200' : 'w-1.5 h-1.5 rounded-full bg-gray-600'} />
              ))}
            </div>
            {messages.length > 1 && (
              <button
                type="button"
                onClick={() => setMsgIdx(i => (i + 1) % messages.length)}
                aria-label={t('demoHome.nextMsg')}
                className="w-11 h-11 rounded-full bg-gray-700/70 text-gray-100 flex items-center justify-center hover:bg-gray-700"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            )}
          </div>
        </section>
      )}

      {showLine && <DayTimeline data={data} now={now} weighings={weighings} onClose={() => setShowLine(false)} />}
    </div>
  );
}

// ===== LINHA DO DIA (as últimas 24 horas, por ordem) =====
function DayTimeline({ data, now, onClose }) {
  const { t } = useTranslation();
  const items = [
    ...data.sleeps.map(s => ({ ms: s.start, kind: 'sleep', hours: s.hours })),
    ...data.cons24.map(ms => ({ ms, kind: 'use' })),
    ...data.states24.map(s => ({ ms: s.ms, kind: 'state', mood: s.mood, energy: s.energy })),
    ...data.weigh24.map(x => ({ ms: x.ms, kind: 'weigh', w: x.w })),
  ].sort((a, b) => a.ms - b.ms)
    // Vários consumos no mesmo minuto ficam numa linha só ("consumo × 3").
    .reduce((acc, it) => {
      const prev = acc[acc.length - 1];
      if (it.kind === 'use' && prev && prev.kind === 'use' && Math.floor(prev.ms / 60000) === Math.floor(it.ms / 60000)) { prev.n += 1; return acc; }
      acc.push(it.kind === 'use' ? { ...it, n: 1 } : it);
      return acc;
    }, []);

  const leftInBag = (w) => (typeof w.before === 'number' && typeof w.empty === 'number') ? Math.round(w.before - w.empty) : null;

  return (
    <div className="fixed inset-0 z-[75] bg-gray-900 overflow-y-auto" role="dialog" aria-modal="true" aria-label={t('demoHome.tlTitle')}>
      <div className="max-w-md mx-auto px-5 pt-14 pb-10">
        <button type="button" onClick={onClose} className="text-sm text-gray-400 hover:text-gray-200 mb-3">‹ {t('demoHome.tlBack')}</button>
        <h2 className="text-2xl font-semibold text-gray-100 mb-1">{t('demoHome.tlTitle')}</h2>
        <p className="text-sm text-gray-400 mb-5">{t('demoHome.msgToday', { count: data.todayCount })}</p>

        {items.length === 0 && <p className="text-sm text-gray-400">{t('demoHome.tlEmpty')}</p>}

        <ol className="flex flex-col">
          {items.map((it, i) => (
            <li key={i} className="grid grid-cols-[52px_20px_1fr] items-center min-h-[42px]">
              <span className="text-xs text-gray-400">{hhmm(it.ms)}</span>
              <span className="flex justify-center">
                {it.kind === 'use' && <span className="w-3 h-3 rounded-full bg-rose-300" />}
                {it.kind === 'sleep' && <span className="w-2 h-8 rounded bg-amber-300/70" />}
                {it.kind === 'state' && <span className="w-3 h-3 rounded-sm bg-sky-300" />}
                {it.kind === 'weigh' && <span className="w-3 h-3 rounded-sm bg-violet-300" />}
              </span>
              <span className="text-sm text-gray-200">
                {it.kind === 'use' && <>{t('demoHome.tlUse')}{it.n > 1 ? ` × ${it.n}` : ''}</>}
                {it.kind === 'sleep' && <span className="inline-block px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-100">{t('demoHome.tlSleep')} · {it.hours}h</span>}
                {it.kind === 'state' && <span className="inline-block px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/25 text-sky-100 text-xs">{t('demoHome.tlState', { mood: it.mood ?? '–', energy: it.energy ?? '–' })}</span>}
                {it.kind === 'weigh' && <span className="inline-block px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-100 text-xs">{leftInBag(it.w) != null ? t('demoHome.tlWeighLeft', { mg: leftInBag(it.w) }) : t('demoHome.tlWeigh')}</span>}
              </span>
            </li>
          ))}
          <li className="grid grid-cols-[52px_20px_1fr] items-center min-h-[52px]">
            <span className="text-xs font-semibold text-gray-200">{t('demoHome.tlNow')}</span>
            <span className="flex justify-center"><span className="w-3.5 h-3.5 rounded-full border-[3px] border-gray-200" /></span>
            <span className="text-sm text-gray-400">{hhmm(now)}{data.last != null ? ` · ${t('demoHome.tlSince', { ago: agoText(now - data.last) })}` : ''}</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
