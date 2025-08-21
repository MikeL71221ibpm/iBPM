// Enhanced Export Widget with High Visibility
// Features prominent export buttons on charts with 5 export options

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, FileJson, Table, Download, Printer, Loader2 } from "lucide-react";
import * as XLSX from 'xlsx';

interface EnhancedExportWidgetProps {
  chartId: string;
  chartTitle: string;
  data: any[];
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  showDetailedExport?: boolean;
  getDetailedData?: () => any[];
  onPrint?: () => void;
  className?: string;
}

export default function EnhancedExportWidget({
  chartId,
  chartTitle,
  data,
  position = 'top-right',
  showDetailedExport = false,
  getDetailedData,
  onPrint,
  className = ''
}: EnhancedExportWidgetProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Helper function to sanitize filename
  const sanitizeFilename = (name: string): string => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  };

  // Export to CSV (Summary data - chart visualization data)
  const exportCSV = async () => {
    setIsExporting(true);
    try {
      if (!data || data.length === 0) {
        toast({
          title: "Export Failed",
          description: "No chart data available to export",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      // Use chart data for summary export
      const headers = Object.keys(data[0])
        .filter(key => key !== 'color' && key !== 'colorIndex' && key !== 'rawData')
        .join(',');
      const rows = data.map(row => 
        Object.keys(row)
          .filter(key => key !== 'color' && key !== 'colorIndex' && key !== 'rawData')
          .map(key => {
            const value = row[key];
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return String(value);
          }).join(',')
      ).join('\n');
      
      const csvContent = `${headers}\n${rows}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const filename = `${sanitizeFilename(chartTitle)}_summary_${new Date().toISOString().split('T')[0]}.csv`;
      
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

  // Handle print functionality
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      // Default print behavior if no custom handler provided
      window.print();
    }
  };

  // Position classes
  const positionClasses = {
    'top-right': 'top-2 right-2',
    'bottom-right': 'bottom-2 right-2',
    'top-left': 'top-2 left-2',
    'bottom-left': 'bottom-2 left-2'
  };

  // Return a floating blue export button
  return (
    <div className={`absolute ${positionClasses[position]} z-10 ${className}`} data-testid={`export-${chartId}`}>
      {isExporting ? (
        <Button 
          disabled 
          className="bg-blue-600 text-white px-2 py-1 rounded-md shadow-lg"
        >
          <Loader2 className="animate-spin h-4 w-4 mr-1" />
          <span className="text-xs font-bold">Exporting...</span>
        </Button>
      ) : (
        <div className="flex flex-col gap-1">
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md shadow-lg flex items-center justify-center gap-1 font-bold text-xs"
            onClick={() => exportCSV(false)}
          >
            <Table className="h-3 w-3" />
            <span>CSV</span>
          </Button>
          
          {showDetailedExport && getDetailedData && (
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md shadow-lg flex items-center justify-center gap-1 font-bold text-xs"
              onClick={() => exportCSV(true)}
            >
              <Download className="h-3 w-3" />
              <span>Detailed</span>
            </Button>
          )}
          
          <Button 
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md shadow-lg flex items-center justify-center gap-1 font-bold text-xs"
            onClick={exportExcel}
          >
            <FileSpreadsheet className="h-3 w-3" />
            <span>Excel</span>
          </Button>
          
          <Button 
            className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded-md shadow-lg flex items-center justify-center gap-1 font-bold text-xs"
            onClick={exportJSON}
          >
            <FileJson className="h-3 w-3" />
            <span>JSON</span>
          </Button>
          
          <Button 
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md shadow-lg flex items-center justify-center gap-1 font-bold text-xs"
            onClick={handlePrint}
          >
            <Printer className="h-3 w-3" />
            <span>Print</span>
          </Button>
        </div>
      )}
    </div>
  );
}