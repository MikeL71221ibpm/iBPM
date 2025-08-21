// Population Health Unified - May 21, 2025
// This page uses our standardized charts with unified export functionality

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Filter, Calendar, RotateCcw, Percent } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import HrsnGrid from "../components/hrsn-grid-controlling-file-05_13_25";
// Import a working implementation of the charts
import DiagnosticCategoryChart from '../components/diagnostic-category-chart-05_21_25';
import SymptomSegmentChart from '../components/symptom-segment-chart-05_21_25';
import SymptomIdChart from '../components/symptom-id-chart-05_21_25';
import HrsnIndicatorsChart from '../components/hrsn-indicators-chart-05_21_25';
import { Switch } from "@/components/ui/switch";
import ThemeSelector from "@/components/ThemeSelector";
import NavigationButton from "@/components/NavigationButton";

export default function PopulationHealthUnified() {
  const [, setLocation] = useLocation();
  
  // Query for visualization data
  const { data: visualizationData, isLoading, isError, error } = useQuery({
    queryKey: ['/api/visualization-data'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // State for display mode (count or percentage)
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>('count');
  
  // State for active tab selection
  const [activeTab, setActiveTab] = useState<string>('diagnostic-category');
  
  // State for controlling color theme across all charts
  const [colorTheme, setColorTheme] = useState<string>(localStorage.getItem('globalChartTheme') || 'vivid');
  
  // Effect to save color theme preference
  useEffect(() => {
    localStorage.setItem('globalChartTheme', colorTheme);
  }, [colorTheme]);
  
  // Effect to save display mode preference
  useEffect(() => {
    localStorage.setItem('displayMode', displayMode);
  }, [displayMode]);
  
  // Load saved preferences on initial render
  useEffect(() => {
    const savedDisplayMode = localStorage.getItem('displayMode');
    if (savedDisplayMode === 'count' || savedDisplayMode === 'percentage') {
      setDisplayMode(savedDisplayMode);
    }
  }, []);
  
  // Handle display mode toggle directly with more robust state handling
  const handleDisplayModeChange = (mode: 'count' | 'percentage') => {
    console.log('Main page setting display mode to:', mode);
    // Use a callback form of setState to ensure we're working with the latest state
    setDisplayMode((prevMode) => {
      // Only update if the mode has actually changed
      if (prevMode !== mode) {
        console.log(`Changing display mode from ${prevMode} to ${mode}`);
        localStorage.setItem('displayMode', mode);
        return mode;
      }
      return prevMode;
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Population Health Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive health analytics across the patient population
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {/* Display Mode Toggle Buttons */}
          <div className="bg-muted p-1 rounded-md flex mr-2">
            <Button
              variant={displayMode === 'count' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleDisplayModeChange('count')}
              className="rounded-sm"
            >
              Count
            </Button>
            <Button
              variant={displayMode === 'percentage' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleDisplayModeChange('percentage')}
              className="rounded-sm"
            >
              <Percent className="h-4 w-4 mr-1" />
              Percentage
            </Button>
          </div>
          <NavigationButton href="/">Back to Dashboard</NavigationButton>
        </div>
      </div>
      
      {/* Controls and filters section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Display Controls</CardTitle>
          <CardDescription>
            Configure how data is displayed across all charts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            {/* Theme selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <Label htmlFor="theme-selector" className="whitespace-nowrap">
                Color Theme:
              </Label>
              <ThemeSelector />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Data loading states */}
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px]" />
          </div>
        </div>
      )}
      
      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load visualization data. {error?.message || 'Please try again later.'}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Main charts display */}
      {!isLoading && !isError && visualizationData && (
        <>
          {/* HRSN Grid */}
          <HrsnGrid 
            data={visualizationData}
            colorTheme={colorTheme}
            displayMode={displayMode}
          />
          
          {/* Tabs for individual charts */}
          <Card className="w-full mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Population Health Charts</CardTitle>
                <CardDescription>
                  View population health data by various categories
                </CardDescription>
              </div>
            </CardHeader>
            
            <div className="px-6 pb-2">
              <div className="flex flex-wrap gap-4">
                <Button
                  variant={activeTab === 'diagnostic-category' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('diagnostic-category')}
                  className="flex-1"
                >
                  Diagnostic Categories
                </Button>
                <Button
                  variant={activeTab === 'symptom-id' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('symptom-id')}
                  className="flex-1"
                >
                  Symptoms
                </Button>
                <Button
                  variant={activeTab === 'symptom-segment' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('symptom-segment')}
                  className="flex-1"
                >
                  Symptom Segments
                </Button>
                <Button
                  variant={activeTab === 'hrsn-indicators' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('hrsn-indicators')}
                  className="flex-1"
                >
                  HRSN Indicators
                </Button>
              </div>
            </div>
            
            <CardContent className="pt-4">
              {activeTab === 'diagnostic-category' && (
                <DiagnosticCategoryChart 
                  data={visualizationData?.diagnosticCategoryData || []} 
                  displayMode={displayMode}
                  colorTheme={colorTheme}
                />
              )}
              {activeTab === 'symptom-id' && (
                <SymptomIdChart 
                  data={visualizationData?.symptomIDData || []} 
                  displayMode={displayMode}
                  colorTheme={colorTheme}
                />
              )}
              {activeTab === 'symptom-segment' && (
                <SymptomSegmentChart 
                  data={visualizationData?.symptomSegmentData || []} 
                  displayMode={displayMode}
                  colorTheme={colorTheme}
                />
              )}
              {activeTab === 'hrsn-indicators' && (
                <HrsnIndicatorsChart 
                  data={visualizationData?.hrsnIndicatorData || []} 
                  displayMode={displayMode}
                  colorTheme={colorTheme}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}