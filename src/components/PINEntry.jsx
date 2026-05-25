import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from './Icons';

/**
 * PINEntry - Um único input escondido + display visual de 4 círculos.
 * Muito mais rápido em mobile (sem saltos de foco entre inputs).
 */
export const PINEntry = ({ onComplete, title, subtitle, error }) => {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const inputRef = useRef(null);
  const calledForPinRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Focar input ao montar
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, []);

  // Limpar e re-focar ao receber erro
  useEffect(() => {
    if (error) {
      setPin('');
      calledForPinRef.current = null;
      isProcessingRef.current = false;
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [error]);

  // Chamar onComplete quando os 4 dígitos estão preenchidos
  useEffect(() => {
    if (
      pin.length === 4 &&
      !isProcessingRef.current &&
      calledForPinRef.current !== pin
    ) {
      calledForPinRef.current = pin;
      isProcessingRef.current = true;
      try {
        const result = onComplete(pin);
        if (result && typeof result.then === 'function') {
          result.finally(() => { isProcessingRef.current = false; });
        } else {
          isProcessingRef.current = false;
        }
      } catch (err) {
        console.error('[PINEntry] onComplete error:', err);
        isProcessingRef.current = false;
      }
    }
  }, [pin, onComplete]);

  const handleChange = (e) => {
    if (isProcessingRef.current) return;
    // Aceitar só dígitos, máx 4
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
  };

  const handleClear = () => {
    setPin('');
    calledForPinRef.current = null;
    isProcessingRef.current = false;
    inputRef.current?.focus();
  };

  const focusInput = () => inputRef.current?.focus();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
          <Icons.Shield className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
        <p className="text-purple-300 text-sm">{subtitle}</p>
      </div>

      <div className="w-full max-w-xs">
        {/* Círculos visuais — clicar foca o input escondido */}
        <div
          className="relative flex gap-4 justify-center mb-6 cursor-pointer"
          onClick={focusInput}
          role="button"
          tabIndex={-1}
          aria-label="Introduzir PIN"
        >
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={
                'w-16 h-16 rounded-lg bg-gray-800 border-2 flex items-center justify-center transition-all ' +
                (error
                  ? 'border-red-500 animate-shake'
                  : pin[i]
                    ? 'border-purple-500'
                    : 'border-gray-700')
              }
            >
              {pin[i]
                ? <span className="text-2xl font-bold text-white select-none">●</span>
                : <span className="text-gray-600 text-2xl select-none">○</span>
              }
            </div>
          ))}

          {/* Input único, invisível, que recebe o foco e os toques do teclado */}
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            value={pin}
            onChange={handleChange}
            maxLength={4}
            autoComplete="one-time-code"
            aria-label="PIN"
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              width: '100%',
              height: '100%',
              fontSize: '16px', // evitar zoom iOS ao focar
              cursor: 'pointer',
              caretColor: 'transparent',
            }}
          />
        </div>

        {/* Erro */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {/* Limpar */}
        {pin.length > 0 && (
          <button
            onClick={handleClear}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Icons.X className="w-4 h-4" />
            {t('pin.clear')}
          </button>
        )}
      </div>

      {/* Info de segurança */}
      <div className="mt-8 max-w-md">
        <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Icons.Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-purple-300">
              <p className="font-medium mb-1">{t('pin.securityTitle')}</p>
              <p className="opacity-90">{t('pin.securityText')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
