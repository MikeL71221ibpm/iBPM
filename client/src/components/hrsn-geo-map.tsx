// HRSN Geo Map Component - July 17, 2025
// Geographic visualization for HRSN indicators by zip code

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Maximize2, Map } from "lucide-react";
import { ResponsiveChoropleth } from "@nivo/geo";
import ChartExportWidget from "./chart-export-widget";

// Simple USA features for choropleth visualization
// This is a minimal GeoJSON structure for US states
const usaGeoFeatures = {
  "type": "FeatureCollection",
  "features": [
    // Simplified US states - for demonstration
    {
      "type": "Feature",
      "properties": { "name": "United States" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]
        ]]
      }
    }
  ]
};

interface HrsnGeoMapProps {
  data?: any[];
  title: string;
  fieldName: string;
  compactMode?: boolean;
  dualSourceHrsnData?: any;
  filteredData?: any[];
}

export default function HrsnGeoMap({ 
  data, 
  title, 
  fieldName, 
  compactMode = false,
  dualSourceHrsnData,
  filteredData
}: HrsnGeoMapProps) {
  const [expandedGeoMap, setExpandedGeoMap] = useState(false);
  
  console.log(`🗺️ GEO MAP COMPONENT LOADED: ${title}`);
  console.log(`🗺️ GEO MAP DEBUG: Processing ${title} with field ${fieldName}`, { 
    dataLength: data?.length, 
    fieldName, 
    hasData: !!data,
    isArray: Array.isArray(data),
    sampleData: data?.slice(0, 2)
  });
  
  // Process data for geo visualization
  const geoData = useMemo(() => {
    console.log(`🗺️ GEO DATA PROCESSING START for ${title}:`, { 
      hasData: !!data, 
      dataLength: data?.length, 
      fieldName,
      sampleItem: data?.[0]
    });

    if (!data || !Array.isArray(data)) {
      console.log(`⚠️ No data for geo map: ${title}`);
      return [];
    }

    // Group by zip code and count patients with "Yes" values for this field
    const zipCodeCounts: Record<string, number> = {};
    let processedCount = 0;
    let yesCount = 0;
    
    data.forEach((item, index) => {
      const zipCode = item.zip_code || item.zipCode || item.zip;
      const fieldValue = item[fieldName] || item.additional_fields?.[fieldName];
      
      processedCount++;
      if (index < 3) {
        console.log(`🗺️ Sample item ${index}:`, { zipCode, fieldValue, fieldName, item: item });
      }
      
      if (zipCode && (fieldValue === "Yes" || fieldValue === "1" || fieldValue === 1 || fieldValue === true)) {
        zipCodeCounts[zipCode] = (zipCodeCounts[zipCode] || 0) + 1;
        yesCount++;
      }
    });

    // Convert to array format for visualization
    const geoDataArray = Object.entries(zipCodeCounts).map(([zipCode, count]) => ({
      id: zipCode,
      value: count,
      label: `${zipCode}: ${count} patients`
    }));

    console.log(`🗺️ GEO DATA RESULT for ${title}:`, {
      processedCount,
      yesCount,
      uniqueZipCodes: Object.keys(zipCodeCounts).length,
      geoDataLength: geoDataArray.length,
      sampleGeoData: geoDataArray.slice(0, 5)
    });
    
    return geoDataArray;
  }, [data, fieldName, title]);

  // If no data or no geographic data, show message
  if (!geoData.length) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Map className="w-4 h-4" />
            {title} - Geographic Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <Map className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No geographic data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartHeight = compactMode ? 150 : 300;

  const geoChart = (
    <div className="w-full" style={{ height: chartHeight }}>
      <ResponsiveChoropleth
        data={geoData}
        features={usaGeoFeatures.features}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        colors="blues"
        domain={[0, Math.max(...geoData.map(d => d.value))]}
        unknownColor="#f0f0f0"
        label="properties.name"
        valueFormat=".0f"
        projectionTranslation={[0.5, 0.5]}
        projectionRotation={[0, 0, 0]}
        projectionScale={compactMode ? 100 : 150}
        borderWidth={0.5}
        borderColor="#333"
        enableGraticule={false}
        legends={compactMode ? [] : [
          {
            anchor: 'bottom-left',
            direction: 'column',
            justify: true,
            translateX: 20,
            translateY: -20,
            itemsSpacing: 0,
            itemWidth: 94,
            itemHeight: 18,
            itemDirection: 'left-to-right',
            itemTextColor: '#444',
            itemOpacity: 0.85,
            symbolSize: 18,
            effects: [
              {
                on: 'hover',
                style: {
                  itemTextColor: '#000',
                  itemOpacity: 1
                }
              }
            ]
          }
        ]}
        tooltip={({ feature, value }) => (
          <div className="bg-white p-2 rounded shadow border">
            <strong>{feature.properties.name}</strong>
            <br />
            {value !== undefined ? `${value} patients` : 'No data'}
          </div>
        )}
      />
    </div>
  );

  return (
    <>
      <Card className="h-full relative">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Map className="w-4 h-4" />
            {title} - Geographic Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          {geoChart}
          
          {/* Expand Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log(`🗺️ Opening expanded geo map for ${title}`);
              setExpandedGeoMap(true);
            }}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>

          {/* Export Widget */}
          <ChartExportWidget
            chartId={`geo-${fieldName}`}
            chartTitle={`${title} - Geographic Distribution`}
            data={geoData}
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              zIndex: 9999,
              backgroundColor: 'white',
              padding: '8px',
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
          />
        </CardContent>
      </Card>

      {/* Expanded Dialog */}
      <Dialog open={expandedGeoMap} onOpenChange={setExpandedGeoMap}>
        <DialogContent className="max-w-6xl h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{title} - Geographic Distribution</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <div className="w-full h-full relative">
              <ResponsiveChoropleth
                data={geoData}
                features={usaGeoFeatures.features}
                margin={{ top: 20, right: 20, bottom: 80, left: 20 }}
                colors="blues"
                domain={[0, Math.max(...geoData.map(d => d.value))]}
                unknownColor="#f0f0f0"
                label="properties.name"
                valueFormat=".0f"
                projectionTranslation={[0.5, 0.5]}
                projectionRotation={[0, 0, 0]}
                projectionScale={200}
                borderWidth={0.5}
                borderColor="#333"
                enableGraticule={false}
                legends={[
                  {
                    anchor: 'bottom-left',
                    direction: 'column',
                    justify: true,
                    translateX: 20,
                    translateY: -20,
                    itemsSpacing: 0,
                    itemWidth: 94,
                    itemHeight: 18,
                    itemDirection: 'left-to-right',
                    itemTextColor: '#444',
                    itemOpacity: 0.85,
                    symbolSize: 18,
                    effects: [
                      {
                        on: 'hover',
                        style: {
                          itemTextColor: '#000',
                          itemOpacity: 1
                        }
                      }
                    ]
                  }
                ]}
                tooltip={({ feature, value }) => (
                  <div className="bg-white p-2 rounded shadow border">
                    <strong>{feature.properties.name}</strong>
                    <br />
                    {value !== undefined ? `${value} patients` : 'No data'}
                  </div>
                )}
              />
              
              {/* Export Widget for Expanded View */}
              <ChartExportWidget
                chartId={`geo-${fieldName}-expanded`}
                chartTitle={`${title} - Geographic Distribution (Expanded)`}
                data={geoData}
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '20px',
                  zIndex: 9999,
                  backgroundColor: 'white',
                  padding: '8px',
                  borderRadius: '6px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}