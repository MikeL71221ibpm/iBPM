import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ShieldCheck, X } from 'lucide-react';

/**
 * LoginStatusIndicator
 * 
 * A persistent component that displays in the bottom left corner
 * indicating the user's current authentication status
 * Includes a close button so users can dismiss it if desired
 */
const LoginStatusIndicator: React.FC = () => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  
  useEffect(() => {
    if (user) {
      // Short delay to ensure other components are loaded
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
  
  if (!user || !isVisible || isDismissed) return null;
  
  return (
    <div 
      className="fixed bottom-4 left-4 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 
                 px-2 py-1 rounded shadow-sm flex items-center gap-1 z-[9999] text-xs opacity-90 hover:opacity-100 
                 transition-opacity duration-200 border border-green-300 dark:border-green-700"
    >
      <ShieldCheck className="h-3 w-3" />
      <span>Logged in as <strong>{user.username}</strong></span>
      <button 
        onClick={handleDismiss}
        className="ml-1 p-0.5 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
        aria-label="Dismiss login indicator"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
};

export default LoginStatusIndicator;