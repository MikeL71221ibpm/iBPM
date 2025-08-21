import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Info } from "lucide-react";
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Interfaces
interface HrsnIndicatorGridProps {
  patientData?: any[];
  extractedSymptoms?: any[];
  colorScheme?: string;
  isLoading?: boolean;
  filterBy?: {
    diagnosis?: string;
    diagnosticCategory?: string;
    symptom?: string;
    icd10Code?: string;
  };
}

interface IndicatorCardProps {
  title: string;
  description: string;
  dataType: "count" | "percentage" | "distribution";
  indicatorType: "boolean" | "categorical";
  fieldName: string;
  patientData?: any[];
  extractedSymptoms?: any[];
  colorScheme?: string;
  booleanPositiveValue?: string; // Value that indicates a "positive" for boolean fields (typically "Yes")
  filterBy?: any;
  sortOrder?: string[]; // For categorical fields with specific ordering (like education levels)
}

interface ChartDataItem {
  id: string;
  value: number;
  percentage?: number;
  count?: number;
  label?: string;
}

// Main Component
export default function HrsnIndicatorGrid({
  patientData = [],
  extractedSymptoms = [],
  colorScheme = "vivid",
  isLoading = false,
  filterBy = {}
}: HrsnIndicatorGridProps) {
  
  // State for enhanced data visualization descriptions
  const [showDataSource, setShowDataSource] = useState(true);
  
  // Early return for loading state
  if (isLoading) {
    return (
      <div className="w-full p-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  // Early return for no data
  if (!patientData || patientData.length === 0) {
    return (
      <div className="w-full p-8 flex justify-center items-center min-h-[400px]">
        <p className="text-gray-400">No patient data available. Please select search criteria and run a search.</p>
      </div>
    );
  }

  // Filter description builder
  const buildFilterDescription = () => {
    const parts = [];
    if (filterBy.diagnosis) parts.push(`Diagnosis: ${filterBy.diagnosis}`);
    if (filterBy.diagnosticCategory) parts.push(`Category: ${filterBy.diagnosticCategory}`);
    if (filterBy.symptom) parts.push(`Symptom: ${filterBy.symptom}`);
    if (filterBy.icd10Code) parts.push(`ICD-10: ${filterBy.icd10Code}`);
    
    return parts.length > 0 
      ? `Data filtered by ${parts.join(', ')}`
      : 'All patient data included';
  };

  // Education level has a specific ordering
  const educationLevelOrder = [
    'Less than High School',
    'High School',
    'Some College',
    'Associate',
    'Bachelor',
    'Graduate',
    'Professional Degree',
    'Doctorate'
  ];

  return (
    <div className="w-full space-y-6">
      {/* Data Visualization Source Information */}
      {showDataSource && (
        <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-medium">Data Visualization Source</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDataSource(false)}
                aria-label="Hide data source"
              >
                <span className="sr-only">Hide</span>
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {buildFilterDescription()}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {patientData.length} patients included in this analysis
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Chart Grid - Organized by HRSN Indicator */}
      <div className="space-y-12">
      
        {/* ==================== Housing Insecurity Section ==================== */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Housing Insecurity</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <IndicatorCard 
              title="Housing Insecurity Count" 
              description="Number of patients reporting housing insecurity"
              dataType="count"
              indicatorType="boolean"
              fieldName="housing_insecurity"
              patientData={patientData}
              extractedSymptoms={extractedSymptoms}
              colorScheme={colorScheme}
              booleanPositiveValue="Yes"
              filterBy={filterBy}
            />
            <IndicatorCard 
              title="Housing Insecurity %" 
              description="Percentage of patients reporting housing insecurity"
              dataType="percentage"
              indicatorType="boolean"
              fieldName="housing_insecurity"
              patientData={patientData}
              extractedSymptoms={extractedSymptoms}
              colorScheme={colorScheme}
              booleanPositiveValue="Yes"
              filterBy={filterBy}
            />
            <IndicatorCard 
              title="Housing Insecurity Distribution" 
              description="Distribution of housing insecurity across demographic groups"
              dataType="distribution"
              indicatorType="boolean"
              fieldName="housing_insecurity"
              patientData={patientData}
              extractedSymptoms={extractedSymptoms}
              colorScheme={colorScheme}
              booleanPositiveValue="Yes"
              filterBy={filterBy}
            />
          </div>
        </div>
      
        {/* ==================== Education Level Section ==================== */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Education Level</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <IndicatorCard 
              title="Education Level Count" 
              description="Distribution of education levels"
              dataType="count"
              indicatorType="categorical"
              fieldName="education_level"
              patientData={patientData}
              extractedSymptoms={extractedSymptoms}
              colorScheme={colorScheme}
              sortOrder={educationLevelOrder}
              filterBy={filterBy}
            />
            <IndicatorCard 
              title="Education Level %" 
              description="Percentage breakdown of education levels"
              dataType="percentage"
              indicatorType="categorical"
              fieldName="education_level"
              patientData={patientData}
              extractedSymptoms={extractedSymptoms}
              colorScheme={colorScheme}
              sortOrder={educationLevelOrder}
              filterBy={filterBy}
            />
            <IndicatorCard 
              title="Education Level Distribution" 
              description="Distribution of education levels across demographic groups"
              dataType="distribution"
              indicatorType="categorical"
              fieldName="education_level"
              patientData={patientData}
              extractedSymptoms={extractedSymptoms}
              colorScheme={colorScheme}
              sortOrder={educationLevelOrder}
              filterBy={filterBy}
            />
          </div>
        </div>
      
        {/* ==================== Gender Section ==================== */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Gender</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <IndicatorCard 
              title="Gender Count" 
              description="Distribution by gender"
              dataType="count"
              indicatorType="categorical"
              fieldName="gender"
              patientData={patientData}
              extractedSymptoms={extractedSymptoms}
              colorScheme={colorScheme}
              filterBy={filterBy}
            />
            <IndicatorCard 
              title="Gender %" 
              description="Percentage breakdown by gender"
              dataType="percentage"
              indicatorType="categorical"
              fieldName="gender"
              patientData={patientData}
              extractedSymptoms={extractedSymptoms}
              colorScheme={colorScheme}
              filterBy={filterBy}
            />
            <IndicatorCard 
              title="Gender Distribution" 
              description="Distribution of gender across demographic groups"
              dataType="distribution"
              indicatorType="categorical"
              fieldName="gender"
              patientData={patientData}
              extractedSymptoms={extractedSymptoms}
              colorScheme={colorScheme}
              filterBy={filterBy}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Indicator Card Component
function IndicatorCard({
  title,
  description,
  dataType,
  indicatorType,
  fieldName,
  patientData = [],
  extractedSymptoms = [],
  colorScheme = "vivid",
  booleanPositiveValue = "Yes",
  sortOrder,
  filterBy = {}
}: IndicatorCardProps) {
  
  // Function to process data based on indicator type and data type
  const processData = (): ChartDataItem[] => {
    try {
      // Boolean field processing (e.g., housing_insecurity, food_insecurity)
      if (indicatorType === "boolean") {
        // For boolean fields, we count positive values (typically "Yes")
        if (dataType === "count") {
          // Count positive values
          const positiveCount = patientData.filter(p => p[fieldName] === booleanPositiveValue).length;
          const negativeCount = patientData.filter(p => p[fieldName] && p[fieldName] !== booleanPositiveValue).length;
          const missingCount = patientData.filter(p => !p[fieldName]).length;
          
          return [
            { id: "Yes", value: positiveCount, label: "Yes" },
            { id: "No", value: negativeCount, label: "No" },
            { id: "No Data", value: missingCount, label: "No Data" }
          ];
        } 
        else if (dataType === "percentage") {
          // Calculate percentages for responding patients only
          const respondingPatients = patientData.filter(p => p[fieldName]);
          const totalResponding = respondingPatients.length;
          
          if (totalResponding === 0) return [];
          
          const positiveCount = respondingPatients.filter(p => p[fieldName] === booleanPositiveValue).length;
          const negativeCount = totalResponding - positiveCount;
          
          return [
            { 
              id: "Yes", 
              value: Math.round((positiveCount / totalResponding) * 100), 
              percentage: Math.round((positiveCount / totalResponding) * 100),
              count: positiveCount,
              label: "Yes" 
            },
            { 
              id: "No", 
              value: Math.round((negativeCount / totalResponding) * 100),
              percentage: Math.round((negativeCount / totalResponding) * 100),
              count: negativeCount,
              label: "No" 
            }
          ];
        }
        else if (dataType === "distribution") {
          // For distribution, we'll return data by age range
          const ageRanges = Array.from(new Set(patientData.map(p => p.age_range))).filter(Boolean).sort();
          
          return ageRanges.map(ageRange => {
            const patientsInRange = patientData.filter(p => p.age_range === ageRange);
            const respondingPatients = patientsInRange.filter(p => p[fieldName]);
            const positiveCount = respondingPatients.filter(p => p[fieldName] === booleanPositiveValue).length;
            const totalResponding = respondingPatients.length;
            
            const percentage = totalResponding ? Math.round((positiveCount / totalResponding) * 100) : 0;
            
            return {
              id: ageRange as string,
              value: percentage,
              percentage,
              count: positiveCount,
              label: `${ageRange}: ${percentage}%`
            };
          });
        }
      }
      
      // Categorical field processing (e.g., education_level, gender, race)
      else if (indicatorType === "categorical") {
        if (dataType === "count") {
          // Group by the field value and count
          const valueCounts: Record<string, number> = {};
          
          patientData.forEach(patient => {
            const value = patient[fieldName];
            if (value) {
              valueCounts[value] = (valueCounts[value] || 0) + 1;
            }
          });
          
          // Convert to chart data format
          let chartData = Object.entries(valueCounts).map(([id, value]) => ({
            id,
            value,
            label: id
          }));
          
          // Apply sort order if provided
          if (sortOrder && sortOrder.length > 0) {
            chartData = chartData.sort((a, b) => {
              return sortOrder.indexOf(a.id) - sortOrder.indexOf(b.id);
            });
          }
          
          return chartData;
        }
        else if (dataType === "percentage") {
          // Calculate percentages
          const respondingPatients = patientData.filter(p => p[fieldName]);
          const totalResponding = respondingPatients.length;
          
          if (totalResponding === 0) return [];
          
          const valueCounts: Record<string, number> = {};
          
          respondingPatients.forEach(patient => {
            const value = patient[fieldName];
            valueCounts[value] = (valueCounts[value] || 0) + 1;
          });
          
          // Convert to chart data format with percentages
          let chartData = Object.entries(valueCounts).map(([id, count]) => {
            const percentage = Math.round((count / totalResponding) * 100);
            return {
              id,
              value: percentage,
              percentage,
              count,
              label: `${id}: ${percentage}%`
            };
          });
          
          // Apply sort order if provided
          if (sortOrder && sortOrder.length > 0) {
            chartData = chartData.sort((a, b) => {
              return sortOrder.indexOf(a.id) - sortOrder.indexOf(b.id);
            });
          }
          
          return chartData;
        }
        else if (dataType === "distribution") {
          // For distribution, we'll show by age range
          const ageRanges = Array.from(new Set(patientData.map(p => p.age_range))).filter(Boolean).sort();
          const categories = Array.from(new Set(patientData.map(p => p[fieldName]))).filter(Boolean);
          
          // Create a matrix of age range × category
          const matrix: any[] = [];
          
          ageRanges.forEach(ageRange => {
            const row: any = { ageRange };
            const patientsInRange = patientData.filter(p => p.age_range === ageRange);
            const totalInRange = patientsInRange.length;
            
            categories.forEach(category => {
              const count = patientsInRange.filter(p => p[fieldName] === category).length;
              const percentage = totalInRange ? Math.round((count / totalInRange) * 100) : 0;
              row[category as string] = percentage;
            });
            
            matrix.push(row);
          });
          
          return matrix;
        }
      }
      
      return [];
    } catch (error) {
      console.error(`Error processing data for ${fieldName} (${dataType}):`, error);
      return [];
    }
  };
  
  // Process the data for this indicator and type
  const chartData = processData();
  
  // Early return for no data
  if (!chartData || chartData.length === 0) {
    return (
      <Card className="shadow-md h-[300px]">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-md font-medium">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Info className="h-4 w-4" />
                    <span className="sr-only">Info</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Data acquisition: {indicatorType === 'boolean' 
                    ? `Counting "${booleanPositiveValue}" values` 
                    : `Grouping by ${fieldName}`}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-gray-400 text-center">No data available for this visualization</p>
        </CardContent>
      </Card>
    );
  }
  
  // Render the appropriate chart based on dataType
  const renderChart = () => {
    if (dataType === "count") {
      return (
        <div className="h-[200px] w-full">
          <ResponsiveBar
            data={chartData}
            keys={['value']}
            indexBy="id"
            margin={{ top: 10, right: 10, bottom: 40, left: 40 }}
            padding={0.3}
            valueScale={{ type: 'linear' }}
            colors={{ scheme: colorScheme as any }}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: 'Category',
              legendPosition: 'middle',
              legendOffset: 32
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Count',
              legendPosition: 'middle',
              legendOffset: -35
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            role="application"
            ariaLabel={`${title} bar chart`}
            barAriaLabel={e => `${e.id}: ${e.formattedValue} patients`}
          />
        </div>
      );
    }
    else if (dataType === "percentage") {
      return (
        <div className="h-[200px] w-full">
          <ResponsivePie
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            innerRadius={0.5}
            padAngle={0.7}
            cornerRadius={3}
            activeOuterRadiusOffset={8}
            colors={{ scheme: colorScheme as any }}
            borderWidth={1}
            borderColor={{ from: 'color', modifiers: [ [ 'darker', 0.2 ] ] }}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="#333333"
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: 'color' }}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor={{ from: 'color', modifiers: [ [ 'darker', 2 ] ] }}
            defs={[
              {
                id: 'dots',
                type: 'patternDots',
                background: 'inherit',
                color: 'rgba(255, 255, 255, 0.3)',
                size: 4,
                padding: 1,
                stagger: true
              },
              {
                id: 'lines',
                type: 'patternLines',
                background: 'inherit',
                color: 'rgba(255, 255, 255, 0.3)',
                rotation: -45,
                lineWidth: 6,
                spacing: 10
              }
            ]}
            legends={[
              {
                anchor: 'bottom',
                direction: 'row',
                justify: false,
                translateX: 0,
                translateY: 56,
                itemsSpacing: 0,
                itemWidth: 100,
                itemHeight: 18,
                itemTextColor: '#999',
                itemDirection: 'left-to-right',
                itemOpacity: 1,
                symbolSize: 18,
                symbolShape: 'circle',
                effects: [
                  {
                    on: 'hover',
                    style: {
                      itemTextColor: '#000'
                    }
                  }
                ]
              }
            ]}
          />
        </div>
      );
    }
    else if (dataType === "distribution") {
      if (indicatorType === "boolean") {
        // For boolean distribution, use a bar chart by age range
        return (
          <div className="h-[200px] w-full">
            <ResponsiveBar
              data={chartData}
              keys={['value']}
              indexBy="id"
              margin={{ top: 10, right: 10, bottom: 40, left: 40 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: colorScheme as any }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'Age Range',
                legendPosition: 'middle',
                legendOffset: 32
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: '% Yes',
                legendPosition: 'middle',
                legendOffset: -35
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor="#ffffff"
              role="application"
              ariaLabel={`${title} distribution chart`}
              barAriaLabel={e => `${e.id}: ${e.formattedValue}%`}
            />
          </div>
        );
      } else {
        // For categorical distribution, use a heatmap
        return (
          <div className="h-[200px] w-full">
            <ResponsiveHeatMap
              data={chartData}
              keys={Object.keys(chartData[0]).filter(k => k !== 'ageRange')}
              indexBy="ageRange"
              margin={{ top: 10, right: 60, bottom: 40, left: 60 }}
              forceSquare={false}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'Age Range',
                legendPosition: 'middle',
                legendOffset: 32
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Category',
                legendPosition: 'middle',
                legendOffset: -40
              }}
              cellOpacity={1}
              cellBorderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
              defs={[
                {
                  id: 'lines',
                  type: 'patternLines',
                  background: 'inherit',
                  color: 'rgba(0, 0, 0, 0.1)',
                  rotation: -45,
                  lineWidth: 4,
                  spacing: 7
                }
              ]}
              fill={[{ id: 'lines' }]}
              animate={true}
              motionConfig="gentle"
              motionStiffness={80}
              motionDamping={9}
              hoverTarget="cell"
              cellHoverOthersOpacity={0.25}
              colors={{
                type: 'sequential',
                scheme: colorScheme as any,
                minValue: 0,
                maxValue: 100
              }}
            />
          </div>
        );
      }
    }
    
    return null;
  };
  
  // Fullscreen dialog content
  const fullscreenContent = (
    <div className="w-full h-[70vh]">
      {renderChart()}
    </div>
  );
  
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-md font-medium">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Info className="h-4 w-4" />
                    <span className="sr-only">Info</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Data acquisition: {indicatorType === 'boolean' 
                    ? `Counting "${booleanPositiveValue}" values` 
                    : `Grouping by ${fieldName}`}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Maximize2 className="h-4 w-4" />
                  <span className="sr-only">View fullscreen</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl">
                <DialogHeader>
                  <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                {fullscreenContent}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
}