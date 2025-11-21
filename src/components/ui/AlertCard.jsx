import React from 'react';

export const AlertCard = ({ alert, darkMode }) => {
  const getColorClasses = () => {
    if (alert.type === 'positive') {
      return {
        bg: darkMode ? 'from-green-900/30 to-emerald-900/30 border-green-700/50' : 'from-green-50 to-emerald-50 border-green-200',
        text: darkMode ? 'text-green-400' : 'text-green-700'
      };
    } else if (alert.color === 'orange') {
      return {
        bg: darkMode ? 'from-orange-900/30 to-yellow-900/30 border-orange-700/50' : 'from-orange-50 to-yellow-50 border-orange-200',
        text: darkMode ? 'text-orange-400' : 'text-orange-700'
      };
    } else {
      return {
        bg: darkMode ? 'from-red-900/30 to-pink-900/30 border-red-700/50' : 'from-red-50 to-pink-50 border-red-200',
        text: darkMode ? 'text-red-400' : 'text-red-700'
      };
    }
  };

  const colors = getColorClasses();

  return (
    <div className={`bg-gradient-to-r rounded-lg p-2 border ${colors.bg}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm">{alert.emoji}</span>
        <span className={`text-xs font-medium ${colors.text}`}>{alert.text}</span>
      </div>
    </div>
  );
};
