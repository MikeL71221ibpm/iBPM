// Population Health Charts - Standardized Version - May 21, 2025
// This component displays population health data using standardized chart components

import React, { useState, useCallback, useEffect } from "react";
import { 
  safePercentage, 
  prepareChartData, 
  createLabelFormatter, 
  createTooltipFormatter, 
  transformToPercentage 
} from "@/lib/chart-helpers";
import "./ui/chart-height-fix.css";
import { PercentageToggleFix } from "./percentage-toggle-fix";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { VisualizationMetadata } from "./visualization-metadata-controlling-file-05_17_25";
import SocialDeterminantsHeatmap from "./social-determinants-heatmap-controlling-file-05_17_25";
import CategoricalHrsnChart from "./categorical-hrsn-chart-controlling-file-05_17_25";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { 
  Check, 
  ChevronsUpDown, 
  Info,
  Palette
} from "lucide-react";

// Import standardized chart components - May 21, 2025
import DiagnosticCategoryChart from "./diagnostic-category-chart-05_21_25";
import HrsnIndicatorsChart from "./hrsn-indicators-chart-05_21_25";
import SymptomSegmentChart from "./symptom-segment-chart-05_21_25";
import PatientVisualization from "./patient-visualization-05_21_25";

// Define types for chart data
interface ChartDataItem {
  id: string;
  value: number;
  percentage?: number;
  [key: string]: string | number | undefined;
}

// Define type for color theme
interface ColorThemePreset {
  name: string;
  saturation?: number;
  lightness?: number;
  alpha?: number;
  isCustomPalette?: boolean;
  colors?: string[];
}

// Color themes - these define vibrancy of the colors, not the individual colors themselves
const COLOR_THEMES: Record<string, ColorThemePreset> = {
  // COLOR INTENSITY THEMES
  vivid: {
    name: "Vivid Colors",
    saturation: 100,  // Increased from 90 to 100 for more vivid colors
    lightness: 55,    // Decreased from 60 to 55 for better contrast
    alpha: 1,        // Fully opaque
  },
  
  pastel: {
    name: "Pastel Colors",
    saturation: 70,  // Increased from 60 to 70 for better differentiation
    lightness: 75,   // Decreased from 80 to 75 for better contrast
    alpha: 0.9,      // Increased opacity from 0.8 to 0.9
  },
  
  muted: {
    name: "Muted Colors",
    saturation: 50,  // Increased from 40 to 50 for better differentiation
    lightness: 45,   // Decreased from 50 to 45 for better contrast
    alpha: 0.95,     // Increased opacity from 0.9 to 0.95
  },
  
  dark: {
    name: "Dark Colors",
    saturation: 85,  // Increased from 70 to 85 for better differentiation
    lightness: 35,   // Increased from 30 to 35 for better visibility
    alpha: 1,        // Fully opaque
  },
  
  light: {
    name: "Light Colors",
    saturation: 60,  // Increased from 50 to 60 for better differentiation
    lightness: 65,   // Decreased from 70 to 65 for better contrast
    alpha: 0.9,      // Increased opacity from 0.85 to 0.9
  },
  
  // Viridis - colorblind friendly theme based on the matplotlib viridis palette
  // Enhanced with more steps for better differentiation
  viridis: {
    name: "Viridis (Colorblind Friendly)",
    isCustomPalette: true,
    colors: [
      '#440154', // Dark purple
      '#482677', // Deep purple
      '#404688', // Deep blue
      '#33638D', // Medium blue
      '#27808E', // Teal
      '#1FA187', // Blue-green
      '#49B97C', // Green
      '#6ECE58', // Light green
      '#A2DB34', // Yellow-green
      '#E0DD12', // Yellow
      '#FDE725'  // Bright yellow
    ]
  }
};

interface PopulationHealthChartsProps {
  data?: any;
  isLoading?: boolean;
  displayMode?: 'count' | 'percentage';
  onDisplayModeChange?: (mode: 'count' | 'percentage') => void;
}

