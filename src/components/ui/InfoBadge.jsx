import React from 'react';

export const InfoBadge = ({
  label,
  value,
  subValue,
  subUnit,
  isPositive = true
}) => {
  const colorClasses = isPositive
    ? {
        bg: 'from-green-900/40 to-blue-900/40 border-green-700/50',
        label: 'text-green-400',
        value: 'text-green-300'
      }
    : {
        bg: 'from-yellow-900/40 to-orange-900/40 border-yellow-700/50',
        label: 'text-yellow-400',
        value: 'text-yellow-300'
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
