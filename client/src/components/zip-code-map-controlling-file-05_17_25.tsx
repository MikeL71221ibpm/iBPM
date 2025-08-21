// Last updated: May 17, 2025 - 8:35 PM
// Controls component: ZIP Code Map - displays geographic distribution of patients by ZIP code

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveChoropleth } from "@nivo/geo";
import { useChartTheme } from "@/context/ChartThemeContext";

// Field name mapping from standardized fields to current data fields
// This allows us to work with standardized field names while supporting legacy data
const fieldNameMapping: Record<string, string> = {
  // Standard field name -> Current data field name
  "financial_status": "financial_strain",
  "access_to_transportation": "transportation_needs",
  "has_transportation": "transportation_needs",
  "has_a_car": "transportation_needs",
  "ethnicity": "race", // Temporarily map ethnicity to race until we have proper ethnicity data
  "zip_code": "zip", // Support both zip_code and zip fields
  "veteran_status": "age_range", // Temporary mapping - will be replaced with real data in future
  "education_level": "age_range", // Temporary mapping - will be replaced with real data in future
  "utilities_insecurity": "utility_needs" // Map to correct field name in current data
};

// Helper function to get mapped field value from an item
function getMappedFieldValue(item: any, fieldName: string): any {
  // First try the standardized field name
  if (item[fieldName] !== undefined) {
    return item[fieldName];
  }
  
  // If not found, check if there's a mapping for this field name
  if (fieldNameMapping[fieldName] && item[fieldNameMapping[fieldName]] !== undefined) {
    return item[fieldNameMapping[fieldName]];
  }
  
  // If still not found, return undefined
  return undefined;
}

interface ZipCodeMapProps {
  data?: any[];
  title?: string;
  subtitle?: string;
  height?: number;
  colorScheme?: string;
  compactMode?: boolean;
}

export default function ZipCodeMap({
  data = [],
  title = "Patient Distribution by ZIP Code",
  subtitle = "Geographic distribution of patients",
  height = 400,
  colorScheme = "blues",
  compactMode = false
}: ZipCodeMapProps) {
  const [mapData, setMapData] = useState<any[]>([]);
  
  // Use global theme context
  const { currentTheme, colorSettings } = useChartTheme();
  
  // Map from theme context to color scheme
  const getColorSchemeFromTheme = (): string => {
    const mapping: Record<string, string> = {
      'vivid': 'spectral',
      'pastel': 'blues',
      'dark': 'oranges',
      'muted': 'greys',
      'viridis': 'greens'
    };
    return mapping[currentTheme] || colorScheme;
  };
  
  // Use global theme color scheme if available
  const effectiveColorScheme = getColorSchemeFromTheme();
  
  // Process data for map
  useEffect(() => {
    if (!data || data.length === 0) {
      setMapData([]);
      return;
    }
    
    try {
      // Track unique patient IDs by ZIP code
      const patientsByZip: Record<string, Set<string>> = {};
      
      // Process each patient record
      data.forEach((item: any) => {
        if (!item) return;
        
        // Get patient ID
        const patientId = item.id || item.patient_id;
        if (!patientId) return;
        
        // Get ZIP code using field mapping
        const zipCode = getMappedFieldValue(item, 'zip_code') || '';
        if (!zipCode || zipCode === '') return;
        
        // For demonstration, convert to a valid US Census FIPS code format
        // In a production system, this would use a real ZIP-to-FIPS lookup table
        const fipsCode = `US-${zipCode.substring(0, 2)}`;
        
        // Initialize the set if this is the first patient with this ZIP
        if (!patientsByZip[fipsCode]) {
          patientsByZip[fipsCode] = new Set<string>();
        }
        
        // Add this patient to the set for this ZIP
        patientsByZip[fipsCode].add(patientId.toString());
      });
      
      // Convert to choropleth map format
      const mapItems = Object.entries(patientsByZip).map(([id, patientSet]) => ({
        id,
        value: patientSet.size,
        tooltipContent: `${patientSet.size} patient${patientSet.size === 1 ? '' : 's'}`
      }));
      
      console.log(`Processed ${mapItems.length} ZIP codes for map visualization`);
      setMapData(mapItems);
    } catch (error) {
      console.error("Error processing ZIP code map data:", error);
      setMapData([]);
    }
  }, [data]);
  
  // US counties GeoJSON data would normally be imported or fetched
  // For demonstration, using a simplified placeholder object
  const geoFeatures = {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": { "name": "Example County" },
        "id": "US-01",
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[-100, 40], [-90, 40], [-90, 35], [-100, 35], [-100, 40]]]
        }
      },
      {
        "type": "Feature",
        "properties": { "name": "Sample County" },
        "id": "US-02",
        "geometry": {
          "type": "Polygon",
          "coordinates": [[[-85, 40], [-75, 40], [-75, 35], [-85, 35], [-85, 40]]]
        }
      }
    ]
  };
  
  if (!data || data.length === 0 || mapData.length === 0) {
    return (
      <Card className={`h-full flex flex-col ${compactMode ? 'p-0 border-0 shadow-none' : ''}`}>
        <CardHeader className={compactMode ? "p-1 pb-0" : "pb-2"}>
          <CardTitle className={compactMode ? "text-xs font-medium" : "text-lg font-medium"}>{title}</CardTitle>
          {subtitle && !compactMode && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent className={`flex-1 flex items-center justify-center ${compactMode ? 'p-1 pt-0' : ''}`}>
          <p className="text-muted-foreground text-center text-xs">No ZIP code data available</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`h-full flex flex-col ${compactMode ? 'p-0 border-0 shadow-none' : ''}`}>
      <CardHeader className={compactMode ? "p-1 pb-0" : "pb-2"}>
        <CardTitle className={compactMode ? "text-xs font-medium" : "text-lg font-medium"}>{title}</CardTitle>
        {subtitle && !compactMode && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent className={`flex-1 relative ${compactMode ? 'p-1 pt-0' : ''}`}>
        <div style={{ height: height }}>
          <ResponsiveChoropleth
            data={mapData}
            features={geoFeatures.features}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            domain={[0, Math.max(...mapData.map(d => d.value))]}
            unknownColor="#F5F5F5"
            colors={`${effectiveColorScheme}Specs`}
            borderWidth={0.5}
            borderColor="#152538"
            projectionScale={compactMode ? 40 : 110}
            projectionTranslation={[0.5, 0.5]}
            projectionRotation={[0, 0, 0]}
            enableGraticule={true}
            graticuleLineColor="#dddddd"
            tooltip={({ feature }) => {
              const tooltipData = mapData.find(d => d.id === feature.id);
              return (
                <div style={{
                  background: 'white',
                  padding: '9px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}>
                  <div><strong>{feature.properties.name}</strong></div>
                  <div>{tooltipData ? tooltipData.tooltipContent : 'No data'}</div>
                </div>
              );
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}