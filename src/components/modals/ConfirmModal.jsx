import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Modal de confirmação com o estilo da app (substitui o window.confirm nativo,
 * que destoava do resto). Usado sobretudo para apagar registos.
 *
 * Fecha com Esc ou clique fora (= cancelar). O botão de confirmar recebe foco
 * ao abrir. Pensado para ser controlado por uma promessa em App.jsx.
 */
export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger = true,
}) {
  const { t } = useTranslation();
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter') onConfirm?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
    >
      <div
        className="w-full max-w-xs bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl p-5 motion-safe:animate-scaleIn"
        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
      >
        <h3 className="text-base font-bold text-white mb-1.5">{title || t('messages.confirmTitle')}</h3>
        <p className="text-sm text-gray-300 leading-relaxed mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={
              'flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 ' +
              (danger
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400'
                : 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-400')
            }
          >
            {confirmLabel || t('messages.confirmDelete')}
          </button>
        </div>
      </div>
    </div>
  );
}
