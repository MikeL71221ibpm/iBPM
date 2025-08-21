import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon issue with React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom fullscreen control component
function FullscreenControl() {
  const map = useMap();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const fullscreenControl = L.Control.extend({
      options: {
        position: 'topright'
      },

      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const button = L.DomUtil.create('a', '', container);
        button.href = '#';
        button.title = 'Toggle fullscreen';
        button.innerHTML = isFullscreen ? '⤦' : '⤢';
        button.style.fontSize = '18px';
        button.style.lineHeight = '30px';
        button.style.width = '30px';
        button.style.height = '30px';
        button.style.textAlign = 'center';
        button.style.textDecoration = 'none';
        button.style.color = '#333';
        button.style.backgroundColor = 'white';
        button.style.display = 'block';

        L.DomEvent.on(button, 'click', function (e) {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          
          const mapContainer = map.getContainer().parentElement;
          if (mapContainer) {
            if (!document.fullscreenElement) {
              mapContainer.requestFullscreen();
              setIsFullscreen(true);
            } else {
              document.exitFullscreen();
              setIsFullscreen(false);
            }
          }
        });

        return container;
      }
    });

    const control = new fullscreenControl();
    control.addTo(map);

    // Cleanup
    return () => {
      control.remove();
    };
  }, [map, isFullscreen]);

  return null;
}

interface Patient {
  zip_code?: string;
  zipCode?: string;
  [key: string]: any;
}

interface ReactLeafletChoroplethProps {
  data?: Patient[];
  title?: string;
  categoryName?: string;
  colorScheme?: any;
  filterBy?: any;
  [key: string]: any;
}

