import React, { useMemo, useRef, useEffect } from 'react';

interface Patient {
  zip_code?: string;
  zipCode?: string;
  [key: string]: any;
}

interface CanvasChoroplethMapProps {
  data: Patient[];
  title?: string;
}

// AUTHENTIC POLYGON-BASED CHOROPLETH MAP - No Grid Boxes
export default function CanvasChoroplethMap({ data, title = "Geographic ZIP Code Distribution" }: CanvasChoroplethMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  console.log('🔥🔥🔥 CANVAS POLYGON COMPONENT CALLED:', {
    dataLength: data?.length || 0,
    title,
    firstPatient: data?.[0],
    hasZipCodes: data?.some(p => p.zip_code || p.zipCode)
  });
  
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
    
    console.log('🗺️ CANVAS POLYGON: Processing complete -', Object.keys(counts).length, 'ZIP codes found');
    console.log('🗺️ CANVAS POLYGON: Top ZIP codes:', Object.entries(counts).slice(0, 8));
    
    return counts;
  }, [data]);

  const totalPatients = Object.values(zipCounts).reduce((sum, count) => sum + count, 0);
  const uniqueZipCount = Object.keys(zipCounts).length;
  const maxCount = Math.max(...Object.values(zipCounts), 0);

  // Get color for patient density
  const getColor = (count: number): string => {
    if (count === 0) return '#f8fafc'; // Very light gray
    const intensity = count / maxCount;
    if (intensity <= 0.2) return '#dbeafe'; // Light blue
    if (intensity <= 0.4) return '#93c5fd'; // Medium light blue
    if (intensity <= 0.6) return '#60a5fa'; // Medium blue
    if (intensity <= 0.8) return '#3b82f6'; // Dark blue
    return '#1d4ed8'; // Darkest blue
  };

  // FORCED POLYGON RENDERING - No grid boxes allowed
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 1000;
    canvas.height = 600;
    
    // Clear canvas - light gray background
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    console.log('🔥🔥🔥 FORCING POLYGON RENDERING: ZIP counts:', Object.keys(zipCounts).length);
    console.log('🔥🔥🔥 Patient ZIP codes sample:', Object.keys(zipCounts).slice(0, 5));

    // IMMEDIATE: Load authentic ZIP code boundaries and render polygons
    fetch('/us-zipcodes-real.geojson')
      .then(response => {
        console.log('🔥🔥🔥 GeoJSON fetch response status:', response.status);
        return response.json();
      })
      .then(geoJsonData => {
        console.log('🔥🔥🔥 GeoJSON loaded! Features:', geoJsonData.features?.length || 0);
        
        if (!geoJsonData.features) {
          console.error('🔥🔥🔥 NO FEATURES FOUND in GeoJSON');
          return;
        }

        // Get patient ZIP codes - ensure proper format
        const patientZips = Object.keys(zipCounts);
        console.log('🔥🔥🔥 Looking for patient ZIPs:', patientZips);

        // Find matching ZIP code boundaries
        const matchingFeatures = [];
        for (const feature of geoJsonData.features) {
          const zipCode = feature.properties?.ZCTA5CE10 || feature.properties?.ZCTA5CE20;
          if (zipCode && patientZips.includes(zipCode)) {
            matchingFeatures.push(feature);
            console.log('🔥🔥🔥 MATCH FOUND:', zipCode, 'patients:', zipCounts[zipCode]);
          }
        }

        console.log('🔥🔥🔥 Total matching ZIP boundaries:', matchingFeatures.length);

        if (matchingFeatures.length === 0) {
          console.log('🔥🔥🔥 NO MATCHES - Will draw test shapes');
          // Draw test rectangle if no matches found
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(100, 100, 200, 100);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('NO POLYGON MATCHES', 200, 155);
          return;
        }

        // Calculate bounds for all matching features
        let minLon = Infinity, maxLon = -Infinity;
        let minLat = Infinity, maxLat = -Infinity;
        
        matchingFeatures.forEach(feature => {
          const coordinates = feature.geometry?.coordinates?.[0];
          if (coordinates) {
            coordinates.forEach((coord: number[]) => {
              const [lon, lat] = coord;
              minLon = Math.min(minLon, lon);
              maxLon = Math.max(maxLon, lon);
              minLat = Math.min(minLat, lat);
              maxLat = Math.max(maxLat, lat);
            });
          }
        });

        console.log('🔥🔥🔥 Geographic bounds:', { minLon, maxLon, minLat, maxLat });

        // Draw each matching ZIP polygon
        let drawnCount = 0;
        matchingFeatures.forEach(feature => {
          const zipCode = feature.properties?.ZCTA5CE10 || feature.properties?.ZCTA5CE20;
          const patientCount = zipCounts[zipCode] || 0;
          const coordinates = feature.geometry?.coordinates?.[0];
          
          if (coordinates && patientCount > 0) {
            // Draw polygon
            ctx.beginPath();
            coordinates.forEach((coord: number[], index: number) => {
              const [lon, lat] = coord;
              
              // Convert to canvas coordinates
              const x = ((lon - minLon) / (maxLon - minLon)) * (canvas.width - 100) + 50;
              const y = canvas.height - (((lat - minLat) / (maxLat - minLat)) * (canvas.height - 100) + 50);
              
              if (index === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
            });
            ctx.closePath();
            
            // Fill with density-based color
            ctx.fillStyle = getColor(patientCount);
            ctx.fill();
            
            // White border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            drawnCount++;
            console.log('🔥🔥🔥 POLYGON DRAWN:', zipCode, 'patients:', patientCount);
          }
        });

        console.log('🔥🔥🔥 TOTAL POLYGONS DRAWN:', drawnCount);
      })
      .catch(error => {
        console.error('🔥🔥🔥 ERROR loading GeoJSON:', error);
        
        // Draw error indicator
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(50, 50, 300, 80);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('ERROR: Could not load ZIP boundaries', 60, 80);
        ctx.fillText('Check console for details', 60, 100);
      });
  }, [zipCounts, getColor]);

  // Canvas click handler for polygon interaction
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    console.log('🗺️ CANVAS POLYGON: Canvas clicked');
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    console.log('🗺️ CANVAS POLYGON: Click coordinates:', x, y);
    alert(`Geographic ZIP Code Map\nAuthentic Polygon Boundaries\nTotal Patients: ${totalPatients}\nZIP Codes: ${uniqueZipCount}`);
  };

  return (
    <div className="w-full h-full bg-white">
      {/* Header with statistics */}
      <div className="p-3 border-b">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex gap-4 text-sm text-gray-700 mt-1">
          <span>📊 Total Patients: {totalPatients.toLocaleString()}</span>
          <span>📍 ZIP Codes: {uniqueZipCount}</span>
          <span>🔥 Max per ZIP: {maxCount}</span>
          <span>🗺️ Authentic Polygons: {uniqueZipCount > 0 ? 'Active' : 'Loading...'}</span>
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
          <span className="font-medium">Geographic Visualization:</span>
          <span className="ml-2">Authentic ZIP code polygon boundaries with patient density</span>
          <span className="mx-2">•</span>
          <span>Color intensity represents patient concentration</span>
        </div>
      </div>
    </div>
  );
}