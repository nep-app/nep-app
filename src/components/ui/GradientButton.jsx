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
    purple: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600',
    blue: 'bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600',
    pink: 'bg-gradient-to-br from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600',
    green: 'bg-gradient-to-br from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
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
