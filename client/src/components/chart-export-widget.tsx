// Chart Export Widget Component
// Provides standardized export functionality for any visualization

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, FileJson, Table, Download, Printer, Loader2, X } from "lucide-react";
import * as XLSX from 'xlsx';

interface ChartExportWidgetProps {
  chartId: string;
  chartTitle: string;
  data: any[];
  showDetailedExport?: boolean;
  className?: string;
  onPrint?: () => void;
  getDetailedData?: () => any[];
  iconSize?: number;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export default function ChartExportWidget({
  chartId,
  chartTitle,
  data,
  showDetailedExport = false,
  className = '',
  onPrint,
  getDetailedData,
  iconSize = 16,
  onClose,
  showCloseButton = true
}: ChartExportWidgetProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Debug logging to see if widget is rendered
  console.log('🔥🔥🔥 CHART EXPORT WIDGET RENDERED!', { 
    chartId, 
    chartTitle, 
    showDetailedExport,
    dataLength: data?.length 
  });

  // Helper function to sanitize filename
  const sanitizeFilename = (name: string): string => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  };

  // Export to CSV
  const exportCSV = async (detailed = false) => {
    setIsExporting(true);
    try {
      console.log('🔥🔥🔥 CHART EXPORT WIDGET CSV EXPORT CALLED!', { detailed });
      
      let exportData;
      
      if (detailed) {
        console.log('🔥🔥🔥 FETCHING DETAILED DATA FROM API ENDPOINT!');
        // Fetch detailed dataset with all notes and dates of service
        const response = await fetch('/api/export-data-detailed', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch detailed data: ${response.statusText}`);
        }
        
        const result = await response.json();
        exportData = result.data || [];
        console.log('🔥🔥🔥 DETAILED DATA RECEIVED:', exportData.length, 'records');
      } else {
        // Use regular chart data for basic CSV
        exportData = data;
        console.log('🔥🔥🔥 USING REGULAR CHART DATA:', exportData.length, 'records');
      }
      
      if (!exportData || exportData.length === 0) {
        toast({
          title: "Export Failed",
          description: "No data available to export",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      // Convert data to CSV string
      const headers = Object.keys(exportData[0]).join(',');
      const rows = exportData.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : String(value)
        ).join(',')
      ).join('\n');
      
      const csvContent = `${headers}\n${rows}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const detailSuffix = detailed ? '_detailed' : '';
      const filename = `${sanitizeFilename(chartTitle)}${detailSuffix}_${new Date().toISOString().split('T')[0]}.csv`;
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `Data exported to ${filename}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Export to Excel
  const exportExcel = () => {
    setIsExporting(true);
    try {
      // Use only chart data for Excel export
      const exportData = data;
      
      if (!exportData || exportData.length === 0) {
        toast({
          title: "Export Failed",
          description: "No data available to export",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
      
      // Generate filename
      const filename = `${sanitizeFilename(chartTitle)}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Export and download
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: "Export Successful",
        description: `Data exported to ${filename}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Export to JSON
  const exportJSON = () => {
    setIsExporting(true);
    try {
      // Use only chart data for JSON export
      const exportData = data;
      
      if (!exportData || exportData.length === 0) {
        toast({
          title: "Export Failed",
          description: "No data available to export",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }
      
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const filename = `${sanitizeFilename(chartTitle)}_${new Date().toISOString().split('T')[0]}.json`;
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `Data exported to ${filename}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle print functionality - streamlined to avoid blank pages
  const handlePrint = async () => {
    if (onPrint) {
      onPrint();
      return;
    }

    // Simple, direct print that captures only the chart
    try {
      setIsExporting(true);
      
      // Find the chart element by ID
      const chartElement = document.getElementById(chartId);
      if (!chartElement) {
        toast({
          title: "Print Error",
          description: "Chart not found for printing",
          variant: "destructive",
        });
        return;
      }

      // Import html2canvas dynamically
      const html2canvas = (await import('html2canvas')).default;
      
      // Get the chart dimensions and add significant padding for labels
      const chartRect = chartElement.getBoundingClientRect();
      
      // Capture the chart with enhanced settings to include all elements
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Good balance of quality and performance
        logging: false,
        useCORS: true,
        allowTaint: true,
        height: chartRect.height + 150, // Extra height for rotated X-axis labels
        width: chartRect.width + 100, // Extra width for Y-axis labels
        x: Math.max(0, chartRect.left - 50), // Capture area to the left
        y: Math.max(0, chartRect.top - 50), // Capture area above
        scrollX: 0,
        scrollY: 0
      });

      // Create a print window optimized for chart display
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: "Print Error", 
          description: "Please allow popups to print charts",
          variant: "destructive",
        });
        return;
      }

      // Enhanced HTML with proper sizing for chart and labels
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${chartTitle} - Print</title>
            <style>
              @page {
                size: landscape;
                margin: 0.5in;
              }
              body { 
                margin: 0; 
                padding: 20px; 
                text-align: center;
                font-family: Arial, sans-serif;
              }
              h1 { 
                font-size: 24px;
                margin-bottom: 20px; 
                color: #333;
              }
              .chart-container {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: calc(100vh - 120px);
              }
              img { 
                max-width: 95%; 
                max-height: 85vh;
                height: auto;
                border: 1px solid #ddd;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              @media print {
                body { padding: 10px; }
                h1 { margin-bottom: 15px; }
                .chart-container { min-height: auto; }
                img { 
                  max-width: 100%; 
                  max-height: 80vh;
                }
              }
            </style>
          </head>
          <body>
            <h1>${chartTitle}</h1>
            <div class="chart-container">
              <img src="${canvas.toDataURL('image/png')}" alt="${chartTitle}">
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() { 
                  window.print(); 
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      toast({
        title: "Print Ready",
        description: "Chart prepared for printing",
      });
    } catch (error) {
      console.error("Print error:", error);
      toast({
        title: "Print Failed",
        description: "Unable to prepare chart for printing",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`flex space-x-1 items-center ${className}`} data-testid={`export-widget-${chartId}`}>
      {isExporting ? (
        <Button variant="ghost" size="sm" disabled className="px-2">
          <Loader2 className={`animate-spin h-${iconSize/4} w-${iconSize/4}`} />
          <span className="ml-1 text-xs">Exporting...</span>
        </Button>
      ) : (
        <TooltipProvider>
          {/* Close button */}
          {showCloseButton && onClose && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClose}
                  className="px-2 hover:bg-red-100 hover:text-red-600"
                >
                  <X className={`h-${iconSize/4} w-${iconSize/4}`} />
                  <span className="sr-only">Close Export Widget</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Close</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => exportCSV(false)}
                className="px-2"
              >
                <Table className={`h-${iconSize/4} w-${iconSize/4}`} />
                <span className="sr-only">Export CSV</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export to CSV</p>
            </TooltipContent>
          </Tooltip>
          
          {showDetailedExport && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => exportCSV(true)}
                  className="px-2"
                >
                  <Download className={`h-${iconSize/4} w-${iconSize/4}`} />
                  <span className="sr-only">Export Detailed CSV</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export Detailed CSV</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={exportExcel}
                className="px-2"
              >
                <FileSpreadsheet className={`h-${iconSize/4} w-${iconSize/4}`} />
                <span className="sr-only">Export Excel</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export to Excel</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={exportJSON}
                className="px-2"
              >
                <FileJson className={`h-${iconSize/4} w-${iconSize/4}`} />
                <span className="sr-only">Export JSON</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export to JSON</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handlePrint}
                className="px-2"
              >
                <Printer className={`h-${iconSize/4} w-${iconSize/4}`} />
                <span className="sr-only">Print Chart</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Print Chart</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}