import React from 'react';
import { useTranslation } from 'react-i18next';
import * as Icons from '../Icons';
import { EMOTION_CATEGORIES, EMOTION_EN } from '../../constants/emotions';
import { useModalKeyboard } from '../../hooks/useModalKeyboard';

export const EmotionsModal = ({
  isOpen,
  onClose,
  emotionsForm,
  setEmotionsForm,
  onSubmit
}) => {
  const { t, i18n } = useTranslation();
  const displayEmotion = (e) => (i18n.language === 'en' && EMOTION_EN[e]) ? EMOTION_EN[e] : e;
  useModalKeyboard(isOpen, onClose, onSubmit);

  if (!isOpen) return null;

  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const toggleEmotion = (emotion) => {
    if (emotionsForm.emotions.includes(emotion)) {
      setEmotionsForm({ ...emotionsForm, emotions: emotionsForm.emotions.filter(em => em !== emotion) });
    } else {
      setEmotionsForm({ ...emotionsForm, emotions: [...emotionsForm.emotions, emotion] });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">{t('modals.emotions.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
            <Icons.X />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('modals.emotions.dateLabel')}</label>
            <input
              type="datetime-local"
              value={emotionsForm.datetime || getCurrentDateTime()}
              onChange={(e) => setEmotionsForm({...emotionsForm, datetime: e.target.value})}
              className="bg-gray-700 border-gray-600 text-white w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-semibold mb-3 text-red-400">{t('modals.emotions.negativeLabel')}</h4>
              <div className="space-y-2">
                {EMOTION_CATEGORIES.negative.map(emotion => (
                  <label key={emotion} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emotionsForm.emotions.includes(emotion)}
                      onChange={() => toggleEmotion(emotion)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-300">{displayEmotion(emotion)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-md font-semibold mb-3 text-green-400">{t('modals.emotions.positiveLabel')}</h4>
              <div className="space-y-2">
                {EMOTION_CATEGORIES.positive.map(emotion => (
                  <label key={emotion} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emotionsForm.emotions.includes(emotion)}
                      onChange={() => toggleEmotion(emotion)}
                      className="rounded text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-300">{displayEmotion(emotion)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {EMOTION_CATEGORIES.neutral.length > 0 && (
            <div className="pt-4 border-t border-gray-700">
              <h4 className="text-md font-semibold mb-3 text-gray-400">{t('modals.emotions.otherLabel')}</h4>
              <div className="grid grid-cols-2 gap-2">
                {EMOTION_CATEGORIES.neutral.map(emotion => (
                  <label key={emotion} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emotionsForm.emotions.includes(emotion)}
                      onChange={() => toggleEmotion(emotion)}
                      className="rounded text-gray-600 focus:ring-gray-500"
                    />
                    <span className="text-sm text-gray-300">{displayEmotion(emotion)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t('modals.emotions.notesLabel')}</label>
            <textarea
              value={emotionsForm.notes}
              onChange={(e) => setEmotionsForm({...emotionsForm, notes: e.target.value})}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 h-20"
              placeholder={t('modals.emotions.notesPlaceholder')}
            />
          </div>

          <button
            onClick={onSubmit}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
