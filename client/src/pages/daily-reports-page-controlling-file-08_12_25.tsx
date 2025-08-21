// Daily Reports Page - Controlling File
// Created: August 12, 2025
// Purpose: Customer-facing Daily Patient Reports Service
// Features: Automated batch processing, 4 bubble charts + narrative per patient
// File Format: Same as Validated_Generated_Notes (CSV/Excel with patient_id, patient_name)

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users,
  FileSearch,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'wouter';

interface JobStatus {
  jobId: string;
  status: 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  createdAt: string;
}

interface JobResult {
  jobId: string;
  status: string;
  result: {
    matchSummary: {
      total: number;
      found: number;
      not_found: number;
      multiple_matches: number;
    };
    reportSummary: {
      total: number;
      successful: number;
      no_data: number;
      errors: number;
    };
    reports: Array<{
      patient: {
        patient_id: string;
        patient_name: string;
      };
      status: 'success' | 'no_data' | 'error';
    }>;
  };
}

export default function DailyReportsPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('schedule', file);
      
      const response = await fetch('/api/daily-reports/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('🎯 Upload successful, received data:', data);
      setCurrentJobId(data.jobId);
      console.log('🎯 Set currentJobId to:', data.jobId);
      toast({
        title: "Upload Successful",
        description: "Processing patient reports...",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Job status query
  const { data: jobStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['job-status', currentJobId],
    queryFn: async (): Promise<JobStatus> => {
      if (!currentJobId) throw new Error('No job ID');
      
      console.log(`🔍 Frontend making status request for job: ${currentJobId}`);
      // Add timestamp to prevent caching issues
      const timestamp = Date.now();
      const response = await fetch(`/api/daily-reports/status/${currentJobId}?_t=${timestamp}`, {
        credentials: 'include',
        cache: 'no-cache'
      });
      if (!response.ok) {
        console.error(`❌ Status request failed: ${response.status} ${response.statusText}`);
        throw new Error('Failed to fetch status');
      }
      const result = await response.json();
      console.log(`✅ Frontend received status response:`, result);
      return result;
    },
    enabled: !!currentJobId,
    refetchOnWindowFocus: false, // Disable to prevent cache issues
    refetchOnMount: false,       // Disable to prevent cache issues  
    refetchInterval: (query) => {
      // Stop polling when completed or errored, poll more aggressively
      const status = query.state.data?.status;
      console.log(`🔄 Polling status for job ${currentJobId}: ${status}, progress: ${query.state.data?.progress}`);
      return status === 'processing' ? 1000 : false; // Poll every 1 second instead of 2
    },
  });

  // Job results query (only when completed)
  const { data: jobResults } = useQuery({
    queryKey: ['job-results', currentJobId],
    queryFn: async (): Promise<JobResult> => {
      if (!currentJobId) throw new Error('No job ID');
      
      const response = await fetch(`/api/daily-reports/results/${currentJobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }
      return response.json();
    },
    enabled: !!currentJobId && jobStatus?.status === 'completed',
  });

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCurrentJobId(null); // Reset previous job
    }
  }, []);

  const handleUpload = useCallback(() => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  }, [selectedFile, uploadMutation]);

  const handleDownload = useCallback(async () => {
    if (!currentJobId) return;
    
    try {
      setIsDownloading(true);
      setDownloadProgress(5);

      toast({
        title: "Starting Download",
        description: "Preparing your patient reports file...",
      });

      // Gradual progress updates for better user feedback during long downloads
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev < 15) return prev + 1;
          if (prev < 25) return prev + 0.5;
          if (prev < 35) return prev + 0.3;
          return prev + 0.1; // Very slow increment to avoid hitting 100% too early
        });
      }, 800);

      try {
        const response = await fetch(`/api/daily-reports/download/${currentJobId}`, {
          credentials: 'include'
        });
        
        clearInterval(progressInterval);
        setDownloadProgress(60);
        
        if (!response.ok) {
          throw new Error('Download failed');
        }
        
        setDownloadProgress(75);
        
        const blob = await response.blob();
        
        setDownloadProgress(90);
        
        const url = window.URL.createObjectURL(blob);
        const filename = `daily-patient-reports-${new Date().toISOString().split('T')[0]}.pdf`;
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setDownloadProgress(100);
        
        toast({
          title: "Download Complete",
          description: `File "${filename}" has been saved to your Downloads folder`,
        });

        // Reset after short delay
        setTimeout(() => {
          setIsDownloading(false);
          setDownloadProgress(0);
        }, 2000);
        
      } catch (fetchError) {
        clearInterval(progressInterval);
        throw fetchError;
      }
      
    } catch (error) {
      setIsDownloading(false);
      setDownloadProgress(0);
      toast({
        title: "Download Failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [currentJobId, toast]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - matching Upload page style */}
      <header className="bg-white shadow py-1">
        <div className="max-w-7xl mx-auto px-2 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Behavioral Health AI Solutions</h1>
          <div className="flex items-center gap-2">
            {user && (
              <>
                <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded text-xs border border-green-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">{user.username}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    const response = await fetch('/api/logout', { method: 'POST' });
                    if (response.ok) {
                      window.location.href = "/auth";
                    }
                  }}
                  className="text-xs h-7"
                >
                  Logout
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 py-2">
        <div className="mb-2">
          <h2 className="text-sm">
            <span className="font-bold">Daily Patient Reports</span>
            <span className="text-[10px] font-normal"> - Upload tomorrow's patient schedule to generate comprehensive reports with 4 bubble charts + narrative summary per patient</span>
          </h2>
        </div>
        
        <div className="space-y-2">

          {/* Upload Section */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="h-4 w-4" />
                Upload Patient Schedule
              </CardTitle>
              <CardDescription className="text-sm">
                Upload a CSV or Excel file containing tomorrow's scheduled patients. Requires patient_id and patient_name columns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center max-w-md mx-auto">
            <input
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileText className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-medium">
                    {selectedFile ? selectedFile.name : 'Choose file (CSV or Excel)'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Requires patient_id and patient_name columns
                  </p>
                </label>
          </div>

              {selectedFile && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    size="sm"
                    className="ml-4"
                  >
                    {uploadMutation.isPending ? 'Uploading...' : 'Process Reports'}
                  </Button>
                </div>
              )}
        </CardContent>
      </Card>

      {/* Processing Status */}
      {currentJobId && jobStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Processing Status
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <span>Progress: {jobStatus.progress}%</span>
                  <Progress value={jobStatus.progress} className="w-48" />
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Job ID: {currentJobId}</span>
              <Badge variant={
                jobStatus.status === 'completed' ? 'default' :
                jobStatus.status === 'error' ? 'destructive' : 'secondary'
              }>
                {jobStatus.status}
              </Badge>
            </div>

            {jobStatus.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{jobStatus.error}</AlertDescription>
              </Alert>
            )}

            {jobStatus.status === 'completed' && (
              <div className="space-y-2 mt-2">
                <Button onClick={handleDownload} className="w-full" disabled={isDownloading}>
                  <Download className="h-5 w-5 mr-2" />
                  <span className="text-blue-600 font-bold">
                    {isDownloading ? 'Preparing Download...' : 'Download Patient Reports (PDF)'}
                  </span>
                </Button>
                
                {/* Download Progress Bar */}
                {isDownloading && (
                  <div className="space-y-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-800 font-medium flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" style={{animationDuration: '0.8s'}}></div>
                        Download Progress
                      </span>
                      <span className="text-blue-600">{Math.round(downloadProgress)}%</span>
                    </div>
                    <Progress value={downloadProgress} className="w-full h-2" />
                    <div className="text-xs text-blue-700 flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse flex-shrink-0" style={{animationDuration: '1.2s'}}></div>
                      <span>
                        {downloadProgress < 20 ? 'Initializing download...' :
                         downloadProgress < 40 ? 'Preparing PDF file...' :
                         downloadProgress < 60 ? 'Processing download...' :
                         downloadProgress < 85 ? 'Finalizing transfer...' :
                         downloadProgress < 100 ? 'Completing...' :
                         'Download complete!'}
                      </span>
                    </div>
                    <div className="text-xs text-blue-600">
                      Large files may take 1-2 minutes to prepare.
                    </div>
                  </div>
                )}
                
                <div className="text-sm text-muted-foreground bg-blue-50 p-2 rounded-lg">
                  <p className="font-medium text-blue-800 text-xs">📥 Downloads to folder • daily-patient-reports-{new Date().toISOString().split('T')[0]}.pdf • 4 charts + summary per patient</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results Summary */}
      {jobResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" />
              Report Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Patient Matching Summary */}
            <div>
              <h3 className="font-semibold mb-3">Patient Matching Results</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{jobResults.result.matchSummary.total}</div>
                  <div className="text-sm text-blue-800">Total Patients</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{jobResults.result.matchSummary.found}</div>
                  <div className="text-sm text-green-800">Found</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{jobResults.result.matchSummary.not_found}</div>
                  <div className="text-sm text-red-800">Not Found</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{jobResults.result.matchSummary.multiple_matches}</div>
                  <div className="text-sm text-yellow-800">Multiple Matches</div>
                </div>
              </div>
            </div>

            {/* Report Generation Summary */}
            <div>
              <h3 className="font-semibold mb-3">Report Generation Results</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{jobResults.result.reportSummary.total}</div>
                  <div className="text-sm text-blue-800">Total Reports</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{jobResults.result.reportSummary.successful}</div>
                  <div className="text-sm text-green-800">Successful</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{jobResults.result.reportSummary.no_data}</div>
                  <div className="text-sm text-gray-800">No Data</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{jobResults.result.reportSummary.errors}</div>
                  <div className="text-sm text-red-800">Errors</div>
                </div>
              </div>
            </div>

            {/* Individual Patient Status */}
            <div>
              <h3 className="font-semibold mb-3">Patient Report Status</h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {jobResults.result.reports.map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{report.patient.patient_name}</div>
                      <div className="text-sm text-gray-500">ID: {report.patient.patient_id}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {report.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {report.status === 'no_data' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                      {report.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                      <Badge variant={
                        report.status === 'success' ? 'default' :
                        report.status === 'no_data' ? 'secondary' : 'destructive'
                      }>
                        {report.status === 'success' ? 'Complete' :
                         report.status === 'no_data' ? 'No Data' : 'Error'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">CSV File Format Requirements:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li><strong>patient_id</strong> - Unique patient identifier</li>
              <li><strong>patient_name</strong> - Patient full name</li>
              <li>Additional columns will be preserved in the reports</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Report Contents (per patient):</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>HRSN Indicators bubble chart</li>
              <li>Diagnoses bubble chart</li>
              <li>Diagnostic Categories bubble chart</li>
              <li>Symptoms bubble chart</li>
              <li>Professional narrative summary</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Patient Matching:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Primary match: patient_id + patient_name (exact)</li>
              <li>Secondary match: patient_id only</li>
              <li>Tertiary match: patient_name only</li>
            </ul>
          </div>
        </CardContent>
      </Card>
        </div>
      </main>
    </div>
  );
}