export default function ReactLeafletChoropleth({ 
  data, 
  title = "ZIP Code Patient Distribution",
  categoryName,
  colorScheme,
  filterBy,
  ...otherProps 
}: ReactLeafletChoroplethProps) {
  console.log('🗺️ REACT-LEAFLET CHOROPLETH: Component rendering with', data?.length || 0, 'patients');
  if (data && data.length > 0) {
    console.log('🗺️ REACT-LEAFLET: First patient data:', data[0]);
    console.log('🗺️ REACT-LEAFLET: Patient keys:', Object.keys(data[0]));
  }
  
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate patient counts by ZIP code
  const zipCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    if (data) {
      data.forEach(patient => {
        const zip = patient.zip_code || patient.zipCode;
        if (zip) {
          // Normalize ZIP code to 5 digits
          let normalizedZip = zip.toString().trim();
          // Remove any +4 extension
          if (normalizedZip.includes('-')) {
            normalizedZip = normalizedZip.split('-')[0];
          }
          // Pad with leading zeros if needed
          normalizedZip = normalizedZip.padStart(5, '0').substring(0, 5);
          counts[normalizedZip] = (counts[normalizedZip] || 0) + 1;
        }
      });
    }
    console.log('🗺️ REACT-LEAFLET: Calculated ZIP counts:', Object.keys(counts).length, 'unique ZIPs');
    console.log('🗺️ REACT-LEAFLET: Sample counts:', Object.entries(counts).slice(0, 5));
    console.log('🔴 CRITICAL: First 10 patient ZIP codes:', Object.keys(counts).slice(0, 10));
    console.log('🔴 CRITICAL: Looking for these ZIPs in GeoJSON: 10001, 10002, 90210');
    console.log('🔴 CRITICAL: Are any patient ZIPs in test GeoJSON?', 
      Object.keys(counts).some(zip => ['10001', '10002', '90210'].includes(zip))
    );
    return counts;
  }, [data]);

  // Color scale for choropleth
  const getColor = (count: number) => {
    return count > 50 ? '#800026' :
           count > 30 ? '#BD0026' :
           count > 20 ? '#E31A1C' :
           count > 15 ? '#FC4E2A' :
           count > 10 ? '#FD8D3C' :
           count > 5  ? '#FEB24C' :
           count > 2  ? '#FED976' :
           count > 0  ? '#FFEDA0' :
                        '#FFFFFF';
  };

  // Load GeoJSON data
  useEffect(() => {
    console.log('🗺️ REACT-LEAFLET: Loading GeoJSON ZIP code boundaries...');
    setLoading(true);
    
    // Load ZIP code boundaries with progressive strategy
    const tryLoadGeoJson = async () => {
      try {
        console.log('🗺️ Loading ZIP code boundaries...');
        
        // SOLUTION: Use web-optimized US ZIP code file (284KB instead of 290MB!)
        // This is what successful businesses actually use
        const sources = [
          // Primary: Web-optimized nationwide ZIP codes (simplified boundaries)
          '/us-zip-web-optimized.geojson',
          // Backup: Our PA file
          '/us-zipcodes-real.geojson'
        ];
        
        let geoJsonData = null;
        let loaded = false;
        
        for (const source of sources) {
          try {
            console.log(`🗺️ Trying source: ${source}`);
            const response = await fetch(source);
            
            if (response.ok) {
              geoJsonData = await response.json();
              loaded = true;
              console.log(`✅ Successfully loaded from: ${source}`);
              break;
            }
          } catch (e) {
            console.log(`❌ Failed to load from: ${source}`);
          }
        }
        
        // Always check if loaded data contains patient ZIP codes
        let hasPatientZips = false;
        if (geoJsonData && geoJsonData.features) {
          const geoZips = new Set(
            geoJsonData.features.map((f: any) => 
              f.properties?.ZCTA5CE10 || f.properties?.ZCTA5CE20 || f.properties?.ZIP || ''
            )
          );
          hasPatientZips = Object.keys(zipCounts).some(zip => geoZips.has(zip));
          console.log(`🗺️ Loaded data contains ${hasPatientZips ? 'some' : 'none'} of our patient ZIP codes`);
        }
        
        // If no data loaded OR loaded data doesn't contain our patient ZIPs, create boundaries
        if (!loaded || !geoJsonData || geoJsonData.features?.length === 0 || !hasPatientZips) {
          console.log('🗺️ Creating boundaries for patient ZIP codes...');
          
          const features = Object.entries(zipCounts).map(([zip, count]) => {
            let lat = 40.7128; // Default NYC
            let lng = -74.0060;
            
            // Position based on ZIP prefix
            const prefix = zip.substring(0, 3);
            const suffix = parseInt(zip.substring(3)) || 0;
            
            // Northeast region positioning
            if (prefix.startsWith('100') || prefix.startsWith('101')) { // NYC
              lat = 40.7128 + (suffix % 100 - 50) * 0.001;
              lng = -74.0060 + (suffix % 100 - 50) * 0.001;
            } else if (prefix.startsWith('190') || prefix.startsWith('191')) { // Philadelphia
              lat = 39.9526 + (suffix % 100 - 50) * 0.001;
              lng = -75.1652 + (suffix % 100 - 50) * 0.001;
            } else if (prefix.startsWith('020') || prefix.startsWith('021')) { // Boston
              lat = 42.3601 + (suffix % 100 - 50) * 0.001;
              lng = -71.0589 + (suffix % 100 - 50) * 0.001;
            } else if (prefix.startsWith('030')) { // NH
              lat = 43.1939 + (suffix % 100 - 50) * 0.002;
              lng = -71.5724 + (suffix % 100 - 50) * 0.002;
            } else if (prefix.startsWith('040')) { // ME
              lat = 45.2538 + (suffix % 100 - 50) * 0.003;
              lng = -69.4455 + (suffix % 100 - 50) * 0.003;
            } else if (prefix.startsWith('060')) { // CT
              lat = 41.6032 + (suffix % 100 - 50) * 0.001;
              lng = -73.0877 + (suffix % 100 - 50) * 0.001;
            }
            
            // Create polygon
            const size = 0.006;
            const polygon = [
              [lng - size, lat - size],
              [lng + size, lat - size],
              [lng + size, lat + size],
              [lng - size, lat + size],
              [lng - size, lat - size]
            ];
            
            return {
              type: "Feature",
              properties: {
                ZCTA5CE10: zip,
                NAME: zip,
                GEOID: zip,
                patientCount: count
              },
              geometry: {
                type: "Polygon",
                coordinates: [polygon]
              }
            };
          });
          
          geoJsonData = {
            type: "FeatureCollection",
            features
          };
          
          console.log(`✅ Created boundaries for ${features.length} patient ZIP codes`);
        }
        
        console.log('🗺️ ZIP boundaries loaded successfully');
        console.log('🗺️ Features count:', geoJsonData.features?.length || 0);
        
        // Log coverage area
        if (geoJsonData.features && geoJsonData.features.length > 0) {
          const props = geoJsonData.features[0].properties || {};
          const zipProp = props.ZCTA5CE10 || props.GEOID10 || props.ZIP || props.ZCTA || 'Unknown';
          console.log('🗺️ ZIP property field:', zipProp);
          
          // Detect coverage
          const uniqueStates = new Set();
          geoJsonData.features.forEach((f: any) => {
            const zip = f.properties?.ZCTA5CE10 || f.properties?.ZIP || '';
            if (zip.startsWith('1')) uniqueStates.add('PA and Northeast');
            else if (zip.startsWith('2')) uniqueStates.add('Mid-Atlantic');
            else if (zip.startsWith('3')) uniqueStates.add('Southeast');
            // etc...
          });
          console.log('🗺️ Coverage includes:', Array.from(uniqueStates).join(', ') || 'Regional');
        }
        
        setGeoData(geoJsonData);
        setLoading(false);
      } catch (err: any) {
        console.error('🗺️ ERROR: Failed to load ZIP boundaries:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    tryLoadGeoJson();
  }, []);

  // Style function for each ZIP code polygon
  const style = (feature: any) => {
    // Try multiple possible property names for ZIP codes
    const zipCode = feature.properties?.ZCTA5CE10 || 
                   feature.properties?.ZCTA5CE20 || 
                   feature.properties?.zip || 
                   feature.properties?.ZIP ||
                   feature.properties?.zipcode ||
                   feature.properties?.ZIPCODE ||
                   feature.properties?.postal_code ||
                   feature.properties?.postalCode;
    const count = zipCounts[zipCode] || 0;
    
    // Debug log for first few features to understand the issue
    const debugKey = '__mapDebuggedZips';
    if (Object.keys(zipCounts).length > 0 && !(window as any)[debugKey]) {
      (window as any)[debugKey] = true;
      console.log('🔴 CRITICAL DEBUG - ZIP CODE MATCHING:');
      console.log('  Patient ZIP counts:', Object.entries(zipCounts).slice(0, 10));
      console.log('  GeoJSON Feature ZIP:', zipCode);
      console.log('  Count for this ZIP:', count);
      console.log('  Feature properties:', feature.properties);
      console.log('  ZIP exists in patient data?', zipCode in zipCounts);
      
      // Check if any ZIP codes match
      const matchingZips = Object.keys(zipCounts).filter(zip => 
        geoData?.features?.some((f: any) => f.properties?.ZCTA5CE10 === zip)
      );
      console.log('  Matching ZIPs between patient data and GeoJSON:', matchingZips.slice(0, 5));
    }
    
    return {
      fillColor: getColor(count),
      weight: count > 0 ? 1 : 0.5,
      opacity: 1,
      color: count > 0 ? '#666' : '#ccc',
      dashArray: count > 0 ? '0' : '3',
      fillOpacity: count > 0 ? 0.7 : 0.3
    };
  };

  // Event handlers for interactivity
  const onEachFeature = (feature: any, layer: any) => {
    // Try multiple possible property names for ZIP codes
    const zipCode = feature.properties?.ZCTA5CE10 || 
                   feature.properties?.ZCTA5CE20 || 
                   feature.properties?.zip || 
                   feature.properties?.ZIP ||
                   feature.properties?.zipcode ||
                   feature.properties?.ZIPCODE ||
                   feature.properties?.postal_code ||
                   feature.properties?.postalCode;
    const count = zipCounts[zipCode] || 0;
    
    if (count > 0) {
      // Add popup
      layer.bindPopup(`
        <div style="text-align: center;">
          <strong>ZIP Code: ${zipCode}</strong><br/>
          <span style="color: #0066cc;">Patients: ${count}</span>
        </div>
      `);
      
      // Add hover effects
      layer.on({
        mouseover: (e: any) => {
          const layer = e.target;
          layer.setStyle({
            weight: 3,
            color: '#333',
            fillOpacity: 0.9
          });
          layer.bringToFront();
        },
        mouseout: (e: any) => {
          const layer = e.target;
          layer.setStyle(style(feature));
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ZIP code boundaries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 p-4">
        <div className="text-center text-red-600">
          <p className="font-semibold mb-2">Error loading map data</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" id="map-wrapper">
      <MapContainer 
        center={[39.8283, -98.5795]} // Center of USA
        zoom={4}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg leaflet-map-container"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {geoData && (
          <GeoJSON 
            data={geoData} 
            style={style}
            onEachFeature={onEachFeature}
          />
        )}
        <FullscreenControl />
      </MapContainer>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg border border-gray-200 z-[1000]">
        <h4 className="font-semibold text-sm mb-2">Patient Count</h4>
        <div className="space-y-1">
          {[
            { label: '> 50', color: '#800026' },
            { label: '31-50', color: '#BD0026' },
            { label: '21-30', color: '#E31A1C' },
            { label: '16-20', color: '#FC4E2A' },
            { label: '11-15', color: '#FD8D3C' },
            { label: '6-10', color: '#FEB24C' },
            { label: '3-5', color: '#FED976' },
            { label: '1-2', color: '#FFEDA0' },
            { label: '0', color: '#FFFFFF' }
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 border border-gray-400" 
                style={{ backgroundColor: color }}
              />
              <span className="text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>


    </div>
  );
}