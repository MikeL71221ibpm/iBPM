import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ShieldCheck, X } from 'lucide-react';

/**
 * LoginStatusIndicator Controlling File - Created on 05/25/2025
 * 
 * A persistent component that displays in the bottom left corner
 * indicating the user's current authentication status
 * Includes a close button so users can dismiss it if desired
 */
const LoginStatusIndicator: React.FC = () => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    // Check if user has previously dismissed in this session
    return sessionStorage.getItem('loginIndicatorDismissed') === 'true';
  });
  
  // Debug logging
  console.log('LoginStatusIndicator - User:', user ? user.username : 'null', 'isVisible:', isVisible, 'isDismissed:', isDismissed);
  
  useEffect(() => {
    if (user) {
      // Clear any previous dismissal when user changes
      sessionStorage.removeItem('loginIndicatorDismissed');
      setIsDismissed(false);
      
      // Immediate visibility for better user experience
      setIsVisible(true);
      console.log("Login indicator activated for user:", user.username);
    } else {
      // Reset visibility when user logs out
      setIsVisible(false);
      setIsDismissed(false);
      sessionStorage.removeItem('loginIndicatorDismissed');
    }
  }, [user]);
  
  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('loginIndicatorDismissed', 'true');
  };
  
  if (!user || !isVisible || isDismissed) return null;
  
  return (
    <div 
      className="fixed bottom-3 left-3 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 
                 px-2 py-1 rounded-md shadow-md flex items-center gap-1.5 z-[9999] text-xs opacity-90 hover:opacity-100 
                 transition-opacity duration-200 border border-green-300 dark:border-green-700"
    >
      <ShieldCheck className="h-3 w-3" />
      <span>Logged in as <strong>{user.username}</strong></span>
      <button 
        onClick={handleDismiss}
        className="ml-1.5 p-0.5 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
        aria-label="Dismiss login indicator"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
};

export default LoginStatusIndicator;