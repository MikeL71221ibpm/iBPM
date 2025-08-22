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
  const [useGridFormat, setUseGridFormat] = useState<boolean>(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('schedule', file);
      formData.append('useGridFormat', useGridFormat.toString());
      
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
          // Ensure progress never exceeds 95% during auto-increment
          if (prev >= 95) return prev;
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
              {/* Summary Format Option */}
              <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="checkbox"
                  id="grid-format-option"
                  checked={useGridFormat}
                  onChange={(e) => setUseGridFormat(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="grid-format-option" className="text-sm text-gray-700 cursor-pointer">
                  <span className="font-medium">Use Grid Format Summary (NEW)</span>
                  <div className="text-xs text-gray-500 mt-1">
                    Displays patient summaries in visual grid layout with collapsible sections instead of linear text
                  </div>
                </label>
              </div>
              
              <div className="flex gap-3 items-start">
                {/* Drop Zone - Left Side */}
                <div className="flex-1">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
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
                </div>

                {/* File Selector & Process Button - Right Side */}
                {selectedFile && (
                  <div className="flex-1">
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
                        className="ml-4 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {uploadMutation.isPending ? 'Uploading...' : 'Process Reports'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Processing Status */}
          {currentJobId && jobStatus && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Processing Status
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Small Progress Bar - Left of text */}
                    <div className="w-[120px]">
                      <div className="w-full bg-gray-300 rounded-full h-3 border border-gray-400">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                          style={{ width: `${Math.min(jobStatus.progress || 0, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <span className="text-sm font-medium">Progress: {Math.min(jobStatus.progress || 0, 100)}%</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Job ID: {currentJobId}</span>
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
                  <div className="space-y-3">
                    <Button onClick={handleDownload} className="w-full" disabled={isDownloading}>
                      <Download className="h-4 w-4 mr-2" />
                      <span className="text-blue-600 font-bold text-xl">
                        {isDownloading ? 'Preparing Download...' : 'Download Patient Reports (PDF)'}
                      </span>
                    </Button>
                    
                    {/* Download Progress */}
                    {isDownloading && (
                      <div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-800 font-medium flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" style={{animationDuration: '0.8s'}}></div>
                            Download Progress
                          </span>
                          <span className="text-blue-600 font-bold text-base">{Math.min(Math.round(downloadProgress), 100)}%</span>
                        </div>
                        
                        {/* Enhanced Progress Bar */}
                        <div className="relative">
                          <div className="w-full bg-blue-100 rounded-full h-3 border border-blue-200">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                              style={{ width: `${Math.min(downloadProgress, 100)}%` }}
                            >
                              {/* Moving shine effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-300 to-transparent animate-pulse opacity-50"></div>
                            </div>
                          </div>
                          {/* Percentage overlay */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-semibold text-blue-800 drop-shadow-sm">
                              {Math.min(Math.round(downloadProgress), 100)}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-sm text-blue-700 flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse flex-shrink-0"></div>
                          <span className="min-w-[100px]">
                            {downloadProgress < 20 ? 'Initializing...' :
                             downloadProgress < 40 ? 'Preparing PDF...' :
                             downloadProgress < 60 ? 'Processing...' :
                             downloadProgress < 85 ? 'Finalizing...' :
                             downloadProgress < 100 ? 'Completing...' :
                             'Complete!'}
                          </span>
                          {/* Inline Progress Bar */}
                          <div className="flex-1 max-w-[200px]">
                            <div className="w-full bg-blue-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${Math.min(downloadProgress, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-blue-600 min-w-[35px] text-right">
                            {Math.min(Math.round(downloadProgress), 100)}%
                          </span>
                        </div>
                      </div>
                    )}
                    
                    <div className="text-sm text-blue-800 bg-blue-50 p-2 rounded text-center">
                      📥 daily-patient-reports-{new Date().toISOString().split('T')[0]}.pdf • 4 charts + summary per patient
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results Summary */}
          {jobResults && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileSearch className="h-4 w-4" />
                  Report Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {/* Matching & Generation Results */}
                <div className="space-y-3">
                  {/* Patient Matching Results Row */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Patient Matching Results</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-blue-50 rounded">
                        <div className="text-xl font-bold text-blue-600">{jobResults.result.matchSummary.total}</div>
                        <div className="text-sm text-blue-800">Total Patients</div>
                      </div>
                      <div className="p-2 bg-green-50 rounded">
                        <div className="text-xl font-bold text-green-600">{jobResults.result.matchSummary.found}</div>
                        <div className="text-sm text-green-800">Found in Database</div>
                      </div>
                      <div className="p-2 bg-red-50 rounded">
                        <div className="text-xl font-bold text-red-600">{jobResults.result.matchSummary.not_found}</div>
                        <div className="text-sm text-red-800">Not Found</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Report Generation Results Row */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Report Generation Results</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-blue-50 rounded">
                        <div className="text-xl font-bold text-blue-600">{jobResults.result.matchSummary.found}</div>
                        <div className="text-sm text-blue-800">Attempted Reports</div>
                      </div>
                      <div className="p-2 bg-green-50 rounded">
                        <div className="text-xl font-bold text-green-600">{jobResults.result.reportSummary.successful}</div>
                        <div className="text-sm text-green-800">Successful Reports</div>
                      </div>
                      <div className="p-2 bg-red-50 rounded">
                        <div className="text-xl font-bold text-red-600">{jobResults.result.reportSummary.errors}</div>
                        <div className="text-sm text-red-800">Report Errors</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Patient Status */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Patient Status</h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {jobResults.result.reports.map((report, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="truncate">
                          <span className="font-medium">{report.patient.patient_name}</span>
                          <span className="text-gray-500 ml-2">({report.patient.patient_id})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {report.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {report.status === 'no_data' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                          {report.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                          <Badge variant={
                            report.status === 'success' ? 'default' :
                            report.status === 'no_data' ? 'secondary' : 'destructive'
                          }>
                            {report.status === 'success' ? 'OK' :
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
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Reference</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-semibold mb-2">File Format</h4>
                  <div className="space-y-1">
                    <div><strong>patient_id</strong> - Unique ID</div>
                    <div><strong>patient_name</strong> - Full name</div>
                    <div>CSV or Excel format</div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-semibold mb-2">Report Contents</h4>
                  <div className="space-y-1">
                    <div>• 4 bubble charts per patient</div>
                    <div>• Professional summary</div>
                    <div>• HRSN + Diagnoses + Categories + Symptoms</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-semibold mb-2">Matching Logic</h4>
                  <div className="space-y-1">
                    <div>1. ID + Name (exact)</div>
                    <div>2. ID only</div>
                    <div>3. Name only</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}