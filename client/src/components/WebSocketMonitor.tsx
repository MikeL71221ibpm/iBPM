import { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, WifiOff } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface WebSocketMonitorProps {
  enabled?: boolean;
}

export function WebSocketMonitor({ enabled = true }: WebSocketMonitorProps) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Feature detection for WebSockets
  const isWebSocketSupported = typeof WebSocket !== 'undefined';

  useEffect(() => {
    // Don't connect if not enabled or WebSockets aren't supported
    if (!enabled || !isWebSocketSupported) {
      setStatus('error');
      return;
    }

    // Create WebSocket connection
    const connectWebSocket = () => {
      try {
        // Set a timeout in case connection takes too long
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        
        connectionTimeoutRef.current = setTimeout(() => {
          console.log('WebSocketMonitor: Connection attempt timed out');
          setStatus('error');
          // Fall back to non-real-time mode after multiple failures
          if (reconnectAttempts >= 2) {
            console.log('WebSocketMonitor: Multiple connection failures, accepting offline mode');
          }
        }, 5000);
        
        // Close existing socket if it exists
        if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
          wsRef.current.close();
        }
        
        // Get the proper protocol based on the current connection
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        console.log(`WebSocketMonitor: Connecting to ${wsUrl}`);
        
        // Set initial connection status
        setStatus('connecting');
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onopen = () => {
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          console.log('WebSocketMonitor: Connection established');
          setStatus('connected');
          setReconnectAttempts(0);
          
          // Send identify message with user ID if available
          const userId = sessionStorage.getItem('userId');
          if (userId && ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({
                type: 'identify',
                userId
              }));
            } catch (err) {
              console.error('WebSocketMonitor: Error sending identity message', err);
            }
          }
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocketMonitor: Received message', data);
            setLastMessage(JSON.stringify(data));
            
            // Handle specific message types
            if (data.type === 'progress_update') {
              // Update progress in UI if needed
              console.log(`WebSocketMonitor: Progress update - ${data.progress}%`);
            }
          } catch (error) {
            console.error('WebSocketMonitor: Error parsing message', error);
            setLastMessage(`Error parsing: ${event.data?.substring?.(0, 50) || 'empty message'}...`);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocketMonitor: WebSocket error', error);
          setStatus('error');
          
          // Clear any pending timeouts
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
        };
        
        ws.onclose = (event) => {
          console.log(`WebSocketMonitor: Connection closed (code: ${event.code}, reason: ${event.reason || 'none'})`);
          setStatus('disconnected');
          
          // Clear any pending timeouts
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
          
          // Only attempt to reconnect if we're not unmounting and 
          // not at max reconnect attempts yet
          if (reconnectAttempts < 3 && enabled) {
            const timeout = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
            console.log(`WebSocketMonitor: Reconnecting in ${timeout}ms (attempt ${reconnectAttempts + 1})`);
            
            const reconnectTimer = setTimeout(() => {
              setReconnectAttempts(prev => prev + 1);
              // Only try to reconnect if we're still mounted and enabled
              if (enabled) {
                connectWebSocket();
              }
            }, timeout);
            
            return () => clearTimeout(reconnectTimer);
          }
        };
        
        setSocket(ws);
      } catch (error) {
        console.error('WebSocketMonitor: Error creating WebSocket', error);
        setStatus('error');
        
        // Clear any pending timeouts
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
      }
    };
    
    // Connect immediately
    connectWebSocket();
    
    // Cleanup function that runs on unmount or when dependencies change
    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      
      if (wsRef.current) {
        console.log('WebSocketMonitor: Closing connection on cleanup');
        
        // Only try to close if the connection is open or connecting
        if (wsRef.current.readyState === WebSocket.OPEN || 
            wsRef.current.readyState === WebSocket.CONNECTING) {
          try {
            wsRef.current.close();
          } catch (err) {
            console.error('WebSocketMonitor: Error closing socket', err);
          }
        }
        
        wsRef.current = null;
      }
    };
  }, [enabled, reconnectAttempts]);

  // Don't render anything if WebSockets aren't supported or feature is disabled
  if (!enabled || !isWebSocketSupported) {
    return null;
  }

  // Status display
  let statusDisplay;
  switch (status) {
    case 'connected':
      statusDisplay = (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          <span>Connected</span>
        </Badge>
      );
      break;
    case 'connecting':
      statusDisplay = (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          <span>Connecting...</span>
        </Badge>
      );
      break;
    case 'disconnected':
      statusDisplay = (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 flex items-center gap-1">
          <WifiOff className="h-3 w-3" />
          <span>Offline</span>
        </Badge>
      );
      break;
    case 'error':
      statusDisplay = (
        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 flex items-center gap-1">
          <WifiOff className="h-3 w-3" />
          <span>Offline Mode</span>
        </Badge>
      );
      break;
  }

  return (
    <div className="flex flex-col gap-1">
      {statusDisplay}
      {lastMessage && status === 'connected' && (
        <div className="text-xs opacity-50 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]">
          Last update: {new Date().toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

export default WebSocketMonitor;