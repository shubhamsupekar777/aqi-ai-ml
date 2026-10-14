import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
            {label}
          </label>
        )}
        <input
          id={id}
          type={type}
          ref={ref}
          className={cn(
            'flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] text-red-600">{error}</p>}
        {helperText && !error && <p className="text-[11px] text-slate-500">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, children, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-slate-700">
            {label}
          </label>
        )}
        <select
          id={id}
          ref={ref}
          className={cn(
            'flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 shadow-xs transition-colors focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500',
            className
          )}
          {...props}
        >
          {options ? options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )) : children}
        </select>
        {error && <p className="text-[11px] text-red-600">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
