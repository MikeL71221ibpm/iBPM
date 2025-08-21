// Last updated: May 24, 2025
// Controls component: IndividualSearch - used for patient search functionality
// This version adds standardized export functionality to visualizations

import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

// Import chart export widget and visualization components
import ChartExportWidget from "@/components/chart-export-widget";
import { 
  SymptomBarChart, 
  SymptomCirclePacking, 
  SymptomHeatmapTimeline, 
  HeatmapVisualizer 
} from '@/components/individual-visualizations-controlling-file-05_24_25';

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
import DatabaseStatsWidget from "./DatabaseStatsWidget";

// Visualization types enum
export enum VisualizationType {
  HEATMAP = 'heatmap',
  BUBBLE = 'bubble',
  PIE = 'pie',
  BAR = 'bar',
  // New standardized visualization types
  SYMPTOM_FREQUENCY = 'frequency',
  DIAGNOSTIC_CATEGORIES = 'categories',
  TIMELINE = 'timeline',
  DIAGNOSIS_HEATMAP = 'diagnosisHeatmap'
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
  const [visualizationTab, setVisualizationTab] = useState('frequency');
  
  // Date range for filtering (default to current year)
  const [dateRange, setDateRange] = useState<any>({
    from: new Date(new Date().getFullYear(), 0, 1), // Jan 1 of current year
    to: new Date(new Date().getFullYear(), 11, 31), // Dec 31 of current year
  });
  
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
          data: extractedSymptoms.slice(0, 5).map(() => Math.floor(Math.random() * 10) + 1)
        };
        break;
        
      case VisualizationType.BAR:
        data = {
          labels: extractedSymptoms.map(s => s.symptom).slice(0, 8),
          data: extractedSymptoms.slice(0, 8).map(() => Math.floor(Math.random() * 10) + 1)
        };
        break;
        
      default:
        data = null;
    }
    
    setVisualizationData(data);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Individual Patient Search</CardTitle>
          <CardDescription>
            Search for a patient by ID or name to view their clinical data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patientId">Patient ID</Label>
              <Input
                id="patientId"
                placeholder="Enter patient ID (e.g., 1018)"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="patientName">Patient Name</Label>
              <Input
                id="patientName"
                placeholder="Enter patient name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={searchInProgress || dataLoading}
            >
              {searchInProgress || dataLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
            
            <div className="text-xs text-muted-foreground">
              <p>Search will deduct 1 credit</p>
              <p>Available credits: {credits || 0}</p>
            </div>
          </form>
          
          {lastSearchTime && (
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Last search: {lastSearchTime}</p>
              {lastCreditDeduction && <p>Last credit deduction: {lastCreditDeduction}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Database Statistics Widget */}
      <DatabaseStatsWidget className="mb-6" showRefreshButton={true} />
      
      {/* Analysis Card */}
      {searchSuccess && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Patient Analysis</CardTitle>
            <CardDescription>
              {notesCount} clinical notes loaded
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
              <div className="flex gap-4">
                <Button
                  onClick={startAnalysis}
                  disabled={analyzingData || analysisComplete || clinicalNotes.length === 0}
                  className="flex-1 sm:flex-none"
                >
                  {analyzingData ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : analysisComplete ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Analysis Complete
                    </>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Run Analysis
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setViewNotes(!viewNotes)}
                  className="flex-1 sm:flex-none"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {viewNotes ? "Hide Notes" : "View Notes"}
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground text-right">
                {analyzingData && <p>Analysis in progress...</p>}
                {analysisComplete && analysisStartTime && analysisEndTime && (
                  <p>
                    Analysis completed in{" "}
                    {Math.round((analysisEndTime.getTime() - analysisStartTime.getTime()) / 1000)}{" "}
                    seconds
                  </p>
                )}
                {!analyzingData && !analysisComplete && <p>Click "Run Analysis" to process the data</p>}
              </div>
            </div>
            
            {/* Analysis Progress */}
            {analyzingData && (
              <div className="mt-6">
                <AnalysisProgress
                  percent={progressPercent}
                  message={progressMessage}
                />
              </div>
            )}
            
            {/* Notes View */}
            {viewNotes && clinicalNotes.length > 0 && (
              <div className="mt-6 border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 font-medium">Clinical Notes</div>
                <div className="px-4 py-2 max-h-96 overflow-y-auto">
                  {clinicalNotes.map((note, i) => (
                    <div key={i} className="mb-4 pb-4 border-b last:border-b-0">
                      <h4 className="font-medium">Note {i + 1}</h4>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{note.text}</p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span>Date: {note.date || "Unknown"}</span>
                        {note.provider && <span> | Provider: {note.provider}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Legacy Visualizations Card */}
      {analysisComplete && extractedSymptoms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Legacy Visualizations</CardTitle>
            <CardDescription>
              Choose a visualization type to explore the patient data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <Button 
                variant={activeVisualization === VisualizationType.HEATMAP ? "default" : "outline"}
                onClick={() => generateVisualization(VisualizationType.HEATMAP)}
                className="flex flex-col items-center py-4 h-auto"
              >
                <LayoutGrid className="h-6 w-6 mb-2" />
                <span>Heatmap</span>
              </Button>
              
              <Button 
                variant={activeVisualization === VisualizationType.BUBBLE ? "default" : "outline"}
                onClick={() => generateVisualization(VisualizationType.BUBBLE)}
                className="flex flex-col items-center py-4 h-auto"
              >
                <Circle className="h-6 w-6 mb-2" />
                <span>Bubble Chart</span>
              </Button>
              
              <Button 
                variant={activeVisualization === VisualizationType.PIE ? "default" : "outline"}
                onClick={() => generateVisualization(VisualizationType.PIE)}
                className="flex flex-col items-center py-4 h-auto"
              >
                <PieChart className="h-6 w-6 mb-2" />
                <span>Pie Chart</span>
              </Button>
              
              <Button 
                variant={activeVisualization === VisualizationType.BAR ? "default" : "outline"}
                onClick={() => generateVisualization(VisualizationType.BAR)}
                className="flex flex-col items-center py-4 h-auto"
              >
                <BarChart2 className="h-6 w-6 mb-2" />
                <span>Bar Chart</span>
              </Button>
            </div>
            
            {activeVisualization === VisualizationType.HEATMAP && visualizationData && (
              <VisualizationWrapper title="Symptom Heatmap">
                <SimpleHeatmap data={visualizationData} />
              </VisualizationWrapper>
            )}
            
            {activeVisualization === VisualizationType.BUBBLE && visualizationData && (
              <VisualizationWrapper title="Symptom Bubble Chart">
                <SimpleBubbleChart data={visualizationData} />
              </VisualizationWrapper>
            )}
            
            {activeVisualization === VisualizationType.PIE && visualizationData && (
              <VisualizationWrapper title="Symptom Distribution">
                <SimplePieChart data={visualizationData} />
              </VisualizationWrapper>
            )}
            
            {activeVisualization === VisualizationType.BAR && visualizationData && (
              <VisualizationWrapper title="Symptom Frequency">
                <SimpleBarChart data={visualizationData} />
              </VisualizationWrapper>
            )}
            
            {activeVisualization === null && (
              <div className="flex items-center justify-center p-12 border border-dashed rounded-lg">
                <div className="text-center">
                  <BarChart2 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-lg font-medium">No Visualization Selected</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose a visualization type from the options above
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* New V3.3 Standardized Visualizations with Export */}
      {analysisComplete && extractedSymptoms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Standardized Visualizations (V3.3)</CardTitle>
            <CardDescription>
              Enhanced visualizations with standardized export functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={visualizationTab} onValueChange={setVisualizationTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="frequency">Indicator Frequency</TabsTrigger>
                <TabsTrigger value="categories">Diagnostic Categories</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="heatmap">Diagnosis Heatmap</TabsTrigger>
              </TabsList>
              
              <TabsContent value="frequency" className="mt-4">
                <SymptomBarChart patientId={patientId} dateRange={dateRange} />
              </TabsContent>
              
              <TabsContent value="categories" className="mt-4">
                <SymptomCirclePacking patientId={patientId} dateRange={dateRange} />
              </TabsContent>
              
              <TabsContent value="timeline" className="mt-4">
                <SymptomHeatmapTimeline patientId={patientId} dateRange={dateRange} />
              </TabsContent>
              
              <TabsContent value="heatmap" className="mt-4">
                <HeatmapVisualizer patientId={patientId} dateRange={dateRange} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
      
      {/* Indicators Table */}
      {analysisComplete && extractedSymptoms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Indicators</CardTitle>
            <CardDescription>
              {extractedSymptoms.length} indicators extracted from clinical notes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BasicSymptomTable symptoms={extractedSymptoms} />
          </CardContent>
        </Card>
      )}
      
      {/* Payment Dialog */}
      <PaymentFlow
        isOpen={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        actionType="search"
      />
    </div>
  );
}