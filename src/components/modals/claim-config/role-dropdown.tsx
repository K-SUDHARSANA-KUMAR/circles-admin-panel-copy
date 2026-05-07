import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, Loader2 } from 'lucide-react';
import { useMasterRecords } from '@/features/master-managment/hooks/useMasterRecords';
import { MasterRecord } from '@/features/master-managment/types/master.types';

interface RoleDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  roles?: any[];
}

const RoleDropdown: React.FC<RoleDropdownProps> = ({
  value,
  onChange,
  placeholder = "Select Role",
  disabled = false,
  roles: propRoles
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Use the same hook as MasterRecordDropdown only if roles are not provided as props
  const { records: recordsQuery } = useMasterRecords('role', undefined, 1, 10, !propRoles);

  // Get roles from props or from the query
  const roles = useMemo(() => {
    if (propRoles) {
      return propRoles;
    }
    return recordsQuery?.data || [];
  }, [propRoles, recordsQuery?.data]);

  // Handle field name mapping for role records
  const getDisplayField = (record: MasterRecord): string => {
    const displayValue = record.roleName || record.rolename || '';
    return String(displayValue);
  };

  const getRoleId = (record: MasterRecord): string => {
    const idValue = record.roleId || record.id || '';
    return String(idValue);
  };

  // Filter roles based on search term
  const filteredRoles = useMemo(() => {
    if (!searchTerm.trim()) return roles;
    
    return roles.filter((record: MasterRecord) => {
      const displayField = getDisplayField(record);
      return String(displayField).toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [roles, searchTerm]);

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
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
    }
  };

  const handleSelect = (roleId: string) => {
    onChange(roleId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedRole = roles.find((record: MasterRecord) => getRoleId(record) === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className={`
          flex items-center justify-between w-full px-3 py-2 text-left bg-card border border-gray-300 rounded-md shadow-sm cursor-pointer
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400'}
          ${isOpen ? 'border-secondary ring-1 ring-secondary' : ''}
        `}
        onClick={handleToggle}
      >
        <span className={`block truncate ${!selectedRole ? 'text-gray-500' : 'text-foreground'}`}>
          {selectedRole ? getDisplayField(selectedRole) : placeholder}
        </span>
        <ChevronDown
          className={`ml-2 h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-gray-300 rounded-md shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                className="w-full pl-8 pr-3 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary"
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-auto">
            {!propRoles && recordsQuery?.isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading roles...</span>
              </div>
            ) : !propRoles && recordsQuery?.isError ? (
              <div className="px-3 py-2 text-sm text-red-600">
                Failed to load roles
              </div>
            ) : filteredRoles.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {searchTerm ? 'No roles found' : 'No roles available'}
              </div>
            ) : (
              filteredRoles.map((record: MasterRecord) => {
                const roleId = getRoleId(record);
                const displayName = getDisplayField(record);
                
                if (!roleId) return null;
                
                return (
                  <div
                    key={roleId}
                    className={`
                      px-3 py-2 cursor-pointer text-sm hover:bg-gray-100
                      ${value === roleId ? 'bg-secondary/10 text-secondary' : 'text-foreground'}
                    `}
                    onClick={() => handleSelect(roleId)}
                  >
                    {displayName}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleDropdown;
