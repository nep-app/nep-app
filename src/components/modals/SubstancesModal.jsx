import React from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../Icons';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';
import { SubstancesManager } from '../SubstancesManager';

// "As minhas substâncias" num ecrã próprio (botão no fim do Início, ao lado
// das Metas). É o mesmo que aparece dentro das Metas.
export const SubstancesModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  useModalKeyboard(isOpen, onClose, null);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-bold text-white">🧪 {t('substances.settingsTitle')}</h3>
          <button onClick={onClose} aria-label={t('common.cancel')} className="text-gray-400 hover:text-gray-300">
            <Icons.X />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">{t('substances.settingsSubtitle')}</p>
        <SubstancesManager />
      </div>
    </div>
  );
};
