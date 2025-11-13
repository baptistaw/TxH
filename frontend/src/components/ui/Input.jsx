// src/components/ui/Input.jsx

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

const Input = forwardRef(
  ({ label, error, helperText, className, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <input
          ref={ref}
          type={type}
          className={cn(
            'w-full px-4 py-2 rounded-lg',
            'bg-dark-700 border border-dark-400',
            'text-gray-100 placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-surgical-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />

        {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}

        {helperText && !error && (
          <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
