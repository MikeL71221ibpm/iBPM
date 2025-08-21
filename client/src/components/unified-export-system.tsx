// Unified Export System - Final standardized export solution for all components
// Replaces ALL inconsistent export implementations across the platform
// Created: August 15, 2025

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, Table, FileSpreadsheet, Database, 
  Download, Printer, Loader2, X, ChevronDown, Clock, Check 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';

interface UnifiedExportSystemProps {
  /** Unique chart identifier */
  chartId: string;
  
  /** Chart title for filenames and UI */
  chartTitle: string;
  
  /** Chart visualization data (for summary exports) */
  chartData: any[];
  
  /** Display variant: 'icons', 'buttons', 'dropdown' */
  variant?: 'icons' | 'buttons' | 'dropdown';
  
  /** CSS classes */
  className?: string;
  
  /** Icon size */
  iconSize?: number;
  
  /** Show print option */
  showPrint?: boolean;
  
  /** Print callback */
  onPrint?: () => void;
  
  /** Show close button */
  showClose?: boolean;
  
  /** Close callback */
  onClose?: () => void;
  
  /** Show all export formats */
  showAllFormats?: boolean;
}

/**
 * Unified Export System - The single export component for the entire platform
 * 
 * Features:
 * - Summary exports: Use chart visualization data (for chart-specific exports)
 * - Detail exports: Use complete merged patient data via API (for comprehensive data exports)
 * - Consistent UI across all chart components
 * - Multiple display variants (icons, buttons, dropdown)
 * - Professional loading states and error handling
 * 
 * Export Types:
 * - Summary CSV: Chart data points only
 * - Detail CSV: Complete merged patient data (original + generated fields)
 * - Excel: Chart data in spreadsheet format
 * - JSON: Chart data in JSON format
 */
