import React, { useMemo } from 'react';
import { MapPin, Users, TrendingUp } from 'lucide-react';

interface Patient {
  patient_id: string;
  zip_code: string;
  [key: string]: any;
}

interface IntelligentGeographicInfographicProps {
  data: Patient[];
  title?: string;
}

export default function IntelligentGeographicInfographic({ 
  data, 
  title = "Geographic Patient Distribution" 
}: IntelligentGeographicInfographicProps) {
  
  // Process geographic data for insights
  const geographicInsights = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Count patients by ZIP code
    const zipCounts: Record<string, number> = {};
    const stateCounts: Record<string, number> = {};
    
    data.forEach(patient => {
      const zipCode = patient.zip_code?.toString().trim();
      if (zipCode && zipCode !== '' && zipCode !== 'null' && zipCode !== 'undefined') {
        // Normalize ZIP code (handle 4-digit codes)
        const normalizedZip = zipCode.length === 4 ? `0${zipCode}` : zipCode;
        zipCounts[normalizedZip] = (zipCounts[normalizedZip] || 0) + 1;
        
        // Extract state from ZIP code (simplified mapping for major states)
        const stateFromZip = getStateFromZip(normalizedZip);
        if (stateFromZip) {
          stateCounts[stateFromZip] = (stateCounts[stateFromZip] || 0) + 1;
        }
      }
    });

    // Get top ZIP codes
    const topZips = Object.entries(zipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8);

    // Get state distribution
    const stateDistribution = Object.entries(stateCounts)
      .sort(([,a], [,b]) => b - a);

    return {
      totalZips: Object.keys(zipCounts).length,
      totalStates: Object.keys(stateCounts).length,
      topZips,
      stateDistribution,
      totalPatients: data.length
    };
  }, [data]);

  // Simple state mapping for common ZIP code prefixes
  function getStateFromZip(zip: string): string | null {
    const prefix = zip.substring(0, 2);
    const stateMap: Record<string, string> = {
      '10': 'NY', '11': 'NY', '12': 'NY', '13': 'NY', '14': 'NY',
      '19': 'PA', '15': 'PA', '16': 'PA', '17': 'PA', '18': 'PA',
      '20': 'MD', '21': 'MD',
      '70': 'LA', '71': 'LA',
      '60': 'IL', '61': 'IL', '62': 'IL'
    };
    return stateMap[prefix] || null;
  }

  if (!geographicInsights) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center text-gray-600">
          <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p>No geographic data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border border-blue-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-blue-900">{title}</h3>
      </div>

      {/* Geographic Overview */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg p-3 text-center border border-blue-200">
          <Users className="h-6 w-6 mx-auto text-blue-600 mb-1" />
          <div className="text-xl font-bold text-blue-900">{geographicInsights.totalPatients}</div>
          <div className="text-xs text-blue-600">Total Patients</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center border border-blue-200">
          <MapPin className="h-6 w-6 mx-auto text-green-600 mb-1" />
          <div className="text-xl font-bold text-green-900">{geographicInsights.totalZips}</div>
          <div className="text-xs text-green-600">ZIP Codes</div>
        </div>
        <div className="bg-white rounded-lg p-3 text-center border border-blue-200">
          <TrendingUp className="h-6 w-6 mx-auto text-purple-600 mb-1" />
          <div className="text-xl font-bold text-purple-900">{geographicInsights.totalStates}</div>
          <div className="text-xs text-purple-600">States</div>
        </div>
      </div>

      {/* Top ZIP Codes */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Top ZIP Codes by Patient Density</h4>
        <div className="space-y-2">
          {geographicInsights.topZips.slice(0, 6).map(([zip, count], index) => {
            const percentage = (count / geographicInsights.totalPatients) * 100;
            return (
              <div key={zip} className="flex items-center gap-2 text-sm">
                <div className="w-12 text-blue-700 font-mono">{zip}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(percentage, 5)}%` }}
                  />
                </div>
                <div className="w-16 text-right text-blue-700 font-medium">
                  {count} ({percentage.toFixed(1)}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* State Distribution */}
      <div>
        <h4 className="text-sm font-medium text-blue-900 mb-2">Geographic Coverage</h4>
        <div className="flex flex-wrap gap-2">
          {geographicInsights.stateDistribution.map(([state, count]) => {
            const percentage = (count / geographicInsights.totalPatients) * 100;
            return (
              <div key={state} className="bg-white rounded-full px-3 py-1 border border-blue-200">
                <span className="text-sm font-medium text-blue-900">{state}</span>
                <span className="text-xs text-blue-600 ml-1">
                  {count} ({percentage.toFixed(1)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expand for Full Map Hint */}
      <div className="mt-4 pt-3 border-t border-blue-200">
        <p className="text-xs text-blue-600 text-center">
          Click "Expand" button (top-right) for interactive choropleth map with zoom controls
        </p>
      </div>
    </div>
  );
}