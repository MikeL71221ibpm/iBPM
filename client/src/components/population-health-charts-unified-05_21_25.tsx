// Population Health Charts Unified - May 21, 2025
// This component combines all 4 standardized charts with consistent export functionality

import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Percent, BarChart } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

import DiagnosticCategoryChart from './diagnostic-category-chart-05_21_25';
import SymptomSegmentChart from './symptom-segment-chart-05_21_25';
import SymptomIdChart from './symptom-id-chart-05_21_25';
import HrsnIndicatorsChart from './hrsn-indicators-chart-05_21_25';
import ChartExportWidget from './chart-export-widget';

interface PopulationHealthChartsUnifiedProps {
  data?: any;
  isLoading?: boolean;
  displayMode?: 'count' | 'percentage';
  onDisplayModeChange?: (mode: 'count' | 'percentage') => void;
  colorTheme?: string;
}

export default function PopulationHealthChartsUnified({ 
  data, 
  isLoading = false,
  displayMode = 'count',
  onDisplayModeChange,
  colorTheme = 'spectral'
}: PopulationHealthChartsUnifiedProps) {
  const [activeTab, setActiveTab] = useState('diagnostic-category');
  
  // Store previous display mode to detect changes
  const prevDisplayModeRef = React.useRef(displayMode);
  
  // Log when display mode changes from parent
  React.useEffect(() => {
    if (prevDisplayModeRef.current !== displayMode) {
      console.log('PopulationHealthChartsUnified: Display mode changed from parent to:', displayMode);
      prevDisplayModeRef.current = displayMode;
    }
  }, [displayMode]);
  
  // Handle display mode toggle - simplified for reliability
  const handleDisplayModeChange = (newMode: 'count' | 'percentage') => {
    if (onDisplayModeChange && newMode !== displayMode) {
      console.log('PopulationHealthChartsUnified: Setting display mode to:', newMode);
      onDisplayModeChange(newMode);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full mb-6">
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center">
          <div className="text-center">
            <Skeleton className="h-[300px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Population Health Charts</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <BarChart className="mx-auto h-16 w-16 mb-4 opacity-30" />
            <p>No visualization data available.</p>
            <p className="text-sm">Please check your data source or try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Population Health Overview</CardTitle>
          <CardDescription>
            View population health data by various categories
          </CardDescription>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm mr-2">Display:</span>
            <div className="flex rounded-md overflow-hidden">
              <button
                className={`px-3 py-1 text-sm ${displayMode === 'count' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
                onClick={() => handleDisplayModeChange('count')}
              >
                Count
              </button>
              <button
                className={`px-3 py-1 text-sm ${displayMode === 'percentage' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
                onClick={() => handleDisplayModeChange('percentage')}
              >
                <Percent className="h-3 w-3 inline mr-1" />
                Percentage
              </button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <Tabs defaultValue="diagnostic-category" value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="diagnostic-category">Diagnostic Categories</TabsTrigger>
            <TabsTrigger value="symptom-segments">Symptom Segments</TabsTrigger>
            <TabsTrigger value="symptom-id">Symptom IDs</TabsTrigger>
            <TabsTrigger value="hrsn-indicators">HRSN Indicators</TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent>
          <TabsContent value="diagnostic-category" className="mt-0">
            <DiagnosticCategoryChart 
              data={data.diagnosticCategoryData || []} 
              displayMode={displayMode}
              colorTheme={colorTheme}
            />
          </TabsContent>
          
          <TabsContent value="symptom-segments" className="mt-0">
            <SymptomSegmentChart 
              data={data.symptomSegmentData || []} 
              displayMode={displayMode}
              colorTheme={colorTheme}
            />
          </TabsContent>
          
          <TabsContent value="symptom-id" className="mt-0">
            <SymptomIdChart 
              data={data.symptomIDData || []} 
              displayMode={displayMode}
              colorTheme={colorTheme}
            />
          </TabsContent>
          
          <TabsContent value="hrsn-indicators" className="mt-0">
            <HrsnIndicatorsChart 
              data={data.hrsnIndicatorData || []} 
              displayMode={displayMode}
              colorTheme={colorTheme}
            />
          </TabsContent>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t px-6 py-4">
          <div className="text-sm text-muted-foreground">
            {data && data.patients ? `${data.patients.length} patients` : '0 patients'} in dataset
          </div>
          <ChartExportWidget
            data={
              activeTab === 'diagnostic-category' ? data.diagnosticCategoryData :
              activeTab === 'symptom-segments' ? data.symptomSegmentData :
              activeTab === 'symptom-id' ? data.symptomIDData :
              data.hrsnIndicatorData
            }
            chartTitle={
              activeTab === 'diagnostic-category' ? 'Diagnostic Categories' :
              activeTab === 'symptom-segments' ? 'Symptom Segments' :
              activeTab === 'symptom-id' ? 'Symptom IDs' :
              'HRSN Indicators'
            }
          />
        </CardFooter>
      </Tabs>
    </Card>
  );
}