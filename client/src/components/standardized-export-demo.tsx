// Demo component showing the new standardized export widget in action
// This demonstrates how to replace existing export implementations

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StandardizedExportWidget from './standardized-export-widget';
import { useStandardizedExport } from '@/hooks/use-standardized-export';
import { Loader2 } from 'lucide-react';

interface StandardizedExportDemoProps {
  className?: string;
}

export default function StandardizedExportDemo({ className }: StandardizedExportDemoProps) {
  const chartId = 'demo-chart';
  const chartTitle = 'Patient Data Export Demo';

  // Use the standardized export hook
  const {
    exportData,
    isLoading,
    error,
    refetchExportData,
    exportToCSV,
    exportToExcel,
    exportToJSON
  } = useStandardizedExport({
    chartId,
    chartTitle,
    enabled: true
  });

  return (
    <Card className={`w-full max-w-4xl mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {chartTitle}
          <div className="flex items-center space-x-2">
            {/* New Standardized Export Widget */}
            <StandardizedExportWidget
              chartId={chartId}
              chartTitle={chartTitle}
              data={exportData || []}
              originalData={exportData || []}
              className="flex space-x-1"
              iconSize={16}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading export data...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">Error loading data: {error.message}</p>
            <Button onClick={refetchExportData} variant="outline">
              Retry
            </Button>
          </div>
        ) : exportData ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ Export Data Ready</h3>
              <p className="text-green-700">
                Found {exportData.length} patient records with original data fields plus generated columns.
              </p>
              <p className="text-sm text-green-600 mt-1">
                Sample columns: {Object.keys(exportData[0] || {}).slice(0, 8).join(', ')}...
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-md p-4">
                <h4 className="font-semibold mb-2">Export as CSV</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Original data fields + generated columns in CSV format
                </p>
                <Button onClick={exportToCSV} variant="outline" className="w-full">
                  Download CSV
                </Button>
              </div>

              <div className="border rounded-md p-4">
                <h4 className="font-semibold mb-2">Export as Excel</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Structured spreadsheet with all data fields
                </p>
                <Button onClick={exportToExcel} variant="outline" className="w-full">
                  Download Excel
                </Button>
              </div>

              <div className="border rounded-md p-4">
                <h4 className="font-semibold mb-2">Export as JSON</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Machine-readable format for data integration
                </p>
                <Button onClick={exportToJSON} variant="outline" className="w-full">
                  Download JSON
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Data Format Overview</h4>
              <div className="text-blue-700 text-sm space-y-1">
                <p><strong>Generated columns first:</strong> A, B, C, D (system-created fields)</p>
                <p><strong>Original data fields:</strong> Exactly as uploaded by the user</p>
                <p><strong>Consistent across all charts:</strong> Same export format everywhere</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No export data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}