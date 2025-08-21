import React, { useMemo } from 'react';

interface GenderInfographicProps {
  title: string;
  totalPatients: number;
  patientData?: any[];
  categoryName: string;
}

export function GenderInfographic({ 
  title, 
  totalPatients, 
  patientData,
  categoryName 
}: GenderInfographicProps) {
  
  // Process patient data to find top ZIP codes and their predominant gender
  const processedData = useMemo(() => {
    if (!patientData || patientData.length === 0) return [];
    
    // Group patients by ZIP code
    const zipGroups = patientData.reduce((acc: any, patient: any) => {
      const zip = patient.zip_code || 'Unknown';
      if (!acc[zip]) {
        acc[zip] = {
          zipCode: zip,
          patients: [],
          genderCounts: {},
          count: 0
        };
      }
      acc[zip].patients.push(patient);
      acc[zip].count++;
      
      // Count genders within this ZIP code
      const gender = patient.gender || 'Unknown';
      acc[zip].genderCounts[gender] = (acc[zip].genderCounts[gender] || 0) + 1;
      
      return acc;
    }, {});
    
    // Convert to array and find predominant gender for each ZIP
    const zipData = Object.values(zipGroups).map((group: any) => {
      // Find predominant gender
      let predominantGender = 'Unknown';
      let maxCount = 0;
      
      Object.entries(group.genderCounts).forEach(([gender, count]: [string, any]) => {
        if (count > maxCount) {
          maxCount = count;
          predominantGender = gender;
        }
      });
      
      return {
        zipCode: group.zipCode,
        count: group.count,
        gender: predominantGender,
        percentage: (group.count / totalPatients) * 100
      };
    });
    
    // Sort by total count and return top 5
    return zipData.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [patientData, totalPatients]);
  
  const dataToDisplay = processedData;
  
  if (!dataToDisplay || dataToDisplay.length === 0) {
    return null;
  }
  
  const top5Total = dataToDisplay.reduce((sum, item) => sum + item.count, 0);
  const uniqueZipCodes = patientData ? Array.from(new Set(patientData.map((p: any) => p.zip_code))).length : 0;

  return (
    <div className="w-full h-full flex flex-col p-1">
      {/* Title */}
      <h3 className="text-xs font-bold text-gray-900 mb-1">
        {title}
      </h3>
      
      {/* Top ZIP Codes Compact List */}
      <div className="space-y-1 text-xs">
        <div className="font-semibold text-gray-700 pb-1 border-b border-gray-200">
          Top ZIP Codes by Patient Count
        </div>
        {dataToDisplay.map((item, index) => (
          <div key={item.zipCode}>
            <div className="flex items-start">
              <span className="text-gray-900 font-medium">
                #{index + 1}
              </span>
              <span className="text-gray-900 ml-1">
                ZIP {item.zipCode}
              </span>
              <span className="ml-2">
                <span className="font-semibold text-gray-900">
                  {item.count} patients
                </span>
              </span>
            </div>
            <div className="ml-6 text-gray-600 text-xs">
              Predominant: {item.gender} 
              <br />
              <span className="text-gray-500 whitespace-nowrap">
                {((item.percentage || 0)).toFixed(1)}% of all patients | {((item.count / top5Total * 100)).toFixed(1)}% of top&nbsp;5
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary Statistics */}
      <div className="mt-2 pt-1 border-t border-gray-200 text-center">
        <div className="text-xs text-gray-600">
          Total ZIP codes: {uniqueZipCodes}
        </div>
      </div>
    </div>
  );
}