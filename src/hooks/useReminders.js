import { useState, useEffect } from 'react';
import { getTodayKey } from '../utils/helpers';

export const useReminders = (user, wellbeingLogs, consumptions, cycles, showToast) => {
  const [reminderDismissed, setReminderDismissed] = useState(() => {
    const dismissed = localStorage.getItem('reminderDismissed');
    return dismissed ? JSON.parse(dismissed) : {};
  });

  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try {
      return localStorage.getItem('notificationsEnabled') === 'true';
    } catch (e) {
      console.error('Error reading notificationsEnabled:', e);
      return false;
    }
  });

  const dismissReminder = (type) => {
    const today = getTodayKey();
    const updated = { ...reminderDismissed, [type]: today };
    setReminderDismissed(updated);
    localStorage.setItem('reminderDismissed', JSON.stringify(updated));
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
      localStorage.setItem('notificationsEnabled', 'true');
      showToast('✓ Notificações já estavam ativadas', 'success');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('notificationsEnabled', 'true');
        showToast('✓ Notificações ativadas com sucesso', 'success');
      } else if (permission === 'denied') {
        showToast('✗ Negaste a permissão. Vai às definições do browser para ativar', 'error');
      } else {
        showToast('✗ Permissão não concedida', 'error');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
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
      console.error('Error showing notification:', e);
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

        // Only show reminders between 10h and 22h
        if (hour < 10 || hour > 22) return;

        // Check if user hasn't logged wellbeing today
        const hasWellbeingToday = wellbeingLogs.some(w => w.date === today);
        if (!hasWellbeingToday && shouldShowReminder('wellbeing') && hour >= 18) {
          showToast('💭 Lembrete: Ainda não registaste bem-estar hoje', 'info');
          showBrowserNotification('Lembrete - NEP', 'Ainda não registaste bem-estar hoje');
          dismissReminder('wellbeing');
        }
      } catch (e) {
        console.error('Error checking reminders:', e);
      }
    };

    try {
      checkReminders();
      const interval = setInterval(checkReminders, 60 * 60 * 1000); // Every hour
      return () => clearInterval(interval);
    } catch (e) {
      console.error('Error setting up reminders:', e);
    }
  }, [user, wellbeingLogs, notificationsEnabled]);

  // Check for wellbeing reminder after every 2 consumptions
  useEffect(() => {
    if (!user || !cycles || cycles.length === 0) return;

    try {
      // Get current cycle
      const currentCycle = cycles[0];
      if (!currentCycle) return;

      // Get consumptions in current cycle
      const currentCycleConsumptions = consumptions.filter(c => c.cycleId === currentCycle.id);

      // Get wellbeing logs in current cycle
      const currentCycleWellbeing = wellbeingLogs.filter(w => w.cycleId === currentCycle.id);

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

      // Show reminder if 2 or more consumptions without wellbeing
      if (consumptionsSinceLastWellbeing >= 2 && shouldShowReminder('wellbeing-consumption')) {
        showToast('💚 Lembrete: Já tens 2 consumos! Regista o teu bem-estar', 'info');
        showBrowserNotification('Lembrete - NEP', 'Já tens 2 consumos! Regista o teu bem-estar');
        dismissReminder('wellbeing-consumption');
      }
    } catch (e) {
      console.error('Error checking wellbeing consumption reminder:', e);
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
