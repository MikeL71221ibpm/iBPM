import React from 'react';

interface Patient {
  zip_code?: string;
  zipCode?: string;
  [key: string]: any;
}

interface MapInfoStyleTableProps {
  data: Patient[];
}

export default function MapInfoStyleTable({ data }: MapInfoStyleTableProps) {
  // Exactly like MapInfo - count records by ZIP
  const zipCounts: Record<string, number> = {};
  
  data.forEach(patient => {
    const zip = patient.zip_code || patient.zipCode;
    if (zip && zip.toString().trim()) {
      const cleanZip = zip.toString().trim();
      zipCounts[cleanZip] = (zipCounts[cleanZip] || 0) + 1;
    }
  });

  const sortedZips = Object.entries(zipCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20);

  const totalPatients = Object.values(zipCounts).reduce((sum, count) => sum + count, 0);
  const uniqueZips = Object.keys(zipCounts).length;

  return (
    <div className="bg-white border rounded p-4 max-h-96 overflow-y-auto">
      <h3 className="font-bold text-lg mb-2">MapInfo-Style ZIP Code Analysis</h3>
      
      <div className="mb-4 p-3 bg-blue-50 rounded">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Total Records:</strong> {data.length.toLocaleString()}
          </div>
          <div>
            <strong>Records with ZIP:</strong> {totalPatients.toLocaleString()}
          </div>
          <div>
            <strong>Unique ZIP Codes:</strong> {uniqueZips}
          </div>
          <div>
            <strong>Coverage:</strong> {((totalPatients / data.length) * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Top ZIP Codes (Like MapInfo Browser)</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="font-semibold border-b pb-1">ZIP Code</div>
          <div className="font-semibold border-b pb-1">Patient Count</div>
          
          {sortedZips.map(([zip, count]) => (
            <React.Fragment key={zip}>
              <div className="font-mono py-1">{zip}</div>
              <div className="py-1">{count.toLocaleString()}</div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {sortedZips.length === 0 && (
        <div className="text-red-600 text-center py-4">
          <strong>No ZIP code data found in patient records</strong>
          <p className="text-sm mt-1">Check data field names: zip_code, zipCode</p>
        </div>
      )}
    </div>
  );
}