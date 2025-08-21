import React from 'react';

interface Patient {
  zip_code?: string;
  zipCode?: string;
  [key: string]: any;
}

interface ZipTestComponentProps {
  data: Patient[];
}

export default function ZipTestComponent({ data }: ZipTestComponentProps) {
  // Count ZIP codes like MapInfo would
  const zipCounts: Record<string, number> = {};
  
  data.forEach(patient => {
    const zip = patient.zip_code || patient.zipCode;
    if (zip) {
      const normalizedZip = zip.toString().padStart(5, '0');
      zipCounts[normalizedZip] = (zipCounts[normalizedZip] || 0) + 1;
    }
  });

  const sortedZips = Object.entries(zipCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);

  return (
    <div className="bg-white border rounded p-4">
      <h3 className="font-bold mb-2">ZIP Code Test - MapInfo Style</h3>
      <p className="text-sm text-gray-600 mb-3">
        {data.length} records processed, {Object.keys(zipCounts).length} unique ZIP codes
      </p>
      
      <div className="space-y-1">
        {sortedZips.map(([zip, count]) => (
          <div key={zip} className="flex justify-between text-sm">
            <span className="font-mono">{zip}</span>
            <span>{count} patients</span>
          </div>
        ))}
      </div>
      
      {sortedZips.length === 0 && (
        <p className="text-red-500 text-sm">No ZIP code data found in records</p>
      )}
    </div>
  );
}