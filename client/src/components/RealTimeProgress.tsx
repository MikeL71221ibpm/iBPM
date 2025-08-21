import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Database, FileText, Users, Activity, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface BackgroundJob {
  id: string;
  fileName: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: {
    processedRecords: number;
    totalRecords: number;
    newPatients: number;
    newNotes: number;
    errors: number;
    rate: number;
    eta: number;
    percentage: number;
  };
  startTime?: string;
  endTime?: string;
  error?: string;
}

interface RealTimeProgressProps {
  userId: number;
}

export default function RealTimeProgress({ userId }: RealTimeProgressProps) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // WebSocket connection for real-time updates
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setIsConnected(true);
      console.log('Connected to progress updates');
      
      // Identify this connection with user ID
      socket.send(JSON.stringify({
        type: 'identify',
        userId: userId
      }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'upload_progress') {
        setJobs(prev => prev.map(job => 
          job.id === data.jobId 
            ? { ...job, progress: { ...data } }
            : job
        ));
      } else if (data.type === 'upload_completed') {
        setJobs(prev => prev.map(job => 
          job.id === data.jobId 
            ? { ...job, status: 'completed', progress: { ...job.progress, percentage: 100 } }
            : job
        ));
      } else if (data.type === 'upload_failed') {
        setJobs(prev => prev.map(job => 
          job.id === data.jobId 
            ? { ...job, status: 'failed', error: data.error }
            : job
        ));
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from progress updates');
    };

    // Fetch initial job list and system status
    fetchJobs();
    fetchSystemStatus();

    // Refresh every 5 seconds
    const interval = setInterval(() => {
      fetchJobs();
      fetchSystemStatus();
    }, 5000);

    return () => {
      socket.close();
      clearInterval(interval);
    };
  }, [userId]);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/user-jobs');
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      // Get real extraction progress from new endpoint
      const extractionResponse = await fetch('/api/extraction-progress');
      const extractionData = await extractionResponse.json();
      
      // Get database stats for context
      const statsResponse = await fetch('/api/database-stats');
      const statsData = await statsResponse.json();
      
      setSystemStatus({
        extraction: extractionData,
        database: statsData,
        activeJobs: extractionData.status === 'in_progress' ? 1 : 0,
        queuedJobs: 0,
        completedJobs: extractionData.status === 'completed' ? 1 : 0,
        failedJobs: extractionData.status === 'failed' ? 1 : 0
      });
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const formatRate = (rate: number) => {
    if (rate > 1000) return `${(rate / 1000).toFixed(1)}k/s`;
    return `${Math.round(rate)}/s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Queued</Badge>;
      case 'processing':
        return <Badge variant="default"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Complete</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* System Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Status
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {systemStatus && (
            <div className="space-y-4">
              {/* Real-time Extraction Progress */}
              {systemStatus.extraction && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-blue-900">Symptom Extraction Progress</h4>
                    <Badge variant={systemStatus.extraction.status === 'in_progress' ? 'default' : 'secondary'}>
                      {systemStatus.extraction.status === 'in_progress' ? 'Processing' : 'Complete'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{systemStatus.extraction.message}</span>
                      <span className="font-semibold">{systemStatus.extraction.progress}%</span>
                    </div>
                    <Progress value={systemStatus.extraction.progress} className="h-3" />
                    
                    {systemStatus.extraction.extractedCount && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{systemStatus.extraction.extractedCount.toLocaleString()} symptoms extracted</span>
                        <span>from {systemStatus.extraction.totalNotes?.toLocaleString() || 0} notes</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Database Stats */}
              {systemStatus.database && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{systemStatus.database.patientCount?.toLocaleString() || 0}</div>
                    <div className="text-sm text-muted-foreground">Patients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{systemStatus.database.noteCount?.toLocaleString() || 0}</div>
                    <div className="text-sm text-muted-foreground">Notes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{systemStatus.database.symptomCount?.toLocaleString() || 0}</div>
                    <div className="text-sm text-muted-foreground">Symptoms</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{systemStatus.database.processedNotesCount?.toLocaleString() || 0}</div>
                    <div className="text-sm text-muted-foreground">Notes Processed</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Jobs */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Upload Jobs</h3>
        
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No upload jobs found</p>
                <p className="text-sm">Upload a file to see real-time progress here</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => (
            <Card key={job.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">
                    <FileText className="w-4 h-4 inline mr-2" />
                    {job.fileName}
                  </CardTitle>
                  {getStatusBadge(job.status)}
                </div>
              </CardHeader>
              <CardContent>
                {job.status === 'processing' && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress: {job.progress.processedRecords.toLocaleString()} / {job.progress.totalRecords.toLocaleString()}</span>
                        <span>{job.progress.percentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={job.progress.percentage} className="h-2" />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span>{job.progress.newPatients.toLocaleString()} patients</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-green-500" />
                        <span>{job.progress.newNotes.toLocaleString()} notes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-purple-500" />
                        <span>{formatRate(job.progress.rate)} records</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <span>ETA: {formatDuration(job.progress.eta)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {job.status === 'completed' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span>{job.progress.newPatients.toLocaleString()} patients</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-500" />
                      <span>{job.progress.newNotes.toLocaleString()} notes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-purple-500" />
                      <span>{job.progress.processedRecords.toLocaleString()} records</span>
                    </div>
                  </div>
                )}
                
                {job.status === 'failed' && job.error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                    <strong>Error:</strong> {job.error}
                  </div>
                )}
                
                {(job.startTime || job.endTime) && (
                  <div className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                    {job.startTime && <div>Started: {new Date(job.startTime).toLocaleString()}</div>}
                    {job.endTime && <div>Ended: {new Date(job.endTime).toLocaleString()}</div>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}