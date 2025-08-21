// Patient Visualization - May 21, 2025
// Standardized component with export functionality

import React, { useState, useEffect } from "react";
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Maximize } from "lucide-react";
import { ChartExportSection } from "@/components/chart-export-section";
import { useTheme } from "@/hooks/use-theme";

interface PatientVisualizationParams {
  patientId?: string;
}

interface ScatterDataPoint {
  x: string;
  y: string; 
  size: number; // Total value (intensity)
  frequency: number; // How many sessions this item appears in
  color?: string; // Optional: Row color - matches Y-axis label bullet color
  intensityCategory?: string; // Optional: Category for coloring ("highest", "high", etc.)
  intensityIndex?: number; // Optional: Index for colorBy scheme (0=highest, etc.)
  rowId?: string; // Optional: Internal use for processing - not used in final data
}

interface ScatterGroupData {
  id: string;
  data: ScatterDataPoint[];
}

interface PatientVisualizationProps {
  data?: any[];
  title?: string;
  subtitle?: string;
  height?: number;
  colorScheme?: string;
  patientId?: string;
  // Chart export functions
  downloadChartAsCSV?: (chartTitle: string, data: any[], isPatientDetailExport?: boolean) => void;
  downloadChartAsExcel?: (chartTitle: string, data: any[]) => void;
  downloadChartAsJson?: (chartTitle: string, data: any[]) => void;
  printChart?: (chartTitle: string, isDialogChart?: boolean) => void;
  getFullDataset?: (chartType: string, includeAllData?: boolean, isPatientDetailExport?: boolean) => any[];
}

