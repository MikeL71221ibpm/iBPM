import React, { useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';

interface Patient {
  zip_code?: string;
  zipCode?: string;
  [key: string]: any;
}

interface SimpleZipChoroplethProps {
  data: Patient[];
  title?: string;
}

export default function SimpleZipChoropleth({ data, title = "US ZIP Code Patient Distribution" }: SimpleZipChoroplethProps) {
  
  // Process ZIP codes from patient data
  const zipCounts = useMemo(() => {
    console.log('🗺️ SIMPLE CHOROPLETH: Processing', data?.length || 0, 'patients');
    
    const counts: Record<string, number> = {};
    
    data?.forEach(patient => {
      const zip = patient.zip_code || patient.zipCode;
      if (zip && zip.toString().trim()) {
        // Normalize ZIP to 5-digit format (3034 → 03034)
        const normalizedZip = zip.toString().padStart(5, '0');
        counts[normalizedZip] = (counts[normalizedZip] || 0) + 1;
      }
    });
    
    console.log('🗺️ SIMPLE CHOROPLETH: Found', Object.keys(counts).length, 'unique ZIP codes');
    console.log('🗺️ SIMPLE CHOROPLETH: Top ZIPs:', Object.entries(counts).slice(0, 5));
    
    return counts;
  }, [data]);

  // Color mapping for patient density
  const getZipColor = (patientCount: number): string => {
    if (patientCount === 0) return '#f3f4f6'; // Light gray for no patients
    if (patientCount <= 5) return '#dbeafe';   // Very light blue
    if (patientCount <= 10) return '#93c5fd';  // Light blue  
    if (patientCount <= 15) return '#60a5fa';  // Medium blue
    if (patientCount <= 20) return '#3b82f6';  // Blue
    return '#1d4ed8'; // Dark blue for 20+ patients
  };

  const totalPatients = Object.values(zipCounts).reduce((sum, count) => sum + count, 0);
  const maxCount = Math.max(...Object.values(zipCounts), 0);

  return (
    <div className="w-full h-full bg-white">
      {/* Header with statistics */}
      <div className="p-4 border-b bg-blue-50">
        <h3 className="text-lg font-semibold text-blue-900">{title}</h3>
        <div className="flex gap-4 text-sm text-blue-700 mt-2">
          <span>📊 Total Patients: {totalPatients.toLocaleString()}</span>
          <span>📍 ZIP Codes: {Object.keys(zipCounts).length}</span>
          <span>🔥 Max per ZIP: {maxCount}</span>
        </div>
      </div>

      {/* Map container */}
      <div className="relative h-[500px] w-full bg-gray-100">
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{
            scale: 1000,
            center: [-96, 38] // Center of continental US for national view
          }}
          width={800}
          height={500}
          style={{ width: "100%", height: "100%" }}
        >
          <Geographies geography="/us-zipcodes-real.geojson">
            {({ geographies }) => {
              console.log('🗺️ SIMPLE CHOROPLETH: Loading', geographies.length, 'ZIP boundaries from us-zipcodes-real.geojson');
              
              return geographies.map((geo) => {
                // Extract ZIP code from properties (try multiple possible fields)
                const zipCode = geo.properties?.ZCTA5CE20 || geo.properties?.GEOID || geo.properties?.NAME;
                const patientCount = zipCode ? zipCounts[zipCode] || 0 : 0;
                const fillColor = getZipColor(patientCount);
                
                // Log ZIPs with patients for debugging
                if (patientCount > 0) {
                  console.log('🗺️ SIMPLE CHOROPLETH: Coloring ZIP', zipCode, 'with', patientCount, 'patients →', fillColor);
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
                        fill: patientCount > 0 ? "#ef4444" : fillColor,
                        strokeWidth: 1,
                        cursor: "pointer"
                      },
                      pressed: { outline: "none" }
                    }}
                    onMouseEnter={() => {
                      if (patientCount > 0) {
                        console.log(`🗺️ HOVER: ZIP ${zipCode} has ${patientCount} patients`);
                      }
                    }}
                    onClick={() => {
                      if (patientCount > 0) {
                        alert(`ZIP Code ${zipCode}\nPatients: ${patientCount}`);
                      }
                    }}
                  />
                );
              });
            }}
          </Geographies>
        </ComposableMap>
      </div>

      {/* Color legend */}
      <div className="p-4 border-t bg-gray-50">
        <h4 className="text-sm font-semibold mb-2 text-gray-700">Patient Density Scale</h4>
        <div className="flex gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-300 border"></div>
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