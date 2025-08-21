import React from 'react';
import { ChartExportButtons } from '@/components/chart-export-buttons';

/**
 * Simple demonstration of the export buttons component
 * No dependencies on chart libraries or complex state
 */
export default function ButtonsDemo() {
  // Simple mock handlers that just show alerts
  const handleExportCSV = () => {
    alert('CSV Export clicked');
  };
  
  const handleExportDetailCSV = () => {
    alert('CSV Detail Export clicked');
  };
  
  const handleExportExcel = () => {
    alert('Excel Export clicked');
  };
  
  const handleExportJSON = () => {
    alert('JSON Export clicked');
  };
  
  const handlePrint = () => {
    alert('Print clicked');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Export Buttons Demonstration</h1>
      
      <div className="p-4 border rounded-lg bg-gray-50 mb-8">
        <h2 className="text-lg font-semibold mb-4">Export Buttons Component</h2>
        <p className="mb-4">These buttons will be added to all expanded chart views:</p>
        
        <ChartExportButtons 
          onExportCSV={handleExportCSV}
          onExportDetailCSV={handleExportDetailCSV}
          onExportExcel={handleExportExcel}
          onExportJSON={handleExportJSON}
          onPrint={handlePrint}
        />
      </div>
      
      <div className="p-4 border rounded-lg bg-white">
        <h2 className="text-lg font-semibold mb-4">Implementation Features</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><span className="font-medium">All 5 Export Options:</span> CSV, CSV Detail, Excel, JSON, and Print buttons</li>
          <li><span className="font-medium">Color-Coded:</span> Blue for CSV, Green for CSV Detail, Purple for Excel, Orange for JSON, Gray for Print</li>
          <li><span className="font-medium">Optimized Design:</span> Each button includes an icon and descriptive text</li>
          <li><span className="font-medium">Placement:</span> Prominently positioned at the top of the expanded chart view</li>
          <li><span className="font-medium">Simple Implementation:</span> Lightweight component with no dependencies on chart libraries</li>
        </ul>
      </div>
    </div>
  );
}