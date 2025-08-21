import React from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button"; 
import PopulationHealthControlling from './population-health-controlling-05_13_25';

/**
 * This wrapper component forces the Population Health dashboard to render in percentage mode.
 * It provides a simple interface that redirects to the main dashboard with percentage calculations.
 */
export default function PopulationHealthFixedPercentage() {
  const [, navigate] = useLocation();

  React.useEffect(() => {
    // Redirect to the main population health page
    navigate('/');

    // Delay the click on the percentage button to ensure the page has loaded
    const timer = setTimeout(() => {
      // Find and click the percentage button
      const percentageBtn = document.querySelector('button[aria-pressed="false"]') as HTMLButtonElement;
      if (percentageBtn) {
        percentageBtn.click();
        console.log('Auto-clicked percentage button');
      } else {
        console.warn('Could not find percentage button');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Loading Percentage View...</h1>
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4">Please wait while we prepare the percentage view...</p>
      </div>
    </div>
  );
}