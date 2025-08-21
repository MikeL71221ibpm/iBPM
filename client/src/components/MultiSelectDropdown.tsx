import React, { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MultiSelectOption {
  id: string;
  label: string;
  count?: number;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder: string;
  label: string;
  maxDisplayItems?: number;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder,
  label,
  maxDisplayItems = 100
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, maxDisplayItems);

  const handleToggleOption = (optionId: string) => {
    if (selectedValues.includes(optionId)) {
      onSelectionChange(selectedValues.filter(id => id !== optionId));
    } else {
      onSelectionChange([...selectedValues, optionId]);
    }
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return placeholder;
    } else if (selectedValues.length === 1) {
      const option = options.find(opt => opt.id === selectedValues[0]);
      return option?.label || selectedValues[0];
    } else {
      return `${selectedValues.length} items selected`;
    }
  };

  return (
    <div className="space-y-0.5">
      <Label className="block text-[12px] font-bold text-gray-800">
        {label}
      </Label>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between text-left font-normal text-[10px] h-6 px-2"
          >
            <span className="truncate">{getDisplayText()}</span>
            <div className="flex items-center gap-1">
              {selectedValues.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs px-1 py-0.5 rounded-full text-[10px]">
                  {selectedValues.length}
                </span>
              )}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-full p-0 z-[100]" align="start" style={{ backgroundColor: 'white' }}>
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search options..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="p-1.5 border-b flex justify-between items-center">
            <span className="text-xs text-gray-600">
              {selectedValues.length} of {options.length} selected
            </span>
            {selectedValues.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs h-6 px-2"
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
          
          <ScrollArea className="h-64">
            <div className="p-1">
              {filteredOptions.length === 0 ? (
                <div className="text-xs text-gray-500 p-2 text-center">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleToggleOption(option.id)}
                  >
                    <div className="flex-1 text-xs">
                      <span>{option.label}</span>
                      {option.count && (
                        <span className="text-gray-500 ml-1">
                          ({option.count.toLocaleString()})
                        </span>
                      )}
                    </div>
                    {selectedValues.includes(option.id) && (
                      <Check className="h-3 w-3 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};