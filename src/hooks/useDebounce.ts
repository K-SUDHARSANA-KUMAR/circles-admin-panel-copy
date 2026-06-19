import { useState, useEffect } from 'react';

/**
 * Debounces a value by the given delay (default 500ms).
 * The returned value only updates after the input value
 * has been stable for `delay` milliseconds, preventing
 * excessive API calls on rapid keystrokes.
 *
 * @example
 * const debouncedSearch = useDebounce(searchQuery, 500);
 * // Use debouncedSearch in useEffect deps to trigger API calls
 */
export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
