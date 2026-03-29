import { useState, useEffect, useRef } from 'react';
import { getTodayKey, getDateKeyFromItem } from '../utils/helpers';
import { safeLocalStorage } from '../utils/storage';
import { logger } from '../utils/logger';

export const useReminders = (user, wellbeingLogs, consumptions, cycles, reflections, dailyLogs, showToast) => {
  const [reminderDismissed, setReminderDismissed] = useState(() => {
    return safeLocalStorage.get('reminderDismissed', {});
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return safeLocalStorage.get('notificationsEnabled', false);
  });

  // Resets every time the app is opened (session-level, not persisted)
  const bagAlarmShownThisSession = useRef(false);

  const dismissReminder = (type) => {
    const today = getTodayKey();
    const updated = { ...reminderDismissed, [type]: today };
    setReminderDismissed(updated);
    safeLocalStorage.set('reminderDismissed', updated);
  };

  const shouldShowReminder = (type) => {
    const today = getTodayKey();
    return reminderDismissed[type] !== today;
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast('✗ Notificações não suportadas no teu browser', 'error');
      return;
    }

    if (Notification.permission === 'denied') {
      showToast('✗ Notificações bloqueadas. Vai às definições do browser para permitir', 'error');
      return;
    }

    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
      safeLocalStorage.set('notificationsEnabled', true);
      showToast('✓ Notificações já estavam ativadas', 'success');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        safeLocalStorage.set('notificationsEnabled', true);
        showToast('✓ Notificações ativadas com sucesso', 'success');
      } else if (permission === 'denied') {
        showToast('✗ Negaste a permissão. Vai às definições do browser para ativar', 'error');
      } else {
        showToast('✗ Permissão não concedida', 'error');
      }
    } catch (error) {
      logger.error('Error requesting notification permission:', error);
      showToast('✗ Erro ao pedir permissão de notificações', 'error');
    }
  };

  const showBrowserNotification = (title, body) => {
    try {
      if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      }
    } catch (e) {
      logger.error('Error showing notification:', e);
    }
  };

  // Check for reminders every hour
  useEffect(() => {
    if (!user) return;

    const checkReminders = () => {
      try {
        const now = new Date();
        const hour = now.getHours();
        const today = getTodayKey();

        // Only show reminders between 8h and 22h
        if (hour < 8 || hour > 22) return;

        // Morning check (9h–17h): wellbeing + reflection
        if (hour >= 9 && hour < 18 && shouldShowReminder('morning-check')) {
          const missing = [];
          const hasWellbeingToday = wellbeingLogs.some(w => w.date === today);
          if (!hasWellbeingToday) missing.push('bem-estar');
          const hasReflectionToday = reflections.some(r => r.date === today);
          if (!hasReflectionToday) missing.push('reflexão');
          if (missing.length > 0) {
            const message = '🌅 Bom dia! Falta registar: ' + missing.join(', ');
            showToast(message, 'info');
            showBrowserNotification('Bom dia - NEP', 'Falta registar: ' + missing.join(', '));
          }
          dismissReminder('morning-check');
        }

        // Evening check (18h): wellbeing, reflection, mg from yesterday
        if (hour >= 18 && shouldShowReminder('daily-check')) {
          const missing = [];

          const hasWellbeingToday = wellbeingLogs.some(w => w.date === today);
          if (!hasWellbeingToday) missing.push('bem-estar');

          const hasReflectionToday = reflections.some(r => r.date === today);
          if (!hasReflectionToday) missing.push('reflexão');

          const yesterday = new Date(new Date() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const hasMgYesterday = dailyLogs.some(d => d.date === yesterday);
          if (!hasMgYesterday) missing.push('mg de ontem');

          if (missing.length > 0) {
            const message = '💭 Lembrete: Falta registar: ' + missing.join(', ');
            showToast(message, 'info');
            showBrowserNotification('Lembrete - NEP', 'Falta registar: ' + missing.join(', '));
          }
          dismissReminder('daily-check');
        }

        // Bag weighing alarm: from configured hour onwards
        // Shows once per app session until weighed; resets on next open
        const bagAlarmHour = safeLocalStorage.get('bagWeighAlarmHour', null);
        if (bagAlarmHour !== null && hour >= parseInt(bagAlarmHour)) {
          const hasBagWeighToday = dailyLogs.some(d => d.date === today && d.method === 'bagWeight');
          if (hasBagWeighToday) {
            // Already weighed today — reset session flag so tomorrow works
            bagAlarmShownThisSession.current = false;
          } else if (!bagAlarmShownThisSession.current) {
            showToast('⚖️ Lembrete: Pesa a dosagem diária!', 'info');
            showBrowserNotification('Lembrete - NEP', 'Pesa a dosagem diária!');
            bagAlarmShownThisSession.current = true; // Don't repeat until next app open
          }
        }
      } catch (e) {
        logger.error('Error checking reminders:', e);
      }
    };

    try {
      checkReminders(); // Run immediately on mount / data change
      const interval = setInterval(checkReminders, 60 * 60 * 1000); // Every hour
      return () => clearInterval(interval);
    } catch (e) {
      logger.error('Error setting up reminders:', e);
    }
  }, [user, notificationsEnabled]);

  // Check for wellbeing reminder after every 2 consumptions
  useEffect(() => {
    if (!user || !cycles || cycles.length === 0) return;

    try {
      // Get today's date
      const today = getTodayKey();

      // Get consumptions today
      const currentCycleConsumptions = consumptions.filter(c => getDateKeyFromItem(c) === today);

      // Get wellbeing logs today
      const currentCycleWellbeing = wellbeingLogs.filter(w => getDateKeyFromItem(w) === today);

      if (currentCycleConsumptions.length === 0) return;

      // Sort by timestamp to get order
      const sortedConsumptions = [...currentCycleConsumptions].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      const sortedWellbeing = [...currentCycleWellbeing].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      // Count consumptions since last wellbeing
      let consumptionsSinceLastWellbeing = 0;
      if (sortedWellbeing.length === 0) {
        // No wellbeing yet in this cycle
        consumptionsSinceLastWellbeing = sortedConsumptions.length;
      } else {
        // Count consumptions after last wellbeing
        const lastWellbeingTime = new Date(sortedWellbeing[sortedWellbeing.length - 1].timestamp);
        consumptionsSinceLastWellbeing = sortedConsumptions.filter(c =>
          new Date(c.timestamp) > lastWellbeingTime
        ).length;
      }

      // Show reminder ONLY at multiples of 2 (2, 4, 6, 8...)
      // Isto evita mostrar aos 3, 5, 7... consumos
      const isMultipleOf2 = consumptionsSinceLastWellbeing % 2 === 0;
      const shouldNotify = consumptionsSinceLastWellbeing >= 2 && isMultipleOf2;

      if (shouldNotify && shouldShowReminder('wellbeing-consumption')) {
        showToast('💚 Lembrete: Já tens ' + consumptionsSinceLastWellbeing + ' consumos! Regista o teu bem-estar', 'info');
        showBrowserNotification('Lembrete - NEP', 'Já tens ' + consumptionsSinceLastWellbeing + ' consumos! Regista o teu bem-estar');
        dismissReminder('wellbeing-consumption');
      }
    } catch (e) {
      logger.error('Error checking wellbeing consumption reminder:', e);
    }
  }, [user, consumptions, wellbeingLogs, cycles]);

  return {
    notificationsEnabled,
    requestNotificationPermission,
    dismissReminder,
    shouldShowReminder,
    showBrowserNotification,
  };
};
