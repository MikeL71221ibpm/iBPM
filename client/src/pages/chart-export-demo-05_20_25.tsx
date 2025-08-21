import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import NavigationButton from '@/components/NavigationButton';
import HrsnPieChartV31 from '@/components/hrsn-pie-chart-v3-1-05_20_25';

// Sample data that doesn't require database connection
const sampleHrsnData = [
  { id: "Food Insecurity", value: 28, percentage: 28 },
  { id: "Housing Instability", value: 32, percentage: 32 },
  { id: "Transportation Needs", value: 18, percentage: 18 },
  { id: "Utility Needs", value: 12, percentage: 12 },
  { id: "Financial Strain", value: 10, percentage: 10 }
];

const sampleDemographicData = [
  { id: "18-24", value: 15, percentage: 15 },
  { id: "25-34", value: 28, percentage: 28 },
  { id: "35-44", value: 22, percentage: 22 },
  { id: "45-54", value: 18, percentage: 18 },
  { id: "55-64", value: 12, percentage: 12 },
  { id: "65+", value: 5, percentage: 5 }
];

const sampleDiagnosisData = [
  { id: "Anxiety", value: 35, percentage: 35 },
  { id: "Depression", value: 30, percentage: 30 },
  { id: "ADHD", value: 15, percentage: 15 },
  { id: "Bipolar Disorder", value: 12, percentage: 12 },
  { id: "Other", value: 8, percentage: 8 }
];

export default function ChartExportDemo() {
  // Display mode state (count or percentage)
  const [displayMode, setDisplayMode] = useState<"count" | "percentage">("count");
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <header className="flex justify-between items-start flex-col sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold mb-1">Chart Export Demonstration (v3.1)</h1>
          <p className="text-sm text-muted-foreground">
            Enhanced v3.0 charts with export functionality
          </p>
        </div>
        
        <div className="flex mt-4 sm:mt-0 space-x-2">
          <NavigationButton 
            href="/" 
            variant="outline"
            size="sm"
            icon={ArrowLeft}
            className="flex items-center gap-1"
          >
            Return to Home
          </NavigationButton>
          
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1"
            onClick={() => setDisplayMode(displayMode === "count" ? "percentage" : "count")}
          >
            View: {displayMode === "count" ? "Count" : "Percentage"}
          </Button>
        </div>
      </header>
      
      <Card className="mt-6 mb-4">
        <CardHeader>
          <CardTitle className="text-lg">
            Enhanced Chart Features in v3.1
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <ul className="list-disc pl-6 space-y-2">
            <li>Comprehensive export options (CSV, Excel, JSON, PDF)</li>
            <li>Print functionality with data table inclusion</li>
            <li>Expanded view with data table for detailed analysis</li>
            <li>Toggle between count and percentage views</li>
            <li>Enhanced visualization with consistent styling</li>
          </ul>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="h-[400px]">
          <HrsnPieChartV31
            data={sampleHrsnData}
            title="HRSN Indicators"
            fieldName="id"
            colorScheme="set2"
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
          />
        </div>
        
        <div className="h-[400px]">
          <HrsnPieChartV31
            data={sampleDemographicData}
            title="Age Distribution"
            fieldName="id"
            colorScheme="paired"
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
          />
        </div>
        
        <div className="h-[400px]">
          <HrsnPieChartV31
            data={sampleDiagnosisData}
            title="Diagnosis Distribution"
            fieldName="id"
            colorScheme="accent"
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
          />
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">How to Use the Export Features</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="mb-4">Each chart has two main controls for export and expanded viewing:</p>
          
          <ol className="list-decimal pl-6 space-y-2">
            <li><strong>Maximize Button</strong> - Opens an expanded view with full data table and all export options</li>
            <li><strong>Download Button</strong> - Quick access to export options (CSV, Excel, JSON, PDF, Print)</li>
          </ol>
          
          <p className="mt-4 text-muted-foreground">
            These enhanced export features have been applied to the original v3.0 chart representations with no changes
            to their visual appearance or core functionality.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}