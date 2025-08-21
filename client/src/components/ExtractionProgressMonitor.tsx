import React, { useEffect, useState, useRef } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Activity, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface ExtractionProgress {
  processed: number;
  total: number;
  symptoms: number;
  currentBatch: number;
  totalBatches: number;
  message: string;
  status: 'starting' | 'processing' | 'completed' | 'error';
  estimatedTimeRemaining: number;
  processingRate: number;
}

interface ExtractionProgressMonitorProps {
  userId: number;
  isActive: boolean;
  onComplete?: () => void;
}

export default function ExtractionProgressMonitor({ 
  userId, 
  isActive, 
  onComplete 
}: ExtractionProgressMonitorProps) {
  const [progress, setProgress] = useState<ExtractionProgress>({
    processed: 0,
    total: 0,
    symptoms: 0,
    currentBatch: 0,
    totalBatches: 0,
    message: 'Initializing extraction...',
    status: 'starting',
    estimatedTimeRemaining: 0,
    processingRate: 0
  });

  const [startTime] = useState(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch current extraction progress
  const fetchProgress = async () => {
    try {
      const response = await fetch('/api/extraction-progress', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = data.processed > 0 ? data.processed / elapsed : 0;
        const remaining = data.total > 0 && rate > 0 ? (data.total - data.processed) / rate : 0;
        
        setProgress({
          processed: data.processed || 0,
          total: data.total || 0,
          symptoms: data.symptoms || 0,
          currentBatch: data.currentBatch || 0,
          totalBatches: data.totalBatches || 0,
          message: data.message || 'Processing...',
          status: data.status || 'processing',
          estimatedTimeRemaining: remaining,
          processingRate: rate
        });

        // Check if extraction is complete
        if (data.status === 'completed' && onComplete) {
          onComplete();
        }
      }
    } catch (error) {
      console.error('Error fetching extraction progress:', error);
    }
  };

  // Start/stop monitoring based on isActive
  useEffect(() => {
    if (isActive) {
      fetchProgress(); // Initial fetch
      intervalRef.current = setInterval(fetchProgress, 2000); // Update every 2 seconds
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatRate = (rate: number) => {
    return `${Math.round(rate * 60)} notes/min`;
  };

  const progressPercentage = progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;

  if (!isActive) return null;

  return (
    <Card className="w-full max-w-2xl mx-auto mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          Symptom Extraction Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Processing Notes</span>
            <span>{progress.processed.toLocaleString()} / {progress.total.toLocaleString()}</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <div className="text-center text-sm text-muted-foreground">
            {progressPercentage.toFixed(1)}% Complete
          </div>
        </div>

        {/* Status and Message */}
        <div className="flex items-center gap-2">
          {progress.status === 'processing' && <Clock className="h-4 w-4 text-blue-600 animate-spin" />}
          {progress.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
          {progress.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
          <span className="text-sm">{progress.message}</span>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {progress.symptoms.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Symptoms Extracted</div>
          </div>
          
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {progress.currentBatch} / {progress.totalBatches}
            </div>
            <div className="text-sm text-muted-foreground">Batches</div>
          </div>
        </div>

        {/* Performance Metrics */}
        {progress.processingRate > 0 && (
          <div className="flex justify-between text-sm bg-blue-50 p-3 rounded-lg">
            <div>
              <span className="font-medium">Processing Rate:</span> {formatRate(progress.processingRate)}
            </div>
            {progress.estimatedTimeRemaining > 0 && (
              <div>
                <span className="font-medium">Time Remaining:</span> {formatTime(progress.estimatedTimeRemaining)}
              </div>
            )}
          </div>
        )}

        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge 
            variant={
              progress.status === 'completed' ? 'default' : 
              progress.status === 'error' ? 'destructive' : 
              'secondary'
            }
            className="px-3 py-1"
          >
            {progress.status === 'starting' && 'Initializing...'}
            {progress.status === 'processing' && 'Extracting Symptoms...'}
            {progress.status === 'completed' && 'Extraction Complete!'}
            {progress.status === 'error' && 'Extraction Error'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}