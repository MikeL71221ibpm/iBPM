// HRSN Heatmap Component - May 13, 2025
// This component creates heatmaps for HRSN distributions

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ResponsiveHeatMap } from "@nivo/heatmap";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Maximize, FileDown } from "lucide-react";
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

interface HeatmapItem {
  id: string;
  data: Array<{
    x: string;
    y: number;
  }>;
}

interface HrsnHeatmapProps {
  data?: any[];
  title: string;
  categoryField?: string;
  // Chart export functions
  downloadChartAsCSV?: (chartTitle: string, data: any[], isPatientDetailExport?: boolean) => void;
  downloadChartAsExcel?: (chartTitle: string, data: any[]) => void;
  downloadChartAsJson?: (chartTitle: string, data: any[]) => void;
  printChart?: (chartTitle: string, isDialogChart?: boolean) => void;
  getFullDataset?: (chartType: string, includeAllData?: boolean, isPatientDetailExport?: boolean) => any[];
  categoryName?: string;
  colorScheme?: string;
  subtitle?: string;
  height?: number;
  filterBy?: {
    symptom?: string;
    diagnosticCategory?: string;
    diagnosis?: string;
    icd10Code?: string;
  };
}

export default function HrsnHeatmap({
  data = [],
  title,
  categoryField,
  categoryName,
  colorScheme = "blue",
  subtitle,
  height = 350,
  filterBy,
  downloadChartAsCSV,
  downloadChartAsExcel,
  downloadChartAsJson,
  printChart,
  getFullDataset
}: HrsnHeatmapProps) {
  // For backward compatibility
  const actualCategoryField = categoryField || categoryName || "access_to_transportation";
  
  // State for dialog management
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Log field name usage for debugging
  useEffect(() => {
    console.log(`HRSN Heatmap using field: ${actualCategoryField}`);
    if (fieldNameMapping[actualCategoryField]) {
      console.log(`Field will be mapped to: ${fieldNameMapping[actualCategoryField]}`);
    }
  }, [actualCategoryField]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  
  // Enhanced age range calculation that matches working Race chart format
  const calculateAgeRange = (item: any): string => {
    // Handle pre-aggregated ageRange field from backend data
    if (item.ageRange) {
      // Convert backend format (18-29, 30-39) to standard format (18-25, 26-35)
      const backendRange = item.ageRange.toString();
      if (backendRange === "18-29") return "18-25";
      else if (backendRange === "30-39") return "26-35"; 
      else if (backendRange === "40-49") return "36-50";
      else if (backendRange === "50-64") return "51-65";
      else if (backendRange === "65+") return "65+";
      else return backendRange; // Use as-is if already in correct format
    }
    
    // First priority: Use existing age_range field if available
    if (item.age_range && item.age_range !== 'Unknown' && item.age_range !== 'All Ages') {
      return item.age_range;
    }
    
    // Second priority: Calculate from age field (using standard format)
    if (item.age && item.age > 0) {
      const age = item.age;
      if (age < 18) return "Under 18";
      if (age >= 18 && age <= 25) return "18-25";
      if (age >= 26 && age <= 35) return "26-35";
      if (age >= 36 && age <= 50) return "36-50";
      if (age >= 51 && age <= 65) return "51-65";
      if (age >= 65) return "65+";
    }
    
    // Third priority: Calculate from birth date (using standard format)
    if (item.date_of_birth) {
      const birthDate = typeof item.date_of_birth === 'string' ? new Date(item.date_of_birth) : item.date_of_birth;
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        // Adjust age if birthday hasn't occurred this year
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
        
        if (calculatedAge >= 0) {
          if (calculatedAge < 18) return "Under 18";
          if (calculatedAge >= 18 && calculatedAge <= 25) return "18-25";
          if (calculatedAge >= 26 && calculatedAge <= 35) return "26-35";
          if (calculatedAge >= 36 && calculatedAge <= 50) return "36-50";
          if (calculatedAge >= 51 && calculatedAge <= 65) return "51-65";
          if (calculatedAge >= 65) return "65+";
        }
      }
    }
    
    return "Unknown";
  };

  // Process data for heatmap visualization
  useEffect(() => {
    if (!data || data.length === 0) {
      setHeatmapData([]);
      return;
    }
    
    try {
      // Apply filters if needed
      let filteredData = [...data];
      
      if (filterBy) {
        if (filterBy.symptom) {
          const symptomField = filterBy.symptom;
          filteredData = filteredData.filter((item: any) => 
            item && getMappedFieldValue(item, symptomField) === "Yes"
          );
        }
        
        if (filterBy.diagnosis) {
          filteredData = filteredData.filter((item: any) => 
            item && getMappedFieldValue(item, "diagnosis") === filterBy.diagnosis
          );
        }
        
        if (filterBy.diagnosticCategory) {
          filteredData = filteredData.filter((item: any) => 
            item && getMappedFieldValue(item, "diagnostic_category") === filterBy.diagnosticCategory
          );
        }
        
        if (filterBy.icd10Code) {
          filteredData = filteredData.filter((item: any) => 
            item && getMappedFieldValue(item, "icd10_code") === filterBy.icd10Code
          );
        }
      }
      
      // Process data to create a heatmap-friendly structure using enhanced age calculation
      // Group by age ranges (x-axis) and the target category (y-axis)
      const ageRanges = Array.from(new Set(filteredData.map((item: any) => calculateAgeRange(item)))).filter(Boolean).sort();
      const categoryValues = Array.from(new Set(filteredData.map((item: any) => getMappedFieldValue(item, actualCategoryField)))).filter(Boolean);
      
      // Calculate total patients per age range for percentages
      const ageTotals: Record<string, number> = {};
      ageRanges.forEach(age => {
        ageTotals[age as string] = filteredData.filter((item: any) => 
          calculateAgeRange(item) === age
        ).length;
      });
      
      // Create a matrix for the heatmap
      const heatmapItems = categoryValues.map((category) => {
        const ageData = ageRanges.map((age) => {
          const ageString = age as string;
          const count = filteredData.filter((item: any) => 
            calculateAgeRange(item) === age && 
            getMappedFieldValue(item, actualCategoryField) === category
          ).length;
          
          // Calculate percentage of this value within this age group
          const percentage = ageTotals[ageString] > 0 
            ? Math.round((count / ageTotals[ageString]) * 100) 
            : 0;
          
          console.log(`Calculating percentage for ${category} in ${ageString}: ${count}/${ageTotals[ageString]} = ${percentage}%`);
          
          return {
            x: ageString,
            y: percentage // Use percentage instead of raw count
          };
        });
        
        return {
          id: category,
          data: ageData
        };
      });
      
      console.log("Generated heatmap data:", {
        uniqueCategories: categoryValues,
        uniqueAgeRanges: ageRanges,
        heatmapData: heatmapItems
      });
      setHeatmapData(heatmapItems);
    } catch (error) {
      console.error("Error processing heatmap data:", error);
      setHeatmapData([]);
    }
  }, [data, actualCategoryField, colorScheme, filterBy]);
  
  if (!data || data.length === 0 || heatmapData.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">{title}</CardTitle>
          <CardDescription>
            {subtitle || "Distribution by age groups (values shown as percentages)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-center">No data available</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        <CardDescription>
          {subtitle || "Distribution by age groups (values shown as percentages)"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 relative">
        <div style={{ height: height }}>
          <ResponsiveHeatMap
            data={heatmapData}
            margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
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
              legendOffset: -40
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
            enableLabels={true}
            labelTextColor="#000000"
            cellOpacity={1.0}
            theme={{
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
                },
                legend: {
                  text: {
                    fill: "#000000",
                    fontSize: 11,
                    fontWeight: "bold"
                  }
                }
              },
              labels: {
                text: {
                  fill: "#000000",
                  fontWeight: "bold"
                }
              }
            }}
            hoverTarget="cell"
            legends={[]}
            cellHoverOpacity={1.0}
            cellHoverOthersOpacity={0.25}
          />
        </div>
      </CardContent>
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
              <DialogDescription>
                {subtitle || "Distribution by age groups (values shown as percentages)"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="w-full h-[500px] mt-2">
              <ResponsiveHeatMap
                data={heatmapData}
                margin={{ top: 40, right: 60, bottom: 80, left: 80 }}
                valueFormat={(value) => `${value}%`}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: -45,
                  legend: "Age Ranges",
                  legendPosition: "middle",
                  legendOffset: 60
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: actualCategoryField.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
                  legendPosition: "middle",
                  legendOffset: -60
                }}
                colors={{
                  type: "sequential",
                  scheme: colorScheme === 'default' ? 'blues' : 
                        colorScheme === 'blue' ? 'blues' : 
                        colorScheme === 'green' ? 'greens' : 
                        colorScheme === 'purple' ? 'purples' : 
                        colorScheme === 'rainbow' ? 'spectral' :
                        colorScheme === 'grayscale' ? 'greys' : 'blues'
                }}
                emptyColor="#f5f5f5"
                borderColor="#ffffff"
                labelTextColor="#000000"
                hoverTarget="cell"
                enableLabels={true}
                labelSkipWidth={12}
                labelSkipHeight={12}
                theme={{
                  axis: {
                    ticks: {
                      text: {
                        fill: "#000000", 
                        fontWeight: "bold"
                      }
                    },
                    legend: {
                      text: {
                        fill: "#000000",
                        fontSize: 11,
                        fontWeight: "bold"
                      }
                    }
                  },
                  labels: {
                    text: {
                      fill: "#000000",
                      fontWeight: "bold"
                    }
                  }
                }}
                legends={[]}
                cellHoverOpacity={1.0}
                cellHoverOthersOpacity={0.25}
              />
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
    </Card>
  );
}