import React from 'react';
import { PivotTable } from '../utils/pivotTableUtils';

interface RawPivotDebugProps {
  pivotTables: {
    symptomPivot: PivotTable;
    diagnosisPivot: PivotTable;
    categoryPivot: PivotTable;
    problemPivot: PivotTable;
    hrsnPivot: PivotTable;
  };
}

const RawPivotDebug: React.FC<RawPivotDebugProps> = ({ pivotTables }) => {
  const renderPivotSummary = (label: string, pivot: PivotTable) => {
    return (
      <div className="mb-4 bg-white p-4 rounded border">
        <h3 className="text-lg font-bold mb-2">{label}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-1">Rows ({pivot.rows.length}):</h4>
            <div className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-20">
              {pivot.rows.join(", ")}
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-1">Columns ({pivot.columns.length}):</h4>
            <div className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-20">
              {pivot.columns.join(", ")}
            </div>
          </div>
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Show Raw Data</summary>
          <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-60">
            {JSON.stringify(pivot, null, 2)}
          </pre>
        </details>
      </div>
    );
  };

  return (
    <div className="bg-red-100 border-4 border-red-500 rounded-lg p-4 mb-6">
      <h2 className="text-xl font-bold text-red-800 mb-4">PIVOT TABLE DEBUG OUTPUT</h2>
      
      {renderPivotSummary("1. Symptom Pivot Table", pivotTables.symptomPivot)}
      {renderPivotSummary("2. Diagnosis Pivot Table", pivotTables.diagnosisPivot)}
      {renderPivotSummary("3. Category Pivot Table", pivotTables.categoryPivot)}
      {renderPivotSummary("4. Problem Pivot Table", pivotTables.problemPivot)}
      {renderPivotSummary("5. HRSN Z-Code Pivot Table", pivotTables.hrsnPivot)}
    </div>
  );
};

export default RawPivotDebug;