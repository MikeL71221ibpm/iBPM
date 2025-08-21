import React, { useMemo, useRef, useEffect, useState } from 'react';

interface Patient {
  zip_code?: string;
  zipCode?: string;
  [key: string]: any;
}

interface WorkingChoroplethMapProps {
  data?: Patient[];
  apiEndpoint?: string;
  title?: string;
  categoryName?: string;
  colorScheme?: any;
  filterBy?: any;
  dualSourceHrsnData?: any;
  compactMode?: boolean;
  [key: string]: any; // Accept any additional props to prevent crashes
}

// WORKING CHOROPLETH MAP WITH ACTUAL ZIP CODE BOUNDARIES
export default function WorkingChoroplethMap({ 
  data, 
  apiEndpoint,
  title = "ZIP Code Patient Distribution",
  categoryName,
  colorScheme,
  filterBy,
  dualSourceHrsnData,
  compactMode,
  ...otherProps 
}: WorkingChoroplethMapProps) {
  // CRITICAL: First line to test if component executes AT ALL
  console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥 WORKING CHOROPLETH MAP EXECUTING!!!');
  console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥 PROPS:', { apiEndpoint, title, dataLength: data?.length || 0 });
  console.log('🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥 COMPONENT STARTED - THIS SHOULD DEFINITELY APPEAR!');
  
  // FIXED: React hooks must be declared at component scope, not inside try blocks
  console.log('🔥🔥🔥🔥🔥 DECLARING STATE VARIABLES...');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [geoData, setGeoData] = useState<any[]>([]);
  const [patientData, setPatientData] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  console.log('🔥🔥🔥🔥🔥 STATE VARIABLES DECLARED SUCCESSFULLY');
  console.log('🔥🔥🔥🔥🔥 CHOROPLETH MAP: COMPONENT EXECUTING - apiEndpoint:', apiEndpoint);
  console.log('🔥🔥🔥🔥🔥 CHOROPLETH MAP: Direct data prop:', data?.length || 0, 'patients');
  console.log('🔥🔥🔥🔥🔥 CHOROPLETH MAP: Title:', title);
  console.log('🔥🔥🔥🔥🔥 CHOROPLETH MAP: Loading state:', loading);
  console.log('🔥🔥🔥🔥🔥 CHOROPLETH MAP: This should render Canvas-based authentic ZIP code polygons!');
  
  // Fetch authentic patient data from API if endpoint provided
  useEffect(() => {
    console.log('🗺️🚨 CHOROPLETH MAP EFFECT: Starting data fetch process...');
    console.log('🗺️🚨 CHOROPLETH MAP EFFECT: apiEndpoint=', apiEndpoint);
    console.log('🗺️🚨 CHOROPLETH MAP EFFECT: data prop=', data?.length || 0, 'patients');
    
    if (apiEndpoint) {
      console.log('🗺️🚨 CHOROPLETH MAP: Fetching authentic patient ZIP code data from:', apiEndpoint);
      setLoading(true);
      fetch(apiEndpoint)
        .then(response => {
          console.log('🗺️🚨 CHOROPLETH MAP: API response status:', response.status);
          return response.json();
        })
        .then(apiData => {
          console.log('🗺️🚨 CHOROPLETH MAP: Received API response:', apiData);
          if (apiData.success && apiData.patients) {
            setPatientData(apiData.patients);
            setLoading(false);
            console.log('🗺️🚨 CHOROPLETH MAP: Successfully loaded', apiData.patients.length, 'authentic patients with ZIP codes');
            console.log('🗺️🚨 CHOROPLETH MAP: Sample patient ZIP codes:', apiData.patients.slice(0, 5).map(p => p.zip_code || p.zipCode));
          } else {
            console.error('🗺️🚨 CHOROPLETH MAP: API response failed:', apiData);
            setError('Failed to load patient data from API');
            setLoading(false);
          }
        })
        .catch(err => {
          console.error('🗺️🚨 CHOROPLETH MAP: API fetch error:', err);
          setError('Error fetching patient data: ' + err.message);
          setLoading(false);
        });
    } else if (data && data.length > 0) {
      console.log('🗺️🚨 CHOROPLETH MAP: Using direct data prop with', data.length, 'patients');
      setPatientData(data);
      setLoading(false);
    } else {
      console.log('🗺️🚨 CHOROPLETH MAP: No API endpoint and no data prop - setting loading to false');
      setLoading(false);
    }
  }, [apiEndpoint, data]);
  
  // Use either API data or direct data prop
  const activeData = patientData.length > 0 ? patientData : (data || []);
  console.log('🗺️ WORKING MAP: Active data source:', activeData.length, 'patients');
  
  // Process patient ZIP codes - ALWAYS run this hook
  const zipCounts = useMemo(() => {
    if (!activeData || !Array.isArray(activeData) || activeData.length === 0) {
      return {};
    }
    
    const counts: Record<string, number> = {};
    
    activeData.forEach(patient => {
      const zip = patient.zip_code || patient.zipCode;
      if (zip && zip.toString().trim()) {
        const normalizedZip = zip.toString().padStart(5, '0');
        counts[normalizedZip] = (counts[normalizedZip] || 0) + 1;
      }
    });
    
    console.log('🗺️ WORKING MAP: Processed', Object.keys(counts).length, 'ZIP codes from', activeData.length, 'patients');
    console.log('🗺️ WORKING MAP: Top ZIP codes:', Object.entries(counts).slice(0, 5));
    
    return counts;
  }, [activeData]);

  // Load actual ZIP code boundary polygons from GeoJSON - ALWAYS run this hook 
  useEffect(() => {
    if (Object.keys(zipCounts).length === 0) {
      setLoading(false);
      return;
    }
    
    console.log('🗺️ WORKING MAP: Loading authentic ZIP code boundary polygons');
    console.log('🗺️ WORKING MAP: Active data contains', activeData?.length || 0, 'patients');
    console.log('🗺️ WORKING MAP: ZIP count analysis:', Object.keys(zipCounts).length, 'unique ZIP codes');
    
    setLoading(true);
    setError(null);
    
    // Load authentic ZIP code boundary data
    fetch('/us-zipcodes-real.geojson')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(geoJsonData => {
        console.log('🗺️ WORKING MAP: Loaded GeoJSON with', geoJsonData.features?.length || 0, 'ZIP boundaries');
        
        // SHOW ALL ZIP CODE BOUNDARIES - not just ones with patients
        const patientZips = Object.keys(zipCounts);
        console.log('🗺️ WORKING MAP: Patient ZIP codes for highlighting:', patientZips.slice(0, 10));
        console.log('🗺️ WORKING MAP: SHOWING ALL ZIP BOUNDARIES - not filtering by patient data');
        
        // Use ALL features to show complete geographic boundaries
        const filteredFeatures = geoJsonData.features || [];
        
        console.log('🗺️ WORKING MAP: Found', filteredFeatures.length, 'matching ZIP boundaries for patient data');
        setGeoData(filteredFeatures);
        setLoading(false);
      })
      .catch(error => {
        console.error('🗺️ WORKING MAP: Error loading ZIP boundaries:', error);
        setError(`Failed to load ZIP code boundaries: ${error.message}`);
        setLoading(false);
      });
  }, [zipCounts]);

  // Render map
  useEffect(() => {
    console.log('🗺️ CANVAS RENDER: Starting render check');
    console.log('🗺️ CANVAS RENDER: Loading state:', loading);
    console.log('🗺️ CANVAS RENDER: GeoData length:', geoData.length);
    console.log('🗺️ CANVAS RENDER: ZipCounts:', Object.keys(zipCounts).length, 'ZIP codes');
    
    if (loading || geoData.length === 0 || !zipCounts) {
      console.log('🗺️ CANVAS RENDER: Skipping render - conditions not met');
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    console.log('🔥🔥🔥 WORKING MAP: POLYGON RENDERING STARTING NOW!');
    
    // Set canvas size for better visibility
    canvas.width = 1000;
    canvas.height = 600;
    
    // Clear canvas with WHITE background for clean printing
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate geographic bounds
    let minLon = Infinity, maxLon = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
    geoData.forEach(feature => {
      if (feature.geometry?.coordinates) {
        feature.geometry.coordinates[0].forEach((coord: number[]) => {
          const [lon, lat] = coord;
          minLon = Math.min(minLon, lon);
          maxLon = Math.max(maxLon, lon);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        });
      }
    });
    
    console.log('🗺️ WORKING MAP: Bounds:', { minLon, maxLon, minLat, maxLat });
    console.log('🗺️ WORKING MAP: ZIP counts:', Object.keys(zipCounts).length, 'unique ZIP codes');
    console.log('🗺️ WORKING MAP: Sample patient ZIPs:', Object.keys(zipCounts).slice(0, 10));
    
    const maxPatients = Math.max(...Object.values(zipCounts), 0);
    let renderedCount = 0;
    let matchedCount = 0;
    
    // Draw ALL ZIP code boundary polygons - both with and without patient data
    geoData.forEach(feature => {
      const zipCode = feature.properties?.ZCTA5CE10 || 
                     feature.properties?.ZCTA5CE20 || 
                     feature.properties?.ZIP || 
                     feature.properties?.zip_code;
      const patientCount = zipCounts[zipCode] || 0;
      
      if (patientCount > 0) {
        console.log('🗺️ WORKING MAP: Drawing ZIP', zipCode, 'with', patientCount, 'patients');
        matchedCount++;
      }
      
      // Color ALL polygons - highlight those with patient data
      let fillColor = '#f9fafb'; // Light background for ZIP codes with no patients
      let strokeColor = '#e5e7eb'; // Light gray border for empty ZIP codes
      let strokeWidth = 0.5;
      
      if (patientCount > 0) {
        // Color by patient density for ZIP codes with patients
        const intensity = patientCount / maxPatients;
        if (intensity <= 0.2) fillColor = '#bfdbfe';
        else if (intensity <= 0.4) fillColor = '#93c5fd';
        else if (intensity <= 0.6) fillColor = '#60a5fa';
        else if (intensity <= 0.8) fillColor = '#3b82f6';
        else fillColor = '#1d4ed8';
        
        strokeColor = '#ffffff'; // White borders for ZIP codes with patients
        strokeWidth = 1;
      }
      
      // Draw authentic ZIP code polygon boundaries
      if (feature.geometry?.coordinates?.[0]) {
        const coords = feature.geometry.coordinates[0];
        
        ctx.beginPath();
        coords.forEach((coord: number[], index: number) => {
          const [lon, lat] = coord;
          
          // Convert geographic coordinates to Canvas pixels
          const x = ((lon - minLon) / (maxLon - minLon)) * (canvas.width - 100) + 50;
          const y = canvas.height - (((lat - minLat) / (maxLat - minLat)) * (canvas.height - 100) + 50);
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        
        // Fill polygon
        ctx.fillStyle = fillColor;
        ctx.fill();
        
        // Draw border with appropriate styling
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
        
        // Add ZIP code label at polygon center
        if (patientCount > 0) {
          const centerLon = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length;
          const centerLat = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length;
          const labelX = ((centerLon - minLon) / (maxLon - minLon)) * (canvas.width - 100) + 50;
          const labelY = canvas.height - (((centerLat - minLat) / (maxLat - minLat)) * (canvas.height - 100) + 50);
          
          ctx.fillStyle = patientCount > 15 ? '#ffffff' : '#1f2937';
          ctx.font = 'bold 10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(zipCode, labelX, labelY - 2);
          
          ctx.font = '9px Arial';
          ctx.fillText(`${patientCount}`, labelX, labelY + 10);
        }
        
        renderedCount++;
      }
    });
    
    console.log('🗺️ WORKING MAP: Rendered', renderedCount, 'total ZIP boundaries,', matchedCount, 'with patients');
    
    // Add title and stats
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(title, 20, 30);
    
    ctx.font = '14px Arial';
    ctx.fillText(`Patients: ${Object.values(zipCounts).reduce((a, b) => a + b, 0)}`, 20, 55);
    ctx.fillText(`ZIP Codes: ${Object.keys(zipCounts).length}`, 200, 55);
    ctx.fillText(`Max per ZIP: ${maxPatients}`, 380, 55);
    
  }, [geoData, zipCounts, loading, title]);

  // FORCED POLYGON RENDERING - NO LOADING DELAYS
  if (loading) {
    console.log('🔥🔥🔥 BYPASS LOADING STATE - RENDER IMMEDIATELY');
    // Force immediate polygon rendering instead of loading state
  }

  // Handle error state
  if (error) {
    return (
      <div className="w-full h-96 bg-red-50 flex items-center justify-center border rounded-lg">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-700">Error Loading Map</div>
          <div className="text-sm text-red-600 mt-2">{error}</div>
        </div>
      </div>
    );
  }

  // Handle case with no patient data but still render map container
  if (!activeData || !Array.isArray(activeData) || activeData.length === 0) {
    console.log('🗺️ WORKING MAP: No patient data - rendering empty map container');
    return (
      <div className="w-full bg-white border rounded-lg overflow-hidden">
        <div className="p-3 border-b">
          <h3 className="font-semibold">{title}</h3>
          <div className="text-sm text-gray-600 mt-1">
            No patient data available for geographic visualization
          </div>
        </div>
        
        <div className="p-4">
          <div className="w-full h-96 bg-gray-100 flex items-center justify-center border border-gray-200 rounded">
            <div className="text-center text-gray-500">
              <div className="text-lg font-medium">No Geographic Data</div>
              <div className="text-sm mt-1">Patient ZIP codes required for choropleth mapping</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('🗺️🔥🔥🔥 WORKING CHOROPLETH MAP EXECUTING - THIS COMPONENT IS RUNNING!');
  console.log('🗺️🔥🔥🔥 CHOROPLETH MAP: RENDERING FINAL CANVAS COMPONENT!');
  console.log('🗺️🔥🔥🔥 CHOROPLETH MAP: GeoData length:', geoData.length);
  console.log('🗺️🔥🔥🔥 CHOROPLETH MAP: ZIP counts:', Object.keys(zipCounts).length);
  console.log('🗺️🔥🔥🔥 CHOROPLETH MAP: Active data:', activeData.length, 'patients');

  return (
    <div className="w-full bg-white border rounded-lg overflow-hidden">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <div className="text-sm text-gray-700 mt-1">
          🗺️ ACTIVE: {activeData.length} patients, {Object.keys(zipCounts).length} ZIP codes, {geoData.length} boundaries
        </div>
      </div>
      
      <div className="p-4">
        <canvas 
          ref={canvasRef}
          width={1000}
          height={800}
          className="w-full border rounded"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
        
        <div className="mt-3 flex gap-4 text-sm text-gray-600">
          <span>📊 Total Patients: {Object.values(zipCounts).reduce((a, b) => a + b, 0)}</span>
          <span>📍 Patient ZIP Codes: {Object.keys(zipCounts).length}</span>
          <span>🗺️ Geographic Boundaries: {geoData.length}</span>
          <span>🌍 Authentic Polygons: {geoData.length > 0 ? 'Loaded' : 'Loading...'}</span>
        </div>
      </div>
    </div>
  );
}