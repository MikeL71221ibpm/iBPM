import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, LineChart, Loader2, Search } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { toast } from "@/hooks/use-toast";
import IndividualSearch from "@/components/IndividualSearch";

/**
 * Enhanced component that combines the original IndividualSearch functionality
 * with the new File Information display and Run Analysis button.
 * This preserves all previous work while adding the new features.
 */
const SuperFixed: React.FC = () => {
  const { 
    fileInfo, 
    isLoading, 
    runPopulationSearch, 
    searchResults,
    updateSearchConfig
  } = useAppContext();
  
  // Handle running the analysis
  const handleRunAnalysis = async () => {
    if (!fileInfo || !fileInfo.fileName) {
      toast({
        title: "No file selected",
        description: "Please upload or select a file before running analysis.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Set up the search config for population analysis
      await runPopulationSearch({
        searchType: "population",
        matchType: "exact",
        useAllDates: true,
        useCachedData: true
      });
      
      toast({
        title: "Analysis Complete",
        description: "Your data has been processed successfully.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error running analysis:", error);
      toast({
        title: "Analysis Failed",
        description: "There was an error processing your data. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* FILE INFORMATION DISPLAY CARD */}
      <Card className="bg-blue-50 shadow-lg border border-blue-200">
        <CardHeader className="bg-blue-100 border-b border-blue-200">
          <CardTitle className="flex items-center text-blue-800">
            <FileUp className="h-5 w-5 mr-2" />
            File Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {fileInfo && fileInfo.fileName ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Records count */}
              <div className="inline-flex items-center bg-blue-100 text-blue-800 text-sm rounded-md px-3 py-2 border border-blue-200 shadow-sm">
                <div className="w-5 h-5 mr-2 text-blue-600 font-bold">📊</div>
                <span className="font-semibold">
                  {fileInfo.totalRecords?.toLocaleString() || "0"} records • {fileInfo.patients?.length || "0"} patients
                </span>
              </div>
              
              {/* File name */}
              <div className="text-sm bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
                <span className="font-semibold mr-1">File:</span>
                <span className="text-blue-700">{fileInfo.fileName}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-blue-800">
              No file information available. Please upload a file or run a search.
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* RUN ANALYSIS BUTTON CARD */}
      <Card className="bg-green-50 shadow-lg border border-green-200">
        <CardHeader className="bg-green-100 border-b border-green-200">
          <CardTitle className="flex items-center text-green-800">
            <LineChart className="h-5 w-5 mr-2" />
            Run Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-4">
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-5 text-lg font-bold shadow-lg transform transition hover:scale-105"
              onClick={handleRunAnalysis}
              disabled={isLoading || !fileInfo?.fileName}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  PROCESSING...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M3 3v18h18"></path>
                    <path d="m19 9-5 5-4-4-3 3"></path>
                  </svg>
                  RUN ANALYSIS
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Status indicator if analysis is running or complete */}
      {searchResults?.patients && searchResults.patients.length > 0 && (
        <div className="p-3 bg-green-100 border border-green-300 rounded-md text-green-800 text-center mb-6">
          Analysis complete: Found data for {searchResults.patients.length} patients.
        </div>
      )}
      
      {/* INDIVIDUAL SEARCH COMPONENT - Including the original functionality */}
      <Card className="shadow-md border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2 text-blue-600" />
            Individual Patient Search
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Include the original IndividualSearch component here */}
          <IndividualSearch />
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperFixed;