// Universal Export Widget - Standardized export functionality for all charts
// Provides consistent export options: Summary (chart data) and Detail (complete merged patient data)
// Created: August 15, 2025

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { 
  FileSpreadsheet, FileJson, Table, Download, Printer, 
  Loader2, X, FileText, Database 
} from "lucide-react";
import * as XLSX from 'xlsx';
import { exportToCSV, exportToDetailedCSV, exportToExcel, exportToJSON } from "@/lib/chart-export-functions";

interface UniversalExportWidgetProps {
  chartId: string;
  chartTitle: string;
  chartData: any[]; // Summary chart data for visualization
  className?: string;
  onPrint?: () => void;
  iconSize?: number;
  onClose?: () => void;
  showCloseButton?: boolean;
  variant?: 'icons' | 'buttons' | 'dropdown'; // Display style
  showAllOptions?: boolean; // Show all export options or just key ones
}

export default function UniversalExportWidget({
  chartId,
  chartTitle,
  chartData,
  className = '',
  onPrint,
  iconSize = 16,
  onClose,
  showCloseButton = true,
  variant = 'icons',
  showAllOptions = true
}: UniversalExportWidgetProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  console.log('🚀 UNIVERSAL EXPORT WIDGET RENDERED:', { 
    chartId, 
    chartTitle, 
    dataLength: chartData?.length,
    variant 
  });

  // Helper function to sanitize filename
  const sanitizeFilename = (name: string): string => {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  };

  // Summary CSV Export (chart visualization data)
  const handleSummaryCSV = async () => {
    setIsExporting(true);
    console.log('📊 SUMMARY CSV EXPORT:', chartTitle);
    try {
      await exportToCSV(chartData, sanitizeFilename(chartTitle), toast);
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

  // Detailed CSV Export (complete merged patient data)
  const handleDetailedCSV = async () => {
    setIsExporting(true);
    console.log('🔥 DETAILED CSV EXPORT:', chartTitle);
    try {
      await exportToDetailedCSV(chartData, sanitizeFilename(chartTitle), toast);
    } catch (error) {
      console.error("Detailed CSV export error:", error);
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
    setIsExporting(true);
    console.log('📈 EXCEL EXPORT:', chartTitle);
    try {
      await exportToExcel(chartData, sanitizeFilename(chartTitle), toast);
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
    setIsExporting(true);
    console.log('🗂️ JSON EXPORT:', chartTitle);
    try {
      await exportToJSON(chartData, sanitizeFilename(chartTitle), toast);
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

  // Render as icon buttons (default)
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
              {isExporting ? (
                <Loader2 className={`h-${iconSize/4} w-${iconSize/4} animate-spin`} />
              ) : (
                <FileText className={`h-${iconSize/4} w-${iconSize/4}`} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export Summary CSV (chart data)</p>
          </TooltipContent>
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
              {isExporting ? (
                <Loader2 className={`h-${iconSize/4} w-${iconSize/4} animate-spin`} />
              ) : (
                <Table className={`h-${iconSize/4} w-${iconSize/4}`} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Patient Detail Export (complete merged data)</p>
          </TooltipContent>
        </Tooltip>

        {/* Excel Export */}
        {showAllOptions && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleExcelExport}
                disabled={isExporting || !chartData?.length}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                {isExporting ? (
                  <Loader2 className={`h-${iconSize/4} w-${iconSize/4} animate-spin`} />
                ) : (
                  <FileSpreadsheet className={`h-${iconSize/4} w-${iconSize/4}`} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export to Excel (summary data)</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* JSON Export */}
        {showAllOptions && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleJSONExport}
                disabled={isExporting || !chartData?.length}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                {isExporting ? (
                  <Loader2 className={`h-${iconSize/4} w-${iconSize/4} animate-spin`} />
                ) : (
                  <Database className={`h-${iconSize/4} w-${iconSize/4}`} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export to JSON (summary data)</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Print */}
        {onPrint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onPrint}
                disabled={isExporting}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Printer className={`h-${iconSize/4} w-${iconSize/4}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Print Chart</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Close */}
        {showCloseButton && onClose && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <X className={`h-${iconSize/4} w-${iconSize/4}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Close</p>
            </TooltipContent>
          </Tooltip>
        )}

      </TooltipProvider>
    </div>
  );

  // Render as colored buttons
  const renderColoredButtons = () => (
    <div className={`bg-gray-900 p-2 rounded-md border border-yellow-500 mb-4 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-white font-bold mr-2 text-sm">EXPORT OPTIONS:</span>
        
        {/* Summary CSV */}
        <Button 
          size="sm" 
          onClick={handleSummaryCSV}
          disabled={isExporting || !chartData?.length}
          className="bg-blue-600 hover:bg-blue-700 h-8 px-2 py-1"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 mr-1" />
          )}
          <span>CSV</span>
        </Button>
        
        {/* Detailed CSV */}
        <Button 
          size="sm" 
          onClick={handleDetailedCSV}
          disabled={isExporting}
          className="bg-green-600 hover:bg-green-700 h-8 px-2 py-1"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Table className="h-4 w-4 mr-1" />
          )}
          <span>Detail</span>
        </Button>

        {/* Excel */}
        {showAllOptions && (
          <Button 
            size="sm" 
            onClick={handleExcelExport}
            disabled={isExporting || !chartData?.length}
            className="bg-purple-600 hover:bg-purple-700 h-8 px-2 py-1"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-1" />
            )}
            <span>Excel</span>
          </Button>
        )}

        {/* JSON */}
        {showAllOptions && (
          <Button 
            size="sm" 
            onClick={handleJSONExport}
            disabled={isExporting || !chartData?.length}
            className="bg-orange-600 hover:bg-orange-700 h-8 px-2 py-1"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-1" />
            )}
            <span>JSON</span>
          </Button>
        )}

        {/* Print */}
        {onPrint && (
          <Button 
            size="sm" 
            onClick={onPrint}
            disabled={isExporting}
            className="bg-gray-600 hover:bg-gray-700 h-8 px-2 py-1"
          >
            <Printer className="h-4 w-4 mr-1" />
            <span>Print</span>
          </Button>
        )}
      </div>
    </div>
  );

  // Render based on variant
  switch (variant) {
    case 'buttons':
      return renderColoredButtons();
    case 'icons':
    default:
      return renderIconButtons();
  }
}