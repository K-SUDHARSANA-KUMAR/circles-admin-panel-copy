import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WordRotate } from '@/components/magicui/word-rotate';

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  debounceMs?: number;
  minWidth?: string;
  rotatingWords?: string[];
  staticPrefix?: string;
  rotateDuration?: number;
}

export function SearchInput({
  placeholder = 'Search...',
  value,
  onChange,
  className = '',
  debounceMs = 300,
  minWidth = '200px',
  rotatingWords,
  staticPrefix = 'Search by',
  rotateDuration = 2500,
}: SearchInputProps) {
  const [searchValue, setSearchValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  // Sync internal state with external value prop
  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue.length >= 3 || searchValue.length === 0) {
        onChange(searchValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchValue, onChange, debounceMs]);

  const shouldShowRotatingPlaceholder = rotatingWords && rotatingWords.length > 0 && !isFocused && !searchValue;

  return (
    <div className="relative" style={{ minWidth }}>
      <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 z-10 transition-transform duration-200 ease-in-out ${isFocused ? 'rotate-90' : 'rotate-0'}`} />
      
      {shouldShowRotatingPlaceholder && (
        <div className="absolute left-9 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-sm flex items-center gap-1 z-0">
          <span>{staticPrefix}</span>
          <WordRotate
            words={rotatingWords}
            duration={rotateDuration}
            className="text-sm font-normal"
            motionProps={{
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -10 },
              transition: { duration: 0.2, ease: "easeOut" },
            }}
          />
        </div>
      )}
      
      <Input
        placeholder={shouldShowRotatingPlaceholder ? '' : placeholder}
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`pl-9 ${className}`}
      />
    </div>
  );
} 