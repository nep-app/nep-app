import React from 'react';

export const AlertCard = ({ alert, darkMode }) => {
  const getColorClasses = () => {
    if (alert.type === 'positive') {
      return {
        bg: darkMode ? 'bg-green-900/40 border-green-700/60' : 'bg-green-100 border-green-300',
        text: darkMode ? 'text-green-300' : 'text-green-800'
      };
    } else if (alert.color === 'orange') {
      return {
        bg: darkMode ? 'bg-orange-900/40 border-orange-700/60' : 'bg-orange-100 border-orange-300',
        text: darkMode ? 'text-orange-300' : 'text-orange-800'
      };
    } else {
      return {
        bg: darkMode ? 'bg-red-900/40 border-red-700/60' : 'bg-red-100 border-red-300',
        text: darkMode ? 'text-red-300' : 'text-red-800'
      };
    }
  };

  const colors = getColorClasses();

  return (
    <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 border text-xs font-medium ${colors.bg} ${colors.text}`}>
      <span>{alert.emoji}</span>
      <span>{alert.text}</span>
    </div>
  );
};
