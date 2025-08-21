// Simple Export Widget Demo - May 23, 2025
// This is a simplified demo showing just the enhanced export widget

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Percent, Hash } from "lucide-react";
import EnhancedExportWidget from "@/components/enhanced-export-widget";

const sampleData = [
  { id: "Housing instability", value: 312, percentage: 24 },
  { id: "Food insecurity", value: 267, percentage: 21 },
  { id: "Transportation barriers", value: 241, percentage: 19 },
  { id: "Financial strain", value: 182, percentage: 14 },
  { id: "Utility needs", value: 156, percentage: 12 }
];

export default function ExportWidgetDemo() {
  const [displayMode, setDisplayMode] = useState<"count" | "percentage">("count");
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">High-Visibility Export Widget Demo</h1>
        <div className="flex gap-2">
          <Button 
            variant={displayMode === "count" ? "default" : "outline"}
            size="sm"
            onClick={() => setDisplayMode("count")}
            className="flex items-center gap-1"
          >
            <Hash className="h-4 w-4" />
            Count
          </Button>
          <Button 
            variant={displayMode === "percentage" ? "default" : "outline"}
            size="sm"
            onClick={() => setDisplayMode("percentage")}
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
          <CardContent className="p-4 h-[350px] relative">
            <div className="absolute inset-0 flex items-center justify-center text-lg text-muted-foreground">
              Chart Content Placeholder
            </div>
            
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
          <CardContent className="p-4 h-[350px] relative">
            <div className="absolute inset-0 flex items-center justify-center text-lg text-muted-foreground">
              Chart Content Placeholder
            </div>
            
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
              <pre className="p-4 bg-muted rounded-md text-xs overflow-auto mt-2">
{`// Example implementation for Population Health Charts
<EnhancedExportWidget 
  chartId="diagnostic-categories" 
  chartTitle="Diagnostic Categories" 
  data={chartData} 
  position="top-right"
/>`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}