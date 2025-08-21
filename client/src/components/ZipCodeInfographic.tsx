import React from 'react';
import { MapPin, Users, Map, Eye } from 'lucide-react';

interface ZipCodeInfographicProps {
  title: string;
  totalPatients: number;
  uniqueZipCodes: number;
  topZipCodes?: Array<{ zipCode: string; count: number }>;
  categoryName?: string;
}

export default function ZipCodeInfographic({ 
  title, 
  totalPatients, 
  uniqueZipCodes,
  topZipCodes,
  categoryName 
}: ZipCodeInfographicProps) {
  // Calculate percentage of top 5 ZIP codes
  const top5Total = topZipCodes?.slice(0, 5).reduce((sum, zip) => sum + zip.count, 0) || 0;
  const top5Percentage = totalPatients > 0 ? ((top5Total / totalPatients) * 100).toFixed(1) : 0;
  
  // Format ZIP code with leading zeros
  const formatZipCode = (zipCode: string): string => {
    return zipCode.padStart(5, '0');
  };
  
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-300 h-full flex flex-col">
      {/* Title */}
      <h3 className="text-base font-semibold text-gray-900 text-center mb-3">
        ZIP Code Distribution
      </h3>
      
      {/* Key Statistics */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">{totalPatients.toLocaleString()}</div>
          <div className="text-xs text-gray-600">Total Patients</div>
        </div>
        
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">{uniqueZipCodes}</div>
          <div className="text-xs text-gray-600">Unique ZIP Codes</div>
        </div>
      </div>
      
      {/* Top ZIP Codes Compact List */}
      {topZipCodes && topZipCodes.length > 0 && (
        <div className="flex-grow">
          <div className="text-xs font-semibold text-gray-700 mb-2 text-center border-b border-gray-300 pb-1">
            Top 5 ZIP Codes ({top5Percentage}% of patients)
          </div>
          <div className="space-y-1">
            {topZipCodes.slice(0, 5).map((zip, index) => (
              <div key={zip.zipCode} className="flex items-center justify-between text-xs">
                <span className="text-gray-700">
                  <span className="font-medium mr-1">#{index + 1}</span>
                  {formatZipCode(zip.zipCode)}
                </span>
                <span className="font-semibold text-gray-900">
                  {zip.count} ({((zip.count / totalPatients) * 100).toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
          {/* Additional Statistics - No spacing */}
          <div className="text-xs text-gray-600 text-center mt-0">
            Average: {(totalPatients / uniqueZipCodes).toFixed(1)} patients per ZIP
          </div>
        </div>
      )}
    </div>
  );
}