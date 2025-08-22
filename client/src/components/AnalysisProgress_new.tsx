import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface AnalysisProgressProps {
  isAnalyzing: boolean;
  onComplete?: () => void;
  onProgressUpdate?: (progress: number, message: string) => void;
}

export function AnalysisProgress({ isAnalyzing, onComplete, onProgressUpdate }: AnalysisProgressProps) {
  const { user } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Initializing analysis...");
  const [status, setStatus] = useState<'idle' | 'started' | 'in_progress' | 'complete' | 'error'>('idle');
  
  // Query for any ongoing extraction process from the database
  const { data: processingStatus } = useQuery({
    queryKey: ["/api/processing-status", "extract_symptoms", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const response = await fetch(`/api/processing-status/extract_symptoms`);
      if (!response.ok) {
        throw new Error("Failed to fetch processing status");
      }
      return response.json();
    },
    enabled: !!user && isAnalyzing, // Only run when user is authenticated and analysis is active
    refetchInterval: isAnalyzing ? 10000 : false // Refresh every 10 seconds while analyzing (optimized)
  });
  
  // Update UI based on database status
  useEffect(() => {
    if (!processingStatus || !isAnalyzing) return;
    
    console.log("AnalysisProgress: Fetched status from database:", processingStatus);
    
    // Map server status to component status
    const statusMap: Record<string, any> = {
      'in_progress': 'in_progress',
      'complete': 'complete',
      'error': 'error'
    };
    
    if (processingStatus.status && statusMap[processingStatus.status]) {
      setStatus(statusMap[processingStatus.status]);
      
      if (processingStatus.progress !== undefined) {
        setProgress(processingStatus.progress);
        
        // Notify parent about progress update
        if (onProgressUpdate) {
          onProgressUpdate(processingStatus.progress, processingStatus.message || message);
        }
      }
      
      if (processingStatus.message) {
        setMessage(processingStatus.message);
      }
      
      // If complete, notify parent
      if (processingStatus.status === 'complete' && onComplete) {
        setProgress(100);
        setTimeout(() => {
          onComplete();
        }, 1000);
      }
    }
  }, [processingStatus, isAnalyzing, onComplete, onProgressUpdate, message]);

  // Connect to SSE when analysis starts
  useEffect(() => {
    // Track when we last received a real progress update
    const progressData = {
      fakeProgress: 15,
      lastProgressTime: Date.now(),
      serverProgressCounter: 0
    };
    
    // Always log analysis state changes for debugging
    console.log(`✅ AnalysisProgress: isAnalyzing=${isAnalyzing}, user=${!!user}, userId=${user?.id}`);
    
    if (!isAnalyzing || !user?.id) {
      // Reset progress when analysis stops
      if (!isAnalyzing && status === 'complete') {
        setStatus('idle');
        setProgress(0);
        setMessage("Analysis complete");
        if (onComplete) onComplete();
      }
      
      // Clean up SSE connection when not analyzing
      if (eventSourceRef.current) {
        console.log("AnalysisProgress: Closing SSE connection");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // Clean up fake progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      return;
    }
    
    // Force manual initial progress display
    setProgress(5);
    setMessage("Starting analysis process...");

    // Set initial status when analysis starts
    if (status === 'idle') {
      setStatus('started');
      setProgress(10); // Initial progress
      setMessage("Connecting to analysis server...");
    }
    
    // Connect to SSE endpoint
    if (!user || !user.id) {
      console.error("AnalysisProgress: Cannot connect to SSE without user ID");
      return;
    }
    
    console.log(`AnalysisProgress: Setting up SSE connection for user ${user.id}`);
    const sseUrl = `/api/sse-progress?userId=${user.id}`;
    
    // Always create a new EventSource on each render when active
    if (eventSourceRef.current) {
      // Close previous connection if it exists
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      console.log("AnalysisProgress: Closed previous SSE connection to create fresh one");
    }
    
    try {
      console.log("AnalysisProgress: Creating new SSE connection to", sseUrl);
      const es = new EventSource(sseUrl);
      
      // Set up fake progress interval 
      if (!progressIntervalRef.current) {
        progressIntervalRef.current = setInterval(() => {
          const now = Date.now();
          const timeSinceLastProgress = now - progressData.lastProgressTime;
          
          // Check if we haven't received a server update in over 10 seconds
          const noServerProgressForTooLong = timeSinceLastProgress > 10000;
          
          // Count consecutive times we don't see server progress
          if (noServerProgressForTooLong) {
            progressData.serverProgressCounter++;
            console.log(`No server progress for ${Math.round(timeSinceLastProgress/1000)}s (count: ${progressData.serverProgressCounter})`);
          } else {
            progressData.serverProgressCounter = 0;
          }
          
          // If progress is stalled for too long, use fake progress
          if (progressData.serverProgressCounter >= 2) {
            // Allow fake progress to take over regardless of real progress
            if (progressData.fakeProgress < 90) {
              progressData.fakeProgress = Math.min(progressData.fakeProgress + 5, 100);
              setProgress(progressData.fakeProgress);
              const newMessage = `Processing data... (estimated ${progressData.fakeProgress}% complete)`;
              setMessage(newMessage);
              console.log(`Using fake progress: ${progressData.fakeProgress}%`);
              
              // Update parent with fake progress too
              if (onProgressUpdate) {
                onProgressUpdate(progressData.fakeProgress, newMessage);
              }
            }
          } else if (progressData.fakeProgress < 90) {
            // Normal mode - only show fake progress if it exceeds real progress
            progressData.fakeProgress = Math.min(progressData.fakeProgress + 3, 100); // Cap at 100%
            
            // Only update if the fake progress exceeds real progress
            if (progressData.fakeProgress > progress) {
              const newProgress = Math.min(progressData.fakeProgress, 100);
              const newMessage = `Processing data... (estimated ${newProgress}% complete)`;
              
              setProgress(newProgress);
              setMessage(newMessage);
              
              // Update parent with fake progress 
              if (onProgressUpdate) {
                onProgressUpdate(newProgress, newMessage);
              }
            }
          }
        }, 3000);
      }
      
      // Set up connection open handler
      es.onopen = () => {
        console.log("✅ AnalysisProgress: SSE connection opened successfully at", sseUrl);
        setProgress(15);
        setMessage("Connected to analysis server...");
      };
      
      // Set up message handler
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("AnalysisProgress: SSE message received:", data);
          
          // Update last progress time when we get a real update
          progressData.lastProgressTime = Date.now();
          
          // Handle connection confirmation
          if (data.type === 'connection') {
            console.log("AnalysisProgress: SSE connection confirmed by server");
            return;
          }
          
          // Handle progress updates
          if (data.type === 'progress_update' || data.type === 'pre_processing' || 
              data.type === 'extract_symptoms' || data.type === 'analysis') {
            
            // Update progress if provided
            if (typeof data.progress === 'number') {
              const cappedProgress = Math.min(data.progress, 100);
              setProgress(cappedProgress);
              
              // Update fake progress to match real progress if it's higher
              if (cappedProgress > progressData.fakeProgress) {
                progressData.fakeProgress = cappedProgress;
              }
              
              // Notify parent of progress update
              if (onProgressUpdate) {
                onProgressUpdate(cappedProgress, data.message || message);
              }
            }
            
            // Update status if provided
            if (data.status) {
              const statusMap: Record<string, any> = {
                'started': 'started',
                'in_progress': 'in_progress', 
                'processing': 'in_progress',
                'complete': 'complete',
                'completed': 'complete',
                'error': 'error'
              };
              setStatus(statusMap[data.status] || data.status);
            }
            
            // Update message if provided
            if (data.message) {
              setMessage(data.message);
              
              // Notify parent of message update (even if progress didn't change)
              if (onProgressUpdate && typeof progress === 'number') {
                onProgressUpdate(progress, data.message);
              }
            }
            
            // If analysis is complete, notify parent
            if (data.status === 'complete' || data.status === 'completed') {
              console.log("AnalysisProgress: Analysis complete, notifying parent");
              setProgress(100);
              
              // Clean up interval
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = null;
              }
              
              if (onComplete) {
                setTimeout(() => {
                  onComplete();
                }, 1000);
              }
            }
          }
        } catch (error) {
          console.error("AnalysisProgress: Error parsing SSE message:", error);
        }
      };
      
      // Set up error handler
      es.onerror = (error) => {
        console.error("AnalysisProgress: SSE error:", error);
        // EventSource will automatically try to reconnect
        
        // Update UI to show reconnection attempt
        setMessage("Connection lost. Attempting to reconnect...");
        
        // If we've been disconnected too long, increase the fake progress
        // to keep the user engaged while reconnection happens
        const now = Date.now();
        if (now - progressData.lastProgressTime > 15000) { // 15 seconds
          if (progressData.fakeProgress < 90) {
            progressData.fakeProgress = Math.min(progressData.fakeProgress + 2, 100);
            const cappedProgress = Math.min(progressData.fakeProgress, 100);
            setProgress(cappedProgress);
            const newMessage = `Processing data... (estimated ${cappedProgress}% complete)`;
            setMessage(newMessage);
            console.log(`Using emergency fake progress: ${cappedProgress}%`);
            
            // Update parent with emergency fake progress
            if (onProgressUpdate) {
              onProgressUpdate(cappedProgress, newMessage);
            }
          }
        }
        
        // If error persists, allow the component to fall back to polling API
        progressData.lastProgressTime = Date.now(); // Reset time to prevent multiple increments
      };
      
      // Store the EventSource in the ref for cleanup
      eventSourceRef.current = es;
    } catch (error) {
      console.error("AnalysisProgress: Error creating SSE connection:", error);
    }
    
    // Return cleanup function
    return () => {
      // Clean up SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // Clean up fake progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [isAnalyzing, user, status, onComplete, onProgressUpdate, message, progress]);

  // UI component rendering
  console.log(`⚠️ AnalysisProgress render decision: isAnalyzing=${isAnalyzing}, progress=${progress}%, status=${status}`);
  
  if (!isAnalyzing) {
    console.log("❌ AnalysisProgress: Not rendering because isAnalyzing is false");
    return null;
  }

  console.log("✅ AnalysisProgress: Rendering progress bar");
  return (
    <Card className="mb-6 border-2 border-primary-600">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center">
          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          Analysis in Progress
        </CardTitle>
        <CardDescription>
          {message}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Progress value={progress} className="h-2 mb-2" />
        <div className="text-xs text-muted-foreground text-right">
          {progress.toFixed(0)}% complete
        </div>
      </CardContent>
    </Card>
  );
}