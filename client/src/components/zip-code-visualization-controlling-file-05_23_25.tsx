import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, Info } from "lucide-react";
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import HighVisibilityExportWidget from "./chart-export-widget";

interface ZipCodeVisualizationProps {
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

interface ChartDataItem {
  id: string;
  value: number;
  percentage?: number;
  count?: number;
  label?: string;
}

// Map component will be replaced with actual map in future
const ZipCodeMap = ({ zipData, colorScheme = "blues" }: { zipData: any[], colorScheme: string }) => {
  if (!zipData || zipData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <p className="text-gray-400">No zip code data available for mapping</p>
      </div>
    );
  }

  return (
    <div className="h-[200px] w-full flex items-center justify-center">
      <div className="text-center p-4 border border-dashed border-gray-300 rounded-md w-full">
        <p className="text-sm font-medium mb-2">Zip Code Map Visualization</p>
        <p className="text-xs text-gray-500">
          This will display a geographic map with zip codes colored by patient volume.
          <br />
          {zipData.length} distinct zip codes found in the data.
        </p>
      </div>
    </div>
  );
};

export default function ZipCodeVisualization({
  patientData = [],
  extractedSymptoms = [],
  colorScheme = "blues",
  isLoading = false,
  filterBy = {}
}: ZipCodeVisualizationProps) {
  
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

  // Process and prepare the zip code data
  const processZipCodeData = (): ChartDataItem[] => {
    try {
      // Count patients by zip code
      const zipCounts: Record<string, number> = {};
      
      patientData.forEach(patient => {
        const zipCode = patient.zip_code;
        if (zipCode) {
          zipCounts[zipCode] = (zipCounts[zipCode] || 0) + 1;
        }
      });
      
      // Convert to chart data format
      const chartData = Object.entries(zipCounts)
        .map(([id, value]) => ({
          id,
          value,
          label: id
        }))
        .sort((a, b) => b.value - a.value); // Sort by count descending
      
      return chartData;
    } catch (error) {
      console.error("Error processing zip code data:", error);
      return [];
    }
  };
  
  // Process percentage data
  const processZipCodePercentages = (): ChartDataItem[] => {
    try {
      // Get counts
      const zipCodes = processZipCodeData();
      
      // Calculate total (only count records with zip codes)
      const totalWithZipCodes = patientData.filter(p => p.zip_code).length;
      
      if (totalWithZipCodes === 0) return [];
      
      // Convert to percentages
      return zipCodes.map(item => ({
        ...item,
        percentage: Math.round((item.value / totalWithZipCodes) * 100),
        value: Math.round((item.value / totalWithZipCodes) * 100)
      }));
    } catch (error) {
      console.error("Error processing zip code percentages:", error);
      return [];
    }
  };

  const zipCodeData = processZipCodeData();
  const zipCodePercentages = processZipCodePercentages();
  
  // Limited to top 25 for better display (updated from top 10)
  const topZipCodes = zipCodeData.slice(0, 25); 
  const topZipCodePercentages = zipCodePercentages.slice(0, 25);

  // Generate heatmap data for age range distribution across zip codes
  const generateHeatmapData = () => {
    try {
      const ageRanges = ['18-25', '26-35', '36-50', '51-65', '65+'];
      
      return topZipCodes.map(zipItem => {
        const zipCode = zipItem.id;
        const ageData: Record<string, number> = {};
        
        ageRanges.forEach(ageRange => {
          const patientsInRange = patientData.filter(patient => 
            patient.zip_code === zipCode && patient.age_range === ageRange
          ).length;
          ageData[ageRange] = patientsInRange;
        });
        
        return {
          id: zipCode,
          data: ageRanges.map(range => ({
            x: range,
            y: ageData[range] || 0
          }))
        };
      });
    } catch (error) {
      console.error("Error generating heatmap data:", error);
      return [];
    }
  };

  const heatmapData = generateHeatmapData();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Zip Code - Top 25</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Count visualization */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-md font-medium">Zip Code Count</CardTitle>
                <CardDescription>Number of patients by zip code (Top 25)</CardDescription>
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
                      <p>Data acquisition: Count of patients per zip code (Top 25)</p>
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
                      <DialogTitle>Zip Code Count - Top 25</DialogTitle>
                    </DialogHeader>
                    <div className="w-full h-[70vh] relative">
                      <ResponsiveBar
                        data={zipCodeData.slice(0, 25)}
                        keys={['value']}
                        indexBy="id"
                        margin={{ top: 10, right: 10, bottom: 70, left: 60 }}
                        padding={0.3}
                        valueScale={{ type: 'linear' }}
                        colors={{ scheme: colorScheme as any }}
                        axisBottom={{
                          tickSize: 5,
                          tickPadding: 5,
                          tickRotation: -45,
                          legend: 'Zip Code',
                          legendPosition: 'middle',
                          legendOffset: 60
                        }}
                        axisLeft={{
                          tickSize: 5,
                          tickPadding: 5,
                          tickRotation: 0,
                          legend: 'Patient Count',
                          legendPosition: 'middle',
                          legendOffset: -40
                        }}
                        enableLabel={true}
                        animate={true}
                      />
                      {/* Export Widget for Expanded View */}
                      <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        zIndex: 9999,
                        backgroundColor: 'white',
                        padding: '8px',
                        borderRadius: '6px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <HighVisibilityExportWidget
                          chartId="zip_code_count_expanded"
                          chartTitle="Zip Code Count - Top 25 (Expanded)"
                          data={zipCodeData.slice(0, 25)}
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] relative">
              <ResponsiveBar
                data={topZipCodes}
                keys={['value']}
                indexBy="id"
                margin={{ top: 10, right: 10, bottom: 60, left: 40 }}
                padding={0.3}
                valueScale={{ type: 'linear' }}
                colors={{ scheme: colorScheme as any }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: -45,
                  legend: 'Zip Code',
                  legendPosition: 'middle',
                  legendOffset: 50
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Count',
                  legendPosition: 'middle',
                  legendOffset: -35
                }}
                enableLabel={false}
                animate={true}
              />
              {/* Export Widget for Collapsed View */}
              <div style={{
                position: 'absolute',
                bottom: '5px',
                right: '5px',
                zIndex: 9999,
                backgroundColor: 'white',
                padding: '8px',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <HighVisibilityExportWidget
                  chartId="zip_code_count"
                  chartTitle="Zip Code Count - Top 25"
                  data={topZipCodes}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Percentage visualization */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-md font-medium">Zip Code Percentage</CardTitle>
                <CardDescription>Percentage distribution by zip code (Top 25)</CardDescription>
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
                      <p>Data acquisition: Percentage distribution of patients by zip code (Top 25)</p>
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
                      <DialogTitle>Zip Code Percentage - Top 25</DialogTitle>
                    </DialogHeader>
                    <div className="w-full h-[70vh] relative">
                      <ResponsivePie
                        data={zipCodePercentages.slice(0, 25)}
                        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                        innerRadius={0.3}
                        padAngle={0.7}
                        cornerRadius={3}
                        colors={{ scheme: colorScheme as any }}
                        borderWidth={1}
                        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                        enableArcLinkLabels={true}
                        arcLinkLabelsSkipAngle={5}
                        arcLinkLabelsTextColor="#333333"
                        arcLinkLabelsThickness={2}
                        arcLinkLabelsColor={{ from: 'color' }}
                        arcLabelsSkipAngle={5}
                        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                        animate={true}
                      />
                      {/* Export Widget for Expanded View */}
                      <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        zIndex: 9999,
                        backgroundColor: 'white',
                        padding: '8px',
                        borderRadius: '6px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <HighVisibilityExportWidget
                          chartId="zip_code_percentage_expanded"
                          chartTitle="Zip Code Percentage - Top 25 (Expanded)"
                          data={zipCodePercentages.slice(0, 25)}
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] relative">
              <ResponsivePie
                data={topZipCodePercentages}
                margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                innerRadius={0.5}
                padAngle={0.7}
                cornerRadius={3}
                colors={{ scheme: colorScheme as any }}
                borderWidth={1}
                borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                enableArcLinkLabels={false}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                animate={true}
              />
              {/* Export Widget for Collapsed View */}
              <div style={{
                position: 'absolute',
                bottom: '5px',
                right: '5px',
                zIndex: 9999,
                backgroundColor: 'white',
                padding: '8px',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <HighVisibilityExportWidget
                  chartId="zip_code_percentage"
                  chartTitle="Zip Code Percentage - Top 25"
                  data={topZipCodePercentages}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Heatmap visualization */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-md font-medium">Zip Code Distribution</CardTitle>
                <CardDescription>Age range distribution across zip codes (Top 25)</CardDescription>
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
                      <p>Data acquisition: Patient age distribution across top 25 zip codes</p>
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
                  <DialogContent className="max-w-6xl">
                    <DialogHeader>
                      <DialogTitle>Zip Code Distribution - Top 25</DialogTitle>
                    </DialogHeader>
                    <div className="w-full h-[70vh] relative">
                      <ResponsiveHeatMap
                        data={heatmapData}
                        margin={{ top: 60, right: 90, bottom: 60, left: 120 }}
                        valueFormat=">-.0f"
                        axisTop={{
                          tickSize: 5,
                          tickPadding: 5,
                          tickRotation: 0,
                          legend: 'Age Range',
                          legendOffset: -46
                        }}
                        axisRight={null}
                        axisBottom={null}
                        axisLeft={{
                          tickSize: 5,
                          tickPadding: 5,
                          tickRotation: 0,
                          legend: 'Zip Codes',
                          legendPosition: 'middle',
                          legendOffset: -110,
                          renderTick: (tick: any) => (
                            <g transform={`translate(${tick.x},${tick.y})`}>
                              <text
                                textAnchor="end"
                                dominantBaseline="middle"
                                style={{
                                  fontSize: '12px',
                                  fill: '#666'
                                }}
                              >
                                {tick.value}
                              </text>
                            </g>
                          )
                        }}
                        colors={{
                          type: 'diverging',
                          scheme: 'red_yellow_blue',
                          divergeAt: 0.5,
                          minValue: 0,
                          maxValue: Math.max(...topZipCodes.map(d => d.value))
                        }}
                        emptyColor="#555555"
                        animate={true}
                      />
                      {/* Export Widget for Expanded View */}
                      <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        zIndex: 9999,
                        backgroundColor: 'white',
                        padding: '8px',
                        borderRadius: '6px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <HighVisibilityExportWidget
                          chartId="zip_code_distribution_expanded"
                          chartTitle="Zip Code Distribution - Top 25 (Expanded)"
                          data={heatmapData}
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] relative">
              <ResponsiveHeatMap
                data={heatmapData}
                margin={{ top: 10, right: 10, bottom: 30, left: 60 }}
                valueFormat=">-.0f"
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: -45,
                  legend: '',
                  legendOffset: 36
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Zip Codes',
                  legendPosition: 'middle',
                  legendOffset: -50,
                  renderTick: (tick: any) => (
                    <g transform={`translate(${tick.x},${tick.y})`}>
                      <text
                        textAnchor="end"
                        dominantBaseline="middle"
                        style={{
                          fontSize: '12px',
                          fill: '#666'
                        }}
                      >
                        {tick.value}
                      </text>
                    </g>
                  )
                }}
                colors={{
                  type: 'diverging',
                  scheme: 'red_yellow_blue',
                  divergeAt: 0.5,
                  minValue: 0,
                  maxValue: Math.max(...topZipCodes.map(d => d.value))
                }}
                emptyColor="#555555"
                animate={true}
              />
              {/* Export Widget for Collapsed View */}
              <div style={{
                position: 'absolute',
                bottom: '5px',
                right: '5px',
                zIndex: 9999,
                backgroundColor: 'white',
                padding: '8px',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <HighVisibilityExportWidget
                  chartId="zip_code_distribution"
                  chartTitle="Zip Code Distribution - Top 25"
                  data={heatmapData}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}