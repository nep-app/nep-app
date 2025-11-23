import React, { useState } from 'react';
import * as Icons from '../Icons';

export const ThoughtsModal = ({
  isOpen,
  onClose,
  darkMode,
  onSubmit
}) => {
  const [thoughts, setThoughts] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (thoughts.trim().length > 0) {
      onSubmit(thoughts);
      setThoughts('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={'text-xl font-bold ' + (darkMode ? 'text-white' : 'text-gray-800')}>📝 Pensamentos</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icons.X />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className={'block text-sm font-medium ' + (darkMode ? 'text-gray-300' : 'text-gray-700') + ' mb-2'}>
              Escreve o que te vier à cabeça. Este é o teu espaço.
            </label>
            <textarea
              value={thoughts}
              onChange={(e) => setThoughts(e.target.value)}
              className={(darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300') + ' w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 h-48'}
              placeholder="Como te sentes? O que te vai na cabeça? Não há regras, escreve livremente..."
              autoFocus
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={thoughts.trim().length === 0}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Guardar no Diário
          </button>
        </div>
      </div>
    </div>
  );
};
