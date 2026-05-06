import * as React from 'react';
import { cn } from '@/lib/utils';

type CustomInputProps = React.ComponentProps<'input'> & {
  numericOnly?: boolean;
  disallowSpecialChars?: boolean;
  allowedCharsRegex?: RegExp;
  alphaSpaceDotOnly?: boolean;
};

const Input = React.forwardRef<HTMLInputElement, CustomInputProps>(
  (
    {
      className,
      type = 'text',
      numericOnly,
      disallowSpecialChars,
      allowedCharsRegex,
      alphaSpaceDotOnly,
      onChange,
      ...props
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;

      if (numericOnly) {
        value = value.replace(/\D/g, '');
      }

      if (disallowSpecialChars) {
        value = value.replace(/[^a-zA-Z0-9@.]/g, '');
      }

      if (alphaSpaceDotOnly) {
        value = value.replace(/[^a-zA-Z .]/g, '');
      }

      if (allowedCharsRegex) {
        value = Array.from(value)
          .filter((char) => allowedCharsRegex.test(char))
          .join('');
      }

      // 🔧 Use native value update for compatibility
      const nativeEvent = Object.create(e);
      nativeEvent.target = {
        ...e.target,
        value,
      };

      // ✅ This ensures the new value is reflected in parent state
      onChange?.(nativeEvent as React.ChangeEvent<HTMLInputElement>);
    };

    return (
      <input
        ref={ref}
        type={type}
        onChange={handleChange}
        className={cn(
          'file:text-foreground placeholder:text-muted-foreground selection:text-primary-foreground border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm transition-[color,box-shadow] outline-none selection:bg-black file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 md:text-sm',
          'focus-visible:border-freshleaf focus-visible:ring-freshleaf/40 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
