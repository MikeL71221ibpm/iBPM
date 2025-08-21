import React, { useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

interface Patient {
  zip_code?: string;
  zipCode?: string;
  [key: string]: any;
}

interface SimpleChoroplethMapProps {
  data: Patient[];
  title?: string;
}

// SIMPLIFIED WORKING CHOROPLETH MAP
export default function SimpleChoroplethMap({ data, title = "Geographic ZIP Code Distribution" }: SimpleChoroplethMapProps) {
  
  console.log('🗺️🚨 SIMPLE CHOROPLETH: Component called with:', data?.length || 0, 'patients');
  
  // Process patient data into ZIP counts
  const zipCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    data?.forEach(patient => {
      const zip = patient.zip_code || patient.zipCode;
      if (zip && zip.toString().trim()) {
        // Normalize ZIP to 5-digit format (3034 → 03034)
        const normalizedZip = zip.toString().padStart(5, '0');
        counts[normalizedZip] = (counts[normalizedZip] || 0) + 1;
      }
    });
    
    console.log('🗺️ SIMPLE CHOROPLETH: Processing complete -', Object.keys(counts).length, 'ZIP codes found');
    console.log('🗺️ SIMPLE CHOROPLETH: Top ZIP codes:', Object.entries(counts).slice(0, 5));
    
    return counts;
  }, [data]);

  const totalPatients = Object.values(zipCounts).reduce((sum, count) => sum + count, 0);
  const uniqueZipCount = Object.keys(zipCounts).length;
  const maxCount = Math.max(...Object.values(zipCounts), 0);

  // Color function for ZIP codes based on patient density
  const getZipColor = (zipCode: string): string => {
    const count = zipCounts[zipCode] || 0;
    if (count === 0) return '#f8fafc'; // Very light gray for no patients
    
    const intensity = count / maxCount;
    if (intensity <= 0.2) return '#dbeafe'; // Light blue
    if (intensity <= 0.4) return '#93c5fd'; // Medium light blue
    if (intensity <= 0.6) return '#60a5fa'; // Medium blue
    if (intensity <= 0.8) return '#3b82f6'; // Dark blue
    return '#1d4ed8'; // Darkest blue for highest density
  };

  // Show loading state if no data
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full bg-white flex items-center justify-center border border-gray-200">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-600">No Geographic Data Available</div>
          <div className="text-sm text-gray-500 mt-2">Waiting for patient data to load</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white">
      {/* Header with statistics */}
      <div className="p-3 border-b bg-blue-50">
        <h3 className="text-lg font-semibold text-blue-900">{title}</h3>
        <div className="flex gap-4 text-sm text-blue-700 mt-1">
          <span>📊 Total Patients: {totalPatients.toLocaleString()}</span>
          <span>📍 ZIP Codes: {uniqueZipCount}</span>
          <span>🔥 Max per ZIP: {maxCount}</span>
        </div>
      </div>

      {/* Map container */}
      <div className="relative w-full" style={{ height: '500px' }}>
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{
            scale: 800,
            center: [-96, 38]
          }}
          width={800}
          height={500}
          style={{ width: "100%", height: "100%" }}
        >
          <Geographies geography="/us-zipcodes-real.geojson">
            {({ geographies }) => {
              console.log('🗺️ SIMPLE CHOROPLETH: Rendering', geographies.length, 'ZIP boundaries');
              
              return geographies.map((geo) => {
                // Extract ZIP code from properties
                const zipCode = geo.properties?.ZCTA5CE20 || geo.properties?.ZCTA5CE10 || geo.properties?.GEOID || geo.properties?.NAME;
                const patientCount = zipCode ? zipCounts[zipCode] || 0 : 0;
                // Always show boundaries - light fill for no data, colored for data
                const fillColor = patientCount > 0 ? getZipColor(zipCode) : '#f8fafc';
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke="#ffffff"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fill: "#f59e0b" },
                      pressed: { outline: "none" }
                    }}
                    onClick={() => {
                      if (patientCount > 0) {
                        alert(`ZIP Code: ${zipCode}\nPatients: ${patientCount}\nDensity: ${((patientCount / totalPatients) * 100).toFixed(1)}%`);
                      }
                    }}
                  />
                );
              });
            }}
          </Geographies>
        </ComposableMap>
      </div>
      
      {/* Legend */}
      <div className="p-3 border-t bg-gray-50">
        <div className="text-xs text-gray-600">
          <span className="font-medium">Color Scale:</span>
          <span className="ml-2">Light Blue (Low)</span>
          <span className="mx-2">→</span>
          <span>Dark Blue (High Patient Density)</span>
        </div>
      </div>
    </div>
  );
}