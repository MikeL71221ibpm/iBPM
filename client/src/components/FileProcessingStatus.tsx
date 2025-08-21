import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { 
  FileIcon, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  FileUp, 
  RefreshCw,
  Database,
  Play,
  RotateCw,
  Calendar,
  Zap,
  FileSearch,
  Layers
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import WebSocketMonitor from "./WebSocketMonitor";

export interface FileStatusData {
  fileName: string;
  uploadDate: string;
  processingDate?: string;
  recordCount: number;
  patientCount: number;
  status: 'processed' | 'partial' | 'unprocessed' | 'queued' | 'processing';
  progressPercent?: number;
  filePath: string;
  lastAnalyzedDate?: string;
}

interface FileProcessingStatusProps {
  selectedPatientId?: string;
  onRefresh?: () => void;
  onProcessFile?: (file: FileStatusData) => void;
  onProcessPatient?: (patientId: string, fileName: string) => void;
  onScheduleProcessing?: (file: FileStatusData) => void;
  isActiveProcessing?: boolean; // New prop to indicate active processing
  isPatientAnalyzed?: boolean; // Whether the patient has been analyzed
  symptomCount?: number; // Number of extracted symptoms
  noteCount?: number; // Number of patient notes
}

export type FileProcessingStatusRef = {
  setAnalysisInProgress: (value: boolean) => void;
};

export const FileProcessingStatus = forwardRef<FileProcessingStatusRef, FileProcessingStatusProps>((props, ref) => {
  const { 
    selectedPatientId, 
    onRefresh,
    onProcessFile,
    onProcessPatient,
    onScheduleProcessing,
    isActiveProcessing = false, // Default to false if not provided
    isPatientAnalyzed = false, // Whether the patient has been analyzed
    symptomCount = 0, // Number of extracted symptoms
    noteCount = 0 // Number of patient notes
  } = props;
  const { toast } = useToast();
  const [activeFile, setActiveFile] = useState<FileStatusData | null>(null);
  const [queuedFiles, setQueuedFiles] = useState<FileStatusData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Track when patient analysis is in progress
  const [analysisInProgress, setAnalysisInProgress] = useState(false);
  
  // Expose setAnalysisInProgress to parent component via ref
  useImperativeHandle(ref, () => ({
    setAnalysisInProgress
  }));
  
  // Artificial progress for visual feedback when processing is active but no progress data yet
  const [artificialProgress, setArtificialProgress] = useState(5);
  
  // Set up interval to increment artificial progress when processing is active
  useEffect(() => {
    if (!isActiveProcessing) {
      setArtificialProgress(5); // Reset to initial value when not processing
      return;
    }
    
    // Only use artificial progress if we don't have real progress data
    const intervalId = setInterval(() => {
      setArtificialProgress((prev) => {
        // Slow down as we get higher to avoid going too far ahead of real progress
        const increment = prev < 30 ? 3 : (prev < 60 ? 2 : 1);
        // Stop at 85% to leave room for real progress to take over
        return Math.min(85, prev + increment);
      });
    }, 3000);
    
    return () => clearInterval(intervalId);
  }, [isActiveProcessing]);

  // Fetch actual file status from the server
  useEffect(() => {
    // Initial fetch
    fetchFileStatus();
    
    // Set up a refresh interval to update file status periodically
    // Always poll for file status, but don't show the loading spinner when data is loaded
    const intervalId = setInterval(fetchFileStatus, 5000); // Refresh every 5 seconds for more responsive updates
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // This would be the actual implementation that fetches file status
  const fetchFileStatus = async () => {
    // We no longer use the loading spinner at all, immediately set loading to false
    // to ensure it never appears
    setIsLoading(false);
    
    try {
      const response = await apiRequest("GET", "/api/file-status");
      if (!response.ok) {
        throw new Error("Failed to fetch file status");
      }
      const data = await response.json();
      setActiveFile(data.activeFile);
      setQueuedFiles(data.queuedFiles);
    } catch (error) {
      console.error("Error fetching file status:", error);
    }
  };

  // For selected patient, determine if they need to run analysis or can just search
  const getPatientProcessingStatus = () => {
    if (!selectedPatientId || !activeFile) return null;
    
    // DEBUG: Log state that affects patient processing status determination
    console.log(`[DEBUG] Patient status determination: 
      selectedPatientId: ${selectedPatientId}
      analysisInProgress: ${analysisInProgress}
      isActiveProcessing: ${isActiveProcessing}
      isPatientAnalyzed: ${isPatientAnalyzed}
      symptomCount: ${symptomCount}
      noteCount: ${noteCount}
    `);

    // First check if analysis is in progress to prioritize this state
    if (analysisInProgress || isActiveProcessing) {
      return {
        processed: false,
        processing: true,
        message: "Analysis in progress. Please wait while we extract symptoms from the patient's notes."
      };
    }

    // Then check if patient is already analyzed
    if (isPatientAnalyzed) {
      if (symptomCount > 0) {
        return {
          processed: true,
          processing: false,
          message: `Patient data is up-to-date. ${symptomCount} symptoms from ${noteCount} notes extracted. Click "View Notes" to display them.`
        };
      } else if (noteCount && noteCount > 0) {
        // Patient is analyzed but no symptoms found - still mark as processed
        return {
          processed: true,
          processing: false,
          message: `Patient notes analyzed (${noteCount}). No symptoms were identified in the clinical notes.`
        };
      } else {
        // Patient is marked as analyzed but we don't have note count 
        // This ensures we show processed state even if we don't have complete data
        return {
          processed: true,
          processing: false,
          message: `Patient notes analyzed. No symptoms were extracted.`
        };
      }
    }

    // Patient needs analysis
    return {
      processed: false,
      processing: false,
      message: "Patient-specific note analysis needed. Click 'Run Analysis' to extract symptoms and enable visualizations."
    };
  };

  const patientStatus = selectedPatientId ? getPatientProcessingStatus() : null;

  const getStatusBadge = (status: FileStatusData['status']) => {
    switch (status) {
      case 'processed':
        return (
          <Badge className="bg-green-500 text-white border-green-700 flex items-center gap-1 font-medium shadow-sm">
            <CheckCircle className="h-3 w-3" />
            Processed
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-yellow-500 text-white border-yellow-700 flex items-center gap-1 font-medium shadow-sm">
            <Clock className="h-3 w-3" />
            Partial
          </Badge>
        );
      case 'unprocessed':
        return (
          <Badge className="bg-red-500 text-white border-red-700 flex items-center gap-1 font-medium shadow-sm">
            <AlertCircle className="h-3 w-3" />
            Unprocessed
          </Badge>
        );
      case 'queued':
        return (
          <Badge className="bg-blue-500 text-white border-blue-700 flex items-center gap-1 font-medium shadow-sm">
            <Clock className="h-3 w-3" />
            Queued
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-purple-600 text-white border-purple-800 flex items-center gap-1 font-medium shadow-sm">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse-slow"></div>
            Processing
          </Badge>
        );
    }
  };
  
  // Helper function to handle "Process File" button click
  const handleProcessFile = (file: FileStatusData) => {
    if (onProcessFile) {
      onProcessFile(file);
    } else {
      toast({
        title: "Processing file",
        description: `Starting to process ${file.fileName}`,
      });
    }
  };
  
  // Helper function to handle "Process Patient" button click
  const handleProcessPatient = (patientId: string, file: FileStatusData) => {
    // Set analysis in progress to show WebSocket monitor
    setAnalysisInProgress(true);
    
    // Set up a timeout to reset the analysis state after a longer period
    // This ensures the UI doesn't stay stuck in "processing" mode if something fails
    const timeout = setTimeout(() => {
      setAnalysisInProgress(false);
      
      // Show a more helpful error message that directs users to the main "Run Analysis" button
      toast({
        variant: "destructive",
        title: "Analysis incomplete",
        description: "The analysis is taking longer than expected. Please try using the main 'Run Analysis' button instead.",
        action: (
          <ToastAction altText="Try again" onClick={() => {
            // Find and click the main Run Analysis button
            const analysisSection = document.getElementById('run-analysis-card');
            if (analysisSection) {
              analysisSection.scrollIntoView({ behavior: 'smooth' });
              // Highlight the button
              const button = analysisSection.querySelector('button');
              if (button) {
                button.classList.add('animate-attention-pulse');
                setTimeout(() => button.classList.remove('animate-attention-pulse'), 3000);
              }
            }
          }}>
            Try Again
          </ToastAction>
        ),
      });
    }, 180000); // 180 seconds (3 minutes) to allow time for processing
    
    if (onProcessPatient && patientId) {
      // Call the parent handler to start actual processing
      onProcessPatient(patientId, file.fileName);
      
      // The parent component should clear the timeout when processing completes
      // by setting analysisInProgress back to false
      return () => clearTimeout(timeout);
    } else {
      toast({
        title: "Processing patient data",
        description: `Starting to process patient ${patientId} from ${file.fileName}`,
      });
      
      // For testing/demo purposes, automatically clear after 10 seconds
      // Note: This code path is only taken when the component is used in demo/preview mode
      // and doesn't have a parent callback for actual processing
      setTimeout(() => {
        setAnalysisInProgress(false);
        // Don't show a toast notification in demo mode to avoid confusion with the UI
        console.log("[Demo] Processing complete for patient", patientId);
        // Uncomment the following if toast notification is needed in demo mode
        /*
        toast({
          title: "[Demo Mode] Processing simulation complete",
          description: `This is a simulated completion for patient ${patientId}`,
        });
        */
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  };
  
  // Helper function to handle "Schedule Processing" button click  
  const handleScheduleProcessing = (file: FileStatusData) => {
    if (onScheduleProcessing) {
      onScheduleProcessing(file);
    } else {
      toast({
        title: "Scheduled processing",
        description: `Scheduled background processing for ${file.fileName}`,
      });
    }
  };

  const getStatusDescription = (status: FileStatusData['status']) => {
    switch (status) {
      case 'processed':
        return "All records have been processed and are available for search";
      case 'partial':
        return "Some records have been processed but others still need analysis";
      case 'unprocessed':
        return "File has been uploaded but records need to be processed";
      case 'queued':
        return "File is waiting in the processing queue";
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">Data Processing Status</CardTitle>
          {onRefresh && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={onRefresh}
                    className="p-1 hover:bg-gray-100 rounded-full"
                    aria-label="Refresh file status"
                  >
                    <RefreshCw className="h-4 w-4 text-gray-500" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh file status</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <CardDescription>File tracking for symptom extraction</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {activeFile && (
          <div className="border rounded-md overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Current Active Data</h3>
                {getStatusBadge(activeFile.status)}
              </div>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-start gap-2">
                <FileIcon className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={activeFile.fileName}>
                    {activeFile.fileName}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    Last updated: {activeFile.processingDate || activeFile.uploadDate} • 
                    <span className="font-medium text-blue-600">{activeFile.patientCount}</span> patients • 
                    <span className="font-medium text-blue-600">{activeFile.recordCount?.toLocaleString() || 0}</span> records
                  </div>
                </div>
              </div>
              
              {/* Scenario 5: Partial file processing - Show continue processing button */}
              {activeFile.status === 'partial' && (
                <div className="mt-3 border border-yellow-200 bg-yellow-50 rounded-md p-2">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-yellow-800">
                      <span className="font-medium">Partial Processing:</span> Some patients in this file need processing
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-7 border-yellow-400 bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
                      onClick={() => handleProcessFile(activeFile)}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Continue File Processing
                    </Button>
                  </div>
                  <Progress 
                    value={activeFile.progressPercent} 
                    className="h-1.5 mt-2 bg-yellow-100" 
                  />
                  <p className="text-[10px] text-yellow-700 mt-1">
                    {activeFile.progressPercent}% complete
                  </p>
                </div>
              )}
              
              {/* If we have a selected patient, show their processing status */}
              {patientStatus && (
                <div className={`mt-2 text-xs p-2 rounded ${
                  patientStatus.processed 
                    ? 'bg-green-50 text-green-700' 
                    : patientStatus.processing 
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-amber-50 text-amber-700'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center">
                        {patientStatus.processed ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {patientStatus.message}
                          </>
                        ) : patientStatus.processing ? (
                          <>
                            <RotateCw className="h-3 w-3 mr-1 animate-spin" />
                            {patientStatus.message}
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {patientStatus.message}
                          </>
                        )}
                      </span>
                      
                      {/* Show WebSocket monitor when patient is being analyzed */}
                      {analysisInProgress && (
                        <WebSocketMonitor />
                      )}
                    </div>
                    
                    {/* Scenario 2: Updating existing patient records - Show Re-analyze button */}
                    {patientStatus.processed && selectedPatientId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-green-800 hover:bg-green-100 hover:text-green-900 px-2"
                        onClick={() => handleProcessPatient(selectedPatientId, activeFile)}
                      >
                        <RotateCw className="h-3 w-3 mr-1" />
                        Re-analyze patient
                      </Button>
                    )}
                    
                    {/* Scenario 1: First-time patient from newly uploaded file - Show Analyze Now button */}
                    {!patientStatus.processed && selectedPatientId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-amber-800 hover:bg-amber-100 hover:text-amber-900 px-2"
                        onClick={() => {
                          // Scroll to main analysis button for a consistent workflow
                          const analysisSection = document.getElementById('run-analysis-card');
                          if (analysisSection) {
                            analysisSection.scrollIntoView({ behavior: 'smooth' });
                            // Highlight the button with a glow effect
                            const button = analysisSection.querySelector('button');
                            if (button) {
                              button.classList.add('animate-attention-pulse');
                              setTimeout(() => button.classList.remove('animate-attention-pulse'), 3000);
                            }
                          } else {
                            // Fallback if the section isn't found
                            handleProcessPatient(selectedPatientId, activeFile);
                          }
                        }}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Run Analysis
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {queuedFiles.length > 0 && (
          <div className="border rounded-md overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Recently Uploaded</h3>
                <FileUp className="h-4 w-4 text-gray-500" />
              </div>
            </div>
            <div className="divide-y">
              {queuedFiles.map((file, index) => (
                <div key={index} className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <FileIcon className="h-4 w-4 text-gray-500 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate" title={file.fileName}>
                          {file.fileName}
                        </p>
                        {getStatusBadge(file.status)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Uploaded: {file.uploadDate} • 
                        <span className="font-medium text-indigo-600">{file.patientCount}</span> patients • 
                        <span className="font-medium text-indigo-600">{file.recordCount?.toLocaleString() || 0}</span> records
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{getStatusDescription(file.status)}</p>
                      
                      {/* Action buttons for queued/unprocessed files */}
                      {(file.status === 'unprocessed' || file.status === 'queued') && (
                        <div className="flex space-x-2 mt-2">
                          {/* Scenario 3 & 4: Process entire file from Individual or Population side */}
                          <Button
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-xs border-blue-400 bg-blue-50 hover:bg-blue-100 text-blue-700"
                            onClick={() => handleProcessFile(file)}
                          >
                            <FileSearch className="h-3 w-3 mr-1" />
                            Process File
                          </Button>
                          
                          {/* Scenario 6: Schedule background processing for larger files */}
                          {file.recordCount > 5000 && (
                            <Button
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-xs border-purple-400 bg-purple-50 hover:bg-purple-100 text-purple-700"
                              onClick={() => handleScheduleProcessing(file)}
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              Schedule File Processing
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!activeFile && !queuedFiles.length && !isLoading && (
          <div className="py-6 text-center text-gray-500">
            <FileIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No data files found</p>
          </div>
        )}

        {/* Removed loading spinner as requested */}
        
        {/* Active processing indicator - shows when processing is happening but no real progress data yet */}
        {isActiveProcessing && (
          <div className="mt-4 border-2 border-purple-300 bg-purple-50 rounded-lg p-4 shadow-lg animate-pulse-slow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-purple-600 rounded-full animate-pulse-slow shadow-md shadow-purple-300"></div>
                <h3 className="font-semibold text-purple-800">Active Processing</h3>
              </div>
              <Badge className="bg-purple-600 text-white">In Progress</Badge>
            </div>
            
            <Progress 
              value={artificialProgress} 
              className="h-2 mb-2" 
            />
            
            <div className="flex justify-between text-xs text-purple-700">
              <span>Processing data...</span>
              <span className="font-medium">{artificialProgress}% complete</span>
            </div>
            
            <p className="text-xs text-purple-600 mt-3 italic">
              This process may take a few minutes. Please don't close this window.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default FileProcessingStatus;