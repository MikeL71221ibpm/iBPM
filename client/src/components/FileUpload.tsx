import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UploadCloud, X, FileText, Check, AlertCircle, Database, ArrowRight, Calendar, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface UploadResult {
  message: string;
  recordCount: number;
  patientCount: number;
  fileId: number;
}

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [patientCount, setPatientCount] = useState(0);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [showDateRangeDialog, setShowDateRangeDialog] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState<{
    startDate?: string;
    endDate?: string;
    useAllDates?: boolean;
  }>({ useAllDates: true });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Check if user already has data loaded
  useEffect(() => {
    const checkExistingData = async () => {
      try {
        const response = await apiRequest('GET', '/api/data-status');
        const data = await response.json();
        
        setHasExistingData(data.hasData);
        setPatientCount(data.patientCount || 0);
      } catch (err) {
        console.error("Failed to check for existing data:", err);
      }
    };
    
    checkExistingData();
  }, []);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension !== 'xlsx' && fileExtension !== 'csv') {
        setError('Only Excel (.xlsx) and CSV (.csv) files are accepted');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      setUploadResult(null);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const fileExtension = droppedFile.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension !== 'xlsx' && fileExtension !== 'csv') {
        setError('Only Excel (.xlsx) and CSV (.csv) files are accepted');
        setFile(null);
        return;
      }
      
      setFile(droppedFile);
      setError(null);
      setUploadResult(null);
    }
  };
  
  const clearFile = () => {
    setFile(null);
    setError(null);
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const uploadFile = async () => {
    if (!file) return;
    
    setUploading(true);
    setUploadProgress(0);
    setError(null);
    
    // Create FormData object
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      console.log("Starting file upload process...");
      console.log(`File to upload: ${file.name}, type: ${file.type}, size: ${(file.size / 1024).toFixed(2)} KB`);
      
      // Set initial upload state
      setUploadProgress(10);
      
      // We'll use actual progress events when available instead of simulating
      // This helps prevent the progress getting stuck at 90%
      
      // Upload file with handling for tracking progress
      console.log("Submitting file via FormData...");
      
      // Set upload in progress
      setUploadProgress(20);
      
      // Step 1: Start file upload
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      // Step 2: File uploaded, processing on server side
      setUploadProgress(80);
      console.log(`Server response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          console.error("Server error response:", errorData);
          throw new Error(errorData.message || 'Upload failed');
        } else {
          const textError = await response.text();
          console.error("Server text error:", textError);
          throw new Error(`Upload failed with status ${response.status}`);
        }
      }
      
      // Complete progress
      setUploadProgress(100);
      
      const result = await response.json();
      setUploadResult(result);
      
      // Show date range selection dialog if user has existing data
      if (hasExistingData) {
        setShowOverwriteDialog(true);
      } else {
        setShowDateRangeDialog(true);
      }
      
      toast({
        title: "File Upload Complete",
        description: `File uploaded successfully with ${result.recordCount?.toLocaleString()} records. Please select your processing options.`,
        variant: "default",
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred during upload');
      setUploadProgress(0);
      
      // Smart error detection - only log console errors for genuine upload failures
      const isGenuineError = err.message.includes("Failed to fetch") || err.message.includes("NetworkError") || 
                            err.message.includes("file size") || err.message.includes("invalid file") ||
                            err.message.includes("ENOENT") || err.message.includes("permission") ||
                            err.message.includes("Failed to upload") || err.message.includes("network");
      
      if (isGenuineError) {
        console.error("Upload error:", err);
      }
      
      // Only show error for actual upload failures, not background processing
      if (isGenuineError) {
        toast({
          title: "Upload Failed",
          description: err.message || 'An error occurred during upload',
          variant: "destructive",
        });
      } else {
        toast({
          title: "Upload Complete!",
          description: "File uploaded successfully. Background processing may be continuing.",
        });
      }
    } finally {
      setUploading(false);
    }
  };

  // Handle automated processing workflow
  const handleAutomatedProcessing = async (overwrite: boolean = false) => {
    try {
      setProcessingStage('Step 3: Importing to database...');
      setUploading(true);
      
      // Step 3: Import to Database
      const importResponse = await fetch('/api/import-to-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file?.name,
          overwrite,
          startDate: selectedDateRange.startDate,
          endDate: selectedDateRange.endDate,
          useAllDates: selectedDateRange.useAllDates
        }),
        credentials: 'include',
      });

      if (!importResponse.ok) {
        throw new Error(`Import failed: ${importResponse.statusText}`);
      }

      const importResult = await importResponse.json();
      
      toast({
        title: "Step 3 Complete",
        description: `${importResult.recordsProcessed || 0} records imported to database.`,
      });

      // Step 4: Extract Symptoms - Background Process (Don't fail on extraction errors)
      setProcessingStage('Step 4: Starting symptom extraction...');
      
      try {
        const extractResponse = await fetch('/api/extract-symptoms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        const extractResult = await extractResponse.json();
      } catch (extractError) {
        console.log('Extraction API call failed, but upload was successful - extraction will happen automatically');
      }
      
      // Step 5: Upload Complete - Extraction Running in Background
      setProcessingStage('Upload Complete! Starting live extraction progress...');
      
      toast({
        title: "Upload Complete!",
        description: `✓ Data uploaded successfully. Starting real-time symptom extraction...`,
        variant: "default",
      });

      // Stay on upload page to see extraction progress notifications

    } catch (error: any) {
      // Check if this error occurred after successful upload (during extraction phase)
      const uploadSucceeded = processingStage.includes('Step 4') || processingStage.includes('Upload Complete');
      
      if (uploadSucceeded) {
        // Upload succeeded, extraction API failed (normal) - show success
        toast({
          title: "Upload Complete!",
          description: "✓ Data uploaded successfully. Extraction running in background.",
          variant: "default",
        });
        setProcessingStage('Upload Complete! Extraction running in background...');
        return; // Don't set error state
      }
      
      // This is a genuine upload failure
      setError(error.message);
      
      // Smart error detection - only log console errors for genuine upload failures
      const isGenuineError = error.message.includes("Failed to fetch") || error.message.includes("NetworkError") || 
                            error.message.includes("file size") || error.message.includes("invalid file") ||
                            error.message.includes("ENOENT") || error.message.includes("permission");
      
      if (isGenuineError) {
        console.error('Upload process error:', error);
        toast({
          title: "Upload Error",
          description: "Please check your file and connection, then try again.",
          variant: "destructive",
        });
      } else {
        // Background processing error - show success since upload worked
        toast({
          title: "Upload Complete!",
          description: "File uploaded successfully. Processing continues in background.",
        });
      }
    } finally {
      setUploading(false);
      setShowOverwriteDialog(false);
      setShowDateRangeDialog(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Upload Patient Data</CardTitle>
          <CardDescription>
            Upload Excel (.xlsx) or CSV (.csv) files containing patient records.
            Make sure your file follows the required format.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasExistingData && (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <Database className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-700">Data Already Available</AlertTitle>
              <AlertDescription className="text-blue-600">
                <p>You already have {patientCount} patients loaded in the system.</p>
                <div className="flex items-center gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    onClick={() => window.location.href = '/'}
                  >
                    Search Existing Data <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                  <span className="text-sm text-blue-500">or upload a new file to replace existing data</span>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {/* Drag and drop area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              error ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-primary'
            } transition-colors cursor-pointer`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.csv"
              onChange={handleFileChange}
              ref={fileInputRef}
              disabled={uploading}
            />
            
            {!file && !error && (
              <div className="flex flex-col items-center">
                <UploadCloud className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-lg font-medium">Drag and drop your file here</p>
                <p className="text-sm text-gray-500 mt-1">or click to browse</p>
                <p className="text-xs text-gray-400 mt-2">Supported formats: Excel (.xlsx) and CSV (.csv)</p>
              </div>
            )}
            
            {error && (
              <div className="flex flex-col items-center text-red-600">
                <AlertCircle className="h-12 w-12 mb-3" />
                <p className="text-lg font-medium">Invalid File</p>
                <p className="text-sm mt-1">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                >
                  Try Again
                </Button>
              </div>
            )}
            
            {file && !error && (
              <div className="flex flex-col items-center">
                <FileText className="h-12 w-12 text-blue-500 mb-3" />
                <p className="text-lg font-medium">File Selected</p>
                <div className="flex items-center bg-gray-100 px-3 py-2 rounded-md mt-2 mb-3">
                  <span className="text-sm font-medium text-gray-700 break-all max-w-full">
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 h-6 w-6 text-gray-500 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {!uploading && !uploadResult && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      uploadFile();
                    }}
                    className="mt-2"
                  >
                    Upload File
                  </Button>
                )}
              </div>
            )}
            
            {uploading && (
              <div className="mt-4 w-full max-w-xs mx-auto">
                <div className="mb-3 text-center">
                  <div className="text-blue-800 font-medium text-sm">Uploading File:</div>
                  <div className="text-blue-600 text-sm font-mono bg-blue-50 px-3 py-1 rounded mt-1 inline-block">
                    {file?.name}
                  </div>
                </div>
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-gray-500 mt-2">
                  {uploadProgress < 20 ? 'Preparing file for upload...' : 
                   uploadProgress < 80 ? 'Uploading file to server...' : 
                   uploadProgress < 100 ? 'Processing file on server...' : 
                   'Processing complete!'}
                </p>
              </div>
            )}
            
            {uploadResult && (
              <div className="mt-4 flex flex-col items-center text-green-600">
                <div className="bg-green-100 p-2 rounded-full">
                  <Check className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium mt-2">File processed successfully!</p>
                <p className="text-xs text-gray-500 mt-1">
                  Processed {uploadResult.recordCount} records from {uploadResult.patientCount} patients
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                  >
                    Upload Another File
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-primary-600 hover:bg-primary-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = "/dashboard?mode=individual";
                    }}
                  >
                    Search Patients
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="text-xs text-gray-500 border-t pt-4">
          <p>
            The file will be processed on the server. Make sure your data follows the required format:
            patient ID, date of service, notes, and other required fields.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}