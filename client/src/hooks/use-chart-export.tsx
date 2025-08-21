import React, { useRef, useEffect } from 'react';
import { exportChartAsPng, exportChartAsPdf, makeChartExportable } from '@/utils/chart-export';
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { FileDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Custom hook to make chart elements exportable
 * @param chartId Unique identifier for the chart
 * @param chartTitle Title of the chart for file naming
 */
export function useChartExport(chartId: string, chartTitle: string) {
  const chartRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Make the chart exportable when the component mounts
    makeChartExportable(chartRef.current, chartId);
  }, [chartId]);
  
  return {
    chartRef,
    exportToPng: () => exportChartAsPng(chartId, chartTitle),
    exportToPdf: () => exportChartAsPdf(chartId, chartTitle)
  };
}

/**
 * Chart container that automatically makes its children exportable
 */
export function ExportableChartContainer({ 
  chartId, 
  chartTitle, 
  children,
  className = ""
}: { 
  chartId: string; 
  chartTitle: string; 
  children: React.ReactNode;
  className?: string;
}) {
  const { chartRef } = useChartExport(chartId, chartTitle);
  
  return (
    <div 
      ref={chartRef} 
      data-chart-id={chartId}
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * Button component for exporting charts
 */
export function ChartExportButton({ 
  chartId, 
  chartTitle, 
  className = "" 
}: { 
  chartId: string; 
  chartTitle: string; 
  className?: string;
}) {
  const handleExportPng = async () => {
    await exportChartAsPng(chartId, chartTitle);
  };
  
  const handleExportPdf = async () => {
    await exportChartAsPdf(chartId, chartTitle);
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={`h-7 px-2 text-xs ${className}`}
        >
          <FileDown className="h-4 w-4 mr-1" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPng}>
          Export as PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPdf}>
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Simple print button for charts
 */
export function ChartPrintButton({ 
  chartId, 
  chartTitle, 
  className = ""
}: { 
  chartId: string; 
  chartTitle: string; 
  className?: string;
}) {
  const handlePrint = async () => {
    await exportChartAsPdf(chartId, chartTitle);
  };
  
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handlePrint}
      className={`h-7 px-2 text-xs ${className}`}
    >
      <Printer className="h-4 w-4 mr-1" />
      Print
    </Button>
  );
}