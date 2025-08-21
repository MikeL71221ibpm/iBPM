// Last updated: May 12, 2025 - 4:59 AM
// Controls component: PopulationSearch - used for population health analysis

import React, { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Loader2, Database } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import PopulationHealthCharts from "@/components/population-health-charts-controlling-file-05_12_25_restored";
import PopulationHealthChartsHrsnGridPrototype from "@/components/population-health-charts-hrsn-grid-prototype-05_13_25";
import HrsnGridSimplified from "@/components/hrsn-grid-simplified-05_13_25";
import HrsnGrid from "@/components/hrsn-grid-controlling-file-05_13_25";
import { PaymentFlow } from "./PaymentFlow";
import { AnalysisProgress } from "./AnalysisProgress";
import { useToast } from "@/hooks/use-toast";
import { 
  createPivotTable, 
  pivotToPieChartData, 
  pivotToBarChartData 
} from '@/utils/pivotTableUtils';

// Add a console log to see if this file is being loaded
console.log("Population Search controlling file loaded at", new Date().toLocaleTimeString());

// File sources for Population Health charts:
// - CSV: updated_population_data_with_diagnosis_for Testing_1062 records_4_25_25.csv
// - JSON: /data/uploads/patient_clinical_notes.json
// These files are loaded and processed through the pre-processing pipeline
// and accessed via the /api/visualization-data endpoint

// Type definition for the API data
interface ApiData {
  totalRecords: number;
  patients: any[];
  uniqueCategories?: number;
  symptomSegmentData?: any[];
  diagnosisData?: any[];
  symptomIDData?: any[];
  diagnosticCategoryData?: any[];
  filePath?: string;
}

