import React from 'react';
import * as Icons from '../Icons';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

export const ReflectionModal = ({
  isOpen,
  onClose,
  currentDbtQuestion,
  reflectionAnswer,
  setReflectionAnswer,
  onSubmit
}) => {
  useModalKeyboard(isOpen, onClose, onSubmit);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className='text-xl font-bold text-white'>Reflexão diária</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icons.X />
          </button>
        </div>
        <div className="space-y-4">
          <div className="bg-purple-900/40 rounded-lg p-4 border border-purple-700/50">
            <p className="text-purple-200 font-medium">{currentDbtQuestion}</p>
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-300 mb-1'>A tua reflexão</label>
            <textarea
              value={reflectionAnswer}
              onChange={(e) => setReflectionAnswer(e.target.value)}
              className='bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 h-32'
              placeholder="Escreve os teus pensamentos..."
            />
          </div>
          <button
            onClick={onSubmit}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all font-medium"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};
