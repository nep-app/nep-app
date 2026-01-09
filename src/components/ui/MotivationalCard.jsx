import React from 'react';

export const MotivationalCard = ({ message }) => {
  return (
    <div className="bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-blue-900/20 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white text-sm">💜</span>
        </div>
        <span className="text-purple-300 text-xs font-semibold tracking-wide uppercase">
          Mensagem de Hoje
        </span>
      </div>
      <p className="text-gray-200 text-sm leading-relaxed font-medium ml-11">
        {message}
      </p>
    </div>
  );
};
