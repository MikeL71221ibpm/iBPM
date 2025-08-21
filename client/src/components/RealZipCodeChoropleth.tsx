// Real ZIP Code Choropleth Map Component
// Uses @nivo/geo for actual geographic visualization with ZIP code boundaries

import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveChoropleth } from '@nivo/geo';

interface RealZipCodeChoroplethProps {
  data?: any[];
  title?: string;
  categoryName?: string;
  colorScheme?: any;
  filterBy?: any;
  dualSourceHrsnData?: any;
  compactMode?: boolean;
}

const RealZipCodeChoropleth: React.FC<RealZipCodeChoroplethProps> = ({ 
  data = [], 
  title = "ZIP Code Choropleth Map",
  categoryName = "zip_code",
  compactMode = true 
}) => {
  const [geoFeatures, setGeoFeatures] = useState<any[]>([]);
  const [choroplethData, setChoroplethData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  console.log("🗺️ RealZipCodeChoropleth: Processing", data.length, "patients for choropleth visualization");

  // Load GeoJSON data for ZIP code boundaries
  useEffect(() => {
    const loadGeoData = async () => {
      try {
        console.log("🗺️ Loading ZIP code boundary data...");
        
        // Try loading the comprehensive US ZIP code GeoJSON
        const response = await fetch('/us-comprehensive-zipcodes.geojson');
        if (response.ok) {
          const geoJsonData = await response.json();
          console.log("🗺️ Successfully loaded US comprehensive ZIP codes with", geoJsonData.features?.length, "features");
          
          if (geoJsonData && geoJsonData.features) {
            // Log a sample of the features to understand the structure
            console.log("🗺️ Sample feature structure:", geoJsonData.features[0]?.properties);
            setGeoFeatures(geoJsonData.features);
            setIsLoading(false);
          }
        } else {
          throw new Error('Failed to load comprehensive ZIP codes');
        }
        
      } catch (error) {
        console.error("🗺️ Error loading GeoJSON:", error);
        
        // Try PA ZIP codes as fallback
        try {
          const paResponse = await fetch('/pa_zip_codes.geojson');
          if (paResponse.ok) {
            const paGeoJsonData = await paResponse.json();
            console.log("🗺️ Loaded PA ZIP codes fallback with", paGeoJsonData.features?.length, "features");
            setGeoFeatures(paGeoJsonData.features);
            setIsLoading(false);
          }
        } catch (paError) {
          console.error("🗺️ PA fallback also failed:", paError);
          setIsLoading(false);
        }
      }
    };
    
    loadGeoData();
  }, []);

  // Process patient data into choropleth format
  const processedChoroplethData = useMemo(() => {
    if (!data || data.length === 0) {
      console.log("🗺️ No patient data for choropleth");
      return [];
    }

    try {
      // Count patients by ZIP code with proper formatting
      const zipCodeCounts = new Map<string, number>();
      
      data.forEach(patient => {
        const zipCode = patient.zip_code || patient.zipCode || patient.zip;
        if (zipCode) {
          // Normalize ZIP code (5 digits with leading zeros)
          const zip = zipCode.toString().trim().padStart(5, '0');
          zipCodeCounts.set(zip, (zipCodeCounts.get(zip) || 0) + 1);
        }
      });

      // Convert to Nivo choropleth format - use ZIP codes as IDs
      const choroplethData = Array.from(zipCodeCounts.entries()).map(([zipCode, count]) => ({
        id: zipCode,
        value: count
      }));

      console.log("🗺️ Processed ZIP code choropleth data:", zipCodeCounts.size, "unique ZIP codes");
      console.log("🗺️ Top 10 ZIP codes by patient count:", 
        Array.from(zipCodeCounts.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
      );
      
      return choroplethData;
      
    } catch (error) {
      console.error("🗺️ Error processing choropleth data:", error);
      return [];
    }
  }, [data]);

  useEffect(() => {
    setChoroplethData(processedChoroplethData);
  }, [processedChoroplethData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded border">
        <div className="text-center">
          <div className="inline-block animate-spin h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="mt-2 text-gray-600 text-sm">Loading choropleth map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${compactMode ? 'h-64' : 'h-96'}`}>
      <div className="p-4 h-full">
        <h4 className="font-bold text-gray-800 mb-3 text-sm">{title}</h4>
        
        {/* Real Choropleth Map using Nivo */}
        <div className="h-full bg-gray-50 rounded border">
          {!isLoading && geoFeatures.length > 0 ? (
            <ResponsiveChoropleth
              data={choroplethData}
              features={geoFeatures}
              margin={{ top: 10, right: 10, bottom: 40, left: 10 }}
              colors="YlOrRd"
              domain={[0, Math.max(...(choroplethData.length > 0 ? choroplethData.map(d => d.value) : [1]), 1)]}
              unknownColor="#f8f9fa"
              label="properties.ZCTA5CE10"
              valueFormat=".0f"
              projectionType="mercator"
              projectionScale={compactMode ? 800 : 1200}
              projectionTranslation={[0.5, 0.6]}
              enableGraticule={false}
              borderWidth={0.5}
              borderColor="#666666"
              isInteractive={true}
              onClick={(feature, event) => {
                console.log("🗺️ ZIP code clicked:", feature);
              }}
              tooltip={({ feature }) => {
                const zipCode = feature.properties?.ZCTA5CE10 || feature.properties?.ZCTA5CE20 || feature.id;
                const patientCount = choroplethData.find(d => d.id === zipCode)?.value || 0;
                return (
                  <div className="bg-white p-2 border rounded shadow text-xs">
                    <strong>ZIP: {zipCode}</strong><br/>
                    Patients: {patientCount}
                  </div>
                );
              }}
              legends={compactMode ? [] : [
                {
                  anchor: 'bottom-left',
                  direction: 'column',
                  justify: true,
                  translateX: 20,
                  translateY: -30,
                  itemsSpacing: 2,
                  itemWidth: 80,
                  itemHeight: 14,
                  itemDirection: 'left-to-right',
                  itemTextColor: '#444444',
                  itemOpacity: 0.85,
                  symbolSize: 12
                }
              ]}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                {isLoading ? (
                  <>
                    <div className="inline-block animate-spin h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    <p className="mt-2 text-gray-600 text-sm">Loading geographic boundaries...</p>
                    <p className="text-gray-500 text-xs mt-1">{data.length} patients ready for mapping</p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 text-sm">Map data loaded</p>
                    <p className="text-gray-500 text-xs mt-1">Features: {geoFeatures.length} | Patients: {data.length}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-2 text-xs text-gray-600">
          <p>✓ Geographic boundaries: {geoFeatures.length} features</p>
          <p>✓ Patient data: {choroplethData.length > 0 ? choroplethData.reduce((sum, d) => sum + d.value, 0) : 0} patients</p>
        </div>
      </div>
    </div>
  );
};

export default RealZipCodeChoropleth;