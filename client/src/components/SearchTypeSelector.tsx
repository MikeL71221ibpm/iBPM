import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import IndividualSearch from './IndividualSearch';
import PopulationSearch from './PopulationSearch';

interface SearchTypeSelectorProps {
  initialType?: "individual" | "population";
  onSearchTypeChange?: (type: "individual" | "population") => void;
}

export default function SearchTypeSelector({ 
  initialType = "individual",
  onSearchTypeChange
}: SearchTypeSelectorProps) {
  const [searchType, setSearchType] = useState<"individual" | "population">(initialType);
  
  // Update searchType if initialType prop changes
  useEffect(() => {
    setSearchType(initialType);
  }, [initialType]);
  
  // Handle search type change
  const handleSearchTypeChange = (value: string) => {
    const newType = value as "individual" | "population";
    setSearchType(newType);
    
    // Notify parent if callback exists
    if (onSearchTypeChange) {
      onSearchTypeChange(newType);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Type Selection - MUST BE FIRST */}
      <Card>
        <CardHeader>
          <CardTitle>Search Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Label className="text-sm font-medium text-neutral-700 mb-1 block">Search Type</Label>
            <RadioGroup 
              value={searchType}
              onValueChange={handleSearchTypeChange}
              className="flex flex-row space-x-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual-type" />
                <Label htmlFor="individual-type" className="font-medium">Individual Patient Search</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="population" id="population-type" />
                <Label htmlFor="population-type" className="font-medium">Population Health Analysis</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Database Information */}
      <Card>
        <CardHeader>
          <CardTitle>Database Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            {searchType === "individual" 
              ? "Search for specific patients in your uploaded files."
              : "Analyze population health trends across all patients."
            }
          </p>
          <div className="flex justify-center">
            <a href="/upload" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              Upload New File
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Conditionally show either Individual Search or Population Visualizations */}
      {searchType === "individual" ? (
        <IndividualSearch />
      ) : (
        <PopulationSearch />
      )}
    </div>
  );
}