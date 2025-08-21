import React from 'react';
import type { PivotTable } from '@/utils/pivotTableUtils';
import type { PivotTables } from './PivotTableGenerator';

interface PivotTableDebugProps {
  pivotTables: PivotTables;
}

/**
 * Component to display debug information about pivot tables
 * Shows raw structure of all 4 pivot tables for debugging
 */
const PivotTableDebug: React.FC<PivotTableDebugProps> = ({ pivotTables }) => {
  // Helper function to format a pivot table for display
  const formatPivotTable = (table: PivotTable, name: string) => {
    // Check if table has any data
    if (!table.rows.length || !table.columns.length) {
      return (
        <div className="border rounded p-4 mb-4 bg-yellow-50">
          <h3 className="font-medium text-orange-800">{name} - Empty Table</h3>
          <p className="text-sm text-orange-700">This pivot table contains no data.</p>
        </div>
      );
    }
    
    // Return formatted information about the table
    return (
      <div className="border rounded p-4 mb-4">
        <h3 className="font-medium text-blue-800">{name}</h3>
        <div className="text-sm">
          <p><span className="font-medium">Rows:</span> {table.rows.length} ({table.rows.slice(0, 5).join(', ')}...)</p>
          <p><span className="font-medium">Columns:</span> {table.columns.length} ({table.columns.slice(0, 5).join(', ')}...)</p>
          
          {/* Add a sample of the actual data */}
          {table.rows.length > 0 && table.columns.length > 0 && (
            <div className="mt-2">
              <p className="font-medium">Sample Data:</p>
              <div className="bg-slate-50 p-2 rounded text-xs overflow-auto max-h-32">
                {table.rows.slice(0, 3).map(row => (
                  <div key={row} className="mb-1">
                    <p className="font-bold">{row}:</p>
                    <ul className="list-disc list-inside pl-2">
                      {table.columns.slice(0, 3).map(col => (
                        <li key={col}>
                          {col}: {table.data[row]?.[col]?.count || 0} occurrences
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 border-2 border-red-500 rounded-lg bg-red-50 mb-8">
      <h2 className="text-xl font-bold mb-4 text-red-700 flex items-center">
        <span className="mr-2">🔍</span>
        Pivot Table Data Inspection
      </h2>
      
      <details open className="mb-4">
        <summary className="font-bold text-red-800 cursor-pointer p-2 bg-red-100 rounded hover:bg-red-200">
          1. Symptom Segments Pivot Table
        </summary>
        <div className="mt-2">
          {formatPivotTable(pivotTables.symptomPivot, "Symptom Segments Pivot")}
        </div>
      </details>
      
      <details className="mb-4">
        <summary className="font-bold text-red-800 cursor-pointer p-2 bg-red-100 rounded hover:bg-red-200">
          2. Diagnoses Pivot Table
        </summary>
        <div className="mt-2">
          {formatPivotTable(pivotTables.diagnosisPivot, "Diagnoses Pivot")}
        </div>
      </details>
      
      <details className="mb-4">
        <summary className="font-bold text-red-800 cursor-pointer p-2 bg-red-100 rounded hover:bg-red-200">
          3. Diagnostic Categories Pivot Table
        </summary>
        <div className="mt-2">
          {formatPivotTable(pivotTables.categoryPivot, "Diagnostic Categories Pivot")}
        </div>
      </details>
      
      <details className="mb-4">
        <summary className="font-bold text-red-800 cursor-pointer p-2 bg-red-100 rounded hover:bg-red-200">
          4. Symptom Problems Pivot Table
        </summary>
        <div className="mt-2">
          {formatPivotTable(pivotTables.problemPivot, "Symptom Problems Pivot")}
        </div>
      </details>
      
      <details className="mb-4">
        <summary className="font-bold text-red-800 cursor-pointer p-2 bg-red-100 rounded hover:bg-red-200">
          5. HRSN Z-Codes Pivot Table
        </summary>
        <div className="mt-2">
          {formatPivotTable(pivotTables.hrsnPivot, "HRSN Z-Codes Pivot")}
        </div>
      </details>
    </div>
  );
};

export default PivotTableDebug;