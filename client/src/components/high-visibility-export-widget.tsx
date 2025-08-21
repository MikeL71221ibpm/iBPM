// High Visibility Chart Export Widget
// Provides prominent, easy-to-see export functionality for any visualization

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, FileJson, Table, Download, Printer, Loader2 } from "lucide-react";
import * as XLSX from 'xlsx';

interface HighVisibilityExportWidgetProps {
  chartId: string;
  chartTitle: string;
  data: any[];
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  variant?: 'default' | 'prominent' | 'floating';
  onPrint?: () => void;
  getDetailedData?: () => any[];
}

export default function HighVisibilityExportWidget({
  chartId,
  chartTitle,
  data,
  position = 'top-right',
  variant = 'prominent',
  onPrint,
  getDetailedData
}: HighVisibilityExportWidgetProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Helper function to sanitize filename
  const sanitizeFilename = (name: string): string => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  };

  // Export to CSV
  const exportCSV = () => {
    setIsExporting(true);
    try {
      if (!data || data.length === 0) {
        toast({
          title: "Export Failed",
          description: "No data available to export",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      // Convert data to CSV string
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => 
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
      if (!data || data.length === 0) {
        toast({
          title: "Export Failed",
          description: "No data available to export",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);
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

  // Variant styles
  const getVariantClasses = () => {
    switch (variant) {
      case 'prominent':
        return 'bg-blue-600 hover:bg-blue-700 text-white shadow-md';
      case 'floating':
        return 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-full';
      default:
        return 'bg-gray-100 hover:bg-gray-200 text-gray-800';
    }
  };

  if (variant === 'floating') {
    return (
      <div 
        className={`absolute ${positionClasses[position]} z-10`}
        data-testid={`export-widget-${chartId}`}
      >
        {isExporting ? (
          <Button disabled className={`${getVariantClasses()} px-3 py-2`}>
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
            <span>Exporting...</span>
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <Button 
              onClick={exportCSV}
              className={`${getVariantClasses()} px-3 py-2 flex items-center gap-2`}
            >
              <Table className="h-4 w-4" />
              <span>CSV</span>
            </Button>
            
            <Button 
              onClick={exportExcel}
              className={`${getVariantClasses()} px-3 py-2 flex items-center gap-2`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Excel</span>
            </Button>
            
            <Button 
              onClick={handlePrint}
              className={`${getVariantClasses()} px-3 py-2 flex items-center gap-2`}
            >
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`absolute ${positionClasses[position]} z-10 ${isExporting ? 'pointer-events-none' : ''}`}
      data-testid={`export-widget-${chartId}`}
    >
      {isExporting ? (
        <Button disabled className={`${getVariantClasses()} px-3 py-2`}>
          <Loader2 className="animate-spin h-4 w-4 mr-2" />
          <span>Exporting...</span>
        </Button>
      ) : (
        <Button 
          onClick={exportCSV}
          className={`${getVariantClasses()} px-3 py-2 flex items-center gap-2 font-bold`}
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </Button>
      )}
    </div>
  );
}