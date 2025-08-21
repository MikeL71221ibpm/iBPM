// HRSN Grid Chart Demo - May 13, 2025
// This file demonstrates the integration of Nivo charts for HRSN visualization

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, FileText, FileDown, FileJson, Printer, Maximize } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ChartExportSection } from "@/components/chart-export-section";

// Import chart components
import CategoricalHrsnChart from "./categorical-hrsn-chart-05_13_25";
import HrsnPieChart from "./hrsn-pie-chart-05_13_25";
// Removed problematic HrsnHeatmap import - using CategoricalHrsnChart for all chart types

interface HrsnGridProps {
  data?: any;
  isLoading?: boolean;
  // Chart export functions
  downloadChartAsCSV?: (chartTitle: string, data: any[], isPatientDetailExport?: boolean) => void;
  downloadChartAsExcel?: (chartTitle: string, data: any[]) => void;
  downloadChartAsJson?: (chartTitle: string, data: any[]) => void;
  printChart?: (chartTitle: string, isDialogChart?: boolean) => void;
  getFullDataset?: (chartType: string, includeAllData?: boolean, isPatientDetailExport?: boolean) => any[];
}

export default function HrsnGridChartDemo({ 
  data, 
  isLoading, 
  downloadChartAsCSV,
  downloadChartAsExcel,
  downloadChartAsJson,
  printChart,
  getFullDataset
}: HrsnGridProps) {
  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  const [colorScheme, setColorScheme] = useState<string>("blue");
  
  // Sample data for development
  const sampleData = {
    housingInsecurity: [
      { id: 1, housing_insecurity: "Yes", age_range: "25-34" },
      { id: 2, housing_insecurity: "Yes", age_range: "35-44" },
      { id: 3, housing_insecurity: "No", age_range: "25-34" },
      { id: 4, housing_insecurity: "No", age_range: "45-54" },
      { id: 5, housing_insecurity: "No", age_range: "18-24" },
      { id: 6, housing_insecurity: "Yes", age_range: "55-64" },
      { id: 7, housing_insecurity: "No", age_range: "25-34" },
      { id: 8, housing_insecurity: "No", age_range: "25-34" },
      { id: 9, housing_insecurity: "No", age_range: "35-44" },
      { id: 10, housing_insecurity: "No", age_range: "35-44" },
      { id: 11, housing_insecurity: "Yes", age_range: "45-54" },
      { id: 12, housing_insecurity: "No", age_range: "55-64" },
    ],
    educationLevel: [
      { id: 1, education_level: "High School", age_range: "25-34" },
      { id: 2, education_level: "Some College", age_range: "35-44" },
      { id: 3, education_level: "Bachelor's Degree", age_range: "25-34" },
      { id: 4, education_level: "High School", age_range: "45-54" },
      { id: 5, education_level: "High School", age_range: "18-24" },
      { id: 6, education_level: "Some College", age_range: "55-64" },
      { id: 7, education_level: "Bachelor's Degree", age_range: "25-34" },
      { id: 8, education_level: "Some College", age_range: "25-34" },
      { id: 9, education_level: "Some College", age_range: "35-44" },
      { id: 10, education_level: "High School", age_range: "35-44" },
      { id: 11, education_level: "Some College", age_range: "45-54" },
      { id: 12, education_level: "High School", age_range: "55-64" },
    ]
  };
  
  // Define the HRSN indicators we want to display
  const hrsnIndicators = [
    "Housing Insecurity", 
    "Education Level"
  ];
  
  // Function to toggle select all charts
  const toggleSelectAll = () => {
    if (selectedCharts.length === hrsnIndicators.length * 3) {
      setSelectedCharts([]);
    } else {
      // Generate IDs for all charts (indicatorName_chartType)
      const allChartIds: string[] = [];
      
      for (const indicator of hrsnIndicators) {
        allChartIds.push(`${indicator}_count`);
        allChartIds.push(`${indicator}_percentage`);
        allChartIds.push(`${indicator}_distribution`);
      }
      
      setSelectedCharts(allChartIds);
    }
  };

  // Function to toggle individual chart selection
  const toggleChartSelection = (chartId: string) => {
    const isSelected = selectedCharts.includes(chartId);
    
    if (isSelected) {
      // Remove the chart ID
      const newSelectedCharts = selectedCharts.filter(id => id !== chartId);
      setSelectedCharts(newSelectedCharts);
    } else {
      // Add the chart ID
      const newSelectedCharts = [...selectedCharts, chartId];
      setSelectedCharts(newSelectedCharts);
    }
  };
  
  // Export to Excel function (simplified)
  const exportToExcel = () => {
    if (selectedCharts.length === 0) return;
    
    const workbook = XLSX.utils.book_new();
    
    // Add a summary sheet
    const summary = [
      ["HRSN Analytics Report"],
      ["Generated", new Date().toLocaleString()],
      ["Charts Selected", selectedCharts.join(", ")]
    ];
    
    const sheet = XLSX.utils.aoa_to_sheet(summary);
    XLSX.utils.book_append_sheet(workbook, sheet, "Summary");
    
    // Export
    XLSX.writeFile(workbook, "hrsn_analytics.xlsx");
  };
  
  // Export to PDF function (simplified)
  const exportToPdf = async () => {
    if (selectedCharts.length === 0) return;
    
    const pdf = new jsPDF();
    pdf.text("HRSN Analytics Report", 105, 15, { align: "center" });
    
    // In a real implementation, we would capture each selected chart and add to PDF
    
    pdf.save("hrsn_analytics.pdf");
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full"></div>
        <span className="ml-3 text-lg">Loading HRSN data...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 font-sans">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-muted/50 p-6 rounded-lg shadow-sm border">
        <div>
          <h2 className="text-2xl font-bold mb-2">HRSN Analytics</h2>
          <p className="text-muted-foreground text-base">
            Showing data for <span className="font-semibold">12</span> patients
          </p>
        </div>
        
        {/* Chart Controls */}
        <div className="flex flex-col md:flex-row gap-5 items-start md:items-center bg-white/50 p-3 rounded-md">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="color-scheme" className="font-medium">Color Scheme</Label>
            <Select defaultValue={colorScheme} onValueChange={setColorScheme}>
              <SelectTrigger id="color-scheme" className="w-[160px]">
                <SelectValue placeholder="Select color scheme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blue">Blue Theme</SelectItem>
                <SelectItem value="green">Green Theme</SelectItem>
                <SelectItem value="purple">Purple Theme</SelectItem>
                <SelectItem value="orange">Orange Theme</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center">
            {/* Standardized dialog with export options instead of individual buttons */}
            {downloadChartAsCSV && downloadChartAsExcel && downloadChartAsJson && printChart && getFullDataset && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1 h-9 font-medium"
                    disabled={selectedCharts.length === 0}
                  >
                    <FileDown className="h-4 w-4 mr-1" />
                    Export Options
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-[90vw]">
                  <DialogHeader>
                    <DialogTitle>HRSN Visualization Export</DialogTitle>
                    <DialogDescription>
                      Export HRSN chart data in various formats
                    </DialogDescription>
                  </DialogHeader>
                  
                  <ChartExportSection 
                    chartName="HRSN Grid"
                    downloadChartAsCSV={downloadChartAsCSV}
                    downloadChartAsExcel={downloadChartAsExcel}
                    downloadChartAsJson={downloadChartAsJson}
                    printChart={printChart}
                    getFullDataset={getFullDataset}
                  />
                </DialogContent>
              </Dialog>
            )}
            
            <Button 
              variant={selectedCharts.length > 0 ? "default" : "outline"}
              size="sm" 
              className="gap-1 h-9 font-medium"
              onClick={toggleSelectAll}
            >
              <Checkbox 
                checked={selectedCharts.length === hrsnIndicators.length * 3} 
                className="mr-1 h-4 w-4 border-2"
              />
              {selectedCharts.length === hrsnIndicators.length * 3 
                ? "Unselect All Charts" 
                : "Select All Charts"
              }
            </Button>
            <p className="text-sm text-muted-foreground">
              {selectedCharts.length > 0 ? `${selectedCharts.length} charts selected` : "No charts selected"}
            </p>
          </div>
        </div>
      </div>
      
      {/* Housing Insecurity Section */}
      <Card id="housing_insecurity_section" className="page-break-before print:mt-8">
        <CardHeader className="py-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl font-bold">Housing Insecurity</CardTitle>
              <CardDescription>
                Showing housing insecurity status distribution
              </CardDescription>
            </div>
            <Checkbox 
              id="select_housing_insecurity"
              checked={["Housing Insecurity_count", "Housing Insecurity_percentage", "Housing Insecurity_distribution"].every(id => 
                selectedCharts.includes(id)
              )}
              onCheckedChange={() => {
                const ids = ["Housing Insecurity_count", "Housing Insecurity_percentage", "Housing Insecurity_distribution"];
                const allSelected = ids.every(id => selectedCharts.includes(id));
                
                if (allSelected) {
                  setSelectedCharts(prev => prev.filter(id => !ids.includes(id)));
                } else {
                  setSelectedCharts(prev => [...new Set([...prev, ...ids])]);
                }
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Count Chart - Bar Chart */}
            <div id="Housing Insecurity_count">
              <Card className="relative h-full">
                <div className="absolute top-2 right-2 z-10">
                  <Checkbox 
                    checked={selectedCharts.includes("Housing Insecurity_count")}
                    onCheckedChange={() => toggleChartSelection("Housing Insecurity_count")}
                  />
                </div>
                <CardHeader className="py-2">
                  <CardTitle className="text-base font-medium">Count</CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-60">
                  <CategoricalHrsnChart
                    data={sampleData.housingInsecurity}
                    title=""
                    categoryField="housing_insecurity"
                    valueField="count"
                    colorScheme={colorScheme}
                    height={220}
                  />
                </CardContent>
              </Card>
            </div>
            
            {/* Percentage Chart - Pie Chart */}
            <div id="Housing Insecurity_percentage">
              <Card className="relative h-full">
                <div className="absolute top-2 right-2 z-10">
                  <Checkbox 
                    checked={selectedCharts.includes("Housing Insecurity_percentage")}
                    onCheckedChange={() => toggleChartSelection("Housing Insecurity_percentage")}
                  />
                </div>
                <CardHeader className="py-2">
                  <CardTitle className="text-base font-medium">Percentage</CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-60">
                  <HrsnPieChart
                    data={sampleData.housingInsecurity}
                    title=""
                    categoryField="housing_insecurity"
                    colorScheme={colorScheme}
                    height={220}
                  />
                </CardContent>
              </Card>
            </div>
            
            {/* Distribution Chart - Heatmap */}
            <div id="Housing Insecurity_distribution">
              <Card className="relative h-full">
                <div className="absolute top-2 right-2 z-10">
                  <Checkbox 
                    checked={selectedCharts.includes("Housing Insecurity_distribution")}
                    onCheckedChange={() => toggleChartSelection("Housing Insecurity_distribution")}
                  />
                </div>
                <CardHeader className="py-2">
                  <CardTitle className="text-base font-medium">Distribution by Age</CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-60">
                  <CategoricalHrsnChart
                    patientData={sampleData.housingInsecurity}
                    title="Distribution by Age"
                    categoryName="housing_insecurity"
                    colorScheme={colorScheme}
                    height={220}
                    filterBy={{}}
                    isLoading={false}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Education Level Section */}
      <Card id="education_level_section" className="page-break-before print:mt-8">
        <CardHeader className="py-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl font-bold">Education Level</CardTitle>
              <CardDescription>
                Showing education level distribution
              </CardDescription>
            </div>
            <Checkbox 
              id="select_education_level"
              checked={["Education Level_count", "Education Level_percentage", "Education Level_distribution"].every(id => 
                selectedCharts.includes(id)
              )}
              onCheckedChange={() => {
                const ids = ["Education Level_count", "Education Level_percentage", "Education Level_distribution"];
                const allSelected = ids.every(id => selectedCharts.includes(id));
                
                if (allSelected) {
                  setSelectedCharts(prev => prev.filter(id => !ids.includes(id)));
                } else {
                  setSelectedCharts(prev => [...new Set([...prev, ...ids])]);
                }
              }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Count Chart - Bar Chart */}
            <div id="Education Level_count">
              <Card className="relative h-full">
                <div className="absolute top-2 right-2 z-10">
                  <Checkbox 
                    checked={selectedCharts.includes("Education Level_count")}
                    onCheckedChange={() => toggleChartSelection("Education Level_count")}
                  />
                </div>
                <CardHeader className="py-2">
                  <CardTitle className="text-base font-medium">Count</CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-60">
                  <CategoricalHrsnChart
                    data={sampleData.educationLevel}
                    title=""
                    categoryField="education_level"
                    valueField="count"
                    colorScheme={colorScheme}
                    height={220}
                  />
                </CardContent>
              </Card>
            </div>
            
            {/* Percentage Chart - Pie Chart */}
            <div id="Education Level_percentage">
              <Card className="relative h-full">
                <div className="absolute top-2 right-2 z-10">
                  <Checkbox 
                    checked={selectedCharts.includes("Education Level_percentage")}
                    onCheckedChange={() => toggleChartSelection("Education Level_percentage")}
                  />
                </div>
                <CardHeader className="py-2">
                  <CardTitle className="text-base font-medium">Percentage</CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-60">
                  <HrsnPieChart
                    data={sampleData.educationLevel}
                    title=""
                    categoryField="education_level"
                    colorScheme={colorScheme}
                    height={220}
                  />
                </CardContent>
              </Card>
            </div>
            
            {/* Distribution Chart - Heatmap */}
            <div id="Education Level_distribution">
              <Card className="relative h-full">
                <div className="absolute top-2 right-2 z-10">
                  <Checkbox 
                    checked={selectedCharts.includes("Education Level_distribution")}
                    onCheckedChange={() => toggleChartSelection("Education Level_distribution")}
                  />
                </div>
                <CardHeader className="py-2">
                  <CardTitle className="text-base font-medium">Distribution by Age</CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-60">
                  <CategoricalHrsnChart
                    patientData={sampleData.educationLevel}
                    title="Distribution by Age"
                    categoryName="education_level"
                    colorScheme={colorScheme}
                    height={220}
                    filterBy={{}}
                    isLoading={false}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}