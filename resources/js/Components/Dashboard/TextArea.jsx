import React, { useEffect, useRef } from 'react';
import { useId } from 'react';

export default function Input({
    type = 'text',
    name,
    id,
    value,
    className = '',
    autoComplete,
    required,
    isFocused,
    onChange,
    label,
    errors,
    helperText,
    ...props
}) {
    const input = useRef();
    const uniqueId = useId();
    id = id || uniqueId;

    useEffect(() => {
        if (isFocused) {
            input.current?.focus();
        }
    }, [isFocused]);

    return (
        <div className="relative">
            <label htmlFor={id} className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                {...props}
                type={type}
                name={name || label.toLowerCase().replace(/\s/g, '_')} // Basic name generation
                id={id}
                value={value}
                className={`block w-full px-4 py-2.5 rounded-xl border ${
                    errors ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500' : 'border-slate-200 dark:border-slate-700 focus:border-primary-500 focus:ring-primary-500'
                } bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-all text-sm shadow-sm ${className}`}
                ref={input}
                autoComplete={autoComplete}
                required={required}
                onChange={(e) => onChange(e)}
            />
            {errors && <p className="mt-2 text-sm text-danger-600 dark:text-danger-400 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path><path d="M12 9v4"></path><path d="M12 16v.01"></path></svg>{errors}</p>}
            {helperText && !errors && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
        </div>
    );
}
