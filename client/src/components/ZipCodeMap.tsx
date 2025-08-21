import React, { useEffect, useState } from 'react';
import { ResponsiveChoropleth } from '@nivo/geo';

interface ZipCodeMapProps {
  data: { id: string; value: number }[];
}

const ZipCodeMap: React.FC<ZipCodeMapProps> = ({ data }) => {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        console.log('🗺️ Fetching GeoJSON data...');
        const response = await fetch('/us-zipcodes-real.geojson');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const geojson = await response.json();
        console.log('🗺️ GeoJSON loaded:', {
          type: geojson.type,
          featuresCount: geojson.features?.length,
          firstFeature: geojson.features?.[0]
        });

        // Validate GeoJSON structure
        if (!geojson.features || !Array.isArray(geojson.features)) {
          throw new Error('Invalid GeoJSON: missing features array');
        }

        if (geojson.features.length === 0) {
          throw new Error('Invalid GeoJSON: empty features array');
        }

        setGeoData(geojson);
        setError(null);
      } catch (error) {
        console.error('🚨 Error loading GeoJSON:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGeoData();
  }, []);

  // Prepare choropleth data with proper matching
  const choroplethData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    console.log('🗺️ Preparing choropleth data:', data.length, 'data points');

    return data.map(item => ({
      id: String(item.id).padStart(5, '0'), // Ensure 5-digit ZIP codes
      value: item.value
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700">Loading ZIP Code Map...</div>
          <div className="text-sm text-gray-500 mt-2">Fetching geographic boundaries</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-700">Map Loading Error</div>
          <div className="text-sm text-red-500 mt-2">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!geoData) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700">No Map Data Available</div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...choroplethData.map(d => d.value), 1);

  return (
    <div style={{ height: '500px', width: '100%' }} className="bg-white border rounded-lg overflow-hidden">
      <ResponsiveChoropleth
        data={choroplethData}
        features={geoData.features}
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        colors="blues"
        domain={[0, maxValue]}
        unknownColor="#e0e0e0"
        label="properties.ZCTA5CE20"
        valueFormat=".0f"
        projectionType="mercator"
        projectionTranslation={[0.5, 0.6]}
        projectionRotation={[0, 0, 0]}
        projectionScale={1000}
        borderWidth={0.5}
        borderColor="#333"
        isInteractive={true}
        enableGraticule={false}
        tooltip={({ feature, value }) => {
          const zipCode = feature.properties?.ZCTA5CE20 || 
                         feature.properties?.ZCTA5CE10 || 
                         feature.properties?.GEOID10?.substring(2) || 
                         feature.properties?.ZIP || 
                         feature.properties?.ZIPCODE || 
                         feature.properties?.NAME ||
                         feature.id;

          const patientData = choroplethData.find(d => d.id === String(zipCode));
          const patientCount = patientData?.value || value || 0;

          return (
            <div className="bg-white p-3 border rounded-lg shadow-lg text-sm max-w-xs">
              <div className="font-semibold text-gray-800 mb-1">
                ZIP Code: {zipCode}
              </div>
              <div className="text-blue-600">
                Patients: <span className="font-semibold">{patientCount}</span>
              </div>
              {patientCount === 0 && (
                <div className="text-gray-500 text-xs mt-1">No patient data</div>
              )}
            </div>
          );
        }}
        theme={{
          background: 'transparent',
          tooltip: {
            container: {
              background: 'white',
              color: 'black',
              fontSize: 12,
              borderRadius: 4,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }
          }
        }}
      />
    </div>
  );
}

export default ZipCodeMap;
```