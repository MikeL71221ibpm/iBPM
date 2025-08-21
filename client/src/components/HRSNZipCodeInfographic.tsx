import React, { useEffect, useState, useMemo } from 'react';

interface HRSNZipCodeInfographicProps {
  title: string;
  totalPatients: number;
  affectedCount: number;
  categoryName: string;
  patientData?: any[];
  extractedSymptoms?: any[];
}

export default function HRSNZipCodeInfographic({ 
  title, 
  totalPatients, 
  affectedCount,
  categoryName,
  patientData,
  extractedSymptoms
}: HRSNZipCodeInfographicProps) {
  
  // The HRSN data is already processed and available
  // We just need to use the affectedCount that's passed as a prop
  const affectedPercentage = totalPatients > 0 ? (affectedCount / totalPatients) : 0;
  

  
  // Get top 5 ZIP codes by estimated affected patients with demographic analysis
  const getTopZipCodes = () => {
    if (!patientData || patientData.length === 0) return [];
    
    // The affected percentage is already calculated above
    
    const zipData: Record<string, { 
      total: number; 
      estimatedAffected: number;
      demographics: {
        ages: Record<string, number>;
        genders: Record<string, number>;
        races: Record<string, number>;
        ethnicities: Record<string, number>;
      };
    }> = {};
    
    // Count patients per ZIP code and estimate affected based on HRSN percentage
    patientData.forEach(patient => {
      const zip = patient.zip_code || patient.zipCode || patient.zip;
      if (zip) {
        if (!zipData[zip]) {
          zipData[zip] = { 
            total: 0, 
            estimatedAffected: 0,
            demographics: {
              ages: {},
              genders: {},
              races: {},
              ethnicities: {}
            }
          };
        }
        zipData[zip].total++;
        
        // Track demographics for all patients in this ZIP
        const age = patient.age_range || patient.ageRange || patient.Age_Range;
        const gender = patient.gender || patient.Gender;
        const race = patient.race || patient.Race;
        const ethnicity = patient.ethnicity || patient.Ethnicity;
        
        if (age) zipData[zip].demographics.ages[age] = (zipData[zip].demographics.ages[age] || 0) + 1;
        if (gender) zipData[zip].demographics.genders[gender] = (zipData[zip].demographics.genders[gender] || 0) + 1;
        if (race) zipData[zip].demographics.races[race] = (zipData[zip].demographics.races[race] || 0) + 1;
        if (ethnicity) zipData[zip].demographics.ethnicities[ethnicity] = (zipData[zip].demographics.ethnicities[ethnicity] || 0) + 1;
      }
    });
    
    // Calculate estimated affected patients per ZIP based on HRSN percentage
    // For low-prevalence conditions, use a minimum of 1 if any patients exist in that ZIP
    Object.values(zipData).forEach(data => {
      const estimatedRaw = data.total * affectedPercentage;
      // If we have patients in this ZIP and the HRSN affects at least some patients overall,
      // ensure we show at least 1 estimated affected (for visualization purposes)
      data.estimatedAffected = estimatedRaw > 0.1 ? Math.max(1, Math.round(estimatedRaw)) : 0;
    });
    
    // Get top 5 ZIP codes by total patient count (proxy for affected concentration)
    // For low-prevalence conditions, sort by total patients as a proxy
    return Object.entries(zipData)
      .sort(([,a], [,b]) => {
        // First sort by estimated affected (if available)
        if (a.estimatedAffected !== b.estimatedAffected) {
          return b.estimatedAffected - a.estimatedAffected;
        }
        // Then by total count as a tiebreaker
        return b.total - a.total;
      })
      .slice(0, 5)
      .map(([zipCode, data]) => {
        // Find predominant demographic category for this ZIP
        let predominantCategory = '';
        let maxCount = 0;
        
        // Check each demographic type to find the most common
        Object.entries(data.demographics.ethnicities).forEach(([ethnicity, count]) => {
          if (count > maxCount) {
            maxCount = count;
            predominantCategory = ethnicity;
          }
        });
        
        // If no predominant ethnicity, check race
        if (!predominantCategory || maxCount < data.total / 2) {
          Object.entries(data.demographics.races).forEach(([race, count]) => {
            if (count > maxCount) {
              maxCount = count;
              predominantCategory = race;
            }
          });
        }
        
        // If still no clear predominant, check age
        if (!predominantCategory || maxCount < data.total / 2) {
          Object.entries(data.demographics.ages).forEach(([age, count]) => {
            if (count > maxCount) {
              maxCount = count;
              predominantCategory = age;
            }
          });
        }
        
        return { 
          zipCode, 
          totalCount: data.total,
          affectedCount: data.estimatedAffected,
          predominant: predominantCategory || 'Mixed Demographics',
          percentage: ((data.estimatedAffected / data.total) * 100).toFixed(0)
        };
      });
  };
  
  const topZipCodes = getTopZipCodes();
  
  // Use the already-processed affected count from props
  const actualAffectedCount = affectedCount;
  const actualAffectedPercentage = totalPatients > 0 ? ((actualAffectedCount / totalPatients) * 100).toFixed(1) : '0';
  
  // Count unique ZIP codes and estimate affected ones based on percentage
  const uniqueZipCount = new Set(
    patientData
      ?.map(p => p.zip_code || p.zipCode || p.zip)
      .filter(Boolean)
  ).size;
  const uniqueAffectedZips = Math.round(uniqueZipCount * affectedPercentage);
  
  // Format ZIP code with leading zeros
  const formatZipCode = (zipCode: string): string => {
    return zipCode.padStart(5, '0');
  };
  
  // If no data is available
  if (actualAffectedCount === 0 || topZipCodes.length === 0) {
    // Check if we have API data but no patient-level data
    if (affectedCount > 0 && topZipCodes.length === 0) {
      return (
        <div className="bg-white rounded-lg p-4 border border-gray-300 h-full flex flex-col">
          <h3 className="text-base font-semibold text-gray-900 text-center mb-3">
            {title.replace('Geographic Distribution', '')}
          </h3>
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 mb-2">{affectedCount.toLocaleString()}</div>
              <div className="text-sm text-gray-600 mb-2">
                Affected Patients ({((affectedCount / totalPatients) * 100).toFixed(1)}%)
              </div>
              <div className="text-xs text-gray-400 mt-4">
                Geographic distribution data not available
              </div>
              <div className="text-xs text-gray-400">
                for individual patient records
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-300 h-full flex flex-col">
        <h3 className="text-base font-semibold text-gray-900 text-center mb-3">
          {title.replace('Geographic Distribution', '')}
        </h3>
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-medium text-gray-500 mb-2">No data available</div>
            <div className="text-sm text-gray-400">
              No patients with this HRSN indicator
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Calculate percentage of affected patients in top 5 ZIP codes
  const top5Total = topZipCodes.reduce((sum, zip) => sum + zip.affectedCount, 0);
  const top5PercentageOfAffected = actualAffectedCount > 0 ? ((top5Total / actualAffectedCount) * 100).toFixed(1) : 0;
  
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-300 h-full flex flex-col">
      {/* Title */}
      <h3 className="text-base font-semibold text-gray-900 text-center mb-3">
        {title.replace('Geographic Distribution', '')}
      </h3>
      
      {/* Key Statistics */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">{actualAffectedCount.toLocaleString()}</div>
          <div className="text-xs text-gray-600">Affected ({actualAffectedPercentage}%)</div>
        </div>
        
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">{uniqueAffectedZips}</div>
          <div className="text-xs text-gray-600">ZIP Codes</div>
        </div>
      </div>
      
      {/* Top ZIP Codes with HRSN Issue */}
      <div className="flex-grow">
        <div className="text-xs font-semibold text-gray-700 mb-2 text-center border-b border-gray-300 pb-1">
          Top&nbsp;5 ZIP Codes by {title.replace('Geographic Distribution', '')} ({top5PercentageOfAffected}% of affected)
        </div>
        <div className="space-y-1">
          {topZipCodes.map((zip, index) => {
            const percentOfTotal = ((zip.affectedCount / totalPatients) * 100).toFixed(1);
            const percentOfTop5 = ((zip.affectedCount / top5Total) * 100).toFixed(1);
            
            return (
              <div key={zip.zipCode} className="text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">
                    <span className="font-medium mr-1">#{index + 1}</span>
                    ZIP {formatZipCode(zip.zipCode)}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {zip.affectedCount} patients
                  </span>
                </div>
                <div className="ml-6 text-gray-600 text-xs">
                  Predominant: {zip.predominant}
                  <br />
                  <span className="text-gray-500 whitespace-nowrap">
                    {percentOfTotal}% of all patients | {percentOfTop5}% of top&nbsp;5
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {/* Resource Allocation Insight */}
        <div className="text-xs text-gray-600 text-center mt-2 pt-2 border-t border-gray-200">
          Focus resources on these {uniqueAffectedZips} ZIP codes
        </div>
      </div>
    </div>
  );
}