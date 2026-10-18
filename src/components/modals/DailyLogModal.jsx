import React from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../Icons';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';
import { getTodayKey, safeToISODate } from '../../utils/helpers';

export const DailyLogModal = ({
  isOpen,
  onClose,
  dailyForm,
  setDailyForm,
  onSubmit,
  onOpenWeighing,
  derivedMg,
  cycleOptions = null,
  cycleMg = [],
  onMarkNotWeighed
}) => {
  const { t, i18n } = useTranslation();
  useModalKeyboard(isOpen, onClose, onSubmit);

  if (!isOpen) return null;

  // Data de hoje em hora LOCAL (nunca UTC — senão entre 00h-01h ficava preso em "ontem")
  const today = getTodayKey();
  const fmt = (ms) => new Date(ms).toLocaleString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  // O que a balança deu para o ciclo escolhido (se se sabe) — para comparar.
  const chosenStart = cycleOptions && cycleOptions.length ? (dailyForm.cycleStart || cycleOptions[0].start) : null;
  const scaleForCycle = chosenStart != null ? (cycleMg.find(c => c.start === chosenStart && !c.manual) || null) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">{t('modals.dailyLog.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <Icons.X />
          </button>
        </div>
        <div className="space-y-4">
          {/* Dizer logo o que isto é: um TOTAL feito pela pessoa, não a
             quantidade de um consumo (os toques + a balança tratam disso). */}
          <p className="text-xs text-gray-400 -mt-2">{t(cycleOptions && cycleOptions.length ? 'modals.dailyLog.whatIsCycle' : 'modals.dailyLog.whatIsDay')}</p>
          {onOpenWeighing && (
            <button
              onClick={onOpenWeighing}
              className="w-full bg-gray-700/60 hover:bg-gray-700 border border-gray-600 text-gray-200 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 text-sm"
            >
              ⚖️ {t('weighing.openFromDailyLog')}
            </button>
          )}
          <div>
            {/* O total que calculaste (tara e contas feitas por ti) — o mesmo que
               a balança faz pela app. Com ciclos, é o total DE UM CICLO
               (acordar → acordar); sem ciclos, de um dia. */}
            {cycleOptions && cycleOptions.length > 0 ? (
              <>
                <label htmlFor="mg-cycle" className="block text-sm font-medium mb-1 text-gray-300">{t('modals.dailyLog.cycleLabel')}</label>
                <select
                  id="mg-cycle"
                  value={dailyForm.cycleStart || cycleOptions[0].start}
                  onChange={(e) => { const start = Number(e.target.value); setDailyForm({ ...dailyForm, cycleStart: start, date: safeToISODate(start) }); }}
                  className="bg-gray-700 border-gray-600 text-white w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400"
                >
                  {cycleOptions.map(o => (
                    <option key={o.start} value={o.start}>
                      {o.end == null
                        ? t('modals.dailyLog.cycleCurrent', { from: fmt(o.start) })
                        : t('modals.dailyLog.cycleRange', { from: fmt(o.start), to: fmt(o.end) })
                          + (o.end - o.start > 36 * 3600000 ? ` ${t('modals.dailyLog.cycleTooLong')}` : '')}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
            <label className="block text-sm font-medium mb-1 text-gray-300">{t('modals.dailyLog.dateLabel')}</label>
            <input
              type="date"
              value={dailyForm.date || today}
              onChange={(e) => setDailyForm({...dailyForm, date: e.target.value})}
              max={today}
              className="bg-gray-700 border-gray-600 text-white w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400"
            />
              </>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">{t('modals.dailyLog.mgLabel')}</label>
            <input
              type="number"
              value={dailyForm.mg}
              onChange={(e) => setDailyForm({...dailyForm, mg: e.target.value})}
              className="bg-gray-700 border-gray-600 text-white w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400"
              min="0"
            />
            {scaleForCycle && (
              <button
                type="button"
                onClick={() => setDailyForm({...dailyForm, mg: String(scaleForCycle.mg)})}
                className="mt-2 w-full text-left bg-gray-900/50 border border-gray-700 hover:border-purple-500 rounded-lg p-2.5 text-xs text-gray-300 transition-colors"
              >
                ⚖️ {t('modals.dailyLog.scaleForCycle', { mg: scaleForCycle.mg })}
                <span className="block text-purple-300 mt-0.5">{t('weighing.useThisValue')}</span>
              </button>
            )}
            {derivedMg && derivedMg.mg != null && (
              <button
                type="button"
                onClick={() => setDailyForm({...dailyForm, mg: String(derivedMg.mg)})}
                className="mt-2 w-full text-left bg-gray-900/50 border border-gray-700 hover:border-purple-500 rounded-lg p-2.5 text-xs text-gray-300 transition-colors"
              >
                ⚖️ {t('weighing.derivedHint', { mg: derivedMg.mg })}
                {derivedMg.state === 'mixed' && <span className="text-amber-400"> · {t('weighing.stateMixed')}</span>}
                {derivedMg.state === 'estimated' && <span className="text-amber-400"> · {t('weighing.stateEstimated')}</span>}
                <span className="block text-purple-300 mt-0.5">{t('weighing.useThisValue')}</span>
              </button>
            )}
            {derivedMg && derivedMg.mg == null && derivedMg.doseCount > 0 && (
              <p className="mt-2 text-xs text-gray-500">⚖️ {t('weighing.stateUnknownDay')}</p>
            )}
            {onMarkNotWeighed && (
              <button
                type="button"
                onClick={onMarkNotWeighed}
                className="mt-2 text-xs text-amber-400/90 hover:text-amber-300 underline"
              >
                {t('weighing.notWeighedForDay')}
              </button>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">{t('modals.dailyLog.notesLabel')}</label>
            <textarea
              value={dailyForm.notes}
              onChange={(e) => setDailyForm({...dailyForm, notes: e.target.value})}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 h-20"
              placeholder={t('modals.dailyLog.notesPlaceholder')}
            />
          </div>
          <button
            onClick={onSubmit}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all font-medium shadow-lg"
          >
            {t('modals.dailyLog.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
