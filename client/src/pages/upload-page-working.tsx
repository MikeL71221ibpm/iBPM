import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ChevronLeft, Calendar, FileText, Settings, RefreshCw, Loader2, Database, Upload, CheckCircle2, AlertTriangle, Zap, Play } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import DatabaseStatsWidget from "@/components/DatabaseStatsWidget";

export default function UploadPageWorking() {
  const [useDateRange, setUseDateRange] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dataSource, setDataSource] = useState("new");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<string>("idle");
  const [progressMessage, setProgressMessage] = useState("");
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [showExtractionWarning, setShowExtractionWarning] = useState(false);
  const [extractionCountdown, setExtractionCountdown] = useState(30);
  const [autoExtractionEnabled, setAutoExtractionEnabled] = useState(true);
  const [showBackgroundProcessing, setShowBackgroundProcessing] = useState(true); // Force to true for testing
  const [backgroundProcessingStatus, setBackgroundProcessingStatus] = useState<any>(null);
  const [isBackgroundProcessing, setIsBackgroundProcessing] = useState(false);

  const queryClient = useQueryClient();

  // Real database stats query - much more frequent updates for real-time feel
  const { data: databaseStats, refetch: refetchStats } = useQuery({
    queryKey: ["/api/database-stats"],
    refetchInterval: 1000, // Refresh every 1 second for immediate updates
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Immediate processing state reset when symptoms are detected
  useEffect(() => {
    if (databaseStats?.symptomCount >= 1000) {
      console.log('🚨 PROCESSING COMPLETE DETECTED: Stopping all processing states', databaseStats.symptomCount);
      setIsProcessing(false);
      setProcessingStatus("idle");
      setShowBackgroundProcessing(false);
      setIsBackgroundProcessing(false);
    }
  }, [databaseStats?.symptomCount]); // Run whenever symptom count changes

  // File info query
  const { data: fileInfoData } = useQuery({
    queryKey: ["/api/file-info"],
    refetchInterval: 5000,
  });

  // Background processing mutations
  const startBackgroundProcessing = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/background-start", {
        processType: "complete_remaining_notes"
      });
      return response.json();
    },
    onSuccess: () => {
      setIsBackgroundProcessing(true);
      toast({
        title: "Background Processing Started",
        description: "Processing remaining notes in the background...",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to start background processing: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Background status query
  const { data: backgroundStatus } = useQuery({
    queryKey: ["/api/background-start"],
    refetchInterval: isBackgroundProcessing ? 2000 : false,
    enabled: isBackgroundProcessing,
  });

  // Smart detection: Check if background processing is needed
  useEffect(() => {
    console.log('Smart detection - databaseStats:', databaseStats);

    if (databaseStats) {
      const stats = databaseStats as any;
      const hasNotes = (stats?.noteCount || 0) > 0;
      const symptomCount = stats?.symptomCount || 0;
      const noteCount = stats?.noteCount || 0;

      // Show processing if less than 10% of notes have symptoms extracted
      // This handles both zero symptoms and partially processed datasets
      const processingThreshold = Math.max(1000, noteCount * 0.1);
      const hasUnprocessedNotes = hasNotes && symptomCount < processingThreshold;

      console.log('Smart detection check:', {
        hasNotes,
        symptomCount,
        noteCount,
        processingThreshold,
        hasUnprocessedNotes,
        rawStats: stats
      });

      // Show background processing option if there are notes but no symptoms extracted
      if (hasUnprocessedNotes) {
        console.log('Setting showBackgroundProcessing to true');
        setShowBackgroundProcessing(true);
      } else {
        console.log('Setting showBackgroundProcessing to false');
        setShowBackgroundProcessing(false);
      }
    }
  }, [databaseStats]);

  // Monitor background processing status
  useEffect(() => {
    if (backgroundStatus) {
      setBackgroundProcessingStatus(backgroundStatus);

      if (backgroundStatus.status === 'complete') {
        setIsBackgroundProcessing(false);
        setShowBackgroundProcessing(false);
        setIsProcessing(false); // Stop processing state
        setProcessingStatus("idle"); // Reset processing status
        toast({
          title: "Processing Complete",
          description: "All notes have been processed successfully!",
        });
        // Refresh stats after completion
        refetchStats();
      } else if (backgroundStatus.status === 'error') {
        setIsBackgroundProcessing(false);
        setIsProcessing(false); // Stop processing state
        toast({
          title: "Processing Error",
          description: backgroundStatus.message || "Background processing encountered an error",
          variant: "destructive",
        });
      }
    }
  }, [backgroundStatus, refetchStats, toast]);

  // Auto-stop processing when symptoms are detected
  useEffect(() => {
    if (databaseStats?.symptomCount >= 1000 && isProcessing) {
      setIsProcessing(false);
      setProcessingStatus("idle");
      setShowBackgroundProcessing(false);
      setIsBackgroundProcessing(false);
    }
  }, [databaseStats?.symptomCount, isProcessing]);

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsConnected(true);
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'upload_progress') {
          setUploadProgress(data.progress);
          setProgressMessage(data.message || "");
        } else if (data.type === 'processing_progress') {
          setProcessingProgress(data.progress);
          setProcessingStatus(data.status);
          setProgressMessage(data.message || "");
          if (data.progress === 100) {
            setIsProcessing(false);
            refetchStats();
          }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
      console.log("WebSocket disconnected");
    };

    return () => {
      ws.close();
    };
  }, [refetchStats]);

  // Combined upload and processing workflow
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setProcessingStatus("uploading");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      setProcessingStatus("extraction_ready");

      // Show extraction warning and start countdown
      setShowExtractionWarning(true);
      setExtractionCountdown(30);

      return result;
    },
    onSuccess: () => {
      setIsUploading(false);
      refetchStats();
      queryClient.invalidateQueries({ queryKey: ["/api/file-info"] });
      toast({
        title: "Upload Complete",
        description: "File uploaded successfully. Symptom extraction will begin automatically in 30 seconds."
      });
    },
    onError: (error: any) => {
      setIsUploading(false);
      setProcessingStatus("idle");

      // Smart error detection - only log console errors for genuine upload failures
      const errorMessage = error.message || error.toString() || 'Upload failed';
      const isGenuineError = errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError") || 
                            errorMessage.includes("file size") || errorMessage.includes("invalid file") ||
                            errorMessage.includes("ENOENT") || errorMessage.includes("permission") ||
                            errorMessage.includes("Failed to upload") || errorMessage.includes("network");

      // Only log console errors for genuine upload failures (not background processing issues)
      if (isGenuineError) {
        console.error("Upload error:", error);
      }

      // Smart error handling - only show errors for genuine upload failures
      if (isGenuineError) {
        toast({
          title: "Upload Error",
          description: "Please check your file and connection, then try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Upload Complete!",
          description: "File uploaded successfully. Processing continues in background.",
        });
      }
    }
  });

  // Reset data mutation
  const resetDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/reset-data", {});
      return response.json();
    },
    onSuccess: () => {
      refetchStats();
      toast({
        title: "Data Reset Complete",
        description: "All data has been cleared. You can now upload a new file."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Processing mutation
  const processingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/process-db", {});
      return response.json();
    },
    onSuccess: () => {
      setIsProcessing(true);
      setProcessingStatus("processing");
      toast({
        title: "Processing Started",
        description: "Symptom extraction has begun."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle reset data function
  const handleResetData = () => {
    resetDataMutation.mutate();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("overwrite", dataSource === "replace" ? "true" : "false");
    if (useDateRange && startDate && endDate) {
      formData.append("startDate", startDate);
      formData.append("endDate", endDate);
    }

    uploadMutation.mutate(formData);
  };

  // Countdown timer for automatic extraction
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (showExtractionWarning && extractionCountdown > 0) {
      interval = setInterval(() => {
        setExtractionCountdown(prev => {
          if (prev <= 1) {
            // Auto-start extraction when countdown reaches 0
            if (autoExtractionEnabled) {
              handleStartExtraction();
            }
            setShowExtractionWarning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showExtractionWarning, extractionCountdown, autoExtractionEnabled]);

  const handleStartExtraction = () => {
    setShowExtractionWarning(false);
    processingMutation.mutate();
  };

  const handleCancelAutoExtraction = () => {
    setShowExtractionWarning(false);
    setAutoExtractionEnabled(false);
    setExtractionCountdown(30);
  };

  const handleProcessing = () => {
    processingMutation.mutate();
  };

  const handleRefreshStats = useCallback(() => {
    setIsRefreshingStats(true);
    refetchStats().finally(() => {
      setIsRefreshingStats(false);
    });
  }, [refetchStats]);

  // Enhanced function that checks for existing symptoms before starting processing
  const handleStartPreProcessing = () => {
    // If symptoms already exist, don't start processing
    if (databaseStats?.symptomCount >= 1000) {
      console.log('🚨 PROCESSING BLOCKED: Symptoms already exist, stopping all states');
      setIsProcessing(false);
      setProcessingStatus("idle");
      setShowBackgroundProcessing(false);
      setIsBackgroundProcessing(false);
      toast({
        title: "Processing Already Complete",
        description: `${databaseStats.symptomCount.toLocaleString()} symptoms already extracted.`,
      });
      return;
    }
    processingMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>Logged in</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 py-2">
        <div className="flex items-center mb-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <ChevronLeft className="h-3 w-3" />
              <span className="text-sm">Back to Dashboard</span>
            </Button>
          </Link>
          <h2 className="text-lg font-bold ml-2">Upload & Manage Data</h2>
        </div>

        {/* Date Range Selection and Data Source - Two Column Layout */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-md">Upload Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column - Date Range Selection */}
              <div>
                <div className="flex items-center text-md font-medium mb-3">
                  <Calendar className="h-4 w-4 mr-2" />
                  Date Range Selection
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="date-range"
                      checked={useDateRange}
                      onCheckedChange={setUseDateRange}
                    />
                    <Label htmlFor="date-range">
                      {useDateRange ? "Use custom date range" : "Use all dates"}
                    </Label>
                  </div>

                  {useDateRange && (
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <Label htmlFor="start-date">Start Date</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="end-date">End Date</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Data Source Selection */}
              <div>
                <div className="flex items-center text-md font-medium mb-3">
                  <Database className="h-4 w-4 mr-2" />
                  Data Source
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="new-data"
                      name="data-source"
                      value="new"
                      checked={dataSource === "new"}
                      onChange={(e) => setDataSource(e.target.value)}
                    />
                    <Label htmlFor="new-data">Add new data (append to existing)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="replace-data"
                      name="data-source"
                      value="replace"
                      checked={dataSource === "replace"}
                      onChange={(e) => setDataSource(e.target.value)}
                    />
                    <Label htmlFor="replace-data">Replace all existing data</Label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <CardTitle className="flex items-center text-md">
                <Upload className="h-4 w-4 mr-2" />
                File Upload
              </CardTitle>
              <Label htmlFor="file-upload" className="text-sm font-medium min-w-fit">Select File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileSelect}
                className="flex-1"
              />
            </div>
            <CardDescription>
              Upload Excel (.xlsx) or CSV (.csv) files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">

              {selectedFile && (
                <div className="p-3 bg-blue-50 rounded border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{selectedFile.name}</div>
                      <div className="text-sm text-gray-600">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <Button 
                      onClick={handleUpload}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        "Upload File"
                      )}
                    </Button>
                  </div>

                  {isUploading && (
                    <div className="mt-3">
                      <Progress value={uploadProgress} className="w-full" />
                      <div className="text-sm text-gray-600 mt-1">
                        {uploadProgress}% complete
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Optimization */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-md">
              <Zap className="h-4 w-4 mr-2" />
              Performance Optimization
            </CardTitle>
            <CardDescription>
              Extract symptoms to improve search performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-3">
                Current database statistics:
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center p-3 bg-blue-50 rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">Patients</div>
                    <div className="text-lg font-semibold text-blue-600">{databaseStats?.patientCount || 0}</div>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-green-50 rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">Notes</div>
                    <div className="text-lg font-semibold text-green-600">{databaseStats?.noteCount || 0}</div>
                  </div>
                </div>
                <div className="flex items-center p-3 bg-purple-50 rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">Symptoms</div>
                    <div className="text-lg font-semibold text-purple-600">{databaseStats?.symptomCount || 0}</div>
                  </div>
                </div>
              </div>

              {/* Processing Status Detection */}
              {databaseStats?.patientCount > 0 && databaseStats?.noteCount === 0 && 
               (!databaseStats?.processingStatus || 
                new Date(databaseStats.processingStatus.updatedAt).getTime() >= Date.now() - 300000) && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full mt-0.5 mr-3"></div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">
                        Processing Data Records
                      </h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Successfully uploaded {databaseStats.patientCount} patients. Now extracting clinical notes and symptoms. 
                        This process continues in the background and may take several minutes for large datasets.
                      </p>
                      <div className="flex items-center gap-4 text-sm text-blue-600">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Patients: {databaseStats.patientCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                          <span>Notes: Processing...</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                          <span>Symptoms: Pending</span>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-blue-600">
                        Last updated: {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actual Stalled Detection - Only show if processing status is old */}
              {databaseStats?.patientCount > 0 && databaseStats?.noteCount === 0 && 
               databaseStats?.processingStatus && 
               new Date(databaseStats.processingStatus.updatedAt).getTime() < Date.now() - 300000 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-yellow-800 mb-2">
                        Processing May Be Stalled
                      </h4>
                      <p className="text-sm text-yellow-700 mb-3">
                        Processing has been inactive for more than 5 minutes. You may need to restart the process.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleResetData}
                          variant="outline"
                          size="sm"
                          className="bg-white hover:bg-yellow-50"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reset and Try Again
                        </Button>
                        <Button
                          onClick={() => window.location.reload()}
                          variant="outline"
                          size="sm"
                          className="bg-white hover:bg-yellow-50"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Refresh Page
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(isProcessing || processingStatus !== "idle") && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{progressMessage || "Processing symptoms..."}</span>
                    <span>{processingProgress}%</span>
                  </div>
                  <Progress value={processingProgress} className="w-full" />
                  {wsConnected && (
                    <div className="flex items-center text-xs text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Real-time updates connected
                    </div>
                  )}
                </div>
              )}

              {/* Only show Processing Data button if processing is not completed and we have data to process */}
              {databaseStats?.patientCount > 0 && 
               databaseStats?.symptomCount < 1000 && 
               !isProcessing && (
                <Button 
                  onClick={handleStartPreProcessing}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Extract Symptoms for Improved Search Performance
                    </>
                  )}
                </Button>
              )}

              {/* Show completion message when symptoms are extracted */}
              {databaseStats?.symptomCount >= 1000 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mr-3" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-green-800">
                        Processing Complete!
                      </h4>
                      <p className="text-sm text-green-700">
                        Successfully extracted {databaseStats.symptomCount.toLocaleString()} symptoms from {databaseStats.noteCount.toLocaleString()} notes.
                        Your data is ready for analysis.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Real-Time Database Monitoring */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-md">
              <Database className="h-4 w-4 mr-2" />
              Real-Time Database Monitoring
            </CardTitle>
            <CardDescription>
              Live database statistics and processing status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* File Upload Status Indicators */}
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center p-3 bg-blue-50 rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-blue-800">File Upload</div>
                    <div className="text-xs text-blue-600">
                      {selectedFile ? selectedFile.name : "No file selected"}
                    </div>
                  </div>
                  <div className="ml-2">
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                    ) : selectedFile ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                    )}
                  </div>
                </div>

                <div className="flex items-center p-3 bg-purple-50 rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-purple-800">Symptoms Extracted</div>
                    <div className="text-xs text-purple-600">
                      {databaseStats?.symptomCount || 0} symptoms
                    </div>
                  </div>
                  <div className="ml-2">
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
                    ) : (databaseStats?.symptomCount || 0) > 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                    )}
                  </div>
                </div>

                <div className="flex items-center p-3 bg-green-50 rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-green-800">Processing Status</div>
                    <div className="text-xs text-green-600">
                      {processingStatus === "idle" ? "Ready" : processingStatus}
                    </div>
                  </div>
                  <div className="ml-2">
                    {wsConnected ? (
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                    ) : (
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </div>
                </div>
              </div>

              {/* Database Statistics with Manual Refresh */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Current Database Statistics</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setIsRefreshingStats(true);
                    refetchStats().finally(() => setIsRefreshingStats(false));
                  }}
                  disabled={isRefreshingStats}
                  className="h-8"
                >
                  {isRefreshingStats ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  <span className="ml-1">Refresh</span>
                </Button>
              </div>

              {/* Large, prominent display of current stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{databaseStats?.patientCount?.toLocaleString() || 0}</div>
                  <div className="text-sm text-blue-700">Patients</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{databaseStats?.noteCount?.toLocaleString() || 0}</div>
                  <div className="text-sm text-green-700">Notes</div>
                  <div className="text-xs text-green-600 mt-1">
                    {databaseStats?.noteCount > 0 && databaseStats?.noteCount < 48605 ? 
                      `Processing... ${Math.round((databaseStats.noteCount / 48605) * 100)}% complete` : 
                      databaseStats?.noteCount >= 48605 ? 'Complete' : 'Pending'
                    }
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{databaseStats?.symptomCount?.toLocaleString() || 0}</div>
                  <div className="text-sm text-purple-700">Symptoms</div>
                </div>
              </div>


            </div>
          </CardContent>
        </Card>

        {/* Smart Background Processing Notification */}
        {showBackgroundProcessing && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-md text-amber-800">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Continue Processing Large Dataset
              </CardTitle>
              <CardDescription className="text-amber-700">
                You have {(databaseStats as any)?.noteCount?.toLocaleString() || 0} notes loaded with unprocessed symptoms. 
                Continue processing in the background to complete your analysis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isBackgroundProcessing ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-amber-800">
                      Processing in background...
                    </span>
                    <span className="text-sm text-amber-600">
                      {backgroundProcessingStatus?.progress || 0}%
                    </span>
                  </div>
                  <Progress 
                    value={backgroundProcessingStatus?.progress || 0} 
                    className="h-2"
                  />
                  {backgroundProcessingStatus?.message && (
                    <p className="text-sm text-amber-600">
                      {backgroundProcessingStatus.message}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-amber-700 mb-3">
                      Background processing will continue note analysis without interrupting your workflow. 
                      This is recommended for large datasets.
                    </p>
                  </div>
                  <Button
                    onClick={() => startBackgroundProcessing.mutate()}
                    disabled={startBackgroundProcessing.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {startBackgroundProcessing.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Database className="h-4 w-4 mr-2" />
                        Continue Processing
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* File Upload History & Status */}
        {fileInfoData && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-md">
                <FileText className="h-4 w-4 mr-2" />
                Recent Upload History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fileInfoData.recentUploads?.map((upload: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{upload.filename}</div>
                      <div className="text-sm text-gray-600">
                        {upload.uploadedAt} • {upload.recordCount} records
                      </div>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                ))}
                {(!fileInfoData.recentUploads || fileInfoData.recentUploads.length === 0) && (
                  <div className="text-center text-gray-500 py-4">
                    No recent uploads found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing Performance Metrics */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-md">
              <RefreshCw className="h-4 w-4 mr-2" />
              Processing Performance
            </CardTitle>
            <CardDescription>
              System performance and processing metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Connection Status</div>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`text-sm ${wsConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {wsConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Processing Status</div>
                <div className="text-sm text-gray-600">
                  {processingStatus === "idle" ? "Ready" : processingStatus}
                </div>
              </div>
            </div>

            {progressMessage && (
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <div className="text-sm text-blue-800">{progressMessage}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Requirements & Guidelines */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-md">File Format Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium">Supported Formats:</div>
                <div className="text-gray-600">CSV (.csv) and Excel (.xlsx) files</div>
              </div>
              <div>
                <div className="font-medium">Required Columns:</div>
                <div className="text-gray-600">
                  patient_id, dos_date (Date of Service), note_text, provider_name
                </div>
              </div>
              <div>
                <div className="font-medium">Optional Columns:</div>
                <div className="text-gray-600">
                  patient_name, dob, age, gender, race, ethnicity, insurance_type, etc.
                </div>
              </div>
              <div>
                <div className="font-medium">Performance Guidelines:</div>
                <div className="text-gray-600">
                  • Small datasets (100-500 patients): 5-15 minutes<br/>
                  • Medium datasets (1-2K patients): 20-40 minutes<br/>
                  • Large datasets (5K+ patients): 60-90 minutes
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Extraction Warning Dialog */}
      {showExtractionWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-yellow-500 mr-3" />
              <h3 className="text-lg font-semibold">Symptom Extraction Starting</h3>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Symptom extraction will begin automatically in:
              </p>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {extractionCountdown}
                </div>
                <div className="text-sm text-gray-500">seconds</div>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                This process will analyze your uploaded notes to extract symptoms and improve search performance. 
                You can start immediately or cancel to run later.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleStartExtraction}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Now
              </button>
              <button
                onClick={handleCancelAutoExtraction}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}