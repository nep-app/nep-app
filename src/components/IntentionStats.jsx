import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { safeToISODate } from '../utils/helpers';
import { diffPermutation, MIN_PER_WINDOW } from '../utils/stats';
import { INTENTION_KEYS, HOW_KEYS, OUTCOME_KEYS, intentionLabel, howLabel, hasIntentionData } from './Intention';

// ===== ANÁLISES · INTENÇÃO E "CORREU COMO QUERIAS?" =====
// - Só aparece se houver dados (intenção, "como" ou avaliação).
// - Só entram consumos AVALIADOS (sim / mais ou menos / não). Dispensados e
//   sem resposta ficam de fora: a app não adivinha.
// - "a de b" com b < 5 → "poucos registos (b)", sem barra nem número de taxa.
// - Ordem FIXA da lista (nunca pela percentagem). Barras cinzentas.
// - Comparação "com / sem" (só no "Como?") com teste de permutação; quando
//   não se distingue do acaso, diz-se.

const MIN_N = 5;
const PERM_M = 2000;

const dayOf = (c) => c.date || safeToISODate(c.timestamp || c.createdAt);
const isEvaluated = (c) => OUTCOME_KEYS.includes(c?.evaluation?.outcome);

export function IntentionStats({ consumptions }) {
  const { t, i18n } = useTranslation();

  const data = useMemo(() => {
    const list = (consumptions || []).filter(c => c && dayOf(c));
    const marked = list.filter(hasIntentionData);
    if (marked.length === 0) return null;
    const since = marked.map(dayOf).sort()[0];
    const inRange = list.filter(c => dayOf(c) >= since);
    const evaluated = inRange.filter(isEvaluated);

    const count = (arr) => {
      const r = { yes: 0, partly: 0, no: 0, n: arr.length };
      arr.forEach(c => { r[c.evaluation.outcome]++; });
      return r;
    };
    const has = (field, key) => (c) => Array.isArray(c[field]) && c[field].includes(key);

    // Intenções: lista fixa + as escritas à mão (por ordem alfabética), só as
    // que aparecem em consumos avaliados.
    const customs = [...new Set(evaluated.flatMap(c => (Array.isArray(c.intentions) ? c.intentions : []))
      .filter(k => typeof k === 'string' && !INTENTION_KEYS.includes(k)))].sort((a, b) => a.localeCompare(b));
    const intentionRows = [...INTENTION_KEYS, ...customs]
      .map(k => ({ key: k, ...count(evaluated.filter(has('intentions', k))) }))
      .filter(r => r.n > 0);

    const howRows = HOW_KEYS.map(k => {
      const withArr = evaluated.filter(has('how', k));
      const row = { key: k, ...count(withArr) };
      if (row.n === 0) return row;
      // Com / sem esta etiqueta, entre os consumos avaliados que têm alguma
      // resposta no "Como?" (quem não respondeu ao "Como?" não diz "não").
      const answeredHow = evaluated.filter(c => Array.isArray(c.how) && c.how.length > 0);
      const withoutArr = answeredHow.filter(c => !c.how.includes(k));
      row.without = count(withoutArr);
      if (withArr.length >= MIN_PER_WINDOW && withoutArr.length >= MIN_PER_WINDOW) {
        const yes = (c) => (c.evaluation.outcome === 'yes' ? 1 : 0);
        row.p = diffPermutation(withoutArr.map(yes), withArr.map(yes), PERM_M).p;
      }
      return row;
    }).filter(r => r.n > 0);

    return { since, total: inRange.length, nEval: evaluated.length, intentionRows, howRows };
  }, [consumptions]);

  if (!data) return null;

  const sinceDate = (() => {
    const [y, m, d] = data.since.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const sameYear = y === new Date().getFullYear();
    return dt.toLocaleDateString(i18n.language, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  const pShown = (p) => Number(p.toFixed(3));
  const fmtP = (p) => {
    const b = Math.round(p * (PERM_M + 1)) - 1;
    return b <= 0
      ? t('estadoTab.pLessThan', { m: PERM_M, defaultValue: 'p: menos de 1 em {{m}}' })
      : t('estadoTab.pValue', { p: pShown(p).toLocaleString(i18n.language), defaultValue: 'p = {{p}}' });
  };
  const verdict = (p) => pShown(p) < 0.05
    ? t('estadoTab.notChance', { p: fmtP(p), defaultValue: 'dificilmente é só acaso ({{p}})' })
    : t('estadoTab.chance', { p: fmtP(p), defaultValue: 'não se distingue do acaso ({{p}})' });

  const Row = ({ label, r, extra }) => (
    <div className="py-2.5 border-b border-gray-700/60 last:border-0">
      <div className="flex justify-between items-baseline gap-3 text-sm">
        <span className={r.n < MIN_N ? 'text-gray-500' : 'text-gray-200'}>{label}</span>
        {r.n < MIN_N ? (
          <span className="text-xs text-gray-500">{t('intentionStats.few', { n: r.n, defaultValue: 'poucos registos ({{n}})' })}</span>
        ) : (
          <span className="text-xs text-gray-300">
            {t('intentionStats.aOfB', { a: r.yes, b: r.n, defaultValue: 'correu como querias: {{a}} de {{b}}' })}
          </span>
        )}
      </div>
      {r.n >= MIN_N && (
        <>
          <div className="h-1.5 rounded bg-gray-700 mt-1.5 overflow-hidden">
            <div className="h-full bg-gray-400" style={{ width: `${(r.yes / r.n) * 100}%` }} />
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {t('intentionStats.breakdown', { yes: r.yes, partly: r.partly, no: r.no, defaultValue: 'sim {{yes}} · mais ou menos {{partly}} · não {{no}}' })}
          </p>
        </>
      )}
      {extra}
    </div>
  );

  const nCompared = data.howRows.filter(r => r.p !== undefined).length;

  return (
    <div className="bg-gray-800 border-gray-700 rounded-xl p-6 border">
      <h3 className="text-lg font-semibold mb-1 text-white">{t('intentionStats.title', 'Intenção · correu como querias?')}</h3>
      <p className="text-xs text-gray-400 mb-4">
        {t('intentionStats.since', { date: sinceDate, x: data.nEval, y: data.total, defaultValue: 'Desde {{date}} · {{x}} de {{y}} consumos avaliados' })}
      </p>

      {data.nEval === 0 ? (
        <p className="text-sm text-gray-400">{t('intentionStats.noneEvaluated', 'Ainda não há consumos avaliados. A pergunta «correu como querias?» liga-se nas Definições; também se pode responder ao editar um consumo no Histórico.')}</p>
      ) : (
        <>
          {data.intentionRows.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-300 mb-1">{t('intentionStats.byIntention', 'Por intenção')}</p>
              {data.intentionRows.map(r => <Row key={'i-' + r.key} label={intentionLabel(t, r.key)} r={r} />)}
            </div>
          )}
          {data.howRows.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-300 mb-1">{t('intentionStats.byHow', 'Por «Como?»')}</p>
              {data.howRows.map(r => (
                <Row key={'h-' + r.key} label={howLabel(t, r.key)} r={r} extra={r.p !== undefined ? (
                  <p className="text-[11px] text-gray-400 mt-1">
                    {t('intentionStats.compare', { c: r.without.yes, d: r.without.n, verdict: verdict(r.p), defaultValue: 'Nos outros consumos com «Como?» respondido: {{c}} de {{d}} — a diferença {{verdict}}.' })}
                  </p>
                ) : null} />
              ))}
              {nCompared > 1 && (
                <p className="text-[11px] text-gray-500 mt-2">{t('estadoTab.compareMultiple', { k: nCompared, defaultValue: 'São {{k}} comparações ao mesmo tempo: é normal uma ou outra parecer diferente só por acaso.' })}</p>
              )}
            </div>
          )}
          <p className="text-[11px] text-gray-500 leading-relaxed">
            {t('intentionStats.note', { min: MIN_N, defaultValue: '«sim» = correu como querias. A cinzento: menos de {{min}} avaliações, ainda não se diz nada. Os consumos sem avaliação não entram — a app não adivinha. Nenhuma intenção é melhor do que outra: isto só mostra o que aconteceu.' })}
          </p>
        </>
      )}
    </div>
  );
}
