import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2 } from 'lucide-react';
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { colorSchemes } from '@/lib/colorSchemes';

// Internal interfaces for detailed value information
interface BooleanValueInfo {
  positive: number;      // Count of the indicator value (Yes or No)
  negative: number;      // Count of the opposite value
  positivePercent: number;  // Percentage of the indicator
  negativePercent: number;  // Percentage of the opposite
  indicator: "yes" | "no";  // What we're counting as the indicator
  label: string;        // Display label
}

// Internal interfaces for component data structure
interface HrsnPivotData {
  rows: string[];
  columns: string[];
  data: Record<string, Record<string, number>>;
  maxValue: number;
  detailedData?: Record<string, Record<string, BooleanValueInfo>>;
}

// Props definition with optional filters
interface BooleanHrsnHeatmapProps {
  patientData?: any[];
  extractedSymptoms?: any[]; // Raw symptom data directly from API
  colorScheme?: string;
  isLoading?: boolean;
  filterBy?: {
    diagnosis?: string;
    diagnosticCategory?: string;
    symptom?: string;
    icd10Code?: string;
  };
}

// Color theme presets that can be selected
interface ColorThemePreset {
  name: string;
  saturation?: number;
  lightness?: number;
  alpha?: number;
  isCustomPalette?: boolean;
  colors?: string[];
}

