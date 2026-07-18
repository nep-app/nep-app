import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../Icons';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

export const ThoughtsModal = ({
  isOpen,
  onClose,
  thoughtDatetime,
  setThoughtDatetime,
  onSubmit,
  initialContent = ''
}) => {
  const { t } = useTranslation();
  const [thoughts, setThoughts] = useState('');

  const handleSubmit = () => {
    if (thoughts.trim().length > 0) {
      onSubmit(thoughts);
      setThoughts('');
    }
  };

  useModalKeyboard(isOpen, onClose, handleSubmit);

  // Pre-fill with initialContent when editing
  useEffect(() => {
    if (isOpen && initialContent) {
      setThoughts(initialContent);
    } else if (!isOpen) {
      setThoughts('');
    }
  }, [isOpen, initialContent]);

  // Auto-preencher data/hora atual quando modal abre
  useEffect(() => {
    if (isOpen && !thoughtDatetime) {
      const now = new Date();
      const localDateTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
        .toISOString()
        .slice(0, 16);
      setThoughtDatetime(localDateTime);
    }
  }, [isOpen, thoughtDatetime, setThoughtDatetime]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className='text-xl font-bold text-white'>{t('modals.thoughts.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icons.X />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className='block text-sm font-medium text-gray-300 mb-1'>{t('modals.thoughts.dateLabel')}</label>
            <input
              type="datetime-local"
              value={thoughtDatetime}
              onChange={(e) => setThoughtDatetime(e.target.value)}
              className='bg-gray-700 border-gray-600 text-white w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400'
            />
            <p className="text-xs text-gray-400 mt-1">{t('modals.thoughts.datePlaceholder')}</p>
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-300 mb-2'>
              {t('modals.thoughts.contentLabel')}
            </label>
            <textarea
              value={thoughts}
              onChange={(e) => setThoughts(e.target.value)}
              className='bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 h-48'
              placeholder={t('modals.thoughts.contentPlaceholder')}
              autoFocus
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={thoughts.trim().length === 0}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('modals.thoughts.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
