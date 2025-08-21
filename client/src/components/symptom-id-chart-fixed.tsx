import React, { useState } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Maximize } from "lucide-react";
import { ChartExportSection } from "@/components/chart-export-section";

interface SymptomIDChartProps {
  data: any;
  displayMode: 'count' | 'percentage';
  getSymptomIDData: () => any[];
  getChartColors: () => string[];
  // Chart export functions
  downloadChartAsCSV?: (chartTitle: string, data: any[], isPatientDetailExport?: boolean) => void;
  downloadChartAsExcel?: (chartTitle: string, data: any[]) => void;
  downloadChartAsJson?: (chartTitle: string, data: any[]) => void;
  printChart?: (chartTitle: string, isDialogChart?: boolean) => void;
  getFullDataset?: (chartType: string, includeAllData?: boolean, isPatientDetailExport?: boolean) => any[];
}

/**
 * Fixed version of the Symptom ID chart with proper percentage calculation
 */
export default function SymptomIDChartFixed({ 
  data, 
  displayMode, 
  getSymptomIDData, 
  getChartColors,
  downloadChartAsCSV,
  downloadChartAsExcel,
  downloadChartAsJson,
  printChart,
  getFullDataset
}: SymptomIDChartProps) {
  // State for dialog management
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Get the raw data
  const rawData = getSymptomIDData();
  
  // Calculate percentage based on total patients
  const totalPatients = data?.patients?.length || 24;
  
  // Get chart total for proper scaling in percentage mode
  const chartTotal = rawData.reduce((sum, item) => sum + (item.value || 0), 0);
  
  // Map the data with correct percentages
  const chartData = rawData.map(item => {
    // Use the correct value for calculations
    const itemValue = item.value || 0;
    
    // Calculate percentage based on chart total for proper proportions
    const itemPercentage = chartTotal > 0 
      ? Math.round((itemValue / chartTotal) * 100) 
      : 0;
    
    return {
      id: item.id,
      // Use percentage in percentage mode
      value: displayMode === "percentage" ? itemPercentage : itemValue,
      // Keep original value for reference
      originalValue: itemValue,
      // For label display
      displayValue: displayMode === "percentage" 
        ? `${itemPercentage}%` 
        : `${itemValue}`
    };
  });
  
  // Chart title
  const chartTitle = "Symptom ID Distribution";

  const barChart = (
    <ResponsiveBar
      data={chartData}
      keys={['value']}
      indexBy="id"
      margin={{ top: 60, right: 30, bottom: 70, left: 80 }}
      padding={0.3}
      layout="vertical"
      colors={getChartColors()}
      colorBy="indexValue"
      valueScale={{ type: 'linear' }}
      indexScale={{ type: 'band', round: true }}
      borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
      maxValue={displayMode === "percentage" ? 100 : undefined}
      axisBottom={{
        tickSize: 5,
        tickPadding: 10,
        tickRotation: -45,
        legendPosition: 'middle',
        legendOffset: 50,
        truncateTickAt: 0
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: displayMode === "percentage" ? 'Percentage (%)' : 'Count',
        legendPosition: 'middle',
        legendOffset: -50
      }}
      enableGridY={true}
      labelSkipWidth={12}
      labelSkipHeight={12}
      enableLabel={true}
      label={d => d.data.displayValue}
      labelTextColor={"#000000"}
      labelOffset={-3}
      theme={{
        labels: {
          text: {
            fontSize: 11,
            fontWeight: 700,
            textAnchor: 'middle',
            dominantBaseline: 'auto'
          }
        }
      }}
      animate={true}
      motionConfig="gentle"
    />
  );

  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle>{chartTitle}</CardTitle>
        <CardDescription>
          Distribution of symptom IDs {displayMode === "percentage" ? "(percentages)" : "(counts)"}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="min-h-[350px]">
        {barChart}
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
              <DialogTitle>{chartTitle}</DialogTitle>
              <DialogDescription>
                Distribution of symptom IDs {displayMode === "percentage" ? "(percentages)" : "(counts)"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="w-full h-[500px] mt-2">
              {barChart}
            </div>
            
            {/* Standardized Export Section */}
            {downloadChartAsCSV && downloadChartAsExcel && downloadChartAsJson && printChart && getFullDataset && (
              <ChartExportSection 
                chartName={chartTitle}
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