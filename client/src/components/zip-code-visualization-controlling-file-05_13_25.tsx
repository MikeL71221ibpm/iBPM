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

  // Limited to top 25 for better display
  const topZipCodes = zipCodeData.slice(0, 25); 
  const topZipCodePercentages = zipCodePercentages.slice(0, 25);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Zip Code</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Count visualization */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-md font-medium">Zip Code Count</CardTitle>
                <CardDescription>Number of patients by zip code</CardDescription>
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
                      <p>Data acquisition: Count of patients per zip code</p>
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
                      <DialogTitle>Zip Code Count</DialogTitle>
                    </DialogHeader>
                    <div className="w-full h-[70vh]">
                      <ResponsiveBar
                        data={topZipCodes}
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
                          legend: 'Count',
                          legendPosition: 'middle',
                          legendOffset: -50
                        }}
                        labelSkipWidth={12}
                        labelSkipHeight={12}
                        role="application"
                        ariaLabel="Zip Code count bar chart"
                        barAriaLabel={e => `${e.id}: ${e.value} patients`}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {topZipCodes.length > 0 ? (
              <div className="h-[200px] w-full">
                <ResponsiveBar
                  data={topZipCodes}
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
                    legend: 'Zip Code',
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
                  ariaLabel="Zip Code count bar chart"
                  barAriaLabel={e => `${e.id}: ${e.value} patients`}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-gray-400">No zip code data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Percentage visualization */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-md font-medium">Zip Code %</CardTitle>
                <CardDescription>Percentage of patients by zip code</CardDescription>
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
                      <p>Data acquisition: Percentage of patients per zip code</p>
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
                      <DialogTitle>Zip Code Percentages</DialogTitle>
                    </DialogHeader>
                    <div className="w-full h-[70vh]">
                      <ResponsivePie
                        data={topZipCodePercentages}
                        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
                        innerRadius={0.5}
                        padAngle={0.7}
                        cornerRadius={3}
                        activeOuterRadiusOffset={8}
                        colors={{ scheme: colorScheme as any }}
                        borderWidth={1}
                        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                        arcLinkLabelsSkipAngle={10}
                        arcLinkLabelsTextColor="#333333"
                        arcLinkLabelsThickness={2}
                        arcLinkLabelsColor={{ from: 'color' }}
                        arcLabelsSkipAngle={10}
                        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
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
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {topZipCodePercentages.length > 0 ? (
              <div className="h-[200px] w-full">
                <ResponsivePie
                  data={topZipCodePercentages}
                  margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  innerRadius={0.5}
                  padAngle={0.7}
                  cornerRadius={3}
                  activeOuterRadiusOffset={8}
                  colors={{ scheme: colorScheme as any }}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  enableArcLinkLabels={false}
                  arcLabelsSkipAngle={10}
                  arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-gray-400">No zip code data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Map visualization */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-md font-medium">Zip Code Map</CardTitle>
                <CardDescription>Geographic distribution of patients</CardDescription>
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
                      <p>Data acquisition: Geographic map of patient zip codes</p>
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
                      <DialogTitle>Zip Code Map</DialogTitle>
                    </DialogHeader>
                    <div className="w-full h-[70vh]">
                      <ZipCodeMap zipData={zipCodeData} colorScheme={colorScheme} />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ZipCodeMap zipData={zipCodeData} colorScheme={colorScheme} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}