// src/components/ui/Badge.jsx

import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-dark-600 text-gray-300 border-dark-400',
  success: 'bg-green-900 text-green-300 border-green-700',
  warning: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  danger: 'bg-red-900 text-red-300 border-red-700',
  info: 'bg-blue-900 text-blue-300 border-blue-700',
  surgical: 'bg-surgical-900 text-surgical-300 border-surgical-700',
};

export default function Badge({ children, variant = 'default', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
