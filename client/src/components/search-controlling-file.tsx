import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Search, User, FileText, Calendar, PieChart, Download, Loader2, 
  PlayCircle, AlertCircle, FileUp, LineChart, CheckCircle, 
  BarChart2, LayoutGrid, Circle 
} from "lucide-react";

import FileProcessingStatus from "./FileProcessingStatus";

// Last updated: May 9, 2025 - 5:50 AM
// Controls component: IndividualSearch - used for patient search functionality

// Add a console log to see if this file is being loaded
console.log("IndividualSearch component loaded at", new Date().toLocaleTimeString());
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAppContext } from "@/context/AppContext";
import { PaymentFlow } from "./PaymentFlow";
import { AnalysisProgress } from "./AnalysisProgress";
import VisualizationWrapper from "./VisualizationWrapper";
import DebugHeatmap from "./DebugHeatmap"; 
import BasicSymptomTable from "./BasicSymptomTable";
import SimpleHeatmap from "./SimpleHeatmap";
import SimpleBubbleChart from "./SimpleBubbleChart";
import SimplePieChart from "./SimplePieChart";
import SimpleBarChart from "./SimpleBarChart";
import PivotTableDebug from "./PivotTableDebug";
import RawPivotDebug from "./RawPivotDebug";
import CategoricalHrsnChart from "./categorical-hrsn-chart-05_13_25";
// Import statement added to the top - CategoricalHrsnChart should display automatically
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  filterSymptomsByPatient, 
  filterSymptomsByType,
  processDataForHeatmap, 
  processDataForBubbleChart,
  processDataForDiagnosticCategories,
  processDataForSymptomProblems,
  ExtractedSymptom
} from "@/utils/dataUtils";
import { Link } from "wouter";

const STEP_TITLES = {
  1: "Patient Search",
  2: "Pay for Analysis",
  3: "View Results"
};

export interface PatientInfo {
  id: string;
  name: string;
  noteCount: number;
  lastVisit: string;
}

