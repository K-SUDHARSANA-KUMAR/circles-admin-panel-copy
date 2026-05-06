import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect } from 'react';

interface SalesPerson {
  userId: string;
  name: string;
}

interface SalesPersonDropdownProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  salesPersons: SalesPerson[];
}

export const SalesPersonDropdown = ({
  value,
  onChange,
  placeholder = 'Select Sales Person',
  className,
  disabled = false,
  salesPersons,
}: SalesPersonDropdownProps) => {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(value);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  const filteredSalesPersons = useMemo(() => {
    if (!searchTerm.trim()) return salesPersons;
    return salesPersons.filter((person: SalesPerson) =>
      person.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [salesPersons, searchTerm]);

  const handleValueChange = (newValue: string) => {
    if (newValue === 'select-sales-person') {
      setSelectedValue(undefined);
      onChange?.(undefined);
    } else {
      setSelectedValue(newValue);
      onChange?.(newValue);
    }
  };

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setSearchTerm('');
    }
  }, []);

  return (
    <Select
      value={selectedValue ?? ''}
      onValueChange={handleValueChange}
      disabled={disabled}
      onOpenChange={handleOpenChange}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {salesPersons.length > 2 && (
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search sales persons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="pl-9 w-full"
              />
            </div>
          </div>
        )}
        <SelectItem value="select-sales-person">Select Sales Person</SelectItem>
        {filteredSalesPersons.map((person: SalesPerson) => (
          <SelectItem key={person.userId} value={person.userId}>
            {person.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
