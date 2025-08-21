import React, { useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';

interface Patient {
  zip_code?: string;
  zipCode?: string;
  [key: string]: any;
}

interface WorkingZipChoroplethProps {
  data: Patient[];
  title?: string;
}

export default function WorkingZipChoropleth({ 
  data, 
  title = "ZIP Code Patient Distribution" 
}: WorkingZipChoroplethProps) {
  
  // Count patients by ZIP (MapInfo-style aggregation)
  const zipCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    data.forEach(patient => {
      const zip = patient.zip_code || patient.zipCode;
      if (zip && zip.toString().trim()) {
        const normalizedZip = zip.toString().padStart(5, '0');
        counts[normalizedZip] = (counts[normalizedZip] || 0) + 1;
      }
    });
    
    console.log('🗺️ MAPINFO DIAGNOSIS: Patient ZIP Code Counts:', counts);
    console.log('🗺️ SAMPLE PATIENT ZIPS:', Object.keys(counts).slice(0, 5));
    return counts;
  }, [data]);

  // Create color scale
  const maxCount = Math.max(...Object.values(zipCounts), 1);
  const colorScale = scaleLinear<string>()
    .domain([0, maxCount])
    .range(['#f0f9ff', '#1e40af']); // Light blue to dark blue

  // Get color for ZIP code
  const getZipColor = (zipCode: string): string => {
    const count = zipCounts[zipCode] || 0;
    return count > 0 ? colorScale(count) : '#f9fafb';
  };

  const totalPatients = Object.values(zipCounts).reduce((sum, count) => sum + count, 0);
  const zipCount = Object.keys(zipCounts).length;

  // Top ZIP codes for display
  const topZips = Object.entries(zipCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);

  return (
    <div className="bg-white border rounded p-4">
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">
        {totalPatients.toLocaleString()} patients across {zipCount} ZIP codes
      </p>

      {/* ZIP Code Map */}
      <div className="h-96 w-full mb-4">
        <ComposableMap 
          projection="geoAlbersUsa" 
          className="w-full h-full"
          projectionConfig={{
            scale: 1000,
            center: [-76, 40] // Focus on Northeast region
          }}
        >
          <Geographies geography="/us-zipcodes-real.geojson">
            {({ geographies }) =>
              geographies.map((geo) => {
                const zipCode = geo.properties?.ZCTA5CE10 || geo.properties?.ZCTA5CE20 || geo.properties?.GEOID;
                if (zipCode && zipCounts[zipCode]) {
                  console.log('🗺️ BOUNDARY MATCH FOUND:', zipCode, 'Patient Count:', zipCounts[zipCode]);
                }
                const fillColor = zipCode ? getZipColor(zipCode) : '#f9fafb';
                const patientCount = zipCode ? zipCounts[zipCode] || 0 : 0;
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke="#374151"
                    strokeWidth={0.25}
                    style={{
                      default: { outline: 'none' },
                      hover: { 
                        outline: 'none', 
                        fill: patientCount > 0 ? '#1f2937' : fillColor, 
                        cursor: patientCount > 0 ? 'pointer' : 'default' 
                      },
                      pressed: { outline: 'none' }
                    }}
                  >
                    {patientCount > 0 && (
                      <title>
                        ZIP {zipCode}: {patientCount.toLocaleString()} patients
                      </title>
                    )}
                  </Geography>
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* ZIP code breakdown table */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2">Top ZIP Codes</h4>
          <div className="space-y-1 text-sm max-h-48 overflow-y-auto">
            {topZips.map(([zip, count]) => (
              <div key={zip} className="flex justify-between">
                <span className="font-mono">{zip}</span>
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
            <div className="text-xs text-gray-600 mt-2">
              Geographic boundaries from US Census ZCTA data
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}