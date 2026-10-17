import React, { forwardRef, useId } from 'react';
import { clsx } from 'clsx';

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  description?: string;
  className?: string;
  labelClassName?: string;
}

const FormField = forwardRef<HTMLDivElement, FormFieldProps>(
  ({ label, error, required, htmlFor, description, className, labelClassName, children, ...props }, ref) => {
    const id = useId();
    const inputId = htmlFor || id;

    return (
      <div ref={ref} className={clsx('space-y-1.5', className)} {...props}>
        {label && (
          <label htmlFor={inputId} className={clsx('block text-[12.5px] font-[600] text-[color:var(--text-secondary)]', labelClassName)}>
            {label}{required ? ' *' : null}
          </label>
        )}
        {children}
        {error && (
          <p className="text-[11.5px] font-[500] text-[var(--danger-text)] mt-1.5">{error}</p>
        )}
        {description && (
          <p className="text-[11px] text-[color:var(--text-muted)] mt-0.5">{description}</p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
export { FormField };
