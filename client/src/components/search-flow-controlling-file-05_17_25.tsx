// Last updated: May 17, 2025 - 7:45 PM
// Controls component: SearchFlow - used for the combined search interface

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp, AlertCircle, LineChart } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import IndividualSearch from "./search-controlling-file-05_24_25";
import PopulationSearch from "./population-search-controlling-file-05_12_25";
import { useAppContext } from "@/context/AppContext";

// Add a console log to confirm this file is being loaded
console.log("SearchFlow controlling file loaded at", new Date().toLocaleTimeString());

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
    
      {/* Search Type - MUST BE FIRST */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Search Type
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              UI UPDATED v3
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

      {/* Database Information */}
      <Card className="relative overflow-visible">
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
          
          {/* VERY VISIBLE FILE INFORMATION - DEBUGGING VERSION */}
          <div className="p-3 bg-blue-200 border-2 border-blue-500 rounded-md shadow-md mb-4">
            <div className="text-center font-bold text-blue-800 mb-2 text-sm">FILE INFORMATION - CAN YOU SEE THIS?</div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              {/* Records count with larger, more visible styling */}
              <div className="inline-flex items-center bg-blue-100 text-blue-800 text-sm rounded-md px-3 py-2 border border-blue-400 shadow-sm">
                <div className="w-5 h-5 mr-2 text-blue-600 font-bold">📊</div>
                <span className="font-semibold">6,280 records • 24 patients</span>
              </div>
              
              {/* File name and path with larger, more visible styling */}
              <div className="text-sm bg-blue-50 px-3 py-2 rounded-md border border-blue-300">
                <span className="font-semibold mr-1">File:</span>
                <span className="text-blue-700">Symptom_Segments_asof_4_30_25_MASTER.csv</span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={() => window.location.href = "/upload"}>
              <FileUp className="h-4 w-4 mr-2" />
              Upload New File
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* FileInfoTest field as requested */}
      <div className="p-4 bg-blue-100 border-2 border-blue-500 rounded-md shadow-md mb-4">
        <div className="text-center font-bold text-blue-800 text-lg">FileInfoTest</div>
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
          
          {/* VERY VISIBLE RUN ANALYSIS BUTTON - DEBUGGING VERSION */}
          <div className="p-3 bg-green-200 border-2 border-green-500 rounded-md shadow-md mb-4">
            <div className="text-center font-bold text-green-800 mb-2 text-sm">RUN ANALYSIS BUTTON - CAN YOU SEE THIS?</div>
            
            <div className="flex justify-center">
              <Button 
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-5 text-lg font-bold shadow-lg transform transition hover:scale-105"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M3 3v18h18"></path>
                  <path d="m19 9-5 5-4-4-3 3"></path>
                </svg>
                RUN ANALYSIS
              </Button>
            </div>
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