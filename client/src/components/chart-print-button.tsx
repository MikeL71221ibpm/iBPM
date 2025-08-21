import React from 'react';
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

/**
 * A standardized button component for printing charts
 * Uses a consistent approach for all charts
 */
interface ChartPrintButtonProps {
  chartId: string;
  chartTitle: string;
  className?: string;
}

export function ChartPrintButton({ 
  chartId, 
  chartTitle, 
  className = "" 
}: ChartPrintButtonProps) {
  const handlePrintChart = async () => {
    try {
      console.log(`Printing chart: ${chartId} - ${chartTitle}`);
      
      // Find the chart element by data attribute
      const chartElement = document.querySelector(`[data-chart-id="${chartId}"]`);
      if (!chartElement) {
        console.error(`Chart element with ID ${chartId} not found`);
        return;
      }

      // Create a canvas from the chart element
      const canvas = await html2canvas(chartElement as HTMLElement, {
        scale: 2, // Higher scale for better quality
        backgroundColor: '#ffffff',
        logging: true,
        useCORS: true
      });

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          // Create a formatted filename
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `${chartTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}_${timestamp}.png`;
          
          // Save the file
          saveAs(blob, filename);
        }
      });
    } catch (error) {
      console.error('Error printing chart:', error);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handlePrintChart}
      className={`h-7 px-2 text-xs ${className}`}
      title={`Print ${chartTitle} chart`}
    >
      <Printer className="h-4 w-4 mr-1" />
      Print
    </Button>
  );
}

export default ChartPrintButton;