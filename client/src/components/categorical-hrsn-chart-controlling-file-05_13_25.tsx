// Categorical HRSN Chart Component - May 13, 2025
// This component creates bar charts for HRSN indicators

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveHeatMap } from "@nivo/heatmap";
import { ResponsivePie } from "@nivo/pie";

// Field name mapping from standardized fields to current data fields
// This allows us to work with standardized field names while supporting legacy data
const fieldNameMapping: Record<string, string> = {
  // Standard field name -> Current data field name
  "financial_status": "financial_strain",
  "access_to_transportation": "transportation_needs",
  "has_transportation": "transportation_needs",
  "has_a_car": "transportation_needs",
  "ethnicity": "ethnicity", // Use actual ethnicity field
  "zip_code": "zip_code", // Use actual zip code field
  "veteran_status": "veteran_status", // Use actual veteran status field
  "education_level": "education_level", // Use actual education level field
  "utilities_insecurity": "utility_needs" // Map to correct field name in current data
};

interface DataItem {
  id: string;
  label: string;
  value: number;
  color: string;
  originalValue?: string; // Original value before any display modifications
  [key: string]: string | number | undefined;
}

interface CategoricalHrsnChartProps {
  data?: any[];
  title: string;
  categoryField?: string;
  categoryName?: string; // Alternative name for backwards compatibility
  valueField?: string;
  colorScheme?: string;
  isPercentage?: boolean;
  subtitle?: string;
  height?: number;
  chartType?: 'bar' | 'pie' | 'heatmap'; // Type of chart to render
  compactMode?: boolean; // Flag for compact design with minimal padding
  filterBy?: {
    symptom?: string;
    diagnosticCategory?: string;
    diagnosis?: string;
    icd10Code?: string;
  };
}

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

