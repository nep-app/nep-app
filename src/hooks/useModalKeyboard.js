import { useEffect } from 'react';

/**
 * Hook para adicionar atalhos de teclado aos modais
 * @param {boolean} isOpen - Se o modal está aberto
 * @param {function} onClose - Função para fechar o modal
 * @param {function} onSubmit - Função opcional para submeter o formulário
 */
export const useModalKeyboard = (isOpen, onClose, onSubmit) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // ESC fecha o modal
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }

      // Ctrl/Cmd + Enter submete o formulário (se disponível)
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (onSubmit) {
          e.preventDefault();
          onSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onSubmit]);
};
