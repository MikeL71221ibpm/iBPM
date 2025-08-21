import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Search, User, FileText, Calendar, PieChart, Download, Loader2, 
  PlayCircle, AlertCircle, FileUp, LineChart, CheckCircle, 
  BarChart2, LayoutGrid, Circle, RefreshCw 
} from "lucide-react";

import FileProcessingStatus from "./FileProcessingStatus";

// Import standardized patient session utility functions
import { 
  setPatientIdInSession, 
  setPatientNameInSession, 
  getPatientIdentifier,
  getPatientIdFromSession,
  getPatientNameFromSession
} from "@/utils/patient-session-controlling-file-05_12_25";

// Last updated: May 12, 2025 - 12:49 AM
// Controls component: IndividualSearch - used for patient search functionality

// Add a console log to see if this file is being loaded
console.log("IndividualSearch component loaded at", new Date().toLocaleTimeString());
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAppContext } from "@/context/AppContext";
import { PaymentFlow } from "./payment-controlling-file-05_09_25";
import { AnalysisProgress } from "./AnalysisProgress";
import VisualizationWrapper from "./VisualizationWrapper";
import DebugHeatmap from "./DebugHeatmap"; 
import BasicSymptomTable from "./BasicSymptomTable";
import SimpleHeatmap from "./SimpleHeatmap";
import SimpleBubbleChart from "./SimpleBubbleChart";
import SimplePieChart from "./SimplePieChart";
import SimpleBarChart from "./SimpleBarChart";
import ChartExportWidget from "./chart-export-widget";

// Visualization types enum
export enum VisualizationType {
  HEATMAP = 'heatmap',
  BUBBLE = 'bubble',
  PIE = 'pie',
  BAR = 'bar'
}

