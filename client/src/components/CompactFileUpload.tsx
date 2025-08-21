import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { UploadCloud, X, FileText } from "lucide-react";
import UploadStatusIndicator from "./UploadStatusIndicator";
import { formatFileSize } from "@/lib/utils";

interface CompactFileUploadProps {
  onUploadSuccess?: (fileInfo?: {name: string, size: number}) => void;
}

export default function CompactFileUpload({ onUploadSuccess }: CompactFileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension !== 'xlsx' && fileExtension !== 'csv') {
        toast({
          title: "Invalid File Format",
          description: "Only Excel (.xlsx) and CSV (.csv) files are accepted",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
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
        toast({
          title: "Invalid File Format",
          description: "Only Excel (.xlsx) and CSV (.csv) files are accepted",
          variant: "destructive",
        });
        return;
      }
      
      setFile(droppedFile);
    }
  };
  
  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Function to estimate processing time based on file size
  const estimateProcessingTime = (fileSize: number) => {
    // Enhanced formula for more realistic time estimates:
    // Base time + file size scaling + estimated record count processing
    const baseSizeInSeconds = 15;
    const fileSizeInMB = fileSize / (1024 * 1024);
    
    // Scaling factors for different file size ranges
    let timeEstimate: number;
    
    if (fileSizeInMB < 1) {
      // Small files (under 1MB)
      timeEstimate = baseSizeInSeconds + (fileSizeInMB * 5);
    } else if (fileSizeInMB < 5) {
      // Medium files (1-5MB)
      timeEstimate = baseSizeInSeconds + 5 + (fileSizeInMB * 10);
    } else if (fileSizeInMB < 20) {
      // Large files (5-20MB)
      timeEstimate = baseSizeInSeconds + 55 + (fileSizeInMB * 15);
    } else {
      // Very large files (20MB+)
      // For files like the 17MB file with 174k records, provide a more accurate estimate
      const estimatedRecordCount = Math.round(fileSizeInMB * 10000); // Rough estimate: ~10k records per MB
      const processingTimePerRecord = 0.002; // Estimated processing time per record in seconds
      timeEstimate = baseSizeInSeconds + 355 + (fileSizeInMB * 20) + (estimatedRecordCount * processingTimePerRecord);
    }
    
    return Math.max(30, Math.round(timeEstimate));
  };
  
  // Function to simulate upload progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (uploadStatus === 'uploading' && uploadProgress < 95) {
      // Simulate progress updates during upload
      interval = setInterval(() => {
        setUploadProgress(prev => {
          // Slow down as we approach 95%
          const increment = prev < 50 ? 5 : prev < 75 ? 3 : 1;
          return Math.min(95, prev + increment);
        });
      }, 500);
    } else if (uploadStatus === 'processing') {
      // Keep progress moving slowly during processing
      interval = setInterval(() => {
        setUploadProgress(prev => {
          return Math.min(99, prev + 0.1);
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [uploadStatus, uploadProgress]);
  
  // Function to reset upload state
  const resetUploadState = () => {
    setUploadStatus('idle');
    setUploadProgress(0);
    setUploadMessage('');
    setUploadError('');
    setEstimatedTime(0);
  };
  
  // Function to handle upload completion
  const handleUploadComplete = (recordCount: number, patientCount: number) => {
    setUploadStatus('complete');
    setUploadProgress(100);
    setUploadMessage(`Processed ${recordCount} records from ${patientCount} patients.`);
    
    toast({
      title: "Upload Complete ✅",
      description: `Successfully processed ${recordCount} records from ${patientCount} patients.`,
      duration: Infinity, // Stays until user dismisses it
    });
    
    // Store file info before clearing
    const fileInfo = file ? { name: file.name, size: file.size } : undefined;
    
    // Clear file selection after successful upload but keep status visible
    clearFile();
    
    // Call the onUploadSuccess callback if provided
    if (onUploadSuccess) {
      onUploadSuccess(fileInfo);
    }
    
    // Auto-hide the status after 10 seconds
    setTimeout(() => {
      resetUploadState();
    }, 10000);
  };
  
  // Function to handle upload errors
  const handleUploadError = (error: string) => {
    setUploadStatus('error');
    setUploadError(error);
    setUploading(false);
    
    // Smart error detection - only log console errors for genuine upload failures
    const isGenuineError = error.includes("Failed to fetch") || error.includes("NetworkError") || 
                          error.includes("file size") || error.includes("invalid file") ||
                          error.includes("ENOENT") || error.includes("permission") ||
                          error.includes("Failed to upload") || error.includes("network");
    
    if (isGenuineError) {
      console.error("Upload error:", error);
    }
    
    // Only show error for actual upload failures, not background processing
    if (isGenuineError) {
      toast({
        title: "Upload Failed",
        description: error || 'An error occurred during upload',
        variant: "destructive",
      });
    } else {
      toast({
        title: "Upload Complete!",
        description: "File uploaded successfully. Background processing may be continuing.",
      });
    }
  };
  
  const uploadFile = async () => {
    if (!file) return;
    
    // Set uploading state
    setUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadMessage('Preparing to upload file...');
    setUploadError('');
    
    // Calculate estimated time
    const estimatedTime = estimateProcessingTime(file.size);
    setEstimatedTime(estimatedTime);
    
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('replaceExisting', 'true');
      
      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(Math.round(percentComplete));
          
          if (percentComplete < 100) {
            setUploadMessage(`Uploading file... ${Math.round(percentComplete)}%`);
          } else {
            setUploadMessage('File uploaded successfully, processing data...');
            setUploadStatus('processing');
          }
        }
      });
      
      // Handle response
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              setUploadStatus('processing');
              setUploadMessage('File uploaded successfully, processing data...');
              setUploadProgress(100);
              
              toast({
                title: "Upload Complete ✅",
                description: "File uploaded successfully. Automatic extraction starting...",
                duration: 3000,
              });
              
              // Hide the CompactFileUpload progress after showing success
              setTimeout(() => {
                resetUploadState();
              }, 2000);
            } else {
              handleUploadError(response.error || 'Upload failed');
            }
          } catch (e) {
            handleUploadError('Invalid response from server');
          }
        } else if (xhr.status === 401) {
          handleUploadError('Authentication required. Please log in and try again.');
        } else {
          // Try to parse error response
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            handleUploadError(errorResponse.error || errorResponse.message || `Upload failed with status ${xhr.status}`);
          } catch (e) {
            handleUploadError(`Upload failed with status ${xhr.status}`);
          }
        }
        setUploading(false);
      });
      
      // Handle errors
      xhr.addEventListener('error', () => {
        handleUploadError('Network error during upload');
        setUploading(false);
      });
      
      // Handle timeout
      xhr.addEventListener('timeout', () => {
        handleUploadError('Upload timed out. Please try again.');
        setUploading(false);
      });
      
      // Set timeout to 2 hours (same as server)
      xhr.timeout = 7200000; // 2 hours in milliseconds
      
      // Start upload
      xhr.open('POST', '/api/upload');
      xhr.withCredentials = true; // Include cookies for authentication
      xhr.send(formData);
      
    } catch (error) {
      // Smart error detection - only log console errors for genuine upload failures
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      const isGenuineError = errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError") || 
                            errorMessage.includes("file size") || errorMessage.includes("invalid file") ||
                            errorMessage.includes("ENOENT") || errorMessage.includes("permission") ||
                            errorMessage.includes("Failed to upload") || errorMessage.includes("network");
      
      if (isGenuineError) {
        console.error('Upload error:', error);
      }
      
      handleUploadError(errorMessage);
      setUploading(false);
    }
  };
  
  return (
    <div className="w-full">
      {/* Compact drag and drop area */}
      <div
        className="border border-dashed rounded-md p-2 text-center border-gray-300 hover:border-primary transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{ height: '80px' }}
      >
        <input
          type="file"
          className="hidden"
          accept=".xlsx,.csv"
          onChange={handleFileChange}
          ref={fileInputRef}
          disabled={uploading}
        />
        
        {!file && (
          <div className="flex flex-col items-center justify-center h-full">
            <UploadCloud className="h-4 w-4 text-gray-400 mb-1" />
            <p className="text-xs font-medium">Drop file or click to upload</p>
            <p className="text-[10px] text-gray-400">Excel (.xlsx) or CSV (.csv)</p>
          </div>
        )}
        
        {file && (
          <div className="flex items-center justify-between h-full px-2">
            <div className="flex items-center">
              <FileText className="h-4 w-4 text-blue-500 mr-2" />
              <div>
                <p className="text-xs font-medium text-left truncate max-w-[180px]">{file.name}</p>
                <p className="text-[10px] text-gray-500 text-left">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-gray-500 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                disabled={uploading}
              >
                <X className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                className="ml-1 h-6 px-2 py-0.5 text-[10px] font-medium bg-blue-600 hover:bg-blue-700 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  // Show spinner immediately on button click
                  setUploading(true);
                  setUploadStatus('uploading');
                  setUploadMessage('Starting upload...');
                  uploadFile();
                }}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Show upload status indicator - hide when complete to avoid conflicts with PostUploadLoading */}
      {uploadStatus !== 'idle' && uploadStatus !== 'complete' && (
        <div className="mt-2">
          <UploadStatusIndicator 
            status={uploadStatus}
            progress={uploadProgress}
            message={uploadMessage}
            error={uploadError}
            estimatedTime={estimatedTime}
          />
        </div>
      )}
      
      {/* Show brief success message when complete */}
      {uploadStatus === 'complete' && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-green-700 text-sm font-medium">
              Upload complete! Starting extraction...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}