export default function PatientVisualization({
  data = [],
  title = "Patient Symptom Visualization",
  subtitle = "Symptom tracking over time",
  height = 500,
  colorScheme = "blues",
  patientId,
  downloadChartAsCSV,
  downloadChartAsExcel,
  downloadChartAsJson,
  printChart,
  getFullDataset
}: PatientVisualizationProps) {
  // State for dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { theme } = useTheme();
  
  // Format data for visualization
  const [processedData, setProcessedData] = useState<ScatterGroupData[]>([]);
  const [maxBubbleSize, setMaxBubbleSize] = useState<number>(20);

  useEffect(() => {
    if (data && data.length) {
      // Process data for the scatter plot
      const formattedData = formatDataForScatterPlot(data);
      setProcessedData(formattedData);
      
      // Calculate max bubble size for proper scaling
      let maxValue = 0;
      formattedData.forEach(group => {
        group.data.forEach(point => {
          if (point.size > maxValue) maxValue = point.size;
        });
      });
      setMaxBubbleSize(Math.max(20, maxValue));
    }
  }, [data]);

  // Function to format data for scatter plot
  const formatDataForScatterPlot = (rawData: any[]): ScatterGroupData[] => {
    // This is a placeholder implementation
    // In a real application, you would transform your data into the required format
    
    if (!rawData || !rawData.length) return [];
    
    // Group the data by category for scatter plot
    const groupedData: Record<string, ScatterDataPoint[]> = {};
    
    // Process each data point
    rawData.forEach(item => {
      const category = item.category || 'Default';
      const xValue = item.date || 'Unknown';
      const yValue = item.symptom || 'Unknown';
      const intensity = item.intensity || 1;
      const frequency = item.frequency || 1;
      
      if (!groupedData[category]) {
        groupedData[category] = [];
      }
      
      groupedData[category].push({
        x: xValue,
        y: yValue,
        size: intensity,
        frequency: frequency,
        color: item.color
      });
    });
    
    // Convert to array format for Nivo
    return Object.keys(groupedData).map(key => ({
      id: key,
      data: groupedData[key]
    }));
  };

  // Function to get chart theme
  const getTheme = () => {
    return {
      textColor: theme === 'dark' ? '#e0e0e0' : '#333333',
      grid: {
        line: {
          stroke: theme === 'dark' ? '#555555' : '#dddddd'
        }
      },
      tooltip: {
        container: {
          background: theme === 'dark' ? '#333333' : '#ffffff',
          color: theme === 'dark' ? '#ffffff' : '#333333',
          boxShadow: '0 2px 10px rgba(0,0,0,0.25)'
        }
      }
    };
  };

  // Render no data placeholder if no data available
  const NoDataDisplay = () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center text-muted-foreground">
        <p>No patient visualization data available</p>
        {patientId && <p className="text-sm mt-1">Patient ID: {patientId}</p>}
      </div>
    </div>
  );

  // Get colors based on category
  const getCategoryColors = (category: string) => {
    const categoryColors: Record<string, string> = {
      'Physical': '#3498db',   // Blue
      'Cognitive': '#e74c3c',  // Red
      'Emotional': '#2ecc71',  // Green
      'Social': '#f39c12',     // Orange
      'Default': '#9b59b6'     // Purple
    };
    
    return categoryColors[category] || categoryColors['Default'];
  };

  return (
    <Card className="shadow-sm chart-container h-full" data-chart-id="Patient Visualization">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-semibold chart-title">
              {title}
            </CardTitle>
            <CardDescription>
              {subtitle} {patientId && `(Patient ID: ${patientId})`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 pb-2">
        <div style={{ height }} className="mt-0 pt-0">
          {processedData.length > 0 ? (
            <ResponsiveScatterPlot
              data={processedData}
              margin={{ top: 60, right: 140, bottom: 70, left: 90 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'point' }}
              blendMode="multiply"
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 40,
                tickRotation: -45,
                legend: 'Date',
                legendPosition: 'middle',
                legendOffset: 46
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 40,
                tickRotation: 0,
                legend: 'Symptom',
                legendPosition: 'middle',
                legendOffset: -60
              }}
              nodeSize={(d) => (d.size / maxBubbleSize) * 20 + 5}
              colors={(node) => node.data.color || getCategoryColors(node.serieId)}
              tooltip={({ node }) => (
                <div
                  style={{
                    background: 'white',
                    padding: '9px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <div><strong>{node.data.y}</strong></div>
                  <div>Date: <strong>{node.data.x}</strong></div>
                  <div>Intensity: <strong>{node.data.size}</strong></div>
                  <div>Frequency: <strong>{node.data.frequency || 1}</strong></div>
                  <div>Category: <strong>{node.serieId}</strong></div>
                </div>
              )}
              theme={getTheme()}
              legends={[
                {
                  anchor: 'right',
                  direction: 'column',
                  justify: false,
                  translateX: 130,
                  translateY: 0,
                  itemWidth: 100,
                  itemHeight: 12,
                  itemsSpacing: 5,
                  itemDirection: 'left-to-right',
                  symbolSize: 12,
                  symbolShape: 'circle',
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
            />
          ) : (
            <NoDataDisplay />
          )}
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
                {subtitle} {patientId && `(Patient ID: ${patientId})`}
              </DialogDescription>
            </DialogHeader>
            
            <div className="w-full h-[600px] mt-4">
              {processedData.length > 0 ? (
                <ResponsiveScatterPlot
                  data={processedData}
                  margin={{ top: 60, right: 140, bottom: 80, left: 100 }}
                  xScale={{ type: 'point' }}
                  yScale={{ type: 'point' }}
                  blendMode="multiply"
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 40,
                    tickRotation: -45,
                    legend: 'Date',
                    legendPosition: 'middle',
                    legendOffset: 60
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 40,
                    tickRotation: 0,
                    legend: 'Symptom',
                    legendPosition: 'middle',
                    legendOffset: -70
                  }}
                  nodeSize={(d) => (d.size / maxBubbleSize) * 20 + 5}
                  colors={(node) => node.data.color || getCategoryColors(node.serieId)}
                  theme={getTheme()}
                  legends={[
                    {
                      anchor: 'right',
                      direction: 'column',
                      justify: false,
                      translateX: 130,
                      translateY: 0,
                      itemWidth: 100,
                      itemHeight: 12,
                      itemsSpacing: 5,
                      itemDirection: 'left-to-right',
                      symbolSize: 12,
                      symbolShape: 'circle',
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
                />
              ) : (
                <NoDataDisplay />
              )}
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