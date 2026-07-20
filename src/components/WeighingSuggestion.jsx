import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../contexts/DataContext';
import { typicalMgPerDose, detectForgottenRefills } from '../utils/mgDerivation';

/**
 * Sugestão GENTIL (Fase 2): quando um ciclo pesado dá um mg/dose muito abaixo do
 * típico da utilizadora, a app pergunta "esqueceste-te de pesar?" — mas SÓ sugere,
 * nunca decide. A resposta fica guardada na própria pesagem de fecho do ciclo:
 *   - "sim, esqueci"  → forgottenRefill=true (o intervalo passa a estimado)
 *   - "não, foi assim" → confirmedLow=true (não volta a sugerir)
 */
export const WeighingSuggestion = () => {
  const { t } = useTranslation();
  const { weighings, consumptions, updateWeighing } = useData();
  const [busy, setBusy] = useState(false);

  const suspicion = useMemo(() => {
    const typical = typicalMgPerDose(weighings, consumptions);
    const list = detectForgottenRefills(weighings, consumptions, typical);
    return list.find(s => s.closingId) || null; // a primeira que dá para marcar
  }, [weighings, consumptions]);

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

  return (
    <div className="bg-amber-900/25 border border-amber-700/50 rounded-xl p-4 mb-4">
      <div className="text-sm text-amber-200 font-medium mb-1">⚖️ {t('weighingSuggestion.title')}</div>
      <p className="text-sm text-gray-300 mb-3">
        {t('weighingSuggestion.body', { mgDose: suspicion.mgPerDose, typical: suspicion.typical })}
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
    </div>
  );
};