export default function IndividualSearch() {
  const { toast } = useToast();
  const { credits, setCredits, decrementCredits, pendingPayments, completePayment } = useAppContext();
  
  // Patient search state
  const [patientId, setPatientId] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");
  const [searchSubmitted, setSearchSubmitted] = useState<boolean>(false);
  const [searchInProgress, setSearchInProgress] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [clinicalNotes, setClinicalNotes] = useState<any[]>([]);
  const [searchSuccess, setSearchSuccess] = useState<boolean>(false);
  const [lastSearchTime, setLastSearchTime] = useState<string>("");
  const [notesCount, setNotesCount] = useState<number>(0);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState<boolean>(false);
  const [lastCreditDeduction, setLastCreditDeduction] = useState<string>("");
  
  // Caching state
  const searchCacheRef = useRef<Record<string, any>>({});
  const [retryCount, setRetryCount] = useState<number>(0);
  const [dataError, setDataError] = useState<boolean>(false);
  
  // Analysis state
  const [analyzingData, setAnalyzingData] = useState<boolean>(false);
  const [analysisComplete, setAnalysisComplete] = useState<boolean>(false);
  const [analysisStartTime, setAnalysisStartTime] = useState<Date | null>(null);
  const [analysisEndTime, setAnalysisEndTime] = useState<Date | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>("");
  const [extractedSymptoms, setExtractedSymptoms] = useState<any[]>([]);
  
  // Visualization state
  const [viewNotes, setViewNotes] = useState<boolean>(false);
  const [activeVisualization, setActiveVisualization] = useState<VisualizationType | null>(null);
  const [visualizationData, setVisualizationData] = useState<any>(null);
  
  // Debug/development mode
  const isDevelopment = import.meta.env.DEV;
  
  // Format a date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // Handler for patient search form submission
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientId && !patientName) {
      toast({
        title: "Search Error",
        description: "Please enter a patient ID or name to search.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if credits are available for the search
    if (credits <= 0) {
      setPaymentDialogOpen(true);
      return;
    }
    
    // Generate cache key based on search criteria
    const cacheKey = `${patientId || ''}-${patientName || ''}`;
    
    // Check if we have cached results
    if (searchCacheRef.current[cacheKey] && !dataError) {
      console.log("✅ Using cached search results for:", cacheKey);
      const cachedData = searchCacheRef.current[cacheKey];
      
      // Reset states before displaying cached results
      setSearchSubmitted(true);
      setSearchInProgress(true);
      setSearchSuccess(false);
      setAnalysisComplete(false);
      setProgressPercent(0);
      setProgressMessage("");
      setViewNotes(false);
      setActiveVisualization(null);
      
      // Store patient information in sessionStorage for visualization components
      if (patientId) {
        // Use centralized utility function for better type handling and consistency
        setPatientIdInSession(patientId);
        console.log("Storing patient ID in sessionStorage (cached):", patientId, "(type before conversion:", typeof patientId + ")");
      }
      
      if (patientName) {
        setPatientNameInSession(patientName);
        console.log("Storing patient name in sessionStorage (cached):", patientName);
      }
      
      // Short delay to show loading state for better UX
      setTimeout(() => {
        setClinicalNotes(cachedData.notes || []);
        setNotesCount(cachedData.notes?.length || 0);
        setSearchSuccess(true);
        setSearchInProgress(false);
        
        toast({
          title: "Search Complete (Cached)",
          description: `Found ${cachedData.notes?.length || 0} clinical notes for ${patientId || patientName}.`,
        });
      }, 500);
      
      return;
    }
    
    // Reset states before new search
    setClinicalNotes([]);
    setSearchSubmitted(true);
    setSearchInProgress(true);
    setSearchSuccess(false);
    setAnalysisComplete(false);
    setProgressPercent(0);
    setProgressMessage("");
    setViewNotes(false);
    setActiveVisualization(null);
    setDataError(false);
    
    try {
      // Make API request to search for patient records
      const response = await apiRequest('POST', '/api/search-patient', {
        patientId,
        patientName,
        useCachedData: true // Prefer cached data from the server side
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error searching for patient records');
      }
      
      const data = await response.json();
      
      // Update search results
      setClinicalNotes(data.notes || []);
      setNotesCount(data.notes?.length || 0);
      setSearchSuccess(true);
      
      // Cache the results for future use
      searchCacheRef.current[cacheKey] = data;
      console.log("✅ Cached search results for:", cacheKey);
      
      // Record search time
      const now = new Date();
      setLastSearchTime(formatDate(now));
      
      // Store patient information in sessionStorage for visualization components
      if (patientId) {
        // Use centralized utility function for better type handling and consistency
        setPatientIdInSession(patientId);
        console.log("Storing patient ID in sessionStorage:", patientId, "(type before conversion:", typeof patientId + ")");
      }
      
      if (patientName) {
        setPatientNameInSession(patientName);
        console.log("Storing patient name in sessionStorage:", patientName);
      }
      
      // Check if we got data with symptoms before deducting credit
      if ((data.notes?.length || 0) > 0) {
        // Deduct credit for search
        decrementCredits();
        setLastCreditDeduction(formatDate(now));
        
        toast({
          title: "Search Complete",
          description: `Found ${data.notes?.length || 0} clinical notes for ${patientId || patientName}.`,
        });
      } else {
        // If no symptoms found initially, try again with a server data refresh
        setDataLoading(true);
        console.log("⚠️ No data found initially, attempting data refresh...");
        
        // Only retry if we haven't already done so
        if (retryCount === 0) {
          setRetryCount(1);
          
          setTimeout(async () => {
            try {
              const refreshResponse = await apiRequest('POST', '/api/search-patient', {
                patientId,
                patientName,
                useCachedData: false, // Force refresh from database
                forceRefresh: true
              });
              
              if (!refreshResponse.ok) {
                throw new Error('Error refreshing patient data');
              }
              
              const refreshData = await refreshResponse.json();
              
              // Update with refreshed data
              setClinicalNotes(refreshData.notes || []);
              setNotesCount(refreshData.notes?.length || 0);
              
              // Check if we got data this time
              if ((refreshData.notes?.length || 0) > 0) {
                setSearchSuccess(true);
                searchCacheRef.current[cacheKey] = refreshData;
                
                // Now deduct credit if we found data
                decrementCredits();
                setLastCreditDeduction(formatDate(new Date()));
                
                toast({
                  title: "Search Complete (Refreshed)",
                  description: `Found ${refreshData.notes?.length || 0} clinical notes for ${patientId || patientName}.`,
                });
              } else {
                // If still no data, show a message
                toast({
                  title: "No Data Found",
                  description: `No clinical notes found for ${patientId || patientName} after refresh.`,
                  variant: "destructive",
                });
              }
            } catch (refreshErr: any) {
              toast({
                title: "Data Refresh Failed",
                description: refreshErr.message,
                variant: "destructive",
              });
              setDataError(true);
            } finally {
              setDataLoading(false);
            }
          }, 1500); // Give the server a moment to process
        } else {
          setDataLoading(false);
          toast({
            title: "No Data Found",
            description: `No clinical notes found for ${patientId || patientName}.`,
            variant: "destructive",
          });
        }
      }
    } catch (err: any) {
      toast({
        title: "Search Failed",
        description: err.message,
        variant: "destructive",
      });
      setSearchSuccess(false);
      setDataError(true);
    } finally {
      setSearchInProgress(false);
    }
  };
  
  // Start the analysis process for the patient's notes
  const startAnalysis = async () => {
    if (clinicalNotes.length === 0) {
      toast({
        title: "Analysis Error",
        description: "No clinical notes found to analyze.",
        variant: "destructive",
      });
      return;
    }
    
    // Check if credits are available for analysis
    if (credits <= 0) {
      setPaymentDialogOpen(true);
      return;
    }
    
    setAnalyzingData(true);
    setAnalysisComplete(false);
    setProgressPercent(0);
    setProgressMessage("Initializing analysis...");
    setAnalysisStartTime(new Date());
    
    try {
      // Mock analysis progress updates with increasing percentages
      const simulateProgress = () => {
        let percent = 0;
        const interval = setInterval(() => {
          percent += Math.floor(Math.random() * 10) + 1;
          
          if (percent < 30) {
            setProgressMessage("Processing clinical notes...");
          } else if (percent < 60) {
            setProgressMessage("Extracting health indicators...");
          } else if (percent < 90) {
            setProgressMessage("Analyzing patterns...");
          } else {
            setProgressMessage("Finalizing results...");
          }
          
          setProgressPercent(Math.min(percent, 99));
          
          if (percent >= 100) {
            clearInterval(interval);
            completeAnalysis();
          }
        }, 500);
      };
      
      // Start simulated progress
      simulateProgress();
      
      // Make API request to analyze patient notes
      const response = await apiRequest('POST', '/api/analyze-patient', {
        patientId,
        notes: clinicalNotes
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error analyzing patient records');
      }
      
      const data = await response.json();
      setExtractedSymptoms(data.symptoms || []);
      
    } catch (err: any) {
      toast({
        title: "Analysis Failed",
        description: err.message,
        variant: "destructive",
      });
      setAnalyzingData(false);
    }
  };
  
  // Complete the analysis and update state
  const completeAnalysis = () => {
    setProgressPercent(100);
    setProgressMessage("Analysis complete!");
    setAnalysisComplete(true);
    setAnalysisEndTime(new Date());
    setAnalyzingData(false);
    
    // Deduct credit for analysis
    decrementCredits();
    setLastCreditDeduction(formatDate(new Date()));
    
    toast({
      title: "Analysis Complete",
      description: "Patient records have been analyzed successfully.",
    });
  };
  
  // Generate visualization data based on the active visualization type
  const generateVisualization = (type: VisualizationType) => {
    setActiveVisualization(type);
    
    // Generate mock data for visualizations
    let data;
    
    switch (type) {
      case VisualizationType.HEATMAP:
        data = {
          rows: extractedSymptoms.map(s => s.symptom).slice(0, 10),
          columns: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
          data: extractedSymptoms.slice(0, 10).reduce((acc: any, s: any) => {
            acc[s.symptom] = {
              "Jan": Math.floor(Math.random() * 5),
              "Feb": Math.floor(Math.random() * 5),
              "Mar": Math.floor(Math.random() * 5),
              "Apr": Math.floor(Math.random() * 5),
              "May": Math.floor(Math.random() * 5),
              "Jun": Math.floor(Math.random() * 5),
            };
            return acc;
          }, {})
        };
        break;
        
      case VisualizationType.BUBBLE:
        data = {
          rows: extractedSymptoms.map(s => s.symptom).slice(0, 10),
          columns: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
          data: extractedSymptoms.slice(0, 10).reduce((acc: any, s: any) => {
            acc[s.symptom] = {
              "Jan": Math.floor(Math.random() * 5),
              "Feb": Math.floor(Math.random() * 5),
              "Mar": Math.floor(Math.random() * 5),
              "Apr": Math.floor(Math.random() * 5),
              "May": Math.floor(Math.random() * 5),
              "Jun": Math.floor(Math.random() * 5),
            };
            return acc;
          }, {})
        };
        break;
        
      case VisualizationType.PIE:
        data = {
          labels: extractedSymptoms.map(s => s.symptom).slice(0, 5),
          data: extractedSymptoms.slice(0, 5).map(() => Math.floor(Math.random() * 100)),
        };
        break;
        
      case VisualizationType.BAR:
        data = {
          labels: extractedSymptoms.map(s => s.symptom).slice(0, 8),
          data: extractedSymptoms.slice(0, 8).map(() => Math.floor(Math.random() * 100)),
        };
        break;
        
      default:
        data = null;
    }
    
    setVisualizationData(data);
  };
  
  // Handle payment success
  const handlePaymentSuccess = (paymentIntent: any) => {
    // Add credits and update state
    setCredits(prev => prev + 10);
    completePayment(paymentIntent.id);
    
    toast({
      title: "Payment Successful",
      description: "Your credits have been added to your account.",
    });
    
    setPaymentDialogOpen(false);
  };
  
  // Render the patient search form
  const renderSearchForm = () => (
    <form onSubmit={handleSearchSubmit} className="space-y-4">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="patientId">Patient ID</Label>
            <Input
              id="patientId"
              placeholder="Enter Patient ID"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patientName">Patient Name</Label>
            <Input
              id="patientName"
              placeholder="Enter Patient Name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            {credits} credit{credits !== 1 ? 's' : ''} available
          </p>
          <Button type="submit" disabled={searchInProgress} className="w-32 bg-blue-600 hover:bg-blue-700 text-white">
            {searchInProgress ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" /> Search
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
  
  // Render the search results section
  const renderSearchResults = () => (
    <div className="space-y-4 mt-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Search Results</h3>
        {lastSearchTime && (
          <span className="text-sm text-muted-foreground">
            Last search: {lastSearchTime}
          </span>
        )}
      </div>
      
      {searchInProgress ? (
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">Searching patient records...</p>
        </div>
      ) : dataLoading ? (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="mb-4 flex items-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mr-3" />
            <div className="text-left">
              <p className="font-medium">Loading Data...</p>
              <p className="text-sm text-muted-foreground">Refreshing from database, please wait...</p>
            </div>
          </div>
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: `${retryCount * 30}%` }}></div>
          </div>
        </div>
      ) : searchSubmitted && !searchSuccess ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-4" />
          <h4 className="text-lg font-medium mb-2">No Results Found</h4>
          <p className="text-sm text-muted-foreground">
            We couldn't find any records matching your search criteria.
            <br />Please check the information and try again.
          </p>
          {dataError && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => {
                setDataError(false);
                setRetryCount(0);
                setSearchSubmitted(false);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Clear Error and Retry
            </Button>
          )}
        </div>
      ) : searchSuccess ? (
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="font-medium flex items-center">
                <User className="mr-2 h-4 w-4" />
                {patientId || patientName}
              </h4>
              <p className="text-sm text-muted-foreground">
                <FileText className="inline mr-1 h-3 w-3" /> 
                {notesCount} clinical notes found
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setViewNotes(!viewNotes)}
              >
                {viewNotes ? 'Hide Notes' : 'View Notes'}
              </Button>
              <Button 
                size="sm" 
                onClick={startAnalysis}
                disabled={analyzingData}
              >
                {analyzingData ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Analyzing
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-1 h-3 w-3" /> Run Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {viewNotes && (
            <div className="max-h-60 overflow-y-auto border rounded-lg p-2 mb-4">
              {clinicalNotes.length > 0 ? (
                clinicalNotes.map((note, index) => (
                  <div key={index} className="border-b last:border-0 py-2">
                    <p className="text-xs text-muted-foreground mb-1">
                      <Calendar className="inline mr-1 h-3 w-3" />
                      {new Date(note.date).toLocaleDateString()}
                    </p>
                    <p className="text-sm">{note.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-center p-4">
                  No clinical notes content available.
                </p>
              )}
            </div>
          )}
          
          {analyzingData && (
            <AnalysisProgress 
              percent={progressPercent} 
              message={progressMessage} 
            />
          )}
          
          {analysisComplete && (
            <div className="mt-4 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Analysis Results</h4>
                {analysisStartTime && analysisEndTime && (
                  <span className="text-xs text-muted-foreground">
                    Processing time: {((analysisEndTime.getTime() - analysisStartTime.getTime()) / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => generateVisualization(VisualizationType.HEATMAP)}
                  className="flex justify-between items-center"
                >
                  <span>Symptom Heatmap</span>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => generateVisualization(VisualizationType.BUBBLE)}
                  className="flex justify-between items-center"
                >
                  <span>Bubble Chart</span>
                  <Circle className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => generateVisualization(VisualizationType.PIE)}
                  className="flex justify-between items-center"
                >
                  <span>Distribution</span>
                  <PieChart className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => generateVisualization(VisualizationType.BAR)}
                  className="flex justify-between items-center"
                >
                  <span>Frequency</span>
                  <BarChart2 className="h-4 w-4" />
                </Button>
              </div>
              
              {activeVisualization && visualizationData && (
                <div className="border rounded-lg p-4 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium">
                      {activeVisualization === VisualizationType.HEATMAP && 'Symptom Tracking Over Time'}
                      {activeVisualization === VisualizationType.BUBBLE && 'Symptom Occurrence Patterns'}
                      {activeVisualization === VisualizationType.PIE && 'Symptom Distribution'}
                      {activeVisualization === VisualizationType.BAR && 'Symptom Frequency'}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <ChartExportWidget
                        chartId={`chart-${activeVisualization}`}
                        chartTitle={
                          activeVisualization === VisualizationType.HEATMAP ? 'Symptom Tracking Over Time' :
                          activeVisualization === VisualizationType.BUBBLE ? 'Symptom Occurrence Patterns' :
                          activeVisualization === VisualizationType.PIE ? 'Symptom Distribution' :
                          'Symptom Frequency'
                        }
                        data={visualizationData.rows ? 
                          visualizationData.rows.map((row: string) => {
                            const rowData: Record<string, any> = { Item: row };
                            visualizationData.columns.forEach((col: string) => {
                              rowData[col] = visualizationData.data[row][col] || 0;
                            });
                            return rowData;
                          }) : 
                          visualizationData.labels ? 
                            visualizationData.labels.map((label: string, idx: number) => ({
                              Label: label,
                              Value: visualizationData.data[idx]
                            })) : 
                            []
                        }
                        showDetailedExport={true}
                        getDetailedData={() => {
                          // Add additional metadata for detailed export
                          const basicData = visualizationData.rows ? 
                            visualizationData.rows.map((row: string) => {
                              const rowData: Record<string, any> = { Item: row };
                              visualizationData.columns.forEach((col: string) => {
                                rowData[col] = visualizationData.data[row][col] || 0;
                              });
                              return rowData;
                            }) : 
                            visualizationData.labels ? 
                              visualizationData.labels.map((label: string, idx: number) => ({
                                Label: label,
                                Value: visualizationData.data[idx]
                              })) : 
                              [];
                              
                          return basicData.map(item => ({
                            ...item,
                            PatientId: patientId,
                            VisualizationType: activeVisualization,
                            ExportDate: new Date().toISOString()
                          }));
                        }}
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setActiveVisualization(null)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                  
                  <div id={`chart-${activeVisualization}`} className="h-64 w-full">
                    {activeVisualization === VisualizationType.HEATMAP && (
                      <SimpleHeatmap data={visualizationData} />
                    )}
                    {activeVisualization === VisualizationType.BUBBLE && (
                      <SimpleBubbleChart pivotTable={visualizationData} />
                    )}
                    {activeVisualization === VisualizationType.PIE && (
                      <SimplePieChart data={visualizationData} />
                    )}
                    {activeVisualization === VisualizationType.BAR && (
                      <SimpleBarChart data={visualizationData} />
                    )}
                  </div>
                </div>
              )}
              
              {isDevelopment && (
                <div className="mt-4 border rounded p-4">
                  <h4 className="text-sm font-medium mb-2">Extracted Data (Debug)</h4>
                  <div className="max-h-40 overflow-y-auto">
                    <pre className="text-xs">
                      {JSON.stringify(extractedSymptoms, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
  
  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Patient Analysis</CardTitle>
          <CardDescription>
            Search for a patient by ID or name to analyze their clinical data.
            Each search and analysis costs 1 credit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderSearchForm()}
          {renderSearchResults()}
        </CardContent>
      </Card>
      
      {paymentDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Add Credits</CardTitle>
              <CardDescription>
                You need credits to search and analyze patient data.
                Each credit costs $1.00.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentFlow 
                paymentType="credits" 
                amount={10} 
                description="10 Search Credits"
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentCancel={() => setPaymentDialogOpen(false)}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}