export default function UnifiedExportSystem({
  chartId,
  chartTitle,
  chartData,
  variant = 'icons',
  className = '',
  iconSize = 16,
  showPrint = true,
  onPrint,
  showClose = false,
  onClose,
  showAllFormats = true
}: UnifiedExportSystemProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [isDetailedExport, setIsDetailedExport] = useState(false);
  const { toast } = useToast();

  // Create chart-specific filters for detailed export
  const createChartFilters = (chartId: string, chartData: any[]) => {
    if (!chartData?.length) return {};
    
    console.log(`🎯 Creating filters for chart: ${chartId}`, chartData.slice(0, 3));
    
    // Extract unique identifiers/categories from chart data
    const categories = chartData.map(item => item.id || item.label || item.name).filter(Boolean);
    
    return {
      type: chartId,
      categories,
      recordCount: chartData.length
    };
  };

  const sanitizeFilename = (name: string): string => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  };

  const createDownloadLink = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Summary CSV Export (chart data)
  const handleSummaryCSV = async () => {
    if (!chartData?.length) {
      toast({
        title: "Export Error",
        description: "No chart data available to export",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      console.log('📊 SUMMARY CSV EXPORT:', chartTitle, chartData.length, 'data points');
      
      const headers = Object.keys(chartData[0])
        .filter(key => !['color', 'colorIndex', 'rawData'].includes(key))
        .join(',');
        
      const rows = chartData.map(item => 
        Object.keys(item)
          .filter(key => !['color', 'colorIndex', 'rawData'].includes(key))
          .map(key => {
            const value = item[key];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
          })
          .join(',')
      );
      
      const csvContent = `${headers}\n${rows.join('\n')}`;
      const filename = `${sanitizeFilename(chartTitle)}_summary_${new Date().toISOString().split('T')[0]}.csv`;
      
      createDownloadLink(csvContent, filename, 'text/csv;charset=utf-8;');
      
      toast({
        title: "Export Successful",
        description: `Summary CSV exported with ${chartData.length} data points`,
        variant: "default"
      });
    } catch (error) {
      console.error("Summary CSV export error:", error);
      toast({
        title: "Export Failed",
        description: "Summary CSV export failed. Please try again.",
        variant: "destructive"
      });
    }
    setIsExporting(false);
  };

  // Detailed CSV Export (complete patient data) with enhanced progress tracking
  const handleDetailedCSV = async () => {
    setIsExporting(true);
    setIsDetailedExport(true);
    setExportProgress(0);
    setExportStatus('Preparing detailed export...');
    
    try {
      console.log('🔥 DETAILED CSV EXPORT:', chartTitle, chartData?.length, 'chart records');
      
      // Show initial progress
      setExportProgress(10);
      setExportStatus('Connecting to database...');
      
      // Create filter parameters based on chart data
      const chartFilters = createChartFilters(chartId, chartData);
      
      const response = await fetch('/api/export-data-detailed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          chartId,
          chartTitle,
          filters: chartFilters
        })
      });
      
      setExportProgress(25);
      setExportStatus(`Fetching filtered patient records for ${chartTitle}...`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch detailed data: ${response.statusText}`);
      }
      
      setExportProgress(50);
      setExportStatus('Processing patient data...');
      
      const result = await response.json();
      const detailedData = result.data || [];
      
      if (!detailedData?.length) {
        setIsExporting(false);
        setIsDetailedExport(false);
        toast({
          title: "Export Error", 
          description: "No detailed patient data available for export",
          variant: "destructive"
        });
        return;
      }
      
      console.log(`✅ DETAILED DATA RECEIVED: ${detailedData.length} complete patient records`);
      
      setExportProgress(75);
      setExportStatus(`Formatting ${detailedData.length.toLocaleString()} patient records...`);
      
      const headers = Object.keys(detailedData[0])
        .filter(key => !['color', 'colorIndex', 'rawData'].includes(key))
        .join(',');
        
      const rows = detailedData.map(item => 
        Object.keys(item)
          .filter(key => !['color', 'colorIndex', 'rawData'].includes(key))
          .map(key => {
            const value = item[key];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
          })
          .join(',')
      );
      
      setExportProgress(90);
      setExportStatus('Creating download file...');
      
      const csvContent = `${headers}\n${rows.join('\n')}`;
      const filename = `${sanitizeFilename(chartTitle)}_complete_patient_data_${new Date().toISOString().split('T')[0]}.csv`;
      
      createDownloadLink(csvContent, filename, 'text/csv;charset=utf-8;');
      
      setExportProgress(100);
      setExportStatus('Export complete!');
      
      const chartInfo = result.chartTitle ? ` for ${result.chartTitle}` : '';
      
      toast({
        title: "Export Successful",
        description: `Detail Export${chartInfo}: ${detailedData.length.toLocaleString()} filtered records with all original + generated fields`,
        variant: "default"
      });
      
      // Clear progress after a brief delay
      setTimeout(() => {
        setIsDetailedExport(false);
        setExportProgress(0);
        setExportStatus('');
      }, 2000);
      
    } catch (error) {
      console.error("Detailed CSV export error:", error);
      setIsDetailedExport(false);
      setExportProgress(0);
      setExportStatus('');
      toast({
        title: "Export Failed",
        description: "Detailed CSV export failed. Please try again.",
        variant: "destructive"
      });
    }
    setIsExporting(false);
  };

  // Excel Export (summary data)
  const handleExcelExport = async () => {
    if (!chartData?.length) {
      toast({
        title: "Export Error",
        description: "No chart data available for export",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      console.log('📈 EXCEL EXPORT:', chartTitle);
      
      const worksheet = XLSX.utils.json_to_sheet(chartData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, chartTitle.substring(0, 31));
      
      const filename = `${sanitizeFilename(chartTitle)}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: "Export Successful",
        description: `Excel file exported with ${chartData.length} records`,
        variant: "default"
      });
    } catch (error) {
      console.error("Excel export error:", error);
      toast({
        title: "Export Failed",
        description: "Excel export failed. Please try again.",
        variant: "destructive"
      });
    }
    setIsExporting(false);
  };

  // JSON Export (summary data)
  const handleJSONExport = async () => {
    if (!chartData?.length) {
      toast({
        title: "Export Error",
        description: "No chart data available for export", 
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      console.log('🗂️ JSON EXPORT:', chartTitle);
      
      const jsonData = {
        chartTitle,
        chartId,
        exportDate: new Date().toISOString(),
        dataCount: chartData.length,
        data: chartData
      };
      
      const filename = `${sanitizeFilename(chartTitle)}_${new Date().toISOString().split('T')[0]}.json`;
      createDownloadLink(JSON.stringify(jsonData, null, 2), filename, 'application/json');
      
      toast({
        title: "Export Successful",
        description: `JSON file exported with ${chartData.length} records`,
        variant: "default"
      });
    } catch (error) {
      console.error("JSON export error:", error);
      toast({
        title: "Export Failed", 
        description: "JSON export failed. Please try again.",
        variant: "destructive"
      });
    }
    setIsExporting(false);
  };

  // Icon Buttons Variant
  const renderIconButtons = () => (
    <div className={`flex items-center space-x-1 bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm border ${className}`}>
      <TooltipProvider>
        {/* Summary CSV */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleSummaryCSV}
              disabled={isExporting || !chartData?.length}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Export Summary CSV</p></TooltipContent>
        </Tooltip>

        {/* Detailed CSV (Patient Detail Export) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleDetailedCSV}
              disabled={isExporting}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Table className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Patient Detail Export (Complete Data)</p></TooltipContent>
        </Tooltip>

        {/* Excel */}
        {showAllFormats && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleExcelExport}
                disabled={isExporting || !chartData?.length}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Export to Excel</p></TooltipContent>
          </Tooltip>
        )}

        {/* JSON */}
        {showAllFormats && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleJSONExport}
                disabled={isExporting || !chartData?.length}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Export to JSON</p></TooltipContent>
          </Tooltip>
        )}

        {/* Print */}
        {showPrint && onPrint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onPrint}
                disabled={isExporting}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Printer className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Print Chart</p></TooltipContent>
          </Tooltip>
        )}

        {/* Close */}
        {showClose && onClose && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={onClose} variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Close</p></TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );

  // Colored Buttons Variant
  const renderColoredButtons = () => (
    <div className={`bg-gray-900 p-2 rounded-md border border-yellow-500 mb-4 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-white font-bold mr-2 text-sm">EXPORT OPTIONS:</span>
        
        <Button size="sm" onClick={handleSummaryCSV} disabled={isExporting || !chartData?.length} className="bg-blue-600 hover:bg-blue-700 h-8 px-2 py-1">
          {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
          <span>CSV</span>
        </Button>
        
        <Button size="sm" onClick={handleDetailedCSV} disabled={isExporting} className="bg-green-600 hover:bg-green-700 h-8 px-2 py-1">
          {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Table className="h-4 w-4 mr-1" />}
          <span>Detail</span>
        </Button>

        {showAllFormats && (
          <>
            <Button size="sm" onClick={handleExcelExport} disabled={isExporting || !chartData?.length} className="bg-purple-600 hover:bg-purple-700 h-8 px-2 py-1">
              {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-1" />}
              <span>Excel</span>
            </Button>
            <Button size="sm" onClick={handleJSONExport} disabled={isExporting || !chartData?.length} className="bg-orange-600 hover:bg-orange-700 h-8 px-2 py-1">
              {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Database className="h-4 w-4 mr-1" />}
              <span>JSON</span>
            </Button>
          </>
        )}

        {showPrint && onPrint && (
          <Button size="sm" onClick={onPrint} disabled={isExporting} className="bg-gray-600 hover:bg-gray-700 h-8 px-2 py-1">
            <Printer className="h-4 w-4 mr-1" />
            <span>Print</span>
          </Button>
        )}
      </div>
    </div>
  );

  // Dropdown Menu Variant
  const renderDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting} className={className}>
          {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Export
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleSummaryCSV} disabled={!chartData?.length}>
          <FileText className="h-4 w-4 mr-2" />
          Summary CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDetailedCSV}>
          <Table className="h-4 w-4 mr-2" />
          Patient Detail CSV
        </DropdownMenuItem>
        {showAllFormats && (
          <>
            <DropdownMenuItem onClick={handleExcelExport} disabled={!chartData?.length}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleJSONExport} disabled={!chartData?.length}>
              <Database className="h-4 w-4 mr-2" />
              JSON
            </DropdownMenuItem>
          </>
        )}
        {showPrint && onPrint && (
          <DropdownMenuItem onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Progress Overlay for detailed exports
  const renderProgressOverlay = () => {
    if (!isDetailedExport) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
        <div className="bg-white rounded-lg p-8 shadow-2xl max-w-md w-full mx-4">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Database className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Exporting Complete Patient Data
              </h3>
            </div>
            
            <div className="space-y-2">
              <Progress value={exportProgress} className="w-full h-3" />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{exportProgress}%</span>
                <span>~3 minutes for large datasets</span>
              </div>
            </div>
            
            <p className="text-sm text-gray-700 min-h-[1.25rem]">
              {exportStatus}
            </p>
            
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <Clock className="h-4 w-4" />
              <span>Please keep this tab open during export</span>
            </div>
            
            {exportProgress === 100 && (
              <div className="flex items-center justify-center space-x-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="font-medium">Download started!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render based on variant
  return (
    <>
      {renderProgressOverlay()}
      {(() => {
        switch (variant) {
          case 'buttons':
            return renderColoredButtons();
          case 'dropdown':
            return renderDropdown();
          case 'icons':
          default:
            return renderIconButtons();
        }
      })()}
    </>
  );
}