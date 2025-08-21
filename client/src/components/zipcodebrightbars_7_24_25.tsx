// ZIP Code Bright Bars Component - 7/24/25
// Saved format showing ZIP codes as colorful horizontal bars with patient counts
// This format may be offered as a toggle option for customers who prefer this visualization

import React, { useState, useEffect } from 'react';

interface ZipCodeBrightBarsProps {
  data?: any[];
  title?: string;
  categoryName?: string;
  colorScheme?: any;
  filterBy?: any;
  dualSourceHrsnData?: any;
  compactMode?: boolean;
}

const ZipCodeBrightBars: React.FC<ZipCodeBrightBarsProps> = ({ 
  data = [], 
  title = "ZIP Code Geographic Distribution",
  compactMode = true 
}) => {
  const [zipCodeCounts, setZipCodeCounts] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (data && data.length > 0) {
      console.log("🗺️ ZipCodeBrightBars: Processing", data.length, "patients");
      
      const counts = new Map<string, number>();
      let validZipCount = 0;
      
      data.forEach(patient => {
        const zipCode = patient.zip_code || patient.zipCode || patient.zip;
        if (zipCode) {
          // Normalize ZIP code
          const normalizedZip = zipCode.toString().trim().padStart(5, '0');
          counts.set(normalizedZip, (counts.get(normalizedZip) || 0) + 1);
          validZipCount++;
        }
      });
      
      console.log("🗺️ ZIP code processing complete:", {
        totalPatients: data.length,
        patientsWithZip: validZipCount,
        uniqueZipCodes: counts.size,
        topZipCodes: Array.from(counts.entries()).sort(([,a], [,b]) => b - a).slice(0, 5)
      });
      
      setZipCodeCounts(counts);
    }
    setIsLoading(false);
  }, [data]);

  const topZipCodes = Array.from(zipCodeCounts.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);

  return (
    <div className={`bg-white rounded-lg border ${compactMode ? 'h-64' : 'h-96'}`}>
      <div className="p-4 h-full">
        <h4 className="font-bold text-gray-800 mb-3 text-sm">{title}</h4>
        
        <div className="h-full bg-gradient-to-br from-blue-50 to-green-50 rounded border-2 border-blue-200 p-4 overflow-auto">
          {!isLoading ? (
            <div className="space-y-2">
              <div className="text-center mb-4">
                <div className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  📍 Geographic Distribution
                </div>
              </div>
              
              {topZipCodes.length > 0 ? (
                <>
                  <div className="text-xs text-gray-700 mb-3 text-center">
                    <strong>Top ZIP Codes by Patient Count</strong>
                  </div>
                  
                  <div className="space-y-1">
                    {topZipCodes.map(([zipCode, count], index) => {
                      const percentage = ((count / data.length) * 100).toFixed(1);
                      const barWidth = Math.max((count / topZipCodes[0][1]) * 100, 10);
                      
                      return (
                        <div key={zipCode} className="flex items-center space-x-2 text-xs">
                          <div className="w-12 text-right font-mono text-gray-700">
                            {zipCode}
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                            <div 
                              className={`h-4 rounded-full bg-gradient-to-r ${
                                index === 0 ? 'from-red-400 to-red-600' :
                                index === 1 ? 'from-orange-400 to-orange-600' :
                                index === 2 ? 'from-yellow-400 to-yellow-600' :
                                'from-blue-400 to-blue-600'
                              }`}
                              style={{ width: `${barWidth}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-xs">
                              {count} ({percentage}%)
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-blue-200 text-center">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>📊 Total ZIP Codes: <span className="font-semibold">{zipCodeCounts.size}</span></div>
                      <div>👥 Total Patients: <span className="font-semibold">{data.length}</span></div>
                      <div>🌍 Multi-State Coverage: <span className="font-semibold">MD, NY, PA, LA, IL</span></div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 text-sm">
                  <div className="mb-2">📍</div>
                  <div>No ZIP code data available</div>
                  <div className="text-xs mt-1">{data.length} patients processed</div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-block animate-spin h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                <p className="mt-2 text-gray-600 text-sm">Processing geographic data...</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-2 text-xs text-gray-600">
          <p>Geographic visualization showing patient density across regions</p>
        </div>
      </div>
    </div>
  );
};

export default ZipCodeBrightBars;