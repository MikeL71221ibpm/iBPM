import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp, AlertCircle, LineChart } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import IndividualSearch from "./IndividualSearch";
import PopulationSearch from "./PopulationSearch";
import { useAppContext } from "@/context/AppContext";

// Add a console log to confirm this file is being loaded
console.log("SearchFlow component loaded at", new Date().toLocaleTimeString());

interface SearchFlowProps {
  initialType?: "individual" | "population";
  onSearchTypeChange?: (type: "individual" | "population") => void;
}

const SearchFlow = ({ 
  initialType = "individual", 
  onSearchTypeChange 
}: SearchFlowProps) => {
  console.log("SearchFlow rendering with initialType:", initialType);
  const [searchType, setSearchType] = useState<"individual" | "population">(initialType);
  const { updateSearchConfig } = useAppContext();
  
  // Force component to re-render periodically for development
  const [forceUpdate, setForceUpdate] = useState(0);
  
  useEffect(() => {
    console.log("SearchFlow mounted/updated!");
    
    // Set a timer to force update every 5 seconds (for development only)
    const timer = setInterval(() => {
      setForceUpdate(prev => prev + 1);
      console.log("SearchFlow force update:", forceUpdate);
    }, 5000);
    
    return () => clearInterval(timer);
  }, []);

  const handleSearchTypeChange = (value: string) => {
    const newType = value as "individual" | "population";
    setSearchType(newType);
    
    // Only notify parent if the callback exists
    if (onSearchTypeChange) {
      onSearchTypeChange(newType);
    } else {
      // If no parent callback, update context directly
      updateSearchConfig({
        searchType: newType,
        useAllDates: false,
        useCachedData: false,
        userInitiated: true
      });
    }
  };

  console.log("SearchFlow rendering at:", new Date().toLocaleTimeString());

  return (
    <div className="space-y-6">
      {/* Debug indicator - ALWAYS VISIBLE */}
      <div className="bg-red-100 border-2 border-red-500 text-red-800 p-3 rounded-lg mb-4 animate-pulse">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span className="font-bold">UPDATED SEARCHFLOW v2: {new Date().toLocaleTimeString()}</span>
        </div>
        <p className="text-xs mt-1">
          SearchFlow component has been updated. If you can see this message, the changes are working.
        </p>
      </div>
    
      {/* Select Search Type - MUST BE FIRST */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Select Search Type
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              UI UPDATED v2
            </span>
          </CardTitle>
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

      {/* Database Information Section - Replaces File Selection */}
      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center">
          <div className="inline-flex items-center mr-4 bg-blue-100 text-blue-800 text-sm rounded-md px-3 py-2">
            <div className="w-5 h-5 mr-2 text-blue-600">📊</div>
            <span className="font-medium">1,061 records from 24 patients</span>
          </div>
          {searchType === "individual" 
            ? <span className="text-sm text-gray-600">Search for specific patients in the database</span>
            : <span className="text-sm text-gray-600">Analyze population health trends across all patients</span>
          }
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.href = "/upload"}>
          <FileUp className="h-4 w-4 mr-1" />
          Upload Data
        </Button>
      </div>

      {/* Date Range Selection */}
      <Card className="relative overflow-visible">
        <CardHeader>
          <CardTitle>Date Range Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="all-dates"
              checked={true}
              className="mr-2 h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <label htmlFor="all-dates" className="text-sm font-medium">
              Use all Dates of Service
            </label>
          </div>
          
          <div className="flex justify-center mt-6">
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-base font-medium shadow-md transition hover:shadow-lg"
            >
              <LineChart className="h-5 w-5 mr-2" />
              Run Analysis
            </Button>
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
};

export default SearchFlow;