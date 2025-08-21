import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Maximize2 } from 'lucide-react';
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { ResponsiveBar } from '@nivo/bar';
import { colorSchemes } from '@/lib/colorSchemes';

// Interface for categorical value information
interface CategoricalValueInfo {
  values: Record<string, number>;       // Raw counts for each value
  percentages: Record<string, number>;  // Percentage for each value
  mostCommon: string;                   // Most common value
  mostCommonPercent: number;            // Percentage of most common value
  totalCount: number;                   // Total records in this cell
}

// Interface for raw data storage
interface RawValueData {
  count: number;
  percentage: number;
  total: number;
}

// Interface for chart data item
interface ChartDataItem {
  ageRange: string;
  [key: string]: number | string | Record<string, RawValueData> | undefined;
  raw?: Record<string, RawValueData>;
}

// Props definition
interface CategoricalHrsnChartProps {
  patientData?: any[];
  extractedSymptoms?: any[];
  hrsnIndicatorData?: any[];
  colorScheme?: string;
  isLoading?: boolean;
  categoryName: string; // The specific category to visualize (e.g., 'gender', 'race')
  filterBy?: {
    diagnosis?: string;
    diagnosticCategory?: string;
    symptom?: string;
    icd10Code?: string;
  };
}

export default function CategoricalHrsnChart({
  patientData,
  extractedSymptoms,
  hrsnIndicatorData,
  colorScheme = 'vivid',
  isLoading = false,
  categoryName,
  filterBy
}: CategoricalHrsnChartProps): JSX.Element {
  // State for chart data
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [categoryValues, setCategoryValues] = useState<string[]>([]);
  
  console.log(`🔍 CategoricalHrsnChart - ${categoryName} is rendering with:`, {
    patientDataLength: patientData?.length || 0,
    extractedSymptomsLength: extractedSymptoms?.length || 0,
    hrsnIndicatorDataLength: hrsnIndicatorData?.length || 0,
    colorScheme,
    filterBy
  });
  
  // Add specific HRSN indicator data logging
  if (hrsnIndicatorData && hrsnIndicatorData.length > 0) {
    console.log(`🎯 HRSN INDICATOR DATA FOUND for ${categoryName}:`, hrsnIndicatorData.slice(0, 3));
  } else {
    console.log(`❌ NO HRSN INDICATOR DATA for ${categoryName}`);
  }
  
  // Constants for age range buckets
  const AGE_RANGES = [
    '0-17', 
    '18-24', 
    '25-34', 
    '35-44', 
    '45-54', 
    '55-64', 
    '65+', 
    'No Data Available'
  ];
  
  // Helper function to format category names for display
  const formatCategoryName = (category: string): string => {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Helper function to format percentage values with count
  const formatPercent = (value: number) => {
    // Format percentage value (simpler version for type correctness)
    return `${Math.round(value)}%`;
  };
  
  // Custom tooltip formatter that displays count with percentage
  const getCustomTooltip = (value: number, category: string, data: any) => {
    const raw = data?.raw?.[category];
    if (raw) {
      return `${Math.round(value)}% (${raw.count} of ${raw.total})`;
    }
    return `${Math.round(value)}%`;
  };
  
  // Data processing function
  useEffect(() => {
    if (!patientData || patientData.length === 0 || !categoryName) {
      return;
    }
    
    console.log(`Processing ${patientData.length} patient records for ${categoryName} chart`);
    
    // Check if this category has any meaningful data (not null, undefined, or empty strings)
    const validValues = patientData.map(patient => {
      const value = patient[categoryName];
      // More comprehensive validation - check for all possible empty states
      const isEmpty = value === null || 
                     value === undefined || 
                     value === '' || 
                     value === 'null' || 
                     value === 'undefined' || 
                     value === 'Unknown' ||
                     (typeof value === 'string' && value.trim() === '');
      
      return { 
        patient_id: patient.id, 
        value: value, 
        type: typeof value,
        isEmpty: isEmpty,
        isValid: !isEmpty
      };
    });
    
    const hasValidData = validValues.some(item => item.isValid);
    
    console.log(`🔍 Data validation for ${categoryName}:`, {
      totalPatients: patientData.length,
      hasValidData: hasValidData,
      validCount: validValues.filter(v => v.isValid).length,
      emptyCount: validValues.filter(v => v.isEmpty).length,
      sampleValues: validValues.slice(0, 10)
    });
    
    if (!hasValidData) {
      console.log(`❌ No valid data found for ${categoryName} - all ${patientData.length} patients have empty/null values`);
      // Set empty data to trigger "No Data Available" display
      setChartData([]);
      setCategoryValues([]);
      return;
    }
    
    // Debug the first few patient records to see if they have the categorical field
    console.log(`🔍 SAMPLE PATIENT DATA FOR ${categoryName.toUpperCase()}:`, 
      patientData.slice(0, 3).map(patient => {
        // Create a filtered view focusing on the category and basic info
        return {
          id: patient.id,
          age_range: patient.age_range,
          [categoryName]: patient[categoryName],
          // Also show all keys that might contain this data
          keys: Object.keys(patient)
        };
      })
    );
    
    // Group patients by age range for easier processing
    const patientsByAgeRange: Record<string, any[]> = {};
    AGE_RANGES.forEach(ageRange => {
      patientsByAgeRange[ageRange] = [];
    });
    
    patientData.forEach(patient => {
      // Get the patient's age range or use "No Data Available"
      const ageRange = patient.age_range || 'No Data Available';
      if (patientsByAgeRange[ageRange]) {
        patientsByAgeRange[ageRange].push(patient);
      } else {
        patientsByAgeRange['No Data Available'].push(patient);
      }
    });
    
    // Calculate the data for each age range
    const processedData: ChartDataItem[] = [];
    const allValues = new Set<string>();
    
    AGE_RANGES.forEach(ageRange => {
      const patientsInRange = patientsByAgeRange[ageRange];
      const totalInRange = patientsInRange.length;
      
      if (totalInRange === 0) {
        // Skip empty age ranges
        return;
      }
      
      // Count occurrences of each value
      const valueGroups: Record<string, number> = {};
      
      patientsInRange.forEach(patient => {
        const value = String(patient[categoryName] || 'Unknown');
        valueGroups[value] = (valueGroups[value] || 0) + 1;
        allValues.add(value);
      });
      
      // Generate a chart data item for this age range
      const item: ChartDataItem = { 
        ageRange,
        raw: {} // Initialize raw data storage
      };
      
      Object.entries(valueGroups).forEach(([value, count]) => {
        // Calculate percentage
        const percentage = (count / totalInRange) * 100;
        // Store percentage for the chart
        item[value] = percentage;
        // Store raw count in a special property that we can access for tooltips
        item.raw![value] = {
          count: count,
          percentage: percentage,
          total: totalInRange
        };
      });
      
      processedData.push(item);
    });
    
    // Prepare category values (used for legend and chart keys)
    const categoryValuesList = Array.from(allValues);
    
    console.log(`Processed ${categoryName} chart data:`, processedData);
    console.log(`Category values:`, categoryValuesList);
    
    // Update state
    setChartData(processedData);
    setCategoryValues(categoryValuesList);
  }, [patientData, categoryName, filterBy]);
  
  // Generate colors from the selected scheme
  const getColorScheme = () => {
    // Special case for gender - use a predefined color mapping
    if (categoryName === 'gender') {
      return {
        'Male': '#4292c6',       // Medium blue
        'Female': '#f768a1',     // Pink
        'Non-binary': '#7fbc41', // Green
        'Other': '#9467bd',      // Purple
        'Prefer not to say': '#8c8c8c', // Gray
        'Unknown': '#c7c7c7'     // Light gray
      };
    }
    
    // Get the color scheme - handle both object and array formats
    let colorArray: string[] = [];

    // Get colors from the color scheme, safely handling different formats
    const scheme = colorSchemes[colorScheme as keyof typeof colorSchemes] || colorSchemes.vivid;
    
    if (Array.isArray(scheme)) {
      colorArray = scheme;
    } else if (scheme.colors && Array.isArray(scheme.colors)) {
      colorArray = scheme.colors;
    } else {
      // Fallback to a basic array of colors if scheme format is unexpected
      colorArray = colorSchemes.blues as string[];
    }
    
    // Assign a color to each category value
    const categoryColors: Record<string, string> = {};
    
    categoryValues.forEach((value, index) => {
      // Cycle through the color scheme if needed
      const colorIndex = index % colorArray.length;
      categoryColors[value] = colorArray[colorIndex];
    });
    
    return categoryColors;
  };
  
  // Render the bar chart - no Card wrapper since it's provided by parent component
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">{formatCategoryName(categoryName)} by Age Range</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsExpanded(true)} 
          title="Expand View"
          id={`${categoryName}-expand-btn`}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
      {filterBy?.diagnosis && (
        <p className="text-sm text-muted-foreground mb-2">
          Filtered by diagnosis: {filterBy.diagnosis}
        </p>
      )}
      <div>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Bar chart visualization */}
            <div className="h-[330px]">
              {chartData.length > 0 ? (
                <ResponsiveBar
                  data={chartData as any[]}
                  keys={categoryValues}
                  indexBy="ageRange"
                  margin={{ top: 20, right: 130, bottom: 50, left: 60 }}
                  padding={0.3}
                  groupMode="stacked"
                  layout="vertical"
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={({ id }) => getColorScheme()[id as string] || '#cccccc'}
                  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Age Range',
                    legendPosition: 'middle',
                    legendOffset: 32
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Percentage',
                    legendPosition: 'middle',
                    legendOffset: -40,
                    format: value => `${Math.round(value)}%`
                  }}
                  enableGridY={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  tooltip={({ id, value, color, indexValue, data }) => (
                    <div
                      style={{
                        background: 'white',
                        padding: '9px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ 
                          display: 'block', 
                          width: '12px', 
                          height: '12px', 
                          background: color,
                          marginRight: '8px',
                          borderRadius: '2px' 
                        }}></span>
                        <strong>{id}: {Math.round(value)}%</strong>
                      </div>
                      <div style={{ fontSize: '13px', marginTop: '3px' }}>
                        {`Age range: ${indexValue}`}
                      </div>
                      <div style={{ fontSize: '13px', marginTop: '3px' }}>
                        {`Count: ${data.raw?.[id as string]?.count || '?'} of ${data.raw?.[id as string]?.total || '?'}`}
                      </div>
                    </div>
                  )}
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
                  ariaLabel={`${formatCategoryName(categoryName)} by Age Range`}
                  barAriaLabel={({id, value, indexValue}) => `${indexValue}, ${id}: ${value}%`}
                  valueFormat={formatPercent}
                  label={({ id, value, data }) => {
                    // Ensure we have a valid count with fallback to 0
                    const count = data.raw && 
                                 id && 
                                 typeof id === 'string' && 
                                 data.raw[id] ? 
                                 data.raw[id].count : 0;
                    return `${Math.round(value)}% (${count})`;
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No data available for {formatCategoryName(categoryName)}</p>
                </div>
              )}
            </div>
            
            {/* Expanded view dialog */}
            <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
              <DialogContent className="max-w-[60vw] w-[60vw] max-h-[120vh] h-[120vh] flex flex-col overflow-hidden">
                <DialogHeader>
                  <DialogTitle>HRSN {formatCategoryName(categoryName)} by Age Range - Expanded View</DialogTitle>
                  {filterBy?.diagnosis && (
                    <DialogDescription>
                      Filtered by diagnosis: {filterBy.diagnosis}
                    </DialogDescription>
                  )}
                </DialogHeader>
                
                <div className="flex-1 overflow-auto p-4">
                  {chartData.length > 0 ? (
                    <div className="h-full">
                      <ResponsiveBar
                        data={chartData}
                        keys={categoryValues}
                        indexBy="ageRange"
                        margin={{ top: 50, right: 170, bottom: 70, left: 80 }}
                        padding={0.3}
                        groupMode="stacked"
                        layout="vertical"
                        valueScale={{ type: 'linear' }}
                        indexScale={{ type: 'band', round: true }}
                        colors={({ id }) => getColorScheme()[id as string] || '#cccccc'}
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
                          legend: 'Percentage',
                          legendPosition: 'middle',
                          legendOffset: -50,
                          format: value => `${Math.round(value)}%`
                        }}
                        enableGridY={true}
                        labelSkipWidth={12}
                        labelSkipHeight={12}
                        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                        valueFormat={formatPercent}
                        label={({ id, value }) => `${Math.round(value)}%`}
                        tooltip={({ id, value, color, indexValue, data }) => (
                          <div
                            style={{
                              background: 'white',
                              padding: '9px 12px',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ 
                                display: 'block', 
                                width: '12px', 
                                height: '12px', 
                                background: color,
                                marginRight: '8px',
                                borderRadius: '2px' 
                              }}></span>
                              <strong>{id}: {Math.round(value)}%</strong>
                            </div>
                            <div style={{ fontSize: '13px', marginTop: '3px' }}>
                              {`Age range: ${indexValue}`}
                            </div>
                            <div style={{ fontSize: '13px', marginTop: '3px' }}>
                              {`Count: ${data.raw?.[id as string]?.count || '?'} of ${data.raw?.[id as string]?.total || '?'}`}
                            </div>
                          </div>
                        )}
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
                        ariaLabel={`${formatCategoryName(categoryName)} by Age Range - Expanded View`}
                        barAriaLabel={({id, value, indexValue}) => `${indexValue}, ${id}: ${value}%`}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">No data available for {formatCategoryName(categoryName)}</p>
                    </div>
                  )}
                </div>
                
                {/* Additional controls for expanded view if needed */}
                <div className="p-4 border-t border-border flex justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">HRSN {formatCategoryName(categoryName)} Chart</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsExpanded(false)}
                  >
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}