export default function BooleanHrsnHeatmap({ 
  patientData,
  extractedSymptoms,
  colorScheme = 'vivid', // Default to vivid to match other charts
  isLoading = false,
  filterBy
}: BooleanHrsnHeatmapProps): JSX.Element {
  // State for pivot table data and UI controls
  const [pivotData, setPivotData] = useState<HrsnPivotData>({ 
    rows: [], 
    columns: [], 
    data: {}, 
    maxValue: 0,
    detailedData: {}
  });
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Log component load with parameters
  useEffect(() => {
    console.log("BooleanHrsnHeatmap COMPONENT LOADED at", new Date().toLocaleTimeString());
    console.warn("⚠️ BooleanHrsnHeatmap WARN - Component is rendering", {
      patientDataLength: patientData?.length,
      extractedSymptomsLength: extractedSymptoms?.length,
      colorScheme,
      filterBy,
      availableColorSchemes: Object.keys(colorSchemes)
    });
  }, []);
  
  // Constants for Boolean HRSN categories to show in the visualization
  const BOOLEAN_HRSN_CATEGORIES = [
    'housing_insecurity',
    'food_insecurity',
    'transportation',
    'veteran_status',
    'access_to_transportation',
    'has_a_car'
  ];
  
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
  
  // Get color from selected color scheme based on value and maximum
  const getColorFromScheme = (value: number, maxValue: number, isEmpty = false): string => {
    if (isEmpty) return '#f5f5f5'; // Light gray for empty cells
    
    // Select from predefined color schemes with proper type safety
    const scheme = colorSchemes[colorScheme as keyof typeof colorSchemes] || colorSchemes.viridis;
    
    // Handle both object and array formats
    let colorMap: string[] = [];
    
    if (Array.isArray(scheme)) {
      colorMap = scheme;
    } else if (scheme.colors && Array.isArray(scheme.colors)) {
      colorMap = scheme.colors;
    } else {
      // Fallback to a basic array of blues if scheme format is unexpected
      colorMap = colorSchemes.blues;
    }
    
    // Calculate color index based on value percentage of maximum
    let colorIndex = 0;
    if (maxValue > 0) {
      const normalizedValue = value / maxValue;
      colorIndex = Math.floor(normalizedValue * (colorMap.length - 1));
      // Safety check to ensure we're within bounds
      colorIndex = Math.max(0, Math.min(colorIndex, colorMap.length - 1));
    }
    
    return colorMap[colorIndex];
  };
  
  // Data processing function to create the pivot table data
  useEffect(() => {
    if (!patientData || patientData.length === 0) {
      return;
    }
    
    console.log("Processing", patientData.length, "patient records for Boolean HRSN heatmap");
    
    // Create the pivot table structure
    const processedPivotData: HrsnPivotData = {
      rows: BOOLEAN_HRSN_CATEGORIES,
      columns: AGE_RANGES,
      data: {},
      maxValue: 0,
      detailedData: {}
    };
    
    // Initialize data structure with zeros
    BOOLEAN_HRSN_CATEGORIES.forEach(category => {
      processedPivotData.data[category] = {};
      processedPivotData.detailedData![category] = {};
      
      AGE_RANGES.forEach(ageRange => {
        processedPivotData.data[category][ageRange] = 0;
      });
    });
    
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
    
    // Log the number of patients in each age range
    AGE_RANGES.forEach(ageRange => {
      console.log("age_range " + ageRange + ": " + patientsByAgeRange[ageRange].length + " patients");
    });
    
    // Calculate total count across all age ranges
    const totalPatients = Object.values(patientsByAgeRange).reduce(
      (sum, patients) => sum + patients.length, 0
    );
    console.log("Total patients grouped by age_range:", totalPatients);
    
    // Calculate percentages for each cell in the heatmap
    BOOLEAN_HRSN_CATEGORIES.forEach(category => {
      AGE_RANGES.forEach(ageRange => {
        const patientsInRange = patientsByAgeRange[ageRange];
        const totalInRange = patientsInRange ? patientsInRange.length : 0;
        
        if (totalInRange === 0) {
          // Skip if no patients in this range
          return;
        }
        
        // Keep track of patients with Yes/No values for boolean fields
        let positiveCount = 0;
        let negativeCount = 0;
        let respondedCount = 0;
        
        patientsInRange.forEach(patient => {
          const value = patient[category];
          
          // Skip if value is undefined or null (not responded)
          if (value === undefined || value === null || value === '') {
            return;
          }
          
          // Increment respondedCount to track patients who have data for this field
          respondedCount++;
          
          // For boolean fields where "Yes" indicates a need
          if (['housing_insecurity', 'food_insecurity', 'veteran_status'].includes(category)) {
            if (value === 'Yes' || value === 'yes' || value === true || value === 1) {
              positiveCount++;
            } else if (value === 'No' || value === 'no' || value === false || value === 0) {
              negativeCount++;
            }
          } 
          // For boolean fields where "No" indicates a need
          else if (['transportation', 'access_to_transportation', 'has_a_car'].includes(category)) {
            if (value === 'No' || value === 'no' || value === false || value === 0) {
              positiveCount++;
            } else if (value === 'Yes' || value === 'yes' || value === true || value === 1) {
              negativeCount++;
            }
          }
        });
        
        // Use respondedCount instead of totalInRange for percentage calculations
        // This ensures that only patients who have data for this field are counted
        const calculationBase = respondedCount > 0 ? respondedCount : 1;
        
        // Store detailed information for this cell
        const indicator = ['housing_insecurity', 'food_insecurity', 'veteran_status'].includes(category) ? 'yes' : 'no';
        const detailInfo: BooleanValueInfo = {
          positive: positiveCount,
          negative: negativeCount,
          positivePercent: Math.round((positiveCount / calculationBase) * 100),
          negativePercent: Math.round((negativeCount / calculationBase) * 100),
          indicator: indicator,
          label: indicator === 'yes' ? 'Yes' : 'No'
        };
        
        processedPivotData.detailedData![category][ageRange] = detailInfo;
        
        // Calculate percentage of patients with this indicator
        const percentage = Math.round((positiveCount / calculationBase) * 100);
        processedPivotData.data[category][ageRange] = percentage;
        
        // Track max value for color scaling
        if (percentage > processedPivotData.maxValue) {
          processedPivotData.maxValue = percentage;
        }
      });
    });
    
    console.log("Sample percentages for housing_insecurity:", 
                processedPivotData.data['housing_insecurity']);
    
    // Debug detailed data
    console.log("Detailed data available after processing:", 
                processedPivotData.detailedData ? "YES" : "NO");
    console.log("Detailed data keys:", 
                Object.keys(processedPivotData.detailedData || {}));
    
    // Log categories with detailed data
    const categoriesWithDetails = Object.keys(processedPivotData.detailedData || {});
    console.log("Categories with detailed data:", categoriesWithDetails.length);
    
    if (categoriesWithDetails.length > 0) {
      const sampleCategory = categoriesWithDetails[0];
      const ageRangesWithData = Object.keys(processedPivotData.detailedData![sampleCategory]);
      
      console.log(`Sample category "${sampleCategory}" has data for ${ageRangesWithData.length} age ranges`);
      
      if (ageRangesWithData.length > 0) {
        const sampleAgeRange = ageRangesWithData[0];
        const sampleData = processedPivotData.detailedData![sampleCategory][sampleAgeRange];
        
        console.log("Sample detailed data:", {
          category: sampleCategory,
          ageRange: sampleAgeRange, 
          data: sampleData,
          dataType: "BooleanValueInfo"
        });
      }
    }
    
    console.log("Processed Boolean HRSN pivot data:", processedPivotData);
    
    // Update state with the processed data
    setPivotData(processedPivotData);
  }, [patientData, extractedSymptoms, filterBy]);
  
  // Render the heatmap
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Social Determinants Indicators by Age Range</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsExpanded(true)} 
            title="Expand View"
            id="bool-hrsn-expand-btn"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        {filterBy?.diagnosis && (
          <CardDescription>
            Filtered by diagnosis: {filterBy.diagnosis}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Main heatmap visualization */}
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <div className="min-w-full">
                <div className="flex border-b border-gray-200">
                  {/* Header cell for column labels */}
                  <div className="p-2 font-medium text-gray-600 min-w-[160px] bg-gray-50 sticky left-0 z-20">
                    <span style={{ fontSize: '14px' }}>HRSN Indicator</span>
                  </div>
                  
                  {/* Age range column headers */}
                  {pivotData.columns.map((ageRange: string) => (
                    <div key={ageRange} className="p-2 font-medium text-gray-600 text-center min-w-[90px] sticky top-0 z-10 bg-gray-50">
                      <span style={{ fontSize: '14px' }}>{ageRange}</span>
                    </div>
                  ))}
                </div>
                
                {/* Data rows */}
                <div className="w-full">
                  {pivotData.rows.map((category: string) => (
                    <div key={category} className="flex border-b border-gray-200">
                      {/* Category name cell */}
                      <div className="p-2 font-medium text-gray-700 min-w-[160px] sticky left-0 bg-white z-10">
                        <span style={{ fontSize: '14px' }}>{formatCategoryName(category)}</span>
                      </div>
                      
                      {/* Data cells for each age range */}
                      {pivotData.columns.map((ageRange: string) => {
                        const colorValue = pivotData.data[category]?.[ageRange] || 0;
                        const isEmpty = colorValue === 0;
                        
                        // Get the detailed info for this cell
                        const detailInfo = pivotData.detailedData?.[category]?.[ageRange];
                        
                        // Get color based on the selected color scheme
                        const color = getColorFromScheme(colorValue, pivotData.maxValue, isEmpty);
                        
                        // Determine what to show in the cell
                        let displayContent;
                        
                        if (isEmpty) {
                          displayContent = (
                            <span className="text-gray-400 text-sm">-</span>
                          );
                        } else if (detailInfo) {
                          // For boolean fields
                          const indicator = detailInfo.indicator === 'yes' ? 'Yes' : 'No';
                          const percentage = detailInfo.positivePercent;
                          
                          displayContent = (
                            <div className="flex flex-col items-center">
                              <span 
                                className="font-medium" 
                                style={{ 
                                  fontSize: '14px',
                                  color: colorValue > 50 ? '#fff' : '#000' 
                                }}
                              >
                                {indicator}: {percentage}%
                              </span>
                            </div>
                          );
                        } else {
                          // Fallback to basic percentage if detailed data is missing
                          displayContent = (
                            <span 
                              className="font-medium" 
                              style={{ 
                                fontSize: '14px',
                                color: colorValue > 50 ? '#fff' : '#000' 
                              }}
                            >
                              {colorValue}%
                            </span>
                          );
                        }
                        
                        // Create a tooltip for detailed info
                        let tooltipContent = "";
                        
                        if (detailInfo) {
                          const indicator = detailInfo.indicator === 'yes' ? 'Yes' : 'No';
                          tooltipContent = `${formatCategoryName(category)} - ${ageRange}\n${indicator}: ${detailInfo.positive} (${detailInfo.positivePercent}%)\nTotal responded: ${detailInfo.positive + detailInfo.negative}`;
                        } else {
                          tooltipContent = `${formatCategoryName(category)} - ${ageRange}\n${colorValue}%`;
                        }
                        
                        return (
                          <div 
                            key={`${category}-${ageRange}`} 
                            className="p-1 text-center min-w-[90px] min-h-[50px] flex items-center justify-center"
                            style={{ 
                              backgroundColor: color,
                              transition: 'background-color 0.2s'
                            }}
                            title={tooltipContent}
                          >
                            {displayContent}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Legend for the heatmap */}
            <div className="mt-4 text-xs text-gray-600 flex items-center">
              <div className="w-3 h-3 rounded-full bg-gray-200 mr-1"></div>
              <span>Empty: No Data</span>
              <div className="w-3 h-3 rounded-full ml-3 mr-1" style={{ backgroundColor: getColorFromScheme(10, 100) }}></div>
              <span>Low %</span>
              <div className="w-3 h-3 rounded-full ml-3 mr-1" style={{ backgroundColor: getColorFromScheme(50, 100) }}></div>
              <span>Medium %</span>
              <div className="w-3 h-3 rounded-full ml-3 mr-1" style={{ backgroundColor: getColorFromScheme(90, 100) }}></div>
              <span>High %</span>
            </div>
            
            {/* Help text for social determinants */}
            <div className="mt-2 text-xs text-gray-600">
              <p><strong>Housing Insecurity</strong>: "Yes" indicates patient has reported housing challenges</p>
              <p><strong>Food Insecurity</strong>: "Yes" indicates patient has reported food access challenges</p>
              <p><strong>Transportation</strong>: "No" indicates patient has reported transportation challenges</p>
            </div>
          </>
        )}
      </CardContent>
      
      {/* Full screen dialog */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-5xl w-[90vw]">
          <DialogHeader>
            <DialogTitle>Social Determinants Indicators by Age Range</DialogTitle>
            <DialogDescription>
              Detailed view of social determinants across different age groups
            </DialogDescription>
          </DialogHeader>
          
          {/* Full-size visualization (same content as card but with more space) */}
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <div className="min-w-full">
              <div className="flex border-b border-gray-200">
                {/* Header cell for column labels */}
                <div className="p-3 font-medium text-gray-600 min-w-[180px] bg-gray-50 sticky left-0 z-20">
                  <span>HRSN Indicator</span>
                </div>
                
                {/* Age range column headers */}
                {pivotData.columns.map((ageRange: string) => (
                  <div key={ageRange} className="p-3 font-medium text-gray-600 text-center min-w-[100px] sticky top-0 z-10 bg-gray-50">
                    <span>{ageRange}</span>
                  </div>
                ))}
              </div>
              
              {/* Data rows */}
              <div className="w-full">
                {pivotData.rows.map((category: string) => (
                  <div key={category} className="flex border-b border-gray-200">
                    {/* Category name cell */}
                    <div className="p-3 font-medium text-gray-700 min-w-[180px] sticky left-0 bg-white z-10">
                      <span>{formatCategoryName(category)}</span>
                    </div>
                    
                    {/* Data cells for each age range */}
                    {pivotData.columns.map((ageRange: string) => {
                      const colorValue = pivotData.data[category]?.[ageRange] || 0;
                      const isEmpty = colorValue === 0;
                      
                      // Get the detailed info for this cell
                      const detailInfo = pivotData.detailedData?.[category]?.[ageRange];
                      
                      // Get color based on the selected color scheme
                      const color = getColorFromScheme(colorValue, pivotData.maxValue, isEmpty);
                      
                      // Determine what to show in the cell (larger than in the card view)
                      let displayContent;
                      
                      if (isEmpty) {
                        displayContent = (
                          <span className="text-gray-400">No Data</span>
                        );
                      } else if (detailInfo) {
                        // For boolean fields
                        const indicator = detailInfo.indicator === 'yes' ? 'Yes' : 'No';
                        const percentage = detailInfo.positivePercent;
                        const totalResponded = detailInfo.positive + detailInfo.negative;
                        
                        displayContent = (
                          <div className="flex flex-col items-center">
                            <span 
                              className="font-medium" 
                              style={{ 
                                fontSize: '16px',
                                color: colorValue > 50 ? '#fff' : '#000' 
                              }}
                            >
                              {indicator}: {percentage}%
                            </span>
                            <span 
                              className="text-xs mt-1" 
                              style={{ 
                                color: colorValue > 50 ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' 
                              }}
                            >
                              ({detailInfo.positive} of {totalResponded})
                            </span>
                          </div>
                        );
                      } else {
                        // Fallback to basic percentage
                        displayContent = (
                          <span 
                            className="font-medium" 
                            style={{ 
                              fontSize: '16px',
                              color: colorValue > 50 ? '#fff' : '#000' 
                            }}
                          >
                            {colorValue}%
                          </span>
                        );
                      }
                      
                      return (
                        <div 
                          key={`${category}-${ageRange}`} 
                          className="p-3 text-center min-w-[100px] min-h-[70px] flex items-center justify-center"
                          style={{ 
                            backgroundColor: color,
                            transition: 'background-color 0.2s'
                          }}
                        >
                          {displayContent}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Expanded legend for the heatmap */}
          <div className="mt-4 text-sm text-gray-600 flex items-center">
            <div className="w-4 h-4 rounded-full bg-gray-200 mr-1"></div>
            <span>Empty: No Data</span>
            <div className="w-4 h-4 rounded-full ml-4 mr-1" style={{ backgroundColor: getColorFromScheme(10, 100) }}></div>
            <span>Low %</span>
            <div className="w-4 h-4 rounded-full ml-4 mr-1" style={{ backgroundColor: getColorFromScheme(50, 100) }}></div>
            <span>Medium %</span>
            <div className="w-4 h-4 rounded-full ml-4 mr-1" style={{ backgroundColor: getColorFromScheme(90, 100) }}></div>
            <span>High %</span>
          </div>
          
          {/* Expanded help text for categories */}
          <div className="mt-3 text-sm text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <p><strong>Housing Insecurity</strong>: "Yes" indicates patient has reported housing challenges</p>
              <p><strong>Food Insecurity</strong>: "Yes" indicates patient has reported food access challenges</p>
              <p><strong>Veteran Status</strong>: "Yes" indicates patient is a veteran</p>
            </div>
            <div>
              <p><strong>Transportation</strong>: "No" indicates patient has reported transportation challenges</p>
              <p><strong>Access to Transportation</strong>: "No" indicates patient lacks reliable access</p>
              <p><strong>Has a Car</strong>: "No" indicates patient does not have a personal vehicle</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}