// Standardized Export Widget - Universal component for all chart exports
// Replaces inconsistent export implementations across the application

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, Code2 } from 'lucide-react';
import { useStandardizedExport } from '@/hooks/use-standardized-export';
import { cn } from '@/lib/utils';

interface StandardizedExportWidgetProps {
  /** Unique identifier for the chart/component */
  chartId: string;
  
  /** Display title for the chart/component */
  chartTitle: string;
  
  /** Current chart data (displayed data) - used for fallback if needed */
  data?: any[];
  
  /** Original complete data set - not used in standardized version */
  originalData?: any[];
  
  /** Custom CSS classes */
  className?: string;
  
  /** Size of icons */
  iconSize?: number;
  
  /** Whether to show as dropdown menu (default) or individual buttons */
  variant?: 'dropdown' | 'buttons';
}

/**
 * Universal Export Widget providing standardized export functionality across all charts.
 * 
 * Features:
 * - Consistent export behavior across the entire application
 * - Returns original user data fields + generated columns in proper order
 * - Supports CSV, Excel, and JSON export formats
 * - Uses authenticated API endpoint for data retrieval
 * - Professional UI with proper loading states
 * 
 * Usage:
 * Replace existing custom export buttons/logic in chart components with:
 * 
 * <StandardizedExportWidget
 *   chartId="unique-chart-id"
 *   chartTitle="Chart Display Name"
 *   data={chartData}
 * />
 */
export default function StandardizedExportWidget({
  chartId,
  chartTitle,
  data = [],
  originalData = [],
  className,
  iconSize = 16,
  variant = 'dropdown'
}: StandardizedExportWidgetProps) {
  
  // Use the standardized export hook
  const {
    exportData,
    isLoading,
    error,
    exportToCSV,
    exportToExcel,
    exportToJSON
  } = useStandardizedExport({
    chartId,
    chartTitle,
    enabled: true
  });

  // Don't render if there's no data available
  if ((!exportData || exportData.length === 0) && (!data || data.length === 0)) {
    return null;
  }

  // Dropdown variant (default)
  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isLoading}
            className={cn("h-8", className)}
          >
            <Download size={iconSize} className="mr-1" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem 
            onClick={exportToCSV}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <FileText size={iconSize} className="mr-2" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={exportToExcel}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <FileSpreadsheet size={iconSize} className="mr-2" />
            Export as Excel
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={exportToJSON}
            disabled={isLoading}
            className="cursor-pointer"
          >
            <Code2 size={iconSize} className="mr-2" />
            Export as JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Individual buttons variant
  return (
    <div className={cn("flex space-x-1", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={exportToCSV}
        disabled={isLoading}
        className="h-8 px-2"
        title="Export as CSV"
      >
        <FileText size={iconSize} />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportToExcel}
        disabled={isLoading}
        className="h-8 px-2"
        title="Export as Excel"
      >
        <FileSpreadsheet size={iconSize} />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportToJSON}
        disabled={isLoading}
        className="h-8 px-2"
        title="Export as JSON"
      >
        <Code2 size={iconSize} />
      </Button>
    </div>
  );
}