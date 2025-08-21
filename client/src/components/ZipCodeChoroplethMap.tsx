import React, { useState, useEffect, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { scaleQuantize } from 'd3-scale';
import { schemeBlues } from 'd3-scale-chromatic';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, MapPin } from 'lucide-react';

interface Patient {
  patient_id: string;
  zip_code: string;
  [key: string]: any;
}

interface ZipCodeChoroplethMapProps {
  data: Patient[];
  title?: string;
}

export default function ZipCodeChoroplethMap({ 
  data, 
  title = "ZIP Code Patient Distribution" 
}: ZipCodeChoroplethMapProps) {
  const [geographyData, setGeographyData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState({ coordinates: [-96, 38], zoom: 1 });
  const [selectedRegion, setSelectedRegion] = useState('national');

  console.log("🗺️ CHOROPLETH MAP COMPONENT CALLED:", {
    dataLength: data?.length || 0,
    title,
    sampleZips: data?.slice(0, 10).map(p => ({ 
      patient_id: p.patient_id, 
      zip_code: p.zip_code,
      zipType: typeof p.zip_code 
    })) || [],
    dataStructure: data?.[0] || {}
  });

  // Load GeoJSON data
  useEffect(() => {
    const loadGeographyData = async () => {
      try {
        console.log("🗺️ Loading GeoJSON data...");
        const response = await fetch('/us-census-zipcodes.geojson');

        if (!response.ok) {
          throw new Error(`Failed to load GeoJSON: ${response.status}`);
        }

        const geoData = await response.json();
        console.log("🗺️ GeoJSON loaded successfully:", {
          type: geoData.type,
          features: geoData.features?.length || 0
        });

        setGeographyData(geoData);
        setIsLoading(false);
      } catch (err) {
        console.error("🗺️ Error loading GeoJSON:", err);
        setError(err instanceof Error ? err.message : 'Failed to load map data');
        setIsLoading(false);
      }
    };

    loadGeographyData();
  }, []);

  // Process patient data by ZIP code with enhanced normalization and debugging
  const zipCodeData = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      console.log("🗺️ NO DATA PROVIDED TO MAP:", { data, isArray: Array.isArray(data) });
      return {};
    }

    console.log("🗺️ PROCESSING PATIENT DATA:", {
      totalPatients: data.length,
      firstPatient: data[0],
      zipCodeFields: data[0] ? Object.keys(data[0]).filter(key => key.toLowerCase().includes('zip')) : []
    });

    const zipCounts = data.reduce((acc, patient, index) => {
      // Try multiple possible ZIP code field names
      const zipValue = patient.zip_code || 
                       patient.zipCode || 
                       patient.ZIP_CODE || 
                       patient['Zip Code'] ||
                       patient.postal_code ||
                       patient.zipcode;

      if (zipValue) {
        // Enhanced ZIP code normalization
        let zip = String(zipValue).trim();

        // Remove any non-numeric characters except leading zeros
        zip = zip.replace(/[^0-9]/g, '');

        // Handle various ZIP code formats
        if (zip.length === 3) zip = '00' + zip;  // "106" -> "00106"
        if (zip.length === 4) zip = '0' + zip;   // "6106" -> "06106"

        // Ensure 5-digit format
        zip = zip.padStart(5, '0').substring(0, 5);

        if (zip.length === 5) {
          acc[zip] = (acc[zip] || 0) + 1;

          if (index < 5) {
            console.log(`🗺️ ZIP PROCESSING [${index}]:`, {
              original: zipValue,
              normalized: zip,
              patient_id: patient.patient_id
            });
          }
        }
      } else if (index < 5) {
        console.log(`🗺️ NO ZIP FOUND [${index}]:`, {
          patient_id: patient.patient_id,
          availableFields: Object.keys(patient).slice(0, 10)
        });
      }

      return acc;
    }, {} as Record<string, number>);

    console.log("🗺️ ZIP CODE DATA PROCESSING COMPLETE:", {
      totalPatients: data.length,
      patientsWithZips: Object.values(zipCounts).reduce((sum, count) => sum + count, 0),
      uniqueZips: Object.keys(zipCounts).length,
      topZips: Object.entries(zipCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([zip, count]) => ({ zip, count })),
      allZipCodes: Object.keys(zipCounts).slice(0, 20)
    });

    return zipCounts;
  }, [data]);

  // Create color scale
  const colorScale = useMemo(() => {
    const counts = Object.values(zipCodeData);
    if (counts.length === 0) return null;

    const maxCount = Math.max(...counts);
    const scale = scaleQuantize<string>()
      .domain([0, maxCount])
      .range(schemeBlues[7]);

    console.log("🗺️ Color scale created:", {
      domain: [0, maxCount],
      sampleColors: schemeBlues[7]
    });

    return scale;
  }, [zipCodeData]);

  const getZipColor = (zipCode: any) => {
    const patientCount = zipCodeData[zipCode] || 0;
    return colorScale && patientCount > 0 ? colorScale(patientCount) : '#f8fafc';
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ZIP code map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-96 flex items-center justify-center bg-red-50 rounded-lg border border-red-200">
        <div className="text-center text-red-600">
          <p className="font-medium">Failed to load map</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!geographyData) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center text-gray-600">
          <p>No geographic data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Showing {Object.keys(zipCodeData).length} ZIP codes with {data?.length || 0} patients
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPosition(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.5, 8) }))}
                className="h-8 w-8 p-0"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPosition(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.5, 0.5) }))}
                className="h-8 w-8 p-0"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPosition({ coordinates: [-96, 38], zoom: 1 })}
                className="h-8 px-3"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>

            {/* Patient Density Scale */}
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">Patient Density Scale</div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">Low</span>
                <div className="flex">
                  {['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#08519c'].map((color, i) => (
                    <div key={i} className="w-3 h-3 border border-gray-300" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <span className="text-xs text-gray-600">High</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-[520px] relative">
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{
            scale: 1200,
            center: [-96, 38]
          }}
          width={900}
          height={520}
          className="w-full h-full cursor-pointer"
          style={{ pointerEvents: 'auto' }}
        >
          <ZoomableGroup 
            zoom={position.zoom}
            center={position.coordinates as [number, number]}
            onMoveEnd={setPosition}
            maxZoom={8}
            minZoom={0.5}
          >
          <Geographies geography={geographyData}>
            {({ geographies }) => {
              console.log(`🗺️ Rendering ${geographies.length} ZIP code boundaries`);
              let matchedZips = 0;

              return geographies.map((geo) => {
                // Try multiple possible ZIP code property names from GeoJSON
                const zipCode = geo.properties.ZCTA5CE10 || 
                              geo.properties.ZCTA5CE20 || 
                              geo.properties.ZIP || 
                              geo.properties.ZIPCODE ||
                              geo.properties.zip_code ||
                              geo.properties.GEOID10 ||
                              geo.properties.GEOID ||
                              geo.properties.NAME10;

                // Normalize ZIP code to match patient data format
                let normalizedZip = '';
                if (zipCode) {
                  normalizedZip = String(zipCode).trim();
                  // Handle 4-digit codes like "6106" -> "06106"
                  if (normalizedZip.length === 4 && !normalizedZip.startsWith('0')) {
                    normalizedZip = '0' + normalizedZip;
                  }
                  // Ensure 5-digit format
                  normalizedZip = normalizedZip.padStart(5, '0');
                }

                const patientCount = zipCodeData[normalizedZip] || 0;

                if (patientCount > 0) {
                  matchedZips++;
                  console.log(`🗺️ ZIP MATCH: ${zipCode} -> ${normalizedZip} = ${patientCount} patients`);
                }

                const fillColor = colorScale && patientCount > 0 
                  ? colorScale(patientCount) 
                  : "#f8f9fa";

                // Enhanced visual feedback for ZIP codes with patient data
                const strokeWidth = patientCount > 0 ? 1.5 : 0.3;
                const strokeColor = patientCount > 0 ? '#1e40af' : '#e5e7eb';

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    style={{
                      default: { outline: "none" },
                      hover: { 
                        outline: "none",
                        fill: patientCount > 0 ? "#ff6b6b" : "#e5e7eb",
                        strokeWidth: 2,
                        stroke: "#1e40af"
                      },
                      pressed: { outline: "none" }
                    }}
                    onMouseEnter={() => {
                      if (patientCount > 0) {
                        console.log(`🗺️ Hover - ZIP ${normalizedZip}: ${patientCount} patients`);
                      } else {
                        console.log(`🗺️ No patient data for ZIP: ${zipCode} (normalized: ${normalizedZip})`);
                      }
                    }}
                  />
                );
              });
            }}
          </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Legend */}
        {colorScale && (
          <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg border border-gray-200 shadow-lg">
            <p className="text-xs font-medium text-gray-700 mb-2">Patients per ZIP</p>
            <div className="flex items-center space-x-1">
              {schemeBlues[7].map((color, index) => (
                <div
                  key={index}
                  className="w-4 h-4 border border-gray-300"
                  style={{ backgroundColor: color }}
                  title={`${Math.round((index / 6) * Math.max(...Object.values(zipCodeData)))} patients`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>0</span>
              <span>{Math.max(...Object.values(zipCodeData))}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}