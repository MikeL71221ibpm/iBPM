import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LeafletZipMapProps {
  data?: any[];
  title: string;
  categoryName?: string;
  compactMode?: boolean;
  filterBy?: any;
  colorScheme?: string;
}

// State abbreviation to name mapping for ZIP code data
const STATE_DATA_URLS: { [key: string]: string } = {
  'AL': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/al_alabama_zip_codes_geo.min.json',
  'AK': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ak_alaska_zip_codes_geo.min.json',
  'AZ': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/az_arizona_zip_codes_geo.min.json',
  'AR': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ar_arkansas_zip_codes_geo.min.json',
  'CA': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ca_california_zip_codes_geo.min.json',
  'CO': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/co_colorado_zip_codes_geo.min.json',
  'CT': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ct_connecticut_zip_codes_geo.min.json',
  'DE': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/de_delaware_zip_codes_geo.min.json',
  'FL': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/fl_florida_zip_codes_geo.min.json',
  'GA': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ga_georgia_zip_codes_geo.min.json',
  'HI': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/hi_hawaii_zip_codes_geo.min.json',
  'ID': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/id_idaho_zip_codes_geo.min.json',
  'IL': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/il_illinois_zip_codes_geo.min.json',
  'IN': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/in_indiana_zip_codes_geo.min.json',
  'IA': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ia_iowa_zip_codes_geo.min.json',
  'KS': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ks_kansas_zip_codes_geo.min.json',
  'KY': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ky_kentucky_zip_codes_geo.min.json',
  'LA': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/la_louisiana_zip_codes_geo.min.json',
  'ME': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/me_maine_zip_codes_geo.min.json',
  'MD': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/md_maryland_zip_codes_geo.min.json',
  'MA': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ma_massachusetts_zip_codes_geo.min.json',
  'MI': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/mi_michigan_zip_codes_geo.min.json',
  'MN': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/mn_minnesota_zip_codes_geo.min.json',
  'MS': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ms_mississippi_zip_codes_geo.min.json',
  'MO': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/mo_missouri_zip_codes_geo.min.json',
  'MT': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/mt_montana_zip_codes_geo.min.json',
  'NE': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ne_nebraska_zip_codes_geo.min.json',
  'NV': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/nv_nevada_zip_codes_geo.min.json',
  'NH': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/nh_new_hampshire_zip_codes_geo.min.json',
  'NJ': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/nj_new_jersey_zip_codes_geo.min.json',
  'NM': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/nm_new_mexico_zip_codes_geo.min.json',
  'NY': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ny_new_york_zip_codes_geo.min.json',
  'NC': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/nc_north_carolina_zip_codes_geo.min.json',
  'ND': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/nd_north_dakota_zip_codes_geo.min.json',
  'OH': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/oh_ohio_zip_codes_geo.min.json',
  'OK': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ok_oklahoma_zip_codes_geo.min.json',
  'OR': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/or_oregon_zip_codes_geo.min.json',
  'PA': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/pa_pennsylvania_zip_codes_geo.min.json',
  'RI': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ri_rhode_island_zip_codes_geo.min.json',
  'SC': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/sc_south_carolina_zip_codes_geo.min.json',
  'SD': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/sd_south_dakota_zip_codes_geo.min.json',
  'TN': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/tn_tennessee_zip_codes_geo.min.json',
  'TX': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/tx_texas_zip_codes_geo.min.json',
  'UT': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/ut_utah_zip_codes_geo.min.json',
  'VT': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/vt_vermont_zip_codes_geo.min.json',
  'VA': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/va_virginia_zip_codes_geo.min.json',
  'WA': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/wa_washington_zip_codes_geo.min.json',
  'WV': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/wv_west_virginia_zip_codes_geo.min.json',
  'WI': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/wi_wisconsin_zip_codes_geo.min.json',
  'WY': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/wy_wyoming_zip_codes_geo.min.json',
  'DC': 'https://raw.githubusercontent.com/OpenDataDE/State-zip-code-GeoJSON/master/dc_district_of_columbia_zip_codes_geo.min.json'
};

