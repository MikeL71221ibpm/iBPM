import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface VisualizationMetadataProps {
  datasetName?: string;
  totalRecords?: number;
  filteredRecords?: number;
  totalPatients?: number;
  filteredPatients?: number;
  finalPatients?: number;
  finalRecords?: number;
  dateRange?: string;
  activeFilters?: Record<string, string | string[]>;
  lastUpdated?: string;
}

export function VisualizationMetadata({ 
  datasetName = 'Unknown dataset',
  totalRecords = 0,
  filteredRecords = 0,
  totalPatients = 0,
  filteredPatients = 0,
  finalPatients = 0,
  finalRecords = 0,
  dateRange = 'No date range specified',
  activeFilters = {}
}: VisualizationMetadataProps) {
  
  const hasActiveFilters = Object.keys(activeFilters).length > 0;
  const filtersArray = Object.entries(activeFilters);
  
  // State to track if metadata should be printed
  const [printWithCharts, setPrintWithCharts] = useState<boolean>(true);
  
  // State to track if details are expanded
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  
  // Apply print classes conditionally based on state
  const printClass = printWithCharts ? '' : 'print:hidden';
  
  return (
    <Card className={`w-full bg-gray-50 border-gray-200 shadow-sm mt-2 ${printClass}`}>
      <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
        <div className="flex items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? 
            <ChevronDown className="h-4 w-4 mr-1 text-gray-500" /> : 
            <ChevronRight className="h-4 w-4 mr-1 text-gray-500" />
          }
          <div>
            <CardTitle className="text-sm font-medium text-gray-700">Visualization Data Source</CardTitle>
            {!isExpanded && (
              <span className="text-xs text-gray-500 ml-2">
                (Click to expand)
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 print:hidden">
          <Checkbox 
            id="print-metadata" 
            checked={printWithCharts} 
            onCheckedChange={(checked) => setPrintWithCharts(checked as boolean)}
            className="h-3 w-3"
          />
          <Label 
            htmlFor="print-metadata" 
            className="text-xs text-gray-700 cursor-pointer"
          >
            Include when printing
          </Label>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <>
          <CardHeader className="p-3 pb-0 pt-1">
            <CardDescription className="text-xs text-gray-500">
              Information about the data used in this visualization
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-3 pt-2">
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-semibold text-gray-700">Dataset:</span>
                <div className="text-gray-600 text-xs whitespace-pre-line">{datasetName}</div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {/* Original Records Section */}
                <div className="mr-4">
                  <span className="font-semibold text-gray-700">Total Records:</span>
                  <span className="ml-1 text-gray-600">{totalRecords.toLocaleString()}</span>
                </div>
                {filteredRecords > 0 && filteredRecords !== totalRecords && (
                  <div>
                    <span className="font-semibold text-gray-700">Filtered Records:</span>
                    <span className="ml-1 text-gray-600">{filteredRecords.toLocaleString()}</span>
                    <span className="ml-1 text-gray-500 text-xs">
                      ({((filteredRecords / totalRecords) * 100).toFixed(1)}% of total)
                    </span>
                  </div>
                )}
              </div>
              
              {/* New Patient Count Section */}
              <div className="flex flex-wrap gap-2 mt-2">
                {totalPatients > 0 && (
                  <div className="mr-4">
                    <span className="font-semibold text-gray-700">Total Patients:</span>
                    <span className="ml-1 text-gray-600">{totalPatients.toLocaleString()}</span>
                  </div>
                )}
                
                {filteredPatients > 0 && filteredPatients !== totalPatients && (
                  <div className="mr-4">
                    <span className="font-semibold text-gray-700">Patients After Filtering:</span>
                    <span className="ml-1 text-gray-600">{filteredPatients.toLocaleString()}</span>
                    <span className="ml-1 text-gray-500 text-xs">
                      ({((filteredPatients / totalPatients) * 100).toFixed(1)}% of total)
                    </span>
                  </div>
                )}
              </div>
              
              {/* Final Count Section */}
              {finalPatients > 0 && finalRecords > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                  <div className="mr-4">
                    <span className="font-semibold text-blue-700">Final Patients:</span>
                    <span className="ml-1 text-blue-600">{finalPatients.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-700">Final Record Count:</span>
                    <span className="ml-1 text-blue-600">{finalRecords.toLocaleString()}</span>
                  </div>
                </div>
              )}
              
              <div>
                <span className="font-semibold text-gray-700">Date Range:</span>
                <span className="ml-1 text-gray-600">{dateRange}</span>
              </div>
              
              {hasActiveFilters && (
                <div>
                  <span className="font-semibold text-gray-700 block mb-1">Active Filters:</span>
                  <div className="flex flex-wrap gap-1">
                    {filtersArray.map(([key, value]) => (
                      <React.Fragment key={key}>
                        {Array.isArray(value) ? (
                          <div className="mb-1">
                            <span className="text-xs text-gray-600 mr-1">{key}:</span>
                            {value.map((v, i) => (
                              <Badge key={i} variant="outline" className="mr-1 text-xs">
                                {v}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <div className="mb-1 mr-2">
                            <span className="text-xs text-gray-600 mr-1">{key}:</span>
                            <Badge variant="outline" className="text-xs">
                              {value}
                            </Badge>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </>
      )}
    </Card>
  );
}

export default VisualizationMetadata;