export default function IndividualSearch() {
  const { toast } = useToast();
  const { 
    setCurrentPatientId, 
    currentPatientId, 
    addToCart,
    cartItems,
    checkedOut,
    resetCart,
    startAnalysis,
    isAnalyzing,
    analysisProgress,
    analysisComplete,
    analysisError,
    resetAnalysis,
    searchResults,
    setSearchResults,
    searchInitiated,
    setSearchInitiated,
    searchQuery,
    setSearchQuery,
    searchLoading,
    setSearchLoading,
    selectedPatient,
    setSelectedPatient
  } = useAppContext();
  
  const [searchStep, setSearchStep] = useState(1);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [patientData, setPatientData] = useState<ExtractedSymptom[]>([]);
  const [currentTab, setCurrentTab] = useState("summary");
  
  // Create a memo to check if the current patient is in the cart
  const isPatientInCart = useMemo(() => {
    return cartItems.some(item => item.patientId === selectedPatient?.id);
  }, [cartItems, selectedPatient]);
  
  // Determine the active step based on current state
  const determineActiveStep = () => {
    if (!selectedPatient) return 1;
    if (!checkedOut || !analysisComplete) return 2;
    return 3;
  };
  
  useEffect(() => {
    setSearchStep(determineActiveStep());
  }, [selectedPatient, checkedOut, analysisComplete]);
  
  // Handle patient search with debouncing
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setSearchQuery(query);
    
    // Clear previous timer
    if (searchTimer) {
      clearTimeout(searchTimer);
    }
    
    if (query.length < 2) {
      setSearchResults([]);
      setSearchInitiated(false);
      return;
    }
    
    // Set search loading state
    setSearchLoading(true);
    
    // Set a new timer for 500ms debounce
    const timer = setTimeout(async () => {
      try {
        // Set that search was initiated
        setSearchInitiated(true);
        
        // API call for patient search
        const response = await apiRequest('GET', `/api/patients/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
          setSearchResults(data);
        } else {
          setSearchResults([]);
          console.error("Unexpected response format:", data);
        }
      } catch (error) {
        console.error("Error searching patients:", error);
        toast({
          title: "Search Error",
          description: "Failed to search patients. Please try again.",
          variant: "destructive"
        });
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500);
    
    setSearchTimer(timer);
  };
  
  // Handle patient selection
  const handleSelectPatient = async (patient: PatientInfo) => {
    setSelectedPatient(patient);
    setCurrentPatientId(patient.id);
    
    // Check if extracted symptoms already exist for this patient
    try {
      const response = await apiRequest("GET", `/api/extracted-symptoms/${patient.id}`);
      const existingSymptoms = await response.json();
      
      if (existingSymptoms && existingSymptoms.length > 0) {
        // Skip payment step and go directly to results if symptoms exist
        setExtractedSymptoms(existingSymptoms);
        setSearchStep(3);
        
        toast({
          title: "Patient Data Found",
          description: `Found ${existingSymptoms.length} extracted symptoms for ${patient.name}. Displaying results.`,
        });
      } else {
        // No existing symptoms, proceed to payment step
        setSearchStep(2);
      }
    } catch (error) {
      console.error("Error checking existing symptoms:", error);
      // If error checking symptoms, default to payment step
      setSearchStep(2);
    }
  };
  
  // Handle adding patient to cart
  const handleAddToCart = () => {
    if (selectedPatient) {
      addToCart({
        id: `patient-${selectedPatient.id}`,
        type: 'patient',
        patientId: selectedPatient.id,
        name: selectedPatient.name,
        price: 100, // $1.00 per patient
        quantity: 1
      });
      
      toast({
        title: "Added to Cart",
        description: `Patient ${selectedPatient.name} added to cart.`,
      });
    }
  };
  
  // Start the analysis process
  const handleStartAnalysis = async () => {
    if (!selectedPatient) return;
    
    try {
      await startAnalysis(selectedPatient.id);
      setSearchStep(3);
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Error",
        description: "Failed to start analysis. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Handle retrying the analysis
  const handleRetryAnalysis = () => {
    resetAnalysis();
    handleStartAnalysis();
  };
  
  // Reset the search and start over
  const handleReset = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPatient(null);
    setCurrentPatientId(null);
    resetCart();
    resetAnalysis();
    setSearchStep(1);
  };
  
  // Render content based on current step
  const renderStepContent = () => {
    switch (searchStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by patient name or ID..."
                className="pl-10"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
            
            {searchLoading && (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            
            {searchInitiated && !searchLoading && searchResults.length === 0 && (
              <div className="text-center p-4 text-muted-foreground">
                No patients found. Try a different search.
              </div>
            )}
            
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground pb-1">Select a patient to analyze:</p>
                {searchResults.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-3 bg-white border rounded-md hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectPatient(patient)}
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-8 w-8 text-primary bg-primary/10 p-1.5 rounded-full" />
                      <div>
                        <div className="font-medium">{patient.name}</div>
                        <div className="text-xs text-muted-foreground">ID: {patient.id}</div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div>{patient.noteCount} Notes</div>
                      <div className="text-xs text-muted-foreground">Last Visit: {patient.lastVisit}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            {selectedPatient && (
              <>
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-md">
                  <User className="h-10 w-10 text-primary bg-primary/10 p-2 rounded-full" />
                  <div>
                    <h3 className="font-medium">Patient: {selectedPatient.name}</h3>
                    <p className="text-sm text-muted-foreground">ID#: {selectedPatient.id}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={handleReset}
                  >
                    Change Patient
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Patient Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Patient ID:</span>
                          <span className="text-sm">{selectedPatient.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Notes Available:</span>
                          <span className="text-sm">{selectedPatient.noteCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Last Visit:</span>
                          <span className="text-sm">{selectedPatient.lastVisit}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Analysis Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Patient Analysis:</span>
                          <span className="text-sm">$1.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Notes Processing:</span>
                          <span className="text-sm">${(selectedPatient.noteCount * 0.01).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Total:</span>
                          <span>${(1 + selectedPatient.noteCount * 0.01).toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <Button variant="outline" onClick={handleReset}>
                    Cancel
                  </Button>
                  
                  {!isPatientInCart ? (
                    <Button onClick={handleAddToCart}>
                      Add to Cart
                    </Button>
                  ) : (
                    <div className="text-right">
                      <PaymentFlow onSuccess={handleStartAnalysis} />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      
      case 3:
        if (isAnalyzing) {
          return <AnalysisProgress progress={analysisProgress} />;
        }
        
        if (analysisError) {
          return (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
              <h3 className="mt-4 text-xl font-semibold">Analysis Error</h3>
              <p className="mt-2 text-muted-foreground">
                There was an error analyzing this patient's data.
              </p>
              <div className="mt-6 flex justify-center gap-4">
                <Button variant="outline" onClick={handleReset}>
                  Start Over
                </Button>
                <Button onClick={handleRetryAnalysis}>
                  Retry Analysis
                </Button>
              </div>
            </div>
          );
        }
        
        if (analysisComplete) {
          return (
            <div className="space-y-6">
              {selectedPatient && (
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-md">
                  <User className="h-10 w-10 text-primary bg-primary/10 p-2 rounded-full" />
                  <div>
                    <h3 className="font-medium">Patient: {selectedPatient.name}</h3>
                    <p className="text-sm text-muted-foreground">ID#: {selectedPatient.id}</p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      asChild
                    >
                      <Link href={`/nivo-scatter-view-themed/${selectedPatient.id}`}>
                        <Circle className="h-4 w-4" />
                        Bubble Chart
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      asChild
                    >
                      <Link href={`/enhanced-heatmap-v2/${selectedPatient.id}`}>
                        <PieChart className="h-4 w-4" />
                        Heatmap
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      asChild
                    >
                      <Link href={`/simplified-auto-pivot/${selectedPatient.id}`}>
                        <LayoutGrid className="h-4 w-4" />
                        Pivot Tables
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
              
              <Tabs value={currentTab} onValueChange={setCurrentTab}>
                <TabsList className="w-full justify-start border-b rounded-none px-0">
                  <TabsTrigger value="summary" className="rounded-b-none relative">
                    Summary
                    <span className="absolute -bottom-px left-0 right-0 h-[2px] bg-primary rounded-full"></span>
                  </TabsTrigger>
                  <TabsTrigger value="symptoms" className="rounded-b-none">Symptoms</TabsTrigger>
                  <TabsTrigger value="diagnosis" className="rounded-b-none">Diagnoses</TabsTrigger>
                  <TabsTrigger value="hrsn" className="rounded-b-none">HRSN Indicators</TabsTrigger>
                </TabsList>
                
                <TabsContent value="summary" className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <VisualizationWrapper title="Symptom Trends" buttonText="View Full Chart">
                      <SimpleBubbleChart patientId={selectedPatient?.id || "1"} />
                    </VisualizationWrapper>
                    
                    <VisualizationWrapper title="HRSN Indicators" buttonText="View Full Chart">
                      <CategoricalHrsnChart
                        data={[]}
                        title="HRSN Distribution"
                        categoryName="housing_insecurity"
                        colorScheme="blue"
                        height={220}
                        filterBy={{}}
                      />
                    </VisualizationWrapper>
                  </div>
                </TabsContent>
                
                <TabsContent value="symptoms" className="pt-4">
                  <VisualizationWrapper title="Symptom Frequency" fullWidth buttonText="View Full Chart">
                    <BasicSymptomTable patientId={selectedPatient?.id || "1"} />
                  </VisualizationWrapper>
                </TabsContent>
                
                <TabsContent value="diagnosis" className="pt-4">
                  <VisualizationWrapper title="Diagnosis Distribution" fullWidth buttonText="View Full Chart">
                    <SimpleHeatmap patientId={selectedPatient?.id || "1"} type="diagnosis" />
                  </VisualizationWrapper>
                </TabsContent>
                
                <TabsContent value="hrsn" className="pt-4">
                  <VisualizationWrapper title="HRSN Indicators" fullWidth buttonText="View Full Chart">
                    <SimpleHeatmap patientId={selectedPatient?.id || "1"} type="hrsn" />
                  </VisualizationWrapper>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-between items-center pt-4">
                <Button variant="outline" onClick={handleReset}>
                  New Search
                </Button>
                
                <Button asChild>
                  <Link href={`/visualization-dashboard/${selectedPatient?.id || "1"}`}>
                    Full Dashboard
                  </Link>
                </Button>
              </div>
            </div>
          );
        }
        
        return (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <h3 className="mt-4 text-xl font-semibold">Loading Analysis</h3>
            <p className="mt-2 text-muted-foreground">
              Please wait while we load the analysis results.
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle>Patient Analysis</CardTitle>
        <CardDescription>
          Search and analyze individual patient data
        </CardDescription>
      </CardHeader>
      
      {/* Step indicators */}
      <div className="px-6">
        <div className="flex justify-between mb-6">
          {[1, 2, 3].map(step => (
            <div key={step} className="flex flex-col items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === searchStep
                    ? 'bg-primary text-white'
                    : step < searchStep
                      ? 'bg-primary/20 text-primary'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step}
              </div>
              <div className="text-xs mt-1 text-center">
                {STEP_TITLES[step as keyof typeof STEP_TITLES]}
              </div>
            </div>
          ))}
        </div>
        
        {/* Step progress line */}
        <div className="relative mb-8">
          <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 rounded-full" />
          <div 
            className="absolute top-0 left-0 h-1 bg-primary rounded-full transition-all duration-300" 
            style={{
              width: `${(searchStep - 1) * 50}%`
            }}
          />
        </div>
      </div>
      
      <CardContent>
        {renderStepContent()}
      </CardContent>
    </Card>
  );
}