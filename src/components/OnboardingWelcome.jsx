import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Acolhimento de primeira utilização — 3 ecrãs curtos que explicam o "porquê"
 * da app com o tom de redução de danos (sem metas de "parar", sem julgamento).
 *
 * Mostra-se uma única vez. Quem já usa a app (já tem registos) nunca o vê —
 * a decisão de mostrar está em quem o renderiza (HomeViewRefactored).
 *
 * @param {() => void} onDone  chamado ao terminar ou saltar
 */
export function OnboardingWelcome({ onDone }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const slides = [
    { emoji: '🌱', title: t('onboarding.s1Title'), body: t('onboarding.s1Body') },
    { emoji: '👆', title: t('onboarding.s2Title'), body: t('onboarding.s2Body') },
    { emoji: '🔒', title: t('onboarding.s3Title'), body: t('onboarding.s3Body') },
  ];
  const isLast = step === slides.length - 1;
  const slide = slides[step];

  const finish = () => { onDone && onDone(); };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('onboarding.s1Title')}
    >
      <div
        className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl px-6 pt-8 pb-6 text-center motion-safe:animate-scaleIn"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
      >
        <div className="text-5xl mb-4 motion-safe:animate-sway" aria-hidden="true">{slide.emoji}</div>
        <h2 className="text-xl font-bold font-display text-white mb-2 text-balance">{slide.title}</h2>
        <p className="text-sm text-gray-300 leading-relaxed">{slide.body}</p>

        {/* Indicadores de passo */}
        <div className="flex justify-center gap-2 my-6" aria-hidden="true">
          {slides.map((_, i) => (
            <span
              key={i}
              className={'h-2 rounded-full transition-all ' + (i === step ? 'w-6 bg-purple-500' : 'w-2 bg-gray-600')}
            />
          ))}
        </div>

        <button
          onClick={() => (isLast ? finish() : setStep(step + 1))}
          className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          {isLast ? t('onboarding.start') : t('onboarding.next')}
        </button>

        {!isLast && (
          <button
            onClick={finish}
            className="mt-3 text-xs text-gray-500 hover:text-gray-300 focus:outline-none focus:underline"
          >
            {t('onboarding.skip')}
          </button>
        )}
      </div>
    </div>
  );
}
