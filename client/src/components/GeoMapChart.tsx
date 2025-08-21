// Geographic Map Chart Component for HRSN Analytics
// Displays choropleth maps of zip codes colored by patient density

import { useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import LeafletZipMap from './LeafletZipMap';

interface GeoMapChartProps {
  data?: any[];
  title: string;
  categoryName: string;
  colorScheme?: any;
  filterBy?: any;
  dualSourceHrsnData?: any;
  compactMode?: boolean;
}

const GeoMapChart = ({
  data = [],
  title,
  categoryName,
  colorScheme,
  filterBy,
  dualSourceHrsnData,
  compactMode = true
}: GeoMapChartProps) => {
  const [useLeafletMap, setUseLeafletMap] = useState(true);
  
  console.log(`🗺️🗺️🗺️ GEOGRAPHIC MAP COMPONENT LOADED: ${title} with ${data?.length || 0} patients`);
  console.log(`🗺️ COMPONENT ENTRY: GeoMapChart loading for ${title}:`, { categoryName, dataLength: data.length });
  console.log(`🗺️ RENDERING MAP - compactMode: ${compactMode}, containerSize: ${compactMode ? 'h-64' : 'h-96'}`);
  
  // NEW LEAFLET IMPLEMENTATION - Use real ZIP code polygon boundaries
  if (useLeafletMap) {
    console.log('🗺️ RENDERING WITH LEAFLET - Real ZIP code polygon boundaries');
    return (
      <div className="relative">
        <LeafletZipMap 
          data={data}
          title={title}
          categoryName={categoryName}
          compactMode={compactMode}
          colorScheme={colorScheme}
          filterBy={filterBy}
        />
        <button 
          onClick={() => setUseLeafletMap(false)}
          className="absolute top-2 right-16 bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs transition-colors z-10"
          title="Switch to legacy map view"
        >
          Legacy
        </button>
      </div>
    );
  }
  
  console.log(`🗺️ LEGACY MAP - Using react-simple-maps with placeholder GeoJSON`);
  
  // Add toggle button for returning to Leaflet view
  const toggleButton = (
    <button 
      onClick={() => setUseLeafletMap(true)}
      className="absolute top-2 right-16 bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded text-xs transition-colors z-10"
      title="Switch to real ZIP code polygon map"
    >
      Polygon Map
    </button>
  );
  
  // Add Housing-specific debugging
  if (title.includes('Housing') || categoryName === 'housing_insecurity') {
    console.log(`🏠 HOUSING GEOGRAPHIC DEBUG - Title: ${title}, Category: ${categoryName}`);
    console.log(`🏠 Housing data sample:`, data?.slice(0, 3));
    console.log(`🏠 Data structure check:`, {
      isArray: Array.isArray(data),
      length: data?.length,
      firstItemKeys: data?.[0] ? Object.keys(data[0]) : 'no data'
    });
  }
  
  // Force component to always render for debugging
  console.log(`🗺️ FORCING RENDER - GeoMapChart for ${title} category=${categoryName}`);
  
  // Skip placeholder and always render the map - even with no data it will show boundaries
  console.log('🗺️ RENDERING CHOROPLETH MAP: Always showing geographic boundaries regardless of data availability');
  
  // Enhanced debugging for data structure
  console.log('🗺️ CRITICAL DEBUG - FULL DATA ANALYSIS:');
  console.log('🗺️ Data type:', typeof data);
  console.log('🗺️ Data isArray:', Array.isArray(data));
  console.log('🗺️ Data length:', data?.length || 'undefined');
  console.log('🗺️ First 3 data items:', data?.slice(0, 3));
  if (data && data.length > 0) {
    console.log('🗺️ Sample patient structure:', {
      keys: Object.keys(data[0]),
      zip_code: data[0].zip_code,
      zipCode: data[0].zipCode,
      zip: data[0].zip,
      patient_zip_code: data[0].patient_zip_code
    });
  }
  
  // Process data to get zip code counts
  const zipCodeData = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      console.log('🗺️ No valid data provided for mapping');
      return {};
    }
    
    if (data.length === 0) {
      console.log('🗺️ Empty data array provided');
      return {};
    }
    
    const zipCounts: { [key: string]: number } = {};
    
    // Count patients by ZIP code
    data.forEach((patient: any) => {
      if (!patient) return;
      
      // Try multiple ZIP code field variations
      let zipCode = patient.zip_code || patient.zipCode || patient.zip || patient.patient_zip_code;
      
      if (zipCode) {
        // Normalize ZIP code - handle both strings and numbers
        zipCode = String(zipCode);
        
        // Remove any extra characters and pad with leading zeros if needed
        zipCode = zipCode.replace(/[^\d]/g, '');
        if (zipCode.length === 4) {
          zipCode = '0' + zipCode; // Add leading zero for 4-digit ZIP codes
        }
        
        zipCounts[zipCode] = (zipCounts[zipCode] || 0) + 1;
      }
    });
    
    console.log('🗺️ ZIP CODE COUNTS:', zipCounts);
    console.log('🗺️ Total unique ZIP codes:', Object.keys(zipCounts).length);
    return zipCounts;
  }, [data]);

  // Create color scale based on data
  const maxCount = Math.max(...Object.values(zipCodeData), 1);
  const colorScale = (count: number) => {
    if (count === 0) return '#e0e0e0';
    const intensity = count / maxCount;
    const hue = 220; // Blue hue
    const saturation = 70;
    const lightness = Math.max(30, 90 - (intensity * 60));
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  return (
    <div className={`relative w-full bg-white rounded-lg border border-gray-200 ${compactMode ? 'h-64' : 'h-96'}`}>
      {toggleButton}
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{
          scale: compactMode ? 600 : 800,
          center: [-75.5, 40.0]
        }}
        width={compactMode ? 400 : 800}
        height={compactMode ? 256 : 384}
        className="w-full h-full"
        style={{
          width: "100%",
          height: "100%"
        }}
      >
        <Geographies geography="/us-zipcodes-real.geojson">
          {({ geographies }) =>
            geographies.map((geo) => {
              const zipCode = geo.properties.ZCTA5CE20 || geo.properties.ZCTA5CE10 || geo.properties.NAME || geo.properties.GEOID;
              const patientCount = zipCodeData[zipCode] || 0;
              
              console.log(`🗺️ Rendering ZIP: ${zipCode}, Count: ${patientCount}, Properties:`, Object.keys(geo.properties));
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={colorScale(patientCount)}
                  stroke="#ffffff"
                  strokeWidth={0.5}
                  style={{
                    default: {
                      outline: "none",
                    },
                    hover: {
                      fill: "#ff6b6b",
                      outline: "none",
                      strokeWidth: 1,
                    },
                    pressed: {
                      fill: "#ff4757",
                      outline: "none",
                    },
                  }}
                  onMouseEnter={() => {
                    console.log(`🗺️ Hovered ZIP: ${zipCode}, Patients: ${patientCount}`);
                  }}
                  onClick={() => {
                    console.log(`🗺️ Clicked ZIP: ${zipCode}, Patients: ${patientCount}`);
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      
      {/* Color Legend */}
      <div className="absolute bottom-2 left-2 bg-white p-2 rounded shadow-md text-xs">
        <div className="font-semibold mb-1">Patient Count</div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3" style={{ backgroundColor: '#e0e0e0' }}></div>
          <span>0</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3" style={{ backgroundColor: colorScale(Math.ceil(maxCount * 0.5)) }}></div>
          <span>{Math.ceil(maxCount * 0.5)}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3" style={{ backgroundColor: colorScale(maxCount) }}></div>
          <span>{maxCount}</span>
        </div>
      </div>
    </div>
  );
};

export default GeoMapChart;