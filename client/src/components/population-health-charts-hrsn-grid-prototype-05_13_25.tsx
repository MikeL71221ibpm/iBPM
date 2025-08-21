// Last updated: May 13, 2025
// HRSN Grid Prototype - 3x Column layout (Count, %, Distribution) per indicator
// Follows the new design approach requested on May 13, 2025

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import HrsnIndicatorGrid from "./hrsn-indicator-grid-controlling-file-05_13_25";
import ZipCodeVisualization from "./zip-code-visualization-controlling-file-05_13_25";

// Define the interface for props
interface PopulationHealthChartsProps {
  data?: any;
  isLoading?: boolean;
}

export default function PopulationHealthChartsHrsnGridPrototype({ 
  data,
  isLoading = false
}: PopulationHealthChartsProps) {
  
  // State for filter controls
  const [diagnosisFilter, setDiagnosisFilter] = useState("all");
  const [colorTheme, setColorTheme] = useState("vivid");
  
  // Available color themes for charts
  const availableColorSchemes = ["vivid", "pastel", "muted", "dark", "light", "viridis", "plasma", "inferno", "spectral", "blues"];
  
  // Prepare diagnosis options for filter
  const getDiagnosisOptions = () => {
    if (!data || !data.data) return [];
    
    // Extract unique diagnoses
    const uniqueDiagnoses = new Set();
    
    // Check both symptomSegmentData and regular data array
    const sourceData = data.symptomSegmentData || data.data || [];
    
    sourceData.forEach((item: any) => {
      if (item.diagnosis) {
        uniqueDiagnoses.add(item.diagnosis);
      }
    });
    
    return Array.from(uniqueDiagnoses).sort();
  };
  
  const diagnosisOptions = getDiagnosisOptions();
  
  // Early return for loading
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }
  
  // Early return for no data
  if (!data) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-muted-foreground">No data available. Please run a search first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">Visualization Controls</CardTitle>
          <CardDescription>Filter and customize the HRSN visualizations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Diagnosis Filter */}
            <div className="space-y-2">
              <Label htmlFor="diagnosis-filter">Filter by Diagnosis</Label>
              <Select 
                value={diagnosisFilter} 
                onValueChange={setDiagnosisFilter}
              >
                <SelectTrigger id="diagnosis-filter" className="w-full">
                  <SelectValue placeholder="Select a diagnosis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Diagnoses</SelectItem>
                  {Array.isArray(diagnosisOptions) && diagnosisOptions.map((diagnosis: any) => (
                    <SelectItem key={diagnosis} value={diagnosis}>
                      {diagnosis}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Color Theme Selector */}
            <div className="space-y-2">
              <Label htmlFor="color-theme">Chart Color Theme</Label>
              <Select 
                value={colorTheme} 
                onValueChange={setColorTheme}
              >
                <SelectTrigger id="color-theme" className="w-full">
                  <SelectValue placeholder="Select a color theme" />
                </SelectTrigger>
                <SelectContent>
                  {availableColorSchemes.map(scheme => (
                    <SelectItem key={scheme} value={scheme}>
                      {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* HRSN Indicator Grid */}
      <HrsnIndicatorGrid 
        patientData={data?.patients || []}
        extractedSymptoms={data?.symptomSegmentData || data?.data || []}
        colorScheme={colorTheme}
        isLoading={isLoading}
        filterBy={{
          diagnosis: diagnosisFilter !== "all" ? diagnosisFilter : undefined
        }}
      />
      
      {/* Zip Code Visualization (Added as requested) */}
      <ZipCodeVisualization 
        patientData={data?.patients || []}
        extractedSymptoms={data?.symptomSegmentData || data?.data || []}
        colorScheme={colorTheme}
        isLoading={isLoading}
        filterBy={{
          diagnosis: diagnosisFilter !== "all" ? diagnosisFilter : undefined
        }}
      />
    </div>
  );
}