import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SearchParams, Patient, ExtractedSymptom } from "@shared/schema";
import { useDataProcessing } from "./useDataProcessing";
import { useAppContext } from "@/context/AppContext";

interface SearchResults {
  patients: Patient[];
  totalFound: number;
  uniquePatients: number;
}

export const useSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchSuccess, setSearchSuccess] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [extractionResults, setExtractionResults] = useState<ExtractedSymptom[] | null>(null);
  
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  
  const { toast } = useToast();
  const { extractSymptoms, getVisualizationData } = useDataProcessing();
  const { setExtractedData } = useAppContext();
  
  const searchPatients = async (params: SearchParams) => {
    setIsSearching(true);
    setSearchSuccess(false);
    
    try {
      const response = await apiRequest('POST', '/api/search', params);
      const results = await response.json();
      
      setSearchResults(results);
      setSearchSuccess(true);
      
      if (results.patients.length === 0) {
        toast({
          title: "No results found",
          description: "Try adjusting your search criteria",
          variant: "default"
        });
      } else {
        toast({
          title: "Search complete",
          description: `Found ${results.totalFound} records from ${results.uniquePatients} patients.`
        });
      }
      
      return results;
    } catch (error: any) {
      toast({
        title: "Search failed",
        description: error.message || "Failed to search patients",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsSearching(false);
    }
  };
  
  const confirmSelection = async (
    patientIds: string[], 
    dateRange?: { startDate: string; endDate: string; useAllDates?: boolean }
  ) => {
    setIsConfirming(true);
    setConfirmSuccess(false);
    
    try {
      const results = await extractSymptoms(
        patientIds, 
        !dateRange?.useAllDates ? {
          startDate: dateRange?.startDate || '',
          endDate: dateRange?.endDate || ''
        } : undefined
      );
      
      setExtractionResults(results);
      setExtractedData(results);
      setConfirmSuccess(true);
      
      return results;
    } catch (error: any) {
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process selection",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsConfirming(false);
    }
  };
  
  const runPopulationAnalysis = async (params: SearchParams) => {
    setIsRunningAnalysis(true);
    
    try {
      console.log("Running population analysis with params:", params);
      
      // FORCE the searchType to population even if the app state is inconsistent
      const populationParams = {
        ...params,
        searchType: "population" // Force this to be population type
      };
      
      // CRITICAL: Explicitly clear any search results before starting
      // This ensures we don't show patient lists in Population mode
      setSearchResults(null);
      setSearchSuccess(false);
      
      // First, get all patients for population analysis
      const response = await apiRequest("POST", "/api/search", {
        searchType: "population",
        matchType: "exact", // Use exact to get all patients
        useAllDates: populationParams.useAllDates,
        startDate: populationParams.startDate,
        endDate: populationParams.endDate,
        useCachedData: populationParams.useCachedData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Population search results:", data);
      
      // CRITICAL: DO NOT store search results for population analysis
      // setSearchResults(data); - DO NOT UNCOMMENT - We never want to show patient lists in population mode
      
      const patients = data.patients || [];
      
      if (patients.length === 0) {
        toast({
          title: "No patients found",
          description: "No patients available for population analysis. Make sure you've uploaded data first.",
          variant: "destructive"
        });
        return null;
      }
      
      // Extract patient IDs for visualization
      const patientIds = patients.map((p: any) => p.patientId);
      console.log(`Found ${patientIds.length} patients for analysis`);
      
      // First extract symptoms from all the patient notes if needed
      if (!populationParams.useCachedData) {
        console.log("Extracting symptoms from all patient notes");
        try {
          await extractSymptoms(
            patientIds, 
            !populationParams.useAllDates ? {
              startDate: populationParams.startDate || '',
              endDate: populationParams.endDate || ''
            } : undefined
          );
        } catch (error) {
          console.error("Could not extract symptoms:", error);
          // Continue anyway, we might have previously extracted data
        }
      }
      
      // Now get visualization data with real patient IDs
      const results = await getVisualizationData(
        patientIds,
        populationParams.populationCategory || 'diagnosis',
        !populationParams.useAllDates ? {
          startDate: populationParams.startDate || '',
          endDate: populationParams.endDate || ''
        } : undefined
      );
      
      // Set the extracted data for visualizations
      setExtractionResults(results);
      setExtractedData(results);
      setConfirmSuccess(true);
      
      toast({
        title: "Analysis complete",
        description: `Population health analysis processed for ${patientIds.length} patients.`
      });
      
      return results;
    } catch (error: any) {
      console.error("Population analysis error:", error);
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to run population analysis",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsRunningAnalysis(false);
    }
  };
  
  return {
    searchPatients,
    isSearching,
    searchResults,
    searchSuccess,
    confirmSelection,
    isConfirming,
    confirmSuccess,
    extractionResults,
    runPopulationAnalysis,
    isRunningAnalysis
  };
};
