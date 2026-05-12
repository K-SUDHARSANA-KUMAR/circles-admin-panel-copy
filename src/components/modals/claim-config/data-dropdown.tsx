import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, Loader2 } from 'lucide-react';

interface DataItem {
  id: string;
  name: string;
  [key: string]: any;
}

interface DataDropdownProps {
  data: DataItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  idField?: string;
  nameField?: string;
}

const DataDropdown: React.FC<DataDropdownProps> = ({
  data = [],
  value,
  onChange,
  placeholder = "Select option",
  disabled = false,
  loading = false,
  error = null,
  idField = 'id',
  nameField = 'name'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get display name from record
  const getDisplayName = (record: DataItem): string => {
    return String(record[nameField] || '');
  };

  // Get ID from record
  const getId = (record: DataItem): string => {
    return String(record[idField] || '');
  };

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    
    return data.filter((record: DataItem) => {
      const displayName = getDisplayName(record);
      return displayName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [data, searchTerm, nameField]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled || loading) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
    }
  };

  const handleSelect = (itemId: string) => {
    onChange(itemId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedItem = data.find((record: DataItem) => getId(record) === value);

  return (
    <div className="relative md:w-full" ref={dropdownRef}>
      <div
        className={`
          flex items-center justify-between w-full px-3 py-2 text-left bg-card border border-gray-300 rounded-md shadow-sm cursor-pointer min-h-[40px]
          ${disabled || loading ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}
          ${isOpen ? 'border-secondary ring-1 ring-secondary' : ''}
          ${error ? 'border-red-300' : ''}
        `}
        onClick={handleToggle}
      >
        <span className={`block truncate ${!selectedItem ? 'text-gray-500' : 'text-foreground'}`}>
          {selectedItem ? getDisplayName(selectedItem) : placeholder}
        </span>
        <ChevronDown
          className={`ml-2 h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 rounded-lg border border-gray-200 bg-card shadow-xl min-w-[180px] max-w-[240px]">
          {/* Search Input */}
          {data.length > 2 && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="pl-9 w-full py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading...</span>
              </div>
            ) : error ? (
              <div className="px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            ) : (
              <>
                {/* Clear selection option */}
                <div
                  className="px-3 py-2 cursor-pointer text-sm hover:bg-gray-50 text-gray-500 border-b border-gray-100 rounded-t-lg"
                  onClick={() => handleSelect('')}
                >
                  Clear selection
                </div>
                {filteredData.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    {searchTerm ? 'No options found' : 'No options available'}
                  </div>
                ) : (
                  filteredData.map((record: DataItem) => {
                    const itemId = getId(record);
                    const displayName = getDisplayName(record);
                    if (!itemId) return null;
                    return (
                      <div
                        key={itemId}
                        className={`px-3 py-2 cursor-pointer text-sm rounded-lg transition-colors duration-100
                          ${value === itemId ? 'bg-secondary/10 text-secondary' : 'text-foreground'}
                          hover:bg-gray-50`}
                        onClick={() => handleSelect(itemId)}
                      >
                        {displayName}
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataDropdown;
