import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { typicalMgPerDose, detectForgottenRefills } from '../utils/mgDerivation';

// Sugestões que a pessoa adiou ("agora não"). Fica só neste telemóvel de
// propósito: não é um dado sobre ela, é só para a app não voltar a insistir já.
const SNOOZED_KEY = 'nep-weighing-suggestion-snoozed';

const readSnoozed = () => {
  try { return JSON.parse(localStorage.getItem(SNOOZED_KEY) || '[]'); } catch { return []; }
};

/**
 * Sugestão GENTIL (Fase 2): quando um ciclo pesado dá um mg/dose muito abaixo do
 * típico da utilizadora, a app pergunta "esqueceste-te de pesar?" — mas SÓ sugere,
 * nunca decide. A resposta fica guardada na própria pesagem de fecho do ciclo:
 *   - "sim, esqueci"  → forgottenRefill=true (o intervalo passa a estimado)
 *   - "não, foi assim" → confirmedLow=true (não volta a sugerir)
 *
 * A pergunta TEM de dizer de que período se trata e com que números. Sem isso é
 * impossível de responder: a pessoa não sabe a que dia se refere nem o que a app
 * viu, e fica a adivinhar sobre os seus próprios dados.
 */
export const WeighingSuggestion = () => {
  const { t, i18n } = useTranslation();
  const isEN = i18n.language === 'en';
  const { weighings, consumptions, updateWeighing } = useData();
  const { unloggedDates } = useMetrics();
  const [busy, setBusy] = useState(false);
  const [snoozed, setSnoozed] = useState(readSnoozed);

  useEffect(() => {
    try { localStorage.setItem(SNOOZED_KEY, JSON.stringify(snoozed)); } catch { /* best-effort */ }
  }, [snoozed]);

  const suspicion = useMemo(() => {
    const typical = typicalMgPerDose(weighings, consumptions, { unloggedDates });
    const list = detectForgottenRefills(weighings, consumptions, typical);
    return list.find(s => s.closingId && !snoozed.includes(s.closingId)) || null;
  }, [weighings, consumptions, unloggedDates, snoozed]);

  if (!suspicion) return null;

  const respond = async (field) => {
    if (!suspicion.closingId || busy) return;
    setBusy(true);
    try {
      await updateWeighing(suspicion.closingId, { [field]: true });
    } finally {
      setBusy(false);
    }
  };

  const fmt = (ms) => new Date(ms).toLocaleString(i18n.language, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  // Quanto se esperaria ter saído se cada toque valesse o normal dela.
  const expected = Math.round(suspicion.typical * suspicion.doseCount);

  return (
    <div className="bg-amber-900/25 border border-amber-700/50 rounded-xl p-4 mb-4">
      <div className="text-sm text-amber-200 font-medium mb-1">⚖️ {t('weighingSuggestion.title')}</div>

      {/* OS NÚMEROS PRIMEIRO: qual é o período e o que a app viu lá. */}
      <div className="bg-gray-900/40 rounded-lg px-3 py-2 mb-2">
        <div className="text-xs text-gray-300">
          {isEN ? 'Between the weighing of ' : 'Entre a pesagem de '}
          <span className="text-white">{fmt(suspicion.startTs)}</span>
          {isEN ? ' and the one of ' : ' e a de '}
          <span className="text-white">{fmt(suspicion.endTs)}</span>:
        </div>
        <div className="text-xs text-gray-400 mt-1 leading-relaxed">
          {isEN
            ? <>the scale says <span className="text-amber-200 font-medium">{suspicion.consumed} mg</span> left the bag, with <span className="text-amber-200 font-medium">{suspicion.doseCount} uses</span> logged — that is ≈{suspicion.mgPerDose} mg per use. At your usual ~{suspicion.typical} mg, those {suspicion.doseCount} uses would be around {expected} mg.</>
            : <>a balança diz que saíram <span className="text-amber-200 font-medium">{suspicion.consumed} mg</span> do saco, com <span className="text-amber-200 font-medium">{suspicion.doseCount} toques</span> registados — dá ≈{suspicion.mgPerDose} mg por toque. Ao teu normal (~{suspicion.typical} mg), esses {suspicion.doseCount} toques dariam à volta de {expected} mg.</>}
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-3 leading-relaxed">
        {isEN
          ? 'A refill you did not weigh looks exactly like this: the bag was topped up in the middle, so the difference between the two weighings comes out smaller than what really left it.'
          : 'Um enchimento que não foi pesado dá exactamente este resultado: o saco foi atestado a meio, por isso a diferença entre as duas pesagens sai mais pequena do que o que saiu mesmo.'}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => respond('forgottenRefill')}
          disabled={busy}
          className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {t('weighingSuggestion.yesForgot')}
        </button>
        <button
          onClick={() => respond('confirmedLow')}
          disabled={busy}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-200 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {t('weighingSuggestion.noReal')}
        </button>
      </div>
      {/* Não saber é uma resposta legítima — não se obriga ninguém a decidir
          sobre os próprios dados só para o cartão desaparecer. */}
      <button
        onClick={() => setSnoozed(prev => [...prev, suspicion.closingId])}
        disabled={busy}
        className="w-full mt-2 text-xs text-gray-500 hover:text-gray-300 underline disabled:opacity-50"
      >
        {isEN ? "I don't know — ask me later" : 'Não sei — pergunta-me depois'}
      </button>
      <p className="text-[11px] text-gray-500 mt-2 leading-snug">
        {isEN
          ? '"I forgot" leaves this period without mg (nothing is invented). "It was really like that" keeps the measured value.'
          : '"Esqueci-me" deixa este período sem mg (não se inventa nada). "Foi mesmo assim" mantém o valor medido.'}
      </p>
    </div>
  );
};
