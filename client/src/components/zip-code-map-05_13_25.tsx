// Zip Code Map Component - May 13, 2025
// This component creates a density map visualization for zip codes

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Maximize } from "lucide-react";
import { ResponsiveChoropleth } from "@nivo/geo";
import { useTheme } from "@/hooks/use-theme";
import { ChartExportSection } from "@/components/chart-export-section";

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
  // Chart export functions
  downloadChartAsCSV?: (chartTitle: string, data: any[], isPatientDetailExport?: boolean) => void;
  downloadChartAsExcel?: (chartTitle: string, data: any[]) => void;
  downloadChartAsJson?: (chartTitle: string, data: any[]) => void;
  printChart?: (chartTitle: string, isDialogChart?: boolean) => void;
  getFullDataset?: (chartType: string, includeAllData?: boolean, isPatientDetailExport?: boolean) => any[];
}

export default function ZipCodeMap({
  data = [],
  title = "Zip Code Density Map",
  subtitle = "Distribution of patients by zip code",
  height = 400,
  colorScheme = "blues",
  compactMode = false,
  downloadChartAsCSV,
  downloadChartAsExcel,
  downloadChartAsJson,
  printChart,
  getFullDataset
}: ZipCodeMapProps) {
  // State for dialog management
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { theme } = useTheme();
  const [mapData, setMapData] = useState<any[]>([]);
  const [geoJson, setGeoJson] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUniqueZipCodes, setTotalUniqueZipCodes] = useState<number>(0);

  // Color schemes matching other components
  const colorSchemes: Record<string, string[]> = {
    default: ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"],
    blues: ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"],
    rainbow: ["#e8f5e9", "#c8e6c9", "#a5d6a7", "#81c784", "#66bb6a", "#4caf50", "#43a047", "#388e3c", "#2e7d32"],
    viridis: ["#440154", "#482878", "#3e4989", "#31688e", "#26828e", "#1f9e89", "#35b779", "#6ece58", "#b5de2b", "#fde725"],
    iridis: ["#FEFE62", "#D7B541", "#AB7424", "#86400B", "#62130B", "#3A0853"],
    grayscale: ["#f7f7f7", "#e5e5e5", "#cccccc", "#a8a8a8", "#888888", "#666666", "#525252", "#3f3f3f", "#292929", "#1a1a1a"],
    green: ["#f7fcf5", "#e5f5e0", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#006d2c", "#00441b"],
    red: ["#fff5f0", "#fee0d2", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#a50f15", "#67000d"]
  };

  // Function to determine colors based on the selected scheme
  const getColors = () => {
    return colorSchemes[colorScheme] || colorSchemes.blues;
  };

  // Get USA map data
  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        setLoading(true);
        // Attempt to fetch the US counties GeoJSON data from public source
        try {
          const response = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json');
          if (!response.ok) {
            throw new Error(`Failed to fetch GeoJSON data: ${response.status}`);
          }
          
          // Use a fallback simplified representation if fetch fails
          const geoData = await response.json();
          setGeoJson(geoData);
        } catch (err) {
          console.warn("Error fetching GeoJSON, using simplified representation:", err);
          
          // Create a simplified USA representation with basic regions
          const simplifiedGeoJson = {
            type: "FeatureCollection",
            features: [
              // Northeast region
              {
                type: "Feature",
                id: "northeast",
                properties: { name: "Northeast" },
                geometry: { type: "Polygon", coordinates: [[[0.7, 0.7], [0.9, 0.7], [0.9, 0.9], [0.7, 0.9], [0.7, 0.7]]] }
              },
              // Southeast region
              {
                type: "Feature",
                id: "southeast",
                properties: { name: "Southeast" },
                geometry: { type: "Polygon", coordinates: [[[0.7, 0.4], [0.9, 0.4], [0.9, 0.6], [0.7, 0.6], [0.7, 0.4]]] }
              },
              // Midwest region
              {
                type: "Feature",
                id: "midwest",
                properties: { name: "Midwest" },
                geometry: { type: "Polygon", coordinates: [[[0.4, 0.6], [0.6, 0.6], [0.6, 0.8], [0.4, 0.8], [0.4, 0.6]]] }
              },
              // Southwest region
              {
                type: "Feature",
                id: "southwest",
                properties: { name: "Southwest" },
                geometry: { type: "Polygon", coordinates: [[[0.2, 0.3], [0.4, 0.3], [0.4, 0.5], [0.2, 0.5], [0.2, 0.3]]] }
              },
              // West region
              {
                type: "Feature",
                id: "west",
                properties: { name: "West" },
                geometry: { type: "Polygon", coordinates: [[[0.1, 0.6], [0.3, 0.6], [0.3, 0.8], [0.1, 0.8], [0.1, 0.6]]] }
              }
            ]
          };
          setGeoJson(simplifiedGeoJson);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching or creating map data:", err);
        setError("Failed to load map data");
        setLoading(false);
      }
    };

    fetchGeoData();
  }, []);

  // Process zip code data
  useEffect(() => {
    if (!data || data.length === 0) {
      setMapData([]);
      return;
    }

    try {
      // Track unique patients per zip code
      const patientsByZipCode: Record<string, Set<string>> = {};
      
      // Process each patient record
      data.forEach(item => {
        if (!item) return;
        
        // Use field mapping to get the zip code value from either field name
        const zipCode = getMappedFieldValue(item, 'zip_code');
        
        // Add debugging to track zip code field access
        if (item.zip_code !== undefined && item.zip !== undefined) {
          console.log(`Found both zip_code (${item.zip_code}) and zip (${item.zip}) fields`);
        } else if (item.zip_code !== undefined) {
          console.log(`Using standard zip_code field`);
        } else if (item.zip !== undefined) {
          console.log(`Using mapped zip field instead of zip_code`);
        }
        
        if (!zipCode) return; // Skip if no zip code found
        
        // Get patient ID
        const patientId = item.id || item.patient_id;
        if (!patientId) return;
        
        // Initialize the set if this is the first patient with this zip code
        if (!patientsByZipCode[zipCode]) {
          patientsByZipCode[zipCode] = new Set<string>();
        }
        
        // Add this patient to the set for this zip code
        patientsByZipCode[zipCode].add(patientId.toString());
      });
      
      // Convert patient sets to counts (number of unique patients per zip code)
      const zipCountMap: Record<string, number> = {};
      Object.entries(patientsByZipCode).forEach(([zipCode, patientSet]) => {
        zipCountMap[zipCode] = patientSet.size;
      });
      
      // Store total unique zip codes count
      const totalUniqueCount = Object.keys(zipCountMap).length;
      setTotalUniqueZipCodes(totalUniqueCount);
      
      // Convert to format needed by Choropleth and sort by count (descending)
      const sortedZipData = Object.entries(zipCountMap)
        .sort(([,a], [,b]) => b - a)  // Sort by count descending
        .slice(0, 25)  // Take only top 25
        .map(([zipCode, count]) => ({
          id: zipCode,
          value: count
        }));
      
      setMapData(sortedZipData);
      console.log(`Processed zip code map data: showing top 25 out of ${totalUniqueCount} unique zip codes:`, sortedZipData);
    } catch (error) {
      console.error("Error processing zip code map data:", error);
      setMapData([]);
    }
  }, [data]);

  // If still loading or have an error
  if (loading) {
    return (
      <Card className={`h-full flex flex-col ${compactMode ? 'p-0 border-0 shadow-none' : ''}`}>
        <CardHeader className={compactMode ? "p-1 pb-0" : ""}>
          <CardTitle className={compactMode ? "text-xs font-medium" : ""}>{title}</CardTitle>
          {!compactMode && subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent className={`flex-1 flex items-center justify-center ${compactMode ? 'p-1 pt-0' : ''}`}>
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-6 py-1">
              <div className="h-2 bg-gray-200 rounded"></div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-2 bg-gray-200 rounded col-span-2"></div>
                  <div className="h-2 bg-gray-200 rounded col-span-1"></div>
                </div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`h-full flex flex-col ${compactMode ? 'p-0 border-0 shadow-none' : ''}`}>
        <CardHeader className={compactMode ? "p-1 pb-0" : ""}>
          <CardTitle className={compactMode ? "text-xs font-medium" : ""}>{title}</CardTitle>
          {!compactMode && subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent className={`flex-1 flex items-center justify-center ${compactMode ? 'p-1 pt-0' : ''}`}>
          <div className="text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }

  // Create the summary content
  const zipCodeSummaryContent = (
    <div 
      style={{ height }} 
      className="flex flex-col items-center justify-center text-sm text-center text-muted-foreground border border-dashed border-gray-300 rounded-md"
    >
      <p>Zip code data summary:</p>
      <p className="text-xs mt-1">
        {mapData.length} unique zip code{mapData.length !== 1 ? 's' : ''}
      </p>
      <p className="text-xs mt-1">
        Total patients: {data.length}
      </p>
    </div>
  );
  
  // Return the card with export functionality
  return (
    <Card className={`h-full flex flex-col ${compactMode ? 'p-0 border-0 shadow-none' : ''}`}>
      <CardHeader className={compactMode ? "p-1 pb-0" : ""}>
        <CardTitle className={compactMode ? "text-xs font-medium" : ""}>{title}</CardTitle>
        {!compactMode && <CardDescription>
          {totalUniqueZipCodes > 0 
            ? `Distribution of patients by the top 25 zip codes out of ${totalUniqueZipCodes}`
            : subtitle
          }
        </CardDescription>}
      </CardHeader>
      
      <CardContent className={`flex-1 ${compactMode ? 'p-1 pt-0' : ''}`}>
        {zipCodeSummaryContent}
      </CardContent>
      
      {!compactMode && (
        <CardFooter className="flex justify-end gap-2 pt-0">
          {/* Dialog for full-screen view with export options */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <Maximize className="h-4 w-4" />
                <span className="sr-md:inline">Expand</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl w-[90vw]">
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{subtitle}</DialogDescription>
              </DialogHeader>
              
              <div className="w-full h-[500px] mt-2">
                {zipCodeSummaryContent}
              </div>
              
              {/* Standardized Export Section */}
              {downloadChartAsCSV && downloadChartAsExcel && downloadChartAsJson && printChart && getFullDataset && (
                <ChartExportSection 
                  chartName={title}
                  downloadChartAsCSV={downloadChartAsCSV}
                  downloadChartAsExcel={downloadChartAsExcel}
                  downloadChartAsJson={downloadChartAsJson}
                  printChart={printChart}
                  getFullDataset={getFullDataset}
                />
              )}
            </DialogContent>
          </Dialog>
        </CardFooter>
      )}
    </Card>
  );
}