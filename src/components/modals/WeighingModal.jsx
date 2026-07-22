import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../Icons';

// IMPORTANTE: definido FORA do modal. Se estivesse dentro, o React recriava o
// componente a cada tecla e o campo perdia o foco (não dava para escrever).
const WField = ({ label, value, onChange, placeholder, hint }) => (
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-300">{label}</label>
    <input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-gray-700 border-gray-600 text-white w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400"
    />
    {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
  </div>
);

// Valor "agora" no formato do input datetime-local (YYYY-MM-DDTHH:MM), em hora LOCAL.
const nowLocalInput = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/**
 * "Registar pesagem" — regista o peso do saco para a app derivar os mg sozinha.
 * Trabalha por DIFERENÇAS de peso (não pede a tara, não obriga a esvaziar).
 *
 * Casos:
 *  - normal:  mesmo saco, acabou → só pede o peso CHEIO (reutiliza o vazio guardado).
 *  - sobrou:  ficou resto → pede o peso ATUAL (com o resto) + o cheio.
 *  - novo:    saco fisicamente novo → pede o VAZIO novo + o cheio (opcional: resto do antigo).
 *  - naoPesei: encheu sem pesar → marca o intervalo como "sem peso" (não inventa mg).
 */
export const WeighingModal = ({ isOpen, onClose, weighings = [], onSubmit }) => {
  const { t } = useTranslation();

  // Vazio conhecido do saco atual = a pesagem mais recente com 'empty' definido.
  const known = useMemo(() => {
    const sorted = [...weighings]
      .filter(w => w && w.timestamp && !w.notWeighed)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const lastEmpty = sorted.find(w => w.empty != null)?.empty ?? null;
    const lastFull = sorted.find(w => w.full != null)?.full ?? null;
    return { lastEmpty, lastFull };
  }, [weighings]);

  const firstEver = known.lastEmpty == null;
  // Primeira vez de sempre → começa já em modo "saco novo" (precisa do vazio).
  const [mode, setMode] = useState(firstEver ? 'novo' : 'normal');
  const [full, setFull] = useState('');
  const [before, setBefore] = useState('');       // peso atual (sobrou)
  const [empty, setEmpty] = useState('');         // vazio (novo)
  const [leftoverPrev, setLeftoverPrev] = useState(''); // resto do saco antigo (opcional)
  const [when, setWhen] = useState('');                 // data/hora da pesagem (local)

  // Reset ao abrir/fechar
  React.useEffect(() => {
    if (isOpen) {
      setMode(firstEver ? 'novo' : 'normal');
      setFull(''); setBefore(''); setEmpty(''); setLeftoverPrev('');
      setWhen(nowLocalInput()); // por defeito, agora — mas o utilizador pode mudar
    }
  }, [isOpen, firstEver]);

  if (!isOpen) return null;

  const num = (v) => (v === '' || v == null || isNaN(parseFloat(v)) ? null : parseFloat(v));

  // 'before' efetivo consoante o modo (o que o saco pesava mesmo antes de encher).
  const effectiveBefore =
    mode === 'sobrou' ? num(before) :
    mode === 'novo' ? num(empty) :
    known.lastEmpty; // normal → vazio guardado

  const fullN = num(full);
  const added = (fullN != null && effectiveBefore != null) ? fullN - effectiveBefore : null;
  const consumedPrev = (known.lastFull != null && effectiveBefore != null && mode !== 'novo')
    ? known.lastFull - effectiveBefore
    : (mode === 'novo' && num(leftoverPrev) != null && known.lastFull != null)
      ? known.lastFull - num(leftoverPrev)
      : null;

  const canSave = () => {
    if (mode === 'naoPesei') return true;
    if (fullN == null) return false;
    if (mode === 'sobrou' && num(before) == null) return false;
    if (mode === 'novo' && num(empty) == null) return false;
    return true;
  };

  const handleSave = () => {
    // Data/hora escolhida (ou agora). O 'date' é a parte LOCAL do que a pessoa
    // escolheu (não toISOString/UTC), para não trocar o dia à meia-noite.
    const chosen = when || nowLocalInput();
    const timestamp = new Date(chosen).toISOString();
    const date = chosen.split('T')[0];
    if (mode === 'naoPesei') {
      onSubmit({ timestamp, date, notWeighed: true });
      return;
    }
    const record = { timestamp, date, full: fullN, before: effectiveBefore };
    if (mode === 'novo') {
      record.isNewBag = true;
      record.empty = num(empty);
      record.before = num(empty);
      if (num(leftoverPrev) != null) record.leftoverPrev = num(leftoverPrev);
    } else {
      // normal e sobrou mantêm o mesmo vazio guardado
      record.empty = known.lastEmpty;
    }
    onSubmit(record);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[90dvh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">⚖️ {t('weighing.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300"><Icons.X /></button>
        </div>
        <p className="text-xs text-gray-500 mb-4">{t('weighing.subtitle')}</p>

        {/* Botões de modo (escondem-se na primeira vez, que é sempre "saco novo") */}
        {!firstEver && mode !== 'naoPesei' && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={() => setMode('sobrou')}
              className={'px-3 py-1.5 rounded-full text-xs font-medium border ' + (mode === 'sobrou' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300')}>
              {t('weighing.leftoverBtn')}
            </button>
            <button onClick={() => setMode('novo')}
              className={'px-3 py-1.5 rounded-full text-xs font-medium border ' + (mode === 'novo' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300')}>
              {t('weighing.newBagBtn')}
            </button>
            {mode !== 'normal' && (
              <button onClick={() => setMode('normal')}
                className="px-3 py-1.5 rounded-full text-xs font-medium border bg-gray-700 border-gray-600 text-gray-300">
                {t('weighing.backNormal')}
              </button>
            )}
          </div>
        )}

        {/* Data e hora da pesagem — por defeito "agora", mas dá para mudar. */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-gray-300">{t('weighing.whenLabel')}</label>
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {mode === 'naoPesei' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">{t('weighing.notWeighedExplain')}</p>
            <div className="flex gap-2">
              <button onClick={() => setMode(firstEver ? 'novo' : 'normal')}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2.5 rounded-lg font-medium">
                {t('common.cancel')}
              </button>
              <button onClick={handleSave}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2.5 rounded-lg font-medium">
                {t('weighing.markNotWeighed')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {mode === 'novo' && (
              <WField label={t('weighing.emptyLabel')} value={empty} onChange={setEmpty}
                placeholder="0" hint={t('weighing.emptyHint')} />
            )}
            {mode === 'sobrou' && (
              <WField label={t('weighing.currentLabel')} value={before} onChange={setBefore}
                placeholder="0" hint={t('weighing.currentHint')} />
            )}
            <WField label={t('weighing.fullLabel')} value={full} onChange={setFull} placeholder="0" />
            {mode === 'novo' && !firstEver && (
              <WField label={t('weighing.leftoverPrevLabel')} value={leftoverPrev} onChange={setLeftoverPrev}
                placeholder={t('weighing.optional')} hint={t('weighing.leftoverPrevHint')} />
            )}

            {/* Pré-visualização do que a app calculou */}
            {(added != null || consumedPrev != null) && (
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-sm space-y-1">
                {added != null && added >= 0 && (
                  <div className="text-gray-300">{t('weighing.previewAdded')} <strong className="text-green-400">{Math.round(added)}</strong></div>
                )}
                {consumedPrev != null && consumedPrev >= 0 && (
                  <div className="text-gray-300">{t('weighing.previewConsumed')} <strong className="text-blue-400">{Math.round(consumedPrev)}</strong></div>
                )}
                {(added != null && added < 0) && (
                  <div className="text-amber-400">{t('weighing.previewSwapped')}</div>
                )}
              </div>
            )}

            {!firstEver && mode === 'normal' && (
              <button onClick={() => setMode('naoPesei')} className="text-xs text-gray-500 underline">
                {t('weighing.notWeighedLink')}
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={!canSave()}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all font-medium shadow-lg disabled:opacity-50"
            >
              {t('weighing.save')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
