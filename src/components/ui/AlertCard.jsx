import React from 'react';

export const AlertCard = ({ alert }) => {
  const getColorClasses = () => {
    if (alert.type === 'positive') {
      return {
        bg: 'bg-green-900/40 border-green-700/60',
        text: 'text-green-300'
      };
    } else if (alert.color === 'orange') {
      return {
        bg: 'bg-orange-900/40 border-orange-700/60',
        text: 'text-orange-300'
      };
    } else {
      return {
        bg: 'bg-red-900/40 border-red-700/60',
        text: 'text-red-300'
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
