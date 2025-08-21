// Heatmap Visualizer Component
// Individual search visualization with standardized export functionality

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Maximize2, AlertCircle } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import ChartExportWidget from '@/components/chart-export-widget';

interface HeatmapVisualizerProps {
  patientId?: string;
  dateRange?: DateRange;
}

// Sample chart data structure
interface HeatmapCell {
  id: string;
  data: {
    x: string;
    y: number;
  }[];
}

export default function HeatmapVisualizer({ patientId, dateRange }: HeatmapVisualizerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const chartId = `diagnosis-heatmap-chart-${patientId}`;

  // Fetch diagnosis heatmap data
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/patient/diagnosis/heatmap', patientId, dateRange],
    enabled: !!patientId,
    retry: false,
  });

  // Format data for export
  const getExportData = () => {
    if (!data) return [];
    
    // Flatten heatmap data for export
    const flattenedData: any[] = [];
    
    // Get all unique diagnoses (x values)
    const allDiagnoses = new Set<string>();
    data.forEach((row: HeatmapCell) => {
      row.data.forEach(cell => {
        allDiagnoses.add(cell.x);
      });
    });
    
    // Sort diagnoses alphabetically
    const sortedDiagnoses = Array.from(allDiagnoses).sort();
    
    // Create map of severity values by diagnosis
    data.forEach((row: HeatmapCell) => {
      const category = row.id;
      const severityByDiagnosis: {[key: string]: number} = {};
      
      // Initialize all diagnoses with 0
      sortedDiagnoses.forEach(diagnosis => {
        severityByDiagnosis[diagnosis] = 0;
      });
      
      // Fill in actual values
      row.data.forEach(cell => {
        severityByDiagnosis[cell.x] = cell.y;
      });
      
      // Add to flattened data
      sortedDiagnoses.forEach(diagnosis => {
        flattenedData.push({
          Category: category,
          Diagnosis: diagnosis,
          Severity: severityByDiagnosis[diagnosis]
        });
      });
    });
    
    return flattenedData;
  };

  // Get detailed export data with patient information
  const getDetailedData = () => {
    const baseData = getExportData();
    // Add patient ID and date range to each record
    return baseData.map(item => ({
      ...item,
      PatientID: patientId || 'Unknown',
      DateRangeStart: dateRange?.from ? dateRange.from.toISOString().split('T')[0] : 'All dates',
      DateRangeEnd: dateRange?.to ? dateRange.to.toISOString().split('T')[0] : 'All dates'
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Diagnosis Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <Skeleton className="h-[250px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Diagnosis Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center text-center p-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Unable to load chart</h3>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "No data available for the selected patient."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sample data if needed (will be replaced by actual API data)
  const chartData = data.length > 0 ? data : [
    {
      id: "Mood Disorders",
      data: [
        { x: "Depression", y: 5 },
        { x: "Anxiety", y: 4 },
        { x: "Bipolar Disorder", y: 2 }
      ]
    },
    {
      id: "Sleep Disorders",
      data: [
        { x: "Depression", y: 2 },
        { x: "Anxiety", y: 3 },
        { x: "Bipolar Disorder", y: 1 }
      ]
    },
    {
      id: "Physical Symptoms",
      data: [
        { x: "Depression", y: 3 },
        { x: "Anxiety", y: 2 },
        { x: "Bipolar Disorder", y: 1 }
      ]
    },
    {
      id: "Cognitive Issues",
      data: [
        { x: "Depression", y: 4 },
        { x: "Anxiety", y: 2 },
        { x: "Bipolar Disorder", y: 1 }
      ]
    }
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">
          Diagnosis Heatmap
        </CardTitle>
        <ChartExportWidget
          chartId={chartId}
          chartTitle="Diagnosis Heatmap"
          data={getExportData()}
          showDetailedExport={true}
          getDetailedData={getDetailedData}
        />
      </CardHeader>
      <CardContent>
        <div id={chartId} className="h-[300px]">
          <ResponsiveHeatMap
            data={chartData}
            margin={{ top: 20, right: 80, bottom: 90, left: 110 }}
            valueFormat=">-.1f"
            axisTop={null}
            axisRight={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: '',
              legendPosition: 'middle',
              legendOffset: 70
            }}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: 'Diagnosis',
              legendPosition: 'middle',
              legendOffset: 70
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Category',
              legendPosition: 'middle',
              legendOffset: -85
            }}
            colors={{
              type: 'sequential',
              scheme: 'purples'
            }}
            emptyColor="#f5f5f5"
            borderColor="#ffffff"
            borderWidth={1}
            hoverTarget="cell"
            cellHoverOthersOpacity={0.25}
            enableLabels={false}
            legends={[
              {
                anchor: 'right',
                translateX: 60,
                translateY: 0,
                length: 120,
                thickness: 12,
                direction: 'column',
                tickPosition: 'after',
                tickSize: 5,
                tickSpacing: 4,
                tickOverlap: false,
                tickFormat: '>-.1f',
                title: 'Severity',
                titleAlign: 'start',
                titleOffset: 4
              }
            ]}
          />
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full" onClick={() => setIsExpanded(true)}>
              <Maximize2 className="mr-2 h-4 w-4" />
              Expand Chart
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl w-[90vw]">
            <DialogHeader>
              <DialogTitle>Diagnosis Heatmap</DialogTitle>
            </DialogHeader>
            <div className="h-[70vh]">
              <ResponsiveHeatMap
                data={chartData}
                margin={{ top: 30, right: 100, bottom: 100, left: 120 }}
                valueFormat=">-.1f"
                axisTop={null}
                axisRight={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: '',
                  legendPosition: 'middle',
                  legendOffset: 70
                }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: -45,
                  legend: 'Diagnosis',
                  legendPosition: 'middle',
                  legendOffset: 80
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Category',
                  legendPosition: 'middle',
                  legendOffset: -100
                }}
                colors={{
                  type: 'sequential',
                  scheme: 'purples'
                }}
                emptyColor="#f5f5f5"
                borderColor="#ffffff"
                borderWidth={1}
                hoverTarget="cell"
                cellHoverOthersOpacity={0.25}
                enableLabels={false}
                legends={[
                  {
                    anchor: 'right',
                    translateX: 70,
                    translateY: 0,
                    length: 140,
                    thickness: 16,
                    direction: 'column',
                    tickPosition: 'after',
                    tickSize: 5,
                    tickSpacing: 4,
                    tickOverlap: false,
                    tickFormat: '>-.1f',
                    title: 'Severity',
                    titleAlign: 'start',
                    titleOffset: 4
                  }
                ]}
              />
            </div>
            {/* Add export widget to expanded view */}
            <div className="flex justify-end mt-4">
              <ChartExportWidget
                chartId={`${chartId}-expanded`}
                chartTitle="Diagnosis Heatmap (Expanded)"
                data={getExportData()}
                showDetailedExport={true}
                getDetailedData={getDetailedData}
                iconSize={20}
              />
            </div>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}