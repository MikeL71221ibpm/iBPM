import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, X, Check } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  count?: number;
}

interface SimpleMultiSelectDropdownProps {
  options: Option[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  maxDisplayItems?: number;
}

export const SimpleMultiSelectDropdown: React.FC<SimpleMultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Select options...",
  label = "Select items:",
  maxDisplayItems = 20
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, maxDisplayItems);

  const handleToggleOption = (optionId: string) => {
    console.log('🔥 Simple Dropdown Selection:', { optionId, currentSelected: selectedValues, label });
    if (selectedValues.includes(optionId)) {
      const newValues = selectedValues.filter(id => id !== optionId);
      console.log('🔥 Removing selection:', { optionId, newValues });
      onSelectionChange(newValues);
    } else {
      const newValues = [...selectedValues, optionId];
      console.log('🔥 Adding selection:', { optionId, newValues });
      onSelectionChange(newValues);
    }
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      const option = options.find(opt => opt.id === selectedValues[0]);
      return option?.label || selectedValues[0];
    }
    return `${selectedValues.length} selected`;
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between text-left font-normal"
      >
        <span className="truncate">{getDisplayText()}</span>
        <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search options..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between p-2 border-b bg-gray-50">
            <span className="text-xs text-gray-600">
              {selectedValues.length} of {options.length} selected
            </span>
            {selectedValues.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-red-600 hover:text-red-800 flex items-center"
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="text-xs text-gray-500 p-2 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center justify-between py-2 px-3 cursor-pointer transition-colors ${
                    selectedValues.includes(option.id) 
                      ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleToggleOption(option.id)}
                >
                  <div className="flex-1 text-xs">
                    <span className={`font-medium ${selectedValues.includes(option.id) ? 'text-blue-700' : 'text-gray-800'}`}>
                      {option.label}
                    </span>
                    {option.count && (
                      <span className="text-gray-500 ml-1">
                        ({option.count.toLocaleString()})
                      </span>
                    )}
                  </div>
                  {selectedValues.includes(option.id) && (
                    <Check className="h-4 w-4 text-blue-600 ml-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};