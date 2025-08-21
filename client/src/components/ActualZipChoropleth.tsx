import React, { useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

interface Patient {
  zip_code?: string;
  zipCode?: string;
  [key: string]: any;
}

interface ActualZipChoroplethProps {
  data: Patient[];
  title?: string;
}

export default function ActualZipChoropleth({ data, title = "ZIP Code Patient Distribution Map" }: ActualZipChoroplethProps) {
  
  // Count patients by ZIP (with normalization)
  const zipCounts = useMemo(() => {
    console.log('🗺️ CHOROPLETH: Processing', data?.length || 0, 'patients');
    console.log('🗺️ CHOROPLETH: Sample patient data:', data?.slice(0, 3));
    
    const counts: Record<string, number> = {};
    
    data.forEach(patient => {
      const zip = patient.zip_code || patient.zipCode;
      if (zip && zip.toString().trim()) {
        // Normalize to 5-digit format for boundary matching
        const normalizedZip = zip.toString().padStart(5, '0');
        counts[normalizedZip] = (counts[normalizedZip] || 0) + 1;
        
        if (Object.keys(counts).length <= 5) {
          console.log('🗺️ CHOROPLETH: Adding patient ZIP:', zip, '→', normalizedZip);
        }
      }
    });
    
    console.log('🗺️ CHOROPLETH: ZIP Counts:', Object.keys(counts).length, 'unique ZIPs');
    console.log('🗺️ CHOROPLETH: Top 5 ZIPs:', Object.entries(counts).slice(0, 5));
    
    return counts;
  }, [data]);

  // Get color for ZIP based on patient count
  const getZipColor = (zipCode: string): string => {
    const count = zipCounts[zipCode] || 0;
    
    if (count === 0) return '#f9fafb'; // Light gray for no patients
    if (count <= 5) return '#dbeafe';  // Very light blue
    if (count <= 10) return '#93c5fd'; // Light blue
    if (count <= 15) return '#60a5fa'; // Medium blue
    if (count <= 20) return '#3b82f6'; // Blue
    return '#1d4ed8'; // Dark blue for 20+ patients
  };

  const maxCount = Math.max(...Object.values(zipCounts));
  const totalPatients = Object.values(zipCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="w-full h-full bg-white">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex gap-4 text-sm text-gray-600 mt-2">
          <span>Total Patients: {totalPatients.toLocaleString()}</span>
          <span>ZIP Codes: {Object.keys(zipCounts).length}</span>
          <span>Max per ZIP: {maxCount}</span>
        </div>
        <div className="text-xs text-red-600 mt-1">
          Debug: Map should load {Object.keys(zipCounts).length > 0 ? 'with colored ZIP regions' : 'but no patient ZIP data found'}
        </div>
      </div>

      <div className="relative h-[600px] w-full">
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{
            scale: 800,
            center: [-74, 40.5] // Focus on New York area where patients are concentrated
          }}
          style={{ width: "100%", height: "100%" }}
          onLoad={() => console.log('🗺️ CHOROPLETH: Map loaded successfully')}
        >
          <Geographies 
            geography="/us-zipcodes-real.geojson"
            onError={(error) => console.log('🗺️ CHOROPLETH ERROR: Failed to load GeoJSON:', error)}
          >
            {({ geographies }) => {
              console.log('🗺️ CHOROPLETH: Loading', geographies.length, 'ZIP boundaries');
              
              return geographies.map((geo) => {
                const zipCode = geo.properties?.ZCTA5CE10 || geo.properties?.ZCTA5CE20 || geo.properties?.GEOID;
                const fillColor = zipCode ? getZipColor(zipCode) : '#f9fafb';
                const patientCount = zipCode ? zipCounts[zipCode] || 0 : 0;
                
                if (patientCount > 0) {
                  console.log('🗺️ CHOROPLETH: Rendering ZIP', zipCode, 'with', patientCount, 'patients');
                }
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke="#ffffff"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { 
                        outline: "none",
                        fill: "#ef4444",
                        strokeWidth: 1
                      },
                      pressed: { outline: "none" }
                    }}
                    onMouseEnter={() => {
                      if (patientCount > 0) {
                        console.log(`ZIP ${zipCode}: ${patientCount} patients`);
                      }
                    }}
                  />
                );
              });
            }}
          </Geographies>
        </ComposableMap>
      </div>

      {/* Color Legend */}
      <div className="p-4 border-t bg-gray-50">
        <h4 className="text-sm font-semibold mb-2">Patient Count Legend</h4>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-200"></div>
            <span>0</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4" style={{ backgroundColor: '#dbeafe' }}></div>
            <span>1-5</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4" style={{ backgroundColor: '#93c5fd' }}></div>
            <span>6-10</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4" style={{ backgroundColor: '#60a5fa' }}></div>
            <span>11-15</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4" style={{ backgroundColor: '#3b82f6' }}></div>
            <span>16-20</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4" style={{ backgroundColor: '#1d4ed8' }}></div>
            <span>20+</span>
          </div>
        </div>
      </div>
    </div>
  );
}