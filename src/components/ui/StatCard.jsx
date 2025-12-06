import React from 'react';

export const StatCard = ({
  label,
  value,
  subtext,
  icon: IconOrEmoji,
  color = 'purple',
  darkMode
}) => {
  const colorMap = {
    purple: {
      bg: darkMode ? 'bg-purple-900/20' : 'bg-purple-50',
      border: darkMode ? 'border-purple-700/50' : 'border-purple-200',
      icon: 'from-purple-500 to-pink-500',
      text: darkMode ? 'text-purple-300' : 'text-purple-700',
      value: darkMode ? 'text-purple-200' : 'text-purple-900'
    },
    blue: {
      bg: darkMode ? 'bg-blue-900/20' : 'bg-blue-50',
      border: darkMode ? 'border-blue-700/50' : 'border-blue-200',
      icon: 'from-blue-500 to-cyan-500',
      text: darkMode ? 'text-blue-300' : 'text-blue-700',
      value: darkMode ? 'text-blue-200' : 'text-blue-900'
    },
    green: {
      bg: darkMode ? 'bg-green-900/20' : 'bg-green-50',
      border: darkMode ? 'border-green-700/50' : 'border-green-200',
      icon: 'from-green-500 to-emerald-500',
      text: darkMode ? 'text-green-300' : 'text-green-700',
      value: darkMode ? 'text-green-200' : 'text-green-900'
    },
    orange: {
      bg: darkMode ? 'bg-orange-900/20' : 'bg-orange-50',
      border: darkMode ? 'border-orange-700/50' : 'border-orange-200',
      icon: 'from-orange-500 to-yellow-500',
      text: darkMode ? 'text-orange-300' : 'text-orange-700',
      value: darkMode ? 'text-orange-200' : 'text-orange-900'
    }
  };

  const colors = colorMap[color] || colorMap.purple;

  return (
    <div className={`${colors.bg} rounded-xl p-4 border ${colors.border}`}>
      <div className="flex items-center gap-3">
        {IconOrEmoji && (
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors.icon} flex items-center justify-center flex-shrink-0 shadow-sm`}>
            {typeof IconOrEmoji === 'string' ? (
              <span className="text-xl">{IconOrEmoji}</span>
            ) : (
              <IconOrEmoji className="w-5 h-5 text-white" />
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-medium ${colors.text} mb-0.5`}>{label}</div>
          <div className={`text-lg font-bold ${colors.value}`}>{value}</div>
          {subtext && (
            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-0.5`}>
              {subtext}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
