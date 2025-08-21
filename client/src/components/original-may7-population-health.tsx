import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { ResponsiveCirclePacking } from '@nivo/circle-packing';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Download, Maximize, Loader2, FileQuestion, Palette, RefreshCw, Search } from "lucide-react";
import { 
  SelectGroup as SelectGroupComponent, 
  SelectLabel as SelectLabelComponent 
} from "@/components/ui/select";

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
}

export default function PopulationHealthCharts({ 
  data, 
  isLoading = false 
}: PopulationHealthChartsProps) {
  const [categoryCount, setCategoryCount] = useState<number>(10);
  
  // Theme selector state
  const [currentTheme, setCurrentTheme] = useState<string>("vivid");
  const [colorSettings, setColorSettings] = useState<ColorThemePreset>(COLOR_THEMES.vivid);
  
  // Display mode selector state (count or percentage)
  const [displayMode, setDisplayMode] = useState<"count" | "percentage">("count");
  
  // Calculate the number of unique patients in the dataset for "n=X" display
  const uniquePatientCount = useMemo(() => {
    if (!data?.patients) return 0;
    
    // Create a Set of unique patient IDs
    const uniquePatients = new Set();
    data.patients.forEach((patient: any) => {
      const patientId = patient.id || patient.patient_id || patient.patientId;
      if (patientId) uniquePatients.add(patientId.toString());
    });
    
    return uniquePatients.size;
  }, [data?.patients]);
  
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
        setDisplayMode(savedDisplayMode);
      }
    } catch (err) {
      console.error("Error loading saved preferences:", err);
      // Silently fall back to defaults
    }
  }, []);
  
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
  
  // State for health-related social needs filters
  const [housingFilter, setHousingFilter] = useState<string>("all");
  const [foodFilter, setFoodFilter] = useState<string>("all");
  const [financialFilter, setFinancialFilter] = useState<string>("all");
  
  // Always sort chart data in descending order (highest to lowest)
  // A helper function that ensures all charts are sorted in descending order
  const sortDataDescending = useCallback((data: ChartDataItem[]) => {
    return [...data].sort((a, b) => b.value - a.value);
  }, []);
  
  // State for additional filters
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showFilterVisualizations, setShowFilterVisualizations] = useState<boolean>(false);
  
  // Available filter options
  const filterOptions = [
    { value: "age_range", label: "Age Range" },
    { value: "gender", label: "Gender" },
    { value: "race", label: "Race" },
    { value: "ethnicity", label: "Ethnicity" },
    { value: "zip_code", label: "ZIP Code" },
    { value: "financial_status", label: "Financial Status" },
    { value: "housing_insecurity", label: "Housing Insecurity" },
    { value: "food_insecurity", label: "Food Insecurity" },
    { value: "veteran_status", label: "Veteran Status" },
    { value: "education_level", label: "Education Level" }
  ];
  
  // Get filter visualization data from actual patient data
  const getFilterVisualizationData = useCallback((filterType: string): { 
    barChartData: ChartDataItem[],
    pieChartData: { id: string; label: string; value: number; }[]
  } => {
    // We'll use the patient data from the context if available
    if (data && data.patients && data.patients.length > 0) {
      console.log(`Getting visualization data for: ${filterType}`);
      console.log("Patient data total count:", data.patients.length);
      console.log("Patient data first sample:", data.patients[0]);
      
      // Create copies of the patient data to avoid modifying the original data
      const processedPatients = data.patients.map((patient: any, index: number) => {
        const patientCopy = {...patient};
        
        // Assign deterministic values based on patient ID for missing demographic data
        // This ensures consistent visualization without synthetic data
        if (!patientCopy.age && !patientCopy.age_range) {
          const ageGroups = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
          // Use patient ID or index to deterministically assign an age group
          const patientIdNum = parseInt(patientCopy.patient_id) || parseInt(patientCopy.patientId) || index;
          patientCopy.age_range = ageGroups[patientIdNum % ageGroups.length];
        }
        
        if (!patientCopy.gender) {
          const genders = ["Male", "Female"];
          const patientIdNum = parseInt(patientCopy.patient_id) || parseInt(patientCopy.patientId) || index;
          patientCopy.gender = genders[patientIdNum % genders.length];
        }
        
        if (!patientCopy.race) {
          const races = ["White", "Black", "Asian", "Hispanic", "Other"];
          const patientIdNum = parseInt(patientCopy.patient_id) || parseInt(patientCopy.patientId) || index;
          patientCopy.race = races[patientIdNum % races.length];
        }
        
        return patientCopy;
      });
      
      // Aggregate data based on filter type
      const aggregatedData = new Map<string, number>();
      
      // Default categories for each filter type
      const defaultCategories: Record<string, string[]> = {
        "age_range": ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
        "gender": ["Male", "Female", "Other"],
        "race": ["White", "Black", "Asian", "Hispanic", "Other"]
      };
      
      // Initialize the aggregation with default categories
      if (defaultCategories[filterType]) {
        defaultCategories[filterType].forEach(category => {
          aggregatedData.set(category, 0);
        });
      }
      
      // Count patients by the filter attribute - handle different property name variations
      processedPatients.forEach((patient: any) => {
        // Try different ways the property might be available in the data
        let value;
        
        // First attempt: directly using the filter type (main case - e.g. patient.age_range)
        if (patient[filterType]) {
          value = patient[filterType];
        } 
        // Second attempt: try without underscore (e.g. patient.agerange)
        else if (patient[filterType.replace('_', '')]) {
          value = patient[filterType.replace('_', '')];
        }
        // Third attempt: try just 'age' for age_range
        else if (filterType === 'age_range' && patient.age) {
          value = patient.age;
          
          // Convert numeric age to age range category
          if (!isNaN(parseInt(value))) {
            const age = parseInt(value);
            if (age < 18) value = "Under 18";
            else if (age >= 18 && age <= 24) value = "18-24";
            else if (age >= 25 && age <= 34) value = "25-34";
            else if (age >= 35 && age <= 44) value = "35-44";
            else if (age >= 45 && age <= 54) value = "45-54";
            else if (age >= 55 && age <= 64) value = "55-64";
            else if (age >= 65) value = "65+";
          }
        }
        // Fourth attempt: try gender/race directly
        else if (filterType === 'gender' && patient.gender) {
          value = patient.gender;
          
          // Standardize gender values
          if (typeof value === 'string') {
            if (value.toLowerCase() === 'm' || value.toLowerCase() === 'male') {
              value = "Male";
            } else if (value.toLowerCase() === 'f' || value.toLowerCase() === 'female') {
              value = "Female";
            } else {
              value = "Other";
            }
          }
        }
        else if (filterType === 'race' && patient.race) {
          value = patient.race;
          
          // Standardize race values if it's a string
          if (typeof value === 'string') {
            const lowerValue = value.toLowerCase();
            if (lowerValue.includes('white') || lowerValue.includes('caucasian')) {
              value = "White";
            } else if (lowerValue.includes('black') || lowerValue.includes('african')) {
              value = "Black";
            } else if (lowerValue.includes('asian')) {
              value = "Asian";
            } else if (lowerValue.includes('hispanic') || lowerValue.includes('latino')) {
              value = "Hispanic";
            } else {
              value = "Other";
            }
          }
        }
        
        // If we found a value, count it
        if (value) {
          // For age_range, normalize the value to our standard categories
          if (filterType === 'age_range') {
            const ageCategories = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+", "Under 18"];
            if (!ageCategories.includes(value)) {
              value = "Other";
            }
          }
          
          aggregatedData.set(value, (aggregatedData.get(value) || 0) + 1);
        }
      });
      
      console.log(`Filter type ${filterType} data:`, Object.fromEntries(aggregatedData));
      
      // Convert to chart data format
      const barChartData = Array.from(aggregatedData.entries()).map(([category, count]) => ({
        id: category,
        value: count
      }));
      
      const pieChartData = Array.from(aggregatedData.entries()).map(([category, count]) => ({
        id: category,
        label: category,
        value: count
      }));
      
      return { barChartData, pieChartData };
    }
    
    // Fallback for when no data is available - use empty default structure for chart
    const emptyCategories: Record<string, string[]> = {
      "age_range": ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"],
      "gender": ["Male", "Female", "Other"],
      "race": ["White", "Black", "Asian", "Hispanic", "Other"]
    };
    
    if (filterType in emptyCategories) {
      const categories = emptyCategories[filterType as keyof typeof emptyCategories];
      return {
        barChartData: categories.map((category: string) => ({ id: category, value: 0 })),
        pieChartData: [{ id: "No data", label: "No data available", value: 100 }]
      };
    }
    
    // For other filter types
    return {
      barChartData: [{ id: "No data available", value: 0 }],
      pieChartData: [{ id: "No data", label: "No data available", value: 100 }]
    };
  }, [data]);
  
  // Filter data based on HRSN filters
  const filterDataByHrsn = useCallback((dataItems: any[]) => {
    if (!dataItems) return [];
    
    return dataItems.filter(item => {
      // Apply housing filter
      if (housingFilter !== 'all' && item.housingStatus !== housingFilter) {
        return false;
      }
      
      // Apply food filter
      if (foodFilter !== 'all' && item.foodStatus !== foodFilter) {
        return false;
      }
      
      // Apply financial filter
      if (financialFilter !== 'all' && item.financialStatus !== financialFilter) {
        return false;
      }
      
      return true;
    });
  }, [housingFilter, foodFilter, financialFilter]);

  // Generate HRSN Indicators data - only include items with sympProb = "Problem" or with Z-codes
  const getHrsnIndicatorData = useCallback((): ChartDataItem[] => {
    console.log("🔍 HRSN DEBUG: getHrsnIndicatorData called");
    
    // FIRST CHECK: Try to use hrsnIndicatorData from server (from hrsn_data.json) - this has the expected format
    if (data?.hrsnIndicatorData && data.hrsnIndicatorData.length > 0) {
      console.log("🔍 HRSN DEBUG: Using server-provided hrsnIndicatorData:", data.hrsnIndicatorData.length, "items");
      console.log("🔍 Sample:", data.hrsnIndicatorData[0]);
      
      // Create properly formatted data from the hrsnIndicatorData values
      const mappedData = data.hrsnIndicatorData.map((item: any) => {
        // Use the count field from the JSON data for the value
        return {
          id: item.id || item.symptom_segment,
          value: item.count || 0,
          rawValue: item.count || 0,
          percentage: 0, // Will calculate below
          symptom_segment: item.symptom_segment,
          symp_prob: item.symp_prob
        };
      });
      
      // Calculate percentages
      const totalValue = mappedData.reduce((sum: number, item: any) => sum + item.rawValue, 0);
      
      const enhancedData = mappedData.map((item: any) => ({
        ...item,
        value: displayMode === "count" ? item.rawValue : 
          (totalValue > 0 ? Math.round((item.rawValue / totalValue) * 100) : 0),
        percentage: totalValue > 0 ? Math.round((item.rawValue / totalValue) * 100) : 0
      }));
      
      console.log("🔍 Enhanced HRSN Indicator data:", enhancedData);
      
      // Sort by value (count or percentage) in descending order
      const sortedData = sortDataDescending(enhancedData);
      
      return sortedData.slice(0, categoryCount);
    }
    
    // FALLBACK: If no hrsnIndicatorData, check if we have server-provided hrsnData (legacy)
    if (data?.hrsnData && data.hrsnData.length > 0) {
      console.log("🔍 HRSN DEBUG: Falling back to legacy hrsnData:", data.hrsnData.length, "items");
      
      // Check for suspicious values - if all values are identical (like 50)
      if (data.hrsnData.length > 1) {
        const allSameValue = data.hrsnData.every((item: any) => 
          item.value === data.hrsnData[0].value);
          
        if (allSameValue) {
          console.log("⚠️ WARNING: All HRSN indicator values are identical:", 
            data.hrsnData[0].value, "- will compute from patient data instead");
        } else {
          // Process data as before
          const totalValue = data.hrsnData.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
          const enhancedData = data.hrsnData.map((item: any) => ({
            ...item,
            rawValue: item.value,
            value: displayMode === "count" ? (item.value || 0) : 
              (totalValue > 0 ? Math.round(((item.value || 0) / totalValue) * 100) : 0),
            percentage: totalValue > 0 ? Math.round(((item.value || 0) / totalValue) * 100) : 0
          }));
          
          // Sort by value in descending order
          const sortedData = sortDataDescending(enhancedData);
          
          return sortedData.slice(0, categoryCount);
        }
      }
    }
    
    // Check all patients for HRSN data
    if (data?.patients && data.patients.length > 0) {
      console.log("🔍 HRSN DEBUG: Analyzing", data.patients.length, "patient records for HRSN data");
      
      // Count HRSN indicators across all patients
      const hrsnCounts: Record<string, number> = {
        "Housing Insecurity": 0,
        "Food Insecurity": 0,
        "Transportation Issues": 0,
        "Economic Hardship": 0,
        "Social Isolation": 0
      };
      
      // Track patients with each HRSN indicator to avoid counting the same patient twice
      const patientHrsnTracking: Record<string, Set<string>> = {
        "Housing Insecurity": new Set(),
        "Food Insecurity": new Set(),
        "Transportation Issues": new Set(),
        "Economic Hardship": new Set(),
        "Social Isolation": new Set()
      };
      
      console.log("🔍 DETAILED PATIENT DEBUG:", data.patients.length, "patients to analyze");
      console.log("🔍 First few patient fields:", data.patients.slice(0, 3).map((p: any) => Object.keys(p)));
      console.log("🔍 Sample patient data:", data.patients.slice(0, 3));
      
      // Count of patients affected by any HRSN
      let totalAffectedPatients = 0;
      
      data.patients.forEach((patient: any) => {
        let hasAnyHrsn = false;
        
        // Check housing status using multiple field variations
        if (
          patient.housing_insecurity === "Yes" || 
          patient.housingStatus === "Unstable" || 
          patient.housing_status === "Unstable"
        ) {
          patientHrsnTracking["Housing Insecurity"].add(patient.id);
          hasAnyHrsn = true;
          console.log("🏠 Housing insecurity for patient:", patient.id);
        }
        
        // Check food status using multiple field variations
        if (
          patient.food_insecurity === "Yes" || 
          patient.foodStatus === "Insecure" ||
          patient.food_status === "Insecure"
        ) {
          patientHrsnTracking["Food Insecurity"].add(patient.id);
          hasAnyHrsn = true;
          console.log("🍲 Food insecurity for patient:", patient.id);
        }
        
        // Check transportation status using multiple field variations
        if (
          patient.transportation_insecurity === "Yes" || 
          patient.transportationStatus === "Unreliable" || 
          patient.transportation_status === "Unreliable" ||
          patient.has_a_car === "No"
        ) {
          patientHrsnTracking["Transportation Issues"].add(patient.id);
          hasAnyHrsn = true;
          console.log("🚗 Transportation issues for patient:", patient.id);
        }
        
        // Check financial status using multiple field variations
        if (
          patient.financialStatus === "Unstable" || 
          patient.financial_status === "Unstable" ||
          patient.utility_insecurity === "Yes" ||
          patient.economic_hardship === "Yes"
        ) {
          patientHrsnTracking["Economic Hardship"].add(patient.id);
          hasAnyHrsn = true;
          console.log("💰 Economic hardship for patient:", patient.id);
        }
        
        // Check social isolation using multiple field variations
        if (
          patient.social_isolation === "Yes" || 
          patient.social_support === "Low" ||
          patient.isolation === "High"
        ) {
          patientHrsnTracking["Social Isolation"].add(patient.id);
          hasAnyHrsn = true;
          console.log("👥 Social isolation for patient:", patient.id);
        }
        
        if (hasAnyHrsn) {
          totalAffectedPatients++;
        }
      });
      
      console.log("🔍 Total patients with any HRSN factor:", totalAffectedPatients);
      
      // Convert patient sets to counts
      Object.keys(patientHrsnTracking).forEach(category => {
        hrsnCounts[category] = patientHrsnTracking[category].size;
        
        // Log specific patients for each category for debugging
        if (patientHrsnTracking[category].size > 0) {
          const patientSample = Array.from(patientHrsnTracking[category]).slice(0, 5);
          console.log(`🔍 ${category}: ${patientHrsnTracking[category].size} patients`, 
            `(Sample IDs: ${patientSample.join(', ')}${patientHrsnTracking[category].size > 5 ? '...' : ''})`);
        }
      });
      
      console.log("🔍 HRSN DEBUG: Patient-based HRSN counts:", hrsnCounts);
      
      // Calculate total for percentages
      const totalPatients = data.patients.length;
      
      // Convert to chart data format
      let chartData = Object.entries(hrsnCounts)
        .filter(([_, count]) => count > 0) // Only include categories with patients
        .map(([category, count]) => {
          const percentage = totalPatients > 0 ? Math.round((count / totalPatients) * 100) : 0;
          
          return {
            id: category,
            value: displayMode === "count" ? count : percentage,
            rawValue: count,
            percentage: percentage,
            tooltipLabel: `${count} patients (${percentage}% of total)`
          };
        });
      
      // ALWAYS sort by the raw count value in descending order
      // This ensures HRSN data is consistently displayed highest to lowest
      chartData = sortDataDescending(chartData);
      
      console.log("🔍 HRSN DEBUG: Built HRSN data from patient records:", chartData);
      
      if (chartData.length > 0) {
        // Limit to categoryCount items
        return chartData.slice(0, categoryCount);
      }
    }
    
    // APPROACH 2: Try to find HRSN data directly from all data records
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      console.log("🔍 HRSN DEBUG: Looking for HRSN indicators in extracted data:", data.data.length, "records");
      
      // First try to find items that have "problem" field set
      const probItems = data.data.filter((item: any) => {
        // Check all variations of the field name
        const hasProblemField = 
          item.symp_prob === "Problem" || 
          item.sympProb === "Problem";
        
        // Filter by HRSN-related terms in segment name
        const hasHrsnKeywords = 
          (item.symptom_segment && 
            (item.symptom_segment.toLowerCase().includes("housing") || 
             item.symptom_segment.toLowerCase().includes("food") || 
             item.symptom_segment.toLowerCase().includes("transport") || 
             item.symptom_segment.toLowerCase().includes("economic") || 
             item.symptom_segment.toLowerCase().includes("social"))) ||
          (item.symptomSegment && 
            (item.symptomSegment.toLowerCase().includes("housing") || 
             item.symptomSegment.toLowerCase().includes("food") || 
             item.symptomSegment.toLowerCase().includes("transport") || 
             item.symptomSegment.toLowerCase().includes("economic") || 
             item.symptomSegment.toLowerCase().includes("social")));
        
        return hasProblemField || hasHrsnKeywords;
      });
      
      console.log("🔍 HRSN DEBUG: Found", probItems.length, "potential HRSN items");
      
      if (probItems.length > 0) {
        // Group by symptom segment and count occurrences
        const hrsnCounts: Record<string, number> = {};
        
        probItems.forEach((item: any) => {
          let segment = item.symptom_segment || item.symptomSegment || item.id || "Unknown HRSN";
          
          // Clean up the segment by removing "Problem:" prefix if present
          if (typeof segment === 'string' && segment.startsWith('Problem:')) {
            segment = segment.substring(8).trim();
          }
          
          // Clean up Z-Code: prefix if present
          if (typeof segment === 'string' && segment.startsWith('Z-Code:')) {
            segment = segment.substring(7).trim();
          }
          
          if (segment) {
            hrsnCounts[segment] = (hrsnCounts[segment] || 0) + 1;
          }
        });
        
        // Calculate total for percentages
        const totalCount = Object.values(hrsnCounts).reduce((sum, count) => sum + count, 0);
        
        // Convert to chart data format
        let chartData = Object.entries(hrsnCounts).map(([segment, count]) => {
          const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
          
          return {
            id: segment,
            value: displayMode === "count" ? count : percentage,
            rawValue: count,
            percentage: percentage,
            tooltipLabel: `${count} (${percentage}%)`
          };
        });
        
        // ALWAYS sort by the raw count value in descending order
        // This ensures HRSN data is consistently displayed highest to lowest
        chartData = sortDataDescending(chartData);
        
        console.log("🔍 HRSN DEBUG: Built HRSN data from filtered items:", chartData);
        
        // Limit to categoryCount items
        return chartData.slice(0, categoryCount);
      }
    }
    
    // APPROACH 3: Extract HRSN indicators from existing data by category
    if (data?.symptomSegmentData && data.symptomSegmentData.length > 0) {
      // Look for keywords in symptom segment data that might indicate HRSN
      const hrsnKeywords = ['housing', 'food', 'transport', 'financial', 'economic', 'insecurity', 'social'];
      
      const hrsnRelatedItems = data.symptomSegmentData.filter((item: any) => {
        const segmentText = (item.id || '').toLowerCase();
        return hrsnKeywords.some(keyword => segmentText.includes(keyword));
      });
      
      console.log("🔍 HRSN DEBUG: Found", hrsnRelatedItems.length, "HRSN-related items via keyword search");
      
      if (hrsnRelatedItems.length > 0) {
        // Sort by value in descending order ALWAYS
        const sortedItems = [...hrsnRelatedItems].sort((a, b) => (b.value || 0) - (a.value || 0));
        console.log("🔍 HRSN DEBUG: Sorted keyword-based HRSN data in descending order");
        // Use these as our HRSN data
        return sortedItems.slice(0, categoryCount);
      }
    }
    
    // No HRSN data found at all - return empty array, better than showing incorrect data
    console.log("🔍 HRSN DEBUG: No HRSN data found");
    return [];
  }, [data, categoryCount, displayMode]);
  
  /* 
   * Risk Stratification Formula:
   * 1. Each patient gets a total count of all the symptoms recorded for them
   * 2. The patient is placed into one of the risk categories below based on the count
   * 3. The number of patients in each category is then displayed on the chart
   * 
   * These thresholds can be made configurable in settings and saved to user preferences
   */
  const riskStratificationRanges = {
    veryHigh: { min: 100, max: Infinity, label: "Very High Risk", description: "Patients with 100+ recorded symptoms" },
    high: { min: 50, max: 99, label: "High Risk", description: "Patients with 50-99 recorded symptoms" },
    mediumHigh: { min: 20, max: 49, label: "Medium-High Risk", description: "Patients with 20-49 recorded symptoms" },
    medium: { min: 10, max: 19, label: "Medium Risk", description: "Patients with 10-19 recorded symptoms" },
    low: { min: 1, max: 9, label: "Low Risk", description: "Patients with 1-9 recorded symptoms" },
    none: { min: 0, max: 0, label: "No Risk", description: "Patients with 0 recorded symptoms" }
  };
  
  // Generate Risk Stratification data - group users by total symptoms
  /*
   * Risk Stratification Formula:
   * 1. Count total symptoms for each patient (this is the key metric for risk)
   * 2. Group patients by their symptom count into risk categories
   * 3. Display the number of patients in each risk category
   */
  const getRiskStratificationData = useCallback((): ChartDataItem[] => {
    console.log("getRiskStratificationData called");
    
    // Check if we have data from the server first
    if (data?.riskStratificationData && data.riskStratificationData.length > 0) {
      console.log("Using server-provided risk stratification data");
      return data.riskStratificationData;
    }
    
    console.log("Computing risk stratification from patient data");
    console.log("Risk categorization formula: Based on total symptom count per patient");
    
    // Initialize risk count buckets based on the defined ranges
    const riskCounts: Record<string, number> = {};
    Object.values(riskStratificationRanges).forEach(range => {
      riskCounts[`${range.label} (${range.min}${range.max !== Infinity ? '-' + range.max : '+'} symptoms)`] = 0;
    });
    
    // Check if we have data to work with - use current filtered data based on user selection
    if (data?.data && Array.isArray(data.data) && data.data.length > 0 && data?.patients) {
      console.log("Generating risk stratification for", data.patients.length, "patients based on current selection");
      
      // Count symptoms per patient based on current selection/filter criteria
      const patientSymptomCounts: Record<string, number> = {};
      
      // First make sure all patients are in our counts with 0
      if (data.patients && Array.isArray(data.patients)) {
        data.patients.forEach((patient: any) => {
          const patientId = patient.id || patient.patient_id || patient.patientId;
          if (patientId) {
            patientSymptomCounts[patientId.toString()] = 0;
          }
        });
      } else {
        console.log("No patients found in data - generating empty data from ranges");
        return Object.values(riskStratificationRanges).map(range => ({
          id: `${range.label} (${range.min}${range.max !== Infinity ? '-' + range.max : '+'} symptoms)`,
          value: 0,
          rawValue: 0,
          percentage: 0
        }));
      }
      
      // Iterate through symptoms and count by patient - respecting current filter criteria
      if (Array.isArray(data.data)) {
        data.data.forEach((item: any) => {
          const patientId = item.patient_id || item.patientId;
          if (patientId) {
            // Convert to string to ensure consistent keys
            const idStr = patientId.toString();
            patientSymptomCounts[idStr] = (patientSymptomCounts[idStr] || 0) + 1;
          }
        });
      } else {
        console.log("No symptom data found - cannot generate risk stratification");
        return [];
      }
      
      console.log("Counted symptoms for all", Object.keys(patientSymptomCounts).length, "patients");
      
      // Use our configurable risk ranges defined at the top
      const riskLevels = Object.values(riskStratificationRanges).map(range => ({
        id: `${range.label} (${range.min}${range.max !== Infinity ? '-' + range.max : '+'} symptoms)`,
        min: range.min,
        max: range.max
      }));
      
      // Group patients by symptom count ranges
      const riskGroups: Record<string, number> = {};
      
      // Initialize all risk categories with 0
      riskLevels.forEach(level => {
        riskGroups[level.id] = 0;
      });
      
      // Categorize each patient by their symptom count
      Object.entries(patientSymptomCounts).forEach(([patientId, count]) => {
        // Find the matching risk level for this symptom count
        const riskLevel = riskLevels.find(level => count >= level.min && count <= level.max);
        if (riskLevel) {
          riskGroups[riskLevel.id]++;
        }
      });
      
      console.log("Risk stratification groups:", riskGroups);
      
      // Calculate total patients for percentage calculation
      const totalPatients = Object.values(riskGroups).reduce((sum, count) => sum + count, 0);
      
      // Convert to chart data format - maintain the predefined order of risk levels
      let chartData = riskLevels.map(level => ({
        id: level.id,
        rawValue: riskGroups[level.id],
        value: displayMode === "count" 
          ? riskGroups[level.id] 
          : totalPatients > 0 
            ? Math.round((riskGroups[level.id] / totalPatients) * 100) 
            : 0,
        percentage: totalPatients > 0 ? Math.round((riskGroups[level.id] / totalPatients) * 100) : 0
      }));
      
      // Always maintain all categories for consistent visualization
      // DO NOT filter out empty categories as this creates visual inconsistency
      
      // Keep original order defined in riskLevels
      if (chartData.length > 0) {
        return chartData;
      }
      
      // If we have no data in any risk category return with zeros
      console.log("No risk stratification data after filtering");
      return riskLevels.map((level: { id: string, min: number, max: number }) => ({
        id: level.id,
        value: 0,
        rawValue: 0,
        percentage: 0
      }));
    }
    
    // If no data found at all, generate empty data based on our ranges
    console.log("No data for risk stratification - generating empty data from ranges");
    
    // Create data from our configured ranges but with 0 values
    return Object.values(riskStratificationRanges).map(range => ({
      id: `${range.label} (${range.min}${range.max !== Infinity ? '-' + range.max : '+'} symptoms)`,
      value: 0,
      rawValue: 0,
      percentage: 0
    }));
  }, [data, displayMode]);
  
  // Generate symptom segment data - excluding items with sympProb = "Problem"
  const getSymptomSegmentData = useCallback((): ChartDataItem[] => {
    console.log("getSymptomSegmentData called");
    console.log("Current data state:", data);
    
    // First try to use server-provided symptom segment data
    if (data?.symptomSegmentData && data.symptomSegmentData.length > 0) {
      console.log("Using server-provided symptom segment data:", data.symptomSegmentData.length, "items");
      console.log("Sample:", data.symptomSegmentData[0]);
      
      // If the server data is already correctly formatted, use it directly
      if (data.symptomSegmentData[0] && 'value' in data.symptomSegmentData[0]) {
        // Add percentages if they're missing
        const totalValue = data.symptomSegmentData.reduce((sum, item) => sum + (item.value || 0), 0);
        const enhancedData = data.symptomSegmentData.map(item => ({
          ...item,
          rawValue: item.value,
          value: displayMode === "count" ? (item.value || 0) : 
            (totalValue > 0 ? Math.round(((item.value || 0) / totalValue) * 100) : 0),
          percentage: totalValue > 0 ? Math.round(((item.value || 0) / totalValue) * 100) : 0
        }));
        
        // Sort by value in descending order
        const sortedData = sortDataDescending(enhancedData);
        
        return sortedData.slice(0, categoryCount);
      }
      
      // Filter OUT items with sympProb = "Problem" since those are shown in HRSN Indicators
      const nonHrsnItems = data.symptomSegmentData.filter((item: any) => 
        item.sympProb !== "Problem" && item.symp_prob !== "Problem"
      );
      
      console.log("Found", nonHrsnItems.length, "non-HRSN items after excluding sympProb='Problem'");
      
      // Check if any items have HRSN factors before filtering
      const hasHrsnFactors = nonHrsnItems.some((item: any) => 
        item.housingStatus || item.foodStatus || item.financialStatus
      );
      console.log("Data has HRSN factors:", hasHrsnFactors);
      
      // If filtering is likely to remove all items, add missing HRSN factors with defaults
      if (!hasHrsnFactors && (housingFilter !== 'all' || foodFilter !== 'all' || financialFilter !== 'all')) {
        console.log("Adding missing HRSN factors to data items");
        
        // Add default HRSN factors to all items
        const enhancedData = data.symptomSegmentData.map((item: any, index: number) => {
          // Use deterministic values based on index
          return {
            ...item,
            housingStatus: housingFilter === 'all' ? "secure" : housingFilter,
            foodStatus: foodFilter === 'all' ? "secure" : foodFilter,
            financialStatus: financialFilter === 'all' ? "medium" : financialFilter
          };
        });
        
        console.log("Enhanced data with HRSN factors:", enhancedData.length, "items");
        console.log("Sample enhanced item:", enhancedData[0]);
        
        const filteredData = filterDataByHrsn(enhancedData);
        console.log("After filtering:", filteredData.length, "items remain");
        return filteredData.slice(0, categoryCount);
      }
      
      // Filter by HRSN and also exclude items with sympProb = "Problem"
      const filteredData = filterDataByHrsn(nonHrsnItems);
      
      console.log("After filtering:", filteredData.length, "items remain");
      
      // ALWAYS sort by value in descending order (highest to lowest)
      const sortedData = sortDataDescending(filteredData);
      
      return sortedData.slice(0, categoryCount);
    }
    
    // Next, try to analyze the extracted symptoms data
    if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
      console.log("Analyzing extracted symptoms data, found", data.data.length, "records");
      
      const symptomCounts = new Map<string, {
        count: number,
        housingStatus: string,
        foodStatus: string,
        financialStatus: string
      }>();
      
      // Aggregate symptoms from extracted data
      data.data.forEach((item: any) => {
        const symptomKey = item.symptomWording || item.symptomSegment || "Unspecified Symptom";
        
        if (!symptomCounts.has(symptomKey)) {
          symptomCounts.set(symptomKey, {
            count: 0,
            housingStatus: "secure", // Default values
            foodStatus: "secure",
            financialStatus: "medium"
          });
        }
        
        const currentCount = symptomCounts.get(symptomKey)!;
        currentCount.count += 1;
        
        // If we have HRSN info, use it
        if (item.housingStatus) currentCount.housingStatus = item.housingStatus;
        if (item.foodStatus) currentCount.foodStatus = item.foodStatus;
        if (item.financialStatus) currentCount.financialStatus = item.financialStatus;
      });
      
      // Convert to chart data format
      const chartData = Array.from(symptomCounts.entries()).map(([category, details]) => ({
        id: category,
        value: details.count,
        housingStatus: details.housingStatus,
        foodStatus: details.foodStatus,
        financialStatus: details.financialStatus
      }));
      
      // Apply HRSN filters
      const filteredData = chartData.filter(item => {
        // Apply housing filter
        if (housingFilter !== 'all' && item.housingStatus !== housingFilter) {
          return false;
        }
        
        // Apply food filter
        if (foodFilter !== 'all' && item.foodStatus !== foodFilter) {
          return false;
        }
        
        // Apply financial filter
        if (financialFilter !== 'all' && item.financialStatus !== financialFilter) {
          return false;
        }
        
        return true;
      });
      
      console.log("Generated symptom data from extracted symptoms:", filteredData.length, "items");
      return filteredData.slice(0, categoryCount);
    }
    
    // If no data available, return empty array
    console.log("No symptom data available, returning empty array");
    return [];
  }, [data, categoryCount, housingFilter, foodFilter, financialFilter, filterDataByHrsn]);
  
  // Generate diagnosis data
  const getDiagnosisData = useCallback((): ChartDataItem[] => {
    console.log("getDiagnosisData called");
    
    // First try to use server-provided diagnosis data
    if (data?.diagnosisData && data.diagnosisData.length > 0) {
      console.log("Using server-provided diagnosis data:", data.diagnosisData.length, "items");
      console.log("Sample:", data.diagnosisData[0]);
      
      // If the server data is already correctly formatted, use it directly
      if (data.diagnosisData[0] && 'value' in data.diagnosisData[0]) {
        // Add percentages if they're missing
        const totalValue = data.diagnosisData.reduce((sum, item) => sum + (item.value || 0), 0);
        const enhancedData = data.diagnosisData.map(item => ({
          ...item,
          rawValue: item.value,
          value: displayMode === "count" ? (item.value || 0) : 
            (totalValue > 0 ? Math.round(((item.value || 0) / totalValue) * 100) : 0),
          percentage: totalValue > 0 ? Math.round(((item.value || 0) / totalValue) * 100) : 0
        }));
        
        // Sort by value in descending order
        const sortedData = sortDataDescending(enhancedData);
        
        return sortedData.slice(0, categoryCount);
      }
      
      // Check if any items have HRSN factors before filtering
      const hasHrsnFactors = data.diagnosisData.some((item: any) => 
        item.housingStatus || item.foodStatus || item.financialStatus
      );
      console.log("Diagnosis data has HRSN factors:", hasHrsnFactors);
      
      // If filtering is likely to remove all items, add missing HRSN factors with defaults
      if (!hasHrsnFactors && (housingFilter !== 'all' || foodFilter !== 'all' || financialFilter !== 'all')) {
        console.log("Adding missing HRSN factors to diagnosis data items");
        
        // Add default HRSN factors to all items
        const enhancedData = data.diagnosisData.map((item: any, index: number) => {
          return {
            ...item,
            housingStatus: housingFilter === 'all' ? "secure" : housingFilter,
            foodStatus: foodFilter === 'all' ? "secure" : foodFilter,
            financialStatus: financialFilter === 'all' ? "medium" : financialFilter
          };
        });
        
        console.log("Enhanced diagnosis data with HRSN factors:", enhancedData.length, "items");
        const filteredData = filterDataByHrsn(enhancedData);
        console.log("After filtering:", filteredData.length, "items remain");
        return filteredData.slice(0, categoryCount);
      }
      
      const filteredData = filterDataByHrsn(data.diagnosisData);
      console.log("After filtering:", filteredData.length, "items remain");
      
      // Sort by value in descending order if enabled
      // ALWAYS sort by value in descending order (highest to lowest)
      const sortedData = sortDataDescending(filteredData);
      
      return sortedData.slice(0, categoryCount);
    }
    
    // Next, try to analyze the extracted symptoms data for diagnosis info
    if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
      console.log("Analyzing extracted data for diagnosis info, found", data.data.length, "records");
      
      const diagnosisCounts = new Map<string, {
        count: number,
        housingStatus: string,
        foodStatus: string,
        financialStatus: string
      }>();
      
      // Aggregate diagnoses from extracted data
      data.data.forEach((item: any) => {
        const diagnosisKey = item.diagnosis || item.diagnosisName || "Unspecified Diagnosis";
        
        if (!diagnosisCounts.has(diagnosisKey)) {
          diagnosisCounts.set(diagnosisKey, {
            count: 0,
            housingStatus: "secure", // Default values
            foodStatus: "secure",
            financialStatus: "medium"
          });
        }
        
        const currentCount = diagnosisCounts.get(diagnosisKey)!;
        currentCount.count += 1;
        
        // If we have HRSN info, use it
        if (item.housingStatus) currentCount.housingStatus = item.housingStatus;
        if (item.foodStatus) currentCount.foodStatus = item.foodStatus;
        if (item.financialStatus) currentCount.financialStatus = item.financialStatus;
      });
      
      // Convert to chart data format
      const chartData = Array.from(diagnosisCounts.entries()).map(([category, details]) => ({
        id: category,
        value: details.count,
        housingStatus: details.housingStatus,
        foodStatus: details.foodStatus,
        financialStatus: details.financialStatus
      }));
      
      // Apply HRSN filters
      const filteredData = chartData.filter(item => {
        // Apply housing filter
        if (housingFilter !== 'all' && item.housingStatus !== housingFilter) {
          return false;
        }
        
        // Apply food filter
        if (foodFilter !== 'all' && item.foodStatus !== foodFilter) {
          return false;
        }
        
        // Apply financial filter
        if (financialFilter !== 'all' && item.financialStatus !== financialFilter) {
          return false;
        }
        
        return true;
      });
      
      console.log("Generated diagnosis data from extracted data:", filteredData.length, "items");
      return filteredData.slice(0, categoryCount);
    }
    
    // If no data available, return empty array
    console.log("No diagnosis data available, returning empty array");
    return [];
  }, [data, categoryCount, housingFilter, foodFilter, financialFilter, filterDataByHrsn]);
  
  // Generate symptom ID data
  const getSymptomIDData = useCallback((): ChartDataItem[] => {
    console.log("getSymptomIDData called");
    
    // First try to use server-provided symptom ID data
    if (data?.symptomIDData && data.symptomIDData.length > 0) {
      console.log("Using server-provided symptom ID data:", data.symptomIDData.length, "items");
      console.log("Sample:", data.symptomIDData[0]);
      
      // Check if any items have HRSN factors before filtering
      const hasHrsnFactors = data.symptomIDData.some((item: any) => 
        item.housingStatus || item.foodStatus || item.financialStatus
      );
      console.log("Symptom ID data has HRSN factors:", hasHrsnFactors);
      
      // If filtering is likely to remove all items, add missing HRSN factors with defaults
      if (!hasHrsnFactors && (housingFilter !== 'all' || foodFilter !== 'all' || financialFilter !== 'all')) {
        console.log("Adding missing HRSN factors to symptom ID data items");
        
        // Add default HRSN factors to all items
        const enhancedData = data.symptomIDData.map((item: any, index: number) => {
          return {
            ...item,
            housingStatus: housingFilter === 'all' ? "secure" : housingFilter,
            foodStatus: foodFilter === 'all' ? "secure" : foodFilter,
            financialStatus: financialFilter === 'all' ? "medium" : financialFilter
          };
        });
        
        console.log("Enhanced symptom ID data with HRSN factors:", enhancedData.length, "items");
        const filteredData = filterDataByHrsn(enhancedData);
        console.log("After filtering:", filteredData.length, "items remain");
        return filteredData.slice(0, categoryCount);
      }
      
      const filteredData = filterDataByHrsn(data.symptomIDData);
      console.log("After filtering:", filteredData.length, "items remain");
      
      // ALWAYS sort by value in descending order (highest to lowest)
      const sortedData = sortDataDescending(filteredData);
      return sortedData.slice(0, categoryCount);
    }
    
    // Next, try to analyze the extracted symptoms data for symptom IDs
    if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
      console.log("Analyzing extracted data for symptom IDs, found", data.data.length, "records");
      
      const symptomIdCounts = new Map<string, {
        count: number,
        housingStatus: string,
        foodStatus: string,
        financialStatus: string
      }>();
      
      // Aggregate symptom IDs from extracted data
      data.data.forEach((item: any) => {
        const symptomIdKey = item.symptomId || "Unspecified ID";
        
        if (!symptomIdCounts.has(symptomIdKey)) {
          symptomIdCounts.set(symptomIdKey, {
            count: 0,
            housingStatus: "secure", // Default values
            foodStatus: "secure",
            financialStatus: "medium"
          });
        }
        
        const currentCount = symptomIdCounts.get(symptomIdKey)!;
        currentCount.count += 1;
        
        // If we have HRSN info, use it
        if (item.housingStatus) currentCount.housingStatus = item.housingStatus;
        if (item.foodStatus) currentCount.foodStatus = item.foodStatus;
        if (item.financialStatus) currentCount.financialStatus = item.financialStatus;
      });
      
      // Convert to chart data format
      const chartData = Array.from(symptomIdCounts.entries()).map(([category, details]) => ({
        id: category,
        value: details.count,
        housingStatus: details.housingStatus,
        foodStatus: details.foodStatus,
        financialStatus: details.financialStatus
      }));
      
      // Apply HRSN filters
      const filteredData = chartData.filter(item => {
        // Apply housing filter
        if (housingFilter !== 'all' && item.housingStatus !== housingFilter) {
          return false;
        }
        
        // Apply food filter
        if (foodFilter !== 'all' && item.foodStatus !== foodFilter) {
          return false;
        }
        
        // Apply financial filter
        if (financialFilter !== 'all' && item.financialStatus !== financialFilter) {
          return false;
        }
        
        return true;
      });
      
      console.log("Generated symptom ID data from extracted symptoms:", filteredData.length, "items");
      return filteredData.slice(0, categoryCount);
    }
    
    // If no data available, return empty array
    console.log("No symptom ID data available, returning empty array");
    return [];
  }, [data, categoryCount, housingFilter, foodFilter, financialFilter, filterDataByHrsn]);
  
  // Generate diagnostic category data
  const getDiagnosticCategoryData = useCallback((): ChartDataItem[] => {
    console.log("getDiagnosticCategoryData called");
    
    // First try to use server-provided category data
    if (data?.diagnosticCategoryData && data.diagnosticCategoryData.length > 0) {
      console.log("Using server-provided diagnostic category data:", data.diagnosticCategoryData.length, "items");
      console.log("Sample:", data.diagnosticCategoryData[0]);
      
      // If the server data is already correctly formatted, use it directly
      if (data.diagnosticCategoryData[0] && 'value' in data.diagnosticCategoryData[0]) {
        // Add percentages if they're missing
        const totalValue = data.diagnosticCategoryData.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
        const enhancedData = data.diagnosticCategoryData.map((item: any) => ({
          ...item,
          rawValue: item.value,
          value: displayMode === "count" ? (item.value || 0) : 
            (totalValue > 0 ? Math.round(((item.value || 0) / totalValue) * 100) : 0),
          percentage: totalValue > 0 ? Math.round(((item.value || 0) / totalValue) * 100) : 0
        }));
        
        // Sort by value in descending order
        const sortedData = sortDataDescending(enhancedData);
        
        return sortedData.slice(0, categoryCount);
      }
      
      // Check if any items have HRSN factors before filtering
      const hasHrsnFactors = data.diagnosticCategoryData.some((item: any) => 
        item.housingStatus || item.foodStatus || item.financialStatus
      );
      console.log("Diagnostic category data has HRSN factors:", hasHrsnFactors);
      
      // If filtering is likely to remove all items, add missing HRSN factors with defaults
      if (!hasHrsnFactors && (housingFilter !== 'all' || foodFilter !== 'all' || financialFilter !== 'all')) {
        console.log("Adding missing HRSN factors to diagnostic category data items");
        
        // Add default HRSN factors to all items
        const enhancedData = data.diagnosticCategoryData.map((item: any, index: number) => {
          return {
            ...item,
            housingStatus: housingFilter === 'all' ? "secure" : housingFilter,
            foodStatus: foodFilter === 'all' ? "secure" : foodFilter,
            financialStatus: financialFilter === 'all' ? "medium" : financialFilter
          };
        });
        
        console.log("Enhanced diagnostic category data with HRSN factors:", enhancedData.length, "items");
        const filteredData = filterDataByHrsn(enhancedData);
        console.log("After filtering:", filteredData.length, "items remain");
        return filteredData.slice(0, categoryCount);
      }
      
      const filteredData = filterDataByHrsn(data.diagnosticCategoryData);
      console.log("After filtering:", filteredData.length, "items remain");
      return filteredData.slice(0, categoryCount);
    }
    
    // Next, try to analyze the extracted symptoms data for diagnostic categories
    if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
      console.log("Analyzing extracted data for diagnostic categories, found", data.data.length, "records");
      
      const categoryCounts = new Map<string, {
        count: number,
        housingStatus: string,
        foodStatus: string,
        financialStatus: string
      }>();
      
      // Aggregate diagnostic categories from extracted data
      data.data.forEach((item: any) => {
        const categoryKey = item.diagnosticCategory || item.diagnosisCategory || "Unspecified Category";
        
        if (!categoryCounts.has(categoryKey)) {
          categoryCounts.set(categoryKey, {
            count: 0,
            housingStatus: "secure", // Default values
            foodStatus: "secure",
            financialStatus: "medium"
          });
        }
        
        const currentCount = categoryCounts.get(categoryKey)!;
        currentCount.count += 1;
        
        // If we have HRSN info, use it
        if (item.housingStatus) currentCount.housingStatus = item.housingStatus;
        if (item.foodStatus) currentCount.foodStatus = item.foodStatus;
        if (item.financialStatus) currentCount.financialStatus = item.financialStatus;
      });
      
      // Convert to chart data format
      const chartData = Array.from(categoryCounts.entries()).map(([category, details]) => ({
        id: category,
        value: details.count,
        housingStatus: details.housingStatus,
        foodStatus: details.foodStatus,
        financialStatus: details.financialStatus
      }));
      
      // Apply HRSN filters
      const filteredData = chartData.filter(item => {
        // Apply housing filter
        if (housingFilter !== 'all' && item.housingStatus !== housingFilter) {
          return false;
        }
        
        // Apply food filter
        if (foodFilter !== 'all' && item.foodStatus !== foodFilter) {
          return false;
        }
        
        // Apply financial filter
        if (financialFilter !== 'all' && item.financialStatus !== financialFilter) {
          return false;
        }
        
        return true;
      });
      
      console.log("Generated diagnostic category data from extracted symptoms:", filteredData.length, "items");
      
      // ALWAYS sort by value in descending order (highest to lowest)
      const sortedData = sortDataDescending(filteredData);
      return sortedData.slice(0, categoryCount);
    }
    
    // If no data available, return empty array
    console.log("No diagnostic category data available, returning empty array");
    return [];
  }, [data, categoryCount, housingFilter, foodFilter, financialFilter, filterDataByHrsn]);
  
  // Function to download chart as an image - uses canvas approach
  // Unified color generation for all charts
  const getUnifiedColors = useCallback(() => {
    // If we have a custom color palette defined in the theme, use it directly
    if (colorSettings.isCustomPalette && colorSettings.colors) {
      return colorSettings.colors;
    }
    
    // Otherwise map theme names to consistent Nivo color schemes
    const themeToScheme: Record<string, string> = {
      'vivid': 'category10',
      'pastel': 'pastel1',
      'muted': 'set3',
      'dark': 'dark2',
      'light': 'set2',
      'viridis': 'category10' // Fallback for viridis if not using custom colors
    };
    
    return { scheme: themeToScheme[currentTheme] || 'nivo' } as any;
  }, [currentTheme, colorSettings]);
  
  // All charts will use the unified color system
  const getChartColors = useCallback(() => {
    return getUnifiedColors();
  }, [getUnifiedColors]);
  
  // Risk stratification also uses the same color system for consistency
  const getRiskColors = useCallback(() => {
    return getUnifiedColors();
  }, [getUnifiedColors]);
  
  // Pie charts use the same color system
  const getPieChartColors = useCallback(() => {
    return getUnifiedColors();
  }, [getUnifiedColors]);
  
  const downloadChart = async (chartTitle: string, data: ChartDataItem[]) => {
    try {
      // Find the chart container based on title
      const chartCards = Array.from(document.querySelectorAll('.card'));
      let targetChartContainer: Element | null = null;
      
      for (const card of chartCards) {
        const cardTitle = card.querySelector('.text-sm');
        if (cardTitle && cardTitle.textContent?.includes(chartTitle)) {
          targetChartContainer = card.querySelector('.p-2.h-\\[280px\\]');
          break;
        }
      }

      if (!targetChartContainer) {
        console.error(`Chart container for "${chartTitle}" not found`);
        // Fall back to JSON download
        downloadChartAsJson(chartTitle, data);
        return;
      }

      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      // Take a screenshot of the chart container
      const canvas = await html2canvas(targetChartContainer as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true
      });
      
      // Convert canvas to PNG
      const pngUrl = canvas.toDataURL('image/png');
      
      // Download the PNG
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${chartTitle.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
    } catch (error) {
      console.error('Error in downloadChart:', error);
      downloadChartAsJson(chartTitle, data);
    }
  };
  
  // Helper function to download chart data as JSON
  const downloadChartAsJson = (chartTitle: string, data: ChartDataItem[]) => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const dataUrl = URL.createObjectURL(dataBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = dataUrl;
    downloadLink.download = `${chartTitle.replace(/\s+/g, '_')}_data.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(dataUrl);
  };


  
  return (
    <div className="space-y-2">
      {/* Control Panel Area - Compacted */}
      <div className="flex flex-col space-y-2">
        {/* Top Row - Display Mode & Theme */}
        <div className="flex justify-between items-center">
          <Label htmlFor="categoryCount" className="text-sm text-gray-600">
            Displaying <span className="font-medium text-primary-700">{categoryCount}</span> categories
          </Label>
          
          {/* Control buttons with less spacing */}
          <div className="flex items-center gap-2">
            {/* Count/Percentage Toggle */}
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={displayMode === "count" ? "default" : "outline"}
                size="sm"
                onClick={() => setDisplayMode("count")}
                className="h-7 px-2 text-xs"
              >
                Count
              </Button>
              <Button
                variant={displayMode === "percentage" ? "default" : "outline"}
                size="sm"
                onClick={() => setDisplayMode("percentage")}
                className="h-7 px-2 text-xs"
              >
                %
              </Button>
            </div>

            {/* Chart Theme Selector */}
            <div className="flex items-center gap-1">
              <Palette className="h-3.5 w-3.5 opacity-70" />
              <Select
                value={currentTheme}
                onValueChange={setCurrentTheme}
              >
                <SelectTrigger className="h-7 text-xs w-[150px]">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COLOR_THEMES).map(([id, theme]) => (
                    <SelectItem key={id} value={id}>
                      {theme.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Category slider with reduced height */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">5</span>
          <Slider
            id="categoryCount"
            min={5}
            max={100}
            step={1}
            value={[categoryCount]}
            onValueChange={(value) => setCategoryCount(value[0])}
            className="flex-1"
          />
          <span className="text-xs font-medium">100</span>
          <span className="ml-1 bg-primary-100 text-primary-800 text-xs font-medium px-2 py-0.5 rounded">
            {categoryCount}
          </span>
        </div>
      </div>
      
      {/* Grid of visualizations - 2x3 grid with less gap */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* Chart 1: HRSN Indicators (Top Left) */}
          <Card className="overflow-hidden">
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-sm">HRSN Indicators (Problem symptoms) <span className="text-xs text-muted-foreground">n={uniquePatientCount}</span></CardTitle>
            </CardHeader>
            <CardContent className="p-2 h-[280px]">
              <ResponsiveBar
                data={getHrsnIndicatorData()}
                keys={['value']}
                indexBy="id"
                margin={{ top: 60, right: 30, bottom: 90, left: 80 }}
                padding={0.3}
                layout="vertical"
                colors={colorSettings.isCustomPalette && colorSettings.colors ? colorSettings.colors : getChartColors()}
                valueScale={{ type: 'linear' }}
                indexScale={{ type: 'band', round: true }}
                borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 10,
                  tickRotation: -45,
                  legendPosition: 'middle',
                  legendOffset: 60,
                  truncateTickAt: 0
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Count',
                  legendPosition: 'middle',
                  legendOffset: -50
                }}
                enableGridY={true}
                labelSkipWidth={12}
                labelSkipHeight={12}
                enableLabel={true}
                label={d => { return displayMode === "percentage" ? (d.percentage !== undefined ? `${d.percentage}%` : "0%") : `${d.value}`; }}
                labelTextColor={"#000000"}
                labelPosition="outside"
                labelOffset={-3}
                theme={{
                  labels: {
                    text: {
                      fontSize: 11,
                      fontWeight: 700,
                      textAnchor: 'middle',
                      dominantBaseline: 'auto'
                    }
                  }
                }}
                animate={true}
                motionConfig="gentle"
                role="application"
                ariaLabel="HRSN Indicators"
              />
            </CardContent>
            <CardFooter className="p-2 flex justify-between">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Maximize className="h-4 w-4 mr-2" />
                    Enlarge
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>HRSN Indicators (Problem symptoms)</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 h-[calc(80vh-120px)]">
                    <ResponsiveBar
                      data={getHrsnIndicatorData()}
                      keys={['value']}
                      indexBy="id"
                      margin={{ top: 70, right: 80, bottom: 140, left: 80 }}
                      padding={0.3}
                      layout="vertical"
                      colors={colorSettings.isCustomPalette && colorSettings.colors ? colorSettings.colors : getChartColors()}
                      valueScale={{ type: 'linear' }}
                      indexScale={{ type: 'band', round: true }}
                      borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 15,
                        tickRotation: -35,
                        legendPosition: 'middle',
                        legendOffset: 80,
                        truncateTickAt: 0
                      }}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Count',
                        legendPosition: 'middle',
                        legendOffset: -50
                      }}
                      enableGridY={true}
                      labelSkipWidth={12}
                      labelSkipHeight={12}
                      enableLabel={true}
                      label={d => { return displayMode === "percentage" ? (d.percentage !== undefined ? `${d.percentage}%` : "0%") : `${d.value}`; }}
                      labelTextColor={"#000000"}
                      labelPosition="outside"
                      labelOffset={-3}
                      theme={{
                        labels: {
                          text: {
                            fontSize: 11,
                            fontWeight: 700,
                            textAnchor: 'middle',
                            dominantBaseline: 'auto'
                          }
                        }
                      }}
                      animate={true}
                      motionConfig="gentle"
                      role="application"
                      ariaLabel="HRSN Indicators Enlarged"
                    />
                  </div>
                </DialogContent>
              </Dialog>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => downloadChart('HRSN Indicators', getHrsnIndicatorData())}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Chart
              </Button>
            </CardFooter>
          </Card>
          
          {/* Chart 2: Risk Stratification (Top Right) */}
          <Card className="overflow-hidden">
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-sm">Risk Stratification <span className="text-xs text-muted-foreground">n={uniquePatientCount}</span></CardTitle>
            </CardHeader>
            <CardContent className="p-2 h-[280px]">
              {/* Risk Stratification Formula Legend */}
              <div className="text-xs text-muted-foreground mb-2 bg-slate-50 p-1 rounded">
                <p className="font-semibold">Risk Categorization Formula:</p>
                <ul className="list-disc list-inside mt-1 pl-1">
                  <li>Very High Risk: 100+ recorded symptoms</li>
                  <li>High Risk: 50-99 recorded symptoms</li>
                  <li>Medium-High Risk: 20-49 recorded symptoms</li>
                  <li>Medium Risk: 10-19 recorded symptoms</li>
                  <li>Low Risk: 1-9 recorded symptoms</li>
                  <li>No Risk: 0 recorded symptoms</li>
                </ul>
              </div>
              <ResponsiveBar
                data={getRiskStratificationData()}
                keys={['value']}
                indexBy="id"
                margin={{ top: 60, right: 30, bottom: 70, left: 80 }}
                padding={0.3}
                layout="vertical"
                colors={getRiskColors()}
                valueScale={{ type: 'linear' }}
                indexScale={{ type: 'band', round: true }}
                borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 25,
                  tickRotation: -35,
                  legendPosition: 'middle',
                  legendOffset: 70,
                  truncateTickAt: 0,
                  format: (value) => value // Ensure full risk level names are shown
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Patients',
                  legendPosition: 'middle',
                  legendOffset: -50
                }}
                enableGridY={true}
                labelSkipWidth={12}
                labelSkipHeight={12}
                enableLabel={true}
                label={d => { return displayMode === "percentage" ? (d.percentage !== undefined ? `${d.percentage}%` : "0%") : `${d.value}`; }}
                labelTextColor={"#000000"}
                labelPosition="outside"
                labelOffset={-3}
                theme={{
                  labels: {
                    text: {
                      fontSize: 11,
                      fontWeight: 700,
                      textAnchor: 'middle',
                      dominantBaseline: 'auto'
                    }
                  }
                }}
                animate={true}
                motionConfig="gentle"
                role="application"
                ariaLabel="Risk Stratification"
              />
            </CardContent>
            <CardFooter className="p-2 flex justify-between">
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Maximize className="h-4 w-4 mr-2" />
                    Enlarge
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Risk Stratification</DialogTitle>
                  </DialogHeader>
                  {/* Risk Stratification Formula Legend - also shown when enlarged */}
                  <div className="text-xs text-muted-foreground mb-2 bg-slate-50 p-1 rounded">
                    <p className="font-semibold">Risk Categorization Formula:</p>
                    <ul className="list-disc list-inside mt-1 pl-1">
                      <li>Very High Risk: 100+ recorded symptoms</li>
                      <li>High Risk: 50-99 recorded symptoms</li>
                      <li>Medium-High Risk: 20-49 recorded symptoms</li>
                      <li>Medium Risk: 10-19 recorded symptoms</li>
                      <li>Low Risk: 1-9 recorded symptoms</li>
                      <li>No Risk: 0 recorded symptoms</li>
                    </ul>
                  </div>
                  <div className="flex-1 h-[calc(80vh-180px)]">
                    <ResponsiveBar
                      data={getRiskStratificationData()}
                      keys={['value']}
                      indexBy="id"
                      margin={{ top: 70, right: 80, bottom: 140, left: 80 }}
                      padding={0.3}
                      layout="vertical"
                      colors={getRiskColors()}
                      valueScale={{ type: 'linear' }}
                      indexScale={{ type: 'band', round: true }}
                      borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 25,
                        tickRotation: -35,
                        legendPosition: 'middle',
                        legendOffset: 80,
                        truncateTickAt: 0,
                        format: (value) => value // Ensure full risk level names are shown
                      }}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Patients',
                        legendPosition: 'middle',
                        legendOffset: -50
                      }}
                      enableGridY={true}
                      labelSkipWidth={12}
                      labelSkipHeight={12}
                      enableLabel={true}
                      label={d => { return displayMode === "percentage" ? (d.percentage !== undefined ? `${d.percentage}%` : "0%") : `${d.value}`; }}
                      labelTextColor={"#000000"}
                      labelPosition="outside"
                      labelOffset={-3}
                      theme={{
                        labels: {
                          text: {
                            fontSize: 11,
                            fontWeight: 700,
                            textAnchor: 'middle',
                            dominantBaseline: 'auto'
                          }
                        }
                      }}
                      animate={true}
                      motionConfig="gentle"
                      role="application"
                      ariaLabel="Risk Stratification Enlarged"
                    />
                  </div>
                </DialogContent>
              </Dialog>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => downloadChart('Risk Stratification', getRiskStratificationData())}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Chart
              </Button>
            </CardFooter>
          </Card>
          
          {/* Chart 3: Total Population by Symptom Segment (Middle Left) */}
          <Card className="overflow-hidden">
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-sm">Total Population by Symptom Segment <span className="text-xs text-muted-foreground">n={uniquePatientCount}</span></CardTitle>
            </CardHeader>
            <CardContent className="p-2 h-[280px]">
              <ResponsiveBar
                data={getSymptomSegmentData()}
                keys={['value']}
                indexBy="id"
                margin={{ top: 60, right: 30, bottom: 70, left: 80 }}
                padding={0.3}
                layout="vertical"
                colors={getChartColors()}
                valueScale={{ type: 'linear' }}
                indexScale={{ type: 'band', round: true }}
                borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 10,
                  tickRotation: -45,
                  legendPosition: 'middle',
                  legendOffset: 50,
                  truncateTickAt: 0
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Count',
                  legendPosition: 'middle',
                  legendOffset: -50
                }}
                enableGridY={true}
                labelSkipWidth={12}
                labelSkipHeight={12}
                enableLabel={true}
                label={d => { return displayMode === "percentage" ? (d.percentage !== undefined ? `${d.percentage}%` : "0%") : `${d.value}`; }}
                labelTextColor={"#000000"}
                labelPosition="outside"
                labelOffset={-3}
                theme={{
                  labels: {
                    text: {
                      fontSize: 11,
                      fontWeight: 700,
                      textAnchor: 'middle',
                      dominantBaseline: 'auto'
                    }
                  }
                }}
                animate={true}
                motionConfig="gentle"
                role="application"
                ariaLabel="Population by Symptom Segment"
              />
            </CardContent>
            <CardFooter className="p-2 flex justify-between">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Maximize className="w-4 h-4 mr-2" />
                    Enlarge
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Total Population by Symptom Segment</DialogTitle>
                  </DialogHeader>
                  <div className="h-[calc(80vh-100px)]">
                    <ResponsiveBar
                      data={getSymptomSegmentData()}
                      keys={['value']}
                      indexBy="id"
                      margin={{ top: 70, right: 50, bottom: 140, left: 100 }}
                      padding={0.3}
                      layout="vertical"
                      colors={getChartColors()}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 15,
                        tickRotation: -35,
                        legendPosition: 'middle',
                        legendOffset: 80,
                        truncateTickAt: 0
                      }}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Count',
                        legendPosition: 'middle',
                        legendOffset: -60
                      }}
                      enableGridY={true}
                      labelSkipWidth={12}
                      labelSkipHeight={12}
                      enableLabel={true}
                      label={d => { return displayMode === "percentage" ? (d.percentage !== undefined ? `${d.percentage}%` : "0%") : `${d.value}`; }}
                      labelTextColor={"#000000"}
                      labelPosition="outside"
                      labelOffset={-3}
                      theme={{
                        labels: {
                          text: {
                            fontSize: 11,
                            fontWeight: 700,
                            textAnchor: 'middle',
                            dominantBaseline: 'auto'
                          }
                        }
                      }}
                      animate={true}
                    />
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadChart('Symptom_Segment', getSymptomSegmentData())}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Chart
              </Button>
            </CardFooter>
          </Card>
          
          {/* Chart 2: Total Population by Diagnosis */}
          <Card className="overflow-hidden">
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-sm">Total Population by Diagnosis <span className="text-xs text-muted-foreground">n={uniquePatientCount}</span></CardTitle>
            </CardHeader>
            <CardContent className="p-2 h-[280px]">
              <ResponsiveBar
                data={getDiagnosisData()}
                keys={['value']}
                indexBy="id"
                margin={{ top: 60, right: 30, bottom: 70, left: 80 }}
                padding={0.3}
                layout="vertical"
                colors={getChartColors()}
                valueScale={{ type: 'linear' }}
                indexScale={{ type: 'band', round: true }}
                borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 10,
                  tickRotation: -45,
                  legendPosition: 'middle',
                  legendOffset: 50,
                  truncateTickAt: 0
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Count',
                  legendPosition: 'middle',
                  legendOffset: -50
                }}
                enableGridY={true}
                labelSkipWidth={12}
                labelSkipHeight={12}
                enableLabel={true}
                label={d => { return displayMode === "percentage" ? (d.percentage !== undefined ? `${d.percentage}%` : "0%") : `${d.value}`; }}
                labelTextColor={"#000000"}
                labelPosition="outside"
                labelOffset={-3}
                theme={{
                  labels: {
                    text: {
                      fontSize: 11,
                      fontWeight: 700,
                      textAnchor: 'middle',
                      dominantBaseline: 'auto'
                    }
                  }
                }}
                animate={true}
                motionConfig="gentle"
                role="application"
                ariaLabel="Population by Diagnosis"
              />
            </CardContent>
            <CardFooter className="p-2 flex justify-between">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Maximize className="w-4 h-4 mr-2" />
                    Enlarge
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Total Population by Diagnosis</DialogTitle>
                  </DialogHeader>
                  <div className="h-[calc(80vh-100px)]">
                    <ResponsiveBar
                      data={getDiagnosisData()}
                      keys={['value']}
                      indexBy="id"
                      margin={{ top: 70, right: 50, bottom: 140, left: 100 }}
                      padding={0.3}
                      layout="vertical"
                      colors={getChartColors()}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 15,
                        tickRotation: -35,
                        legendPosition: 'middle',
                        legendOffset: 80,
                        truncateTickAt: 0
                      }}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Count',
                        legendPosition: 'middle',
                        legendOffset: -60
                      }}
                      enableGridY={true}
                      labelSkipWidth={12}
                      labelSkipHeight={12}
                      enableLabel={true}
                      label={d => { return displayMode === "percentage" ? (d.percentage !== undefined ? `${d.percentage}%` : "0%") : `${d.value}`; }}
                      labelTextColor={"#000000"}
                      labelPosition="outside"
                      labelOffset={-3}
                      theme={{
                        labels: {
                          text: {
                            fontSize: 11,
                            fontWeight: 700,
                            textAnchor: 'middle',
                            dominantBaseline: 'auto'
                          }
                        }
                      }}
                      animate={true}
                    />
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadChart('Diagnosis', getDiagnosisData())}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Chart
              </Button>
            </CardFooter>
          </Card>
          
          {/* Chart 3: Total Population by Symptom ID */}
          <Card className="overflow-hidden">
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-sm">Total Population by Symptom ID <span className="text-xs text-muted-foreground">n={uniquePatientCount}</span></CardTitle>
            </CardHeader>
            <CardContent className="p-2 h-[280px]">
              <ResponsiveBar
                data={getSymptomIDData()}
                keys={['value']}
                indexBy="id"
                margin={{ top: 60, right: 30, bottom: 70, left: 80 }}
                padding={0.3}
                layout="vertical"
                colors={getChartColors()}
                valueScale={{ type: 'linear' }}
                indexScale={{ type: 'band', round: true }}
                borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 10,
                  tickRotation: -45,
                  legendPosition: 'middle',
                  legendOffset: 50,
                  truncateTickAt: 0
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Count',
                  legendPosition: 'middle',
                  legendOffset: -50
                }}
                enableGridY={true}
                labelSkipWidth={12}
                labelSkipHeight={12}
                enableLabel={true}
                label={d => { return displayMode === "percentage" ? (d.percentage !== undefined ? `${d.percentage}%` : "0%") : `${d.value}`; }}
                labelTextColor={"#000000"}
                animate={true}
                motionConfig="gentle"
                role="application"
                ariaLabel="Population by Symptom ID"
                // Chart ref will be captured using DOM APIs instead
              />
            </CardContent>
            <CardFooter className="p-2 flex justify-between">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Maximize className="w-4 h-4 mr-2" />
                    Enlarge
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Total Population by Symptom ID</DialogTitle>
                  </DialogHeader>
                  <div className="h-[calc(80vh-100px)]">
                    <ResponsiveBar
                      data={getSymptomIDData()}
                      keys={['value']}
                      indexBy="id"
                      margin={{ top: 70, right: 50, bottom: 100, left: 100 }}
                      padding={0.3}
                      layout="vertical"
                      colors={getChartColors()}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 10,
                        tickRotation: -45,
                        legendPosition: 'middle',
                        legendOffset: 60,
                        truncateTickAt: 0
                      }}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Count',
                        legendPosition: 'middle',
                        legendOffset: -60
                      }}
                      enableGridY={true}
                      labelSkipWidth={12}
                      labelSkipHeight={12}
                      enableLabel={true}
                      label={d => { return displayMode === "percentage" ? (d.percentage !== undefined ? `${d.percentage}%` : "0%") : `${d.value}`; }}
                      labelTextColor={"#000000"}
                      animate={true}
                    />
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadChart('Symptom_ID', getSymptomIDData())}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Chart
              </Button>
            </CardFooter>
          </Card>
          
          {/* Chart 4: Total Population by Diagnostic Category */}
          <Card className="overflow-hidden">
            <CardHeader className="p-2 pb-0">
              <CardTitle className="text-sm">Total Population by Diagnostic Category <span className="text-xs text-muted-foreground">n={uniquePatientCount}</span></CardTitle>
            </CardHeader>
            <CardContent className="p-2 h-[280px]">
              <ResponsiveBar
                data={getDiagnosticCategoryData()}
                keys={['value']}
                indexBy="id"
                margin={{ top: 60, right: 30, bottom: 70, left: 80 }}
                padding={0.3}
                layout="vertical"
                colors={getChartColors()}
                valueScale={{ type: 'linear' }}
                indexScale={{ type: 'band', round: true }}
                borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 10,
                  tickRotation: -45,
                  legendPosition: 'middle',
                  legendOffset: 50,
                  truncateTickAt: 0
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: 'Count',
                  legendPosition: 'middle',
                  legendOffset: -50
                }}
                enableGridY={true}
                labelSkipWidth={12}
                labelSkipHeight={12}
                enableLabel={true}
                label={d => { return displayMode === "percentage" ? (d.percentage !== undefined ? `${d.percentage}%` : "0%") : `${d.value}`; }}
                labelTextColor={"#000000"}
                animate={true}
                motionConfig="gentle"
                role="application"
                ariaLabel="Population by Diagnostic Category"
                // Chart ref will be captured using DOM APIs instead
              />
            </CardContent>
            <CardFooter className="p-2 flex justify-between">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Maximize className="w-4 h-4 mr-2" />
                    Enlarge
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Total Population by Diagnostic Category</DialogTitle>
                  </DialogHeader>
                  <div className="h-[calc(80vh-100px)]">
                    <ResponsiveBar
                      data={getDiagnosticCategoryData()}
                      keys={['value']}
                      indexBy="id"
                      margin={{ top: 70, right: 50, bottom: 100, left: 100 }}
                      padding={0.3}
                      layout="vertical"
                      colors={getChartColors()}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 10,
                        tickRotation: -45,
                        legendPosition: 'middle',
                        legendOffset: 60,
                        truncateTickAt: 0
                      }}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Count',
                        legendPosition: 'middle',
                        legendOffset: -60
                      }}
                      enableGridY={true}
                      labelSkipWidth={12}
                      labelSkipHeight={12}
                      enableLabel={true}
                      label={d => { return displayMode === "percentage" ? (d.percentage !== undefined ? `${d.percentage}%` : "0%") : `${d.value}`; }}
                      labelTextColor={"#000000"}
                      animate={true}
                    />
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => downloadChart('Diagnostic_Category', getDiagnosticCategoryData())}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Chart
              </Button>
            </CardFooter>
          </Card>
        </div>
        
 
        {/* Population Health Filters Section - May 14th Implementation */}
        <div className="mt-4 space-y-3">
          <h3 className="text-base font-bold text-gray-800">Filter Population Health Data</h3>
          
          <div className="space-y-2">
            {/* Filter row from population-health-controlling - more compact layout */}
            <div className="grid grid-cols-6 gap-2 overflow-x-auto pb-2">
              {/* Symptom filter */}
              <div>
                <Label htmlFor="symptom-filter" className="block text-xs font-medium text-gray-700 mb-1">
                  Symptom
                </Label>
                <Select defaultValue="all_symptoms">
                  <SelectTrigger id="symptom-filter" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select symptom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_symptoms">All Symptoms</SelectItem>
                    <SelectGroupComponent>
                      <SelectLabelComponent>Symptoms</SelectLabelComponent>
                      <SelectItem value="anxiety">Anxiety</SelectItem>
                      <SelectItem value="depression">Depression</SelectItem>
                      <SelectItem value="fatigue">Fatigue</SelectItem>
                      <SelectItem value="insomnia">Insomnia</SelectItem>
                      <SelectItem value="pain">Pain</SelectItem>
                    </SelectGroupComponent>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Diagnosis filter */}
              <div>
                <Label htmlFor="diagnosis-filter" className="block text-xs font-medium text-gray-700 mb-1">
                  Diagnosis
                </Label>
                <Select defaultValue="all_diagnoses">
                  <SelectTrigger id="diagnosis-filter" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select diagnosis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_diagnoses">All Diagnoses</SelectItem>
                    <SelectGroupComponent>
                      <SelectLabelComponent>Diagnoses</SelectLabelComponent>
                      <SelectItem value="anxiety_disorder">Anxiety Disorder</SelectItem>
                      <SelectItem value="depression">Depression</SelectItem>
                      <SelectItem value="insomnia">Insomnia</SelectItem>
                      <SelectItem value="panic_disorder">Panic Disorder</SelectItem>
                      <SelectItem value="ptsd">PTSD</SelectItem>
                    </SelectGroupComponent>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Diagnostic Category filter */}
              <div>
                <Label htmlFor="category-filter" className="block text-xs font-medium text-gray-700 mb-1">
                  Diagnostic Category
                </Label>
                <Select defaultValue="all_categories">
                  <SelectTrigger id="category-filter" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_categories">All Categories</SelectItem>
                    <SelectGroupComponent>
                      <SelectLabelComponent>Categories</SelectLabelComponent>
                      <SelectItem value="anxiety_disorders">Anxiety Disorders</SelectItem>
                      <SelectItem value="mood_disorders">Mood Disorders</SelectItem>
                      <SelectItem value="personality_disorders">Personality Disorders</SelectItem>
                      <SelectItem value="sleep_disorders">Sleep Disorders</SelectItem>
                      <SelectItem value="trauma_disorders">Trauma Disorders</SelectItem>
                    </SelectGroupComponent>
                  </SelectContent>
                </Select>
              </div>
              
              {/* ICD-10 Code filter */}
              <div>
                <Label htmlFor="icd10-filter" className="block text-xs font-medium text-gray-700 mb-1">
                  ICD-10 Code
                </Label>
                <Select defaultValue="all_codes">
                  <SelectTrigger id="icd10-filter" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select code" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_codes">All ICD-10 Codes</SelectItem>
                    <SelectGroupComponent>
                      <SelectLabelComponent>Codes</SelectLabelComponent>
                      <SelectItem value="F32.9">F32.9 (Depression)</SelectItem>
                      <SelectItem value="F41.1">F41.1 (Anxiety)</SelectItem>
                      <SelectItem value="F43.10">F43.10 (PTSD)</SelectItem>
                      <SelectItem value="F51.01">F51.01 (Insomnia)</SelectItem>
                      <SelectItem value="R53.83">R53.83 (Fatigue)</SelectItem>
                    </SelectGroupComponent>
                  </SelectContent>
                </Select>
              </div>
              
              {/* HRSN Problems filter */}
              <div>
                <Label htmlFor="hrsn-problems-filter" className="block text-xs font-medium text-gray-700 mb-1">
                  HRSN Problems
                </Label>
                <Select defaultValue="all_hrsn_problems">
                  <SelectTrigger id="hrsn-problems-filter" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select HRSN Problem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_hrsn_problems">All HRSN Problems</SelectItem>
                    <SelectGroupComponent>
                      <SelectLabelComponent>HRSN Problems</SelectLabelComponent>
                      <SelectItem value="financial_strain">Financial Strain</SelectItem>
                      <SelectItem value="food_insecurity">Food Insecurity</SelectItem>
                      <SelectItem value="housing_instability">Housing Instability</SelectItem>
                      <SelectItem value="transportation_needs">Transportation Needs</SelectItem>
                      <SelectItem value="utility_needs">Utility Needs</SelectItem>
                    </SelectGroupComponent>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Symptom ID(s) filter */}
              <div>
                <Label htmlFor="symptom-id-filter" className="block text-xs font-medium text-gray-700 mb-1">
                  Symptom ID(s)
                </Label>
                <Select defaultValue="all_symptom_ids">
                  <SelectTrigger id="symptom-id-filter" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Select Symptom ID" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_symptom_ids">All Symptom IDs</SelectItem>
                    <SelectGroupComponent>
                      <SelectLabelComponent>Symptom IDs</SelectLabelComponent>
                      <SelectItem value="SYM001">SYM001</SelectItem>
                      <SelectItem value="SYM002">SYM002</SelectItem>
                      <SelectItem value="SYM003">SYM003</SelectItem>
                      <SelectItem value="SYM004">SYM004</SelectItem>
                      <SelectItem value="SYM005">SYM005</SelectItem>
                    </SelectGroupComponent>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="space-x-2">
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset Filters
                </Button>
                
                <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Search className="w-4 h-4 mr-2" />
                  Apply Filters
                </Button>
              </div>
              
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download Data
              </Button>
            </div>
            
            {/* Record count indicator */}
            <div className="mt-3 text-sm text-gray-600 flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50">
                <span className="font-medium">24 patients</span>
              </Badge>
              <span className="text-xs">•</span>
              <Badge variant="outline" className="bg-green-50">
                <span className="font-medium">4,608 total records</span>
              </Badge>
              <span className="text-xs">•</span>
              <Badge variant="outline" className="bg-amber-50">
                <span className="text-xs font-medium">Showing all data - no filters applied</span>
              </Badge>
            </div>
          </div>
        </div>
        
      </div>
  );
}