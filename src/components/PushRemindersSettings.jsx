import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { safeLocalStorage } from '../utils/storage';
import { enablePushReminders, saveReminderConfig, disablePushReminders } from '../utils/pushNotifications';
import { logger } from '../utils/logger';

// Tipos de lembrete disponíveis (texto no ecrã é bilingue; o toque em si é discreto).
const TYPES = [
  { id: 'log-mg',         pt: 'Registar mg do dia',   en: 'Log daily mg',       defH: 21, defM: 0 },
  { id: 'log-emotions',   pt: 'Registar emoções',      en: 'Log emotions',       defH: 13, defM: 0 },
  { id: 'log-wellbeing',  pt: 'Registar bem-estar',    en: 'Log wellbeing',      defH: 20, defM: 0 },
  { id: 'log-reflection', pt: 'Reflexão do dia',       en: 'Daily reflection',   defH: 22, defM: 0 },
  { id: 'bedtime',        pt: 'Hora de ir dormir',     en: 'Time to wind down',  defH: 23, defM: 0 },
];

const STORE_KEY = 'nep_push_reminders';

function defaultReminders() {
  return TYPES.map(t => ({ id: t.id, hour: t.defH, minute: t.defM, enabled: false }));
}

export function PushRemindersSettings({ showToast }) {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'pt';
  const [reminders, setReminders] = useState(() => {
    const saved = safeLocalStorage.get(STORE_KEY, null);
    if (!Array.isArray(saved)) return defaultReminders();
    // garantir que todos os tipos existem
    return TYPES.map(t => saved.find(r => r.id === t.id) || { id: t.id, hour: t.defH, minute: t.defM, enabled: false });
  });
  const [enabling, setEnabling] = useState(false);
  const [pushOn, setPushOn] = useState(() => safeLocalStorage.get('nep_push_enabled', false));
  const [msg, setMsg] = useState(null); // { text, type }

  const notify = (text, type) => { setMsg({ text, type }); showToast?.(text, type); };

  const persist = (next) => {
    setReminders(next);
    safeLocalStorage.set(STORE_KEY, next);
    // Só enviamos ao Firestore se as notificações já estiverem ativas.
    if (pushOn) saveReminderConfig(next).catch(e => logger.error('[Push] guardar config:', e));
  };

  const label = (id) => { const t = TYPES.find(x => x.id === id); return t ? t[lang] : id; };

  const toggle = (id) => persist(reminders.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  const setTime = (id, value) => {
    const [h, m] = value.split(':').map(Number);
    persist(reminders.map(r => r.id === id ? { ...r, hour: h || 0, minute: m || 0 } : r));
  };

  const handleEnable = async () => {
    setEnabling(true);
    try {
      await enablePushReminders();
      await saveReminderConfig(reminders);
      setPushOn(true);
      safeLocalStorage.set('nep_push_enabled', true);
      notify(lang === 'pt' ? 'Notificações ativadas neste dispositivo.' : 'Notifications enabled on this device.', 'success');
    } catch (e) {
      notify(e.message || (lang === 'pt' ? 'Não foi possível ativar.' : 'Could not enable.'), 'error');
    } finally {
      setEnabling(false);
    }
  };

  const handleDisable = async () => {
    await disablePushReminders();
    setPushOn(false);
    safeLocalStorage.set('nep_push_enabled', false);
    notify(lang === 'pt' ? 'Notificações desativadas.' : 'Notifications disabled.', 'info');
  };

  const hhmm = (r) => `${String(r.hour).padStart(2, '0')}:${String(r.minute).padStart(2, '0')}`;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-4">
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2">🔔 {lang === 'pt' ? 'Lembretes (mesmo com a app fechada)' : 'Reminders (even when the app is closed)'}</h3>
        <p className="text-gray-400 text-sm mt-1">
          {lang === 'pt'
            ? 'Escolhe o que queres que te lembre e a que horas. Os avisos são discretos — não mostram nada sobre consumo.'
            : 'Choose what to be reminded of and when. Alerts are discreet — they never reveal anything about use.'}
        </p>
      </div>

      {!pushOn ? (
        <button
          onClick={handleEnable}
          disabled={enabling}
          className="w-full py-3 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
        >
          {enabling ? (lang === 'pt' ? 'A ativar…' : 'Enabling…') : (lang === 'pt' ? 'Ativar notificações neste dispositivo' : 'Enable notifications on this device')}
        </button>
      ) : (
        <div className="flex items-center justify-between bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2">
          <span className="text-green-300 text-sm">✅ {lang === 'pt' ? 'Ativado neste dispositivo' : 'Enabled on this device'}</span>
          <button onClick={handleDisable} className="text-red-400 text-sm hover:text-red-300">{lang === 'pt' ? 'Desativar' : 'Disable'}</button>
        </div>
      )}

      {msg && (
        <div className={'rounded-lg px-3 py-2 text-sm ' + (msg.type === 'error' ? 'bg-red-900/20 border border-red-700/40 text-red-300' : msg.type === 'success' ? 'bg-green-900/20 border border-green-700/40 text-green-300' : 'bg-gray-900/40 text-gray-300')}>
          {msg.text}
        </div>
      )}

      <div className="space-y-2">
        {reminders.map(r => (
          <div key={r.id} className="flex items-center gap-3 bg-gray-900/40 rounded-lg px-3 py-2">
            <input
              type="checkbox"
              checked={r.enabled}
              onChange={() => toggle(r.id)}
              className="w-5 h-5 accent-purple-600 flex-shrink-0"
            />
            <span className={'flex-1 text-sm ' + (r.enabled ? 'text-white' : 'text-gray-400')}>{label(r.id)}</span>
            <input
              type="time"
              value={hhmm(r)}
              onChange={(e) => setTime(r.id, e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        {lang === 'pt'
          ? 'Nota: os toques podem chegar alguns minutos depois da hora certa. O lembrete aparece à hora marcada mesmo que já tenhas registado.'
          : 'Note: alerts may arrive a few minutes late. The reminder fires at the set time even if you already logged it.'}
      </p>
    </div>
  );
}
