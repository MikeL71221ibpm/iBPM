import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import StandardizedHrsnChartV31 from '@/components/standardized-hrsn-chart-v3-1-05_18_25';
import NavigationButton from '@/components/NavigationButton';
import VisualizationMetadata from '@/components/visualization-metadata-controlling-file-05_17_25';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Download as Excel function 
const downloadAsExcel = (data: any, filename = 'population-health-data.xlsx') => {
  if (!data) return;
  
  try {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    
    // Create a summary sheet for chart data
    const summaryData = Object.entries(data).flatMap(([category, items]: [string, any]) => {
      if (Array.isArray(items)) {
        return items.map((item: any) => ({
          Category: category,
          Name: item.id || item.symptomSegment || item.label || '',
          Count: item.value || item.count || 0,
          Percentage: item.percentage !== undefined ? `${item.percentage}%` : 'N/A'
        }));
      }
      return [];
    });
    
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, "Chart Summary");
    
    // Create a patient details sheet if available
    if (data.patients && Array.isArray(data.patients)) {
      const patientData = data.patients.map((patient: any) => ({
        'Patient ID': patient.id || '',
        'Name': patient.name || '',
        'Age Range': patient.age_range || '',
        'Gender': patient.gender || '',
        'Race': patient.race || '',
        'ZIP Code': patient.zip_code || ''
      }));
      
      const patientWs = XLSX.utils.json_to_sheet(patientData);
      XLSX.utils.book_append_sheet(wb, patientWs, "Patient Details");
    }
    
    // Save the file
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error("Failed to generate Excel file:", error);
  }
};

// Download as CSV function
const downloadAsCSV = (data: any, filename = 'population-health-data.csv') => {
  if (!data || !data.patients) return;
  
  try {
    // Focus on patient data for CSV export
    const patientData = data.patients.map((patient: any) => ({
      'Patient_ID': patient.id || '',
      'Name': patient.name || '',
      'Age_Range': patient.age_range || '',
      'Gender': patient.gender || '',
      'Race': patient.race || '',
      'ZIP_Code': patient.zip_code || ''
    }));
    
    // Convert to CSV
    const worksheet = XLSX.utils.json_to_sheet(patientData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, filename);
  } catch (error) {
    console.error("Failed to generate CSV file:", error);
  }
};

