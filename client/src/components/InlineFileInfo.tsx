import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, LineChart, Loader2, Search, FileBarChart, CheckCircle } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { toast } from "@/hooks/use-toast";
import { getPatientIdFromSession } from "@/utils/patient-session-controlling-file-05_12_25";

/**
 * This is a highly visible component that displays file information
 * and the Run Analysis button, to be placed directly in the Individual Search tab
 */
const InlineFileInfo: React.FC = () => {
  const { 
    fileInfo, 
    isLoading, 
    runPopulationSearch, 
    searchResults,
    updateSearchConfig
  } = useAppContext();

  // Get the patient ID from session storage
  const selectedPatientId = getPatientIdFromSession();

  // Add a loading state to prevent showing "no symptoms" message briefly
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Dynamic patient status that will be updated when data is available
  const [patientStatus, setPatientStatus] = useState({
    isAnalyzed: false, 
    symptomCount: 0,
    noteCount: 0,
    patientId: selectedPatientId || ""
  });

  // Function to fetch the actual patient data from server
  const fetchPatientData = async (patientId: string) => {
    setIsLoadingStatus(true);

    try {
      // First, try to get existing extracted symptoms from database
      const response = await fetch('/api/get-patient-symptoms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: patientId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve patient symptoms');
      }

      const data = await response.json();

      // Get the symptom and note counts from the response
      const symptoms = data.results || [];
      const uniqueNotes = new Set(symptoms.map((s: any) => s.dos_date)).size;

      setPatientStatus({
        isAnalyzed: symptoms.length > 0,
        symptomCount: symptoms.length,
        noteCount: uniqueNotes || 0,
        patientId
      });

      console.log(`Retrieved ${symptoms.length} existing symptoms for patient ${patientId}`);

    } catch (error) {
      console.error('Error fetching patient data:', error);
      // Set a default state in case of error
      setPatientStatus({
        isAnalyzed: false,
        symptomCount: 0,
        noteCount: 0,
        patientId
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Update patient status when selectedPatientId changes
  useEffect(() => {
    if (selectedPatientId) {
      // Fetch actual data from the server when patient ID changes
      fetchPatientData(selectedPatientId);
    }
  }, [selectedPatientId]);

  // This component should get the analysis status from context or parent components
  // We're relying on the parent to pass in the right information through the useAppContext hook
  // The FileProcessingStatus component handles the status checking logic

  // Handle running the analysis or redirecting to visualization
  const handleRunAnalysis = async () => {
    if (!fileInfo || !fileInfo.fileName) {
      toast({
        title: "No file selected",
        description: "Please upload or select a file before running analysis.",
        variant: "destructive"
      });
      return;
    }

    // If patient is already analyzed, redirect to visualization
    if (patientStatus.isAnalyzed) {
      // Redirect to the visualization page
      window.location.href = "/visualization/nivo-scatter";
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
        description: `Successfully processed ${patientStatus.noteCount} patient notes and extracted ${patientStatus.symptomCount} symptoms.`,
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
      {/* Enhanced File Information Card */}
      <div className="p-4 bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 rounded-md shadow-md mb-4">
        <div className="text-center font-bold text-blue-800 mb-2 text-lg flex items-center justify-center gap-2">
          <FileUp className="h-5 w-5" />
          <span>PATIENT DATA SOURCE</span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Records count with larger, more visible styling */}
          <div className="inline-flex items-center bg-white/80 text-blue-800 text-sm rounded-md px-3 py-2 border border-blue-300 shadow-sm">
            <div className="w-5 h-5 mr-2 text-blue-600 font-bold flex items-center justify-center">
              <Search className="h-4 w-4" />
            </div>
            <span className="font-semibold">
              {fileInfo?.totalRecords?.toLocaleString() || '0'} records • {fileInfo?.patientCount?.toLocaleString() || '0'} patients
            </span>
          </div>

          {/* File name and path with larger, more visible styling */}
          <div className="text-sm bg-white/80 px-3 py-2 rounded-md border border-blue-300">
            <span className="font-semibold mr-1">Source File:</span>
            <span className="text-blue-700">{fileInfo?.fileName || 'No file selected'}</span>
          </div>
        </div>
      </div>

      {/* Enhanced Run Analysis Card with Instructions */}
      <div id="run-analysis-card" className="p-4 bg-gradient-to-r from-green-100 to-blue-100 border-2 border-green-400 rounded-md shadow-md mb-4">
        <div className="text-center font-bold text-green-800 mb-2 text-lg flex items-center justify-center gap-2">
          <LineChart className="h-5 w-5" />
          <span>ANALYZE PATIENT DATA</span>
        </div>

        <div className="text-center text-sm text-slate-600 mb-4">
          {isLoadingStatus ? (
            <div className="flex flex-col items-center justify-center gap-2 text-amber-600 animate-pulse">
              <div className="bg-amber-100 p-2 rounded-md border border-amber-300 flex items-center gap-2 shadow-sm">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-medium">Loading patient data...</span>
              </div>
              <span className="text-xs">Please wait while we retrieve the latest information</span>
            </div>
          ) : patientStatus.isAnalyzed ? (
            <div className="flex items-center justify-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span>Patient data is up-to-date. {patientStatus.symptomCount} symptoms from {patientStatus.noteCount} notes extracted. Click "View Notes" to display them.</span>
            </div>
          ) : (
            <span>Click the button below to extract symptoms from the patient's notes and enable visualizations</span>
          )}
        </div>

        <div className="flex flex-col items-center">
          <Button 
            className={`px-6 py-5 text-lg font-bold shadow-lg transform transition hover:scale-105 mb-3 ${
              patientStatus.isAnalyzed 
                ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800" 
                : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            } text-white`}
            onClick={handleRunAnalysis}
            disabled={isLoading || isLoadingStatus}
          >
            {isLoading || isLoadingStatus ? (
              <>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                {isLoading ? "PROCESSING..." : "LOADING..."}
              </>
            ) : patientStatus.isAnalyzed ? (
              <>
                <CheckCircle className="mr-2 h-6 w-6" />
                VIEW RESULTS
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

          <div className="text-xs text-slate-500 italic max-w-md text-center">
            This step will analyze the patient's clinical notes to extract symptoms, diagnoses, and other relevant indicators
          </div>
        </div>
      </div>
    </div>
  );
};

export default InlineFileInfo;