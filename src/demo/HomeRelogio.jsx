import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import * as Icons from '../components/Icons';
import { SubstancesModal } from '../components/modals/SubstancesModal';
import { formatSubstances } from '../utils/substances';
import { getTodayKey, safeToISODate, getDateKeyFromItem, bedtimeMeetsTarget, limitLastDeadline, getDateDaysAgo, meetsGoal, gapCrossesDays } from '../utils/helpers';
import { getUserStats } from '../utils/userStats';
import { useMetrics } from '../contexts/MetricsContext';

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

const OPTION = 'min-h-[52px] rounded-xl border px-1 py-1.5 text-[11px] leading-tight font-medium flex flex-col items-center justify-center gap-0.5 transition-colors';

export function HomeRelogio({ onMarkConsumption, onLogPast, currentReflection, alerts = [], onEdit = {}, onDelete }) {
  const { t, i18n } = useTranslation();
  const { consumptions = [], allConsumptions, cycles = [], wellbeingLogs = [], weighings = [], goals = [] } = useData();
  // A linha do dia mostra (e deixa editar) todos os registos; o relógio e as
  // contas usam só os da substância principal.
  const listCons = allConsumptions || consumptions;
  const { setShowGoalModal, setShowWellbeingModal, setShowEmotionsModal, setShowReflectionModal, setShowCycleModal, setShowDailyLogModal, setShowThoughtsModal } = useUI();
  // Dias "não registei os consumos": um intervalo (ou o "desde o último") que
  // passe por eles não se sabe — mostra-se "?" e não conta para a meta.
  const { unloggedDates } = useMetrics();

  // Relógio a andar: recalcula de minuto a minuto.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(id); }, []);
  const from = now - DAY_MS;

  const data = useMemo(() => {
    const cons = consumptions.map(tsOf).filter(x => x != null).sort((a, b) => a - b);
    const last = cons.length ? cons[cons.length - 1] : null;
    const cons24 = cons.filter(x => x > from && x <= now);

    // As listas do "ver o dia" fazem-se UMA vez para 3 dias (hoje, ontem e
    // anteontem, dias inteiros — a contagem de cada dia não fica a meio); as
    // de 24 horas saem delas (from3 é sempre anterior a from). Sem limite de
    // cima: um registo acabado de gravar não fica escondido até ao minuto
    // seguinte.
    const from3 = (() => { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 2); return d.getTime() - 1; })();
    const consAll = listCons.map(c => ({ ms: tsOf(c), c })).filter(x => x.ms != null && x.ms > from3);
    const sleepsAll = cycles
      .map(c => { const s = sleepInterval(c); return s ? { ...s, realStart: s.start, cycle: c } : null; })
      .filter(s => s && s.end > from3 && s.start < now);
    const statesAll = wellbeingLogs
      .map(w => ({ ms: tsOf(w), mood: w.mood, energy: w.energy, nap: w.napDuration > 0 ? w.napDuration : null, w }))
      .filter(w => w.ms != null && w.ms > from3);
    const weighAll = weighings.filter(w => !w.notWeighed).map(w => ({ ms: tsOf(w), w })).filter(x => x.ms != null && x.ms > from3);

    // 24h: start/end cortados à janela (para o arco do relógio); realStart
    // guarda a hora a que se deitou de facto (para a lista do dia).
    const sleeps = sleepsAll.filter(s => s.end > from).map(s => ({ ...s, start: Math.max(s.start, from), end: Math.min(s.end, now) }));
    const r24 = {
      cons: consAll.filter(x => x.ms > from),
      sleeps,
      states: statesAll.filter(w => w.ms > from),
      weigh: weighAll.filter(x => x.ms > from && x.ms <= now),
    };

    const todayKey = getTodayKey();
    const todayCount = consumptions.filter(c => getDateKeyFromItem(c) === todayKey).length;

    // Contas dos 3 dias (só substância principal), com o mesmo dia de registo
    // que o "N consumos hoje".
    const counted3 = consumptions.filter(c => { const t = tsOf(c); return t != null && t > from3; });
    const r3 = {
      cons: consAll, sleeps: sleepsAll, states: statesAll, weigh: weighAll,
      count: counted3.length,
      perDay: counted3.reduce((acc, c) => { const k = getDateKeyFromItem(c); acc[k] = (acc[k] || 0) + 1; return acc; }, {}),
    };
    return { last, cons24, sleeps, r24, r3, todayCount };
  }, [consumptions, listCons, cycles, wellbeingLogs, weighings, now, from]);

  // ----- Estado do dia: sono / consumos / intervalo -----
  // Tudo visível de uma vez (sem carrossel). Cada linha só aparece se houver
  // dados; o "cumpre/não cumpre" só aparece onde ela definiu uma meta.
  const [mgStats, setMgStats] = useState(null);
  useEffect(() => {
    getUserStats().then(st => setMgStats(st ? { mg: st.lastMg, ts: st.lastMgTs, byCycle: !!st.lastMgByCycle } : null)).catch(() => {});
  }, [consumptions, weighings]);

  const status = useMemo(() => {
    const goal = (type) => goals.find(g => g.type === type && !g.completed);
    const H = 3600000;
    const fmtH = (h) => `${Math.round(h * 10) / 10}h`.replace('.', ',');
    const out = { sleep: [], cons: [], interval: [] };

    // Sono: último ciclo registado
    const lastCycle = [...cycles].filter(c => tsOf(c) != null).sort((a, b) => tsOf(b) - tsOf(a))[0];
    const cycleStale = lastCycle && now - tsOf(lastCycle) > 36 * H;
    const staleNote = cycleStale ? ` (${new Date(tsOf(lastCycle)).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })})` : '';
    if (lastCycle && lastCycle.sleep != null && lastCycle.sleep !== '' && !isNaN(parseFloat(lastCycle.sleep))) {
      const h = parseFloat(lastCycle.sleep);
      const g = goal('sleep_hours');
      // Sestas do dia do ciclo: somam-se e aparecem ao lado (nas Análises contam
      // junto com o sono da noite). A meta continua a olhar só para a noite.
      const cycDay = lastCycle.date || safeToISODate(lastCycle.timestamp);
      const napMin = wellbeingLogs.filter(w => (w.date || safeToISODate(w.timestamp)) === cycDay && w.napDuration > 0).reduce((a, w) => a + w.napDuration, 0);
      out.sleep.push({
        label: t('home2.slept'),
        value: (h === 0 ? t('home2.noSleep') : fmtH(h)) + (napMin > 0 ? ` + ${t('home2.napShort', { min: napMin })}` : '') + staleNote,
        goal: g && !isNaN(parseFloat(g.target)) ? { ok: meetsGoal('sleep_hours', h, g.target), target: `≥ ${fmtH(parseFloat(g.target))}` } : null,
      });
    }
    if (lastCycle && lastCycle.bedtime) {
      const g = goal('bedtime_before');
      const ok = g ? bedtimeMeetsTarget(lastCycle.bedtime, g.target) : null;
      out.sleep.push({
        label: t('home2.bedtime'),
        value: lastCycle.bedtime + staleNote,
        goal: g && ok != null ? { ok, target: t('home2.until', { time: g.target }) } : null,
      });
    }

    // Consumos (só os da substância principal) desde que acordou
    const cons = consumptions.map(tsOf).filter(x => x != null).sort((a, b) => a - b);
    const wake = lastCycle && !cycleStale ? tsOf(lastCycle) : null;
    // Desde que acordou passou por um dia "não registei os consumos": o 1.º e o
    // último registados podem não ser os verdadeiros — mostra-se, sem julgar.
    const consUnknown = wake != null && gapCrossesDays(wake, now, unloggedDates);
    if (wake != null) {
      const first = cons.find(x => x >= wake);
      const g = goal('first_not_before');
      if (first != null) {
        const after = first - wake;
        out.cons.push({
          label: t('home2.firstAfterWake'),
          value: t('home2.firstValue', { time: hhmm(first), after: agoText(after) }) + (consUnknown ? ' ?' : ''),
          goal: !consUnknown && g && !isNaN(parseFloat(g.target)) ? { ok: meetsGoal('first_not_before', after / H, g.target), target: `≥ ${fmtH(parseFloat(g.target))}` } : null,
        });
      } else {
        out.cons.push({ label: t('home2.firstAfterWake'), value: t('home2.noneYet') });
      }
    }
    const lastC = cons.length ? cons[cons.length - 1] : null;
    if (lastC != null) {
      const g = goal('limit_last');
      let gl = null;
      if (g && wake != null && lastC >= wake && !consUnknown) {
        const deadline = limitLastDeadline(wake, g.target);
        if (deadline != null) gl = { ok: lastC <= deadline, target: t('home2.until', { time: g.target }) };
      }
      out.cons.push({ label: t('home2.last'), value: hhmm(lastC) + (now - lastC > DAY_MS ? ` (${new Date(lastC).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })})` : ''), goal: gl });
    }

    // Intervalo entre os dois últimos
    if (cons.length >= 2) {
      const gap = (cons[cons.length - 1] - cons[cons.length - 2]) / H;
      const unknownGap = gapCrossesDays(cons[cons.length - 2], cons[cons.length - 1], unloggedDates);
      const g = goal('increase_interval');
      out.interval.push({
        label: t('home2.interval'),
        value: unknownGap ? t('home2.unknownGap') : agoText(gap * H),
        goal: !unknownGap && g && !isNaN(parseFloat(g.target)) ? { ok: meetsGoal('increase_interval', gap, g.target), target: `≥ ${fmtH(parseFloat(g.target))}` } : null,
      });
    }
    // mg: só se houver uma pesagem dos últimos 3 dias (senão o número é velho)
    const lastWms = Math.max(-Infinity, ...weighings.filter(w => !w.notWeighed).map(tsOf).filter(x => x != null));
    if (mgStats && mgStats.mg != null && !isNaN(mgStats.mg) && now - lastWms <= 3 * DAY_MS) {
      const g = goal('reduce_quantity');
      const when = mgStats.ts ? new Date(mgStats.ts).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }) : '';
      out.interval.push({
        label: t(mgStats.byCycle ? 'home2.mgCycle' : 'home2.mgDay', { date: when }),
        value: `${Math.round(mgStats.mg)} mg`,
        goal: g && !isNaN(parseFloat(g.target)) ? { ok: meetsGoal('reduce_quantity', mgStats.mg, g.target), target: `≤ ${g.target} mg` } : null,
      });
    }
    return out;
  }, [cycles, consumptions, weighings, wellbeingLogs, goals, mgStats, now, t, i18n.language, unloggedDates]);

  const [showLine, setShowLine] = useState(false);
  const [showSubstances, setShowSubstances] = useState(false);

  const nowH = hourOf(now);
  const [hx, hy] = pt(nowH, 108);
  // O ponteiro começa fora do centro, para não passar por cima do texto.
  const [hx0, hy0] = pt(nowH, 74);
  const hasAnything = data.cons24.length + data.sleeps.length + data.r24.states.length + data.r24.weigh.length > 0;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Relógio das últimas 24 horas */}
      <button
        type="button"
        onClick={() => setShowLine(true)}
        aria-label={t('demoHome.openTimeline')}
        className="relative w-64 h-64 rounded-full transition-transform active:scale-[0.97] hover:ring-2 hover:ring-violet-400/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
      >
        <svg width="256" height="256" viewBox="-20 -20 340 340" aria-hidden="true">
          <circle cx={C} cy={C} r={R} fill="none" className="stroke-gray-700" strokeWidth="22" />
          {data.sleeps.map((s, i) => (
            <path key={`s${i}`} d={arcPath(hourOf(s.start), hourOf(s.end))} fill="none" className="stroke-amber-300/70" strokeWidth="22" strokeLinecap="round" />
          ))}
          {data.cons24.map((ms, i) => { const [x, y] = pt(hourOf(ms), 96); return <circle key={`c${i}`} cx={x} cy={y} r="8" className="fill-rose-300" />; })}
          {data.r24.states.map((s, i) => { const [x, y] = pt(hourOf(s.ms), R); return <rect key={`w${i}`} x={x - 6} y={y - 6} width="12" height="12" rx="3" className="fill-sky-300" />; })}
          {data.r24.weigh.map((s, i) => { const [x, y] = pt(hourOf(s.ms), R); return <rect key={`p${i}`} x={x - 6} y={y - 6} width="12" height="12" rx="3" className="fill-teal-300" />; })}
          <line x1={hx0} y1={hy0} x2={hx} y2={hy} className="stroke-gray-200" strokeWidth="3" strokeLinecap="round" />
          <circle cx={hx} cy={hy} r="6" className="fill-gray-200" />
          {[['00h', 0, 'middle', 150, 2], ['06h', 6, 'start', 296, 155], ['12h', 12, 'middle', 150, 310], ['18h', 18, 'end', 4, 155]].map(([lbl, , anchor, x, y]) => (
            <text key={lbl} x={x} y={y} textAnchor={anchor} fontSize="14" className="fill-gray-500">{lbl}</text>
          ))}
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          {data.last != null ? (
            <>
              {gapCrossesDays(data.last, now, unloggedDates) ? (
                <>
                  <span className="text-3xl font-semibold text-gray-100 leading-none font-mono-theme">?</span>
                  <span className="text-[11px] text-gray-400 mt-1 px-12 leading-tight">{t('demoHome.sinceLastUnknown')}</span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-semibold text-gray-100 leading-none font-mono-theme">{agoText(now - data.last)}</span>
                  <span className="text-[11px] text-gray-400 mt-1">{t('demoHome.sinceLast')}</span>
                </>
              )}
              <span className="mt-1.5 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-teal-500/25 border border-teal-300/60 text-[9px] font-semibold text-teal-50">{t('demoHome.tapHint')} <span aria-hidden="true">›</span></span>
            </>
          ) : (
            <><span className="text-xs text-gray-400 px-10">{t('demoHome.noneYet')}</span><span className="mt-1.5 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-teal-500/25 border border-teal-300/60 text-[9px] font-semibold text-teal-50">{t('demoHome.tapHint')} <span aria-hidden="true">›</span></span></>
          )}
        </span>
      </button>
      {!hasAnything && <p className="text-xs text-gray-500 -mt-2">{t('demoHome.tlEmpty')}</p>}
      {hasAnything && (
        <div className="-mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-gray-400" aria-hidden="true">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-300" />{t('demoHome.tlUse')}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded bg-amber-300/70" />{t('demoHome.msgSleepLabel')}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-sky-300" />{t('demoHome.legendState')}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-teal-300" />{t('demoHome.tlWeigh')}</span>
        </div>
      )}

      <CycleNudge cycles={cycles} now={now} onOpen={() => setShowCycleModal(true)} />

      {/* Botão principal + consumo de outra hora (link discreto, como antes) */}
      <div className="w-full flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onMarkConsumption}
          className="w-full h-14 rounded-full bg-white/75 ring-2 ring-white/60 ring-offset-2 ring-offset-gray-900 border-0 text-gray-900 text-base font-semibold hover:bg-white/85 transition-colors"
        >
          {t('home.markConsumption')}
        </button>
        <button
          type="button"
          onClick={onLogPast}
          className="text-xs text-gray-400 hover:text-gray-200 underline decoration-dotted underline-offset-4 transition-colors"
        >
          {t('home.logPast')}
        </button>
      </div>

      {/* Cores com um só significado (relógio e botões): consumo lilás,
          pesagem verde-água, estado azul, sono amarelo. O botão principal é
          creme (a cor do texto), meio transparente, para se destacar sem
          competir; Metas e Substâncias — o que tu defines — laranja. */}
      {/* Registos: uma fila só. As emoções estão dentro do Bem-estar; o Novo
          Ciclo está no ecrã do dia (tocar no relógio). */}
      <div className="w-full grid grid-cols-3 gap-2">
        <button type="button" onClick={() => setShowWellbeingModal(true)} className={`${OPTION} bg-sky-500/20 border-sky-400/60 text-sky-50 hover:bg-sky-500/30`}><span aria-hidden="true">💙</span>{t('home.wellbeing')}</button>
        <button type="button" onClick={() => setShowDailyLogModal(true)} className={`${OPTION} bg-rose-500/20 border-rose-400/60 text-rose-50 hover:bg-rose-500/30`}><span aria-hidden="true">📊</span>{t('home.registerMg')}</button>
        <button type="button" onClick={() => setShowThoughtsModal(true)} className={`${OPTION} bg-violet-500/20 border-violet-400/60 text-violet-50 hover:bg-violet-500/30`}><span aria-hidden="true">💭</span>{t('home.thoughts')}</button>
      </div>

      {/* Mensagem de Hoje, sem caixa, com a reflexão diária logo à frente */}
      <div className="w-full px-1">
        {currentReflection && (
          <p className="text-sm italic leading-snug text-gray-300">
            <span aria-hidden="true">💜 </span>{currentReflection}
          </p>
        )}
        <button type="button" onClick={() => setShowReflectionModal(true)} className="mt-1 text-xs text-violet-200 hover:text-violet-100">
          📝 {t('home2.reflect')} ›
        </button>
      </div>

      {/* Metas: o que antes eram os avisos, bem à vista. Cada meta num cartão
          com cor (só existe porque ela a definiu). Tocar no título muda-as. */}
      {(() => {
        const rows = [['sleep', '🌙'], ['cons', '☀️'], ['interval', '⏱']].flatMap(([k, icon]) => status[k].map(r => ({ ...r, icon })));
        const withGoal = rows.filter(r => r.goal);
        const plain = rows.filter(r => !r.goal);
        return (
          <>
            <div className="w-full px-1">
              {withGoal.length > 0 && (
                <div className="grid grid-cols-1 gap-1.5">
                  {withGoal.map((r, i) => (
                    <div key={i} className={'flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ' + (r.goal.ok ? 'bg-green-500/15 border-green-400/45' : 'bg-yellow-500/12 border-yellow-400/45')}>
                      <span className="text-xs text-gray-200"><span aria-hidden="true">{r.icon} </span>{r.label} <span className="font-semibold text-gray-50">{r.value}</span></span>
                      <span className={'text-[11px] font-semibold whitespace-nowrap ' + (r.goal.ok ? 'text-green-200' : 'text-yellow-200')}>
                        {r.goal.ok ? `✓ ${t('home2.goalOk', { target: r.goal.target })}` : t('home2.goalOff', { target: r.goal.target })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {plain.length > 0 && (
              <div className="w-full px-1">
                <div className="text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-700/60 pb-1 mb-1">{t('home2.summary')}</div>
                {plain.map((r, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-3 py-1 border-b border-gray-800/80">
                    <span className="text-xs text-gray-400"><span aria-hidden="true" className="inline-block w-5">{r.icon}</span>{r.label}</span>
                    <span className="text-xs text-gray-100 text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        );
      })()}

      {/* Esta semana: bolinhas pequenas */}
      <WeekDots goals={goals} />

      {/* Mesmo no fim: definir metas e substâncias, lado a lado */}
      <div className="w-full grid grid-cols-2 gap-2 mt-2">
        <button type="button" onClick={() => setShowGoalModal(true)} className="py-3 rounded-2xl text-sm font-semibold bg-orange-500/20 border border-orange-400/60 text-orange-50 hover:bg-orange-500/30">🎯 {t('home.goals')}</button>
        <button type="button" onClick={() => setShowSubstances(true)} className="py-3 rounded-2xl text-sm font-semibold bg-orange-500/20 border border-orange-400/60 text-orange-50 hover:bg-orange-500/30">🧪 {t('home2.substances')}</button>
      </div>
      <SubstancesModal isOpen={showSubstances} onClose={() => setShowSubstances(false)} />

      {showLine && (
        <DayTimeline
          data={data}
          now={now}
          onClose={() => setShowLine(false)}
          onNewCycle={() => { setShowLine(false); setShowCycleModal(true); }}
          // Editar fecha a linha do dia primeiro (o modal de edição fica por baixo dela).
          onEdit={(kind, record) => { const fn = onEdit[kind]; if (!fn) return; setShowLine(false); fn(record); }}
          canEdit={(kind) => typeof onEdit[kind] === 'function'}
          // Apagar pergunta sempre antes (o aviso de confirmação fica por cima
          // da linha do dia, que continua aberta).
          onDelete={onDelete ? (kind, record) => onDelete(DELETE_COLLECTION[kind], record.id) : null}
        />
      )}
    </div>
  );
}

// ===== LINHA DO DIA (as últimas 24 horas, por ordem) =====
// "Já dormiste?" — quando há muito tempo sem ciclo registado. Sem o acordar,
// a app não sabe onde começa o dia (a meta de mg e as de 1.º/último consumo
// contam de acordar a acordar). Só pergunta; nunca regista nada sozinha.
const NUDGE_AFTER_MS = 20 * 3600000;
const NUDGE_SNOOZE_KEY = 'nep_cycle_nudge_until';
function CycleNudge({ cycles, now, onOpen }) {
  const { t, i18n } = useTranslation();
  const [snoozeUntil, setSnoozeUntil] = useState(() => { try { return Number(localStorage.getItem(NUDGE_SNOOZE_KEY)) || 0; } catch { return 0; } });
  const lastMs = useMemo(() => Math.max(-Infinity, ...cycles.map(tsOf).filter(x => x != null)), [cycles]);
  // Só para quem usa ciclos (pelo menos 2): a quem nunca registou não se pede nada.
  if (cycles.length < 2 || !Number.isFinite(lastMs) || now - lastMs < NUDGE_AFTER_MS || now < snoozeUntil) return null;
  const when = new Date(lastMs).toLocaleString(i18n.language, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const snooze = () => { const until = Date.now() + 4 * 3600000; setSnoozeUntil(until); try { localStorage.setItem(NUDGE_SNOOZE_KEY, String(until)); } catch { /* sem armazenamento: só nesta sessão */ } };
  return (
    <div className="w-full rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
      <p>{t('home2.cycleNudge', { when })}</p>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onOpen} className="flex-1 py-2 rounded-xl bg-amber-500/25 border border-amber-400/50 font-semibold hover:bg-amber-500/35">{t('home2.cycleNudgeOpen')}</button>
        <button type="button" onClick={snooze} className="px-3 py-2 rounded-xl text-amber-100/80 hover:text-amber-50">{t('home2.cycleNudgeLater')}</button>
      </div>
    </div>
  );
}

const DELETE_COLLECTION = { consumption: 'consumptions', cycle: 'cycles', wellbeing: 'wellbeingLogs' };

function DayTimeline({ data, now, onClose, onEdit, onNewCycle, onDelete, canEdit = () => false }) {
  const { unloggedDates: unloggedTl } = useMetrics();
  const { t, i18n } = useTranslation();
  const [openGroup, setOpenGroup] = useState(null);
  // 24 horas ou 3 dias (para ver uma sessão de vários dias de uma vez).
  const [range, setRange] = useState(() => { try { return localStorage.getItem('nep_tl_range') === '3d' ? '3d' : '24h'; } catch { return '24h'; } });
  const chooseRange = (r) => { setRange(r); try { localStorage.setItem('nep_tl_range', r); } catch { /* só nesta sessão */ } };
  const three = range === '3d';
  const src = three ? data.r3 : data.r24;
  const items = [
    ...src.sleeps.map(s => ({ ms: s.realStart ?? s.start, kind: 'sleep', hours: s.hours, record: s.cycle })),
    ...src.cons.map(x => ({ ms: x.ms, kind: 'use', record: x.c })),
    ...src.states.map(s => ({ ms: s.ms, kind: 'state', mood: s.mood, energy: s.energy, nap: s.nap, record: s.w })),
    ...src.weigh.map(x => ({ ms: x.ms, kind: 'weigh', w: x.w })),
  ].map(it => ({ ...it, dk: safeToISODate(it.ms) })).sort((a, b) => a.ms - b.ms)
    // Vários consumos no mesmo minuto ficam numa linha só ("consumo × 3").
    .reduce((acc, it) => {
      const prev = acc[acc.length - 1];
      if (it.kind === 'use' && prev && prev.kind === 'use' && Math.floor(prev.ms / 60000) === Math.floor(it.ms / 60000)) { prev.n += 1; prev.records.push(it.record); return acc; }
      acc.push(it.kind === 'use' ? { ...it, n: 1, records: [it.record] } : it);
      return acc;
    }, []);

  // O mesmo que o cartão da pesagem no Histórico: numa pesagem em que se
  // enche, o que interessa é QUANTO se pôs (e se o saco já estava vazio);
  // só numa pesagem sem encher é que o número é "o que há no saco".
  const weighText = (w) => {
    const left = (typeof w.before === 'number' && typeof w.empty === 'number') ? Math.round(w.before - w.empty) : null;
    const added = (typeof w.full === 'number' && typeof w.before === 'number') ? Math.round(w.full - w.before) : null;
    if (w.notWeighed) return t('demoHome.tlWeighNoScale');
    if (w.noRefill) return left != null ? t('demoHome.tlWeighLeft', { mg: left }) : t('demoHome.tlWeigh');
    if (added != null && added > 0) {
      const base = t('demoHome.tlWeighAdded', { mg: added });
      if (left === 0) return `${base} · ${t('demoHome.tlWeighWasEmpty')}`;
      if (left != null && left > 0) return `${base} · ${t('demoHome.tlWeighHad', { mg: left })}`;
      return base;
    }
    return t('demoHome.tlWeigh');
  };

  return (
    <div className="fixed inset-0 z-[75] bg-gray-900 overflow-y-auto" role="dialog" aria-modal="true" aria-label={t('demoHome.tlTitle')}>
      <div className="max-w-md mx-auto px-5 pt-14 pb-10">
        <button type="button" onClick={onClose} className="text-sm text-gray-400 hover:text-gray-200 mb-3">‹ {t('demoHome.tlBack')}</button>
        <div className="flex gap-1 mb-3 bg-gray-800 rounded-full p-1 w-fit" role="tablist">
          {[['24h', t('demoHome.tlRange24')], ['3d', t('demoHome.tlRange3d')]].map(([r, label]) => (
            <button key={r} type="button" role="tab" aria-selected={range === r} onClick={() => chooseRange(r)}
              className={'px-4 py-1.5 rounded-full text-sm ' + (range === r ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-300 hover:text-gray-100')}>
              {label}
            </button>
          ))}
        </div>
        <h2 className="text-2xl font-semibold text-gray-100 mb-1">{three ? t('demoHome.tlTitle3d') : t('demoHome.tlTitle')}</h2>
        <p className="text-sm text-gray-400 mb-4">{three ? t('demoHome.tl3dCount', { count: data.r3.count }) : t('demoHome.msgToday', { count: data.todayCount })}</p>
        {onNewCycle && (
          <button type="button" onClick={onNewCycle} className="w-full mb-5 py-3 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-100 text-sm font-semibold hover:bg-amber-500/25">
            🌙 {t('home.newCycle')}
          </button>
        )}

        {items.length === 0 && <p className="text-sm text-gray-400">{t('demoHome.tlEmpty')}</p>}

        <ol className="flex flex-col">
          {items.map((it, i) => [
            // Na vista de 3 dias, um cabeçalho quando muda o dia.
            three && (i === 0 || items[i - 1].dk !== it.dk) && (
              <li key={`d${i}`} className="flex items-baseline justify-between pt-4 pb-1 mb-1 border-b border-gray-700/70">
                <span className="text-sm font-semibold text-gray-100 capitalize">{new Date(it.ms).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                <span className="text-xs text-gray-400">{t('demoHome.tlDayCount', { count: data.r3.perDay[it.dk] || 0 })}</span>
              </li>
            ),
            <li key={i} className="grid grid-cols-[52px_20px_1fr_auto] items-center min-h-[42px]">
              <span className="text-xs text-gray-400">{hhmm(it.ms)}</span>
              <span className="flex justify-center">
                {it.kind === 'use' && <span className="w-3 h-3 rounded-full bg-rose-300" />}
                {it.kind === 'sleep' && <span className="w-2 h-8 rounded bg-amber-300/70" />}
                {it.kind === 'state' && <span className="w-3 h-3 rounded-sm bg-sky-300" />}
                {it.kind === 'weigh' && <span className="w-3 h-3 rounded-sm bg-teal-300" />}
              </span>
              <span className="text-sm text-gray-200">
                {it.kind === 'use' && <>{t('demoHome.tlUse')}{it.n > 1 ? ` × ${it.n}` : ''}{(() => { const f = formatSubstances(it.records.flatMap(r => r?.substances || [])); return f ? <span className="text-xs text-gray-400"> · {f}</span> : null; })()}</>}
                {it.kind === 'sleep' && <span className="inline-block px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-100">{t('demoHome.tlSleep')} · {it.hours}h</span>}
                {it.kind === 'state' && (
                  <span className="inline-flex flex-wrap gap-1">
                    {(it.mood != null || it.energy != null) && <span className="inline-block px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/25 text-sky-100 text-xs">{t('demoHome.tlState', { mood: it.mood ?? '–', energy: it.energy ?? '–' })}</span>}
                    {it.nap != null && <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-100 text-xs">🛌 {t('demoHome.tlNap', { min: it.nap })}</span>}
                    {it.record?.exerciseType && <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/25 text-emerald-100 text-xs">🏃 {it.record.exerciseType}{it.record.exerciseDuration ? ` · ${it.record.exerciseDuration} min` : ''}</span>}
                    {it.record?.waterGlasses > 0 && <span className="inline-block px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/25 text-sky-100 text-xs">💧 {it.record.waterGlasses} ml</span>}
                    {it.mood == null && it.energy == null && it.nap == null && !it.record?.exerciseType && !(it.record?.waterGlasses > 0) && <span className="inline-block px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/25 text-sky-100 text-xs">{t('home.wellbeing')}</span>}
                  </span>
                )}
                {it.kind === 'weigh' && <span className="inline-block px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-100 text-xs">{weighText(it.w)}</span>}
              </span>
              {/* Editar directamente daqui (consumos, sono, estado) */}
              <span className="flex gap-1 justify-end">
                {it.kind === 'use' && it.n > 1 && (
                  <button type="button" onClick={() => setOpenGroup(g => (g === it.ms ? null : it.ms))} aria-expanded={openGroup === it.ms} className="px-2 py-1 text-xs text-gray-300 hover:text-gray-100">
                    {openGroup === it.ms ? '▴' : '▾'}
                  </button>
                )}
                {it.kind === 'use' && it.n === 1 && it.records.map((r, k) => (
                  <span key={k} className="flex">
                    {canEdit('consumption') && <button type="button" onClick={() => onEdit('consumption', r)} aria-label={t('demoHome.tlEdit')} className="p-2 text-gray-400 hover:text-gray-100"><Icons.Edit className="w-4 h-4" /></button>}
                    {onDelete && <button type="button" onClick={() => onDelete('consumption', r)} aria-label={t('demoHome.tlDelete')} className="p-2 text-gray-500 hover:text-red-300"><Icons.Trash2 className="w-4 h-4" /></button>}
                  </span>
                ))}
                {[['sleep', 'cycle'], ['state', 'wellbeing']].map(([kindIt, kind]) => (it.kind === kindIt && it.record) ? (
                  <span key={kind} className="flex">
                    {canEdit(kind) && <button type="button" onClick={() => onEdit(kind, it.record)} aria-label={t('demoHome.tlEdit')} className="p-2 text-gray-400 hover:text-gray-100"><Icons.Edit className="w-4 h-4" /></button>}
                    {onDelete && <button type="button" onClick={() => onDelete(kind, it.record)} aria-label={t('demoHome.tlDelete')} className="p-2 text-gray-500 hover:text-red-300"><Icons.Trash2 className="w-4 h-4" /></button>}
                  </span>
                ) : null)}
              </span>
            </li>,
            // Consumos do mesmo minuto, abertos: um por linha, cada um com lápis e caixote.
            it.kind === 'use' && it.n > 1 && openGroup === it.ms && it.records.map((r, k) => (
              <li key={`${i}-${k}`} className="grid grid-cols-[52px_20px_1fr_auto] items-center min-h-[36px] text-xs">
                <span />
                <span className="flex justify-center"><span className="w-1.5 h-1.5 rounded-full bg-rose-300/70" /></span>
                <span className="text-gray-300">{t('demoHome.tlUse')} {k + 1}{(() => { const f = formatSubstances(r?.substances || []); return f ? <span className="text-gray-400"> · {f}</span> : null; })()}</span>
                <span className="flex">
                  {canEdit('consumption') && <button type="button" onClick={() => onEdit('consumption', r)} aria-label={t('demoHome.tlEdit')} className="p-2 text-gray-400 hover:text-gray-100"><Icons.Edit className="w-4 h-4" /></button>}
                  {onDelete && <button type="button" onClick={() => onDelete('consumption', r)} aria-label={t('demoHome.tlDelete')} className="p-2 text-gray-500 hover:text-red-300"><Icons.Trash2 className="w-4 h-4" /></button>}
                </span>
              </li>
            )),
          ])}
          <li className="grid grid-cols-[52px_20px_1fr_auto] items-center min-h-[52px]">
            <span className="text-xs font-semibold text-gray-200">{t('demoHome.tlNow')}</span>
            <span className="flex justify-center"><span className="w-3.5 h-3.5 rounded-full border-[3px] border-gray-200" /></span>
            <span className="text-sm text-gray-400">{hhmm(now)}{data.last != null && !gapCrossesDays(data.last, now, unloggedTl) ? ` · ${t('demoHome.tlSince', { ago: agoText(now - data.last) })}` : ''}</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

// Os consumos de cada um dos últimos 7 dias (só a substância principal), em
// bolinhas pequenas. Cor de juízo só se ela tiver meta de frequência.
function WeekDots({ goals }) {
  const { t, i18n } = useTranslation();
  const { consumptionsByDate = {}, unloggedDates } = useMetrics();
  const freqGoal = goals.find(g => g.type === 'reduce_frequency' && !g.completed);
  const target = freqGoal ? parseFloat(freqGoal.target) : null;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = getDateDaysAgo(6 - i);
    const k = safeToISODate(d);
    return {
      k,
      count: consumptionsByDate[k] || 0,
      // Marcado "não registei": fica de fora das contas, por isso não é um 0, é "não sei".
      unknown: !!unloggedDates?.has(k),
      label: i === 6 ? t('home.today') : new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(d).replace(/\.$/, ''),
      isToday: i === 6,
    };
  });
  const total = days.reduce((s, d) => s + d.count, 0);
  const dot = (n) => {
    if (n === 0) return 'bg-gray-700/60 text-gray-500';
    if (Number.isFinite(target)) return meetsGoal('reduce_frequency', n, target) ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40' : 'bg-yellow-500/20 text-yellow-200 ring-1 ring-yellow-400/40';
    return 'bg-rose-500/20 text-rose-100 ring-1 ring-rose-400/40';
  };
  return (
    <section className="w-full px-1">
      <div className="flex justify-between items-center mb-1.5 border-b border-gray-700/60 pb-1">
        <span className="text-[11px] uppercase tracking-wide text-gray-500">{t('home.thisWeek')}</span>
        <span className="text-[11px] text-gray-500">{total}x{Number.isFinite(target) ? ` · ${t('home.goalTarget')}: ≤${target}x` : ''}</span>
      </div>
      <div className="flex justify-between">
        {days.map(d => (
          <div key={d.k} className="flex flex-col items-center gap-0.5">
            {d.unknown ? (
              <div title={t('home.notLoggedDay')} aria-label={t('home.notLoggedDay')} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border border-dashed border-gray-600 text-gray-500 ${d.isToday ? 'ring-2 ring-gray-200/40' : ''}`}>?</div>
            ) : (
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${dot(d.count)} ${d.isToday ? 'ring-2 ring-gray-200/40' : ''}`}>{d.count}</div>
            )}
            <span className={`text-[10px] ${d.isToday ? 'text-gray-100 font-semibold' : 'text-gray-400'}`}>{d.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
