import React, { useState, useCallback } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { PaymentFlow } from "./PaymentFlow";
import { AnalysisProgress } from "./AnalysisProgress";
import { useToast } from "@/hooks/use-toast";

export default function PopulationSearch() {
  // APPLICATION CONTEXT
  const { searchConfig, updateSearchConfig, setCurrentData } = useAppContext();
  
  // CRITICAL: Initialize all analysis states to false/empty to prevent auto-running
  // These must be false on initial render
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // DATA STATES
  const [apiData, setApiData] = useState<any>(null);
  const [extractedData, setExtractedData] = useState<any[]>([]);
  const [patientCount, setPatientCount] = useState(0);
  
  // PAYMENT STATES
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [pendingAnalysisParams, setPendingAnalysisParams] = useState<any>(null);
  
  // PROGRESS STATES - Start with 0 to ensure no progress is shown initially
  const [progressValue, setProgressValue] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  
  // UTILITIES
  const { toast } = useToast();
  
  // Handle successful payment and start analysis
  const handlePaymentSuccess = useCallback(async () => {
    console.log("🎉 handlePaymentSuccess called - payment successful or bypassed");
    setShowPaymentFlow(false);
    
    if (!pendingAnalysisParams) {
      toast({
        title: "Analysis Error",
        description: "Missing analysis parameters",
        variant: "destructive",
      });
      return;
    }
    
    setIsRunningAnalysis(true);
    setIsAnalyzing(true);
    setProgressValue(5);
    setProgressMessage("Starting analysis...");
    
    try {
      // Step 1: Get the patient list
      const searchResponse = await apiRequest("POST", "/api/search", {
        searchType: "population",
        useAllDates: true
      });
      
      if (!searchResponse.ok) {
        throw new Error("Failed to get patient list");
      }
      
      const searchData = await searchResponse.json();
      if (!searchData.patients || searchData.patients.length === 0) {
        throw new Error("No patients found for analysis");
      }
      
      // Get all patient IDs
      const patientIds = searchData.patients.map((patient: any) => patient.patientId);
      
      // Step 2: Extract symptoms using API
      const extractionResponse = await apiRequest("POST", "/api/extract-symptoms", {
        patientIds: patientIds,
        useAllDates: true
      });
      
      if (!extractionResponse.ok) {
        throw new Error("Symptom extraction failed");
      }
      
      const extractionData = await extractionResponse.json();
      setExtractedData(extractionData.results || []);
      
      // Save params for visualization step
      setPendingAnalysisParams({
        ...pendingAnalysisParams,
        patientIds: patientIds,
        visualizationType: "population",
        includeDemographics: true
      });
      
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
  }, [pendingAnalysisParams, toast]);
  
  // Handle the completion of the analysis reported by websocket
  const handleAnalysisComplete = useCallback(async () => {
    setIsAnalyzing(false);
    setProgressValue(100);
    setProgressMessage("Analysis complete!");
    
    try {
      if (!pendingAnalysisParams) {
        throw new Error("Missing analysis parameters");
      }
      
      // Check database status
      const statusResponse = await fetch(`/api/processing-status/extract_symptoms`);
      const processingStatus = await statusResponse.json();
      
      // Determine if we should use pre-processed data
      const useCachedData = processingStatus && 
                            (processingStatus.status === 'complete' || 
                             processingStatus.status === 'completed' ||
                             processingStatus.status === 'force_completed');
      
      // Get visualization data
      const response = await apiRequest("POST", "/api/visualization-data", {
        ...pendingAnalysisParams,
        useCachedData
      });
      
      const data = await response.json();
      
      // Prepare data for visualization
      const preparedData = {
        symptomSegmentData: data.symptomSegmentData || [],
        diagnosisData: data.diagnosisData || [],
        symptomIDData: data.symptomIDData || [],
        diagnosticCategoryData: data.diagnosticCategoryData || [],
        totalRecords: data.totalRecords || 0,
        patients: data.patients || [],
        fromCache: useCachedData
      };
      
      setApiData(preparedData);
      setCurrentData(preparedData);
      
      toast({
        title: "Analysis Complete",
        description: `Analyzed ${pendingAnalysisParams.patientIds?.length || 0} patients with ${useCachedData ? 'database' : 'in-memory'} data`,
      });
      
      // Clear pending params
      setPendingAnalysisParams(null);
    } catch (error) {
      console.error("Error finalizing analysis:", error);
      toast({
        title: "Visualization Failed",
        description: "There was an error generating the visualizations",
        variant: "destructive",
      });
    } finally {
      setIsRunningAnalysis(false);
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
  
  // Run analysis ONLY when button is clicked - no auto-triggering
  const handleRunAnalysis = useCallback(() => {
    console.log("🔴 Run Population Analysis button clicked");
    
    // Reset progress state and force set analyzing state
    setIsAnalyzing(true);
    setIsRunningAnalysis(true);
    setProgressValue(5);
    setProgressMessage("Starting new analysis...");
    
    // Set userInitiated flag when manually triggered
    if (searchConfig) {
      updateSearchConfig({
        ...searchConfig,
        userInitiated: true
      });
    } else {
      // Create a default searchConfig if none exists
      updateSearchConfig({
        searchType: "population",
        useAllDates: true,
        useCachedData: false,
        userInitiated: true
      });
    }
    
    // Skip payment for development
    // Create the analysis parameters
    const analysisParams = {
      searchType: "population",
      populationCategory: "all",
      startDate: searchConfig?.startDate || null,
      endDate: searchConfig?.endDate || null,
      useAllDates: searchConfig?.useAllDates || true,
      useCachedData: searchConfig?.useCachedData || false,
      focusArea: "all",
      includeDemographics: true
    };
    
    // Store the parameters
    setPendingAnalysisParams(analysisParams);
    
    // Call handlePaymentSuccess directly (for development)
    setTimeout(() => {
      handlePaymentSuccess();
    }, 500);
  }, [searchConfig, updateSearchConfig, handlePaymentSuccess]);
  
  return (
    <div className="space-y-6">
      {/* Only show analysis UI if we're analyzing */}
      {(isAnalyzing || isRunningAnalysis) && (
        <Card className="mb-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              {(isAnalyzing || isRunningAnalysis) && (
                <Loader2 className="h-5 w-5 mr-2 animate-spin text-primary-600" />
              )}
              {progressValue > 0 ? `Analysis in Progress (${progressValue}%)` : 'Analysis in Progress'}
            </CardTitle>
            <CardDescription>
              {progressMessage || `Processing ${patientCount || "..."} patients...`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2 border border-gray-300">
              <div 
                className="bg-primary-600 h-full rounded-full transition-all duration-300 shadow-inner flex items-center justify-center text-[10px] text-white font-bold overflow-hidden"
                style={{ 
                  width: `${progressValue}%`,
                  background: 'linear-gradient(to right, #8856A7, #994C99)'
                }}
              >
                {progressValue > 15 && (
                  <span className="px-1 mix-blend-overlay">{progressValue}%</span>
                )}
              </div>
            </div>
            <div className="flex justify-end items-center">
              <div className="text-xs text-muted-foreground font-semibold">
                {progressValue}% complete
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Connect the AnalysisProgress component to handle completion */}
      <div className={isAnalyzing || isRunningAnalysis ? "block" : "hidden"}>
        <AnalysisProgress 
          isAnalyzing={isAnalyzing} 
          onComplete={handleAnalysisComplete}
          onProgressUpdate={(progress) => {
            console.log(`Progress update: ${progress}%`);
            setProgressValue(progress);
          }}
        />
      </div>
      
      {/* Population Analysis Results with Run button */}
      <div className="bg-white rounded-lg p-3 mt-2">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm text-muted-foreground flex-grow">
            {/* Status area */}
            <span className="font-semibold pr-2">Population Health Analysis</span>
            {apiData && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-2">
                {apiData.fromCache ? 'Using cached data' : 'Using fresh data'} • 
                {apiData.totalRecords.toLocaleString()} records
              </span>
            )}
          </div>
          
          {/* Run Analysis Button */}
          <Button 
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || isRunningAnalysis}
            className="bg-primary-600 hover:bg-primary-700 text-white"
          >
            {isAnalyzing || isRunningAnalysis ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Run Population Analysis'
            )}
          </Button>
        </div>
      </div>
      
      {/* Payment Flow Dialog */}
      {showPaymentFlow && (
        <PaymentFlow
          patientCount={patientCount}
          paymentAmount={paymentAmount}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      )}
    </div>
  );
}