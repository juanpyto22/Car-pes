import React from 'react';

export const Badge = ({ className = '', variant = 'default', children, ...props }) => {
  const variants = {
    default: 'bg-slate-700 text-gray-200 border-slate-600',
    outline: 'bg-transparent text-gray-300 border-gray-500',
    secondary: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    destructive: 'bg-red-500/20 text-red-300 border-red-500/50',
    success: 'bg-green-500/20 text-green-300 border-green-500/50'
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        variants[variant] || variants.default
      } ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
