// Custom React hook for standardized export functionality
// Provides consistent export behavior across all charts in the application

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface ExportData {
  success: boolean;
  data: any[];
  totalRecords: number;
  message: string;
}

interface UseStandardizedExportOptions {
  chartId: string;
  chartTitle: string;
  enabled?: boolean;
}

interface UseStandardizedExportReturn {
  exportData: any[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetchExportData: () => void;
  exportToCSV: () => void;
  exportToExcel: () => void;
  exportToJSON: () => void;
}

export function useStandardizedExport({
  chartId,
  chartTitle,
  enabled = true
}: UseStandardizedExportOptions): UseStandardizedExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Query to fetch standardized export data from the server
  const {
    data: exportResponse,
    isLoading,
    error,
    refetch
  } = useQuery<ExportData>({
    queryKey: ['standardizedExportData', chartId],
    queryFn: async () => {
      const response = await fetch('/api/export-data', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Export data request failed: ${response.statusText}`);
      }

      return response.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Helper function to sanitize filename
  const sanitizeFilename = useCallback((name: string): string => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }, []);

  // Export to CSV
  const exportToCSV = useCallback(async () => {
    if (!exportResponse?.data || exportResponse.data.length === 0) {
      toast({
        title: "Export Failed",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      // Convert data to CSV string
      const headers = Object.keys(exportResponse.data[0]).join(',');
      const rows = exportResponse.data.map(row => 
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
      const filename = `${sanitizeFilename(chartTitle)}_${new Date().toISOString().split('T')[0]}.csv`;
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: `Data exported to ${filename}`,
      });
    } catch (error) {
      console.error("CSV Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [exportResponse, chartTitle, sanitizeFilename, toast]);

  // Export to Excel
  const exportToExcel = useCallback(async () => {
    if (!exportResponse?.data || exportResponse.data.length === 0) {
      toast({
        title: "Export Failed",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      // Import XLSX dynamically
      const XLSX = await import('xlsx');
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportResponse.data);
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
      console.error("Excel Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [exportResponse, chartTitle, sanitizeFilename, toast]);

  // Export to JSON
  const exportToJSON = useCallback(async () => {
    if (!exportResponse?.data || exportResponse.data.length === 0) {
      toast({
        title: "Export Failed",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const jsonString = JSON.stringify(exportResponse.data, null, 2);
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
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: `Data exported to ${filename}`,
      });
    } catch (error) {
      console.error("JSON Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [exportResponse, chartTitle, sanitizeFilename, toast]);

  return {
    exportData: exportResponse?.data,
    isLoading: isLoading || isExporting,
    error: error as Error | null,
    refetchExportData: refetch,
    exportToCSV,
    exportToExcel,
    exportToJSON
  };
}