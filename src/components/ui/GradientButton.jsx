import React from 'react';

export const GradientButton = ({
  onClick,
  children,
  icon: Icon,
  variant = 'purple',
  size = 'default',
  className = ''
}) => {
  const sizeClasses = size === 'large'
    ? 'p-8 text-xl rounded-2xl'
    : 'p-4 text-sm rounded-xl';

  const variantClasses = {
    purple: 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700',
    blue: 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700',
    pink: 'bg-gradient-to-br from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700',
    green: 'bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600',
    orange: 'bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
  };

  return (
    <button
      onClick={onClick}
      className={`${variantClasses[variant]} text-white ${sizeClasses} font-medium transition-all shadow-md hover:shadow-lg flex flex-col items-center ${className}`}
    >
      {Icon && <Icon className={size === 'large' ? 'w-6 h-6' : 'w-5 h-5 mb-2'} />}
      <div className={size === 'large' ? 'mt-2' : ''}>{children}</div>
    </button>
  );
};
