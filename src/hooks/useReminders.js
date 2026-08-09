import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getTodayKey, getDateKeyFromItem, safeToISODate, getDateDaysAgo } from '../utils/helpers';
import { safeLocalStorage } from '../utils/storage';
import { logger } from '../utils/logger';

export const useReminders = (user, wellbeingLogs, consumptions, cycles, reflections, dailyLogs, showToast, allDataLoaded) => {
  const { t } = useTranslation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return safeLocalStorage.get('notificationsEnabled', false);
  });

  // Always-fresh refs — updated every render so interval callbacks never use stale data
  const wellbeingLogsRef = useRef(wellbeingLogs);
  const reflectionsRef = useRef(reflections);
  const dailyLogsRef = useRef(dailyLogs);
  useEffect(() => { wellbeingLogsRef.current = wellbeingLogs; }, [wellbeingLogs]);
  useEffect(() => { reflectionsRef.current = reflections; }, [reflections]);
  useEffect(() => { dailyLogsRef.current = dailyLogs; }, [dailyLogs]);

  // Read/write dismissed state directly from localStorage to avoid stale closure bugs
  const isDismissedToday = (type) => {
    const today = getTodayKey();
    const dismissed = safeLocalStorage.get('reminderDismissed', {});
    return dismissed[type] === today;
  };

  const dismissToday = (type) => {
    const today = getTodayKey();
    const dismissed = safeLocalStorage.get('reminderDismissed', {});
    safeLocalStorage.set('reminderDismissed', { ...dismissed, [type]: today });
  };

  const showBrowserNotification = (title, body) => {
    try {
      if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico' });
      }
    } catch (e) {
      logger.error('Error showing notification:', e);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast(t('reminders.notifNotSupported'), 'error');
      return;
    }
    if (Notification.permission === 'denied') {
      showToast(t('reminders.notifBlocked'), 'error');
      return;
    }
    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
      safeLocalStorage.set('notificationsEnabled', true);
      showToast(t('reminders.notifAlreadyEnabled'), 'success');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        safeLocalStorage.set('notificationsEnabled', true);
        showToast(t('reminders.notifEnabled'), 'success');
      } else if (permission === 'denied') {
        showToast(t('reminders.notifDenied'), 'error');
      } else {
        showToast(t('reminders.notifNotGranted'), 'error');
      }
    } catch (error) {
      logger.error('Error requesting notification permission:', error);
      showToast(t('reminders.notifError'), 'error');
    }
  };

  // Hourly reminder check — only runs after data has fully loaded (allDataLoaded)
  useEffect(() => {
    if (!user || !allDataLoaded) return;

    const checkReminders = () => {
      try {
        const now = new Date();
        const hour = now.getHours();
        const today = getTodayKey();

        if (hour < 8 || hour > 22) return;

        const wellbeingAlarmEnabled = safeLocalStorage.get('wellbeingAlarmEnabled', false);

        // Morning check (9h–17h): wellbeing + reflection
        if (wellbeingAlarmEnabled && hour >= 9 && hour < 18 && !isDismissedToday('morning-check')) {
          const missing = [];
          if (!wellbeingLogsRef.current.some(w => w.date === today)) missing.push(t('reminders.itemWellbeing'));
          if (!reflectionsRef.current.some(r => r.date === today)) missing.push(t('reminders.itemReflection'));
          if (missing.length > 0) {
            const items = missing.join(', ');
            showToast(t('reminders.morningToast', { items }), 'info');
            showBrowserNotification(t('reminders.morningTitle'), t('reminders.morningBody', { items }));
          }
          dismissToday('morning-check');
        }

        // Evening check (18h+): wellbeing, reflection, mg from yesterday
        if (wellbeingAlarmEnabled && hour >= 18 && !isDismissedToday('daily-check')) {
          const missing = [];
          if (!wellbeingLogsRef.current.some(w => w.date === today)) missing.push(t('reminders.itemWellbeing'));
          if (!reflectionsRef.current.some(r => r.date === today)) missing.push(t('reminders.itemReflection'));
          const yesterday = safeToISODate(getDateDaysAgo(1)); // ontem em hora LOCAL (coerente com getTodayKey)
          if (!dailyLogsRef.current.some(d => d.date === yesterday)) missing.push(t('reminders.itemMgYesterday'));
          if (missing.length > 0) {
            const items = missing.join(', ');
            showToast(t('reminders.eveningToast', { items }), 'info');
            showBrowserNotification(t('reminders.reminderTitle'), t('reminders.eveningBody', { items }));
          }
          dismissToday('daily-check');
        }

        // Dose alarm
        const doseAlarmRaw = localStorage.getItem('bagWeighAlarmHour');
        const doseAlarmHour = (doseAlarmRaw !== null && doseAlarmRaw !== 'null') ? parseInt(doseAlarmRaw) : null;
        if (doseAlarmHour !== null && !isNaN(doseAlarmHour) && hour >= doseAlarmHour && !isDismissedToday('bag-alarm')) {
          if (!dailyLogsRef.current.some(d => d.date === today)) {
            showToast(t('reminders.doseToast'), 'info');
            showBrowserNotification(t('reminders.reminderTitle'), t('reminders.doseBody'));
          }
          dismissToday('bag-alarm');
        }

      } catch (e) {
        logger.error('Error checking reminders:', e);
      }
    };

    try {
      checkReminders();
      const interval = setInterval(checkReminders, 60 * 60 * 1000);
      return () => clearInterval(interval);
    } catch (e) {
      logger.error('Error setting up reminders:', e);
    }
  }, [user, allDataLoaded, notificationsEnabled]);

  // Check for wellbeing reminder after every 2 consumptions
  useEffect(() => {
    if (!user || !cycles || cycles.length === 0) return;

    try {
      const today = getTodayKey();
      const currentCycleConsumptions = consumptions.filter(c => getDateKeyFromItem(c) === today);
      const currentCycleWellbeing = wellbeingLogs.filter(w => getDateKeyFromItem(w) === today);

      if (currentCycleConsumptions.length === 0) return;

      const sortedConsumptions = [...currentCycleConsumptions].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      const sortedWellbeing = [...currentCycleWellbeing].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      let consumptionsSinceLastWellbeing = 0;
      if (sortedWellbeing.length === 0) {
        consumptionsSinceLastWellbeing = sortedConsumptions.length;
      } else {
        const lastWellbeingTime = new Date(sortedWellbeing[sortedWellbeing.length - 1].timestamp);
        consumptionsSinceLastWellbeing = sortedConsumptions.filter(c =>
          new Date(c.timestamp) > lastWellbeingTime
        ).length;
      }

      const isMultipleOf2 = consumptionsSinceLastWellbeing % 2 === 0;
      const shouldNotify = consumptionsSinceLastWellbeing >= 2 && isMultipleOf2;

      if (shouldNotify && !isDismissedToday('wellbeing-consumption')) {
        showToast(t('reminders.wellbeingToast', { n: consumptionsSinceLastWellbeing }), 'info');
        showBrowserNotification(t('reminders.reminderTitle'), t('reminders.wellbeingBody', { n: consumptionsSinceLastWellbeing }));
        dismissToday('wellbeing-consumption');
      }
    } catch (e) {
      logger.error('Error checking wellbeing consumption reminder:', e);
    }
  }, [user, consumptions, wellbeingLogs, cycles]);

  return {
    notificationsEnabled,
    requestNotificationPermission,
    dismissReminder: dismissToday,
  };
};
