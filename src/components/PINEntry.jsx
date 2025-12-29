import React, { useState, useRef, useEffect } from 'react';
import * as Icons from './Icons';

/**
 * Componente de entrada de PIN de 4 dígitos
 * 
 * Props:
 * - onComplete: (pin) => void - chamado quando PIN completo é inserido
 * - title: string - título do ecrã
 * - subtitle: string - subtítulo/instruções
 * - error: string - mensagem de erro
 * - darkMode: boolean
 */
export const PINEntry = ({ onComplete, title, subtitle, error, darkMode = true }) => {
  const [digits, setDigits] = useState(['', '', '', '']);

  // Create 4 individual refs - no array to avoid Rules of Hooks issues
  const input0Ref = useRef(null);
  const input1Ref = useRef(null);
  const input2Ref = useRef(null);
  const input3Ref = useRef(null);

  // Helper function to get ref by index
  const getInputRef = (index) => {
    switch (index) {
      case 0: return input0Ref;
      case 1: return input1Ref;
      case 2: return input2Ref;
      case 3: return input3Ref;
      default: return input0Ref;
    }
  };

  // Track if we've already called onComplete for current PIN
  const calledForPinRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const isProcessingRef = useRef(false);

  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Reset digits when error occurs
  useEffect(() => {
    if (error) {
      console.log('[PINEntry] Error received, resetting digits:', error);
      setDigits(['', '', '', '']);
      calledForPinRef.current = null;
      isProcessingRef.current = false;
      setTimeout(() => {
        input0Ref.current?.focus();
      }, 100);
    }
  }, [error]);

  useEffect(() => {
    // Focus no primeiro input quando componente monta
    console.log('[PINEntry] Component mounted, focusing first input');
    if (input0Ref.current) {
      input0Ref.current.focus();
    }
  }, []);

  useEffect(() => {
    console.log('[PINEntry] digits changed:', digits, 'isProcessing:', isProcessingRef.current);

    // Prevent running if already processing
    if (isProcessingRef.current) {
      console.log('[PINEntry] Already processing, skipping');
      return;
    }

    // Quando todos os dígitos estão preenchidos, chama onComplete
    if (digits.every(d => d !== '')) {
      const pin = digits.join('');

      // Only call if we haven't called for this PIN yet
      if (calledForPinRef.current !== pin) {
        console.log('[PINEntry] Calling onComplete with PIN');
        calledForPinRef.current = pin;
        isProcessingRef.current = true;

        try {
          const result = onCompleteRef.current(pin);
          // If it's a promise, wait for it
          if (result && typeof result.then === 'function') {
            result.finally(() => {
              console.log('[PINEntry] onComplete promise resolved');
              isProcessingRef.current = false;
            });
          } else {
            isProcessingRef.current = false;
          }
        } catch (error) {
          console.error('[PINEntry] Error calling onComplete:', error);
          isProcessingRef.current = false;
        }
      } else {
        console.log('[PINEntry] PIN already called:', pin);
      }
    }
  }, [digits]); // NO onComplete here!

  const handleChange = (index, value) => {
    // Apenas aceitar números
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Auto-focus no próximo input
    if (value && index < 3) {
      getInputRef(index + 1).current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Backspace: limpa atual e volta para anterior
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      getInputRef(index - 1).current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    const nums = paste.replace(/\D/g, '').slice(0, 4).split('');

    if (nums.length === 4) {
      setDigits(nums);
      input3Ref.current?.focus();
    }
  };

  const clearPIN = () => {
    setDigits(['', '', '', '']);
    input0Ref.current?.focus();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900">
      {/* Logo/Icon */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
          <Icons.Shield className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
        <p className="text-purple-300 text-sm">{subtitle}</p>
      </div>

      {/* PIN Input */}
      <div className="w-full max-w-xs">
        <div className="flex gap-4 justify-center mb-6" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={getInputRef(index)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={
                'w-16 h-16 text-center text-2xl font-bold rounded-lg ' +
                'bg-gray-800 border-2 text-white ' +
                'focus:outline-none focus:ring-2 focus:ring-purple-500 ' +
                'transition-all ' +
                (error
                  ? 'border-red-500 animate-shake'
                  : digit
                    ? 'border-purple-500'
                    : 'border-gray-700')
              }
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {/* Clear Button */}
        {digits.some(d => d !== '') && (
          <button
            onClick={clearPIN}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Icons.X className="w-4 h-4" />
            Limpar
          </button>
        )}
      </div>

      {/* Security Info */}
      <div className="mt-8 max-w-md">
        <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Icons.Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-purple-300">
              <p className="font-medium mb-1">🔒 Segurança & Privacidade</p>
              <p className="opacity-90">
                O teu PIN encripta todos os dados com AES-256-GCM. 
                Sem o PIN, os dados são ilegíveis. 
                Não partilhamos informação com terceiros.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
