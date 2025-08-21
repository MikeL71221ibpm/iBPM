// Expanded Export Buttons Demo - May 23, 2025
// Showcasing all 5 export buttons in the expanded chart view

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResponsiveBar } from "@nivo/bar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ChartExportButtons from "@/components/chart-export-buttons";
import { Maximize2, Minimize2 } from "lucide-react";

// Sample data for the chart
const sampleData = [
  { id: "Housing instability", value: 312, percentage: 24 },
  { id: "Food insecurity", value: 267, percentage: 21 },
  { id: "Transportation barriers", value: 241, percentage: 19 },
  { id: "Financial strain", value: 182, percentage: 14 },
  { id: "Utility needs", value: 156, percentage: 12 },
  { id: "Technology access", value: 129, percentage: 10 }
];

// Detailed data for CSV Detail export
const detailedData = [
  { id: "Housing instability", value: 312, percentage: 24, uniquePatients: 124, sessions: 312, averageIntensity: 8.2 },
  { id: "Food insecurity", value: 267, percentage: 21, uniquePatients: 94, sessions: 267, averageIntensity: 7.9 },
  { id: "Transportation barriers", value: 241, percentage: 19, uniquePatients: 108, sessions: 241, averageIntensity: 6.4 },
  { id: "Financial strain", value: 182, percentage: 14, uniquePatients: 79, sessions: 182, averageIntensity: 8.9 },
  { id: "Utility needs", value: 156, percentage: 12, uniquePatients: 68, sessions: 156, averageIntensity: 7.1 },
  { id: "Technology access", value: 129, percentage: 10, uniquePatients: 57, sessions: 129, averageIntensity: 5.6 }
];

interface ChartCardProps {
  title: string;
  chartId: string;
  data: any[];
}

const ChartCard = ({ title, chartId, data }: ChartCardProps) => {
  const [expanded, setExpanded] = useState(false);
  
  // Function to get detailed data for CSV Detail export
  const getDetailedData = () => {
    return detailedData;
  };
  
  // Function to handle print
  const handlePrint = () => {
    window.print();
  };
  
  return (
    <>
      <Card className="h-[350px] relative">
        <CardHeader className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="text-xs">HRSN Indicators Distribution</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setExpanded(true)}
              className="p-1 h-8 w-8"
            >
              <Maximize2 className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 h-[270px]">
          <ResponsiveBar
            data={data}
            keys={["value"]}
            indexBy="id"
            margin={{ top: 10, right: 10, bottom: 50, left: 60 }}
            padding={0.3}
            colors={["#4f46e5"]}
            colorBy="indexValue"
            borderRadius={4}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -30,
              legend: '',
              legendPosition: 'middle',
              legendOffset: 32
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Count',
              legendPosition: 'middle',
              legendOffset: -40
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor="#ffffff"
            motionConfig="gentle"
            motionDamping={15}
          />
        </CardContent>
      </Card>
      
      {/* Expanded view dialog */}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="mb-2">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setExpanded(false)}
                className="p-1 h-8 w-8"
              >
                <Minimize2 className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>
          
          {/* Export buttons in expanded view */}
          <ChartExportButtons 
            data={data} 
            chartTitle={title}
            onPrint={handlePrint}
            getDetailedData={getDetailedData}
          />
          
          <div className="h-[500px]">
            <ResponsiveBar
              data={data}
              keys={["value"]}
              indexBy="id"
              margin={{ top: 10, right: 20, bottom: 70, left: 80 }}
              padding={0.3}
              colors={["#4f46e5"]}
              colorBy="indexValue"
              borderRadius={4}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -30,
                legend: '',
                legendPosition: 'middle',
                legendOffset: 32
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
              labelTextColor="#ffffff"
              motionConfig="gentle"
              motionDamping={15}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function ExpandedExportDemo() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Export Buttons in Expanded Chart View</h1>
      <p className="text-lg mb-8">
        This demo shows how the export buttons appear in the expanded chart view.
        Click the maximize icon in the top-right of a chart to see the expanded view with all 5 export options.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="HRSN Indicators" chartId="hrsn-indicators" data={sampleData} />
        <ChartCard title="Symptom Segments" chartId="symptom-segments" data={sampleData} />
      </div>
      
      <div className="mt-8 p-6 bg-gray-50 rounded-lg border">
        <h2 className="text-xl font-bold mb-4">Implementation Details</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><span className="font-semibold">Export Options:</span> All 5 export buttons (CSV, CSV Detail, Excel, JSON, Print) are shown in the expanded chart view</li>
          <li><span className="font-semibold">Color Coding:</span> Each button has a distinct color for easy recognition</li>
          <li><span className="font-semibold">Icons and Labels:</span> Each button includes both an icon and text label for clarity</li>
          <li><span className="font-semibold">CSV Detail Button:</span> The green CSV Detail button is conditionally displayed when detailed data is available</li>
          <li><span className="font-semibold">Consistent Placement:</span> Export buttons are consistently positioned at the top of the expanded view</li>
        </ul>
      </div>
    </div>
  );
}