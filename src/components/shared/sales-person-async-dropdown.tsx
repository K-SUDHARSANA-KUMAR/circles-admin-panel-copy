import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useUsers } from '@/features/user-managment/users/hooks/useUsers';

interface SalesPersonOption {
  userId: string;
  name: string;
}

interface SalesPersonAsyncDropdownProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  pageSize?: number;
  divisionId?: string;
  initialSelectedOption?: SalesPersonOption;
}

export const SalesPersonAsyncDropdown = ({
  value,
  onChange,
  placeholder = 'Select Sales Person',
  className,
  disabled = false,
  pageSize = 20,
  divisionId,
  initialSelectedOption,
}: SalesPersonAsyncDropdownProps) => {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(value);
  const [searchTerm, setSearchTerm] = useState('');
  const [skip, setSkip] = useState(0);
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');

  const debounceRef = useRef<number | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setSkip(0);
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  const { users } = useUsers({
    search: debouncedSearch || undefined,
    divisionId: divisionId || undefined,
    skip,
    limit: pageSize,
  });

  const items: SalesPersonOption[] = useMemo(() => {
    const list = users.data?.data?.items || [];
    const mappedItems = list.map((u: { userId?: string; _id?: string; name: string }) => ({ 
      userId: u.userId || u._id || '', 
      name: u.name 
    }));
    
    if (initialSelectedOption && !mappedItems.find(item => item.userId === initialSelectedOption.userId)) {
      return [initialSelectedOption, ...mappedItems];
    }
    
    return mappedItems;
  }, [users.data?.data?.items, initialSelectedOption]);

  const totalItems = users.data?.data?.totalItems ?? 0;
  const canLoadMore = skip + pageSize < totalItems;

  useEffect(() => {
    setSelectedValue(value);
    if (value && initialSelectedOption && value === initialSelectedOption.userId) {
      setDisplayName(initialSelectedOption.name);
    } else if (!value) {
      setDisplayName('');
    }
  }, [value, initialSelectedOption]);

  const handleValueChange = (newValue: string) => {
    if (newValue === 'select-sales-person' || newValue === 'clear-selection') {
      setSelectedValue(undefined);
      setDisplayName('');
      onChange?.(undefined);
    } else {
      setSelectedValue(newValue);
      const selectedPerson = items.find(item => item.userId === newValue);
      if (selectedPerson) {
        setDisplayName(selectedPerson.name);
      }
      onChange?.(newValue);
    }
  };

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchTerm('');
    }
  }, []);

  const loadMore = () => {
    if (canLoadMore) setSkip((prev) => prev + pageSize);
  };

  useEffect(() => {
    if (open) setSkip(0);
  }, [open]);

  if (selectedValue && displayName && !open) {
    return (
      <div 
        className={`flex items-center justify-between border rounded-md px-3 py-2 bg-white cursor-pointer hover:bg-gray-50 transition-colors ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
        onClick={() => {
          if (!disabled) {
            setOpen(true);
          }
        }}
      >
        <span className="text-sm">{displayName}</span>
        <svg 
          className="h-4 w-4 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    );
  }

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
        {selectedValue && displayName && (
          <SelectItem value="clear-selection" className="text-red-600">
            Clear Selection
          </SelectItem>
        )}
        {!selectedValue && <SelectItem value="select-sales-person">Select Sales Person</SelectItem>}
        {items.map((person: SalesPersonOption) => (
          <SelectItem key={person.userId} value={person.userId}>
            {person.name}
          </SelectItem>
        ))}
        {users.isLoading && (
          <div className="p-2 text-sm text-gray-500">Loading...</div>
        )}
        {!users.isLoading && items.length === 0 && (
          <div className="p-2 text-sm text-gray-500">No results</div>
        )}
        {canLoadMore && (
          <div className="p-2">
            <Button type="button" variant="outline" className="w-full" onClick={loadMore}>
              Load more
            </Button>
          </div>
        )}
      </SelectContent>
    </Select>
  );
};

export default SalesPersonAsyncDropdown; 