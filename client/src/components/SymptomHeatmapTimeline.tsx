// Symptom Heatmap Timeline Component
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

interface SymptomHeatmapTimelineProps {
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

export default function SymptomHeatmapTimeline({ patientId, dateRange }: SymptomHeatmapTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const chartId = `symptom-timeline-chart-${patientId}`;

  // Fetch symptom timeline data
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/patient/symptoms/timeline', patientId, dateRange],
    enabled: !!patientId,
    retry: false,
  });

  // Format data for export
  const getExportData = () => {
    if (!data) return [];
    
    // Flatten heatmap data for export
    const flattenedData: any[] = [];
    
    // Get all unique dates (x values)
    const allDates = new Set<string>();
    data.forEach((row: HeatmapCell) => {
      row.data.forEach(cell => {
        allDates.add(cell.x);
      });
    });
    
    // Sort dates chronologically
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    // Create map of symptom values by date
    data.forEach((row: HeatmapCell) => {
      const symptomName = row.id;
      const symptomByDate: {[key: string]: number} = {};
      
      // Initialize all dates with 0
      sortedDates.forEach(date => {
        symptomByDate[date] = 0;
      });
      
      // Fill in actual values
      row.data.forEach(cell => {
        symptomByDate[cell.x] = cell.y;
      });
      
      // Add to flattened data
      sortedDates.forEach(date => {
        flattenedData.push({
          Symptom: symptomName,
          Date: date,
          Intensity: symptomByDate[date]
        });
      });
    });
    
    return flattenedData;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Symptom Timeline</CardTitle>
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
          <CardTitle>Symptom Timeline</CardTitle>
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
      id: "Depression",
      data: [
        { x: "Jan 2024", y: 3 },
        { x: "Feb 2024", y: 4 },
        { x: "Mar 2024", y: 2 },
        { x: "Apr 2024", y: 1 },
        { x: "May 2024", y: 0 }
      ]
    },
    {
      id: "Anxiety",
      data: [
        { x: "Jan 2024", y: 2 },
        { x: "Feb 2024", y: 3 },
        { x: "Mar 2024", y: 4 },
        { x: "Apr 2024", y: 3 },
        { x: "May 2024", y: 2 }
      ]
    },
    {
      id: "Insomnia",
      data: [
        { x: "Jan 2024", y: 4 },
        { x: "Feb 2024", y: 2 },
        { x: "Mar 2024", y: 1 },
        { x: "Apr 2024", y: 0 },
        { x: "May 2024", y: 1 }
      ]
    },
    {
      id: "Fatigue",
      data: [
        { x: "Jan 2024", y: 2 },
        { x: "Feb 2024", y: 3 },
        { x: "Mar 2024", y: 2 },
        { x: "Apr 2024", y: 2 },
        { x: "May 2024", y: 3 }
      ]
    },
    {
      id: "Pain",
      data: [
        { x: "Jan 2024", y: 1 },
        { x: "Feb 2024", y: 2 },
        { x: "Mar 2024", y: 3 },
        { x: "Apr 2024", y: 2 },
        { x: "May 2024", y: 1 }
      ]
    }
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">
          Symptom Timeline
        </CardTitle>
        <ChartExportWidget
          chartId={chartId}
          chartTitle="Symptom Timeline"
          data={getExportData()}
        />
      </CardHeader>
      <CardContent>
        <div id={chartId} className="h-[300px]">
          <ResponsiveHeatMap
            data={chartData}
            margin={{ top: 20, right: 90, bottom: 60, left: 90 }}
            valueFormat=">-.1f"
            axisTop={null}
            axisRight={{
              tickSize: 5,
              tickPadding: 40,
              tickRotation: 0,
              legend: '',
              legendPosition: 'middle',
              legendOffset: 70
            }}
            axisBottom={{
              tickSize: 5,
              tickPadding: 40,
              tickRotation: -45,
              legend: 'Month',
              legendPosition: 'middle',
              legendOffset: 45
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 40,
              tickRotation: 0,
              legend: 'Symptom',
              legendPosition: 'middle',
              legendOffset: -72
            }}
            colors={{
              type: 'sequential',
              scheme: 'blues'
            }}
            emptyColor="#f5f5f5"
            borderColor="#ffffff"
            borderWidth={1}
            animate={true}
            motionStiffness={90}
            motionDamping={15}
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
                title: 'Intensity',
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
          <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: '60vw', maxHeight: '120vh', width: '60vw', height: '120vh' }}>
            <DialogHeader className="pb-0 mb-0">
              <DialogTitle className="text-lg mb-0 pb-0">Symptom Timeline - Patient {patientId}</DialogTitle>
            </DialogHeader>
            <div className="h-[calc(120vh-60px)] mt-0 pt-0 w-full landscape-chart-container">
              <ChartExportWidget
                chartId={`${chartId}-expanded`}
                chartTitle="Symptom Timeline (Expanded)"
                data={getExportData()}
                iconSize={20}
                className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
              />
              <ResponsiveHeatMap
                data={chartData}
                margin={{ top: 30, right: 120, bottom: 80, left: 120 }}
                valueFormat=">-.1f"
                axisTop={null}
                axisRight={{
                  tickSize: 5,
                  tickPadding: 40,
                  tickRotation: 0,
                  legend: '',
                  legendPosition: 'middle',
                  legendOffset: 70
                }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 40,
                  tickRotation: -45,
                  legend: 'Month',
                  legendPosition: 'middle',
                  legendOffset: 60
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 40,
                  tickRotation: 0,
                  legend: 'Symptom',
                  legendPosition: 'middle',
                  legendOffset: -85
                }}
                colors={{
                  type: 'sequential',
                  scheme: 'blues'
                }}
                emptyColor="#f5f5f5"
                borderColor="#ffffff"
                borderWidth={1}
                animate={true}
                motionStiffness={90}
                motionDamping={15}
                hoverTarget="cell"
                cellHoverOthersOpacity={0.25}
                enableLabels={false}
                legends={[
                  {
                    anchor: 'right',
                    translateX: 80,
                    translateY: 0,
                    length: 140,
                    thickness: 16,
                    direction: 'column',
                    tickPosition: 'after',
                    tickSize: 5,
                    tickSpacing: 4,
                    tickOverlap: false,
                    tickFormat: '>-.1f',
                    title: 'Intensity',
                    titleAlign: 'start',
                    titleOffset: 4
                  }
                ]}
                // Adjust the fit to ensure all data is visible
                fit={true}
                // Add more room for labels
                cellPadding={2}
                // Enhance the labels for better readability
                theme={{
                  axis: {
                    ticks: {
                      text: {
                        fontSize: 12,
                        fontWeight: 500
                      }
                    },
                    legend: {
                      text: {
                        fontSize: 14,
                        fontWeight: 600
                      }
                    }
                  },
                  legends: {
                    text: {
                      fontSize: 12,
                      fontWeight: 500
                    }
                  }
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}