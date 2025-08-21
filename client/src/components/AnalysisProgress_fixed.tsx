import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface AnalysisProgressProps {
  isAnalyzing: boolean;
  onComplete?: () => void;
  onProgressUpdate?: (progress: number) => void;
}

export function AnalysisProgress({ isAnalyzing, onComplete, onProgressUpdate }: AnalysisProgressProps) {
  const { user } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Initializing analysis...");
  const [status, setStatus] = useState<'idle' | 'started' | 'in_progress' | 'complete' | 'error'>('idle');
  
  // Track the state for debugging
  const debugRef = useRef({
    lastProgressUpdate: Date.now(),
    noServerProgressCount: 0,
    isConnected: false
  });
  
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
  
  // Update UI based on database status when processing status changes
  useEffect(() => {
    if (!processingStatus || !isAnalyzing) return;
    
    console.log("AnalysisProgress: Fetched status from database:", processingStatus);
    
    // Map server status to component status
    const statusMap: Record<string, any> = {
      'in_progress': 'in_progress',
      'complete': 'complete',
      'error': 'error'
    };
    
    // If the server status is "ready", keep showing whatever progress we have
    // instead of resetting to 0%
    if (processingStatus.status === 'ready') {
      console.log("Server status is 'ready' - keeping current progress display");
      return;
    }
    
    if (processingStatus.status && statusMap[processingStatus.status]) {
      setStatus(statusMap[processingStatus.status]);
    }
    
    // Only update progress if server progress is higher to avoid going backwards
    if (processingStatus.progress > progress) {
      setProgress(processingStatus.progress);
      // Call progress update callback if provided
      if (onProgressUpdate) {
        onProgressUpdate(processingStatus.progress);
      }
    }
    
    // Always update message from server
    if (processingStatus.message) {
      setMessage(processingStatus.message);
    }
    
    // Handle completion
    if (processingStatus.status === 'complete') {
      if (onComplete) {
        onComplete();
      }
    }
  }, [processingStatus, isAnalyzing, progress, onProgressUpdate, onComplete]);
  
  // Connect to SSE when analysis starts
  useEffect(() => {
    console.log("⚠️ AnalysisProgress render decision: isAnalyzing=" + isAnalyzing + ", progress=" + progress + "%, status=" + status);
    
    // Don't set up SSE connection if user is not logged in or analysis is not running
    if (!isAnalyzing || !user?.id) {
      // Always log when not rendering
      if (!isAnalyzing) {
        console.log("⛔ AnalysisProgress: Not starting SSE, analysis not active");
      }
      
      // Clean up SSE connection when not analyzing
      if (eventSourceRef.current) {
        console.log("AnalysisProgress: Unmounting - closing SSE connection");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      return;
    }
    
    console.log("✅ AnalysisProgress: Rendering progress bar");
    
    // If analysis is active but we're still at 0%, show some initial progress
    // but only if we're actually supposed to be analyzing (isAnalyzing=true)
    if (isAnalyzing && status === 'idle') {
      setStatus('started');
      setProgress(5); // Show minimal progress initially
      setMessage("Connecting to analysis server...");
    }
    
    // Only set up SSE if we don't already have an active connection
    if (!eventSourceRef.current) {
      console.log("✅ AnalysisProgress: isAnalyzing=true, user=true, userId=" + user.id);
      console.log("AnalysisProgress: Setting up SSE connection for user " + user.id);
      
      // Set up SSE connection for real-time progress updates
      const userId = user.id;
      const sseUrl = `/api/sse-progress?userId=${userId}`;
      console.log("AnalysisProgress: Creating new SSE connection to", sseUrl);
      
      try {
        const eventSource = new EventSource(sseUrl);
        eventSourceRef.current = eventSource;
        
        eventSource.onopen = () => {
          console.log("✅ AnalysisProgress: SSE connection opened successfully at", sseUrl);
          debugRef.current.isConnected = true;
        };
        
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log("AnalysisProgress: SSE message received:", data);
          
          // If this is a connection confirmation message
          if (data.type === 'connection' && data.status === 'connected') {
            console.log("AnalysisProgress: SSE connection confirmed by server");
            return;
          }
          
          // Reset no-progress counter when we get a real update
          debugRef.current.noServerProgressCount = 0;
          debugRef.current.lastProgressUpdate = Date.now();
          
          // Update progress based on message from server
          if (data.progress !== undefined) {
            // Never decrease progress
            const newProgress = Math.max(progress, data.progress);
            setProgress(newProgress);
            
            // Call progress update callback if provided
            if (onProgressUpdate) {
              onProgressUpdate(newProgress);
            }
          }
          
          // Always update message from server
          if (data.message) {
            setMessage(data.message);
          }
          
          // Handle completion or error status
          if (data.status === 'complete') {
            setStatus('complete');
            if (onComplete) {
              onComplete();
            }
          } else if (data.status === 'error') {
            setStatus('error');
          } else if (data.status === 'in_progress') {
            setStatus('in_progress');
          }
        };
        
        eventSource.onerror = (error) => {
          console.error("AnalysisProgress: SSE error:", error);
          debugRef.current.isConnected = false;
          
          // Check database status as fallback
          console.log("⚠️ SSE connection lost, falling back to database status");
          if (processingStatus) {
            console.log("📊 Retrieved database status:", processingStatus);
          }
          
          // If connection fails, try to reconnect
          console.log("🔄 Recreating EventSource connection...");
        };
        
        // Return cleanup function
        return () => {
          console.log("AnalysisProgress: Unmounting - closing SSE connection");
          eventSource.close();
          eventSourceRef.current = null;
        };
      } catch (error) {
        console.error("Error setting up EventSource:", error);
      }
    } else if (progress < 5 && isAnalyzing) {
      // If we're analyzing but still at 0%, show some initial progress
      console.log("Setting initial progress to 5% since we're analyzing");
      setProgress(5);
    }
    
    // Set up a checker to detect and report stalled progress
    const progressChecker = setInterval(() => {
      const now = Date.now();
      const timeSinceLastUpdate = now - debugRef.current.lastProgressUpdate;
      
      // If no progress for 3 seconds, increment the counter
      if (timeSinceLastUpdate > 3000) {
        debugRef.current.noServerProgressCount++;
        console.log(`No server progress for ${Math.floor(timeSinceLastUpdate/1000)}s (count: ${debugRef.current.noServerProgressCount})`);
      }
    }, 3000);
    
    // Clean up interval
    return () => {
      clearInterval(progressChecker);
    };
  }, [isAnalyzing, user, progress, status, processingStatus, onProgressUpdate, onComplete]);
  
  // IMPORTANT: Only render the component when actively analyzing
  // This prevents the progress bar from showing up on initial page load
  if (!isAnalyzing && status === 'idle') {
    return null;
  }
  
  return (
    <Card className="mb-6 relative">
      <CardContent className="pt-6">
        <div className="flex items-center mb-2">
          <Loader2 className="w-4 h-4 mr-2 animate-spin text-primary" />
          <h3 className="text-sm font-medium">Analysis in Progress {progress ? `(${progress}%)` : ''}</h3>
        </div>
        
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
        
        <div className="grid grid-cols-3 mt-4 text-center text-xs">
          <div>
            <span className="font-medium">Status: </span>
            <span className="text-muted-foreground">
              {status === 'started' ? 'In Progress' : 
               status === 'in_progress' ? 'Processing' : 
               status === 'complete' ? 'Complete' : 
               status === 'error' ? 'Error' : 'Initializing'}
               {status === 'in_progress' && ` (${progress}%)`}
            </span>
          </div>
          
          <div>
            <span className="font-medium">Patient count: </span>
            <span className="text-muted-foreground">Loading...</span>
          </div>
          
          <div>
            <span className="font-medium">Symptoms: </span>
            <span className="text-muted-foreground">0</span>
          </div>
        </div>
        
        {/* Warning for stalled process */}
        {debugRef.current.noServerProgressCount > 30 && (
          <div className="mt-2 text-xs bg-amber-50 border border-amber-200 p-2 rounded text-amber-700">
            Analysis may be stuck at {progress}%. Try refreshing the page or restarting the analysis.
          </div>
        )}
      </CardContent>
    </Card>
  );
}