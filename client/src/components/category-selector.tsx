// Category Selector Component that allows selecting and filtering categories
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

interface CategorySelectorProps {
  allCategories: string[];
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  maxHeight?: number;
}

export function CategorySelector({
  allCategories,
  selectedCategories,
  setSelectedCategories,
  maxHeight = 300
}: CategorySelectorProps) {
  const [filter, setFilter] = React.useState("");
  
  // Filter categories based on search input
  const filteredCategories = React.useMemo(() => {
    if (!filter.trim()) return allCategories;
    const lowercaseFilter = filter.toLowerCase();
    return allCategories.filter(cat => 
      cat.toLowerCase().includes(lowercaseFilter)
    );
  }, [allCategories, filter]);

  // Toggle a category's selection
  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  // Helper function to select or deselect all visible categories
  const selectAll = (select: boolean) => {
    if (select) {
      // Add all filtered categories that aren't already selected
      const newCategories = [...selectedCategories];
      filteredCategories.forEach(cat => {
        if (!selectedCategories.includes(cat)) {
          newCategories.push(cat);
        }
      });
      setSelectedCategories(newCategories);
    } else {
      // Remove all filtered categories from selection
      setSelectedCategories(
        selectedCategories.filter(cat => !filteredCategories.includes(cat))
      );
    }
  };

  return (
    <div className="space-y-2">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search categories..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="pl-8"
        />
      </div>
      
      {/* Select/Deselect All buttons */}
      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => selectAll(true)}
          className="text-xs"
        >
          Select All
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => selectAll(false)}
          className="text-xs"
        >
          Deselect All
        </Button>
      </div>
      
      {/* Category checkboxes */}
      <ScrollArea className={`pr-4 max-h-[${maxHeight}px]`}>
        <div className="space-y-1">
          {filteredCategories.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category}`}
                checked={selectedCategories.includes(category)}
                onCheckedChange={() => toggleCategory(category)}
              />
              <Label
                htmlFor={`category-${category}`}
                className="flex-1 cursor-pointer text-sm"
              >
                {category}
              </Label>
            </div>
          ))}
          
          {filteredCategories.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No categories match your search
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default CategorySelector;