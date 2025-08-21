import React, { useMemo } from 'react';

interface Patient {
  zip_code?: string;
  zipCode?: string;
  [key: string]: any;
}

interface SimpleMapInfoCloneProps {
  data: Patient[];
}

export default function SimpleMapInfoClone({ data }: SimpleMapInfoCloneProps) {
  
  // STEP 1: Count patients by ZIP (exactly like MapInfo table join)
  const zipCounts = useMemo(() => {
    console.log('🗺️ MapInfo Processing - Data received:', data?.length || 0, 'patients');
    
    const counts: Record<string, number> = {};
    
    data.forEach(patient => {
      const zip = patient.zip_code || patient.zipCode;
      if (zip && zip.toString().trim()) {
        // Normalize to 5-digit like MapInfo would
        const normalizedZip = zip.toString().padStart(5, '0');
        counts[normalizedZip] = (counts[normalizedZip] || 0) + 1;
      }
    });
    
    console.log('🗺️ MapInfo Results - ZIP Counts:', Object.keys(counts).length, 'unique ZIPs');
    console.log('🗺️ Top 5 ZIPs:', Object.entries(counts).sort(([,a], [,b]) => b - a).slice(0, 5));
    
    return counts;
  }, [data]);

  // STEP 2: Calculate totals
  const totalPatients = Object.values(zipCounts).reduce((sum, count) => sum + count, 0);
  const uniqueZips = Object.keys(zipCounts).length;

  // STEP 3: Get top ZIP codes (like MapInfo ranking)
  const topZips = Object.entries(zipCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 15);

  return (
    <div className="bg-white border rounded p-4">
      <h3 className="font-bold text-lg mb-4">ZIP Code Patient Distribution</h3>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-center">
        <div className="bg-blue-50 p-3 rounded">
          <div className="text-2xl font-bold text-blue-700">{totalPatients.toLocaleString()}</div>
          <div className="text-sm text-blue-600">Total Patients</div>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <div className="text-2xl font-bold text-green-700">{uniqueZips}</div>
          <div className="text-sm text-green-600">ZIP Codes</div>
        </div>
        <div className="bg-purple-50 p-3 rounded">
          <div className="text-2xl font-bold text-purple-700">{Math.round(totalPatients / uniqueZips)}</div>
          <div className="text-sm text-purple-600">Avg/ZIP</div>
        </div>
      </div>

      {/* ZIP Code Table (like MapInfo table view) */}
      <div className="space-y-2">
        <h4 className="font-semibold text-gray-700">Top ZIP Codes by Patient Count</h4>
        <div className="bg-gray-50 rounded overflow-hidden">
          <div className="grid grid-cols-3 gap-4 p-3 bg-gray-200 font-semibold text-sm">
            <div>ZIP Code</div>
            <div>Patients</div>
            <div>Percentage</div>
          </div>
          {topZips.map(([zip, count], index) => (
            <div key={zip} className={`grid grid-cols-3 gap-4 p-3 text-sm ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
              <div className="font-mono font-semibold">{zip}</div>
              <div>{count.toLocaleString()}</div>
              <div>{((count / totalPatients) * 100).toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnostic Information */}
      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <div className="font-semibold text-yellow-800 mb-2">MapInfo-Style Diagnostic</div>
        <div className="space-y-1 text-yellow-700">
          <div>✓ Data Source: Patient records with ZIP codes</div>
          <div>✓ ZIP Normalization: 4-digit → 5-digit (3034 → 03034)</div>
          <div>✓ Aggregation: COUNT(*) GROUP BY normalized_zip</div>
          <div>✓ Sorting: ORDER BY patient_count DESC</div>
        </div>
      </div>

      {/* Raw Data for Debugging - Collapsed by default */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold text-gray-600">
          View Raw ZIP Data (for debugging)
        </summary>
        <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono max-h-40 overflow-y-auto">
          {JSON.stringify(zipCounts, null, 2)}
        </div>
      </details>
    </div>
  );
}