export default function PopulationSearch() {
  const { searchConfig, updateSearchConfig, setCurrentData } = useAppContext();
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [category, setCategory] = useState<"diagnosis" | "symptom" | "category" | "hrsn">("hrsn");
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [patientCount, setPatientCount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [pendingAnalysisParams, setPendingAnalysisParams] = useState<any>(null);
  const [extractedData, setExtractedData] = useState<any[]>([]);
  const [autoLoadedData, setAutoLoadedData] = useState(false);
  const { toast } = useToast();
  
  // Define handlePaymentSuccess first to avoid circular dependency
  const handlePaymentSuccess = useCallback(async () => {
    setShowPaymentFlow(false);
    
    // Now run the actual analysis with the stored parameters
    if (!pendingAnalysisParams) return;
    
    setIsRunningAnalysis(true);
    
    try {
      // Step 1: First do a search to get the complete list of patient IDs
      console.log("Performing initial search for population health analysis");
      const searchResponse = await apiRequest("POST", "/api/search", {
        searchType: "population",
        matchType: "exact",
        useAllDates: true
      });
      
      if (!searchResponse.ok) {
        throw new Error("Failed to get patient list");
      }
      
      const searchData = await searchResponse.json();
      console.log("Found patients:", searchData.patients?.length);
      
      if (!searchData.patients || searchData.patients.length === 0) {
        throw new Error("No patients found for analysis");
      }
      
      // Get all patient IDs from the search results
      const patientIds = searchData.patients.map((patient: any) => patient.patientId);
      console.log("Patient IDs for extraction:", patientIds);
      
      // Step 2: Extract symptoms for all patients using SSE for progress tracking
      console.log("Extracting symptoms for all patients with SSE progress tracking");
      
      // Start the analysis process with SSE tracking - CRITICAL FIX
      setIsAnalyzing(true);
      setIsRunningAnalysis(true);
      
      // Debug logging to confirm states are set
      console.log("🔍 FORCED Set isAnalyzing to:", true);
      console.log("🔍 FORCED Set isRunningAnalysis to:", true);
      
      // Force set a class to the document body to track global analysis state
      document.body.classList.add('is-analyzing');
      
      // Call the extraction endpoint (SSE will handle progress updates)
      const extractionResponse = await apiRequest("POST", "/api/extract-symptoms", {
        patientIds: patientIds,
        useAllDates: true
      });
      
      if (!extractionResponse.ok) {
        throw new Error("Symptom extraction failed");
      }
      
      const extractionData = await extractionResponse.json();
      setExtractedData(extractionData.results || []);
      console.log("Extracted symptoms:", extractionData.extractedCount);
      
      // Step 3: Now get visualization data with the updated symptom information
      // We'll move this to the analysis complete handler so it happens after SSE progress tracking
      const visualizationParams = {
        ...pendingAnalysisParams,
        patientIds: patientIds,
        visualizationType: "population",
        includeDemographics: true
      };
      
      // Store these params to use after the symptom extraction completes via SSE
      setPendingAnalysisParams(visualizationParams);
      
      // The rest of the visualization processing will happen in handleAnalysisComplete
      // after the SSE sends the completion message
      
      return extractionData;
    } catch (error) {
      console.error("Error running population analysis:", error);
      setIsAnalyzing(false);
      setIsRunningAnalysis(false);
      
      toast({
        title: "Analysis Failed",
        description: "There was an error analyzing the population data",
        variant: "destructive",
      });
    }
  }, [pendingAnalysisParams, setCurrentData, toast]);

  // Function to first check patient count and prompt for payment
  const checkPatientCountForPayment = useCallback(async (params: any) => {
    try {
      // TEMPORARY FIX: Skip payment flow for testing
      console.log("⚠️ BYPASSING PAYMENT FLOW FOR TESTING - Payment will be skipped!");
      
      // First, get the patient count for pricing
      console.log("🧪 Step 1: Requesting initial patient search for payment calculation");
      const countResponse = await apiRequest("POST", "/api/search", {
        searchType: "population",
        matchType: "exact",
        useAllDates: true
      });
      
      if (!countResponse.ok) {
        throw new Error("Failed to get patient count");
      }
      
      const countData = await countResponse.json();
      const uniquePatients = countData.uniquePatients || 0;
      
      // Store count for payment calculation ($1 per patient)
      setPatientCount(uniquePatients);
      setPaymentAmount(uniquePatients); // $1 per patient
      
      // Store the analysis parameters to use after payment
      setPendingAnalysisParams(params);
      
      // BYPASS: Skip payment flow and fetch visualization data directly
      // This allows us to test without payment during development
      setTimeout(async () => {
        console.log("⚠️ PAYMENT BYPASS: Directly fetching visualization data");
        console.log("🔍 params:", params);
        
        try {
          // First get patient IDs
          const searchResponse = await apiRequest("POST", "/api/search", {
            searchType: "population",
            matchType: "exact",
            useAllDates: true
          });
          
          if (!searchResponse.ok) {
            throw new Error("Failed to get patient list");
          }
          
          const searchData = await searchResponse.json();
          console.log("🔍 Found patients:", searchData.patients?.length);
          
          if (!searchData.patients || searchData.patients.length === 0) {
            throw new Error("No patients found for analysis");
          }
          
          // Skip the actual extraction process and immediately get visualization data
          console.log("🔍 BYPASS: Directly requesting visualization data");
          const vizResponse = await apiRequest("POST", "/api/visualization-data", {
            ...params,
            patientIds: searchData.patients.map((patient: any) => patient.patientId)
          });
          
          if (!vizResponse.ok) {
            throw new Error("Failed to get visualization data");
          }
          
          const vizData = await vizResponse.json();
          console.log("🔍 Direct visualization data received:", {
            symptomCount: vizData.symptomSegmentData?.length || 0,
            diagnosisCount: vizData.diagnosisData?.length || 0,
            categoryCount: vizData.diagnosticCategoryData?.length || 0,
            patientCount: vizData.patients?.length || 0
          });
          
          // Set data directly
          const preparedData = {
            symptomSegmentData: vizData.symptomSegmentData || [],
            diagnosisData: vizData.diagnosisData || [],
            symptomIDData: vizData.symptomIDData || [],
            diagnosticCategoryData: vizData.diagnosticCategoryData || [],
            totalRecords: vizData.totalRecords || 0,
            patients: vizData.patients || []
          };
          
          // CRITICAL FIX: Ensure the data is properly structured before setting it 
          setApiData(preparedData);
          setCurrentData(preparedData);
          
          // Set global flag for analysis state to false
          setIsRunningAnalysis(false);
          setIsAnalyzing(false);
          
          console.log("🔍 Set visualization data directly, bypassing analysis process");
          console.log("🔥 CRITICAL DATA CHECK 🔥");
          console.log("- symptomSegmentData:", preparedData.symptomSegmentData?.length || 0, "items");
          console.log("- diagnosisData:", preparedData.diagnosisData?.length || 0, "items");
          console.log("- symptomIDData:", preparedData.symptomIDData?.length || 0, "items");
          console.log("- diagnosticCategoryData:", preparedData.diagnosticCategoryData?.length || 0, "items");
          console.log("- totalRecords:", preparedData.totalRecords || 0);
          console.log("- patients:", preparedData.patients?.length || 0, "patients");
          
          toast({
            title: "Analysis Complete",
            description: `Analyzed ${preparedData.patients.length} patients with data.`,
          });
        } catch (error: any) {
          console.error("Error in payment bypass:", error);
          toast({
            title: "Analysis Failed",
            description: error.message || "Failed to get visualization data",
            variant: "destructive",
          });
        } finally {
          // Clear pending params since we're done
          setPendingAnalysisParams(null);
        }
      }, 500);
      
      return { shouldProceed: true };
    } catch (error: any) {
      console.error("Error checking patient count:", error);
      toast({
        title: "Error",
        description: "Failed to determine patient count for pricing",
        variant: "destructive",
      });
      return { shouldProceed: false };
    }
  }, [toast, handlePaymentSuccess]);

  
  // Handle the completion of the analysis reported by the SSE
  const handleAnalysisComplete = useCallback(async () => {
    console.log("🔍 Analysis completion handler triggered");
    setIsAnalyzing(false);
    
    // CRITICAL FIX: Remove global analysis state class
    document.body.classList.remove('is-analyzing');
    
    try {
      if (!pendingAnalysisParams) {
        console.error("No pending analysis parameters available");
        throw new Error("Missing analysis parameters");
      }
      
      // Now get the visualization data using the extracted symptoms
      console.log("Getting visualization data with params:", pendingAnalysisParams);
      const response = await apiRequest("POST", "/api/visualization-data", pendingAnalysisParams);
      
      if (!response.ok) {
        throw new Error(`Visualization data request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Visualization data received:", {
        symptomCount: data.symptomSegmentData?.length || 0,
        diagnosisCount: data.diagnosisData?.length || 0,
        categoryCount: data.diagnosticCategoryData?.length || 0,
        patientCount: data.patients?.length || 0
      });
      
      // Include patients in the data passed to the visualization component
      const preparedData = {
        symptomSegmentData: data.symptomSegmentData || [],
        diagnosisData: data.diagnosisData || [],
        symptomIDData: data.symptomIDData || [],
        diagnosticCategoryData: data.diagnosticCategoryData || [],
        totalRecords: data.totalRecords || 0,
        patients: data.patients || []
      };
      
      // CRITICAL FIX: Set data before clearing analysis flags
      setApiData(preparedData);
      setCurrentData(preparedData);
      
      // Debug log to confirm data was set
      console.log("🔍 Set current data with", preparedData.symptomSegmentData.length, "symptoms");
      
      // Show success notification
      toast({
        title: "Analysis Complete",
        description: `Analyzed ${pendingAnalysisParams.patientIds?.length || 0} patients with ${extractedData.length} extracted symptoms`,
      });
      
      // Clear pending params
      setPendingAnalysisParams(null);
    } catch (error: any) {
      console.error("Error finalizing analysis:", error);
      toast({
        title: "Visualization Failed",
        description: "There was an error generating the visualizations",
        variant: "destructive",
      });
    } finally {
      // CRITICAL FIX: Ensure analysis state is fully reset
      setIsRunningAnalysis(false);
      setIsAnalyzing(false);
      console.log("🔍 FORCED Set isRunningAnalysis to:", false);
      console.log("🔍 FORCED Set isAnalyzing to:", false);
    }
  }, [pendingAnalysisParams, extractedData, setCurrentData, toast]);
  
  // Handle payment cancellation
  const handlePaymentCancel = useCallback(() => {
    setShowPaymentFlow(false);
    setPendingAnalysisParams(null);
    toast({
      title: "Analysis Cancelled",
      description: "Population health analysis was cancelled",
    });
  }, [toast]);
  
  // Auto-load visualization data when component mounts
  useEffect(() => {
    // Only run once when component mounts and if data hasn't been loaded yet
    if (!autoLoadedData && !apiData) {
      console.log("🔄 Auto-loading visualization data on component mount");
      setAutoLoadedData(true); // Mark as loaded to prevent duplicate requests
      
      // This is the same code as the Test Visualization Data button
      (async () => {
        try {
          console.log("🔄 AUTO: Requesting visualization data on page load");
          
          // First get patient IDs
          const searchResponse = await apiRequest("POST", "/api/search", {
            searchType: "population",
            matchType: "exact",
            useAllDates: true,
            useCachedData: false // Ensure we get fresh data
          });
          
          if (!searchResponse.ok) {
            throw new Error("Auto-load patient search failed");
          }
          
          const searchData = await searchResponse.json();
          console.log("🔄 AUTO: Found patients:", searchData.patients?.length);
          
          if (!searchData.patients || searchData.patients.length === 0) {
            console.log("🔄 AUTO: No patients found, skipping visualization data load");
            return;
          }
          
          // Call visualization data endpoint
          const patientIds = searchData.patients.map((p: any) => p.patient_id || p.patientId);
          console.log("🔄 AUTO: Patient IDs:", patientIds.slice(0, 3) + "...");
          
          const vizResponse = await apiRequest("POST", "/api/visualization-data", {
            patientIds: patientIds,
            populationCategory: "hrsn"
          });
          
          if (!vizResponse.ok) {
            throw new Error("Auto-load visualization data failed");
          }
          
          const vizData = await vizResponse.json();
          console.log("🔄 AUTO: Visualization data received:", vizData);
          
          // Process the raw data that comes in the "data" field
          if (vizData && vizData.data && Array.isArray(vizData.data)) {
            console.log("🔄 AUTO: Processing", vizData.data.length, "data points");
            
            // Process symptom segment data
            const symptomSegmentData: ChartDataItem[] = [];
            const diagnosisData: ChartDataItem[] = [];
            const symptomIDData: ChartDataItem[] = [];
            const diagnosticCategoryData: ChartDataItem[] = [];
            
            // Group and count by symptom_segment
            const symptomSegmentCounts: Record<string, number> = {};
            const diagnosisCounts: Record<string, number> = {};
            const symptomIdCounts: Record<string, number> = {};
            const categoryCounts: Record<string, number> = {};
            
            // Process each data point
            vizData.data.forEach((item: any) => {
              // Process symptom segments
              if (item.symptom_segment) {
                if (!symptomSegmentCounts[item.symptom_segment]) {
                  symptomSegmentCounts[item.symptom_segment] = 0;
                }
                symptomSegmentCounts[item.symptom_segment]++;
              }
              
              // Process diagnoses
              if (item.diagnosis) {
                if (!diagnosisCounts[item.diagnosis]) {
                  diagnosisCounts[item.diagnosis] = 0;
                }
                diagnosisCounts[item.diagnosis]++;
              }
              
              // Process symptom IDs
              if (item.symptom_id) {
                if (!symptomIdCounts[item.symptom_id]) {
                  symptomIdCounts[item.symptom_id] = 0;
                }
                symptomIdCounts[item.symptom_id]++;
              }
              
              // Process diagnostic categories
              if (item.diagnostic_category) {
                if (!categoryCounts[item.diagnostic_category]) {
                  categoryCounts[item.diagnostic_category] = 0;
                }
                categoryCounts[item.diagnostic_category]++;
              }
            });
            
            // Convert to array format needed by charts
            Object.entries(symptomSegmentCounts).forEach(([segment, count]) => {
              symptomSegmentData.push({ id: segment, value: count });
            });
            
            Object.entries(diagnosisCounts).forEach(([diagnosis, count]) => {
              diagnosisData.push({ id: diagnosis, value: count });
            });
            
            Object.entries(symptomIdCounts).forEach(([id, count]) => {
              symptomIDData.push({ id, value: count });
            });
            
            Object.entries(categoryCounts).forEach(([category, count]) => {
              diagnosticCategoryData.push({ id: category, value: count });
            });
            
            console.log("🔄 AUTO: Processed data:", {
              symptomSegments: symptomSegmentData.length,
              diagnoses: diagnosisData.length,
              symptomIDs: symptomIDData.length,
              categories: diagnosticCategoryData.length
            });
            
            // Prepare data with enhanced patients info including extractedSymptoms
            const preparedData = {
              symptomSegmentData,
              diagnosisData,
              symptomIDData,
              diagnosticCategoryData,
              totalRecords: vizData.data.length,
              patients: searchData.patients || [],
              extractedSymptoms: vizData.extractedSymptoms || []
            };
            
            setApiData(preparedData);
            setCurrentData(preparedData);
            
            // Update search config to trigger rendering of HRSN charts  
            if (searchConfig) {
              updateSearchConfig({
                ...searchConfig,
                userInitiated: true,
                lastAutoLoad: new Date().getTime()
              });
            }
            
            console.log("🔄 AUTO: Visualization data automatically loaded");
          } else {
            console.error("🔄 AUTO: Visualization data missing expected 'data' array");
          }
        } catch (err: any) {
          console.error("🔄 AUTO LOAD ERROR:", err);
          // Don't show an error toast here since it's automatic
        }
      })();
    }
  }, [autoLoadedData, apiData, searchConfig, updateSearchConfig, setCurrentData]);
  
  // Run analysis when the component mounts or when parameters change
  const runPopulationAnalysis = useCallback(async () => {
    if (!searchConfig) return;
    
    // Create the analysis parameters
    const analysisParams = {
      searchType: "population",
      populationCategory: category,
      startDate: searchConfig.startDate,
      endDate: searchConfig.endDate,
      useAllDates: searchConfig.useAllDates,
      useCachedData: searchConfig.useCachedData,
      focusArea: "hrsn", // Specifically request HRSN indicators
      includeDemographics: true // Make sure demographic information is included
    };
    
    // First check patient count and prompt for payment
    const { shouldProceed } = await checkPatientCountForPayment(analysisParams);
    
    // The actual analysis will be run after payment in handlePaymentSuccess
    return shouldProceed;
  }, [searchConfig, category, checkPatientCountForPayment]);
  
  // Define types based on pivot table utility return types
  type ChartDataItem = { id: string; value: number };
  
  // Run analysis when user clicks the button
  const handleRunAnalysis = useCallback(async () => {
    // Set userInitiated flag when manually triggered
    if (searchConfig) {
      updateSearchConfig({
        ...searchConfig,
        userInitiated: true
      });
    }
    
    try {
      console.log("🔥 DIRECT DEBUG: Starting manual population analysis");
      setIsRunningAnalysis(true);
      
      // First get patient IDs
      const searchResponse = await apiRequest("POST", "/api/search", {
        searchType: "population",
        matchType: "exact",
        useAllDates: true,
        useCachedData: searchConfig?.useCachedData || false,
      });
      
      if (!searchResponse.ok) {
        throw new Error("Failed to get patient list");
      }
      
      const searchData = await searchResponse.json();
      console.log("🔥 DIRECT DEBUG: Found patients:", searchData.patients?.length);
      
      if (!searchData.patients || searchData.patients.length === 0) {
        throw new Error("No patients found for analysis");
      }
      
      // Create the analysis parameters
      const analysisParams = {
        searchType: "population",
        populationCategory: category,
        startDate: searchConfig?.startDate,
        endDate: searchConfig?.endDate,
        useAllDates: searchConfig?.useAllDates || true,
        useCachedData: searchConfig?.useCachedData || false,
        focusArea: "hrsn", // Specifically request HRSN indicators
        includeDemographics: true, // Make sure demographic information is included
        patientIds: searchData.patients.map((patient: any) => patient.patientId || patient.patient_id)
      };
      
      console.log("🔥 DIRECT DEBUG: Requesting visualization data with params:", analysisParams);
      
      // Directly get visualization data
      const vizResponse = await apiRequest("POST", "/api/visualization-data", analysisParams);
      
      if (!vizResponse.ok) {
        throw new Error("Failed to get visualization data");
      }
      
      const vizData = await vizResponse.json();
      console.log("🔥 DIRECT DEBUG: Raw visualization data received");
      
      let preparedData: {
        symptomSegmentData: ChartDataItem[];
        diagnosisData: ChartDataItem[];
        symptomIDData: ChartDataItem[];
        diagnosticCategoryData: ChartDataItem[];
        totalRecords: number;
        patients: any[];
      } = {
        symptomSegmentData: [],
        diagnosisData: [],
        symptomIDData: [],
        diagnosticCategoryData: [],
        totalRecords: 0,
        patients: searchData.patients || []
      };
      
      if (vizData && vizData.data && Array.isArray(vizData.data)) {
        console.log("🔥 DIRECT DEBUG: Processing", vizData.data.length, "data points with pivot tables");
        
        try {
          // Use pivot tables for processing (mimicking the Streamlit implementation)
          
          // 1. Create pivot tables for each visualization type
          const symptomPivot = createPivotTable(vizData.data, 'symptom_segment', 'dos_date');
          const diagnosisPivot = createPivotTable(vizData.data, 'diagnosis', 'dos_date');
          const symptomIdPivot = createPivotTable(vizData.data, 'symptom_id', 'dos_date');
          const categoryPivot = createPivotTable(vizData.data, 'diagnostic_category', 'dos_date');
          
          console.log("🔥 DIRECT DEBUG: Created pivot tables:", {
            symptomRows: symptomPivot.rows.length,
            diagnosisRows: diagnosisPivot.rows.length,
            symptomIdRows: symptomIdPivot.rows.length,
            categoryRows: categoryPivot.rows.length
          });
          
          // 2. Convert pivot tables to chart data
          const symptomSegmentData = pivotToBarChartData(symptomPivot);
          const diagnosisData = pivotToBarChartData(diagnosisPivot);
          const symptomIDData = pivotToBarChartData(symptomIdPivot);
          const diagnosticCategoryData = pivotToBarChartData(categoryPivot);
          
          console.log("🔥 DIRECT DEBUG: Processed visualization data:", {
            symptomSegments: symptomSegmentData.length,
            diagnoses: diagnosisData.length,
            symptomIDs: symptomIDData.length,
            categories: diagnosticCategoryData.length
          });
          
          if (symptomSegmentData.length > 0) {
            console.log("🔥 DIRECT DEBUG: Sample symptom data:", symptomSegmentData.slice(0, 3));
          }
          
          // Update prepared data
          preparedData = {
            symptomSegmentData,
            diagnosisData,
            symptomIDData,
            diagnosticCategoryData,
            totalRecords: vizData.data.length,
            patients: searchData.patients || []
          };
        } catch (err) {
          console.error("🔥 DIRECT DEBUG: Error in pivot table processing:", err);
          
          // Fallback to direct counting (simpler approach)
          console.log("🔥 DIRECT DEBUG: Falling back to direct counting approach");
          
          // Initialize data structures
          const symptomSegmentData: ChartDataItem[] = [];
          const diagnosisData: ChartDataItem[] = [];
          const symptomIDData: ChartDataItem[] = [];
          const diagnosticCategoryData: ChartDataItem[] = [];
          
          // Group and count by various properties
          const symptomSegmentCounts: Record<string, number> = {};
          const diagnosisCounts: Record<string, number> = {};
          const symptomIdCounts: Record<string, number> = {};
          const categoryCounts: Record<string, number> = {};
          
          // Process each data point
          vizData.data.forEach((item: any) => {
            // Process symptom segments
            if (item.symptom_segment) {
              if (!symptomSegmentCounts[item.symptom_segment]) {
                symptomSegmentCounts[item.symptom_segment] = 0;
              }
              symptomSegmentCounts[item.symptom_segment]++;
            }
            
            // Process diagnoses
            if (item.diagnosis) {
              if (!diagnosisCounts[item.diagnosis]) {
                diagnosisCounts[item.diagnosis] = 0;
              }
              diagnosisCounts[item.diagnosis]++;
            }
            
            // Process symptom IDs
            if (item.symptom_id) {
              if (!symptomIdCounts[item.symptom_id]) {
                symptomIdCounts[item.symptom_id] = 0;
              }
              symptomIdCounts[item.symptom_id]++;
            }
            
            // Process diagnostic categories
            if (item.diagnostic_category) {
              if (!categoryCounts[item.diagnostic_category]) {
                categoryCounts[item.diagnostic_category] = 0;
              }
              categoryCounts[item.diagnostic_category]++;
            }
          });
          
          // Convert to array format needed by charts
          Object.entries(symptomSegmentCounts).forEach(([segment, count]) => {
            symptomSegmentData.push({ id: segment, value: count });
          });
          
          Object.entries(diagnosisCounts).forEach(([diagnosis, count]) => {
            diagnosisData.push({ id: diagnosis, value: count });
          });
          
          Object.entries(symptomIdCounts).forEach(([id, count]) => {
            symptomIDData.push({ id, value: count });
          });
          
          Object.entries(categoryCounts).forEach(([category, count]) => {
            diagnosticCategoryData.push({ id: category, value: count });
          });
          
          // Update prepared data with fallback approach
          preparedData = {
            symptomSegmentData,
            diagnosisData,
            symptomIDData,
            diagnosticCategoryData,
            totalRecords: vizData.data.length,
            patients: searchData.patients || []
          };
        }
      } else {
        console.error("🔥 DIRECT DEBUG: No data array found in visualization response");
      }
      
      // Update the state with the new data
      setApiData(preparedData);
      setCurrentData(preparedData);
      
      // Set global flag for analysis state to false
      setIsRunningAnalysis(false);
      
      toast({
        title: "Analysis Complete",
        description: `Analyzed ${searchData.patients.length} patients successfully`,
      });
    } catch (error: any) {
      console.error("🔥 DIRECT DEBUG: Error in manual analysis:", error);
      setIsRunningAnalysis(false);
      
      toast({
        title: "Analysis Failed",
        description: error.message || "There was an error analyzing the population data",
        variant: "destructive",
      });
    }
  }, [searchConfig, updateSearchConfig, category, setCurrentData, toast]);
  
  // Auto-run the analysis when searchConfig changes - but only when initialized by user action
  useEffect(() => {
    if (searchConfig && searchConfig.userInitiated) {
      console.log("Searching with params:", searchConfig);
      runPopulationAnalysis();
    }
  }, [searchConfig, runPopulationAnalysis]);
  
  return (
    <div className="space-y-6">
      {/* Payment Flow Dialog */}
      <PaymentFlow
        key={`payment-flow-${showPaymentFlow ? 'open' : 'closed'}`}  
        isOpen={showPaymentFlow}
        onClose={handlePaymentCancel}
        onSuccess={handlePaymentSuccess}
        amount={paymentAmount}  // $1 per patient
        description={`Population Health Analysis (${patientCount} ${patientCount === 1 ? 'patient' : 'patients'}) at $1 per patient`}
        searchType="population"
        patientCount={patientCount}
      />
      
      {/* Analysis Progress Tracking */}
      <AnalysisProgress 
        isAnalyzing={isAnalyzing}
        onComplete={handleAnalysisComplete}
      />
      
      <div className="flex justify-end mb-4">
        <Button 
          className="bg-primary-600 hover:bg-primary-700"
          onClick={() => handleRunAnalysis()}
          disabled={isRunningAnalysis || isAnalyzing}
        >
          {isRunningAnalysis || isAnalyzing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <LineChart className="w-4 h-4 mr-2" />
          )}
          {isAnalyzing ? "Analyzing Data..." : isRunningAnalysis ? "Running Analysis..." : "Run Population Analysis"}
        </Button>
      </div>
      
      {isRunningAnalysis && !isAnalyzing ? (
        <div className="bg-white shadow rounded-lg p-6 flex items-center justify-center min-h-[500px]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary-600 mb-4" />
            <p className="text-lg font-medium text-gray-700">Preparing for analysis...</p>
            <p className="text-sm text-gray-500 mt-2">Getting ready to process your data</p>
          </div>
        </div>
      ) : (
        <>
          {/* Toggle between original charts and new prototype */}
          {category === "hrsn" ? (
            <HrsnGrid
              data={apiData}
              isLoading={isRunningAnalysis || isAnalyzing}
            />
          ) : (
            <PopulationHealthCharts 
              data={apiData} 
              isLoading={isRunningAnalysis || isAnalyzing}
            />
          )}
        </>
      )}
    </div>
  );
}