export default function CategoricalHrsnChart({
  data = [],
  title,
  categoryField,
  categoryName,
  valueField,
  colorScheme = "blue",
  isPercentage = false,
  subtitle,
  height = 350,
  chartType = "bar", // Default to bar chart
  compactMode = false, // Default to standard padding
  filterBy
}: CategoricalHrsnChartProps) {
  // For backward compatibility
  const actualCategoryField = categoryField || categoryName || "category";
  const [chartData, setChartData] = useState<DataItem[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [filtersActive, setFiltersActive] = useState<boolean>(false);
  
  // For debugging - log the standardized field name and check for mappings
  useEffect(() => {
    if (data && data.length > 0) {
      console.log(`Chart ${title} looking for field: ${actualCategoryField}`);
      const mappedField = fieldNameMapping[actualCategoryField];
      if (mappedField) {
        console.log(`Field ${actualCategoryField} is mapped to ${mappedField}`);
      }
    }
  }, [actualCategoryField, data, title]);
  
  // Color schemes (matching Individual Search colors exactly)
  const colorSchemes: Record<string, string[]> = {
    default: ["#0369a1", "#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc"],
    blues: ["#0369a1", "#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc"],
    rainbow: ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6", "#ec4899"],
    viridis: ["#440154", "#404387", "#29788E", "#22A784", "#79D151", "#FDE724"],
    iridis: ["#FEFE62", "#D7B541", "#AB7424", "#74260E", "#3A0853"],
    grayscale: ["#1F2937", "#4B5563", "#6B7280", "#9CA3AF", "#D1D5DB", "#F3F4F6"],
    blue: ["#0369a1", "#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc"],
    green: ["#047857", "#059669", "#10b981", "#34d399", "#6ee7b7"],
    purple: ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"],
    orange: ["#ea580c", "#f97316", "#fb923c", "#fdba74", "#fed7aa"],
    red: ["#b91c1c", "#dc2626", "#ef4444", "#f87171", "#fca5a5"],
    teal: ["#0f766e", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4"],
    amber: ["#b45309", "#d97706", "#f59e0b", "#fbbf24", "#fcd34d"],
    indigo: ["#4338ca", "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc"],
    pink: ["#be185d", "#db2777", "#ec4899", "#f472b6", "#f9a8d4"],
    cyan: ["#0e7490", "#06b6d4", "#22d3ee", "#67e8f9", "#a5f3fc"],
    slate: ["#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1"],
    gray: ["#374151", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db"]
  };
  
  // Get colors for current scheme
  const getColors = () => {
    console.log("Getting colors for scheme:", colorScheme);
    return colorSchemes[colorScheme] || colorSchemes.blue;
  };
  
  // Generate more comprehensive heatmap data including age ranges 
  const generateHeatmapData = () => {
    // If we don't have data, return empty array
    if (!data || data.length === 0) {
      return [];
    }
    
    // CRITICAL FIX: Always use data even when filters are active but return no results
    // This ensures we show charts even when filters don't match any data
    const dataToUse = (filtersActive && filteredData.length > 0) ? filteredData : data;
    
    // Added extra safeguard - NEVER use empty data if original data exists
    if (dataToUse.length === 0 && data.length > 0) {
      console.log("⚠️ Override: Using original data because filtered data is empty");
      return data; // Fallback to original data
    }
    
    console.log(`Using ${filtersActive && filteredData.length > 0 ? 'filtered' : 'all'} data for visualization:`, 
                 {recordCount: dataToUse.length, filtersActive, filteredDataAvailable: filteredData.length > 0});
    
    try {
      // Get unique values for the category field
      const uniqueCategories = new Set<string>();
      // Get unique age ranges in data
      const uniqueAgeRanges = new Set<string>();
      
      // Collect all unique categories and age ranges
      dataToUse.forEach((item: any) => {
        if (!item) return;
        
        // Get category value and standardize Yes/No values
        // Use field mapping to support standardized field names
        let categoryValue = getMappedFieldValue(item, actualCategoryField);
        if (typeof categoryValue === 'string') {
          if (['yes', 'y', 'true', '1'].includes(categoryValue.toLowerCase())) {
            categoryValue = 'Yes';
          } else if (['no', 'n', 'false', '0'].includes(categoryValue.toLowerCase())) {
            categoryValue = 'No';
          }
        } else if (typeof categoryValue === 'boolean') {
          categoryValue = categoryValue ? 'Yes' : 'No';
        } else if (typeof categoryValue === 'number') {
          categoryValue = categoryValue > 0 ? 'Yes' : 'No';
        }
        
        if (categoryValue) {
          uniqueCategories.add(categoryValue.toString());
        }
        
        // Get age range
        if (item.age_range) {
          uniqueAgeRanges.add(item.age_range);
        }
      });
      
      // Sort age ranges chronologically (they should be in format "XX-YY")
      const sortedAgeRanges = Array.from(uniqueAgeRanges).sort((a, b) => {
        const aStart = parseInt(a.toString().split('-')[0]);
        const bStart = parseInt(b.toString().split('-')[0]);
        return aStart - bStart;
      });
      
      // If no age ranges found, create a default one
      if (sortedAgeRanges.length === 0) {
        sortedAgeRanges.push('All Ages');
      }
      
      // Create a matrix of category values by age ranges
      const result = Array.from(uniqueCategories).map(category => {
        // For transportation fields, enhance labels to clarify meaning
        let displayCategory = category.toString();
        if (actualCategoryField === 'access_to_transportation' || 
            actualCategoryField === 'has_a_car' || 
            actualCategoryField === 'has_transportation') {
          if (category === 'Yes') {
            displayCategory = 'Yes (Issue)';
          } else if (category === 'No') {
            displayCategory = 'No (No Issue)';
          }
        }
        
        // Create an object with counts for each age range
        const ageData = sortedAgeRanges.map(ageRange => {
          // Track unique patient IDs for this category and age range
          const uniquePatientIds = new Set<string>();
          
          // Process all matching patients but only count each unique patient once
          dataToUse.forEach((item: any) => {
            if (!item) return;
            
            // Get and standardize the category value
            // Use field mapping to support standardized field names
            let itemCategory = getMappedFieldValue(item, actualCategoryField);
            
            // Standardize Yes/No values
            if (typeof itemCategory === 'string') {
              if (['yes', 'y', 'true', '1'].includes(itemCategory.toLowerCase())) {
                itemCategory = 'Yes';
              } else if (['no', 'n', 'false', '0'].includes(itemCategory.toLowerCase())) {
                itemCategory = 'No';
              }
            } else if (typeof itemCategory === 'boolean') {
              itemCategory = itemCategory ? 'Yes' : 'No';
            } else if (typeof itemCategory === 'number') {
              itemCategory = itemCategory > 0 ? 'Yes' : 'No';
            }
            
            // Check if this record matches our filter criteria
            const matchesCategory = itemCategory?.toString() === category.toString();
            const matchesAgeRange = (ageRange === 'All Ages' || item.age_range === ageRange);
            
            if (matchesCategory && matchesAgeRange) {
              // Get a unique patient identifier
              const patientId = item.id || item.patient_id;
              if (patientId) {
                uniquePatientIds.add(patientId.toString());
              }
            }
          });
          
          // Use the count of unique patient IDs instead of raw count
          const filteredCount = uniquePatientIds.size;
          
          // For total counts, we should also use unique patients
          // Count all unique patients in the filtered dataset for this age range
          const uniqueTotalPatients = new Set<string>();
          dataToUse.forEach((item: any) => {
            if (!item) return;
            const patientId = item.id || item.patient_id;
            if (patientId && (ageRange === 'All Ages' || item.age_range === ageRange)) {
              uniqueTotalPatients.add(patientId.toString());
            }
          });
          
          // Calculate percentage using unique patient counts (avoid division by zero)
          const filteredTotal = uniqueTotalPatients.size;
          const percentage = filteredTotal > 0 
            ? Math.round((filteredCount / filteredTotal) * 100) 
            : 0;
            
          console.log(`Calculating percentage for ${category} in ${ageRange}: ${filteredCount}/${filteredTotal} = ${percentage}%`);
          
          return {
            x: ageRange.toString(),
            y: percentage
          };
        });
        
        return {
          id: displayCategory,
          data: ageData
        };
      });
      
      // Enhanced logging for debug
      console.log("Generated heatmap data:", {
        uniqueCategories: Array.from(uniqueCategories),
        uniqueAgeRanges: sortedAgeRanges,
        heatmapData: result
      });
      
      return result;
    } catch (error) {
      console.error("Error generating heatmap data:", error);
      return [];
    }
  };
  
  // Process data when it changes
  useEffect(() => {
    if (!data || data.length === 0) {
      setChartData([]);
      return;
    }
    
    try {
      // Debugging - log field names in the data
      if (data.length > 0 && actualCategoryField === "transportation") {
        console.log("Sample transportation data:", {
          sample: data[0],
          fields: Object.keys(data[0]),
          transportationFields: {
            transportation: data[0].transportation,
            transportationAccess: data[0].transportation_access,
            accessibility: data[0].accessibility,
            transport: data[0].transport,
            mobilityAccess: data[0].mobility_access,
            publicTransport: data[0].public_transport,
            carOwnership: data[0].car_ownership,
            hasVehicle: data[0].has_vehicle,
            hasCar: data[0].has_car,
          }
        });
      }
      
      // Apply filters if needed
      let newFilteredData = [...data];
      let isFiltersActive = false;
      
      if (filterBy) {
        if (filterBy.symptom) {
          isFiltersActive = true;
          // Use has_symptom format
          const symptomField = `has_${filterBy.symptom.toLowerCase().replace(/\s+/g, '_')}`;
          console.log(`Filtering by symptom field: ${symptomField}`);
          
          newFilteredData = newFilteredData.filter((item: any) => 
            item && item[symptomField] === "Yes"
          );
        }
        
        if (filterBy.diagnosis) {
          isFiltersActive = true;
          newFilteredData = newFilteredData.filter((item: any) => 
            item && item.diagnosis === filterBy.diagnosis
          );
        }
        
        if (filterBy.diagnosticCategory) {
          isFiltersActive = true;
          newFilteredData = newFilteredData.filter((item: any) => 
            item && item.diagnostic_category === filterBy.diagnosticCategory
          );
        }
        
        if (filterBy.icd10Code) {
          isFiltersActive = true;
          newFilteredData = newFilteredData.filter((item: any) => 
            item && item.icd10_code === filterBy.icd10Code
          );
        }
      }
      
      // Update filtersActive state
      setFiltersActive(isFiltersActive);
      
      // Log filter status
      console.log(`Filters Active: ${isFiltersActive ? 'YES' : 'NO'} - Found ${newFilteredData.length} matching records out of ${data.length}`);
      
      // Only set filtered data if filters are active AND have matching records, otherwise use all data
      if (isFiltersActive && newFilteredData.length > 0) {
        setFilteredData(newFilteredData);
      } else {
        // If no filters applied or filtered data is empty, use all data
        setFilteredData([]);
        
        // If filters are active but returned no results, log this for debugging
        if (isFiltersActive && newFilteredData.length === 0) {
          console.log("⚠️ OVERRIDE WARNING: Filters returned no results, falling back to all data");
        }
      }
      
      // Count occurrences of each category
      const categoryCounts: Record<string, number> = {};
      newFilteredData.forEach((item: any) => {
        if (!item) return; // Skip null or undefined items
        
        // Use field mapping to support standardized field names
        let category = getMappedFieldValue(item, actualCategoryField);
        
        // Handle transportation field special cases
        if (actualCategoryField === 'access_to_transportation' || 
            actualCategoryField === 'has_a_car' || 
            actualCategoryField === 'has_transportation') {
          // Ensure values are standardized to Yes/No (handle case variations)
          if (typeof category === 'string') {
            category = category.toLowerCase();
            if (category === 'true' || category === 'yes' || category === 'y' || category === '1') {
              category = 'Yes';
            } else if (category === 'false' || category === 'no' || category === 'n' || category === '0') {
              category = 'No';
            }
          } else if (typeof category === 'boolean') {
            category = category ? 'Yes' : 'No';
          } else if (typeof category === 'number') {
            category = category > 0 ? 'Yes' : 'No';
          }
        }
        
        if (category) {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        }
      });
    
      // Check if we have any categories to display
      if (Object.keys(categoryCounts).length === 0) {
        console.log("No categories found for:", categoryField);
        setChartData([]);
        return;
      }
      
      // Convert to chart data format
      const chartItems: DataItem[] = Object.entries(categoryCounts)
        .map(([category, count], index) => {
          // Calculate value based on filtered data length instead of original data length
          const value = isPercentage ? Math.round((count / newFilteredData.length) * 100) : count;
          // Determine color based on field type and value
          let color = getColors()[index % getColors().length];
          
          // Special color handling for Yes/No transportation fields
          if (actualCategoryField === 'access_to_transportation' || 
              actualCategoryField === 'has_a_car' || 
              actualCategoryField === 'has_transportation') {
            if (category === 'Yes') {
              // Red for Yes (indicates problem with transportation)
              color = '#ef4444'; // Tailwind red-500
            } else if (category === 'No') {
              // Green for No (indicates no problem with transportation)
              color = '#22c55e'; // Tailwind green-500
            }
          }
          
          // For transportation fields, enhance labels to clarify meaning
          let displayLabel = category;
          if (actualCategoryField === 'access_to_transportation' || 
              actualCategoryField === 'has_a_car' || 
              actualCategoryField === 'has_transportation') {
            if (category === 'Yes') {
              displayLabel = 'Yes (Issue)';
            } else if (category === 'No') {
              displayLabel = 'No (No Issue)';
            }
          }
          
          return {
            id: category,
            label: displayLabel,
            originalValue: category, // Keep original for reference
            value: value,
            color: color
          };
        })
        .sort((a, b) => b.value - a.value); // Sort by value descending
      
      setChartData(chartItems);
      
      // Log data transformation results
      console.log("Chart data updated:", chartItems);
    } catch (error) {
      console.error("Error processing chart data:", error);
      setChartData([]);
    }
  }, [data, actualCategoryField, valueField, isPercentage, colorScheme, filterBy]);
  
  // CRITICAL FIX: Only show "No data" when there's truly no data
  // This will prevent showing empty charts when filters don't match anything
  // Fixed condition to ALWAYS show chart if data exists, regardless of filter state
  if (!data || data.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-center">No data available</p>
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
          {/* Render bar chart if chartType is bar */}
          {chartType === 'bar' && (
            <ResponsiveBar
              key={`bar-chart-${colorScheme}`}
              data={chartData}
              keys={["value"]}
              indexBy="label"
              margin={compactMode 
                ? { top: 5, right: 5, bottom: 15, left: 30 } 
                : { top: 10, right: 10, bottom: 40, left: 50 }}
              padding={compactMode ? 0.2 : 0.3}
              valueScale={{ type: "linear" }}
              indexScale={{ type: "band", round: true }}
              colors={(bar) => {
                // Use the specific color from the data if available
                if (bar.data.color) return bar.data.color;
                
                // Otherwise use color from the color scheme
                const index = bar.index % (getColors().length || 1);
                return getColors()[index];
              }}
              colorBy="indexValue" // This is key to using different colors for each bar
              borderRadius={4}
              borderWidth={1}
              borderColor={{
                from: "color",
                modifiers: [["darker", 0.6]]
              }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                truncateTickAt: 0,
                legendPosition: "middle",
                legendOffset: 35,
                renderTick: ({ textAnchor, textBaseline, textX, textY, value, x, y, theme, tickIndex, format, fontSize = 11 }) => {
                  // Truncate long text 
                  // Always display Up to 10 characters to ensure readability
                  const displayValue = value.toString().length > 10 ? 
                    value.toString().slice(0, 8) + '...' : 
                    value.toString();
                  
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <line
                        stroke="#aaa"
                        strokeWidth={1}
                        y1={0}
                        y2={8}
                      />
                      <text
                        dominantBaseline={textBaseline}
                        textAnchor={textAnchor}
                        transform={`translate(${textX},${textY}) rotate(-45)`}
                        style={{
                          ...theme?.axis?.ticks?.text,
                          fontSize: fontSize,
                          fill: "#000000",
                        }}
                      >
                        {displayValue}
                      </text>
                    </g>
                  );
                }
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legendPosition: "middle",
                legendOffset: -35,
                legend: isPercentage ? "Percentage (%)" : "Count"
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{
                from: "color",
                modifiers: [["darker", 2]]
              }}
              role="application"
              ariaLabel={title}
              barAriaLabel={e => `${e.id}: ${e.formattedValue} in ${e.indexValue}`}
              theme={{
                text: {
                  fill: "#000000",
                  fontSize: 11,
                  fontWeight: "bold"
                },
                axis: {
                  ticks: {
                    text: {
                      fill: "#000000",
                      fontSize: 11,
                      fontWeight: "bold"
                    }
                  }
                }
              }}
              tooltipLabel={d => d.id as string}
              tooltip={({ id, value, color }) => (
                <div
                  style={{
                    padding: 12,
                    background: 'white',
                    borderRadius: 3,
                    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',
                    border: `1px solid ${color}`,
                  }}
                >
                  <strong style={{ color }}>{id}</strong>
                  <div>
                    {isPercentage ? `${value}%` : `Count: ${value}`}
                  </div>
                </div>
              )}
            />
          )}
          
          {/* Render pie chart if chartType is pie */}
          {chartType === 'pie' && (
            <ResponsivePie
              data={chartData}
              margin={{ top: 10, right: 10, bottom: 30, left: 10 }}
              innerRadius={0.5}
              padAngle={0.7}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              borderWidth={1}
              borderColor={{
                from: 'color',
                modifiers: [['darker', 0.2]]
              }}
              colors={{
                scheme: colorScheme === 'blue' ? 'blues' : 
                        colorScheme === 'green' ? 'greens' : 
                        colorScheme === 'purple' ? 'purples' : 
                        colorScheme === 'orange' ? 'oranges' :
                        colorScheme === 'red' ? 'reds' : 'blues'
              }}
              arcLinkLabelsSkipAngle={10}
              arcLinkLabelsTextColor="#333333"
              arcLinkLabelsThickness={2}
              arcLinkLabelsColor={{ from: 'color' }}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor={{
                from: 'color',
                modifiers: [['darker', 2]]
              }}
              valueFormat=">-.0f"
              legends={[]}
              tooltip={({ datum }) => (
                <div
                  style={{
                    padding: 12,
                    background: 'white',
                    borderRadius: 3,
                    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',
                    border: `1px solid ${datum.color}`,
                  }}
                >
                  <strong style={{ color: datum.color }}>
                    {datum.label}
                  </strong>
                  <div>
                    {datum.value}{isPercentage ? '%' : ''}
                  </div>
                </div>
              )}
            />
          )}
          
          {/* Enhanced heatmap for age-based distribution */}
          {chartType === 'heatmap' && (
            <ResponsiveHeatMap
              data={generateHeatmapData()}
              margin={{ top: 15, right: 15, bottom: 60, left: 90 }}
              valueFormat={(value) => `${value}%`}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'Age Range',
                legendPosition: 'middle',
                legendOffset: 36
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: actualCategoryField.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                legendPosition: 'middle',
                legendOffset: -60
              }}
              colors={{
                type: 'sequential',
                scheme: colorScheme === 'default' ? 'blues' : 
                       colorScheme === 'blue' ? 'blues' : 
                       colorScheme === 'green' ? 'greens' : 
                       colorScheme === 'purple' ? 'purples' : 
                       colorScheme === 'rainbow' ? 'spectral' :
                       colorScheme === 'grayscale' ? 'greys' : 'blues'
              }}
              emptyColor="#f8fafc"
              borderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
              labelTextColor="#000000"
              hoverTarget="cell"
              animate={true}
              legends={[]}
              theme={{
                text: {
                  fill: "#000000",
                  fontSize: 12,
                  fontWeight: "bold"
                },
                axis: {
                  ticks: {
                    text: {
                      fill: "#000000",
                      fontSize: 11,
                      fontWeight: "bold"
                    }
                  },
                  legend: {
                    text: {
                      fill: "#000000",
                      fontSize: 12,
                      fontWeight: "bold"
                    }
                  }
                },
                tooltip: {
                  container: {
                    background: '#ffffff',
                    color: '#000000',
                    fontSize: 12,
                    fontWeight: 'bold',
                    boxShadow: '0 3px 8px rgba(0, 0, 0, 0.24)',
                    padding: 12,
                    borderRadius: 4
                  }
                },
                labels: {
                  text: {
                    fontWeight: 'bold',
                    fill: '#000000'
                  }
                }
              }}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}