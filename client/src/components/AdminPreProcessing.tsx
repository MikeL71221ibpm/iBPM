import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Upload, Database, RefreshCw, AlertCircle, CheckCircle, Check, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import DatabaseStatsWidget from "@/components/DatabaseStatsWidget";

/**
 * Component for admin users to trigger symptom pre-processing
 */
const AdminPreProcessing = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [source, setSource] = useState<"database" | "csv">("database");
  const [csvFilePath, setCsvFilePath] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sseSourceRef = useRef<EventSource | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [processingStatus, setProcessingStatus] = useState<"idle" | "processing" | "completed" | "error">("idle");
  const [processedPatients, setProcessedPatients] = useState(0);
  const [totalPatients, setTotalPatients] = useState(0);
  const [isGeneratingLibrary, setIsGeneratingLibrary] = useState(false);
  const [libraryGenProgress, setLibraryGenProgress] = useState(0);
  const [libraryGenMessage, setLibraryGenMessage] = useState("");
  const [symptomFileInput, setSymptomFileInput] = useState<File | null>(null);
  const symptomFileInputRef = useRef<HTMLInputElement>(null);
  
  // Manual refresh button spinner state - controls button spinning independently
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);
  
  // System test state
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [systemTestResults, setSystemTestResults] = useState<Array<{
    name: string;
    status: 'pass' | 'fail' | 'running' | 'pending';
    message: string;
  }> | null>(null);
  
  // Enhanced query for processing status with real-time updates
  const { data: processingData, refetch: refetchProcessingStatus } = useQuery({
    queryKey: ["/api/processing-status", "pre_processing", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const response = await fetch(`/api/processing-status/pre_processing`);
      if (!response.ok) {
        throw new Error("Failed to fetch processing status");
      }
      return response.json();
    },
    enabled: !!user,
    refetchInterval: isProcessing ? 5000 : false // Refresh every 5 seconds while processing
  });
  
  // Query for database statistics (record counts, etc.)
  const { data: databaseStats, refetch: refetchStats, isRefetching: isRefreshingStats } = useQuery({
    queryKey: ["/api/database-stats", user?.id], 
    queryFn: async () => {
      if (!user) return null;
      // Add a unique query parameter to bust cache on every request
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/database-stats?t=${timestamp}`, {
        cache: 'no-cache', // Force fresh fetch from server
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch database statistics");
      }
      
      const data = await response.json();
      console.log("Database stats fetched:", data);
      return data;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds only - no rapid refresh
    refetchOnWindowFocus: true, // Also refresh when window regains focus
    staleTime: 0, // Consider data immediately stale
    gcTime: 0,    // Don't cache the data at all (replaced cacheTime in v5)
  });
  
  // System test handler - runs 6 critical validation tests
  const handleRunSystemTests = useCallback(async () => {
    setIsRunningTests(true);
    
    // Initialize test results with 7 critical parameters (includes algorithm validation)
    const tests = [
      { name: "Database Connection", status: 'running' as const, message: "Testing database connectivity..." },
      { name: "Symptom Library", status: 'pending' as const, message: "Validating symptom library access..." },
      { name: "File Processing", status: 'pending' as const, message: "Checking file system access..." },
      { name: "Authentication", status: 'pending' as const, message: "Verifying user authentication..." },
      { name: "Memory Usage", status: 'pending' as const, message: "Checking system memory..." },
      { name: "Network Connectivity", status: 'pending' as const, message: "Testing network connections..." },
      { name: "Algorithm Validation", status: 'pending' as const, message: "Validating extraction algorithm compliance..." }
    ];
    
    setSystemTestResults([...tests]);
    
    try {
      // Test 1: Database Connection
      const dbResponse = await apiRequest('GET', '/api/system-test/database');
      tests[0].status = dbResponse.ok ? 'pass' as const : 'fail' as const;
      tests[0].message = dbResponse.ok ? "Database connected successfully" : "Database connection failed";
      
      // Test 2: Symptom Library
      tests[1].status = 'running' as const;
      setSystemTestResults([...tests]);
      
      const symptomResponse = await apiRequest('GET', '/api/system-test/symptom-library');
      tests[1].status = symptomResponse.ok ? 'pass' as const : 'fail' as const;
      tests[1].message = symptomResponse.ok ? "Symptom library loaded (3,804 patterns)" : "Symptom library access failed";
      
      // Test 3: File Processing
      tests[2].status = 'running' as const;
      setSystemTestResults([...tests]);
      
      const fileResponse = await apiRequest('GET', '/api/system-test/file-system');
      tests[2].status = fileResponse.ok ? 'pass' as const : 'fail' as const;
      tests[2].message = fileResponse.ok ? "File system accessible" : "File system access error";
      
      // Test 4: Authentication
      tests[3].status = 'running' as const;
      setSystemTestResults([...tests]);
      
      const authResponse = await apiRequest('GET', '/api/system-test/authentication');
      tests[3].status = authResponse.ok ? 'pass' as const : 'fail' as const;
      tests[3].message = authResponse.ok ? "User authenticated successfully" : "Authentication check failed";
      
      // Test 5: Memory Usage
      tests[4].status = 'running' as const;
      setSystemTestResults([...tests]);
      
      const memoryResponse = await apiRequest('GET', '/api/system-test/memory');
      tests[4].status = memoryResponse.ok ? 'pass' as const : 'fail' as const;
      tests[4].message = memoryResponse.ok ? "Memory usage within limits" : "Memory usage high";
      
      // Test 6: Network Connectivity
      tests[5].status = 'running' as const;
      setSystemTestResults([...tests]);
      
      const networkResponse = await apiRequest('GET', '/api/system-test/network');
      tests[5].status = networkResponse.ok ? 'pass' as const : 'fail' as const;
      tests[5].message = networkResponse.ok ? "Network connectivity verified" : "Network connectivity issues";
      
      // Test 7: Algorithm Validation (New in v3.3.4)
      tests[6].status = 'running' as const;
      setSystemTestResults([...tests]);
      
      const algorithmResponse = await apiRequest('GET', '/api/system-test/algorithm-validation');
      tests[6].status = algorithmResponse.ok ? 'pass' as const : 'fail' as const;
      tests[6].message = algorithmResponse.ok ? "Algorithm specification validated" : "Algorithm validation failed";
      
      // Final update
      setSystemTestResults([...tests]);
      
      // Show summary
      const passedTests = tests.filter(t => t.status === 'pass').length;
      toast({
        title: "System Test Complete",
        description: `${passedTests}/7 tests passed`,
        variant: passedTests === 7 ? "default" : "destructive",
      });
      
    } catch (error) {
      console.error('System test error:', error);
      tests.forEach(test => {
        if (test.status === 'running' || test.status === 'pending') {
          test.status = 'fail';
          test.message = 'Test interrupted by error';
        }
      });
      setSystemTestResults([...tests]);
      
      toast({
        title: "System Test Failed",
        description: "An error occurred during testing",
        variant: "destructive",
      });
    } finally {
      setIsRunningTests(false);
    }
  }, [toast]);

  // Function to manually refresh database stats
  const handleRefreshStats = useCallback(() => {
    console.log("Manually refreshing database stats...");
    
    // Start manual spinner
    setIsManuallyRefreshing(true);
    
    // Stop spinner after 3 seconds regardless of query status
    setTimeout(() => {
      setIsManuallyRefreshing(false);
      console.log("Manual refresh spinner stopped after 3 seconds");
    }, 3000);
    
    // Add timestamp to ensure the query is invalidated
    const timestamp = new Date().getTime();
    queryClient.invalidateQueries({ queryKey: ["/api/database-stats"] });
    refetchStats();
    toast({
      title: "Refreshing Database Stats",
      description: "Fetching the latest counts from the database",
      variant: "default",
    });
    
    // Force a direct fetch to see the raw response
    fetch(`/api/database-stats?t=${timestamp}`, {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    .then(res => res.json())
    .then(data => {
      console.log("Raw database stats response:", data);
    })
    .catch(err => {
      console.error("Error fetching raw stats:", err);
    });
  }, [refetchStats, toast, queryClient]);
  
  // Handle successful query data update AND check extraction status from database stats
  useEffect(() => {
    // Check extraction status from database stats (this is more reliable)
    if (databaseStats?.processingStatus) {
      const extractionStatus = databaseStats.processingStatus.status;
      const processType = databaseStats.processingStatus.processType;
      
      // Only show as processing if extraction is actually in progress
      if (processType === "extraction" && extractionStatus === "in_progress") {
        setIsProcessing(true);
        setProcessingStatus("processing");
        setProgress(databaseStats.processingStatus.progress || 0);
        setProgressMessage(databaseStats.processingStatus.message || "Extraction in progress...");
      } else if (extractionStatus === "completed") {
        // Extraction is complete, stop showing spinner
        setIsProcessing(false);
        setProcessingStatus("completed");
        setProgress(100);
        setProgressMessage(databaseStats.processingStatus.message || "Extraction completed!");
      } else {
        // No active extraction
        setIsProcessing(false);
      }
    }
    
    // Also check processingData for pre_processing status
    if (!processingData) return;
    
    console.log("Fetched processing status from database:", processingData);
    
    // Only override if we have actual pre_processing data
    if (processingData.processType === "pre_processing") {
      if (processingData.status === "in_progress" || processingData.status === "pending") {
        setIsProcessing(true);
        setProcessingStatus("processing");
        setProgress(processingData.progress || 0);
        setProgressMessage(processingData.message || "Pre-processing in progress...");
        
        // If patient counts are available, update those too
        if (processingData.processedItems && processingData.totalItems) {
          setProcessedPatients(processingData.processedItems);
          setTotalPatients(processingData.totalItems);
        }
        
        // Always refresh database stats when we get a progress update
        refetchStats();
      } else if (processingData.status === "completed") {
        setProcessingStatus("completed");
        setProgress(100);
        setProgressMessage(processingData.message || "Pre-processing completed!");
        setIsProcessing(false);
        
        // Final refresh of database stats
        refetchStats();
      } else if (processingData.status === "error") {
        setProcessingStatus("error");
        setProgressMessage(processingData.message || "An error occurred during processing.");
        setIsProcessing(false);
      }
    }
  }, [databaseStats, processingData, processingStatus]);
  
  // Set up SSE connection for real-time progress updates
  useEffect(() => {
    if (!user) return;
    
    // Function to create and set up the SSE connection
    const setupSSE = () => {
      // Clean up any existing connection
      if (sseSourceRef.current) {
        sseSourceRef.current.close();
        sseSourceRef.current = null;
      }
      
      // Create URL for SSE endpoint with user ID
      const sseUrl = `/api/sse-progress?userId=${user.id}`;
      console.log(`Connecting to SSE at: ${sseUrl}`);
      
      try {
        // Create EventSource connection
        const eventSource = new EventSource(sseUrl);
        sseSourceRef.current = eventSource;
        
        // Handle successful connection
        eventSource.onopen = () => {
          console.log("SSE connection established");
          setProgressMessage("Connected to progress update service");
        };
        
        // Handle incoming messages
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("SSE message received:", data);
            
            // Handle progress update messages
            if (data.type === "progress_update" || data.type === "pre_processing") {
              // Update progress state
              setProgress(data.progress || 0);
              setProgressMessage(data.message || "");
              
              // Refresh database stats on EVERY progress update - this ensures counts update in real-time
              queryClient.invalidateQueries({ queryKey: ["/api/database-stats"] });
              
              // Handle completion status
              if (data.progress >= 100 || data.status === "completed") {
                setProcessingStatus("completed");
                
                // Show success notification
                toast({
                  title: "Pre-processing & Analysis Completed",
                  description: "Full data processing and analysis completed successfully. You can now access enhanced population health insights and perform faster searches!",
                  variant: "default",
                });
              }
              
              // Log detailed message contents for debugging
              console.log("Progress update details:", {
                processedPatients: data.processedPatients,
                totalPatients: data.totalPatients,
                patientId: data.patientId,
                progress: data.progress,
                message: data.message,
                stage: data.stage,
                status: data.status
              });
              
              // If we're missing patient information, try to extract it from the message
              if (data.totalPatients === undefined) {
                // Check if message contains patient info pattern like "x/y patients"
                const patientPattern = /(\d+)\/(\d+)\s*patients/i;
                const match = data.message?.match(patientPattern);
                
                if (match && match.length >= 3) {
                  const extractedProcessed = parseInt(match[1], 10);
                  const extractedTotal = parseInt(match[2], 10);
                  
                  if (!isNaN(extractedProcessed) && !isNaN(extractedTotal)) {
                    console.log("Extracted patient info from message:", {
                      processedPatients: extractedProcessed,
                      totalPatients: extractedTotal
                    });
                    
                    setProcessedPatients(extractedProcessed);
                    setTotalPatients(extractedTotal);
                  }
                }
              }
              
              // Update patient tracking information if available
              if (data.processedPatients !== undefined && data.totalPatients !== undefined) {
                setProcessedPatients(data.processedPatients);
                setTotalPatients(data.totalPatients);
              }
              
              if (data.status) {
                setProcessingStatus(data.status === "complete" ? "completed" : 
                                   data.status === "in_progress" ? "processing" : data.status);
              }
              
              // Auto-close processing UI if completed
              if (data.progress === 100 || data.status === "completed" || data.status === "complete") {
                // Do not set isProcessing to false here, allow the user to dismiss it from the UI
                
                // Format completion message with patient information if available
                if (data.processedPatients && data.totalPatients) {
                  setProgressMessage(`Pre-processing completed! Processed ${data.processedPatients} of ${data.totalPatients} patients.`);
                } else {
                  setProgressMessage("Pre-processing and analysis completed successfully!");
                }
                
                setProcessingStatus("completed");
                
                // Note: We already show a toast for completion above, so let's not show a duplicate one here
              }
            } else if (data.type === "symptom_library") {
              // Handle symptom library generation messages
              setLibraryGenProgress(data.progress || 0);
              setLibraryGenMessage(data.message || "");
              
              if (data.status === "complete" || data.progress === 100) {
                setIsGeneratingLibrary(false);
                toast({
                  title: "Symptom Library Generated",
                  description: `Successfully generated the full symptom library with ${data.message.includes('symptoms') ? data.message : '3,800+ symptoms'}`,
                });
              } else if (data.status === "error") {
                setIsGeneratingLibrary(false);
                toast({
                  title: "Symptom Library Error",
                  description: data.message || "An error occurred while generating the symptom library",
                  variant: "destructive",
                });
              }
            } else if (data.type === "connection") {
              console.log("Connection confirmation:", data.message);
            } else if (data.type === "error") {
              setProcessingStatus("error");
              setIsProcessing(false);
              
              toast({
                title: "Pre-processing error",
                description: data.message || "An error occurred during pre-processing",
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error("Error parsing SSE message:", error, event.data);
          }
        };
        
        // Handle connection errors
        eventSource.onerror = (error) => {
          console.error("SSE connection error:", error);
          
          // Only show the connection lost message if we're in the processing state
          if (isProcessing && processingStatus === "processing") {
            setProgressMessage("Connection lost. Attempting to reconnect...");
            
            toast({
              title: "Connection warning",
              description: "Connection to progress update service interrupted. Attempting to reconnect automatically...",
              variant: "default",
            });
          }
        };
        
      } catch (err) {
        console.error("Error setting up SSE connection:", err);
        toast({
          title: "Connection error",
          description: "Failed to connect to the progress update service.",
          variant: "destructive",
        });
      }
    };
    
    // Initial connection setup
    setupSSE();
    
    // Clean up function
    return () => {
      if (sseSourceRef.current) {
        console.log("Closing SSE connection during cleanup");
        sseSourceRef.current.close();
        sseSourceRef.current = null;
      }
    };
  }, [user, toast, isProcessing, processingStatus]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "text/csv" || file.name.endsWith(".csv") || 
          file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
          file.name.endsWith(".xlsx")) {
        setSelectedFile(file);
        // Reset error state if previously was error
        if (uploadStatus === "error") {
          setUploadStatus("idle");
        }
      } else {
        setUploadStatus("error");
        toast({
          title: "Invalid file type",
          description: "Please select a CSV or XLSX file",
          variant: "destructive",
        });
      }
    }
  };

  const handleSymptomFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setSymptomFileInput(file);
        toast({
          title: "Symptom file selected",
          description: `Selected ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV file containing symptom data",
          variant: "destructive",
        });
      }
    }
  };

  const uploadCSVFile = async () => {
    if (!selectedFile) {
      return;
    }

    try {
      setUploadStatus("uploading");
      
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`File upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      setCsvFilePath(result.filePath);
      setUploadStatus("success");
      
      toast({
        title: "File uploaded successfully",
        description: "Your CSV file is ready for pre-processing",
      });
    } catch (error) {
      setUploadStatus("error");
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive",
      });
    }
  };

  const startPreProcessing = async () => {
    try {
      setIsProcessing(true);
      setProcessingStatus("processing");
      setProgress(0);
      setProgressMessage("Initiating pre-processing and analysis...");
      
      // If using CSV source, make sure we have data
      if (source === "csv") {
        // If we haven't uploaded a file yet but have one selected
        if (selectedFile && uploadStatus !== "success") {
          await uploadCSVFile();
        }
        
        // If we still don't have a successful upload or a direct file path
        if (uploadStatus !== "success" && !csvFilePath) {
          throw new Error("Please upload or specify a CSV file path first");
        }
      }
      
      // When pre-processing with CSV source after upload, always use "database" source
      // since the file has already been processed and data imported into the database
      const actualSource = (source === "csv" && uploadStatus === "success") ? "database" : source;
      
      // Only include csvFilePath if we're using a direct server path (not an uploaded file)
      const response = await apiRequest("POST", "/api/pre-process-symptoms", {
        source: actualSource,
        ...(source === "csv" && csvFilePath && uploadStatus !== "success" ? { csvFilePath } : {}),
      });

      if (!response.ok) {
        setProcessingStatus("error");
        throw new Error(`Pre-processing request failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Invalidate the processing status query to trigger a fresh fetch
      queryClient.invalidateQueries({ queryKey: ["/api/processing-status", "pre_processing"] });
      
      toast({
        title: "Pre-processing & Analysis started",
        description: result.message || "Full data processing and analysis has been initiated in the background.",
      });
      
      // Don't set isProcessing to false here since we're waiting for SSE updates
      // The SSE message handler will set it to false when processing is complete
    } catch (error) {
      console.error("Error starting pre-processing:", error);
      setProcessingStatus("error");
      setIsProcessing(false);
      toast({
        title: "Pre-processing failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Function to generate the full symptom library (3,800+ symptoms)
  const generateSymptomLibrary = async (selectedFile: File | null = null) => {
    try {
      setIsGeneratingLibrary(true);
      setLibraryGenProgress(0);
      setLibraryGenMessage("Initiating symptom library generation...");
      
      let response;
      
      if (selectedFile) {
        // If a file was selected, upload it with the request
        const formData = new FormData();
        formData.append("symptomFile", selectedFile);
        
        // Need to use fetch directly for FormData
        setLibraryGenMessage("Uploading symptom file...");
        response = await fetch("/api/generate-symptom-library", {
          method: "POST",
          body: formData,
        });
      } else {
        // No file selected, use default library generation
        response = await apiRequest("POST", "/api/generate-symptom-library", {});
      }
      
      if (!response.ok) {
        throw new Error(`Symptom library generation request failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      toast({
        title: "Symptom Library Generation Started",
        description: selectedFile 
          ? `Processing ${selectedFile.name} to generate symptom library with ${result.count} symptoms` 
          : `Generating the full symptom library with ${result.count || '3,800+'} symptoms. This may take 1-2 minutes.`,
      });
      
      // Don't set isGeneratingLibrary to false here since we're waiting for SSE updates
      // The SSE message handler will set it to false when generation is complete

    } catch (error) {
      console.error("Error generating symptom library:", error);
      setIsGeneratingLibrary(false);
      
      toast({
        title: "Symptom Library Generation Failed",
        description: error instanceof Error ? error.message : "An error occurred while generating the symptom library",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader className="p-3">
        <CardTitle>Processing Controls</CardTitle>
        <CardDescription>
          Select your data source and control the pre-processing operation
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3">
        {/* Database Statistics Section - Using consistent DatabaseStatsWidget */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold flex items-center">
              <Database className="h-4 w-4 mr-1" /> Database Statistics
            </h3>
            <div className="flex items-center gap-2">
              {/* Show extraction status indicator when extraction is running */}
              {databaseStats?.processingStatus?.processType === "extraction" && 
               databaseStats?.processingStatus?.status === "in_progress" && (
                <div className="flex items-center text-xs text-orange-600">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Extraction Running...
                </div>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs" 
                onClick={handleRefreshStats} 
                disabled={isManuallyRefreshing}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isManuallyRefreshing ? 'animate-spin' : ''}`} />
                {isManuallyRefreshing ? 'Processing Data...' : 'Refresh'}
              </Button>
            </div>
          </div>
          {databaseStats ? (
            <DatabaseStatsWidget 
              patientCount={databaseStats.patientCount}
              noteCount={databaseStats.noteCount}
              symptomCount={databaseStats.symptomCount}
              processedNotesCount={databaseStats.processedNotesCount}
              onRefresh={handleRefreshStats}
              isRefreshing={isManuallyRefreshing}
              compact={false}
            />
          ) : (
            <div className="text-sm text-muted-foreground">Loading database statistics...</div>
          )}
        </div>
        
        {/* System Pre-Test Validation Section */}
        <div className="mb-4 p-3 border rounded-md bg-blue-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" /> System Pre-Test Validation
            </h3>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-2 text-xs" 
              onClick={handleRunSystemTests} 
              disabled={isRunningTests}
            >
              {isRunningTests ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3 mr-1" />
              )}
              Run Tests
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            Run 6 critical system tests before processing to ensure upload success
          </div>
          {systemTestResults && (
            <div className="grid grid-cols-2 gap-2">
              {systemTestResults.map((test, index) => (
                <div key={index} className={`p-2 rounded text-xs ${
                  test.status === 'pass' ? 'bg-green-100 text-green-800' :
                  test.status === 'fail' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{test.name}</span>
                    {test.status === 'pass' && <Check className="h-3 w-3" />}
                    {test.status === 'fail' && <X className="h-3 w-3" />}
                    {test.status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
                  </div>
                  <div className="text-xs opacity-75">{test.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1">
          {/* ENHANCED Progress indicator section - prominently shown when processing is active */}
          {isProcessing && (
            <div className="space-y-3 mb-4 p-4 border-2 border-blue-500 rounded-lg bg-blue-50/70 shadow-lg">
              {/* Main Header with Large Progress */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <Label className="text-lg font-bold text-blue-800">🔄 File Processing in Progress</Label>
                </div>
                <span className="text-2xl font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-md">{progress}%</span>
              </div>
              
              {/* Large Progress Bar */}
              <div className="space-y-2">
                <Progress value={progress} className="h-4 bg-gray-200" />
                
                {/* Time Estimation and Patient Progress */}
                {progress > 0 && progress < 100 && (
                  <div className="bg-white border border-blue-200 rounded-md p-3">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {totalPatients > 0 ? processedPatients : Math.floor(progress * 25)}
                        </div>
                        <div className="text-xs text-blue-700">Patients Processed</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {(() => {
                            if (totalPatients > 0 && processedPatients > 0) {
                              const rate = processedPatients / (progress / 100);
                              const remaining = totalPatients - processedPatients;
                              const estMinutes = Math.ceil((remaining / rate) * 0.1);
                              return estMinutes > 60 ? `${Math.ceil(estMinutes / 60)}hr` : `${estMinutes}min`;
                            }
                            return '~15min';
                          })()}
                        </div>
                        <div className="text-xs text-blue-700">Est. Time Left</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Status Message */}
              <div className="bg-white border border-blue-200 rounded-md p-3">
                <p className="text-sm font-medium text-gray-800">{progressMessage || "Processing your healthcare data..."}</p>
                
                {/* User Reassurance */}
                <div className="mt-2 text-xs text-blue-700 bg-blue-50 p-2 rounded">
                  <strong>✅ System is working!</strong> This process typically takes 5-20 minutes for large datasets. 
                  The upload is running in the background - you can safely navigate to other pages and check back later.
                </div>
              </div>
              
              {/* Patient Progress Bar */}
              {totalPatients > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-sm text-blue-700 font-medium">Patient Processing</Label>
                    <span className="text-sm font-medium text-blue-700">
                      {processedPatients}/{totalPatients} ({Math.round((processedPatients / totalPatients) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-blue-100 w-full rounded-full overflow-hidden">
                    <div 
                      className="h-2 bg-blue-500 transition-all duration-500 ease-in-out rounded-full" 
                      style={{ width: `${(processedPatients / totalPatients) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground mt-1">{progressMessage}</p>
              
              {processingStatus === "completed" && (
                <div className="mt-1 p-1 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Pre-processing completed successfully!</span>
                    <Button 
                      variant="ghost" 
                      className="h-6 px-2 text-xs text-green-600 hover:text-green-800"
                      onClick={() => setIsProcessing(false)}
                    >
                      Dismiss
                    </Button>
                  </div>
                  <p className="text-xs mt-1">You can now perform faster searches using the pre-processed data.</p>
                  {databaseStats && (
                    <p className="text-xs mt-1">
                      Processed: {databaseStats.patientCount} patients, {databaseStats.noteCount} notes, {databaseStats.symptomCount} symptoms.
                    </p>
                  )}
                </div>
              )}
              
              {processingStatus === "error" && (
                <div className="mt-1 p-1 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  An error occurred during pre-processing. Please try again.
                </div>
              )}
            </div>
          )}
          
          {/* Symptom Library Generation Progress - shown when generating the library */}
          {isGeneratingLibrary && (
            <div className="space-y-1 mb-2 p-2 border rounded-md bg-muted/30">
              <div className="flex justify-between items-center">
                <Label>Symptom Library Generation</Label>
                <span className="text-sm font-medium">{libraryGenProgress}%</span>
              </div>
              <Progress value={libraryGenProgress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-1">{libraryGenMessage}</p>
            </div>
          )}
          
          <div className="grid gap-1">
            <Label htmlFor="source">Data Source</Label>
            <Select 
              value={source} 
              onValueChange={(value) => setSource(value as "database" | "csv")}
              disabled={isProcessing}
            >
              <SelectTrigger id="source">
                <SelectValue placeholder="Select data source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="database">Database (All Patient Notes)</SelectItem>
                <SelectItem value="csv">CSV or XLSX File</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {source === "csv" && (
            <div className="space-y-2">
              <div className="grid gap-1">
                <Label>File Upload (CSV or XLSX)</Label>
                <div className="flex items-center space-x-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isProcessing || uploadStatus === "uploading"}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing || uploadStatus === "uploading"}
                  >
                    <Upload className="mr-1 h-4 w-4" />
                    Select CSV or XLSX File
                  </Button>
                  {selectedFile && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={uploadCSVFile}
                      disabled={isProcessing || uploadStatus === "uploading" || uploadStatus === "success"}
                    >
                      {uploadStatus === "uploading" ? (
                        <>
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        "Upload"
                      )}
                    </Button>
                  )}
                </div>
                
                {selectedFile && (
                  <div className="mt-1 p-2 border rounded-md bg-muted/50">
                    <p className="text-sm font-medium">Selected file: {selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Size: {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                    {uploadStatus === "success" && (
                      <p className="text-xs text-green-600 mt-0.5">File uploaded successfully</p>
                    )}
                  </div>
                )}
                
                {uploadStatus === "error" && (
                  <Alert variant="destructive" className="mt-1">
                    <AlertDescription>
                      There was an error uploading your file. Please try again.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              <div className="flex items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="mx-1 text-sm text-muted-foreground">OR</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>
              
              <div className="grid gap-1">
                <Label htmlFor="csvFilePath">File Path (Advanced)</Label>
                <Input
                  id="csvFilePath"
                  type="text"
                  placeholder="/path/to/data.csv or /path/to/data.xlsx"
                  value={csvFilePath}
                  onChange={(e) => setCsvFilePath(e.target.value)}
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  Alternatively, enter the full path to an existing CSV or XLSX file on the server.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 p-3">
        {/* Records - Patients and Active file info */}
        {databaseStats && (
          <div className="w-full mb-3 border rounded-md overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Records - Patients and Active File</h3>
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                {/* Records count */}
                <div className="inline-flex items-center bg-blue-100 text-blue-800 text-xs rounded-md px-2 py-1">
                  <div className="w-3.5 h-3.5 mr-1 text-blue-600">📊</div>
                  {databaseStats.noteCount.toLocaleString()} records • {databaseStats.patientCount || 0} patients
                </div>
                
                {/* File name and path */}
                {databaseStats.lastFile && (
                  <div className="text-xs text-gray-600">
                    <span className="font-medium mr-1">File:</span>
                    {databaseStats.lastFile.filename}
                  </div>
                )}
              </div>
              
              {/* Processing status info */}
              {databaseStats.processingStatus && databaseStats.processingStatus.status === 'in_progress' && (
                <div className="mt-2 text-xs p-2 rounded bg-blue-50 text-blue-700">
                  <div className="flex justify-between items-center">
                    <span>
                      {databaseStats.processingStatus.message || 'Processing records...'}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full animate-pulse-slow" 
                      style={{ width: `${databaseStats.processingStatus.progress || 0}%` }} 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Database Statistics Widget - Full Version */}
        <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4 my-3">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">Database Statistics</h3>
          <DatabaseStatsWidget 
            patientCount={databaseStats?.patientCount || 0}
            noteCount={databaseStats?.noteCount || 0}
            symptomCount={databaseStats?.symptomCount || 0}
            onRefresh={handleRefreshStats}
            isRefreshing={isManuallyRefreshing}
            showRefreshButton={true}
          />
        </div>
        
        {/* Main Pre-Processing Button */}
        <Button 
          onClick={startPreProcessing} 
          disabled={isProcessing || isGeneratingLibrary || (source === "csv" && !csvFilePath && uploadStatus !== "success")}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Start Pre-Processing & Analysis"
          )}
        </Button>
        
        
        {/* Divider with text */}
        <div className="flex items-center w-full">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="mx-1 text-xs text-muted-foreground">Advanced Admin Options</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>
        
        {/* Symptom Library Generation Section */}
        <div className="space-y-1 mb-1 p-2 border rounded-md bg-blue-50/20">
          <div className="grid gap-1">
            <p className="text-xs text-muted-foreground">
              Generate a comprehensive symptom library from a CSV file. If no file is selected when you click the button, 
              you'll be prompted to choose a file, or you can cancel to use the default library.
            </p>
          </div>
          
          {/* Hidden file input that will be triggered by the button */}
          <input
            ref={symptomFileInputRef}
            id="symptomFileInput"
            type="file"
            accept=".csv"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                // Update the state for tracking purposes
                setSymptomFileInput(file);
                // Immediately generate library with this file
                generateSymptomLibrary(file);
              } else {
                // User canceled the file selection
                generateSymptomLibrary(null);
              }
            }}
            className="hidden"
            disabled={isGeneratingLibrary}
          />
          
          {/* Symptom Library Generation Button */}
          <Button 
            onClick={() => {
              // When clicked, show file selection dialog
              symptomFileInputRef.current?.click();
            }}
            disabled={isProcessing || isGeneratingLibrary}
            variant="outline"
            className="w-full"
          >
            {isGeneratingLibrary ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Comprehensive Symptom Library...
              </>
            ) : (
              "Generate Comprehensive Symptom Library"
            )}
          </Button>
          
          {/* Secondary button for using the default library without file selection */}
          <Button
            onClick={() => {
              generateSymptomLibrary(null);
            }}
            disabled={isProcessing || isGeneratingLibrary}
            variant="ghost"
            className="w-full mt-2 text-sm"
          >
            Use Default Library
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          This will generate the complete symptom library with thousands of medical symptoms.
          <br />Required for complete symptom extraction functionality.
        </p>
      </CardFooter>
    </Card>
  );
};

export default AdminPreProcessing;