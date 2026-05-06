import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Control } from 'react-hook-form';
import { Leaf } from 'lucide-react';
import { IconMoodEmpty } from '@tabler/icons-react';

interface SelectOption {
  label: string;
  value: string;
}

interface FormSelectProps {
  control: Control<any>;
  name: string;
  label: string;
  placeholder: string;
  options: SelectOption[];
  disabled?: boolean;
  onChange?: (value: string) => void;
}

export function FormSelect({
  control,
  name,
  label,
  placeholder,
  options,
  disabled = false,
  onChange,
}: FormSelectProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select 
            onValueChange={(value) => {
              field.onChange(value);
              if (onChange) {
                onChange(value);
              }
            }} 
            value={field.value} 
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.length > 0 ? (
                options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 py-6 text-xs text-neutral-400">
                  <IconMoodEmpty className="h-8 w-8" />
                  <span>Wow! Such Empty</span>
                </div>
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
} 