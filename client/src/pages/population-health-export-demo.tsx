// Population Health Export Demo Page - May 23, 2025
// This page demonstrates the enhanced export widget integrated with the population health charts

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaintBucket, AlertCircle, Percent, Hash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useChartTheme } from "@/context/ChartThemeContext";
import { ResponsiveBar } from '@nivo/bar';
import EnhancedExportWidget from "@/components/enhanced-export-widget";

const sampleData = [
  { id: "Housing instability", value: 312, percentage: 24 },
  { id: "Food insecurity", value: 267, percentage: 21 },
  { id: "Transportation barriers", value: 241, percentage: 19 },
  { id: "Financial strain", value: 182, percentage: 14 },
  { id: "Utility needs", value: 156, percentage: 12 }
];

export default function PopulationHealthExportDemo() {
  const [displayMode, setDisplayMode] = useState<"count" | "percentage">("count");
  const { toast } = useToast();
  const { colorSettings, getColorForIndex } = useChartTheme();
  
  // Generate chart colors based on the current theme
  const getChartColors = () => {
    // If we have a custom palette, return the colors directly
    if ('isCustomPalette' in colorSettings && colorSettings.isCustomPalette) {
      return colorSettings.colors;
    }
    
    // Otherwise, generate a series of 10 colors using the getColorForIndex function
    return Array.from({ length: 10 }, (_, i) => getColorForIndex(i));
  };

  const handleDisplayModeChange = (mode: "count" | "percentage") => {
    setDisplayMode(mode);
    toast({
      title: `Switched to ${mode === "count" ? "Count" : "Percentage"} view`,
      description: `Chart now displays ${mode === "count" ? "absolute counts" : "percentage values"}`,
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Population Health Charts with Enhanced Export</h1>
        <div className="flex gap-2">
          <Button 
            variant={displayMode === "count" ? "default" : "outline"}
            size="sm"
            onClick={() => handleDisplayModeChange("count")}
            className="flex items-center gap-1"
          >
            <Hash className="h-4 w-4" />
            Count
          </Button>
          <Button 
            variant={displayMode === "percentage" ? "default" : "outline"}
            size="sm"
            onClick={() => handleDisplayModeChange("percentage")}
            className="flex items-center gap-1"
          >
            <Percent className="h-4 w-4" />
            Percentage
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: HRSN Indicators */}
        <Card className="relative overflow-hidden">
          <CardHeader className="p-4">
            <CardTitle className="text-lg">HRSN Indicators</CardTitle>
            <CardDescription>Major social determinants of health</CardDescription>
          </CardHeader>
          <CardContent className="p-4 h-[350px]">
            <ResponsiveBar
              data={sampleData.map(item => ({
                ...item,
                value: displayMode === "percentage" ? item.percentage : item.value
              }))}
              keys={['value']}
              indexBy="id"
              margin={{ top: 20, right: 20, bottom: 80, left: 70 }}
              padding={0.3}
              colors={getChartColors()}
              colorBy="indexValue"
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -30,
                legend: 'HRSN Category',
                legendPosition: 'middle',
                legendOffset: 60
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: displayMode === "percentage" ? 'Percentage (%)' : 'Count',
                legendPosition: 'middle',
                legendOffset: -50
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor="#000000"
              labelStyle={{
                fontWeight: 'bold',
                fontSize: 12
              }}
              animate={true}
              motionStiffness={90}
              motionDamping={15}
            />
            
            {/* Enhanced Export Widget with 5 buttons */}
            <EnhancedExportWidget 
              chartId="hrsn-indicators" 
              chartTitle="HRSN Indicators" 
              data={sampleData} 
              position="top-right"
            />
          </CardContent>
        </Card>

        {/* Chart 2: Symptom Segments */}
        <Card className="relative overflow-hidden">
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Symptom Segments</CardTitle>
            <CardDescription>Distribution across symptom categories</CardDescription>
          </CardHeader>
          <CardContent className="p-4 h-[350px]">
            <ResponsiveBar
              data={[
                { id: "Chronic pain", value: displayMode === "percentage" ? 28 : 356, percentage: 28 },
                { id: "Anxiety", value: displayMode === "percentage" ? 24 : 298, percentage: 24 },
                { id: "Depression", value: displayMode === "percentage" ? 19 : 243, percentage: 19 },
                { id: "Substance use", value: displayMode === "percentage" ? 15 : 189, percentage: 15 },
                { id: "Sleep disorder", value: displayMode === "percentage" ? 14 : 176, percentage: 14 }
              ]}
              keys={['value']}
              indexBy="id"
              margin={{ top: 20, right: 20, bottom: 80, left: 70 }}
              padding={0.3}
              colors={getChartColors()}
              colorBy="indexValue"
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -30,
                legend: 'Symptom Category',
                legendPosition: 'middle',
                legendOffset: 60
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: displayMode === "percentage" ? 'Percentage (%)' : 'Count',
                legendPosition: 'middle',
                legendOffset: -50
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor="#000000"
              labelStyle={{
                fontWeight: 'bold',
                fontSize: 12
              }}
              animate={true}
              motionStiffness={90}
              motionDamping={15}
            />
            
            {/* Enhanced Export Widget with 5 buttons */}
            <EnhancedExportWidget 
              chartId="symptom-segments" 
              chartTitle="Symptom Segments" 
              data={[
                { id: "Chronic pain", value: 356, percentage: 28 },
                { id: "Anxiety", value: 298, percentage: 24 },
                { id: "Depression", value: 243, percentage: 19 },
                { id: "Substance use", value: 189, percentage: 15 },
                { id: "Sleep disorder", value: 176, percentage: 14 }
              ]} 
              position="top-right"
            />
          </CardContent>
        </Card>

        {/* Chart 3: Diagnostic Categories */}
        <Card className="relative overflow-hidden">
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Diagnostic Categories</CardTitle>
            <CardDescription>Distribution across diagnostic groups</CardDescription>
          </CardHeader>
          <CardContent className="p-4 h-[350px]">
            <ResponsiveBar
              data={[
                { id: "Mental health", value: displayMode === "percentage" ? 32 : 412, percentage: 32 },
                { id: "Cardiovascular", value: displayMode === "percentage" ? 18 : 234, percentage: 18 },
                { id: "Musculoskeletal", value: displayMode === "percentage" ? 16 : 210, percentage: 16 },
                { id: "Endocrine", value: displayMode === "percentage" ? 14 : 179, percentage: 14 },
                { id: "Respiratory", value: displayMode === "percentage" ? 12 : 154, percentage: 12 },
                { id: "Other", value: displayMode === "percentage" ? 8 : 102, percentage: 8 }
              ]}
              keys={['value']}
              indexBy="id"
              margin={{ top: 20, right: 20, bottom: 80, left: 70 }}
              padding={0.3}
              colors={getChartColors()}
              colorBy="indexValue"
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -30,
                legend: 'Diagnostic Category',
                legendPosition: 'middle',
                legendOffset: 60
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: displayMode === "percentage" ? 'Percentage (%)' : 'Count',
                legendPosition: 'middle',
                legendOffset: -50
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor="#000000"
              labelStyle={{
                fontWeight: 'bold',
                fontSize: 12
              }}
              animate={true}
              motionStiffness={90}
              motionDamping={15}
            />
            
            {/* Enhanced Export Widget with 5 buttons */}
            <EnhancedExportWidget 
              chartId="diagnostic-categories" 
              chartTitle="Diagnostic Categories" 
              data={[
                { id: "Mental health", value: 412, percentage: 32 },
                { id: "Cardiovascular", value: 234, percentage: 18 },
                { id: "Musculoskeletal", value: 210, percentage: 16 },
                { id: "Endocrine", value: 179, percentage: 14 },
                { id: "Respiratory", value: 154, percentage: 12 },
                { id: "Other", value: 102, percentage: 8 }
              ]} 
              position="top-right"
            />
          </CardContent>
        </Card>
        
        {/* Chart 4: Risk Stratification */}
        <Card className="relative overflow-hidden">
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Risk Stratification</CardTitle>
            <CardDescription>Patient distribution by risk level</CardDescription>
          </CardHeader>
          <CardContent className="p-4 h-[350px]">
            <ResponsiveBar
              data={[
                { id: "High risk", value: displayMode === "percentage" ? 32 : 76, percentage: 32 },
                { id: "Medium risk", value: displayMode === "percentage" ? 46 : 112, percentage: 46 },
                { id: "Low risk", value: displayMode === "percentage" ? 22 : 54, percentage: 22 }
              ]}
              keys={['value']}
              indexBy="id"
              margin={{ top: 20, right: 20, bottom: 80, left: 70 }}
              padding={0.3}
              colors={getChartColors()}
              colorBy="indexValue"
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -30,
                legend: 'Risk Level',
                legendPosition: 'middle',
                legendOffset: 60
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: displayMode === "percentage" ? 'Percentage (%)' : 'Count',
                legendPosition: 'middle',
                legendOffset: -50
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor="#000000"
              labelStyle={{
                fontWeight: 'bold',
                fontSize: 12
              }}
              animate={true}
              motionStiffness={90}
              motionDamping={15}
            />
            
            {/* Enhanced Export Widget with 5 buttons */}
            <EnhancedExportWidget 
              chartId="risk-stratification" 
              chartTitle="Risk Stratification" 
              data={[
                { id: "High risk", value: 76, percentage: 32 },
                { id: "Medium risk", value: 112, percentage: 46 },
                { id: "Low risk", value: 54, percentage: 22 }
              ]} 
              position="top-right"
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Instructions Panel */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Enhanced Export Widget Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold">Key Features:</h3>
              <ul className="list-disc pl-6 mt-2">
                <li>High visibility blue export buttons positioned at the top-right of each chart</li>
                <li>Colorful, distinct buttons for different export formats (CSV, Excel, JSON, etc.)</li>
                <li>All 5 export options are clearly visible with intuitive icons</li>
                <li>Buttons have bold text and contrasting colors for excellent readability</li>
                <li>Export functionality works for both count and percentage display modes</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold">Technical Implementation:</h3>
              <ul className="list-disc pl-6 mt-2">
                <li>Widget is positioned absolutely within a relatively positioned chart container</li>
                <li>Each export button triggers the appropriate download function with proper file naming</li>
                <li>Visual feedback during the export process with loading indicator</li>
                <li>Toast notifications provide confirmation of successful exports</li>
                <li>Consistent positioning across all charts for better user experience</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}