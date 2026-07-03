import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { safeLocalStorage } from '../utils/storage';

// Aviso de nova funcionalidade, mostrado no Início. Lê-se e fecha-se (× no canto);
// depois de fechado não volta a aparecer (fica guardado). Bilingue PT/EN.
const KEY = 'nep_seen_push_announcement';

export function FeatureAnnouncement() {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'pt';
  const [dismissed, setDismissed] = useState(() => safeLocalStorage.get(KEY, false) === true);

  if (dismissed) return null;

  const close = () => {
    setDismissed(true);
    safeLocalStorage.set(KEY, true);
  };

  return (
    <div className="relative bg-purple-900/25 border border-purple-600/40 rounded-xl p-4">
      <button
        onClick={close}
        aria-label={lang === 'pt' ? 'Fechar aviso' : 'Dismiss'}
        className="absolute top-2 right-3 text-gray-400 hover:text-white text-xl leading-none"
      >
        ×
      </button>
      <p className="font-semibold text-white pr-6">
        🔔 {lang === 'pt' ? 'Novidade: lembretes com a app fechada' : 'New: reminders even when the app is closed'}
      </p>
      <p className="text-sm text-gray-300 mt-1">
        {lang === 'pt'
          ? 'Já podes receber lembretes (registar mg, emoções, ir dormir…) mesmo com a app fechada. Ativa em Definições → 🔔 Lembretes e escolhe as horas.'
          : 'You can now get reminders (log mg, emotions, bedtime…) even when the app is closed. Turn it on in Settings → 🔔 Reminders and pick the times.'}
      </p>
    </div>
  );
}
