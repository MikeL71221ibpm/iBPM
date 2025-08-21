import React from 'react';
import { pivotDataFromSymptoms } from '../utils/pivotTableUtils';
import type { ExtractedSymptom } from './DataProcessing';

interface DirectPivotDisplayProps {
  symptoms: ExtractedSymptom[];
}

const DirectPivotDisplay: React.FC<DirectPivotDisplayProps> = ({ symptoms }) => {
  // Generate the pivot tables directly
  const symptomPivot = pivotDataFromSymptoms(symptoms, 'symptomSegment', 'dosDate');
  const diagnosisPivot = pivotDataFromSymptoms(symptoms, 'diagnosis', 'dosDate');
  const categoryPivot = pivotDataFromSymptoms(symptoms, 'diagnosticCategory', 'dosDate');
  const problemPivot = pivotDataFromSymptoms(symptoms, 'sympProb', 'dosDate');
  const hrsnPivot = pivotDataFromSymptoms(symptoms, 'ZCode_HRSN', 'dosDate');

  return (
    <div className="space-y-12 my-8">
      <div className="border-4 border-red-600 p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-4">1. SYMPTOM PIVOT TABLE</h2>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-xs">
          {JSON.stringify(symptomPivot, null, 2)}
        </pre>
      </div>

      <div className="border-4 border-red-600 p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-4">2. DIAGNOSIS PIVOT TABLE</h2>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-xs">
          {JSON.stringify(diagnosisPivot, null, 2)}
        </pre>
      </div>

      <div className="border-4 border-red-600 p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-4">3. DIAGNOSTIC CATEGORY PIVOT TABLE</h2>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-xs">
          {JSON.stringify(categoryPivot, null, 2)}
        </pre>
      </div>

      <div className="border-4 border-red-600 p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-4">4. SYMPTOM PROBLEM PIVOT TABLE</h2>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-xs">
          {JSON.stringify(problemPivot, null, 2)}
        </pre>
      </div>

      <div className="border-4 border-red-600 p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-4">5. HRSN Z-CODE PIVOT TABLE</h2>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-xs">
          {JSON.stringify(hrsnPivot, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default DirectPivotDisplay;