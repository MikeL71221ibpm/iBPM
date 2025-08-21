// Population Health Controlling File - May 13, 2025
// This page displays HRSN population health charts with filters

import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Filter, Download, Calendar, RotateCcw, Percent, Printer, FileDown } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import HrsnGrid from "../components/hrsn-grid-controlling-file-05_13_25";
import PopulationHealthCharts from "../components/population-health-charts-controlling-file-05_12_25_fixed";
import PopulationHealthPercentageCharts from "../components/population-health-percentage-charts-fixed";
import { Switch } from "@/components/ui/switch";
import ThemeSelector from "@/components/ThemeSelector";
import NavigationButton from "@/components/NavigationButton";
import { ChartDisplayModeSwitcher } from "../components/chart-display-mode-switcher";
import html2canvas from "html2canvas";
import * as XLSX from 'xlsx';

export default function PopulationHealthControlling() {
  const [location, setLocation] = useLocation();
  
  // State for selected filters
  const [selectedSymptom, setSelectedSymptom] = useState<string>("all_symptoms");
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string>("all_diagnoses");
  const [selectedDiagnosticCategory, setSelectedDiagnosticCategory] = useState<string>("all_categories");
  const [selectedIcd10Code, setSelectedIcd10Code] = useState<string>("all_icd10");
  const [selectedHrsnProblem, setSelectedHrsnProblem] = useState<string>("all_hrsn_problems");
  const [selectedSymptomId, setSelectedSymptomId] = useState<string>("all_symptom_ids");
  
  // State for showing disparities tracking section - true = show both sections, false = show only main charts
  const [showDisparitiesTracking, setShowDisparitiesTracking] = useState<boolean>(true);
  
  // State for visualization data loading
  const [isVisualizationRunning, setIsVisualizationRunning] = useState<boolean>(false);
  const [visualizationData, setVisualizationData] = useState<any>(null);
  
  // State for display mode (count vs percentage)
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>('count');
  
  // Apply percentage transformation to visualization data
  const transformedData = React.useMemo(() => {
    if (!visualizationData) return null;
    
    if (displayMode === 'count') {
      return visualizationData;
    }
    
    // Helper function to transform array data to percentage
    const transformArrayToPercentage = (array: any[]) => {
      if (!array || array.length === 0) return array;
      
      const total = array.reduce((sum, item) => sum + (item.value || 0), 0);
      if (total === 0) return array;
      
      return array.map(item => ({
        ...item,
        rawValue: item.value || 0,
        percentage: Math.round(((item.value || 0) / total) * 100),
        // Replace value with percentage for display
        value: Math.round(((item.value || 0) / total) * 100)
      }));
    };
    
    // Create a deep copy to avoid modifying original data
    const transformed = JSON.parse(JSON.stringify(visualizationData));
    
    // Transform all chart data arrays
    if (transformed.hrsnIndicatorData) {
      transformed.hrsnIndicatorData = transformArrayToPercentage(transformed.hrsnIndicatorData);
    }
    
    // Transform risk stratification data
    if (transformed.riskStratificationData) {
      transformed.riskStratificationData = transformArrayToPercentage(transformed.riskStratificationData);
    }
    
    // Transform symptom ID data
    if (transformed.symptomIDData) {
      transformed.symptomIDData = transformArrayToPercentage(transformed.symptomIDData);
    }
    
    // Transform diagnostic category data
    if (transformed.diagnosticCategoryData) {
      transformed.diagnosticCategoryData = transformArrayToPercentage(transformed.diagnosticCategoryData);
    }
    
    // Transform diagnosis data
    if (transformed.diagnosisData) {
      transformed.diagnosisData = transformArrayToPercentage(transformed.diagnosisData);
    }
    
    return transformed;
  }, [visualizationData, displayMode]);
  
  // State for controlling print with charts option
  const [printWithCharts, setPrintWithCharts] = useState<boolean>(false);
  
  // Set a global variable to make this state accessible to other components
  useEffect(() => {
    // Make printWithCharts state globally accessible for printing functions
    (window as any).printWithChartsEnabled = printWithCharts;
  }, [printWithCharts]);
  
  // State for color theme control across all charts
  const [colorTheme, setColorTheme] = useState<string>(localStorage.getItem('globalChartTheme') || 'vivid');
  
  // The transformation is handled in transformedData 
  // using React.useMemo which is already defined above
  
  // Get visualization data for export
  const { data: visualizationChartData } = useQuery({
    queryKey: ['/api/visualization-data'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Excel export function 
  const handleExportToExcel = useCallback((patientData: any[]) => {
    if (!patientData) {
      console.error("No patient data available for export");
      alert("No data available for export. Please try again after loading data.");
      return;
    }
    
    try {
      // Prepare workbook
      const wb = XLSX.utils.book_new();
      const now = new Date();
      const timestamp = now.toLocaleString().replace(/[/\\:*?"<>|]/g, '-');
      
      // Create Chart Summary sheet data
      const summaryData: any[] = [];
      
      // Add header info
      summaryData.push(['HRSN Analytics - Population Health Report']);
      summaryData.push(['Generated on', now.toLocaleString()]);
      summaryData.push([]);
      
      // Add filter information
      summaryData.push(['Filters Applied:']);
      summaryData.push(['Symptom:', selectedSymptom || 'None']);
      summaryData.push(['Diagnosis:', selectedDiagnosis || 'None']);
      summaryData.push(['Diagnostic Category:', selectedDiagnosticCategory || 'None']);
      summaryData.push(['ICD-10 Code:', selectedIcd10Code || 'None']);
      summaryData.push([]);
      
      // Get data for each chart category from visualizationChartData
      // Housing stats
      const housingData = visualizationChartData?.hrsnIndicatorData?.find((item: any) => item.id === 'Housing')?.indicators || [];
      summaryData.push(['Housing Statuses:']);
      summaryData.push(['Status', 'Count', 'Percentage']);
      housingData.forEach((item: any) => {
        summaryData.push([item.label, item.value, item.percentage ? `${item.percentage.toFixed(1)}%` : '0%']);
      });
      summaryData.push([]);
      
      // Food stats
      const foodData = visualizationChartData?.hrsnIndicatorData?.find((item: any) => item.id === 'Food')?.indicators || [];
      summaryData.push(['Food Insecurity Statuses:']);
      summaryData.push(['Status', 'Count', 'Percentage']);
      foodData.forEach((item: any) => {
        summaryData.push([item.label, item.value, item.percentage ? `${item.percentage.toFixed(1)}%` : '0%']);
      });
      summaryData.push([]);
      
      // Transportation stats
      const transportData = visualizationChartData?.hrsnIndicatorData?.find((item: any) => item.id === 'Transportation')?.indicators || [];
      summaryData.push(['Transportation Statuses:']);
      summaryData.push(['Status', 'Count', 'Percentage']);
      transportData.forEach((item: any) => {
        summaryData.push([item.label, item.value, item.percentage ? `${item.percentage.toFixed(1)}%` : '0%']);
      });
      summaryData.push([]);
      
      // Create Chart Summary worksheet
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Chart Summary');
      
      // Create Patient Details sheet
      const patientRows: any[] = [];
      
      // Header row
      patientRows.push([
        'Patient ID', 
        'Name', 
        'Age Range', 
        'Gender', 
        'Race', 
        'Ethnicity',
        'ZIP Code',
        'Veteran Status',
        'Education Level',
        'Housing Status',
        'Food Status',
        'Transportation Status',
        'Utilities Status',
        'Personal Safety Status',
        'Risk Score'
      ]);
      
      // Add a row for each patient
      patientData.forEach((patient: any) => {
        patientRows.push([
          patient.patientId || 'Unknown',
          patient.name || (patient.firstName ? `${patient.firstName} ${patient.lastName || ''}` : 'Unknown'),
          patient.ageRange || 'Unknown',
          patient.gender || 'Unknown',
          patient.race || 'Unknown',
          patient.ethnicity || 'Unknown',
          patient.zipCode || 'Unknown',
          patient.veteranStatus || 'Unknown',
          patient.educationLevel || 'Unknown',
          patient.housingStatus || 'Unknown',
          patient.foodSecurityStatus || 'Unknown',
          patient.transportationStatus || 'Unknown',
          patient.utilitiesStatus || 'Unknown',
          patient.personalSafetyStatus || 'Unknown',
          patient.riskScore || '0'
        ]);
      });
      
      // Create Patient Details worksheet
      const patientsWs = XLSX.utils.aoa_to_sheet(patientRows);
      XLSX.utils.book_append_sheet(wb, patientsWs, 'Patient Details');
      
      // Generate Excel file and trigger download
      XLSX.writeFile(wb, `HRSN_Analytics_Report_${timestamp}.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("There was an error generating the Excel report. Please try again.");
    }
  }, [selectedSymptom, selectedDiagnosis, selectedDiagnosticCategory, selectedIcd10Code, visualizationChartData]);
  
  // Print charts function
  const handlePrintCharts = useCallback(async () => {
    if (!printWithCharts) {
      // If print with charts is not enabled, just use the standard print
      window.print();
      return;
    }
    
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print charts');
        return;
      }
      
      // Write the HTML head with styles
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>HRSN Analytics - Population Health Charts</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .chart-image { 
                margin-bottom: 30px; 
                page-break-inside: avoid; 
                max-width: 100%; 
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                border-radius: 8px;
              }
              .chart-title { 
                font-size: 18px; 
                font-weight: bold; 
                margin-bottom: 10px; 
                color: #333;
              }
              .print-date {
                color: #666;
                font-size: 12px;
                margin-bottom: 30px;
                text-align: right;
              }
              .source-info {
                margin-top: 30px;
                page-break-before: auto;
                page-break-inside: avoid;
                border-top: 1px solid #ddd;
                padding-top: 10px;
                color: #666;
                font-size: 11px;
              }
              .source-info h3 {
                font-size: 13px;
                margin-bottom: 5px;
                color: #444;
              }
              .source-info p {
                margin: 3px 0;
              }
              @media print {
                .page-break {
                  page-break-after: always;
                }
              }
            </style>
          </head>
          <body>
            <h1 style="color: #2c3e50; margin-bottom: 5px;">HRSN Analytics - Population Health Charts</h1>
            <div class="print-date">Generated on ${new Date().toLocaleString()}</div>
      `);
      
      // Gather all chart containers
      const chartContainers = document.querySelectorAll('.chart-container');
      
      // For each chart container, take screenshot and add to printWindow
      for (let i = 0; i < chartContainers.length; i++) {
        const container = chartContainers[i] as HTMLElement;
        const titleElement = container.querySelector('.chart-title');
        const title = titleElement ? titleElement.textContent || `Chart ${i+1}` : `Chart ${i+1}`;
        
        // Take screenshot of chart
        const canvas = await html2canvas(container, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher resolution
          logging: false,
          useCORS: true
        });
        
        // Convert to image and add to print window
        const imageDataUrl = canvas.toDataURL('image/png');
        printWindow.document.write(`
          <div class="chart-title">${title}</div>
          <img class="chart-image" src="${imageDataUrl}" alt="${title}" />
        `);
      }
      
      // Add visualization data source information
      if (printWithCharts) {
        const currentDate = new Date().toLocaleDateString();
        
        printWindow.document.write(`
          <div style="margin-top: 40px; border-top: 1px solid #eaeaea; padding-top: 5px; color: #777; font-size: 9px; line-height: 1.2; text-align: left;">
            <div style="margin-bottom: 3px; color: #666; font-weight: normal; font-size: 10px;">Visualization Data Source</div>
            <div>Source CSV: updated_population_data_with_diagnosis_for Testing_1061 records_4_25_25.csv</div>
            <div>Processed JSON: hrsn_data.json (${new Date(1715985660000).toLocaleDateString()})</div>
            <div>Patient count: 24 | Record count: 1061</div>
            <div>Export type: Print</div>
            <div style="text-align: right; font-size: 8px; margin-top: 3px;">Generated on ${currentDate} | HRSN Analytics Platform</div>
          </div>
        `);
      }
      
      // Close the document and trigger print
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      
      // Wait for images to load before printing
      printWindow.onload = function() {
        printWindow.print();
      };
    } catch (error) {
      console.error("Error printing charts:", error);
      alert("There was an error preparing charts for print. Please try again.");
    }
  }, [printWithCharts]);
  
  // Create a function to transform data into percentage format
  const transformDataToPercentage = (data: any) => {
    if (!data) return data;
    
    // Helper function to transform array data to percentage
    const transformArrayToPercentage = (array: any[]) => {
      if (!array || array.length === 0) return array;
      
      const total = array.reduce((sum, item) => sum + (item.value || 0), 0);
      if (total === 0) return array;
      
      return array.map(item => ({
        ...item,
        rawValue: item.value || 0,
        percentage: Math.round(((item.value || 0) / total) * 100),
        // Replace value with percentage for display
        value: Math.round(((item.value || 0) / total) * 100)
      }));
    };
    
    // Create a deep copy to avoid modifying original data
    const transformed = JSON.parse(JSON.stringify(data));
    
    // Transform all chart data arrays
    if (transformed.hrsnIndicatorData) {
      transformed.hrsnIndicatorData = transformArrayToPercentage(transformed.hrsnIndicatorData);
    }
    
    // Transform risk stratification data
    if (transformed.riskStratificationData) {
      transformed.riskStratificationData = transformArrayToPercentage(transformed.riskStratificationData);
    }
    
    // Transform symptom ID data
    if (transformed.symptomIDData) {
      transformed.symptomIDData = transformArrayToPercentage(transformed.symptomIDData);
    }
    
    // Transform diagnostic category data
    if (transformed.diagnosticCategoryData) {
      transformed.diagnosticCategoryData = transformArrayToPercentage(transformed.diagnosticCategoryData);
    }
    
    // Transform diagnosis data
    if (transformed.diagnosisData) {
      transformed.diagnosisData = transformArrayToPercentage(transformed.diagnosisData);
    }
    
    return transformed;
  };
  
  // Function to run visualization with actual data
  const runVisualization = async () => {
    setIsVisualizationRunning(true);
    try {
      // Get the actual data from the API
      const response = await fetch('/api/visualization-data');
      const data = await response.json();
      
      // Apply data transformation if in percentage mode
      if (displayMode === 'percentage') {
        setVisualizationData(transformDataToPercentage(data));
      } else {
        setVisualizationData(data);
      }
    } catch (error) {
      console.error('Error running visualization:', error);
    } finally {
      setIsVisualizationRunning(false);
    }
  };
  
  // Load initial data on component mount
  useEffect(() => {
    runVisualization();
  }, []);
  
  // Fetch patient data and symptoms
  const { data: allData, isLoading: isLoadingData, error: dataError } = useQuery({
    queryKey: ['/api/patients-with-symptoms'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch symptoms list for dropdown
  const { data: symptomsData, isLoading: isLoadingSymptoms } = useQuery({
    queryKey: ['/api/symptoms/list'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch diagnoses list for dropdown
  const { data: diagnosesData, isLoading: isLoadingDiagnoses } = useQuery({
    queryKey: ['/api/diagnoses/list'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch diagnostic categories list for dropdown
  const { data: diagnosticCategoriesData, isLoading: isLoadingDiagnosticCategories } = useQuery({
    queryKey: ['/api/diagnostic-categories/list'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch ICD-10 codes list for dropdown
  const { data: icd10CodesData, isLoading: isLoadingIcd10Codes } = useQuery({
    queryKey: ['/api/icd10-codes/list'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // HRSN Problems list - based on the known HRSN categories from the datasets
  const hrsnProblemsList = [
    { value: "housing_insecurity", label: "Housing Insecurity" },
    { value: "food_insecurity", label: "Food Insecurity" },
    { value: "access_to_transportation", label: "Transportation Issues" },
    { value: "has_a_car", label: "Vehicle Issues" },
    { value: "financial_status", label: "Financial Status Issues" },
    { value: "veteran_status", label: "Veteran Status" },
    { value: "education_level", label: "Education Level" }
  ];
  
  // Define API response types
  interface SymptomListResponse {
    symptoms: string[];
  }
  
  interface DiagnosisListResponse {
    diagnoses: string[];
  }
  
  interface DiagnosticCategoryListResponse {
    categories: string[];
  }
  
  interface Icd10CodeListResponse {
    codes: string[];
  }
  
  // Extract unique symptom names for the dropdown
  const symptomsList = (symptomsData as SymptomListResponse)?.symptoms || [];
  const diagnosesList = (diagnosesData as DiagnosisListResponse)?.diagnoses || [];
  const diagnosticCategoriesList = (diagnosticCategoriesData as DiagnosticCategoryListResponse)?.categories || [];
  const icd10CodesList = (icd10CodesData as Icd10CodeListResponse)?.codes || [];
  
  // Handle reset filters
  const resetFilters = () => {
    setSelectedSymptom("all_symptoms");
    setSelectedDiagnosis("all_diagnoses");
    setSelectedDiagnosticCategory("all_categories");
    setSelectedIcd10Code("all_icd10");
    setSelectedHrsnProblem("all_hrsn_problems");
    setSelectedSymptomId("all_symptom_ids");
  };
  
  // Check if any filter is active (not set to the default "all_" values)
  const hasActiveFilters = selectedSymptom !== "all_symptoms" || 
                          selectedDiagnosis !== "all_diagnoses" || 
                          selectedDiagnosticCategory !== "all_categories" || 
                          selectedIcd10Code !== "all_icd10" ||
                          selectedHrsnProblem !== "all_hrsn_problems" ||
                          selectedSymptomId !== "all_symptom_ids";
  
  // Loading state
  if (isLoadingData || isLoadingSymptoms || isLoadingDiagnoses || isLoadingDiagnosticCategories || isLoadingIcd10Codes) {
    return (
      <div className="container py-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Population Health</h1>
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-[800px] w-full rounded-lg" />
      </div>
    );
  }
  
  // Error state
  if (dataError) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Unable to load population health data. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Define patient data interface
  interface PatientDataResponse {
    patients: any[];
    extractedSymptoms?: any[];
    totalRecords?: number;
  }
  
  // No data state
  if (!allData || !(allData as PatientDataResponse).patients || (allData as PatientDataResponse).patients.length === 0) {
    return (
      <div className="container py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Data Available</AlertTitle>
          <AlertDescription>
            There is no patient data available for analysis. Please import data or check your filters.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container py-8 pl-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Population Health/Group Search</h1>
          <p className="text-gray-600">Showing HRSN data for all 24 patients in the database</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => window.location.href = '/percentage-only'}
          >
            <Percent className="h-4 w-4" />
            View as Percentages
          </Button>
          
          {hasActiveFilters && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Filter className="h-3 w-3" />
              <span>{`${Object.values([selectedSymptom, selectedDiagnosis, selectedDiagnosticCategory, selectedIcd10Code, selectedHrsnProblem, selectedSymptomId].filter(value => value && !value.startsWith('all_'))).length} active filter(s)`}</span>
            </Badge>
          )}
        </div>
      </div>
      
      {/* File Information Panel - Similar to IndividualSearch */}
      <div className="mb-6">
        <Card className="bg-blue-50 shadow-sm border border-blue-200">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              {/* Records count */}
              <div className="inline-flex items-center bg-blue-100 text-blue-800 text-sm rounded-md px-3 py-2 border border-blue-200 shadow-sm">
                <div className="w-5 h-5 mr-2 text-blue-600 font-bold">📊</div>
                <span className="font-semibold">
                  Active Records: 24 patients • 1061 records
                </span>
              </div>
              
              {/* File information - compact display */}
              <div className="text-sm bg-blue-50 px-3 py-1 rounded-md border border-blue-200">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-xs">Current Uploaded File:</span>
                  <span className="text-blue-700 text-xs">updated_population_data_with_diagnosis_for_Testing_1061_records_4_25_25.csv</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-xs">Current Active File:</span>
                  <span className="text-blue-700 text-xs">hrsn_data.json</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Section */}
      <div className="space-y-8">
        {/* Population Health 6 Charts - restored from May 12th version */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Population Health Dashboard</h2>
          </div>
          
          {/* Using key to force remount on display mode change - prevents NaN animation issues */}
          {/* Simple switcher between count and percentage modes */}
          <div className="w-full">
            {/* Adding key={displayMode} forces the component to remount when display mode changes */}
            <PopulationHealthCharts 
              key={`population-health-${displayMode}`}
              data={visualizationData} 
              isLoading={isVisualizationRunning || isLoadingData}
              displayMode={displayMode}
              onDisplayModeChange={setDisplayMode}
            />
          </div>
        </div>
        
        {/* Main Population Health Charts */}
        <div className="mb-8 mt-12 pt-4 border-t-2 border-gray-200">
          <h2 className="text-2xl font-bold mb-4">Population Health Summary</h2>
          
          {/* Patient and Record Count Summary - Larger Font Size */}
          {visualizationData?.patients && (
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="px-3 py-2 rounded bg-blue-50 text-blue-700 text-sm font-medium border border-blue-200 text-[14px]">
                {visualizationData.patients.length} unique patients
              </div>
              <div className="px-3 py-2 rounded bg-slate-50 text-slate-700 text-sm font-medium border border-slate-200 text-[14px]">
                {visualizationData.extractedSymptoms?.length || 0} total records
              </div>
            </div>
          )}
          
          <HrsnGrid 
            data={visualizationData} 
            isLoading={isVisualizationRunning || isLoadingData}
          />
        </div>
        
        {/* Visualization and Theme Options */}
        <div className="mt-12 pt-4 border-t-2 border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Chart Theme selector */}
            <ThemeSelector />
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={runVisualization}
              disabled={isVisualizationRunning}
              className="flex items-center gap-1 h-8 px-2 py-1 text-xs"
            >
              {isVisualizationRunning ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
                  Loading...
                </>
              ) : (
                <>
                  <RotateCcw className="h-3 w-3" />
                  Run Visualizations
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Radio buttons for Print with Charts option */}
        <div className="mt-4 flex justify-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input 
                type="radio" 
                id="do-not-print" 
                name="print-option" 
                checked={!printWithCharts} 
                onChange={() => {
                  setPrintWithCharts(false);
                  (window as any).printWithChartsEnabled = false;
                }}
                className="w-4 h-4 text-primary"
              />
              <Label htmlFor="do-not-print" className="text-sm">Do Not Print with Charts</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input 
                type="radio" 
                id="print-with-charts" 
                name="print-option" 
                checked={printWithCharts} 
                onChange={() => {
                  setPrintWithCharts(true);
                  (window as any).printWithChartsEnabled = true;
                }}
                className="w-4 h-4 text-primary"
              />
              <Label htmlFor="print-with-charts" className="text-sm">Print with Charts</Label>
            </div>
          </div>
        </div>
        
        {/* Visualization Data Source frame for printing */}
        <div className={`mt-4 p-4 border border-dashed border-gray-300 rounded-md ${printWithCharts ? 'block' : 'print:block hidden'}`}>
          <h3 className="text-lg font-bold mb-2">Visualization Data Source</h3>
          <div className="text-sm">
            <p><strong>Source CSV:</strong> updated_population_data_with_diagnosis_for Testing_1061 records_4_25_25.csv</p>
            <p><strong>Processed JSON:</strong> hrsn_data.json ({new Date(1715985660000).toLocaleDateString()})</p>
            <p><strong>Patient count:</strong> 24</p>
            <p><strong>Record count:</strong> 1061</p>
            <p><strong>Generated on:</strong> {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        
        <div className="mt-8 flex justify-center gap-4">
          <div className="relative group">
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              <Download className="h-4 w-4" />
              Export Data
            </button>
            <div className="absolute left-0 mt-2 w-44 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="py-1" role="none">
                <button
                  className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={() => {
                    // Access the patients data from the PatientDataResponse interface
                    const patients = ((allData as PatientDataResponse)?.patients || []);
                    handleExportToExcel(patients);
                  }}
                >
                  Export to Excel (.xlsx)
                </button>
                <button
                  className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  onClick={() => {
                    // CSV export functionality
                    try {
                      // Access the patients data
                      const patients = ((allData as PatientDataResponse)?.patients || []);
                      
                      // Create CSV content
                      let csvContent = "Patient ID,Name,Age Range,Gender,Race,Ethnicity,ZIP Code,Veteran Status,Education Level,Housing Status,Food Status,Transportation Status,Utilities Status,Personal Safety Status,Risk Score\n";
                      
                      // Add patient rows
                      patients.forEach(patient => {
                        const row = [
                          patient.patientId || 'Unknown',
                          (patient.name || (patient.firstName ? `${patient.firstName} ${patient.lastName || ''}` : 'Unknown')).replace(/,/g, ' '),
                          patient.ageRange || 'Unknown',
                          patient.gender || 'Unknown',
                          (patient.race || 'Unknown').replace(/,/g, ' '),
                          (patient.ethnicity || 'Unknown').replace(/,/g, ' '),
                          patient.zipCode || 'Unknown',
                          patient.veteranStatus || 'Unknown',
                          (patient.educationLevel || 'Unknown').replace(/,/g, ' '),
                          (patient.housingStatus || 'Unknown').replace(/,/g, ' '),
                          (patient.foodSecurityStatus || 'Unknown').replace(/,/g, ' '),
                          (patient.transportationStatus || 'Unknown').replace(/,/g, ' '),
                          (patient.utilitiesStatus || 'Unknown').replace(/,/g, ' '),
                          (patient.personalSafetyStatus || 'Unknown').replace(/,/g, ' '),
                          patient.riskScore || '0'
                        ].map(value => `"${value}"`).join(',');
                        
                        csvContent += row + "\n";
                      });
                      
                      // Create download link
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      const timestamp = new Date().toLocaleString().replace(/[/\\:*?"<>|]/g, '-');
                      
                      link.href = url;
                      link.setAttribute('download', `HRSN_Analytics_Patient_Data_${timestamp}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    } catch (error) {
                      console.error("Error exporting to CSV:", error);
                      alert("There was an error generating the CSV file. Please try again.");
                    }
                  }}
                >
                  Export to CSV
                </button>
              </div>
            </div>
          </div>
          
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            onClick={handlePrintCharts}
          >
            <Printer className="h-4 w-4" />
            Print Charts
          </button>
        </div>
      </div>
    </div>
  );
}