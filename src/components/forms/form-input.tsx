'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useFormContext, Controller } from 'react-hook-form';

type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label?: string;
  onBlurApi?: (value: string) => void;
  numericOnly?: boolean; // ✅ New prop
};

const InputField: React.FC<InputFieldProps> = ({
  name,
  label,
  placeholder,
  onBlurApi,
  onKeyUp,
  onKeyPress,
  numericOnly = false, // default false
  ...rest
}) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input
              {...field}
              {...rest}
              placeholder={placeholder}
              inputMode={numericOnly ? 'numeric' : rest.inputMode}
              pattern={numericOnly ? '[0-9]*' : rest.pattern}
              onBlur={(e) => {
                field.onBlur();
                onBlurApi?.(e.target.value);
              }}
              onKeyPress={(e) => {
                if (numericOnly && !/[0-9]/.test(e.key)) {
                  e.preventDefault();
                }
                onKeyPress?.(e);
              }}
              onChange={(e) => {
                const value = numericOnly
                  ? e.target.value.replace(/\D/g, '') // Remove non-digits
                  : e.target.value;
                field.onChange(value);
              }}
              onKeyUp={onKeyUp}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default InputField;
