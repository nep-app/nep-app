import React from 'react';

export const InfoBadge = ({
  label,
  value,
  subValue,
  subUnit,
  isPositive = true,
  darkMode
}) => {
  const colorClasses = isPositive
    ? {
        bg: darkMode ? 'from-green-900/40 to-blue-900/40 border-green-700/50' : 'from-green-50 to-blue-50 border-green-200',
        label: darkMode ? 'text-green-400' : 'text-green-700',
        value: darkMode ? 'text-green-300' : 'text-green-900'
      }
    : {
        bg: darkMode ? 'from-yellow-900/40 to-orange-900/40 border-yellow-700/50' : 'from-yellow-50 to-orange-50 border-yellow-200',
        label: darkMode ? 'text-yellow-400' : 'text-yellow-700',
        value: darkMode ? 'text-yellow-300' : 'text-yellow-900'
      };

  return (
    <div className={`bg-gradient-to-r rounded-full px-4 py-1.5 border inline-flex items-center gap-2 ${colorClasses.bg}`}>
      <span className={`text-xs font-medium ${colorClasses.label}`}>{label}</span>
      <span className={`text-sm font-bold ${colorClasses.value}`}>
        {value}
        {subValue && <span className="text-xs ml-0.5">{subValue}{subUnit}</span>}
      </span>
    </div>
  );
};
