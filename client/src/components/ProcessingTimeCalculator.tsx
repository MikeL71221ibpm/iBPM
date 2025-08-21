import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Info, Clock, Database, FileText } from 'lucide-react';

export interface ProcessingTimeEstimate {
  uploadTime: number;
  initialProcessingTime: number;
  databaseInsertionTime: number;
  preProcessingTime: number;
  totalTime: number;
}

export default function ProcessingTimeCalculator() {
  const [fileSizeMB, setFileSizeMB] = useState<number>(10);
  const [recordCount, setRecordCount] = useState<number>(10000);
  const [avgNoteLength, setAvgNoteLength] = useState<number>(1000);
  const [uniquePatients, setUniquePatients] = useState<number>(0);
  const [networkSpeedMbps, setNetworkSpeedMbps] = useState<number>(50);
  const [estimate, setEstimate] = useState<ProcessingTimeEstimate | null>(null);
  
  // Set default uniquePatients to 10% of recordCount
  useEffect(() => {
    if (recordCount > 0 && uniquePatients === 0) {
      setUniquePatients(Math.round(recordCount * 0.1));
    }
  }, [recordCount, uniquePatients]);

  const calculateEstimate = () => {
    // Constants derived from observed processing speeds
    const BASE_UPLOAD_TIME = 5; // seconds
    const BASE_PROCESSING_TIME = 10; // seconds
    const BASE_DB_TIME = 15; // seconds
    const BASE_NLP_TIME = 20; // seconds
    
    const FILE_SIZE_FACTOR = 0.2; // seconds per MB
    const RECORD_PROCESSING_FACTOR = 0.005; // seconds per record
    const DB_FACTOR = 0.004; // seconds per record
    const NLP_PATIENT_FACTOR = 0.5; // seconds per unique patient
    const NLP_RECORD_FACTOR = 0.003; // seconds per record
    const NOTE_LENGTH_FACTOR = 0.0001; // seconds per character per record
    
    // Calculate upload time based on file size and network speed
    const uploadTimeSec = BASE_UPLOAD_TIME + (fileSizeMB * 8 / networkSpeedMbps);
    
    // Calculate initial processing time
    const initialProcessingTimeSec = BASE_PROCESSING_TIME + 
      (recordCount * RECORD_PROCESSING_FACTOR);
    
    // Calculate database insertion time
    const dbInsertionTimeSec = BASE_DB_TIME + 
      (recordCount * DB_FACTOR) + 
      (recordCount * avgNoteLength * NOTE_LENGTH_FACTOR * 0.3);
    
    // Calculate pre-processing time (NLP analysis)
    const preProcessingTimeSec = BASE_NLP_TIME + 
      (uniquePatients * NLP_PATIENT_FACTOR) + 
      (recordCount * NLP_RECORD_FACTOR) + 
      (recordCount * avgNoteLength * NOTE_LENGTH_FACTOR * 0.7);
    
    // Calculate total time
    const totalTimeSec = uploadTimeSec + initialProcessingTimeSec + 
      dbInsertionTimeSec + preProcessingTimeSec;
    
    setEstimate({
      uploadTime: Math.round(uploadTimeSec),
      initialProcessingTime: Math.round(initialProcessingTimeSec),
      databaseInsertionTime: Math.round(dbInsertionTimeSec),
      preProcessingTime: Math.round(preProcessingTimeSec),
      totalTime: Math.round(totalTimeSec)
    });
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Processing Time Calculator</CardTitle>
        <CardDescription>
          Estimate how long your data upload and processing will take
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fileSize">File Size (MB)</Label>
              <Input
                id="fileSize"
                type="number"
                min="1"
                value={fileSizeMB}
                onChange={(e) => setFileSizeMB(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="networkSpeed">Network Speed (Mbps)</Label>
              <Input
                id="networkSpeed"
                type="number"
                min="1"
                value={networkSpeedMbps}
                onChange={(e) => setNetworkSpeedMbps(Number(e.target.value))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recordCount">Record Count</Label>
              <Input
                id="recordCount"
                type="number"
                min="1"
                value={recordCount}
                onChange={(e) => setRecordCount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uniquePatients">Unique Patients</Label>
              <Input
                id="uniquePatients"
                type="number"
                min="1"
                value={uniquePatients}
                onChange={(e) => setUniquePatients(Number(e.target.value))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="avgNoteLength">Average Note Length (characters)</Label>
            <Input
              id="avgNoteLength"
              type="number"
              min="1"
              value={avgNoteLength}
              onChange={(e) => setAvgNoteLength(Number(e.target.value))}
            />
          </div>
          
          <Button onClick={calculateEstimate} className="mt-4">Calculate Estimate</Button>
        </div>
        
        {estimate && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-medium">Estimated Processing Time</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-blue-500" />
                    <span>Upload Time:</span>
                  </div>
                  <span>{formatTime(estimate.uploadTime)}</span>
                </div>
                <Progress value={(estimate.uploadTime / estimate.totalTime) * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-green-500" />
                    <span>Initial Processing:</span>
                  </div>
                  <span>{formatTime(estimate.initialProcessingTime)}</span>
                </div>
                <Progress value={(estimate.initialProcessingTime / estimate.totalTime) * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <Database className="w-4 h-4 mr-2 text-amber-500" />
                    <span>Database Insertion:</span>
                  </div>
                  <span>{formatTime(estimate.databaseInsertionTime)}</span>
                </div>
                <Progress value={(estimate.databaseInsertionTime / estimate.totalTime) * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <Info className="w-4 h-4 mr-2 text-purple-500" />
                    <span>Pre-Processing (NLP):</span>
                  </div>
                  <span>{formatTime(estimate.preProcessingTime)}</span>
                </div>
                <Progress value={(estimate.preProcessingTime / estimate.totalTime) * 100} className="h-2" />
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between font-medium">
                  <span>Total Estimated Time:</span>
                  <span className="text-lg">{formatTime(estimate.totalTime)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-sm text-gray-500">
        <p>
          These estimates are based on current system performance and may vary.
          The formula will be refined as we gather more data from actual processing times.
        </p>
      </CardFooter>
    </Card>
  );
}