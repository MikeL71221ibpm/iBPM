import React from 'react';
import { Button } from "@/components/ui/button";
import { FileUp } from "lucide-react";

interface SearchStepsOrderedProps {
  type: 'individual' | 'population';
  switchTab: (tab: string) => void;
}

export default function SearchStepsOrdered({ type, switchTab }: SearchStepsOrderedProps) {
  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-6">
          {type === 'individual' ? 'Individual Patient Search' : 'Population Health Analysis'}
        </h2>
        
        {/* Search Type */}
        <div className="mb-6 border rounded-lg p-4 bg-gray-50">
          <h3 className="text-lg font-medium mb-3">Search Type</h3>
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <input 
                type="radio" 
                id={`individual-${type}`} 
                name={`search-type-${type}`} 
                className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                checked={type === 'individual'} 
                onChange={() => switchTab('individual')}
              />
              <label htmlFor={`individual-${type}`} className="text-sm font-medium text-gray-700">Individual Search</label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="radio" 
                id={`population-${type}`} 
                name={`search-type-${type}`} 
                className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                checked={type === 'population'}
                onChange={() => switchTab('population')}
              />
              <label htmlFor={`population-${type}`} className="text-sm font-medium text-gray-700">Population Health</label>
            </div>
          </div>
        </div>
        
        {/* Database Information */}
        <div className="mb-6 border rounded-lg p-4 bg-gray-50">
          <h3 className="text-lg font-medium mb-3">Database Information</h3>
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = "/upload"}
            >
              <FileUp className="h-4 w-4 mr-2" />
              Upload New File
            </Button>
            <span className="text-sm text-gray-500">
              {type === 'individual' 
                ? 'Use the search options below to find patients in your uploaded files'
                : 'Population analysis uses all patients in your uploaded files'}
            </span>
          </div>
        </div>
        
        {/* Date Range */}
        <div className="mb-6 border rounded-lg p-4 bg-gray-50">
          <h3 className="text-lg font-medium mb-3">{type === 'individual' ? 'Search Parameters' : 'Configure Analysis'}</h3>
          <p className="text-sm text-gray-500">
            {type === 'individual'
              ? 'Use the search form below to set date ranges and search for individual patients'
              : 'Set analysis parameters in the configuration panel below'}
          </p>
        </div>
      </div>
    </div>
  );
}