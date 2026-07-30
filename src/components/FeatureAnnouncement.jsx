import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { safeLocalStorage } from '../utils/storage';

// Avisos de novidades, mostrados no Início. Cada um lê-se e fecha-se (× no canto);
// depois de fechado não volta a aparecer (fica guardado). Bilingue PT/EN.

// Um cartão de aviso, com a sua própria chave de "já vi".
function AnnouncementCard({ storageKey, emoji, title, body }) {
  const [dismissed, setDismissed] = useState(() => safeLocalStorage.get(storageKey, false) === true);
  const { i18n } = useTranslation();
  const lang = i18n.language === 'en' ? 'en' : 'pt';

  if (dismissed) return null;

  const close = () => {
    setDismissed(true);
    safeLocalStorage.set(storageKey, true);
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
        {emoji} {title[lang]}
      </p>
      <p className="text-sm text-gray-300 mt-1">
        {body[lang]}
      </p>
    </div>
  );
}

export function FeatureAnnouncement() {
  return (
    <div className="space-y-3">
      {/* Lembretes com a app fechada */}
      <AnnouncementCard
        storageKey="nep_seen_push_announcement"
        emoji="🔔"
        title={{
          pt: 'Novidade: lembretes com a app fechada',
          en: 'New: reminders even when the app is closed',
        }}
        body={{
          pt: 'Já podes receber lembretes (registar mg, emoções, ir dormir…) mesmo com a app fechada. Ativa em Definições → 🔔 Lembretes e escolhe as horas.',
          en: 'You can now get reminders (log mg, emotions, bedtime…) even when the app is closed. Turn it on in Settings → 🔔 Reminders and pick the times.',
        }}
      />

      {/* Modo disfarce */}
      <AnnouncementCard
        storageKey="nep_seen_disguise_announcement"
        emoji="🎭"
        title={{
          pt: 'Novidade: modo disfarce',
          en: 'New: disguise mode',
        }}
        body={{
          pt: 'A app pode abrir como uma calculadora normal — só um gesto secreto revela a NEP. Se te der mais tranquilidade, ativa e vê como funciona em Definições → 🔒 Segurança e bloqueio.',
          en: 'The app can open as a normal calculator — only a secret gesture reveals NEP. If it gives you more peace of mind, turn it on and see how it works in Settings → 🔒 Security & lock.',
        }}
      />

      {/* Comunidade / fórum */}
      <AnnouncementCard
        storageKey="nep_seen_community_announcement"
        emoji="💬"
        title={{
          pt: 'Novidade: já existe uma comunidade',
          en: 'New: there is now a community',
        }}
        body={{
          pt: 'Há um fórum onde podes trocar experiências com outras pessoas, no teu ritmo e sem julgamento. Encontra o link em Definições → 💬 Comunidade.',
          en: 'There is a forum where you can share experiences with other people, at your own pace and without judgment. Find the link in Settings → 💬 Community.',
        }}
      />
    </div>
  );
}
