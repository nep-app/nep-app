import React from 'react';

export const StatCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  color = 'purple'
}) => {
  const colorMap = {
    purple: {
      bg: 'bg-purple-900/20',
      border: 'border-purple-700/50',
      icon: 'from-purple-500 to-pink-500',
      text: 'text-purple-300',
      value: 'text-purple-200'
    },
    blue: {
      bg: 'bg-blue-900/20',
      border: 'border-blue-700/50',
      icon: 'from-blue-500 to-cyan-500',
      text: 'text-blue-300',
      value: 'text-blue-200'
    },
    green: {
      bg: 'bg-green-900/20',
      border: 'border-green-700/50',
      icon: 'from-green-500 to-emerald-500',
      text: 'text-green-300',
      value: 'text-green-200'
    },
    orange: {
      bg: 'bg-orange-900/20',
      border: 'border-orange-700/50',
      icon: 'from-orange-500 to-yellow-500',
      text: 'text-orange-300',
      value: 'text-orange-200'
    }
  };

  const colors = colorMap[color] || colorMap.purple;

  return (
    <div className={`${colors.bg} rounded-xl p-4 border ${colors.border}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors.icon} flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-medium ${colors.text} mb-0.5`}>{label}</div>
          <div className={`text-lg font-bold ${colors.value}`}>{value}</div>
          {subtext && (
            <div className="text-xs text-gray-400 mt-0.5">
              {subtext}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
