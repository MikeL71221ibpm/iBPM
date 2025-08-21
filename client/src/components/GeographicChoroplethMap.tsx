import React, { useMemo, useRef, useEffect, useState } from 'react';

console.log('🗺️ GEOGRAPHIC: GeographicChoroplethMap module loaded');

interface Patient {
  zip_code?: string;
  zipCode?: string;
  [key: string]: any;
}

interface GeographicChoroplethMapProps {
  data: Patient[];
  title?: string;
}

interface ZipBoundary {
  type: string;
  properties: {
    ZCTA5CE20?: string;
    ZCTA5CE10?: string;
    GEOID?: string;
    NAME?: string;
  };
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

// REAL GEOGRAPHIC CHOROPLETH MAP WITH ACTUAL ZIP CODE BOUNDARIES
export default function GeographicChoroplethMap({ data, title = "Geographic ZIP Code Distribution" }: GeographicChoroplethMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [geoData, setGeoData] = useState<ZipBoundary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  console.log('🗺️ GEOGRAPHIC CHOROPLETH: Component called with:', data?.length || 0, 'patients');
  
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
    
    console.log('🗺️ GEOGRAPHIC: Processing complete -', Object.keys(counts).length, 'ZIP codes with patients');
    console.log('🗺️ GEOGRAPHIC: Sample patient ZIP codes:', Object.entries(counts).slice(0, 10));
    console.log('🗺️ GEOGRAPHIC: ZIP code normalization examples:');
    data?.slice(0, 5).forEach(patient => {
      const zip = patient.zip_code || patient.zipCode;
      if (zip) {
        const normalized = zip.toString().padStart(5, '0');
        console.log(`🗺️ GEOGRAPHIC: "${zip}" (${typeof zip}) → "${normalized}"`);
      }
    });
    
    return counts;
  }, [data]);

  // Load GeoJSON data
  useEffect(() => {
    const loadGeoData = async () => {
      try {
        console.log('🗺️ GEOGRAPHIC: Starting GeoJSON load process...');
        console.log('🗺️ GEOGRAPHIC: Attempting to fetch /us-zipcodes-real.geojson');
        
        const response = await fetch('/us-zipcodes-real.geojson');
        console.log('🗺️ GEOGRAPHIC: Response received - status:', response.status, response.statusText);
        console.log('🗺️ GEOGRAPHIC: Response headers:', response.headers.get('content-type'));
        
        if (!response.ok) {
          console.error('🗺️ GEOGRAPHIC: Response not OK:', response.status, response.statusText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.log('🗺️ GEOGRAPHIC: Starting JSON parsing...');
        const geoJson = await response.json();
        console.log('🗺️ GEOGRAPHIC: JSON parsing complete!');
        
        console.log('🗺️ GEOGRAPHIC: GeoJSON loaded successfully');
        console.log('🗺️ GEOGRAPHIC: Raw GeoJSON type:', typeof geoJson);
        console.log('🗺️ GEOGRAPHIC: GeoJSON keys:', Object.keys(geoJson || {}));
        console.log('🗺️ GEOGRAPHIC: Features array length:', geoJson?.features?.length || 0);
        
        if (geoJson?.features?.length > 0) {
          console.log('🗺️ GEOGRAPHIC: Sample feature properties:', geoJson.features[0]?.properties);
          console.log('🗺️ GEOGRAPHIC: Sample geometry type:', geoJson.features[0]?.geometry?.type);
          console.log('🗺️ GEOGRAPHIC: Setting geoData and clearing loading state...');
          setGeoData(geoJson.features || []);
          setIsLoading(false);
          console.log('🗺️ GEOGRAPHIC: State updated - should trigger canvas render');
        } else {
          console.error('🗺️ GEOGRAPHIC: No features found in GeoJSON');
          setIsLoading(false);
        }
        
      } catch (error) {
        console.error('🗺️ GEOGRAPHIC: Error loading GeoJSON:', error);
        console.error('🗺️ GEOGRAPHIC: Error stack:', error.stack);
        
        // Try alternative file path
        try {
          console.log('🗺️ GEOGRAPHIC: Trying alternative GeoJSON file...');
          const response2 = await fetch('/us-zipcodes-sample.geojson');
          if (response2.ok) {
            const geoJson2 = await response2.json();
            console.log('🗺️ GEOGRAPHIC: Alternative GeoJSON loaded, features:', geoJson2.features?.length || 0);
            setGeoData(geoJson2.features || []);
          } else {
            console.error('🗺️ GEOGRAPHIC: Alternative file also failed:', response2.status);
          }
        } catch (error2) {
          console.error('🗺️ GEOGRAPHIC: Alternative GeoJSON also failed:', error2);
        }
        
        console.log('🗺️ GEOGRAPHIC: Setting loading to false regardless of errors');
        setIsLoading(false);
      }
    };

    console.log('🗺️ GEOGRAPHIC: useEffect triggered, calling loadGeoData');
    loadGeoData();
  }, []);

  const totalPatients = Object.values(zipCounts).reduce((sum, count) => sum + count, 0);
  const uniqueZipCount = Object.keys(zipCounts).length;
  const maxCount = Math.max(...Object.values(zipCounts), 0);

  // Get color for patient density
  const getColor = (count: number): string => {
    if (count === 0) return '#f8fafc'; // Very light gray for no patients
    const intensity = count / maxCount;
    if (intensity <= 0.2) return '#dbeafe'; // Light blue
    if (intensity <= 0.4) return '#93c5fd'; // Medium light blue
    if (intensity <= 0.6) return '#60a5fa'; // Medium blue
    if (intensity <= 0.8) return '#3b82f6'; // Dark blue
    return '#1d4ed8'; // Darkest blue for highest density
  };

  // Project coordinates (simple Mercator-like projection)
  const projectCoordinate = (lon: number, lat: number, bounds: any, canvasWidth: number, canvasHeight: number) => {
    const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * canvasWidth;
    const y = canvasHeight - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * canvasHeight;
    return { x, y };
  };

  // Canvas drawing effect
  useEffect(() => {
    console.log('🗺️ GEOGRAPHIC: Canvas rendering effect called - isLoading:', isLoading, 'geoData.length:', geoData.length);
    
    if (isLoading) {
      console.log('🗺️ GEOGRAPHIC: Still loading, skipping render');
      return;
    }
    
    if (geoData.length === 0) {
      console.log('🗺️ GEOGRAPHIC: No geo data available, skipping render');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('🗺️ GEOGRAPHIC: Canvas ref is null');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('🗺️ GEOGRAPHIC: Cannot get canvas 2D context');
      return;
    }

    // Set canvas size
    canvas.width = 1000;
    canvas.height = 600;
    
    // Clear canvas
    ctx.fillStyle = '#f0f9ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    console.log('🗺️ GEOGRAPHIC: Drawing choropleth map for', geoData.length, 'ZIP boundaries');
    console.log('🗺️ GEOGRAPHIC: Patient ZIP codes available:', Object.keys(zipCounts).length);
    console.log('🗺️ GEOGRAPHIC: Sample patient ZIP codes:', Object.keys(zipCounts).slice(0, 10));

    // Calculate bounds for projection
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    
    geoData.forEach(feature => {
      if (feature.geometry?.coordinates) {
        feature.geometry.coordinates.forEach(polygon => {
          if (Array.isArray(polygon)) {
            polygon.forEach(ring => {
              if (Array.isArray(ring)) {
                ring.forEach(coord => {
                  if (Array.isArray(coord) && coord.length >= 2) {
                    const lon = coord[0];
                    const lat = coord[1];
                    if (typeof lon === 'number' && typeof lat === 'number') {
                      minLon = Math.min(minLon, lon);
                      maxLon = Math.max(maxLon, lon);
                      minLat = Math.min(minLat, lat);
                      maxLat = Math.max(maxLat, lat);
                    }
                  }
                });
              }
            });
          }
        });
      }
    });

    const bounds = { minLon, maxLon, minLat, maxLat };
    console.log('🗺️ GEOGRAPHIC: Bounds calculated:', bounds);
    
    // Validate bounds
    if (!isFinite(minLon) || !isFinite(maxLon) || !isFinite(minLat) || !isFinite(maxLat)) {
      console.error('🗺️ GEOGRAPHIC: Invalid bounds calculated, cannot render map');
      return;
    }

    let renderedCount = 0;
    let patientsFound = 0;

    // Draw ZIP code boundaries
    geoData.forEach(feature => {
      if (!feature.geometry?.coordinates) return;

      // Get ZIP code from feature properties
      const zipCode = feature.properties?.ZCTA5CE20 || 
                     feature.properties?.ZCTA5CE10 || 
                     feature.properties?.GEOID || 
                     feature.properties?.NAME;

      if (!zipCode) return;

      const patientCount = zipCounts[zipCode] || 0;
      
      // Debug logging for ZIP code matching
      if (zipCode && Object.keys(zipCounts).includes(zipCode)) {
        console.log('🗺️ GEOGRAPHIC: MATCH FOUND! ZIP', zipCode, 'has', patientCount, 'patients');
        patientsFound++;
      } else if (zipCode) {
        // Only log first few mismatches to avoid spam
        if (renderedCount < 5) {
          console.log('🗺️ GEOGRAPHIC: No patients in ZIP', zipCode, '(boundary exists but no patient data)');
        }
      }

      // Skip drawing if no patients (for performance)
      if (patientCount === 0) return;

      const fillColor = getColor(patientCount);

      // Draw each polygon
      feature.geometry.coordinates.forEach(polygon => {
        if (Array.isArray(polygon)) {
          polygon.forEach(ring => {
            if (Array.isArray(ring) && ring.length >= 3) {
              ctx.beginPath();
              let validPath = false;
              
              ring.forEach((coord, index) => {
                if (Array.isArray(coord) && coord.length >= 2) {
                  const lon = coord[0];
                  const lat = coord[1];
                  if (typeof lon === 'number' && typeof lat === 'number') {
                    const { x, y } = projectCoordinate(lon, lat, bounds, canvas.width, canvas.height);
                    if (index === 0) {
                      ctx.moveTo(x, y);
                    } else {
                      ctx.lineTo(x, y);
                    }
                    validPath = true;
                  }
                }
              });
              
              if (validPath) {
                ctx.closePath();

                // Fill the polygon
                ctx.fillStyle = fillColor;
                ctx.fill();

                // Add border
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 0.5;
                ctx.stroke();

                renderedCount++;
              }
            }
          });
        }
      });
    });

    console.log('🗺️ GEOGRAPHIC: Rendered', renderedCount, 'polygons,', patientsFound, 'ZIP codes with patients');

    // Add title
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('ZIP Code Patient Distribution - Geographic View', 20, 30);

    // Add statistics
    ctx.font = '14px Arial';
    ctx.fillText(`Total Patients: ${totalPatients.toLocaleString()}`, 20, 55);
    ctx.fillText(`ZIP Codes with Patients: ${uniqueZipCount}`, 300, 55);
    ctx.fillText(`Maximum per ZIP: ${maxCount}`, 600, 55);

    // Add legend
    const legendY = canvas.height - 50;
    const legendColors = ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'];
    const legendLabels = ['Low', '', 'Medium', '', 'High'];
    
    ctx.font = '12px Arial';
    ctx.fillText('Patient Density:', 20, legendY - 15);
    
    legendColors.forEach((color, i) => {
      const x = 20 + i * 60;
      ctx.fillStyle = color;
      ctx.fillRect(x, legendY, 50, 20);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(x, legendY, 50, 20);
      
      if (legendLabels[i]) {
        ctx.fillStyle = '#1f2937';
        ctx.textAlign = 'center';
        ctx.fillText(legendLabels[i], x + 25, legendY - 5);
      }
    });

  }, [geoData, zipCounts, maxCount, isLoading]);

  // Handle click events for geographic features
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    // For simplicity, show general stats on click
    // In a full implementation, you'd need to do point-in-polygon testing
    const topZips = Object.entries(zipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    const message = `Geographic Choropleth Map\n\nTop 5 ZIP Codes:\n${topZips.map(([zip, count]) => 
      `${zip}: ${count} patients`).join('\n')}\n\nTotal: ${totalPatients} patients across ${uniqueZipCount} ZIP codes`;
    
    alert(message);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">Loading Geographic Boundaries...</div>
          <div className="text-sm text-gray-500 mt-2">Fetching ZIP code shapes for choropleth mapping</div>
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
          <span>🗺️ Geographic Boundaries: {geoData.length.toLocaleString()}</span>
        </div>
      </div>

      {/* Canvas map */}
      <div className="flex justify-center p-4">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="border border-gray-300 rounded-lg shadow-lg cursor-pointer"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
      
      {/* Instructions */}
      <div className="p-3 border-t bg-gray-50">
        <div className="text-xs text-gray-600">
          <span className="font-medium">Geographic Choropleth Map:</span>
          <span className="ml-2">Actual ZIP code boundaries shaded by patient density</span>
          <span className="mx-2">•</span>
          <span>Click for statistics</span>
          <span className="mx-2">•</span>
          <span>Blue intensity represents patient concentration</span>
        </div>
      </div>
    </div>
  );
}