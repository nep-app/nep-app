import React from 'react';

export const MotivationalCard = ({ message, darkMode }) => {
  return (
    <div className={(darkMode ? 'bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-blue-900/20' : 'bg-gradient-to-r from-purple-100/50 via-pink-100/50 to-blue-100/50') + ' rounded-2xl p-5'}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white text-sm">💜</span>
        </div>
        <span className={(darkMode ? 'text-purple-300' : 'text-purple-700') + ' text-xs font-semibold tracking-wide uppercase'}>
          Mensagem de Hoje
        </span>
      </div>
      <p className={(darkMode ? 'text-gray-200' : 'text-gray-800') + ' text-sm leading-relaxed font-medium ml-11'}>
        {message}
      </p>
    </div>
  );
};
