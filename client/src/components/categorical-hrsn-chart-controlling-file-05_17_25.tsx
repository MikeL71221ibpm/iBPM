// Last updated: May 17, 2025 - 8:30 PM
// Controls component: Categorical HRSN Chart - displays categorical HRSN data in bar charts

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ResponsiveBar } from "@nivo/bar";
import type { BarDatum } from "@nivo/bar";
import { ResponsiveHeatMap } from "@nivo/heatmap";
import { ResponsivePie } from "@nivo/pie";
import { useChartTheme } from "@/context/ChartThemeContext";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Maximize, Printer, FileDown, FileSpreadsheet, FileJson, Table } from "lucide-react";
import ChartExportWidget from "@/components/chart-export-widget";
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
  "zip_code": "age_range", // Temporary mapping - will be replaced with real data in future
  "veteran_status": "age_range", // Temporary mapping - will be replaced with real data in future
  "education_level": "age_range", // Temporary mapping - will be replaced with real data in future
  "utilities_insecurity": "utility_needs" // Map to correct field name in current data
};

// Format field names for display, converting snake_case to Title Case
const formatFieldName = (fieldName: string): string => {
  // Handle special cases
  const specialCases: Record<string, string> = {
    'icd10': 'ICD-10',
    'hrsn': 'HRSN',
    'sdoh': 'SDOH',
    'zip_code': 'ZIP Code',
    'utilities_insecurity': 'Utilities Insecurity',
    'medicaid': 'Medicaid',
    'medicare': 'Medicare',
    'snap': 'SNAP',
    'wic': 'WIC',
    'tanf': 'TANF',
    'ssi': 'SSI'
  };
  
  // Check if field name is a special case
  if (specialCases[fieldName.toLowerCase()]) {
    return specialCases[fieldName.toLowerCase()];
  }
  
  // Otherwise, convert from snake_case to Title Case
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

interface DataItem {
  id: string;
  label: string;
  value: number;
  color: string;
  originalValue?: string; // Original value before any display modifications
}

interface CategoricalValueInfo {
  values: Record<string, number>;       // Raw counts for each value
  percentages: Record<string, number>;  // Percentage for each value
  mostCommon: string;                   // Most common value
  mostCommonPercent: number;            // Percentage of most common value
  totalCount: number;                   // Total records in this cell
}

interface RawValueData {
  count: number;
  percentage: number;
  total: number;
}

/**
 * Interface for our internal chart data structure
 */
interface ChartDataItem {
  id: string;             // Unique identifier
  value: number;          // Value for the data point
  ageRange: string;       // Age range classification
  label?: string;         // Optional display label
  percentage?: number;    // Percentage value for charts
  raw?: Record<string, any>; // Raw data storage
  [key: string]: any;     // Allow any other properties
}

/**
 * Type alias specifically for Nivo bar chart data
 * This ensures type compatibility with Nivo's components
 */
type NivoBarItem = BarDatum;

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

interface CategoricalHrsnChartProps {
  patientData?: any[];
  extractedSymptoms?: any[];
  colorScheme?: string;
  isLoading?: boolean;
  categoryName: string; // The specific category to visualize (e.g., 'gender', 'race')
  filterBy?: {
    diagnosis?: string;
    diagnosticCategory?: string;
    symptom?: string;
    icd10Code?: string;
  };
  // Chart export functions
  downloadChartAsCSV?: (chartTitle: string, data: any[], isPatientDetailExport?: boolean) => void;
  downloadChartAsExcel?: (chartTitle: string, data: any[]) => void;
  downloadChartAsJson?: (chartTitle: string, data: any[]) => void;
  printChart?: (chartTitle: string, isDialogChart?: boolean) => void;
  getFullDataset?: (chartType: string, includeAllData?: boolean, isPatientDetailExport?: boolean) => any[];
}

export default function CategoricalHrsnChart({
  patientData = [],
  extractedSymptoms = [],
  colorScheme = "blues",
  isLoading = false,
  categoryName,
  filterBy,
  downloadChartAsCSV,
  downloadChartAsExcel,
  downloadChartAsJson,
  printChart,
  getFullDataset
}: CategoricalHrsnChartProps): JSX.Element {
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [ageRanges, setAgeRanges] = useState<string[]>([]);
  const [maxValue, setMaxValue] = useState<number>(100);
  
  // Use global theme context
  const { currentTheme, colorSettings, displayMode } = useChartTheme();
  
  // Map from theme context to color scheme
  const getColorSchemeFromTheme = (): string => {
    const mapping: Record<string, string> = {
      'vivid': 'rainbow',
      'pastel': 'default',
      'dark': 'iridis',
      'muted': 'grayscale',
      'viridis': 'viridis'
    };
    return mapping[currentTheme] || colorScheme;
  };
  
  // Use global theme color scheme if available
  const effectiveColorScheme = getColorSchemeFromTheme();
  
  // Format field name for display
  const formatFieldName = (name: string): string => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Determine chart title based on category name
  const getChartTitle = (): string => {
    return `${formatFieldName(categoryName)} Distribution`;
  };
  
  // Process the patient data to create chart data
  useEffect(() => {
    if (!patientData || patientData.length === 0 || !categoryName) {
      return;
    }
    
    console.log(`Processing ${patientData.length} patient records for ${categoryName} chart`);
    
    try {
      // Get all unique age ranges
      const uniqueAgeRanges = Array.from(
        new Set(patientData.map(p => p.age_range || 'Unknown'))
      ).sort((a, b) => {
        // Custom sort for age ranges to maintain correct order
        const ageOrder: Record<string, number> = {
          '0-17': 1,
          '18-24': 2,
          '25-34': 3,
          '35-44': 4,
          '45-54': 5,
          '55-64': 6,
          '65+': 7,
          'Unknown': 8
        };
        return (ageOrder[a] || 999) - (ageOrder[b] || 999);
      });
      
      // Get all unique category values
      const uniqueValues = Array.from(
        new Set(
          patientData
            .map(p => getMappedFieldValue(p, categoryName))
            .filter(v => v !== undefined && v !== null && v !== '')
        )
      ).sort();
      
      // Create a record for each age range
      const data: ChartDataItem[] = uniqueAgeRanges.map(ageRange => {
        // Filter patients by age range
        const patientsInRange = patientData.filter(p => (p.age_range || 'Unknown') === ageRange);
        
        // Initialize record with age range and required id/value fields
        const item: ChartDataItem = { 
          id: ageRange, // Use ageRange as id (required by BarDatum)
          ageRange,
          value: 0,     // Default value (required by BarDatum)
          raw: {}
        };
        
        // Count occurrences of each unique value
        uniqueValues.forEach(value => {
          const patientsWithValue = patientsInRange.filter(
            p => getMappedFieldValue(p, categoryName) === value
          );
          
          const count = patientsWithValue.length;
          const total = patientsInRange.length;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          
          // Store raw count and percentage data
          if (!item.raw) item.raw = {};
          item.raw[value.toString()] = {
            count,
            percentage,
            total
          };
          
          // Store percentage as direct property for Nivo
          item[value.toString()] = percentage;
        });
        
        return item;
      });
      
      // Calculate maximum percentage value for scaling
      let maxPercentValue = 0;
      data.forEach(item => {
        uniqueValues.forEach(value => {
          const percentage = item.raw?.[value.toString()]?.percentage || 0;
          if (percentage > maxPercentValue) {
            maxPercentValue = percentage;
          }
        });
      });
      
      console.log(`Generated chart data for ${categoryName}:`, {
        ageRanges: uniqueAgeRanges,
        categories: uniqueValues,
        dataPoints: data.length,
        maxValue: maxPercentValue
      });
      
      setChartData(data);
      setCategories(uniqueValues.map(v => v.toString()));
      setAgeRanges(uniqueAgeRanges);
      setMaxValue(Math.max(maxPercentValue, 1));
    } catch (error) {
      console.error("Error processing categorical chart data:", error);
      setChartData([]);
      setCategories([]);
      setAgeRanges([]);
    }
  }, [patientData, categoryName, filterBy]);
  
  // Define color schemes
  const colorSchemes: Record<string, string[]> = {
    blues: ["#0369a1", "#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc"],
    rainbow: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6", "#ec4899"],
    viridis: ["#440154", "#404387", "#29788E", "#22A784", "#79D151", "#FDE724"],
    iridis: ["#FEFE62", "#D7B541", "#AB7424", "#74260E", "#3A0853"],
    grayscale: ["#1F2937", "#4B5563", "#6B7280", "#9CA3AF", "#D1D5DB", "#F3F4F6"],
    default: ["#0369a1", "#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc"]
  };
  
  // Get colors for current scheme
  const getColors = () => {
    return colorSchemes[effectiveColorScheme] || colorSchemes.default;
  };
  
  // Get color scale for specific scheme
  const getColorScaleForScheme = (schemeName: string) => {
    return colorSchemes[schemeName] || colorSchemes.default;
  };
  
  // Empty state handling
  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle>{getChartTitle()}</CardTitle>
          <CardDescription>Loading data...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[350px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }
  
  if (!patientData || patientData.length === 0 || chartData.length === 0 || categories.length === 0) {
    return (
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle>{getChartTitle()}</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[350px]">
          <p className="text-muted-foreground">No data available for this category</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle>{getChartTitle()}</CardTitle>
        <CardDescription>
          Showing distribution by age range
          {filterBy?.diagnosis && ` for patients with ${filterBy.diagnosis}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveBar
            data={chartData as unknown as NivoBarItem[]}
            keys={categories}
            indexBy="ageRange"
            layout="vertical"
            margin={{ top: 10, right: 130, bottom: 50, left: 60 }}
            padding={0.3}
            valueScale={{ type: 'linear' }}
            indexScale={{ type: 'band', round: true }}
            colors={getColors()}
            borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Age Range',
              legendPosition: 'middle',
              legendOffset: 40
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Count',
              legendPosition: 'middle',
              legendOffset: -50
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            legends={[
              {
                dataFrom: 'keys',
                anchor: 'bottom-right',
                direction: 'column',
                justify: false,
                translateX: 120,
                translateY: 0,
                itemsSpacing: 2,
                itemWidth: 100,
                itemHeight: 20,
                itemDirection: 'left-to-right',
                itemOpacity: 0.85,
                symbolSize: 20,
                effects: [
                  {
                    on: 'hover',
                    style: {
                      itemOpacity: 1
                    }
                  }
                ]
              }
            ]}
            role="application"
            ariaLabel={`${categoryName} distribution by age range`}
            barAriaLabel={function(e){return e.id + ": " + e.formattedValue + "% in age range: " + e.indexValue}}
            tooltip={({ id, value, color, indexValue }) => (
              <div
                style={{
                  padding: 12,
                  background: 'white',
                  borderRadius: 3,
                  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',
                  border: `1px solid ${color}`
                }}
              >
                <strong style={{ color }}>{id}</strong>
                <div>
                  <b>{value}%</b> of {categoryName} in age range: {indexValue}
                </div>
                {chartData.find(d => d.ageRange === indexValue)?.raw?.[id as string] && (
                  <div className="text-xs text-gray-500 mt-1">
                    {chartData.find(d => d.ageRange === indexValue)?.raw?.[id as string]?.count} out of {
                      chartData.find(d => d.ageRange === indexValue)?.raw?.[id as string]?.total
                    } patients
                  </div>
                )}
              </div>
            )}
          />
        </div>
      </CardContent>
      <CardFooter className="p-2 flex justify-between">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Maximize className="w-4 h-4 mr-2" />
              Enlarge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl w-[90vw] max-h-[90vh] p-6 flex flex-col">
            <DialogHeader className="mb-2">
              <DialogTitle className="text-2xl font-bold">{formatFieldName(categoryName)} Distribution</DialogTitle>
              <DialogDescription className="text-base">
                Showing distribution of {formatFieldName(categoryName)} across {ageRanges.length} age ranges.
              </DialogDescription>
            </DialogHeader>
            
            {/* Chart display - Full page professional view */}
            <div className="h-[50vh]" id={`${categoryName}-chart-dialog`}>
              <ResponsiveBar
                data={chartData.map(item => ({
                  ...item,
                  value: item.value || 0 
                }))}
                keys={categories}
                indexBy="ageRange"
                margin={{ top: 50, right: 130, bottom: 50, left: 80 }}
                padding={0.3}
                groupMode="grouped"
                valueScale={{ type: 'linear' }}
                colors={({ id, data }) => data[`${id}_color`] || '#3B82F6'}
                borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Age Range',
                  legendPosition: 'middle',
                  legendOffset: 40
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Percentage (%)',
                  legendPosition: 'middle',
                  legendOffset: -60
                }}
                labelSkipWidth={12}
                labelSkipHeight={12}
                legends={[
                  {
                    dataFrom: 'keys',
                    anchor: 'bottom-right',
                    direction: 'column',
                    justify: false,
                    translateX: 120,
                    translateY: 0,
                    itemsSpacing: 2,
                    itemWidth: 100,
                    itemHeight: 20,
                    itemDirection: 'left-to-right',
                    itemOpacity: 0.85,
                    symbolSize: 20,
                    effects: [
                      {
                        on: 'hover',
                        style: {
                          itemOpacity: 1
                        }
                      }
                    ]
                  }
                ]}
                role="application"
                ariaLabel={`${categoryName} distribution by age range`}
                barAriaLabel={function(e){return e.id + ": " + e.formattedValue + "% in age range: " + e.indexValue}}
              />
            </div>
            
            {/* Standardized Export Section */}
            {downloadChartAsCSV && downloadChartAsExcel && downloadChartAsJson && printChart && getFullDataset && (
              <ChartExportSection 
                chartName={formatFieldName(categoryName)}
                downloadChartAsCSV={downloadChartAsCSV}
                downloadChartAsExcel={downloadChartAsExcel}
                downloadChartAsJson={downloadChartAsJson}
                printChart={printChart}
                getFullDataset={getFullDataset}
              />
            )}
          </DialogContent>
        </Dialog>
        
        {/* No standalone export buttons as requested */}
      </CardFooter>
    </Card>
  );
}