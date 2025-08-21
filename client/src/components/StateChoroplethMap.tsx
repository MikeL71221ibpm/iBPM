import React, { useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';

interface Patient {
  zip_code?: string;
  zipCode?: string;
  [key: string]: any;
}

interface StateChoroplethMapProps {
  data: Patient[];
  title?: string;
}

export default function StateChoroplethMap({ 
  data, 
  title = "Patient Distribution by State" 
}: StateChoroplethMapProps) {
  
  // ZIP to State mapping (like MapInfo would do automatically)
  const getStateFromZip = (zip: string): string | null => {
    const prefix = zip.substring(0, 2);
    const stateMap: Record<string, string> = {
      '10': 'NY', '11': 'NY', '12': 'NY', '13': 'NY', '14': 'NY',
      '19': 'PA', '15': 'PA', '16': 'PA', '17': 'PA', '18': 'PA',
      '20': 'MD', '21': 'MD',
      '70': 'LA', '71': 'LA',
      '60': 'IL', '61': 'IL', '62': 'IL',
      '02': 'MA', '01': 'MA',
      '03': 'NH', '04': 'NH', '05': 'VT',
      '06': 'CT', '07': 'NJ', '08': 'NJ', '09': 'NJ'
    };
    return stateMap[prefix] || null;
  };

  // Count patients by state (MapInfo-style aggregation)
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    data.forEach(patient => {
      const zip = patient.zip_code || patient.zipCode;
      if (zip && zip.toString().trim()) {
        const normalizedZip = zip.toString().padStart(5, '0');
        const state = getStateFromZip(normalizedZip);
        if (state) {
          counts[state] = (counts[state] || 0) + 1;
        }
      }
    });
    
    console.log('🗺️ State Mapping Results:', counts);
    return counts;
  }, [data]);

  // Create color scale
  const maxCount = Math.max(...Object.values(stateCounts), 1);
  const colorScale = scaleLinear<string>()
    .domain([0, maxCount])
    .range(['#f0f9ff', '#1e40af']); // Light blue to dark blue

  // Get color for state
  const getStateColor = (stateAbbr: string): string => {
    const count = stateCounts[stateAbbr] || 0;
    return count > 0 ? colorScale(count) : '#f9fafb';
  };

  const totalPatients = Object.values(stateCounts).reduce((sum, count) => sum + count, 0);
  const stateCount = Object.keys(stateCounts).length;

  return (
    <div className="bg-white border rounded p-4">
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">
        {totalPatients.toLocaleString()} patients across {stateCount} states
      </p>

      {/* State Map */}
      <div className="h-96 w-full mb-4">
        <ComposableMap projection="geoAlbersUsa" className="w-full h-full">
          <Geographies geography="/us-states-simple.geojson">
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateAbbr = geo.properties?.STUSPS || geo.properties?.STATE_ABBR;
                const fillColor = stateAbbr ? getStateColor(stateAbbr) : '#f9fafb';
                const patientCount = stateAbbr ? stateCounts[stateAbbr] || 0 : 0;
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke="#374151"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: 'none' },
                      hover: { outline: 'none', fill: '#1f2937', cursor: 'pointer' },
                      pressed: { outline: 'none' }
                    }}
                  >
                    <title>
                      {geo.properties?.NAME || stateAbbr}: {patientCount.toLocaleString()} patients
                    </title>
                  </Geography>
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* State breakdown table */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2">Patient Distribution by State</h4>
          <div className="space-y-1 text-sm">
            {Object.entries(stateCounts)
              .sort(([,a], [,b]) => b - a)
              .map(([state, count]) => (
                <div key={state} className="flex justify-between">
                  <span className="font-mono">{state}</span>
                  <span>{count.toLocaleString()} patients</span>
                </div>
              ))}
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Legend</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Fewer patients</span>
              <span>More patients</span>
            </div>
            <div className="flex space-x-1">
              {[0, 0.25, 0.5, 0.75, 1].map(percent => (
                <div
                  key={percent}
                  className="w-8 h-4 border border-gray-300"
                  style={{ backgroundColor: colorScale(maxCount * percent) }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}