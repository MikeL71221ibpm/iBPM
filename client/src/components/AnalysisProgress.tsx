import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, ZapIcon, RefreshCwIcon, CheckCircle2Icon, StopCircleIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AnalysisProgressProps {
  isAnalyzing: boolean;
  onComplete?: () => void;
  onProgressUpdate?: (progress: number, message: string) => void;
}

export function AnalysisProgress({ isAnalyzing, onComplete, onProgressUpdate }: AnalysisProgressProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const eventSourceRef = useRef<EventSource | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Initializing analysis...");
  const [status, setStatus] = useState<'idle' | 'started' | 'in_progress' | 'complete' | 'error'>('idle');
  const [isBoosting, setIsBoosting] = useState(false);
  const [boostApplied, setBoostApplied] = useState(false);
  const [processedRecords, setProcessedRecords] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Track when we last received a real progress update
  const progressDataRef = useRef({
    fakeProgress: 15,
    lastProgressTime: Date.now(),
    serverProgressCounter: 0,
    hasConnection: false,
    lastProgress: 0,
    lastUpdateTime: Date.now(),
    shouldShowBoost: false,
    initialized: false
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
  
  // Also check for pre-processing status
  const { data: preProcessingStatus } = useQuery({
    queryKey: ["/api/processing-status", "pre_processing", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const response = await fetch(`/api/processing-status/pre_processing`);
      if (!response.ok) {
        throw new Error("Failed to fetch pre-processing status");
      }
      return response.json();
    },
    enabled: !!user, // Always check if there's an active pre-processing task
    refetchInterval: 5000 // Refresh every 5 seconds regardless of analysis state
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
      
      // Handle boost_applied flag from server if present
      if (processingStatus.boostApplied) {
        setBoostApplied(true);
        console.log("⚡ Boost has been applied according to server state");
      }
      
      // Initialize counter when component loads if we're in the boost zone
      if (!progressDataRef.current.initialized && 
          processingStatus.progress >= 30 && 
          processingStatus.progress <= 60) {
        console.log(`⚡ Initializing with progress in boost zone: ${processingStatus.progress}%`);
        progressDataRef.current.initialized = true;
        progressDataRef.current.lastProgress = processingStatus.progress;
        progressDataRef.current.lastUpdateTime = Date.now() - 25000; // Pre-age the progress to trigger boost sooner
        progressDataRef.current.serverProgressCounter = 8; // Start with a higher counter
      }
      
      // Detect stalled progress (same progress value for multiple consecutive checks)
      if (processingStatus.progress !== undefined) {
        // Check if progress has stalled at the same value
        if (progressDataRef.current.lastProgress === processingStatus.progress) {
          // Calculate time since last unique progress update
          const timeSinceLastUpdate = Date.now() - progressDataRef.current.lastUpdateTime;
          
          // If progress hasn't changed in 15 seconds, mark as stalled (reduced from 30s)
          if (timeSinceLastUpdate > 15000) {
            console.log(`🔴 Progress stalled at ${processingStatus.progress}% for ${Math.round(timeSinceLastUpdate/1000)}s`);
            
            // Set flag to show boost button if in the right progress range
            if (processingStatus.progress >= 30 && processingStatus.progress <= 60 && !boostApplied) {
              progressDataRef.current.shouldShowBoost = true;
              progressDataRef.current.serverProgressCounter = Math.max(15, progressDataRef.current.serverProgressCounter);
              console.log(`🚀 Boost button should be visible now! (stalled at ${processingStatus.progress}%)`);
            }
          }
        } else {
          // Progress changed, update tracking values
          progressDataRef.current.lastProgress = processingStatus.progress;
          progressDataRef.current.lastUpdateTime = Date.now();
          
          // Reset boost flag if progress is moving again
          if (processingStatus.progress > 60 || processingStatus.progress < 30) {
            progressDataRef.current.shouldShowBoost = false;
          }
        }
        
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
  }, [processingStatus, isAnalyzing, onComplete, onProgressUpdate, message, boostApplied]);
  
  // Also check for any ongoing pre-processing status
  useEffect(() => {
    if (!preProcessingStatus) return;
    
    console.log("AnalysisProgress: Fetched pre-processing status from database:", preProcessingStatus);
    
    // If pre-processing is active, update the UI
    if (preProcessingStatus.status === "in_progress" || preProcessingStatus.status === "pending") {
      // Don't interfere with active analysis, but log that pre-processing is happening
      if (!isAnalyzing) {
        setStatus("in_progress");
        setProgress(preProcessingStatus.progress || 0);
        setMessage(`Pre-processing in progress: ${preProcessingStatus.message || "Processing data..."}`);
        
        // Update patient tracking information if available
        if (preProcessingStatus.processedItems !== undefined && preProcessingStatus.totalItems !== undefined) {
          setProcessedRecords(preProcessingStatus.processedItems);
          setTotalRecords(preProcessingStatus.totalItems);
        }
      } else {
        console.log("Pre-processing is active but analysis is already in progress - not updating UI");
      }
    }
  }, [preProcessingStatus, isAnalyzing]);

  // Set up fake progress interval
  useEffect(() => {
    if (!isAnalyzing || !user?.id) {
      // Clean up fake progress interval when not analyzing
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }
    
    // Only set up the interval if it doesn't exist
    if (!progressIntervalRef.current) {
      console.log("Setting up fake progress interval");
      progressIntervalRef.current = setInterval(() => {
        const progressData = progressDataRef.current;
        const now = Date.now();
        const timeSinceLastProgress = now - progressData.lastProgressTime;
        
        // Check if we haven't received a server update in over 3 seconds
        const noServerProgressForTooLong = timeSinceLastProgress > 3000;
        
        // Count consecutive times we don't see server progress
        if (noServerProgressForTooLong) {
          progressData.serverProgressCounter++;
          console.log(`No server progress for ${Math.round(timeSinceLastProgress/1000)}s (count: ${progressData.serverProgressCounter})`);
          
          // Add explicit check to make console.log statements for boost readiness
          if (progress >= 30 && progress <= 60 && !boostApplied) {
            if (progressData.serverProgressCounter > 10 && progressData.serverProgressCounter % 5 === 0) {
              console.log(`⚡ Boost button should appear now (counter: ${progressData.serverProgressCounter}, progress: ${progress}%)`);
            }
          }
        } else {
          progressData.serverProgressCounter = 0;
        }
        
        // If progress is stalled for too long, use fake progress
        if (progressData.serverProgressCounter >= 2) {
          // Allow fake progress to take over regardless of real progress
          if (progressData.fakeProgress < 90) {
            progressData.fakeProgress += 5;
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
          progressData.fakeProgress += 3; // Slower increment in normal mode
          
          // Only update if the fake progress exceeds real progress
          if (progressData.fakeProgress > progress) {
            const newProgress = progressData.fakeProgress;
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
    
    // Clean up interval when component unmounts
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [isAnalyzing, user?.id, progress, onProgressUpdate]);

  // Connect to SSE when analysis starts
  useEffect(() => {
    // Always log analysis state changes for debugging
    console.log(`✅ AnalysisProgress: isAnalyzing=${isAnalyzing}, user=${!!user}, userId=${user?.id}`);
    
    // Add explicit debug logs for render decisions
    console.log(`⚠️ AnalysisProgress render decision: isAnalyzing=${isAnalyzing}, progress=${progress}%, status=${status}`);
    
    if (!isAnalyzing) {
      console.log("❌ AnalysisProgress: Not rendering because isAnalyzing is false");
    }
    
    if (!isAnalyzing || !user?.id) {
      // Reset progress when analysis stops
      if (!isAnalyzing && status === 'complete') {
        setStatus('idle');
        setProgress(0);
        setMessage("Analysis complete");
        if (onComplete) onComplete();
      }
      
      // Keep SSE connection alive even when not analyzing
      return;
    }
    
    // Only set initial progress if we don't already have progress data
    if (progress < 5) {
      setProgress(5);
      setMessage("Starting analysis process...");
    }

    // Set initial status when analysis starts
    if (status === 'idle') {
      setStatus('started');
      // Only set progress to 10 if we don't have higher progress already
      if (progress < 10) {
        setProgress(10);
        setMessage("Connecting to analysis server...");
      }
    }
    
    // Connect to SSE endpoint
    if (!user || !user.id) {
      console.error("AnalysisProgress: Cannot connect to SSE without user ID");
      return;
    }
    
    console.log(`AnalysisProgress: Setting up SSE connection for user ${user.id}`);
    const sseUrl = `/api/sse-progress?userId=${user.id}`;
    
    // Only create a new EventSource if we don't already have one
    if (!eventSourceRef.current) {
      try {
        console.log("AnalysisProgress: Creating new SSE connection to", sseUrl);
        const es = new EventSource(sseUrl);
        
        // Set up connection open handler
        es.onopen = () => {
          console.log("✅ AnalysisProgress: SSE connection opened successfully at", sseUrl);
          progressDataRef.current.hasConnection = true;
          
          // Only set to 15% if current progress is lower
          if (progress < 15) {
            setProgress(15);
            setMessage("Connected to analysis server...");
          }
          
          // If we already have higher progress, preserve it
          if (progress >= 15) {
            console.log(`Preserving existing progress at ${progress}%`);
          }
        };
        
        // Set up message handler
        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("AnalysisProgress: SSE message received:", data);
            
            // Update last progress time when we get a real update
            progressDataRef.current.lastProgressTime = Date.now();
            
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
                setProgress(data.progress);
                
                // Update fake progress to match real progress if it's higher
                if (data.progress > progressDataRef.current.fakeProgress) {
                  progressDataRef.current.fakeProgress = data.progress;
                }
                
                // Notify parent of progress update
                if (onProgressUpdate) {
                  onProgressUpdate(data.progress, data.message || message);
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
          
          // Mark connection as lost
          progressDataRef.current.hasConnection = false;
          
          // Close the existing connection and try to recreate it
          es.close();
          
          // After a short delay, check if we need to fall back to database state
          setTimeout(async () => {
            try {
              // If we're still analyzing, fetch current state from database
              if (isAnalyzing) {
                console.log("⚠️ SSE connection lost, falling back to database status");
                
                // Get the latest status from the database
                const response = await fetch(`/api/processing-status/extract_symptoms`);
                if (response.ok) {
                  const dbStatus = await response.json();
                  console.log("📊 Retrieved database status:", dbStatus);
                  
                  // Update progress based on database state
                  if (dbStatus && dbStatus.progress) {
                    const dbProgress = Math.min(dbStatus.progress, 95); // Cap at 95% for safety
                    setProgress(dbProgress);
                    setMessage(dbStatus.message || `Processing at ${dbProgress}% (recovered from database)`);
                    
                    // Update parent
                    if (onProgressUpdate) {
                      onProgressUpdate(dbProgress, dbStatus.message || `Processing at ${dbProgress}% (recovered from database)`);
                    }
                    
                    // If the database shows completion, notify
                    if (dbStatus.status === 'complete' || dbStatus.status === 'completed' || dbStatus.status === 'force_completed') {
                      setProgress(100);
                      console.log("Recovery detected completed state from database");
                      
                      if (onComplete) {
                        setTimeout(() => {
                          onComplete();
                        }, 1000);
                      }
                    }
                  }
                }
              }
              
              // Attempt to create a new connection  
              console.log("🔄 Recreating EventSource connection...");
              eventSourceRef.current = new EventSource(sseUrl);
              
              // Set up the same event handlers on the new connection
              // We don't set them all here since this would cause a loop
            } catch (recError) {
              console.error("Failed to recreate EventSource connection:", recError);
            }
          }, 2000);
        };
        
        // Handle boost signals from the server
        es.addEventListener('boost_applied', (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("✨ AnalysisProgress: Boost applied!", data);
            setBoostApplied(true);
            setIsBoosting(false);
            
            if (data.message) {
              setMessage(data.message);
              toast({
                title: "Boost Mode Activated",
                description: "Processing speed has been increased!",
                duration: 3000
              });
            }
          } catch (error) {
            console.error("Error processing boost event:", error);
          }
        });
        
        // Handle force complete signals from the server
        es.addEventListener('force_complete', (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("✅ AnalysisProgress: Force complete received!", data);
            
            // Update UI to show completion
            setProgress(100);
            setStatus('complete');
            
            if (data.message) {
              setMessage(data.message);
              toast({
                title: "Process Force Completed",
                description: "Analysis completed with partial data collected so far.",
                duration: 3000
              });
            }
            
            // Notify parent component that the process is complete
            if (onComplete) {
              setTimeout(() => {
                onComplete();
              }, 1000);
            }
          } catch (error) {
            console.error("Error processing force complete event:", error);
          }
        });
        
        // Handle force stop signals from the server
        es.addEventListener('force_stop', (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("⏹️ AnalysisProgress: Force stop received!", data);
            
            // Reset progress UI
            setProgress(0);
            setStatus('idle');
            
            if (data.message) {
              setMessage(data.message);
              toast({
                title: "Process Force Stopped",
                description: "Processing has been stopped. You can restart the analysis.",
                duration: 3000
              });
            }
            
            // Notify parent component that the process is stopped
            if (onComplete) {
              setTimeout(() => {
                onComplete();
              }, 1000);
            }
          } catch (error) {
            console.error("Error processing force stop event:", error);
          }
        });
        
        // Store the EventSource in the ref for cleanup
        eventSourceRef.current = es;
      } catch (error) {
        console.error("AnalysisProgress: Error creating SSE connection:", error);
      }
    }
    
    // Return cleanup function - only runs on component unmount
    return () => {
      // Clean up SSE connection
      if (eventSourceRef.current) {
        console.log("AnalysisProgress: Unmounting - closing SSE connection");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isAnalyzing, user, status, onComplete, onProgressUpdate, message]);

  // UI component rendering
  console.log(`⚠️ AnalysisProgress render decision: isAnalyzing=${isAnalyzing}, progress=${progress}%, status=${status}`);
  
  // ALWAYS run the component logic if body has the analyzing class
  // This helps recover from component state inconsistencies
  const forceAnalyzing = typeof document !== 'undefined' && document.body.classList.contains('is-analyzing');
  
  // Check if we should force analysis mode based on body class
  if (forceAnalyzing && !isAnalyzing) {
    console.log("⚠️ FORCING isAnalyzing=true due to body class");
    // We continue rendering instead of returning null
  } else if (!isAnalyzing && progress > 0) {
    // Render a hidden placeholder if not actively analyzing but if we have progress data
    // This allows us to continue sending progress updates to the parent component even when the component is not visible
    console.log("🔄 AnalysisProgress: Rendering hidden progress bar to continue updates");
    return (
      <div style={{ display: 'none' }} data-testid="hidden-progress-updater">
        {/* Empty div that still renders the component so effects run */}
      </div>
    );
  } else if (!isAnalyzing && !forceAnalyzing) {
    // Don't render anything if not analyzing, no progress, and no force flag
    console.log("❌ AnalysisProgress: Not rendering because isAnalyzing is false");
    return null;
  }

  // Function to handle reset button click
  const handleReset = async () => {
    if (!user?.id) return;
    
    // Ask for confirmation before resetting
    const confirmReset = window.confirm(
      "This will reset the current extraction process and allow you to restart. The system may be temporarily unavailable during reset. Continue?"
    );
    
    if (!confirmReset) {
      return;
    }
    
    try {
      console.log("🔄 Requesting extraction reset...");
      const response = await fetch('/api/reset-extraction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to reset extraction');
      }
      
      if (result.success) {
        toast({
          title: "Reset Successful",
          description: "The extraction process has been reset. You can now restart the analysis.",
          duration: 4000
        });
        console.log("✅ Reset request successful:", result);
        
        // Reset progress UI
        setProgress(0);
        setMessage("Analysis reset. Ready to restart.");
        setStatus('idle');
        progressDataRef.current.serverProgressCounter = 0;
        progressDataRef.current.lastProgress = 0;
        setBoostApplied(false);
        
        // Notify parent component that process is complete (reset)
        if (onComplete) {
          setTimeout(() => {
            onComplete();
          }, 1000);
        }
      } else {
        console.log("❌ Reset request failed:", result);
        toast({
          title: "Reset Failed",
          description: result.message || "Could not reset extraction process",
          variant: "destructive",
          duration: 3000
        });
      }
    } catch (error) {
      console.error("Error resetting extraction:", error);
      toast({
        title: "Reset Error",
        description: "Failed to reset extraction. Please try again.",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  // Function to handle force complete
  const handleForceComplete = async () => {
    if (!user?.id) return;
    
    // Ask for confirmation before force completing
    const confirmForceComplete = window.confirm(
      "Force Complete will mark the extraction as complete and use whatever data has been extracted so far. Continue?"
    );
    
    if (!confirmForceComplete) {
      return;
    }
    
    try {
      console.log("✅ Requesting force complete...");
      const response = await fetch('/api/force-complete-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskType: 'extract_symptoms'
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to force complete');
      }
      
      if (result.success) {
        toast({
          title: "Process Completed",
          description: "The extraction process has been marked as complete. Processing the partial data.",
          duration: 4000
        });
        console.log("✅ Force complete successful:", result);
        
        // Update UI to show completion
        setProgress(100);
        setMessage("Analysis force completed with partial data.");
        
        // Notify parent component that process is complete
        if (onComplete) {
          setTimeout(() => {
            onComplete();
          }, 1000);
        }
      } else {
        console.log("❌ Force complete failed:", result);
        toast({
          title: "Force Complete Failed",
          description: result.message || "Could not complete extraction process",
          variant: "destructive",
          duration: 3000
        });
      }
    } catch (error) {
      console.error("Error force completing extraction:", error);
      toast({
        title: "Force Complete Error",
        description: "Failed to complete extraction. Please try again.",
        variant: "destructive",
        duration: 3000
      });
    }
  };
  
  // Function to handle force stop
  const handleForceStop = async () => {
    if (!user?.id) return;
    
    // Ask for confirmation before force stopping
    const confirmForceStop = window.confirm(
      "Force Stop will completely stop the extraction process and discard any in-progress work. Continue?"
    );
    
    if (!confirmForceStop) {
      return;
    }
    
    try {
      console.log("⏹️ Requesting force stop...");
      const response = await fetch('/api/force-stop-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskType: 'extract_symptoms'
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to stop process');
      }
      
      if (result.success) {
        toast({
          title: "Process Stopped",
          description: "The extraction process has been stopped. No data was processed.",
          duration: 4000
        });
        console.log("✅ Force stop successful:", result);
        
        // Reset UI
        setProgress(0);
        setMessage("Analysis stopped. Ready to restart.");
        setStatus('idle');
        
        // Notify parent component that process is complete (stopped)
        if (onComplete) {
          setTimeout(() => {
            onComplete();
          }, 1000);
        }
      } else {
        console.log("❌ Force stop failed:", result);
        toast({
          title: "Force Stop Failed",
          description: result.message || "Could not stop extraction process",
          variant: "destructive",
          duration: 3000
        });
      }
    } catch (error) {
      console.error("Error stopping extraction:", error);
      toast({
        title: "Force Stop Error",
        description: "Failed to stop extraction. Please try again.",
        variant: "destructive",
        duration: 3000
      });
    }
  };

  // Function to handle boost button click
  const handleBoost = async () => {
    if (isBoosting || boostApplied || !user?.id) return;
    
    setIsBoosting(true);
    
    try {
      console.log("🚀 Requesting boost mode...");
      const response = await fetch('/api/boost-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskType: 'extract_symptoms'
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to apply boost');
      }
      
      if (result.success) {
        toast({
          title: "Boost Requested",
          description: "Speed boost will be applied shortly...",
          duration: 3000
        });
        console.log("✅ Boost request successful:", result);
        
        // If the server didn't update the UI via SSE, we'll do it here
        if (progressDataRef.current.serverProgressCounter > 3) {
          setProgress(prev => Math.min(90, prev + 10));
          setMessage("Processing accelerated with boost mode!");
        }
      } else {
        console.log("❌ Boost request failed:", result);
        setIsBoosting(false);
        toast({
          title: "Boost Failed",
          description: result.message || "Could not apply processing boost",
          variant: "destructive",
          duration: 3000
        });
      }
    } catch (error) {
      console.error("Error applying boost:", error);
      setIsBoosting(false);
      toast({
        title: "Boost Error",
        description: "Failed to apply boost. Please try again.",
        variant: "destructive",
        duration: 3000
      });
    }
  };

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
        {/* Enhanced progress bar with higher contrast and better visibility */}
        <div className="w-full bg-gray-200 rounded-full h-4 mb-4 border border-gray-300">
          <div 
            className="bg-primary-600 h-full rounded-full transition-all duration-300 shadow-inner flex items-center justify-center text-[10px] text-white font-bold overflow-hidden"
            style={{ 
              width: `${progress}%`,
              background: boostApplied 
                ? 'linear-gradient(to right, #9f6bc5, #c74d97)' // Brighter gradient when boosted
                : 'linear-gradient(to right, #8856A7, #994C99)'  // Standard gradient
            }}
          >
            {progress > 15 && (
              <span className="px-1 mix-blend-overlay">{progress.toFixed(0)}%</span>
            )}
          </div>
        </div>
       

        
        {/* Progress percentage */}
        <div className="text-xs text-muted-foreground font-semibold text-center">
          {progress.toFixed(0)}% complete
        </div>
      </CardContent>
      
      {/* Show indicator when boost is active */}
      {boostApplied && (
        <CardFooter className="pt-0">
          <div className="flex items-center justify-center text-xs text-primary-600 font-medium">
            <ZapIcon className="h-3.5 w-3.5 mr-1 text-yellow-500" />
            Boost Mode Active
          </div>
        </CardFooter>
      )}

    </Card>
  );
}