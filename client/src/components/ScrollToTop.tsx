import { useEffect } from 'react';
import { useLocation } from 'wouter';

/**
 * ScrollToTop component that scrolls the window to the top on route change
 * This component should be placed at the top level of the application
 */
export function ScrollToTop() {
  // Get the current location from wouter
  const [location] = useLocation();

  // Effect to scroll to top whenever the location changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // This component doesn't render anything
  return null;
}