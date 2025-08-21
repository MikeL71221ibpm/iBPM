import React from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, FileText, FileSpreadsheet, Database, Printer } from 'lucide-react';

export interface ChartExportButtonsProps {
  onExportCSV?: () => void;
  onExportDetailCSV?: () => void;
  onExportExcel?: () => void;
  onExportJSON?: () => void;
  onPrint?: () => void;
}

/**
 * Simple export buttons component with no dependencies on chart libraries
 * Provides color-coded buttons for all 5 export options
 */
export function ChartExportButtons({
  onExportCSV,
  onExportDetailCSV,
  onExportExcel,
  onExportJSON,
  onPrint
}: ChartExportButtonsProps) {
  return (
    <div className="bg-gray-900 p-2 rounded-md border border-yellow-500 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-white font-bold mr-2 text-sm">EXPORT OPTIONS:</span>
        
        {onExportCSV && (
          <Button 
            size="sm" 
            onClick={onExportCSV}
            className="bg-blue-600 hover:bg-blue-700 h-8 px-2 py-1"
          >
            <FileDown className="h-4 w-4 mr-1" />
            <span>CSV</span>
          </Button>
        )}
        
        {onExportDetailCSV && (
          <Button 
            size="sm" 
            onClick={() => {
              console.log('🔥🔥🔥 CSV DETAIL BUTTON CLICKED! 🔥🔥🔥');
              onExportDetailCSV();
            }}
            className="bg-green-600 hover:bg-green-700 h-8 px-2 py-1"
          >
            <FileText className="h-4 w-4 mr-1" />
            <span>CSV Detail</span>
          </Button>
        )}
        
        {onExportExcel && (
          <Button 
            size="sm" 
            onClick={onExportExcel}
            className="bg-purple-600 hover:bg-purple-700 h-8 px-2 py-1"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            <span>Excel</span>
          </Button>
        )}
        
        {onExportJSON && (
          <Button 
            size="sm" 
            onClick={onExportJSON}
            className="bg-orange-600 hover:bg-orange-700 h-8 px-2 py-1"
          >
            <Database className="h-4 w-4 mr-1" />
            <span>JSON</span>
          </Button>
        )}
        
        {onPrint && (
          <Button 
            size="sm" 
            onClick={onPrint}
            className="bg-gray-600 hover:bg-gray-700 h-8 px-2 py-1"
          >
            <Printer className="h-4 w-4 mr-1" />
            <span>Print</span>
          </Button>
        )}
      </div>
    </div>
  );
}