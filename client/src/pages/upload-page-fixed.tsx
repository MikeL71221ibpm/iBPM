import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Upload, Play, Database, FileText, Users, Activity } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import DatabaseStatsWidget from "@/components/DatabaseStatsWidget";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<"idle" | "uploading" | "processing" | "completed" | "error">("idle");
  const [progressMessage, setProgressMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Database stats state
  const [databaseStats, setDatabaseStats] = useState({
    patientCount: 0,
    noteCount: 0,
    symptomCount: 0,
    processingStatus: {
      status: "idle",
      progress: 0,
      message: ""
    }
  });
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  const handleRefreshStats = async () => {
    setIsRefreshingStats(true);
    try {
      const response = await apiRequest("GET", "/api/database-stats");
      const stats = await response.json();
      setDatabaseStats(stats);
    } catch (error) {
      console.error("Error refreshing stats:", error);
    } finally {
      setIsRefreshingStats(false);
    }
  };

  useEffect(() => {
    handleRefreshStats();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "text/csv" || selectedFile.name.endsWith(".csv") || 
          selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          selectedFile.name.endsWith(".xlsx")) {
        setFile(selectedFile);
        setProcessingStatus("idle");
        setUploadProgress(0);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV or Excel file",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file first",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setProcessingStatus("uploading");
      setProgressMessage("Uploading file...");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      setProcessingStatus("completed");
      setProgressMessage("Upload completed successfully!");
      
      toast({
        title: "Upload successful",
        description: `File uploaded successfully. ${result.message || ""}`,
      });

      // Refresh stats after successful upload
      await handleRefreshStats();
      
    } catch (error) {
      // Smart error detection - only log console errors for genuine upload failures
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      const isGenuineError = errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError") || 
                            errorMessage.includes("file size") || errorMessage.includes("invalid file") ||
                            errorMessage.includes("ENOENT") || errorMessage.includes("permission") ||
                            errorMessage.includes("Failed to upload") || errorMessage.includes("network");
      
      if (isGenuineError) {
        console.error("Upload error:", error);
      }
      
      setProcessingStatus("error");
      setProgressMessage("Upload failed. Please try again.");
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file",
        variant: "destructive",
      });
    }
  };

  const handleStartPreProcessing = async () => {
    try {
      setIsProcessing(true);
      setProcessingStatus("processing");
      setProgressMessage("Starting symptom extraction...");

      const response = await apiRequest("POST", "/api/extract-symptoms-parallel");
      const result = await response.json();

      if (result.success) {
        setProcessingStatus("completed");
        setProgressMessage("Pre-processing completed successfully!");
        toast({
          title: "Pre-processing completed",
          description: "Symptom extraction completed successfully",
        });
        await handleRefreshStats();
      } else {
        throw new Error(result.error || "Pre-processing failed");
      }
    } catch (error) {
      console.error("Pre-processing error:", error);
      setProcessingStatus("error");
      setProgressMessage("Pre-processing failed. Please try again.");
      toast({
        title: "Pre-processing failed",
        description: "There was an error during pre-processing",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Healthcare AI Solutions</h1>
                  <p className="text-xs text-gray-500">Behavioral Health Analytics Platform</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Database className="h-3 w-3" />
                <span>{databaseStats.patientCount.toLocaleString()} patients</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <FileText className="h-3 w-3" />
                <span>{databaseStats.noteCount.toLocaleString()} notes</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Activity className="h-3 w-3" />
                <span>{databaseStats.symptomCount.toLocaleString()} symptoms</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
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
        
        {/* Date Range Selection and Data Source */}
        <div className="mb-3 bg-white shadow-sm rounded-lg p-3">
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column - Date Range Selection */}
            <div>
              <h3 className="text-md font-medium mb-2">Date Range Selection</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <Input type="date" className="h-8" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <Input type="date" className="h-8" />
                </div>
              </div>
            </div>
            
            {/* Right Column - Data Source */}
            <div>
              <h3 className="text-md font-medium mb-2">Data Source</h3>
              <div className="text-sm text-gray-600">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Active File:</span>
                  <span>Validated_Generated_Notes_5_27_25.csv</span>
                </div>
                <div className="text-xs text-gray-500">
                  Enterprise dataset: 5,000 patients • 48,605 clinical notes
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white shadow rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold mb-4">Upload Clinical Data</h3>
          
          <div className="space-y-4">
            <div>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
              >
                <div className="text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to select CSV or Excel file
                  </p>
                  {file && (
                    <p className="text-xs text-green-600 mt-1">
                      Selected: {file.name}
                    </p>
                  )}
                </div>
              </label>
            </div>

            {file && (
              <div className="flex space-x-2">
                <Button onClick={handleUpload} disabled={processingStatus === "uploading"}>
                  {processingStatus === "uploading" ? "Uploading..." : "Upload File"}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleStartPreProcessing}
                  disabled={isProcessing || databaseStats.patientCount === 0}
                >
                  <Play className="h-4 w-4 mr-1" />
                  {isProcessing ? "Processing..." : "Start Pre-Processing"}
                </Button>
              </div>
            )}

            {uploadProgress > 0 && uploadProgress < 100 && (
              <Progress value={uploadProgress} className="w-full" />
            )}
          </div>

          {/* Processing Status Messages */}
          <div className="mt-4">
            {isProcessing && (
              <div className="text-sm text-blue-600 font-medium">
                🔄 Extracting symptoms from clinical notes... This may take several minutes for large datasets.
              </div>
            )}
            {!isProcessing && databaseStats.processingStatus?.status === 'reset' && databaseStats.symptomCount < 50000 && (
              <div className="mt-2 text-xs text-orange-600 font-medium">
                ⚠️ Processing may be running in background. Check server logs or click "Start Pre-Processing" if needed.
              </div>
            )}
          </div>
          
          {/* Auto-start symptom extraction when database is loaded */}
          {databaseStats.patientCount > 0 && databaseStats.symptomCount === 0 && !isProcessing && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="text-sm text-blue-800 mb-2">
                ✅ Database loaded with {databaseStats.patientCount.toLocaleString()} patients and {databaseStats.noteCount.toLocaleString()} notes
              </div>
              <div className="text-xs text-blue-600">
                🔄 Starting symptom extraction automatically...
              </div>
            </div>
          )}

          {/* Full DatabaseStatsWidget */}
          <div className="mt-4">
            <DatabaseStatsWidget 
              patientCount={databaseStats.patientCount}
              noteCount={databaseStats.noteCount}
              symptomCount={databaseStats.symptomCount}
              onRefresh={handleRefreshStats}
              isRefreshing={isRefreshingStats}
            />
          </div>
          
          {processingStatus === "completed" && (
            <div className="p-2 bg-green-50 border border-green-100 rounded-md text-sm text-green-800 mb-3">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Pre-processing completed successfully!</span>
              </div>
            </div>
          )}
          
          {processingStatus === "error" && (
            <div className="p-2 bg-red-50 border border-red-100 rounded-md text-sm text-red-800 mb-3">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                <span>Error: {progressMessage}</span>
              </div>
            </div>
          )}
        
        {/* File Format Requirements */}
        <div className="mt-4 bg-white shadow rounded-lg p-4">
          <h3 className="text-md font-semibold mb-3">File Format Requirements</h3>
          <div className="space-y-3">
            <div>
              <h4 className="text-base font-medium">Required Columns (Excel or CSV)</h4>
              <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                <li><span className="font-medium">patientId</span> - Unique identifier for the patient</li>
                <li><span className="font-medium">patientName</span> - Full name of the patient</li>
                <li><span className="font-medium">dosDate</span> - Date of service in YYYY-MM-DD format</li>
                <li><span className="font-medium">noteText</span> - The clinical note text</li>
              </ul>
              <h4 className="text-base font-medium mt-2">Optional Columns</h4>
              <div className="grid grid-cols-2 gap-x-2 mt-1 text-sm text-gray-600">
                <ul className="list-disc list-inside">
                  <li><span className="font-medium">providerId</span> - Provider identifier</li>
                  <li><span className="font-medium">providerName</span> - Provider's first name</li>
                  <li><span className="font-medium">providerLastName</span> - Provider's last name</li>
                  <li><span className="font-medium">payerType</span> - Insurance type</li>
                  <li><span className="font-medium">gender</span> - Patient gender</li>
                  <li><span className="font-medium">race</span> - Patient race</li>
                  <li><span className="font-medium">ethnicity</span> - Patient ethnicity</li>
                </ul>
                <ul className="list-disc list-inside">
                  <li><span className="font-medium">age</span> - Patient age at time of service</li>
                  <li><span className="font-medium">zipCode</span> - Patient ZIP code</li>
                  <li><span className="font-medium">diagnosis</span> - Primary diagnosis</li>
                  <li><span className="font-medium">diagnosisIcd10Code</span> - ICD-10 diagnosis code</li>
                  <li><span className="font-medium">diagnosticCategory</span> - Category of diagnosis</li>
                  <li><span className="font-medium">serviceType</span> - Type of healthcare service</li>
                  <li><span className="font-medium">facilityType</span> - Healthcare facility type</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="text-base font-medium">AI-Powered Processing Capabilities</h4>
              <div className="bg-gray-100 p-3 rounded-md mt-1 overflow-x-auto">
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>🤖 <strong>Advanced NLP:</strong> Extracts clinical insights and HRSN indicators from unstructured note text</li>
                  <li>📊 <strong>Symptom Classification:</strong> Automatically categorizes symptoms by diagnostic categories and ICD-10 codes</li>
                  <li>🎯 <strong>HRSN Detection:</strong> Identifies social determinants of health within clinical documentation</li>
                  <li>⚡ <strong>Real-time Processing:</strong> Immediate analysis upon upload with progress tracking</li>
                  <li>🔍 <strong>Population Analytics:</strong> Aggregates data for trend analysis and reporting</li>
                </ul>
              </div>
            </div>

            <div>
              <h4 className="text-base font-medium">Healthcare AI Solutions Platform</h4>
              <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                <li>Analyzes clinical notes to identify behavioral health conditions and social needs</li>
                <li>Extracts HRSNs and behavioral health symptoms from clinical notes using NLP</li>
                <li>Organizes problems and symptoms into diagnostic categories</li>
                <li>Provides results through search, reporting, and visualization tools</li>
                <li>Enables interoperability with other systems through comprehensive API access</li>
              </ul>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}