import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UploadResult {
  success: boolean;
  message: string;
  stats?: {
    totalRecords: number;
    hrsnCategories: number;
    fileName: string;
  };
  error?: string;
}

export default function EnhancedHrsnUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
      setProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/upload-enhanced-hrsn', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const result = await response.json();
      setUploadResult(result);

      if (result.success) {
        toast({
          title: "Upload successful",
          description: `Processed ${result.stats?.totalRecords} records with ${result.stats?.hrsnCategories} HRSN categories`,
        });
      } else {
        toast({
          title: "Upload failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        message: 'Upload failed due to network error',
        error: error.message
      });
      toast({
        title: "Upload failed",
        description: "Network error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setProgress(0);
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Enhanced HRSN File Upload
        </CardTitle>
        <CardDescription>
          Upload the Validated_Generated_Notes_5_28_25.csv file with comprehensive HRSN categorical mapping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label 
              htmlFor="file-input" 
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-4 text-gray-500" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">CSV files only</p>
              </div>
              <input 
                id="file-input"
                type="file" 
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden" 
                disabled={uploading}
              />
            </label>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">{selectedFile.name}</span>
                <span className="text-xs text-gray-500">
                  ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetUpload}
                disabled={uploading}
              >
                Remove
              </Button>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading and processing...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="w-full"
          size="lg"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Enhanced HRSN File
            </>
          )}
        </Button>

        {/* Upload Result */}
        {uploadResult && (
          <Alert className={uploadResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <div className="flex items-center gap-2">
              {uploadResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className="font-medium">
                {uploadResult.message}
              </AlertDescription>
            </div>
            {uploadResult.success && uploadResult.stats && (
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <div>📊 Records processed: {uploadResult.stats.totalRecords.toLocaleString()}</div>
                <div>🎯 HRSN categories: {uploadResult.stats.hrsnCategories}</div>
                <div>📁 File: {uploadResult.stats.fileName}</div>
              </div>
            )}
            {!uploadResult.success && uploadResult.error && (
              <div className="mt-2 text-sm text-red-600">
                Error: {uploadResult.error}
              </div>
            )}
          </Alert>
        )}

        {/* HRSN Categories Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Enhanced HRSN Categories (33 Total)</h4>
          <div className="grid grid-cols-2 gap-1 text-xs text-blue-700">
            <div>• Access to health care</div>
            <div>• Clothing</div>
            <div>• Disabilities</div>
            <div>• Education</div>
            <div>• Employment</div>
            <div>• Family and Community Support</div>
            <div>• Finances/Financial Stress</div>
            <div>• Food Insecurity</div>
            <div>• Housing instability</div>
            <div>• Transportation Insecurity</div>
            <div>• Mental Health</div>
            <div>• Safety/General Safety</div>
            <div>• Social connections / isolation</div>
            <div>• Substance Use</div>
            <div>• Veteran status</div>
            <div className="text-blue-600">... and 18 more categories</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}