// Print with charts function
const printWithCharts = async () => {
  try {
    const chartContainers = document.querySelectorAll('.chart-for-print');
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      throw new Error('Could not open print window');
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Population Health Charts</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .chart-container { page-break-inside: avoid; margin-bottom: 30px; }
            .chart-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
            .chart-image { max-width: 100%; border: 1px solid #ddd; }
            .metadata { margin-top: 10px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Population Health Analytics Report</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
          <div id="charts-container"></div>
        </body>
      </html>
    `);
    
    const chartsContainer = printWindow.document.getElementById('charts-container');
    
    for (const container of Array.from(chartContainers)) {
      const titleElement = container.querySelector('.chart-title');
      const title = titleElement ? titleElement.textContent : 'Chart';
      
      // Capture chart as image
      const canvas = await html2canvas(container, {
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const chartDiv = printWindow.document.createElement('div');
      chartDiv.className = 'chart-container';
      
      const titleDiv = printWindow.document.createElement('div');
      titleDiv.className = 'chart-title';
      titleDiv.textContent = title;
      chartDiv.appendChild(titleDiv);
      
      const img = printWindow.document.createElement('img');
      img.className = 'chart-image';
      img.src = canvas.toDataURL('image/png');
      chartDiv.appendChild(img);
      
      // Add metadata if available
      const metadataElement = container.querySelector('.metadata');
      if (metadataElement) {
        const metadataDiv = printWindow.document.createElement('div');
        metadataDiv.className = 'metadata';
        metadataDiv.innerHTML = metadataElement.innerHTML;
        chartDiv.appendChild(metadataDiv);
      }
      
      chartsContainer?.appendChild(chartDiv);
    }
    
    // Wait for images to load before printing
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
    
  } catch (error) {
    console.error("Failed to print charts:", error);
  }
};

export default function PopulationHealthV31() {
  const [activeCategoryTab, setActiveCategoryTab] = useState('hrsn');
  const [displayMode, setDisplayMode] = useState<"count" | "percentage">("count");
  const { toast } = useToast();
  
  // Fetch the visualization data
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/visualization-data'],
    staleTime: 60000
  });
  
  // Handle display mode switch
  const handleDisplayModeChange = (mode: "count" | "percentage") => {
    setDisplayMode(mode);
  };
  
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading data",
        description: "Failed to load visualization data. Please try again.",
        variant: "destructive"
      });
    }
  }, [error, toast]);
  
  // Prepare formatted data for HRSN indicators
  const getHrsnData = () => {
    if (!data || !data.hrsnIndicatorData) return [];
    
    return data.hrsnIndicatorData.map((item: any) => ({
      id: item.id,
      value: item.value || item.count || 0,
      percentage: item.percentage || Math.round(((item.value || item.count || 0) / (data?.patients?.length || 24)) * 100)
    }));
  };
  
  // Get Risk Stratification data
  const getRiskData = () => {
    if (!data || !data.riskStratificationData) return [];
    
    return data.riskStratificationData.map((item: any) => ({
      id: item.id,
      value: item.value || item.count || 0,
      percentage: item.percentage || Math.round(((item.value || item.count || 0) / (data?.patients?.length || 24)) * 100)
    }));
  };
  
  // Get Diagnosis data
  const getDiagnosisData = () => {
    if (!data || !data.diagnosisData) return [];
    
    return data.diagnosisData.map((item: any) => ({
      id: item.id,
      value: item.value || item.count || 0,
      percentage: item.percentage || Math.round(((item.value || item.count || 0) / (data?.patients?.length || 24)) * 100)
    }));
  };
  
  // Get Diagnostic Category data
  const getCategoryData = () => {
    if (!data || !data.diagnosticCategoryData) return [];
    
    return data.diagnosticCategoryData.map((item: any) => ({
      id: item.id,
      value: item.value || item.count || 0,
      percentage: item.percentage || Math.round(((item.value || item.count || 0) / (data?.patients?.length || 24)) * 100)
    }));
  };
  
  // Get Symptom ID data
  const getSymptomIDData = () => {
    if (!data || !data.symptomIDData) return [];
    
    return data.symptomIDData.map((item: any) => ({
      id: item.id,
      value: item.value || item.count || 0,
      percentage: item.percentage || Math.round(((item.value || item.count || 0) / (data?.patients?.length || 24)) * 100)
    }));
  };
  
  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Population Health Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Analyze health trends across patient populations
          </p>
        </div>
        
        <div className="flex mt-4 sm:mt-0 space-x-2">
          <NavigationButton 
            href="/patient-search" 
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <ArrowLeft size={16} /> Return to Search
          </NavigationButton>
          
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1"
            onClick={() => downloadAsExcel(data)}
          >
            <Download size={16} /> Excel
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1"
            onClick={() => downloadAsCSV(data)}
          >
            <Download size={16} /> CSV
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1"
            onClick={printWithCharts}
          >
            <Printer size={16} /> Print
          </Button>
        </div>
      </div>
      
      <VisualizationMetadata 
        patientCount={data?.patients?.length || 0}
        recordCount={data?.totalRecords || 0}
        dateRange={data?.dateRange || { start: '', end: '' }}
      />
      
      <Tabs 
        value={activeCategoryTab} 
        onValueChange={setActiveCategoryTab}
        className="mt-6"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="hrsn">HRSN Factors</TabsTrigger>
          <TabsTrigger value="risk">Risk Stratification</TabsTrigger>
          <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
          <TabsTrigger value="categories">Diagnostic Categories</TabsTrigger>
          <TabsTrigger value="symptoms">Symptom ICD-10 Codes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="hrsn" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="chart-for-print">
              <div className="chart-title hidden">HRSN Indicators</div>
              <StandardizedHrsnChartV31
                data={getHrsnData()}
                title="HRSN Indicators"
                subtitle="Distribution of health-related social needs factors across patients"
                chartType="both"
                colorScheme="blues"
                xAxisLabel="HRSN Factor"
                yAxisLabel={displayMode === "count" ? "Count" : "Percentage (%)"}
                displayMode={displayMode}
                onDisplayModeChange={handleDisplayModeChange}
              />
              <div className="metadata hidden">
                Shows distribution of health-related social needs factors across patient population.
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="risk" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="chart-for-print">
              <div className="chart-title hidden">Risk Stratification</div>
              <StandardizedHrsnChartV31
                data={getRiskData()}
                title="Risk Stratification"
                subtitle="Distribution of patient risk levels"
                chartType="both"
                colorScheme="reds"
                xAxisLabel="Risk Level"
                yAxisLabel={displayMode === "count" ? "Count" : "Percentage (%)"}
                displayMode={displayMode}
                onDisplayModeChange={handleDisplayModeChange}
              />
              <div className="metadata hidden">
                Shows distribution of patients by risk stratification level.
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="diagnoses" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="chart-for-print">
              <div className="chart-title hidden">Diagnoses Distribution</div>
              <StandardizedHrsnChartV31
                data={getDiagnosisData()}
                title="Diagnoses Distribution"
                subtitle="Prevalence of specific diagnoses across patients"
                chartType="both"
                colorScheme="purples"
                xAxisLabel="Diagnosis"
                yAxisLabel={displayMode === "count" ? "Count" : "Percentage (%)"}
                displayMode={displayMode}
                onDisplayModeChange={handleDisplayModeChange}
              />
              <div className="metadata hidden">
                Shows distribution of specific diagnoses across patient population.
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="categories" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="chart-for-print">
              <div className="chart-title hidden">Diagnostic Categories</div>
              <StandardizedHrsnChartV31
                data={getCategoryData()}
                title="Diagnostic Categories"
                subtitle="Distribution of diagnostic categories across patients"
                chartType="both"
                colorScheme="greens"
                xAxisLabel="Diagnostic Category"
                yAxisLabel={displayMode === "count" ? "Count" : "Percentage (%)"}
                displayMode={displayMode}
                onDisplayModeChange={handleDisplayModeChange}
              />
              <div className="metadata hidden">
                Shows distribution of diagnostic categories across patient population.
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="symptoms" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="chart-for-print">
              <div className="chart-title hidden">Symptom ICD-10 Codes</div>
              <StandardizedHrsnChartV31
                data={getSymptomIDData()}
                title="Symptom ICD-10 Codes"
                subtitle="Distribution of symptom ICD-10 codes across patients"
                chartType="both"
                colorScheme="oranges"
                xAxisLabel="ICD-10 Code"
                yAxisLabel={displayMode === "count" ? "Count" : "Percentage (%)"}
                displayMode={displayMode}
                onDisplayModeChange={handleDisplayModeChange}
              />
              <div className="metadata hidden">
                Shows distribution of symptom ICD-10 codes across patient population.
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Data reflects current patient population in the system</p>
      </div>
    </div>
  );
}