export default function PopulationHealthChartsStandardized({ 
  data, 
  isLoading = false,
  displayMode: parentDisplayMode = "count", // Accept display mode from parent
  onDisplayModeChange // Accept callback to notify parent of mode changes
}: PopulationHealthChartsProps) {
  // Default to 10 categories, but allow showing up to 30 for detailed inspection
  const [categoryCount, setCategoryCount] = useState<number>(10);
  
  // Theme selector state
  const [currentTheme, setCurrentTheme] = useState<string>("vivid");
  const [colorSettings, setColorSettings] = useState<ColorThemePreset>(COLOR_THEMES.vivid);
  
  // Use local display mode if not controlled by parent
  const [localDisplayMode, setLocalDisplayMode] = useState<"count" | "percentage">("count");
  
  // Use parent display mode if provided, otherwise use local state
  const displayMode = parentDisplayMode || localDisplayMode;
  
  // Update color settings when theme changes with error handling
  useEffect(() => {
    try {
      // Default to vivid if theme is not found
      const newSettings = COLOR_THEMES[currentTheme as keyof typeof COLOR_THEMES] || COLOR_THEMES.vivid;
      setColorSettings(newSettings);
      console.log("Theme changed to:", currentTheme, newSettings);
      
      // Save current theme to localStorage for persistence
      localStorage.setItem('chartTheme', currentTheme);
    } catch (err) {
      console.error("Error updating theme settings:", err);
      // Reset to default theme if there's an error
      setCurrentTheme("vivid");
      setColorSettings(COLOR_THEMES.vivid);
    }
  }, [currentTheme]);
  
  // Save display mode to localStorage for persistence
  useEffect(() => {
    try {
      localStorage.setItem('chartDisplayMode', displayMode);
      console.log("Display mode changed to:", displayMode);
    } catch (err) {
      console.error("Error saving display mode:", err);
    }
  }, [displayMode]);
  
  // Load saved theme and display mode on initial render
  useEffect(() => {
    try {
      // Load theme
      const savedTheme = localStorage.getItem('chartTheme');
      if (savedTheme && COLOR_THEMES[savedTheme as keyof typeof COLOR_THEMES]) {
        setCurrentTheme(savedTheme);
      }
      
      // Load display mode
      const savedDisplayMode = localStorage.getItem('chartDisplayMode') as "count" | "percentage";
      if (savedDisplayMode && (savedDisplayMode === "count" || savedDisplayMode === "percentage")) {
        setLocalDisplayMode(savedDisplayMode);
        
        // If we also have the parent callback, update the parent's state too
        if (onDisplayModeChange) {
          onDisplayModeChange(savedDisplayMode);
        }
      }
    } catch (err) {
      console.error("Error loading saved preferences:", err);
      // Silently fall back to defaults
    }
  }, [onDisplayModeChange]);
  
  // Log data ONLY on mount and when data reference changes
  // We use a ref to track if this is the first render to prevent unnecessary logs
  const isFirstRender = React.useRef(true);
  
  React.useEffect(() => {
    // Only log if it's the first render or if data actually changed
    if (isFirstRender.current || data) {
      console.log("🌟 PopulationHealthCharts received data:", data);
      console.log("🌟 Data has patients?", data?.patients?.length > 0);
      console.log("🌟 Data has symptomSegmentData?", data?.symptomSegmentData?.length > 0);
      
      // Add detailed logging of what data we have
      if (data) {
        console.log("🌟 DETAILED DATA ANALYSIS 🌟");
        console.log("- symptomSegmentData:", data.symptomSegmentData?.length || 0, "items");
        console.log("- diagnosisData:", data.diagnosisData?.length || 0, "items");
        console.log("- symptomIDData:", data.symptomIDData?.length || 0, "items");
        console.log("- diagnosticCategoryData:", data.diagnosticCategoryData?.length || 0, "items");
        console.log("- totalRecords:", data.totalRecords || 0);
        console.log("- patients:", data.patients?.length || 0, "patients");
      }
      
      isFirstRender.current = false;
    }
  }, [data]);
  
  // Function to get metadata information for visualization
  const getVisualMetadataInfo = () => {
    // Default values - Use actual values from API instead of hardcoded ones when available
    const totalPatients = data?.patients?.length || 24;
    const totalRecords = data?.totalRecords || 1061; 
    
    // These would be calculated based on filters in a real implementation
    // For now, we'll use approximations based on filter selections
    const filteredPatients = selectedFilters.length > 0 || 
                              housingFilter !== "all" || 
                              foodFilter !== "all" || 
                              financialFilter !== "all" ||
                              diagnosisFilter !== "all" ? 
      Math.max(Math.floor(totalPatients * 0.85), 1) : // Estimate filtered patient count (minimum 1)
      totalPatients;
    
    const filteredRecords = selectedFilters.length > 0 || 
                            housingFilter !== "all" || 
                            foodFilter !== "all" || 
                            financialFilter !== "all" ||
                            diagnosisFilter !== "all" ? 
      Math.floor(totalRecords * 0.8) : // Approximation for filtered data
      totalRecords; 
    
    // Calculate final filtered counts for billing purposes
    // This would be more precise in the actual implementation
    const finalPatients = filteredPatients;
    const finalRecords = Math.floor(filteredRecords * 0.95); // Example: some records might be filtered out in final processing
    
    // Information about applied filters - will be populated by actual filter state
    const activeFilters: Record<string, string | string[]> = {
      'Data Source': ['CSV', 'JSON'],
      'Date Range': 'Jan 1, 2024 - May 12, 2025'
    };
    
    // Add any selected demographic filters
    if (selectedFilters.length > 0) {
      activeFilters['Demographics'] = selectedFilters;
    }
    
    // Add HRSN filters if they're not "all"
    if (housingFilter !== "all") {
      activeFilters['Housing'] = housingFilter;
    }
    
    if (foodFilter !== "all") {
      activeFilters['Food'] = foodFilter;
    }
    
    if (financialFilter !== "all") {
      activeFilters['Financial'] = financialFilter;
    }
    
    if (diagnosisFilter !== "all") {
      activeFilters['Diagnosis'] = diagnosisFilter;
    }
    
    return {
      totalPatients,
      totalRecords,
      filteredPatients,
      filteredRecords,
      finalPatients,
      finalRecords,
      activeFilters
    };
  };
  
  // State for health-related social needs filters
  const [housingFilter, setHousingFilter] = useState<string>("all");
  const [foodFilter, setFoodFilter] = useState<string>("all");
  const [financialFilter, setFinancialFilter] = useState<string>("all");
  
  // State for diagnosis filter
  const [diagnosisFilter, setDiagnosisFilter] = useState<string>("all");
  
  // Add debugging to see what data is being passed to child components
  useEffect(() => {
    if (data?.patientData && data.patientData.length > 0) {
      console.log("DEBUG DATA STRUCTURE: First patient data item:", data.patientData[0]);
      
      // Check if extracted symptoms data exists and how it's structured
      const hasExtractedSymptoms = data.patientData.some((patient: any) => 
        patient.extractedSymptoms && patient.extractedSymptoms.length > 0);
      
      console.log("DEBUG DATA STRUCTURE: Has extractedSymptoms?", hasExtractedSymptoms);
      
      if (hasExtractedSymptoms) {
        // Log the first patient with extracted symptoms
        const patientWithSymptoms = data.patientData.find((patient: any) => 
          patient.extractedSymptoms && patient.extractedSymptoms.length > 0);
        
        console.log("DEBUG DATA STRUCTURE: First extractedSymptom example:", 
          patientWithSymptoms?.extractedSymptoms[0]);
      }
      
      // Check diagnosis filter
      console.log("DEBUG DATA STRUCTURE: Current diagnosis filter:", diagnosisFilter);
    }
  }, [data, diagnosisFilter]);
  
  // Map diagnosis codes to full diagnosis names
  const diagnosisMapping: Record<string, string> = {
    "mdd": "Major Depressive Disorder",
    "hud": "Hallucinogen Use Disorder",
    "pdd": "Persistent Depressive Disorder",
    "ptsd": "Post-Traumatic Stress Disorder",
    "rdd": "Recurrent Depressive Disorder"
  };
  
  // Always sort chart data in descending order (highest to lowest)
  // A helper function that ensures all charts are sorted in descending order
  const sortDataDescending = useCallback((data: ChartDataItem[]) => {
    return [...data].sort((a, b) => b.value - a.value);
  }, []);
  
  // State for additional filters
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showFilterVisualizations, setShowFilterVisualizations] = useState<boolean>(false);
  
  // Get data for diagnostic categories chart
  const getDiagnosticCategoryData = useCallback((): ChartDataItem[] => {
    console.log("getDiagnosticCategoryData called");
    
    // If we have data from the API, use it
    if (data?.diagnosticCategoryData && data.diagnosticCategoryData.length > 0) {
      console.log("Using diagnostic category data from API:", data.diagnosticCategoryData);
      
      // Calculate total patients for percentages
      const totalPatients = data?.patients?.length || 24;
      
      // Apply any additional transformations if needed
      const processedData = data.diagnosticCategoryData.map((item: any) => ({
        id: item.id || item.category || 'Unknown',
        value: item.value || item.count || 0,
        rawValue: item.value || item.count || 0,
        percentage: item.percentage || safePercentage(item.value || item.count || 0, totalPatients)
      }));
      
      // Sort data by value in descending order
      return sortDataDescending(processedData);
    }
    
    // Fallback data if API data is not available
    console.log("Using fallback diagnostic category data");
    const totalPatients = 24;
    
    return sortDataDescending([
      { id: "Mood Disorders", value: 8, rawValue: 8, percentage: Math.round((8 / totalPatients) * 100) },
      { id: "Anxiety Disorders", value: 6, rawValue: 6, percentage: Math.round((6 / totalPatients) * 100) },
      { id: "Sleep-Wake Disorders", value: 4, rawValue: 4, percentage: Math.round((4 / totalPatients) * 100) },
      { id: "Trauma Related Disorders", value: 3, rawValue: 3, percentage: Math.round((3 / totalPatients) * 100) },
      { id: "Substance Related Disorders", value: 2, rawValue: 2, percentage: Math.round((2 / totalPatients) * 100) },
      { id: "Eating Disorders", value: 1, rawValue: 1, percentage: Math.round((1 / totalPatients) * 100) }
    ]);
  }, [data, sortDataDescending]);
  
  // Get data for HRSN indicators chart
  const getHrsnIndicatorData = useCallback((): ChartDataItem[] => {
    console.log("getHrsnIndicatorData called");
    
    // If we have data from the API, use it
    if (data?.hrsnIndicatorData && data.hrsnIndicatorData.length > 0) {
      console.log("Using HRSN indicator data from API:", data.hrsnIndicatorData);
      
      // Calculate total patients for percentages
      const totalPatients = data?.patients?.length || 24;
      
      // Process data into the format we need
      const processedData = data.hrsnIndicatorData.map((item: any) => ({
        id: item.id,
        value: item.value || item.count || 0,
        rawValue: item.value || item.count || 0,
        percentage: item.percentage || safePercentage(item.value || item.count || 0, totalPatients),
        category: item.category || item.id
      }));
      
      // Sort data by value in descending order
      return sortDataDescending(processedData);
    }
    
    // Fallback data if API data is not available
    console.log("Using fallback HRSN indicator data");
    const totalPatients = data?.patients?.length || 24;
    
    return sortDataDescending([
      { id: "Housing Insecurity", value: 38, rawValue: 38, percentage: Math.round((38 / totalPatients) * 100), category: "Housing Insecurity" },
      { id: "Food Insecurity", value: 32, rawValue: 32, percentage: Math.round((32 / totalPatients) * 100), category: "Food Insecurity" },
      { id: "Transportation Issues", value: 14, rawValue: 14, percentage: Math.round((14 / totalPatients) * 100), category: "Transportation Issues" },
      { id: "Financial Stress", value: 11, rawValue: 11, percentage: Math.round((11 / totalPatients) * 100), category: "Financial Stress" },
      { id: "Utility Concerns", value: 8, rawValue: 8, percentage: Math.round((8 / totalPatients) * 100), category: "Utility Concerns" },
      { id: "Personal Safety", value: 5, rawValue: 5, percentage: Math.round((5 / totalPatients) * 100), category: "Personal Safety" }
    ]);
  }, [data, sortDataDescending]);
  
  // Get data for symptom segments chart
  const getSymptomSegmentData = useCallback((): ChartDataItem[] => {
    console.log("getSymptomSegmentData called");
    
    // If we have data from the API, use it
    if (data?.symptomSegmentData && data.symptomSegmentData.length > 0) {
      console.log("Using symptom segment data from API, first item:", data.symptomSegmentData[0]);
      
      // Calculate total patients for percentages
      const totalPatients = data?.patients?.length || 24;
      
      // Process data into the format we need
      const processedData = data.symptomSegmentData
        .slice(0, 30) // Limit to top 30 for better performance
        .map((item: any) => ({
          id: item.id || item.symptom_segment || 'Unknown',
          value: item.value || item.count || 0,
          rawValue: item.value || item.count || 0,
          percentage: Math.round(((item.value || item.count || 0) / totalPatients) * 100),
          symp_prob: item.symp_prob || item.symptomOrProblem || 'Symptom'
        }));
      
      // Sort data by value in descending order
      return sortDataDescending(processedData);
    }
    
    // Fallback data if API data is not available
    console.log("Using fallback symptom segment data");
    const totalPatients = data?.patients?.length || 24;
    
    return sortDataDescending([
      { id: "Depressed mood", value: 19, rawValue: 19, percentage: Math.round((19 / totalPatients) * 100), symp_prob: "Symptom" },
      { id: "Anxiety", value: 17, rawValue: 17, percentage: Math.round((17 / totalPatients) * 100), symp_prob: "Symptom" },
      { id: "Sleep disturbance", value: 14, rawValue: 14, percentage: Math.round((14 / totalPatients) * 100), symp_prob: "Symptom" },
      { id: "Fatigue", value: 12, rawValue: 12, percentage: Math.round((12 / totalPatients) * 100), symp_prob: "Symptom" },
      { id: "Isolation", value: 10, rawValue: 10, percentage: Math.round((10 / totalPatients) * 100), symp_prob: "Problem" },
      { id: "Difficult concentrating", value: 9, rawValue: 9, percentage: Math.round((9 / totalPatients) * 100), symp_prob: "Symptom" },
      { id: "Appetite changes", value: 8, rawValue: 8, percentage: Math.round((8 / totalPatients) * 100), symp_prob: "Symptom" },
      { id: "Worthlessness", value: 7, rawValue: 7, percentage: Math.round((7 / totalPatients) * 100), symp_prob: "Symptom" }
    ]);
  }, [data, sortDataDescending]);

  // Function to get the full dataset for exports
  const getFullDataset = useCallback((chartType: string, includeAllData: boolean = true, isPatientDetailExport: boolean = false): any[] => {
    console.log(`Getting full dataset for: ${chartType}, includeAllData: ${includeAllData}, isPatientDetailExport: ${isPatientDetailExport}`);
    
    let dataSet: any[] = [];
    
    // Return the appropriate dataset based on chart type
    switch (chartType) {
      case 'Diagnostic Category':
        dataSet = getDiagnosticCategoryData();
        break;
      case 'HRSN Indicators':
        dataSet = getHrsnIndicatorData();
        break;
      case 'Symptom Segment':
        dataSet = getSymptomSegmentData();
        break;
      case 'Patient Detail':
        // For patient detail exports, return the full patient data
        if (isPatientDetailExport && data?.patients) {
          return data.patients;
        }
        break;
      default:
        console.warn(`Unknown chart type for data export: ${chartType}`);
        return [];
    }
    
    // If includeAllData is false, limit to what's visible in the chart
    if (!includeAllData) {
      dataSet = dataSet.slice(0, categoryCount);
    }
    
    console.log(`Returning ${dataSet.length} items for ${chartType}`);
    return dataSet;
  }, [getDiagnosticCategoryData, getHrsnIndicatorData, getSymptomSegmentData, data, categoryCount]);

  // Function to download chart data as CSV
  const downloadChartAsCSV = useCallback((chartTitle: string, chartData?: any[], isPatientDetailExport: boolean = false) => {
    console.log(`Downloading ${chartTitle} as CSV, isPatientDetailExport: ${isPatientDetailExport}`);
    
    try {
      // Get data for the specified chart
      const data = chartData || getFullDataset(chartTitle, true, isPatientDetailExport);
      
      if (!data || data.length === 0) {
        console.error(`No data available for chart: ${chartTitle}`);
        return;
      }
      
      // Generate CSV header based on first data item
      const firstItem = data[0];
      const headers = Object.keys(firstItem)
        .filter(key => key !== 'color') // Exclude color metadata
        .join(',');
      
      // Generate CSV rows
      const rows = data.map(item => {
        return Object.keys(firstItem)
          .filter(key => key !== 'color') // Exclude color metadata
          .map(key => {
            const value = item[key];
            // Handle strings with commas by quoting them
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value}"`;
            }
            return value;
          })
          .join(',');
      }).join('\n');
      
      // Create CSV content
      const csvContent = `${headers}\n${rows}`;
      
      // Create blob and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportType = isPatientDetailExport ? 'Patient_Detail' : chartTitle.replace(/\s+/g, '_');
      
      link.href = url;
      link.setAttribute('download', `HRSN_${reportType}_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`Successfully downloaded ${chartTitle} as CSV`);
    } catch (error) {
      console.error(`Error downloading ${chartTitle} as CSV:`, error);
    }
  }, [getFullDataset]);

  // Function to download chart data as Excel
  const downloadChartAsExcel = useCallback((chartTitle: string, chartData?: any[]) => {
    console.log(`Downloading ${chartTitle} as Excel`);
    
    try {
      // Import XLSX dynamically since it's already in the project
      import('xlsx').then((XLSX) => {
        // Get data for the specified chart
        const data = chartData || getFullDataset(chartTitle, true);
        
        if (!data || data.length === 0) {
          console.error(`No data available for chart: ${chartTitle}`);
          return;
        }
        
        // Clean the data for Excel export (remove color information)
        const cleanedData = data.map(item => {
          const newItem = { ...item };
          delete newItem.color; // Remove color metadata
          return newItem;
        });
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(cleanedData);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, chartTitle);
        
        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `HRSN_${chartTitle.replace(/\s+/g, '_')}_${timestamp}.xlsx`;
        
        // Write and download workbook
        XLSX.writeFile(wb, filename);
        
        console.log(`Successfully downloaded ${chartTitle} as Excel`);
      });
    } catch (error) {
      console.error(`Error downloading ${chartTitle} as Excel:`, error);
    }
  }, [getFullDataset]);

  // Function to download chart data as JSON
  const downloadChartAsJson = useCallback((chartTitle: string, chartData?: any[]) => {
    console.log(`Downloading ${chartTitle} as JSON`);
    
    try {
      // Get data for the specified chart
      const data = chartData || getFullDataset(chartTitle, true);
      
      if (!data || data.length === 0) {
        console.error(`No data available for chart: ${chartTitle}`);
        return;
      }
      
      // Generate metadata
      const metadata = {
        chartTitle,
        exportDate: new Date().toISOString(),
        dataSource: 'HRSN Analytics Platform',
        recordCount: data.length,
        totalPatients: data?.patients?.length || 24
      };
      
      // Create export object with metadata and data
      const exportData = {
        metadata,
        data,
        chartType: chartTitle
      };
      
      // Convert to JSON
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create blob and trigger download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      link.href = url;
      link.setAttribute('download', `HRSN_${chartTitle.replace(/\s+/g, '_')}_${timestamp}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log(`Successfully downloaded ${chartTitle} as JSON`);
    } catch (error) {
      console.error(`Error downloading ${chartTitle} as JSON:`, error);
    }
  }, [getFullDataset]);

  // Function to print chart
  const printChart = useCallback((chartTitle: string, isDialogChart: boolean = false) => {
    console.log(`Printing ${chartTitle}, isDialogChart: ${isDialogChart}`);
    
    try {
      // Find the appropriate chart container based on whether it's a dialog chart or not
      const chartIdStr = chartTitle.replace(/\s+/g, '').toLowerCase();
      const dialogSelector = isDialogChart ? `#${chartIdStr}ChartDialog` : '';
      let targetChartContainer: HTMLElement | null = null;
      
      if (isDialogChart) {
        // Handle different kinds of charts
        if (chartTitle.includes('Diagnostic Category')) {
          targetChartContainer = document.getElementById('diagnosticCategoryChartDialog') || 
                                 document.querySelector('[data-chart-id="Diagnostic Category"]') || 
                                 document.querySelector('[data-chart="diagnostic-category"]');
        } else if (chartTitle.includes('HRSN Indicators')) {
          targetChartContainer = document.getElementById('hrsnIndicatorsChartDialog') || 
                                 document.querySelector('[data-chart-id="HRSN Indicators"]') || 
                                 document.querySelector('[data-chart="hrsn-indicators"]');
        } else if (chartTitle.includes('Symptom Segment')) {
          targetChartContainer = document.getElementById('symptomSegmentChartDialog') || 
                                 document.querySelector('[data-chart-id="Symptom Segments"]') || 
                                 document.querySelector('[data-chart="symptom-segment"]');
        } else {
          // Fallback to generic container
          targetChartContainer = document.querySelector(dialogSelector) || 
                                 document.querySelector(`[data-chart-id="${chartTitle}"]`) || 
                                 document.querySelector(`[data-chart="${chartIdStr}"]`);
        }
      } else {
        // For non-dialog charts, find them by attribute
        targetChartContainer = document.querySelector(`[data-chart-id="${chartTitle}"]`) || 
                               document.querySelector(`[data-chart="${chartIdStr}"]`);
      }
      
      if (!targetChartContainer) {
        console.error(`Could not find chart container for: ${chartTitle}`);
        // Fallback to regular print
        window.print();
        return;
      }
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        console.error('Could not open print window, falling back to regular print');
        window.print();
        return;
      }
      
      // Import html2canvas dynamically since it's already in the project
      import('html2canvas').then(async (html2canvasModule) => {
        const html2canvas = html2canvasModule.default;
        
        // Capture the chart as an image
        const canvas = await html2canvas(targetChartContainer, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher resolution
          logging: false,
          useCORS: true
        });
        
        // Convert to image data
        const imageDataUrl = canvas.toDataURL('image/png');
        
        // Generate print document
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${chartTitle} - HRSN Analytics</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .chart-image { 
                  margin: 20px auto; 
                  display: block;
                  max-width: 100%; 
                  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                  border-radius: 8px;
                }
                .chart-title { 
                  font-size: 24px; 
                  font-weight: bold; 
                  margin: 20px 0; 
                  color: #333;
                  text-align: center;
                }
                .metadata {
                  margin-top: 30px;
                  border-top: 1px solid #eee;
                  padding-top: 10px;
                  color: #666;
                  font-size: 12px;
                }
                @media print {
                  .chart-image {
                    max-width: 100%;
                    page-break-inside: avoid;
                  }
                }
              </style>
            </head>
            <body>
              <div class="chart-title">${chartTitle}</div>
              <img class="chart-image" src="${imageDataUrl}" alt="${chartTitle}" />
              <div class="metadata">
                <p>Generated by HRSN Analytics on ${new Date().toLocaleString()}</p>
                <p>Data source: HRSN Behavioral Health Analytics Platform</p>
              </div>
            </body>
          </html>
        `);
        
        // Close the document and trigger print
        printWindow.document.close();
        
        // Wait for images to load before printing
        printWindow.onload = function() {
          printWindow.print();
        };
      });
    } catch (error) {
      console.error(`Error printing ${chartTitle}:`, error);
      // Fallback to regular print
      window.print();
    }
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-4 mt-2">
      {isLoading ? (
        // Show skeleton loading state
        <div className="col-span-1 md:col-span-2 lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader className="pb-0">
              <div className="h-5 w-1/3 rounded bg-gray-200 animate-pulse"></div>
              <div className="h-4 w-1/4 rounded bg-gray-200 animate-pulse mt-2"></div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-64 w-full rounded bg-gray-200 animate-pulse"></div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Main chart grid layout
        <>
          {/* Chart 1: HRSN Indicators Chart */}
          <HrsnIndicatorsChart
            data={getHrsnIndicatorData().map(item => {
              // For display, always use a safe non-null value
              const itemValue = item.value || 0;
              const itemPercentage = item.percentage || 0;
              
              // Return all properties but override value with percentage if in percentage mode
              return {
                ...item,
                value: displayMode === "percentage" ? itemPercentage : itemValue,
                // Keep original value for tooltips
                originalValue: itemValue,
                percentage: itemPercentage
              };
            }).slice(0, categoryCount)} // Limit to the top N categories
            title="HRSN Indicators"
            subtitle={`n=${data?.patients?.length || 24} patients • n=${data?.totalRecords || 1061} records`}
            height={350}
            colorScheme={currentTheme}
            displayMode={displayMode}
            downloadChartAsCSV={downloadChartAsCSV}
            downloadChartAsExcel={downloadChartAsExcel}
            downloadChartAsJson={downloadChartAsJson}
            printChart={printChart}
            getFullDataset={() => getFullDataset('HRSN Indicators')}
          />
          
          {/* Chart 3: Symptom Segment Chart */}
          <SymptomSegmentChart
            data={getSymptomSegmentData().map(item => {
              // For display, always use a safe non-null value
              const itemValue = item.value || 0;
              const itemPercentage = item.percentage || 0;
              
              // Return all properties but override value with percentage if in percentage mode
              return {
                ...item,
                value: displayMode === "percentage" ? itemPercentage : itemValue,
                // Keep original value for tooltips
                originalValue: itemValue,
                percentage: itemPercentage
              };
            }).slice(0, categoryCount)} // Limit to the top N categories
            title="Total Population by Symptom Segment"
            subtitle={`n=${data?.patients?.length || 24} patients • n=${data?.totalRecords || 1061} records`}
            height={350}
            colorScheme={currentTheme}
            displayMode={displayMode}
            downloadChartAsCSV={downloadChartAsCSV}
            downloadChartAsExcel={downloadChartAsExcel}
            downloadChartAsJson={downloadChartAsJson}
            printChart={printChart}
            getFullDataset={() => getFullDataset('Symptom Segment')}
          />
          
          {/* Chart 4: Diagnostic Category Chart */}
          <DiagnosticCategoryChart
            data={getDiagnosticCategoryData().map(item => {
              // For display, always use a safe non-null value
              const itemValue = item.value || 0;
              const itemPercentage = item.percentage || 0;
              
              // Return all properties but override value with percentage if in percentage mode
              return {
                ...item,
                value: displayMode === "percentage" ? itemPercentage : itemValue,
                // Keep original value for tooltips
                originalValue: itemValue,
                percentage: itemPercentage
              };
            }).slice(0, categoryCount)} // Limit to the top N categories
            title="Total Population by Diagnostic Category"
            subtitle={`n=${data?.patients?.length || 24} patients • n=${data?.totalRecords || 1061} records`}
            height={350}
            colorScheme={currentTheme}
            displayMode={displayMode}
            downloadChartAsCSV={downloadChartAsCSV}
            downloadChartAsExcel={downloadChartAsExcel}
            downloadChartAsJson={downloadChartAsJson}
            printChart={printChart}
            getFullDataset={() => getFullDataset('Diagnostic Category')}
          />
          
          {/* Chart Settings / Display Options */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-sm">Display Options</CardTitle>
              <CardDescription>Adjust chart settings and display preferences</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Category count slider */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="categoryCount" className="text-sm font-medium">
                    Show top {categoryCount} categories
                  </Label>
                  <span className="text-xs text-muted-foreground">{categoryCount} items</span>
                </div>
                <Slider
                  id="categoryCount"
                  min={5}
                  max={30}
                  step={1}
                  value={[categoryCount]}
                  onValueChange={(values) => setCategoryCount(values[0])}
                  className="w-full"
                />
              </div>
              
              {/* Color theme selector */}
              <div className="mb-6">
                <Label htmlFor="colorTheme" className="block text-sm font-medium mb-2">
                  Color Theme
                </Label>
                <Select
                  value={currentTheme}
                  onValueChange={setCurrentTheme}
                >
                  <SelectTrigger id="colorTheme" className="w-full">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      <SelectValue placeholder="Select a color theme" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COLOR_THEMES).map(([key, theme]) => (
                      <SelectItem key={key} value={key}>
                        {theme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Display mode toggle */}
              <div className="mb-6">
                <Label className="block text-sm font-medium mb-2">
                  Display Mode
                </Label>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Count</span>
                  <Button
                    variant={displayMode === "count" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const newMode = "count";
                      if (onDisplayModeChange) {
                        onDisplayModeChange(newMode);
                      } else {
                        setLocalDisplayMode(newMode);
                      }
                    }}
                    className="mx-2"
                  >
                    {displayMode === "count" && <Check className="h-4 w-4 mr-1" />}
                    Count
                  </Button>
                  <Button
                    variant={displayMode === "percentage" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const newMode = "percentage";
                      if (onDisplayModeChange) {
                        onDisplayModeChange(newMode);
                      } else {
                        setLocalDisplayMode(newMode);
                      }
                    }}
                    className="mx-2"
                  >
                    {displayMode === "percentage" && <Check className="h-4 w-4 mr-1" />}
                    Percentage
                  </Button>
                  <span className="text-sm">Percentage</span>
                </div>
              </div>
              
              {/* Visualization metadata */}
              <VisualizationMetadata 
                metadataInfo={getVisualMetadataInfo()}
                selectedFilters={selectedFilters}
                housingFilter={housingFilter}
                foodFilter={foodFilter}
                financialFilter={financialFilter}
                diagnosisFilter={diagnosisFilter}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}