const LeafletZipMap: React.FC<LeafletZipMapProps> = ({
  data = [],
  title,
  categoryName,
  compactMode = true
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const geoJsonLayersRef = useRef<L.GeoJSON[]>([]);
  const [loadedStates, setLoadedStates] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  console.log(`🗺️ LEAFLET ZIP MAP LOADED: ${title} with ${data?.length || 0} patients`);

  // Process patient data to get ZIP code counts and determine states
  const zipCodeData = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      console.log('🗺️ No valid data for ZIP code mapping');
      return { zipCounts: {}, statesNeeded: [] };
    }

    const zipCounts: { [key: string]: number } = {};
    const statesNeeded = new Set<string>();
    
    data.forEach((patient: any) => {
      if (!patient) return;
      
      // Try multiple ZIP code field variations
      let zipCode = patient.zip_code || patient.zipCode || patient.zip || patient.patient_zip_code;
      
      if (zipCode) {
        // Normalize ZIP code
        zipCode = String(zipCode).replace(/[^\d]/g, '');
        if (zipCode.length === 4) zipCode = '0' + zipCode;
        
        zipCounts[zipCode] = (zipCounts[zipCode] || 0) + 1;
        
        // Determine state from ZIP code prefix
        const zipPrefix = zipCode.substring(0, 2);
        const state = getStateFromZipPrefix(zipPrefix);
        if (state) statesNeeded.add(state);
      }
    });
    
    console.log('🗺️ ZIP CODE COUNTS:', Object.keys(zipCounts).length, 'unique ZIP codes');
    console.log('🗺️ STATES NEEDED:', Array.from(statesNeeded));
    
    return { zipCounts, statesNeeded: Array.from(statesNeeded) };
  }, [data]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    // Create map with canvas renderer for better performance
    leafletMapRef.current = L.map(mapRef.current, {
      preferCanvas: true,
      renderer: L.canvas()
    }).setView([39.8283, -98.5795], 4);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }).addTo(leafletMapRef.current);

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Load ZIP code GeoJSON data for needed states
  useEffect(() => {
    if (!leafletMapRef.current || zipCodeData.statesNeeded.length === 0) return;
    
    const statesToLoad = zipCodeData.statesNeeded.filter(state => !loadedStates.has(state));
    if (statesToLoad.length === 0) return;

    setIsLoading(true);
    
    Promise.all(
      statesToLoad.map(state => 
        fetch(STATE_DATA_URLS[state])
          .then(response => response.json())
          .then(geoData => ({ state, geoData }))
          .catch(error => {
            console.warn(`Failed to load ZIP codes for ${state}:`, error);
            return null;
          })
      )
    ).then(results => {
      results.forEach(result => {
        if (!result || !leafletMapRef.current) return;
        
        const { state, geoData } = result;
        
        // Create GeoJSON layer with styling
        const geoJsonLayer = L.geoJSON(geoData, {
          style: (feature) => {
            const zipCode = feature?.properties?.ZCTA5CE10 || feature?.properties?.GEOID10;
            const patientCount = zipCodeData.zipCounts[zipCode] || 0;
            
            return {
              fillColor: getZipColor(patientCount, Math.max(...Object.values(zipCodeData.zipCounts), 1)),
              weight: 1,
              opacity: 0.8,
              color: '#ffffff',
              fillOpacity: patientCount > 0 ? 0.8 : 0.1
            };
          },
          onEachFeature: (feature, layer) => {
            const zipCode = feature?.properties?.ZCTA5CE10 || feature?.properties?.GEOID10;
            const patientCount = zipCodeData.zipCounts[zipCode] || 0;
            
            // Add popup with ZIP code information
            layer.bindPopup(`
              <div class="font-medium">ZIP Code: ${zipCode}</div>
              <div>Patients: ${patientCount}</div>
              <div class="text-sm text-gray-600">${title}</div>
            `);
            
            // Add hover effects
            layer.on({
              mouseover: (e) => {
                const target = e.target;
                target.setStyle({
                  weight: 3,
                  fillOpacity: 0.9
                });
              },
              mouseout: (e) => {
                const target = e.target;
                target.setStyle({
                  weight: 1,
                  fillOpacity: patientCount > 0 ? 0.8 : 0.1
                });
              }
            });
          }
        });
        
        geoJsonLayer.addTo(leafletMapRef.current);
        geoJsonLayersRef.current.push(geoJsonLayer);
        
        console.log(`🗺️ Loaded ${state} ZIP code boundaries`);
      });
      
      // Update loaded states
      setLoadedStates(prev => new Set([...Array.from(prev), ...statesToLoad]));
      setIsLoading(false);
    });
  }, [zipCodeData, loadedStates]);

  // Color scale function
  const getZipColor = (count: number, maxCount: number) => {
    if (count === 0) return '#e5e7eb'; // Gray for no data
    const intensity = count / maxCount;
    
    // Use a blue color scheme
    const baseColor = [59, 130, 246]; // Blue
    const white = [255, 255, 255];
    
    const r = Math.round(white[0] + (baseColor[0] - white[0]) * intensity);
    const g = Math.round(white[1] + (baseColor[1] - white[1]) * intensity);
    const b = Math.round(white[2] + (baseColor[2] - white[2]) * intensity);
    
    return `rgb(${r}, ${g}, ${b})`;
  };

  // Get state abbreviation from ZIP code prefix
  function getStateFromZipPrefix(zipPrefix: string): string | null {
    const zipNum = parseInt(zipPrefix);
    
    // ZIP code to state mapping (simplified)
    if (zipNum >= 1 && zipNum <= 5) return 'MA';
    if (zipNum >= 6 && zipNum <= 9) return 'CT';
    if (zipNum >= 10 && zipNum <= 14) return 'NY';
    if (zipNum >= 15 && zipNum <= 19) return 'PA';
    if (zipNum >= 20 && zipNum <= 26) return 'MD';
    if (zipNum >= 27 && zipNum <= 28) return 'NC';
    if (zipNum >= 29 && zipNum <= 29) return 'SC';
    if (zipNum >= 30 && zipNum <= 31) return 'GA';
    if (zipNum >= 32 && zipNum <= 34) return 'FL';
    if (zipNum >= 35 && zipNum <= 36) return 'AL';
    if (zipNum >= 37 && zipNum <= 38) return 'TN';
    if (zipNum >= 39 && zipNum <= 39) return 'MS';
    if (zipNum >= 40 && zipNum <= 42) return 'KY';
    if (zipNum >= 43 && zipNum <= 45) return 'OH';
    if (zipNum >= 46 && zipNum <= 47) return 'IN';
    if (zipNum >= 48 && zipNum <= 49) return 'MI';
    if (zipNum >= 50 && zipNum <= 52) return 'IA';
    if (zipNum >= 53 && zipNum <= 54) return 'WI';
    if (zipNum >= 55 && zipNum <= 56) return 'MN';
    if (zipNum >= 57 && zipNum <= 57) return 'SD';
    if (zipNum >= 58 && zipNum <= 58) return 'ND';
    if (zipNum >= 59 && zipNum <= 59) return 'MT';
    if (zipNum >= 60 && zipNum <= 62) return 'IL';
    if (zipNum >= 63 && zipNum <= 65) return 'MO';
    if (zipNum >= 66 && zipNum <= 67) return 'KS';
    if (zipNum >= 68 && zipNum <= 69) return 'NE';
    if (zipNum >= 70 && zipNum <= 71) return 'LA';
    if (zipNum >= 72 && zipNum <= 72) return 'AR';
    if (zipNum >= 73 && zipNum <= 74) return 'OK';
    if (zipNum >= 75 && zipNum <= 79) return 'TX';
    if (zipNum >= 80 && zipNum <= 81) return 'CO';
    if (zipNum >= 82 && zipNum <= 83) return 'WY';
    if (zipNum >= 84 && zipNum <= 84) return 'UT';
    if (zipNum >= 85 && zipNum <= 86) return 'AZ';
    if (zipNum >= 87 && zipNum <= 88) return 'NM';
    if (zipNum >= 89 && zipNum <= 89) return 'NV';
    if (zipNum >= 90 && zipNum <= 96) return 'CA';
    if (zipNum >= 97 && zipNum <= 97) return 'OR';
    if (zipNum >= 98 && zipNum <= 99) return 'WA';
    if (zipNum >= 99 && zipNum <= 99) return 'AK';
    
    return null;
  }

  const maxCount = Math.max(...Object.values(zipCodeData.zipCounts), 1);

  return (
    <div className={`relative w-full bg-white rounded-lg border border-gray-200 ${compactMode ? 'h-64' : 'h-96'}`}>
      <div ref={mapRef} className="w-full h-full rounded-lg"></div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-2 left-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
          Loading ZIP boundaries...
        </div>
      )}
      
      {/* Color Legend */}
      <div className="absolute bottom-2 left-2 bg-white p-2 rounded shadow-md text-xs border">
        <div className="font-semibold mb-1">Patient Count</div>
        <div className="flex items-center gap-1 mb-1">
          <div className="w-3 h-3" style={{ backgroundColor: '#e5e7eb' }}></div>
          <span>0</span>
        </div>
        <div className="flex items-center gap-1 mb-1">
          <div className="w-3 h-3" style={{ backgroundColor: getZipColor(Math.ceil(maxCount * 0.5), maxCount) }}></div>
          <span>{Math.ceil(maxCount * 0.5)}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3" style={{ backgroundColor: getZipColor(maxCount, maxCount) }}></div>
          <span>{maxCount}</span>
        </div>
      </div>
      
      {/* Map title */}
      <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded shadow text-xs font-medium">
        {title}
      </div>
    </div>
  );
};

export default LeafletZipMap;