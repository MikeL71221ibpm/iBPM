import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ShieldCheck, X, Move, AlertTriangle, Zap, RefreshCw, CheckCircle2, StopCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Position {
  x: number;
  y: number;
}

interface ButtonState {
  position: Position;
  isDragging: boolean;
}

interface RecoveryButtonState {
  position: Position;
  isDragging: boolean;
  isExpanded: boolean;
}

/**
 * DraggableUserInterface
 * 
 * Component managing the login indicator with drag functionality and persistent positioning
 */
const DraggableUserInterface: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Button state with persistent positioning
  const [loginButton, setLoginButton] = useState<ButtonState>({
    position: { x: 16, y: window.innerHeight - 80 }, // bottom-left default
    isDragging: false
  });

  // Recovery button state
  const [recoveryButton, setRecoveryButton] = useState<RecoveryButtonState>({
    position: { x: window.innerWidth - 200, y: window.innerHeight - 60 }, // bottom-right default
    isDragging: false,
    isExpanded: false
  });

  // Emergency button state
  const [emergencyButton, setEmergencyButton] = useState<ButtonState>({
    position: { x: window.innerWidth - 140, y: window.innerHeight - 60 }, // bottom-right default
    isDragging: false
  });

  const loginRef = useRef<HTMLDivElement>(null);
  const recoveryRef = useRef<HTMLDivElement>(null);
  const emergencyRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef<Position>({ x: 0, y: 0 });
  const dragStateRef = useRef<{ hasMoved: boolean; startTime: number }>({ hasMoved: false, startTime: 0 });

  // Load saved position from localStorage
  useEffect(() => {
    const savedLoginPos = localStorage.getItem('loginButtonPosition');
    const savedRecoveryPos = localStorage.getItem('recoveryButtonPosition');
    const savedEmergencyPos = localStorage.getItem('emergencyButtonPosition');
    
    if (savedLoginPos) {
      const pos = JSON.parse(savedLoginPos);
      setLoginButton(prev => ({ ...prev, position: pos }));
    }
    
    if (savedRecoveryPos) {
      const pos = JSON.parse(savedRecoveryPos);
      setRecoveryButton(prev => ({ ...prev, position: pos }));
    }
    
    if (savedEmergencyPos) {
      const pos = JSON.parse(savedEmergencyPos);
      setEmergencyButton(prev => ({ ...prev, position: pos }));
    }
  }, []);

  // Show login indicator when user is authenticated
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        console.log("Login indicator activated for user:", user.username);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  // Save position to localStorage
  const savePosition = (position: Position) => {
    localStorage.setItem('loginButtonPosition', JSON.stringify(position));
  };

  const saveRecoveryPosition = (position: Position) => {
    localStorage.setItem('recoveryButtonPosition', JSON.stringify(position));
  };

  // Recovery action handlers
  const handleRecoveryAction = async (action: string) => {
    try {
      let endpoint = '';
      let body = {};
      
      // Map action to proper endpoint and body
      if (action === 'reset') {
        endpoint = '/api/emergency/complete-reset';
        body = { clearAllData: true };
      } else if (action === 'force-complete') {
        endpoint = '/api/emergency/force-complete-processing';
        body = { taskType: 'symptom_extraction' };
      } else if (action === 'boost') {
        endpoint = '/api/emergency/boost-processing';
        body = { taskType: 'symptom_extraction' };
      } else {
        endpoint = `/api/emergency/${action}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action}: ${response.statusText}`);
      }

      const result = await response.json();
      
      toast({
        title: `${action} completed`,
        description: result.message || `${action} action executed successfully`,
        variant: "default",
      });

      // For reset action, also restart the extraction process
      if (action === 'reset') {
        setTimeout(async () => {
          try {
            await fetch('/api/extract-symptoms/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ forceRestart: true })
            });
            console.log('Extraction restarted after reset');
          } catch (err) {
            console.error('Failed to restart extraction after reset:', err);
          }
        }, 1000);
      }

      // Also trigger auto-restart service
      await handleAutoRestart();
      
    } catch (error) {
      console.error(`Recovery ${action} error:`, error);
      toast({
        title: `${action} failed`,
        description: error instanceof Error ? error.message : `Failed to execute ${action}`,
        variant: "destructive",
      });
    }
  };

  // Auto-restart service handler
  const handleAutoRestart = async () => {
    try {
      const response = await fetch('/api/auto-restart/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Auto-restart failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      toast({
        title: "Auto-restart triggered",
        description: result.message || "Process monitoring and restart initiated",
        variant: "default",
      });
      
    } catch (error) {
      console.error('Auto-restart error:', error);
      toast({
        title: "Auto-restart failed", 
        description: error instanceof Error ? error.message : "Failed to trigger auto-restart",
        variant: "destructive",
      });
    }
  };

  // Handle drag start for login button
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = loginRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    // Initialize drag state
    dragStateRef.current = {
      hasMoved: false,
      startTime: Date.now()
    };

    setLoginButton(prev => ({ ...prev, isDragging: true }));

    const handleMouseMove = (e: MouseEvent) => handleLoginDragMove(e);
    const handleMouseUp = () => handleLoginDragEnd(handleMouseMove, handleMouseUp);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle drag start for recovery button
  const handleRecoveryDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = recoveryRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    // Initialize drag state
    dragStateRef.current = {
      hasMoved: false,
      startTime: Date.now()
    };

    setRecoveryButton(prev => ({ ...prev, isDragging: true }));

    const handleMouseMove = (e: MouseEvent) => handleRecoveryDragMove(e);
    const handleMouseUp = () => handleRecoveryDragEnd(handleMouseMove, handleMouseUp);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle drag start for emergency button
  const handleEmergencyDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = emergencyRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    // Initialize drag state
    dragStateRef.current = {
      hasMoved: false,
      startTime: Date.now()
    };

    setEmergencyButton(prev => ({ ...prev, isDragging: true }));

    const handleMouseMove = (e: MouseEvent) => handleEmergencyDragMove(e);
    const handleMouseUp = () => handleEmergencyDragEnd(handleMouseMove, handleMouseUp);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle drag move for login button
  const handleLoginDragMove = (e: MouseEvent) => {
    // Mark that we've moved (for distinguishing from clicks)
    dragStateRef.current.hasMoved = true;
    
    const newPosition = {
      x: e.clientX - dragOffsetRef.current.x,
      y: e.clientY - dragOffsetRef.current.y
    };

    setLoginButton(prev => ({ ...prev, position: newPosition }));
  };

  // Handle drag move for recovery button
  const handleRecoveryDragMove = (e: MouseEvent) => {
    // Mark that we've moved (for distinguishing from clicks)
    dragStateRef.current.hasMoved = true;
    
    const newPosition = {
      x: e.clientX - dragOffsetRef.current.x,
      y: e.clientY - dragOffsetRef.current.y
    };

    setRecoveryButton(prev => ({ ...prev, position: newPosition }));
  };

  const handleEmergencyDragMove = (e: MouseEvent) => {
    dragStateRef.current.hasMoved = true;
    
    const newPosition = {
      x: e.clientX - dragOffsetRef.current.x,
      y: e.clientY - dragOffsetRef.current.y
    };

    setEmergencyButton(prev => ({ ...prev, position: newPosition }));
  };

  // Handle drag end for login button
  const handleLoginDragEnd = (
    handleMouseMove: (e: MouseEvent) => void,
    handleMouseUp: () => void
  ) => {
    setLoginButton(prev => {
      savePosition(prev.position);
      return { ...prev, isDragging: false };
    });

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Handle drag end for recovery button
  const handleRecoveryDragEnd = (
    handleMouseMove: (e: MouseEvent) => void,
    handleMouseUp: () => void
  ) => {
    setRecoveryButton(prev => {
      saveRecoveryPosition(prev.position);
      return { ...prev, isDragging: false };
    });

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Handle drag end for emergency button
  const handleEmergencyDragEnd = (
    handleMouseMove: (e: MouseEvent) => void,
    handleMouseUp: () => void
  ) => {
    setEmergencyButton(prev => {
      localStorage.setItem('emergencyButtonPosition', JSON.stringify(prev.position));
      return { ...prev, isDragging: false };
    });

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  // Button styles
  const loginStyles = `
    fixed flex items-center gap-1 px-3 py-2 rounded-md shadow-sm border
    font-medium text-xs cursor-move transition-all duration-200 z-[9999]
    hover:shadow-md select-none bg-green-100 text-green-800 border-green-300 hover:bg-green-200
    ${loginButton.isDragging ? 'scale-105 shadow-lg' : ''}
  `;

  const recoveryStyles = `
    fixed flex items-center gap-1 px-2 py-1 rounded-md shadow-lg border-2
    font-medium text-xs cursor-move transition-all duration-200 z-[9998]
    hover:shadow-xl select-none bg-pink-100 text-pink-800 border-pink-300 hover:bg-pink-200
    ${recoveryButton.isDragging ? 'scale-105 shadow-2xl' : ''}
  `;

  const expandedRecoveryStyles = `
    fixed flex flex-col gap-2 p-4 rounded-lg shadow-xl border-2
    font-medium text-sm transition-all duration-300 z-[9997] min-w-64
    bg-pink-50 text-pink-900 border-pink-400 cursor-move
    ${recoveryButton.isDragging ? 'scale-105 shadow-2xl' : ''}
  `;

  return (
    <>
      {/* Login Status Indicator */}
      {user && isVisible && !isDismissed && (
        <div
          ref={loginRef}
          className={loginStyles}
          style={{
            left: `${loginButton.position.x}px`,
            top: `${loginButton.position.y}px`,
          }}
          onMouseDown={handleDragStart}
        >
          <Move className="h-3 w-3 opacity-50" />
          <ShieldCheck className="h-3 w-3" />
          <span>Logged in as <strong>{user.username}</strong></span>
          <button 
            onClick={handleDismiss}
            className="ml-1 p-0.5 rounded-full hover:bg-green-200 transition-colors"
            aria-label="Dismiss login indicator"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      )}

      {/* Emergency Refresh Button - Draggable */}
      <div
        ref={emergencyRef}
        style={{
          position: 'fixed',
          left: `${emergencyButton.position.x}px`,
          top: `${emergencyButton.position.y}px`,
          zIndex: 10000,
          padding: '4px 8px',
          backgroundColor: '#dc2626',
          color: 'white',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '500',
          cursor: emergencyButton.isDragging ? 'grabbing' : 'grab',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          border: '1px solid #b91c1c',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
        onMouseDown={handleEmergencyDragStart}
        onClick={(e) => {
          if (!dragStateRef.current.hasMoved) {
            // Check if there are stuck loading states that can be cleared without full reset
            const hasStuckLoading = document.querySelector('[data-loading-spinner]') !== null;
            
            if (hasStuckLoading) {
              if (window.confirm('Clear stuck loading messages? (No data will be lost)')) {
                // Emit custom event to clear loading states
                window.dispatchEvent(new CustomEvent('clearStuckLoading'));
                toast({
                  title: "Loading Cleared",
                  description: "Stuck loading messages have been cleared.",
                  duration: 3000
                });
                return;
              }
            }
            
            // Original full reset option
            if (window.confirm('This will clear all data and reset the system. Continue?')) {
              console.log('🚨 Emergency Refresh - Starting reset request...');
              console.log('🚨 Emergency Refresh - Current URL:', window.location.href);
              console.log('🚨 Emergency Refresh - User authenticated:', !!user);
              console.log('🚨 Emergency Refresh - User object:', user);
              
              fetch('/api/emergency-reset-bypass', { 
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json'
                }
              })
                .then(res => {
                  console.log('🚨 Emergency Refresh - Response status:', res.status);
                  console.log('🚨 Emergency Refresh - Response OK:', res.ok);
                  
                  if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                  }
                  
                  return res.json();
                })
                .then(result => {
                  console.log('🚨 Emergency Refresh - Success:', result);
                  toast({
                    title: "Reset Complete",
                    description: "All data has been cleared successfully.",
                    duration: 3000
                  });
                  window.location.reload();
                })
                .catch(err => {
                  console.error('🚨 Emergency Refresh - Failed:', err);
                  toast({
                    title: "Reset Failed",
                    description: err.message || "An error occurred during reset",
                    variant: "destructive",
                    duration: 5000
                  });
                });
            }
          }
        }}
      >
        <Move className="h-3 w-3 opacity-50" />
        Emergency Refresh
      </div>

      {/* Recovery and Fix Stalled Processes Button - Always Visible */}
      {false && (
        <div
          ref={recoveryRef}
          className={recoveryButton.isExpanded ? expandedRecoveryStyles : recoveryStyles}
          style={{
            left: `${recoveryButton.position.x}px`,
            top: `${recoveryButton.position.y}px`,
          }}
          onMouseDown={handleRecoveryDragStart}
        >
          {!recoveryButton.isExpanded ? (
            <>
              <Move className="h-4 w-4 opacity-75" />
              <AlertTriangle className="h-4 w-4" />
              <span className="font-bold text-sm">EMERGENCY REFRESH</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRecoveryButton(prev => ({ ...prev, isExpanded: true }));
                }}
                className="ml-1 px-1 py-0.5 bg-pink-200 hover:bg-pink-300 rounded transition-colors text-xs"
              >
                Options
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-semibold">Recovery Options</span>
                </div>
                <button
                  onClick={() => setRecoveryButton(prev => ({ ...prev, isExpanded: false }))}
                  className="p-1 hover:bg-pink-200 rounded transition-colors"
                  aria-label="Close recovery options"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleRecoveryAction('force-stop')}
                  className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md transition-colors text-xs font-medium"
                  title="Immediately terminate the current process without saving progress"
                >
                  <StopCircle className="h-3 w-3" />
                  Force Stop
                </button>
                
                <button
                  onClick={() => handleRecoveryAction('boost')}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md transition-colors text-xs font-medium"
                  title="Increase processing speed and memory allocation for faster completion"
                >
                  <Zap className="h-3 w-3" />
                  Boost
                </button>
                
                <button
                  onClick={() => handleRecoveryAction('reset')}
                  className="flex items-center gap-2 px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-md transition-colors text-xs font-medium"
                  title="Stop current process and clear all progress - start completely over"
                >
                  <RefreshCw className="h-3 w-3" />
                  Reset
                </button>
                
                <button
                  onClick={() => handleRecoveryAction('force-complete')}
                  className="flex items-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-md transition-colors text-xs font-medium"
                  title="Mark current process as completed even if not finished - use with caution"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Force Complete
                </button>
              </div>
              
              <div className="mt-3 pt-3 border-t border-pink-300">
                <button
                  onClick={handleAutoRestart}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-pink-200 hover:bg-pink-300 text-pink-900 rounded-md transition-colors text-sm font-semibold"
                  title="Start background monitoring that automatically restarts stalled processes every minute (45 second stall threshold)"
                >
                  <RefreshCw className="h-4 w-4" />
                  Auto-Restart Service
                </button>
                
                <button
                  onClick={() => window.open('/emergency-test.html', '_blank')}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors text-xs"
                  title="View detailed processing status and emergency recovery dashboard"
                >
                  <AlertTriangle className="h-3 w-3" />
                  View Status Dashboard
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default DraggableUserInterface;