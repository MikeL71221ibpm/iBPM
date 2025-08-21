import React from 'react';

interface ZipCodeAgeData {
  zipCode: string;
  ageCategory: string;
  count: number;
  percentage?: number;
}

interface AgeRangeInfographicProps {
  title: string;
  totalPatients: number;
  patientData?: any[];
  categoryName: string;
}

export function AgeRangeInfographic({ 
  title, 
  totalPatients, 
  patientData,
  categoryName 
}: AgeRangeInfographicProps) {
  
  // Debug logging
  console.log("AgeRangeInfographic received:", {
    title,
    totalPatients,
    hasPatientData: !!patientData,
    patientDataLength: patientData?.length,
    samplePatient: patientData?.[0]
  });
  
  // Process patient data to get top ZIP codes by age distribution
  const processedData = React.useMemo(() => {
    if (!patientData || patientData.length === 0) return [];
    
    // Group patients by ZIP code and age range
    const zipAgeMap: Record<string, Record<string, number>> = {};
    const zipTotals: Record<string, number> = {};
    
    patientData.forEach(patient => {
      const zip = patient.zip_code || patient.Zip_Code || patient.zipCode;
      const age = patient.age_range || patient.ageRange || patient.Age_Range;
      
      if (zip && age) {
        if (!zipAgeMap[zip]) {
          zipAgeMap[zip] = {};
          zipTotals[zip] = 0;
        }
        zipAgeMap[zip][age] = (zipAgeMap[zip][age] || 0) + 1;
        zipTotals[zip]++;
      }
    });
    
    // Convert to array and find predominant age for each ZIP
    const zipData: ZipCodeAgeData[] = [];
    Object.entries(zipTotals).forEach(([zip, total]) => {
      // Find the predominant age category for this ZIP
      let maxCount = 0;
      let predominantAge = '';
      Object.entries(zipAgeMap[zip]).forEach(([age, count]) => {
        if (count > maxCount) {
          maxCount = count;
          predominantAge = age;
        }
      });
      
      zipData.push({
        zipCode: zip,
        ageCategory: predominantAge,
        count: total,
        percentage: (total / totalPatients) * 100
      });
    });
    
    // Sort by total count and return top 5
    return zipData.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [patientData, totalPatients]);
  
  const dataToDisplay = processedData;
  
  if (!dataToDisplay || dataToDisplay.length === 0) {
    return null;
  }
  
  // Calculate total for top 5
  const top5Total = dataToDisplay.reduce((sum, item) => sum + item.count, 0);
  const top5Percentage = ((top5Total / totalPatients) * 100).toFixed(0);

  return (
    <div className="w-full h-full flex flex-col bg-white p-4 rounded-lg border border-gray-300">
      {/* Title */}
      <h3 className="text-sm font-bold text-gray-800 text-center mb-3 pb-2 border-b border-gray-300">
        {title}
      </h3>
      
      {/* Top ZIP Codes List */}
      <div className="flex-grow">
        <div className="text-xs font-semibold text-gray-700 mb-2 text-center border-b border-gray-300 pb-1">
          Top 5 ZIP Codes by Age ({top5Percentage}% of patients)
        </div>
        <div className="space-y-1">
          {dataToDisplay.map((item, index) => (
            <div key={item.zipCode} className="text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">
                  <span className="font-medium mr-1">#{index + 1}</span>
                  ZIP {item.zipCode}
                </span>
                <span className="font-semibold text-gray-900">
                  {item.count} patients
                </span>
              </div>
              <div className="ml-6 text-gray-600 text-xs">
                Predominant: {item.ageCategory} 
                <br />
                <span className="text-gray-500 whitespace-nowrap">
                  {((item.percentage || 0)).toFixed(1)}% of all patients | {((item.count / top5Total * 100)).toFixed(1)}% of top&nbsp;5
                </span>
              </div>
            </div>
          ))}
        </div>
        {/* Summary Statistics */}
        <div className="text-xs text-gray-600 text-center mt-2 pt-2 border-t border-gray-200">
          Total ZIP codes: {Object.keys(patientData?.reduce((acc, p) => {
            const zip = p.zip_code || p.Zip_Code || p.zipCode;
            if (zip) acc[zip] = true;
            return acc;
          }, {}) || {}).length}
        </div>
      </div>
    </div>
  );
}