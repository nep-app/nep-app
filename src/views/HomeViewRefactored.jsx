import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../components/Icons';
import { InfoBadge } from '../components/ui/InfoBadge';
import { FeatureAnnouncement } from '../components/FeatureAnnouncement';
import { WeighingSuggestion } from '../components/WeighingSuggestion';
import { GradientButton } from '../components/ui/GradientButton';
import { AlertCard } from '../components/ui/AlertCard';
import { useData } from '../contexts/DataContext';
import { useMetrics } from '../contexts/MetricsContext';
import { useUI } from '../contexts/UIContext';
import { formatDateTime, safeToISODate, getDateDaysAgo, getTodayKey, genId } from '../utils/helpers';
import { themeClasses } from '../utils/classNames';
import { getUserStats, updateUserStats } from '../utils/userStats';

import { OnboardingWelcome } from '../components/OnboardingWelcome';

const UrgeSurfingModal = lazy(() => import('../components/modals/UrgeSurfingModal').then(m => ({ default: m.UrgeSurfingModal })));

export function HomeViewRefactored({
  currentReflection,
  markConsumption,
  openEditConsumption,
  deleteItem,
  last7,
  copingStrategies,
  currentCycleCount,
  consumptionsToShow,
  setConsumptionsToShow,
  showToast
}) {
  const { t, i18n } = useTranslation();
  const { consumptions, goals, cycles, dailyLogs, weighings, manualSync, isSyncing, addUrgeEvent, addConsumption } = useData();
  const metrics = useMetrics();
  const { consumptionsByDate } = metrics;
  const { darkMode, setShowThoughtsModal, setShowGoalModal, setShowWellbeingModal, setShowEmotionsModal, setShowReflectionModal, setShowCycleModal, setShowDailyLogModal } = useUI();

  const [cachedAlerts, setCachedAlerts] = useState([]);
  const [cachedTimeSince, setCachedTimeSince] = useState(null);
  const [showUrgeSurfing, setShowUrgeSurfing] = useState(false);
  const [pendingConsumption, setPendingConsumption] = useState(false);
  const [urgeWarnings, setUrgeWarnings] = useState([]);

  // Acolhimento de 1.ª vez: só para quem ainda não tem registos e nunca o viu.
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const showOnboarding = typeof window !== 'undefined'
    && localStorage.getItem('nep_onboarding_seen') !== 'true'
    && !onboardingDismissed
    && (consumptions?.length ?? 0) === 0;
  const dismissOnboarding = () => {
    try { localStorage.setItem('nep_onboarding_seen', 'true'); } catch { /* best-effort */ }
    setOnboardingDismissed(true);
  };

  // Registo RETROATIVO (consumo passado): guarda na hora escolhida, SEM abrir o
  // surfar e SEM contar como impulso. É o caminho calmo para "esqueci-me de
  // registar na altura" — deixa de poluir as estatísticas do impulso.
  const nowLocalInput = () => {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 16); // 'YYYY-MM-DDTHH:mm' na hora local
  };
  const [showPastModal, setShowPastModal] = useState(false);
  const [pastDatetime, setPastDatetime] = useState('');
  const [pastNotes, setPastNotes] = useState('');
  const openPastModal = () => { setPastDatetime(nowLocalInput()); setPastNotes(''); setShowPastModal(true); };
  const savePastConsumption = async () => {
    if (!pastDatetime) return;
    const d = new Date(pastDatetime);
    if (isNaN(d)) return;
    try {
      await addConsumption({ id: genId(), timestamp: d.toISOString(), date: safeToISODate(d), notes: pastNotes || '' });
      showToast(t('messages.consumptionSaved'), 'success');
    } catch {
      showToast(t('messages.consumptionSaveError'), 'error');
    }
    setShowPastModal(false);
  };

  const urgeExerciseEnabled = typeof window !== 'undefined'
    ? localStorage.getItem('nep_urge_exercise') !== 'false'
    : true;

  // Modo demonstração: quem está só a experimentar não tem metas definidas, por
  // isso o "Surfar o Impulso" nunca chegava a aparecer — e é das partes mais
  // úteis da app. No demo, mostra-se sempre ao marcar um consumo.
  const isDemoMode = typeof window !== 'undefined'
    && localStorage.getItem('nep_demo') === '1';

  // Verifica NA HORA se consumir agora te põe fora de uma meta de CONSUMO que
  // definiste (intervalo, frequência, hora-limite). As metas de sono/deitar não
  // entram aqui — não têm a ver com o ato de consumir.
  const computeLiveGoalBreaches = () => {
    const reasons = [];
    const allGoals = goals || [];
    const cons = consumptions || [];
    const now = new Date();

    // 1) Intervalo: consumir cedo demais desde o último consumo
    const intervalGoal = allGoals.find(g => g.type === 'increase_interval');
    if (intervalGoal && cons.length > 0) {
      let lastTime = 0;
      cons.forEach(c => { const tt = new Date(c.timestamp || c.createdAt).getTime(); if (tt > lastTime) lastTime = tt; });
      if (lastTime > 0) {
        const hoursSince = (now.getTime() - lastTime) / 3600000;
        if (hoursSince < parseFloat(intervalGoal.target)) {
          reasons.push({ text: t('alerts.shortInterval', { hours: parseFloat(hoursSince.toFixed(1)) }), emoji: '⚠️', color: 'orange', type: 'negative', urge: true });
        }
      }
    }

    // 2) Frequência: já atingiste o limite de hoje
    const freqGoal = allGoals.find(g => g.type === 'reduce_frequency');
    if (freqGoal) {
      const todayKey = getTodayKey();
      const todayCount = cons.filter(c => (c.date || safeToISODate(c.timestamp)) === todayKey).length;
      if (todayCount >= parseInt(freqGoal.target)) {
        reasons.push({ text: t('alerts.highFrequency', { count: todayCount }), emoji: '⚠️', color: 'orange', type: 'negative', urge: true });
      }
    }

    // 3) Hora-limite: consumir agora é depois da hora que definiste
    const limitGoal = allGoals.find(g => g.type === 'limit_last');
    if (limitGoal) {
      const targetStr = typeof limitGoal.target === 'string' ? limitGoal.target : '00:00';
      const [th, tm] = targetStr.split(':').map(Number);
      const targetMinRaw = (th === 0 && (tm || 0) === 0) ? 1440 : th * 60 + (tm || 0);
      // Alvo no MESMO frame de "noite alargada" que a hora atual (madrugada = +1440),
      // senão uma meta de madrugada (ex.: 01:30) disparava sempre. Igual = OK.
      const targetMin = targetMinRaw < 360 ? targetMinRaw + 1440 : targetMinRaw;
      let nowMin = now.getHours() * 60 + now.getMinutes();
      if (nowMin < 360) nowMin += 1440; // madrugada conta como fim do dia
      if (nowMin > targetMin) {
        const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        reasons.push({ text: t('alerts.limitLastFail', { time: nowStr, target: targetStr }), emoji: '⏰', color: 'orange', type: 'negative', urge: true });
      }
    }

    // 4) Não consumir logo ao acordar (first_not_before): consumir agora seria
    // o 1º consumo do dia e ainda é cedo demais desde que acordaste
    const firstGoal = allGoals.find(g => g.type === 'first_not_before');
    if (firstGoal && (cycles || []).length > 0) {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const lastCycleWithSleep = [...cycles]
        .filter(c => c.bedtime && c.sleep)
        .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))[0];
      const lastCycleTs = lastCycleWithSleep ? new Date(lastCycleWithSleep.timestamp || lastCycleWithSleep.createdAt) : null;
      const cycleLoggedToday = lastCycleTs !== null && lastCycleTs >= todayStart;
      if (lastCycleWithSleep && cycleLoggedToday) {
        const [bh, bm] = lastCycleWithSleep.bedtime.split(':').map(Number);
        let wakeupMinutes = bh * 60 + bm + parseFloat(lastCycleWithSleep.sleep) * 60;
        if (wakeupMinutes >= 1440) wakeupMinutes -= 1440;
        const targetMinutes = (wakeupMinutes + parseFloat(firstGoal.target) * 60) % 1440;
        // Já houve algum consumo depois de acordar hoje? Se sim, este já não é o 1º.
        const consumedAfterWake = cons.some(c => {
          const d = new Date(c.timestamp || c.createdAt);
          if (d < todayStart) return false;
          return (d.getHours() * 60 + d.getMinutes()) >= wakeupMinutes;
        });
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        if (!consumedAfterWake && nowMinutes >= wakeupMinutes && nowMinutes < targetMinutes) {
          const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          reasons.push({ text: t('alerts.firstNotBeforeFail', { time: nowStr, hours: firstGoal.target }), emoji: '⏰', color: 'orange', type: 'negative', urge: true });
        }
      }
    }

    return reasons;
  };

  const handleMarkConsumption = () => {
    const reasons = computeLiveGoalBreaches();
    if ((reasons.length > 0 || isDemoMode) && urgeExerciseEnabled) {
      setUrgeWarnings(reasons);
      setPendingConsumption(true);
      setShowUrgeSurfing(true);
    } else {
      markConsumption();
    }
  };

  useEffect(() => {
    getUserStats().then(stats => {
      if (stats.timeSinceLastConsumption) {
        setCachedTimeSince(stats.timeSinceLastConsumption);
      }
    });
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      getUserStats().then(stats => {
        if (stats.timeSinceLastConsumption) {
          setCachedTimeSince(stats.timeSinceLastConsumption);
        }
      });
    }, 30000);
    return () => clearInterval(intervalId);
  }, []);

  // Quando os dados mudam, ler alertas da cache (o contexto já recalculou)
  useEffect(() => {
    getUserStats().then(stats => {
      setCachedAlerts(stats.alerts && stats.alerts.length > 0 ? stats.alerts : []);
      if (stats.timeSinceLastConsumption) setCachedTimeSince(stats.timeSinceLastConsumption);
    });
  }, [consumptions, cycles, dailyLogs, goals]);

  // Quando a língua muda, regenerar alertas no idioma correcto (só isso)
  useEffect(() => {
    if (!consumptions || consumptions.length === 0) return;
    updateUserStats(consumptions, cycles, dailyLogs, goals, null, null, null, weighings)
      .catch(() => {})
      .finally(() => {
        getUserStats().then(stats => {
          setCachedAlerts(stats.alerts && stats.alerts.length > 0 ? stats.alerts : []);
        });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const handleSync = async () => {
    try {
      const result = await manualSync();
      if (result) {
        const totalDocs = (result.pulled || 0) + (result.pushed || 0);
        if (totalDocs > 0) {
          showToast(t('home.syncSuccess', { count: totalDocs }), 'success');
        } else {
          showToast(t('home.syncAlreadyDone'), 'success');
        }
      }
    } catch (error) {
      showToast(`✗ ${error.message || t('home.syncError', 'Verifica a tua ligação à internet.')}`, 'error');
    }
  };

  return (
    <>
    <div className="space-y-6">
      {/* Aviso de nova funcionalidade (lembretes push) — fecha-se e não volta */}
      <FeatureAnnouncement />

      {/* Sugestão gentil: possível refill por pesar (Fase 2) */}
      <WeighingSuggestion />

      {/* Botão sync */}
      <div className="flex justify-end">
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700"
          title={t('home.sync')}
        >
          <Icons.RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? t('home.syncing') : t('home.sync')}
        </button>
      </div>

      {(() => {
        const timeSince = cachedTimeSince || metrics.timeSinceLastConsumption;
        if (timeSince) {
          const isLong = timeSince.hours >= 2;
          return (
            <div className="flex justify-center mb-4">
              <InfoBadge
                label={t('home.timeSinceLabel')}
                value={`${timeSince.value}${timeSince.unit}`}
                subValue={timeSince.subValue}
                subUnit={timeSince.subUnit}
                isPositive={isLong}
                darkMode={darkMode}
              />
            </div>
          );
        }
        return null;
      })()}

      <div className="grid grid-cols-2 gap-4">
        <GradientButton
          onClick={handleMarkConsumption}
          icon={Icons.Clock}
          variant="purple"
          size="large"
          className="shadow-xl"
        >
          {t('home.markConsumption')}
        </GradientButton>
        <GradientButton
          onClick={() => setShowThoughtsModal(true)}
          icon={Icons.BookOpen}
          variant="green"
          size="large"
          className="shadow-xl"
        >
          {t('home.thoughts')}
        </GradientButton>
      </div>

      {/* Registo retroativo — caminho calmo, sem surfar nem contar como impulso */}
      <div className="flex justify-center -mt-2">
        <button
          onClick={openPastModal}
          className="text-xs text-gray-400 hover:text-gray-200 underline decoration-dotted underline-offset-4 transition-colors"
        >
          {t('home.logPast')}
        </button>
      </div>

      {consumptions.length === 0 && (
        <div className="bg-purple-900/15 border border-purple-700/30 rounded-2xl p-6 text-center motion-safe:animate-fadeInUp">
          <div className="text-4xl mb-2 inline-block motion-safe:animate-sway" aria-hidden="true">🌱</div>
          <h3 className="text-white font-semibold font-display text-lg mb-1 text-balance">{t('home.emptyTitle')}</h3>
          <p className="text-sm text-gray-300 leading-relaxed max-w-xs mx-auto">{t('home.emptyBody')}</p>
        </div>
      )}

      {cachedAlerts.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {cachedAlerts.map((alert, i) => (
            <AlertCard key={i} alert={alert} darkMode={darkMode} />
          ))}
        </div>
      )}

      {/* O cartão "Medido entre as tuas pesagens" foi removido do Início: é
          análise (consumo real entre pesagens) e vive melhor nas Análises
          ("Análise de Quantidade"). Tê-lo aqui, ao lado do selo do dia, criava
          dois números de mg com significados diferentes e confundia. */}

      {/* Linha 1: Bem-estar, Emoções, Reflexão Diária */}
      <div className="grid grid-cols-3 gap-3">
        <GradientButton
          onClick={() => setShowWellbeingModal(true)}
          icon={Icons.Heart}
          variant="blue"
          size="medium"
          className="flex flex-col items-center h-auto py-4"
        >
          <div className="text-sm font-semibold">{t('home.wellbeing')}</div>
          <div className="text-xs opacity-80 mt-1">{t('home.wellbeingSubtitle')}</div>
        </GradientButton>
        <GradientButton
          onClick={() => setShowEmotionsModal(true)}
          icon={Icons.Heart}
          variant="purple"
          size="medium"
          className="flex flex-col items-center h-auto py-4"
        >
          <div className="text-sm font-semibold">{t('home.emotions')}</div>
          <div className="text-xs opacity-80 mt-1">{t('home.emotionsSubtitle')}</div>
        </GradientButton>
        <GradientButton
          onClick={() => setShowReflectionModal(true)}
          icon={Icons.Brain}
          variant="green"
          size="medium"
          className="flex flex-col items-center h-auto py-4"
        >
          <div className="text-sm font-semibold">{t('home.dailyReflection')}</div>
          <div className="text-xs opacity-80 mt-1">{t('home.dailyReflectionSubtitle')}</div>
        </GradientButton>
      </div>

      {/* Linha 2: Novo Ciclo, Registar mg, Metas.
          Superfícies suaves e tintadas (em vez de gradientes cheios) — mantêm a
          identidade de cor mas deixam os dois botões principais serem o destaque. */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setShowCycleModal(true)} className="bg-amber-500/10 border border-amber-500/25 text-amber-100 rounded-xl p-3 font-medium hover:bg-amber-500/20 transition-colors flex flex-col items-center">
          <div className="text-lg mb-1" aria-hidden="true">🌙</div>
          <div className="text-xs">{t('home.newCycle')}</div>
        </button>
        <button onClick={() => setShowDailyLogModal(true)} className="bg-rose-500/10 border border-rose-500/25 text-rose-100 rounded-xl p-3 font-medium hover:bg-rose-500/20 transition-colors flex flex-col items-center">
          <div className="text-lg mb-1" aria-hidden="true">📊</div>
          <div className="text-xs">{t('home.registerMg')}</div>
        </button>
        <button onClick={() => setShowGoalModal(true)} className="bg-violet-500/10 border border-violet-500/25 text-violet-100 rounded-xl p-3 font-medium hover:bg-violet-500/20 transition-colors flex flex-col items-center">
          <div className="text-lg mb-1" aria-hidden="true">🎯</div>
          <div className="text-xs">{t('home.goals')}</div>
        </button>
      </div>

      {(() => {
        const freqGoal = goals.find(g => g.type === 'reduce_frequency');
        const target = freqGoal ? parseFloat(freqGoal.target) : null;

        const days = Array.from({ length: 7 }, (_, i) => {
          const d = getDateDaysAgo(6 - i);
          const k = safeToISODate(d);
          return {
            k,
            count: consumptionsByDate[k] || 0,
            label: i === 6
              ? t('home.today')
              : new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(d).replace(/\.$/, ''),
            isToday: i === 6,
          };
        });

        const totalWeek = days.reduce((s, d) => s + d.count, 0);

        const dotClass = (count) => {
          if (count === 0) return 'bg-gray-700/60 text-gray-500';
          if (Number.isFinite(target)) return count < target
            ? 'bg-green-900/50 text-green-400 ring-1 ring-green-500/40'
            : 'bg-red-900/50 text-red-400 ring-1 ring-red-500/40';
          return 'bg-purple-900/50 text-purple-300 ring-1 ring-purple-500/40';
        };

        return (
          <div className="bg-gray-800/40 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-gray-400">{t('home.thisWeek')}</span>
              <span className="text-xs text-gray-500">{totalWeek}x</span>
            </div>
            <div className="flex justify-between">
              {days.map((day) => (
                <div key={day.k} className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${dotClass(day.count)} ${day.isToday ? 'ring-2 ring-white/25' : ''}`}>
                    {day.count}
                  </div>
                  <span className={`text-[11px] ${day.isToday ? 'text-white font-semibold' : 'text-gray-400'}`}>
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-3 pt-2 border-t border-gray-700/50 flex-wrap">
              <span className="text-xs text-gray-500">{t('home.avg7days')}: <span className="text-gray-300">{last7.avgTimes}x</span></span>
              {parseFloat(last7.avgMg) > 0 && <span className="text-xs text-gray-500">{last7.avgMg}{t('home.mgPerDay')}</span>}
              {Number.isFinite(target) && <span className="text-xs text-gray-500 ml-auto">{t('home.goalTarget')}: ≤{target}x</span>}
            </div>
          </div>
        );
      })()}

      <div className={(darkMode ? 'bg-gradient-to-br from-blue-900/20 to-cyan-900/20' : 'bg-gradient-to-r from-blue-50 to-cyan-50') + ' rounded-xl p-4'}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">💡</span>
          <h3 className={'font-semibold ' + (darkMode ? 'text-blue-300' : 'text-gray-800')}>{t('home.strategiesTitle')}</h3>
        </div>
        <div className="space-y-2">
          {copingStrategies.map((strategy, i) => (
            <div key={i} className={'flex items-start gap-2 text-sm p-2.5 rounded-lg ' + (darkMode ? 'text-gray-200 bg-blue-950/30' : 'text-gray-700 bg-white/80')}>
              <span className={(darkMode ? 'text-cyan-400' : 'text-blue-500') + ' font-bold'}>•</span>
              <span>{strategy}</span>
            </div>
          ))}
        </div>
        {cycles.length > 0 && cycles.some(c => c.triggers && c.triggers.length > 0) && (
          <div className={'text-xs mt-3 italic ' + (darkMode ? 'text-cyan-400' : 'text-blue-600')}>{t('home.strategiesBasedOnTriggers')}</div>
        )}
      </div>

      {consumptions.length > 0 && (
        <div className={(darkMode ? 'bg-gradient-to-br from-purple-900/20 to-pink-900/20' : 'bg-white') + ' rounded-xl p-4'}>
          <h3 className={'font-semibold mb-3 ' + (darkMode ? 'text-purple-300' : 'text-gray-800')}>{t('home.recentConsumptions')}</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {consumptions.slice(0, consumptionsToShow).map(c => (
              <div key={c.id} className={'flex items-center justify-between py-2.5 px-3 rounded-lg ' + (darkMode ? 'bg-purple-950/30' : 'bg-gray-50')}>
                <div className="flex-1">
                  <div className={'text-sm font-medium ' + (darkMode ? 'text-gray-200' : 'text-gray-800')}>
                    {formatDateTime(c.timestamp)}
                  </div>
                  {c.notes && <div className={'text-xs mt-1 ' + (themeClasses.textTertiaryAlt(darkMode))}>{c.notes}</div>}
                </div>
                <div className="flex gap-2 ml-2">
                  <button aria-label={t('a11y.edit')} onClick={() => openEditConsumption(c)} className={(darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-500 hover:text-blue-600')}><Icons.Edit className="w-4 h-4" aria-hidden="true" /></button>
                  <button aria-label={t('a11y.delete')} onClick={() => deleteItem('consumptions', c.id)} className={(darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-600')}><Icons.Trash2 className="w-4 h-4" aria-hidden="true" /></button>
                </div>
              </div>
            ))}
          </div>
          {consumptions.length > consumptionsToShow && (
            <button onClick={() => setConsumptionsToShow(prev => prev + 20)} className={(darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700') + ' text-sm font-medium mt-3 w-full py-2'}>
              {t('home.showMore', { count: consumptions.length - consumptionsToShow })}
            </button>
          )}
        </div>
      )}
    </div>

    {showUrgeSurfing && (
      <Suspense fallback={null}>
        <UrgeSurfingModal
          onClose={() => { setShowUrgeSurfing(false); setPendingConsumption(false); }}
          onOpenThoughts={() => setShowThoughtsModal(true)}
          onOpenReflection={() => setShowReflectionModal(true)}
          onProceed={pendingConsumption ? () => markConsumption() : null}
          onLog={(payload) => addUrgeEvent({ id: genId(), timestamp: new Date().toISOString(), ...payload })}
          warnings={urgeWarnings}
        />
      </Suspense>
    )}

    {showOnboarding && <OnboardingWelcome onDone={dismissOnboarding} />}

    {showPastModal && (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        onClick={(e) => { if (e.target === e.currentTarget) setShowPastModal(false); }}
      >
        <div className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-5 motion-safe:animate-scaleIn"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold text-white">🕓 {t('home.logPastTitle')}</h3>
            <button aria-label={t('common.cancel')} onClick={() => setShowPastModal(false)} className="text-gray-400 hover:text-gray-200 text-xl leading-none">✕</button>
          </div>
          <p className="text-xs text-gray-400 mb-4">{t('home.logPastHint')}</p>

          <label className="block text-sm font-medium text-gray-300 mb-1">{t('home.logPastWhen')}</label>
          <input
            type="datetime-local"
            value={pastDatetime}
            max={nowLocalInput()}
            onChange={(e) => setPastDatetime(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-white w-full p-3 rounded-lg focus:ring-2 focus:ring-purple-400 mb-3"
          />

          <label className="block text-sm font-medium text-gray-300 mb-1">{t('home.logPastNotes')}</label>
          <textarea
            value={pastNotes}
            onChange={(e) => setPastNotes(e.target.value)}
            rows={2}
            className="bg-gray-700 border border-gray-600 text-white w-full p-3 rounded-lg focus:ring-2 focus:ring-purple-400 mb-4 resize-none"
          />

          <div className="flex gap-3">
            <button onClick={() => setShowPastModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors">
              {t('common.cancel')}
            </button>
            <button onClick={savePastConsumption} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors">
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
