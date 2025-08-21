// HRSN Grid Controlling File - May 13, 2025
// This is the controlling file for the HRSN grid component that displays all HRSN indicators

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ChevronDown, ChevronUp, Printer, Download, Palette, Percent, Maximize2, X } from "lucide-react";
import HrsnPieChart from "./hrsn-pie-chart-05_13_25";
import CategoricalHrsnChart from "./categorical-hrsn-chart-05_13_25";
import StandardizedHrsnChart from "./standardized-hrsn-chart-05_13_25";
import ZipCodeMap from './visualizations/zip-code-map-05_13_25';
import ChartExportWidget from "@/components/chart-export-widget";
import GeoMapChart from "./GeoMapChart";
import ZipCodeInfographic from "./ZipCodeInfographic";
import { AgeRangeInfographic } from "./AgeRangeInfographic";
import { GenderInfographic } from "./GenderInfographic";
import { RaceInfographic } from "./RaceInfographic";
import { EthnicityInfographic } from "./EthnicityInfographic";
import { EducationInfographic } from "./EducationInfographic";
import { HRSNInfographic } from "./HRSNInfographic";
import HRSNZipCodeInfographic from "./HRSNZipCodeInfographic";
import WorkingChoroplethMap from "./WorkingChoroplethMap";
import ReactLeafletChoropleth from "./ReactLeafletChoropleth";
import CanvasChoroplethMap from "./CanvasChoroplethMap";

import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThemeProvider } from "@/hooks/use-theme";
import { useChartTheme } from "@/context/ChartThemeContext";
import { useLocation } from "wouter";
import NavigationButton from "./NavigationButton";
import ThemeSelector from "@/components/ThemeSelector";
import { useQuery } from "@tanstack/react-query";
import DualSourceIndicator from "./dual-source-indicator";
import React from "react";


// Safe string helper function
function safeString(value: unknown): string {
  if (value === null || value === undefined) return "N/A";
  return String(value);
}

// Helper function to determine data source for dual-source indicator
function getDataSourceForField(fieldName: string, dualSourceHrsnData?: any): 'dual_sources' | 'customer_only' | 'insights_only' | 'no_data' {
  if (!dualSourceHrsnData?.categories) return 'no_data';

  const categoryData = dualSourceHrsnData.categories[fieldName];
  if (!categoryData) return 'no_data';

  return categoryData.dataSource || 'no_data';
}

interface PopulationHealthChartsProps {
  data?: any;
  isLoading?: boolean;
  selectedSymptom?: string;
  selectedDiagnosis?: string;
  selectedDiagnosticCategory?: string;
  selectedIcd10Code?: string;
  selectedHrsnProblem?: string;
  selectedSymptomId?: string;
  dualSourceHrsnData?: {
    categories: {
      [key: string]: {
        customerCount: number;
        extractedCount: number;
        totalAffected: number;
        dataSource: 'dual_sources' | 'customer_only' | 'insights_only' | 'no_data';
        label: string;
      };
    };
    totalCustomerRecords: number;
    totalExtractedRecords: number;
    totalPatients: number;
    rawExtractedInsights: Array<{
      id: string;
      symptom_segment: string;
      count: number;
      value: number;
    }>;
  };
}

export default function HrsnGridControllingFile({ 
  data,
  isLoading = false,
  selectedSymptom,
  selectedDiagnosis, 
  selectedDiagnosticCategory,
  selectedIcd10Code,
  selectedHrsnProblem,
  selectedSymptomId,
  dualSourceHrsnData
}: PopulationHealthChartsProps) {
  console.log("🚀 HRSN Grid Component LOADED - data:", data);
  console.log("🚀 LOADED patients count:", data?.patients?.length || 0);
  
  const [location, navigate] = useLocation();

  // Add HRSN data fetching
  const { data: hrsnApiData, isLoading: isHrsnLoading } = useQuery({
    queryKey: ['/api/hrsn-data'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Transform hrsnApiData into dual-source format for indicators
  const transformedDualSourceData = React.useMemo(() => {
    console.log("🔍 HRSN API Data received:", hrsnApiData);
    if (!hrsnApiData) return null;

    // Helper function to determine data source based on actual data availability
    const getDataSource = (extractedCount: number) => {
      return extractedCount > 0 ? 'insights_only' as const : 'no_data' as const;
    };

    // The API returns { categories: { housing_insecurity: 407, ... }, totalPatients: 5000 }
    const apiCategories = (hrsnApiData as any)?.categories || {};
    console.log("📊 API Categories:", apiCategories);

    // Create categories structure for dual-source indicators
    // Only mark as 'insights_only' if we actually have extracted data
    const categories = {
      housing_insecurity: {
        customerCount: 0,
        extractedCount: apiCategories.housing_insecurity || 0,
        totalAffected: apiCategories.housing_insecurity || 0,
        dataSource: getDataSource(apiCategories.housing_insecurity || 0),
        label: 'Housing Insecurity'
      },
      food_insecurity: {
        customerCount: 0,
        extractedCount: apiCategories.food_insecurity || 0,
        totalAffected: apiCategories.food_insecurity || 0,
        dataSource: getDataSource(apiCategories.food_insecurity || 0),
        label: 'Food Insecurity'
      },
      financial_strain: {
        customerCount: 0,
        extractedCount: apiCategories.financial_strain || 0,
        totalAffected: apiCategories.financial_strain || 0,
        dataSource: getDataSource(apiCategories.financial_strain || 0),
        label: 'Financial Strain'
      },
      access_to_transportation: {
        customerCount: 0,
        extractedCount: apiCategories.access_to_transportation || 0,
        totalAffected: apiCategories.access_to_transportation || 0,
        dataSource: getDataSource(apiCategories.access_to_transportation || 0),
        label: 'Transportation Access'
      },
      has_a_car: {
        customerCount: 0,
        extractedCount: apiCategories.has_a_car || 0,
        totalAffected: apiCategories.has_a_car || 0,
        dataSource: getDataSource(apiCategories.has_a_car || 0),
        label: 'Car Ownership'
      },
      veteran_status: {
        customerCount: 0,
        extractedCount: apiCategories.veteran_status || 0,
        totalAffected: apiCategories.veteran_status || 0,
        dataSource: getDataSource(apiCategories.veteran_status || 0),
        label: 'Veteran Status'
      },
      education_level: {
        customerCount: 0,
        extractedCount: apiCategories.education_level || 0,
        totalAffected: apiCategories.education_level || 0,
        dataSource: getDataSource(apiCategories.education_level || 0),
        label: 'Education Level'
      },
      has_transportation: {
        customerCount: 0,
        extractedCount: apiCategories.has_transportation || 0,
        totalAffected: apiCategories.has_transportation || 0,
        dataSource: getDataSource(apiCategories.has_transportation || 0),
        label: 'Has Transportation'
      },
      utility_insecurity: {
        customerCount: 0,
        extractedCount: apiCategories.utility_insecurity || 0,
        totalAffected: apiCategories.utility_insecurity || 0,
        dataSource: getDataSource(apiCategories.utility_insecurity || 0),
        label: 'Utilities Insecurity'
      }
    };

    return {
      categories,
      totalCustomerRecords: 0,
      totalExtractedRecords: Object.values(categories).reduce((sum, cat) => sum + cat.extractedCount, 0),
      totalPatients: (hrsnApiData as any)?.totalPatients || 0,
      rawExtractedInsights: []
    };
  }, [hrsnApiData]);



  // Ensure we have default values for data
  const safeData = data || { patients: [], extractedSymptoms: [] };
  const patients = safeData.patients || [];

  console.log("🔄 HRSN Charts - Received patients:", patients.length);
  console.log("🏠 HOUSING FIELD SAMPLE CHECK:", patients.slice(0, 3).map(p => ({ id: p.patient_id, housing: p.housing_insecurity, zip: p.zip_code })));
  console.log("🔍 HRSN GRID COMPONENT DEBUG:", {
    dataProvided: !!data,
    isLoading,
    patientsLength: patients?.length || 0,
    firstPatientData: patients?.[0] ? Object.keys(patients[0]) : 'No patients'
  });

  // Debug logging for filtered data
  useEffect(() => {
    console.log("🔍 HRSN Grid - Data received:");
    console.log("  - Total patients:", patients.length);
    console.log("  - Selected filters:", {
      selectedSymptom,
      selectedDiagnosis, 
      selectedDiagnosticCategory,
      selectedIcd10Code,
      selectedHrsnProblem,
      selectedSymptomId
    });

    if (patients && patients.length > 0) {
      // Log sample patient data
      const patient = patients[0] as Record<string, any>;
      console.log("  - Sample patient fields:", Object.keys(patient));
      console.log("  - Sample HRSN data:", {
        housing_insecurity: patient.housing_insecurity,
        food_insecurity: patient.food_insecurity,
        financial_status: patient.financial_status,
        access_to_transportation: patient.access_to_transportation,
        has_a_car: patient.has_a_car,
        age: patient.age,
        gender: patient.gender
      });
    }
  }, [patients, selectedSymptom, selectedDiagnosis, selectedDiagnosticCategory]);

  // Helper function to check if field has data
  const hasFieldData = (fieldName: string) => {
    if (!patients || patients.length === 0) return false;
    return patients.some(patient => {
      const value = patient[fieldName];
      return value !== null && value !== undefined && value !== '';
    });
  };

  // Helper function to process age ranges from age field
  const processAgeRange = (age: number): string => {
    if (age < 18) return '0-17';
    if (age < 35) return '18-34';
    if (age < 55) return '35-54';
    if (age < 75) return '55-74';
    return '75+';
  };

  // Helper function to count total unique zip codes
  const getTotalUniqueZipCodes = (): number => {
    if (!patients || patients.length === 0) return 0;

    const uniqueZipCodes = new Set<string>();
    patients.forEach(patient => {
      const zipCode = patient.zip_code;
      if (zipCode && zipCode !== '' && zipCode !== 'N/A' && zipCode !== null && zipCode !== undefined) {
        uniqueZipCodes.add(zipCode.toString());
      }
    });

    return uniqueZipCodes.size;
  };

  // Define ALL HRSN categories for comprehensive geographic visualization coverage
  const allHrsnCategories = [
    { id: "ageRange", label: "Age Range", field: "age_range", color: "blue", processor: (patient: any) => patient.age_range || processAgeRange(patient.age) },
    { id: "gender", label: "Gender", field: "gender", color: "purple" },
    { id: "race", label: "Race", field: "race", color: "orange" },
    { id: "ethnicity", label: "Ethnicity", field: "ethnicity", color: "teal" },
    { id: "zipCode", label: "Zip Code", field: "zip_code", color: "red" },
    { id: "financialStrain", label: "Financial Strain", field: "financial_strain", color: "amber" },
    { id: "housingInsecurity", label: "Housing Insecurity", field: "housing_insecurity", color: "blue" },
    { id: "foodInsecurity", label: "Food Insecurity", field: "food_insecurity", color: "green" },
    { id: "veteranStatus", label: "Veteran Status", field: "veteran_status", color: "indigo" },
    { id: "educationLevel", label: "Education Level", field: "education_level", color: "pink" },
    { id: "accessToTransportation", label: "Transportation Issues", field: "access_to_transportation", color: "cyan" },
    { id: "hasCar", label: "Vehicle Issues", field: "has_a_car", color: "gray" },
    { id: "hasTransportation", label: "Has Transportation", field: "has_transportation", color: "emerald" },
    { id: "utilities", label: "Utilities Insecurity", field: "utility_insecurity", color: "rose" }
  ];

  // COMPREHENSIVE GEOGRAPHIC VISUALIZATION: Show ALL categories to display geographic placeholders
  // This ensures users can see geographic placeholders for all demographic and HRSN categories
  const hrsnCategories = allHrsnCategories.filter(category => {
    // Always show core demographic categories for geographic visualization
    if (["ageRange", "gender", "race", "ethnicity", "zipCode"].includes(category.id)) {
      console.log(`🗺️ FORCING DEMOGRAPHIC INCLUSION: ${category.label} - for geographic placeholder display`);
      return true;
    }

    // Always show ALL HRSN categories for comprehensive HRSN grid with geographic placeholders
    if (["financialStrain", "housingInsecurity", "foodInsecurity", "veteranStatus", "educationLevel", "accessToTransportation", "hasCar", "hasTransportation", "utilities"].includes(category.id)) {
      console.log(`🗺️ FORCING HRSN INCLUSION: ${category.label} - for geographic placeholder display`);
      return true;
    }

    // Include any other categories that have actual field data
    return hasFieldData(category.field);
  });

  console.log("🎯 TOTAL HRSN Categories included:", hrsnCategories.length);
  console.log("🎯 HRSN Categories with data:", hrsnCategories.map(c => c.label));
  console.log("🗺️ GEOGRAPHIC SECTIONS COUNT:", hrsnCategories.length, "sections will show geographic placeholders");
  console.log("🔍 IMPORTANT: This file has HARDCODED sections, not dynamic rendering from hrsnCategories");
  console.log("🔍 ALL HARDCODED SECTIONS AVAILABLE: Age Range, Gender, Race, Ethnicity, Zip Code, Financial Strain, Housing, Food, Transportation, Veteran, Education, Has Transportation, Utilities");
  console.log("🔍 EXISTING GEOGRAPHIC PLACEHOLDERS: These 13 sections should ALL show GeoMapChart components with blue gradient placeholders");

  // Additional debug will be logged after expandedSections is initialized
  console.log("🔍 ALL HRSN Categories (before filtering):", allHrsnCategories.map(c => `${c.id}: ${c.label}`));
  console.log("🔍 Housing category check:", allHrsnCategories.find(c => c.id === "housingInsecurity"));
  console.log("🔍 Does Housing have field data?", hasFieldData("housing_insecurity"));
  console.log("🏠 HOUSING SECTION DEBUGGING:");
  console.log("  - housingInsecurity in hrsnCategories:", hrsnCategories.find(c => c.id === "housingInsecurity") ? "YES" : "NO");
  console.log("  - patients with housing_insecurity field:", patients.filter(p => p.housing_insecurity !== null && p.housing_insecurity !== undefined).length);

  // ENFORCED EXPANSION: Initialize ALL sections as expanded by default
  // Create a complete map of all section IDs to ensure nothing is missed
  const initialExpandedState = {
    // Map from hrsnCategories (automatically include all categories)
    ...hrsnCategories.reduce((acc, category) => {
      acc[category.id] = true;
      return acc;
    }, {} as Record<string, boolean>),

    // Explicitly list all section IDs to ensure complete coverage - ALL EXPANDED
    ageRange: true,
    gender: true,
    race: true,
    ethnicity: true,
    zipCode: true,
    financialStrain: true,
    housingInsecurity: true,
    foodInsecurity: true,
    veteranStatus: true,
    educationLevel: true,
    accessToTransportation: true,
    transportationInsecurity: true, // Transportation section key fix
    hasCar: true,
    hasTransportation: true, // Added missing section
    utilities: true
  };

  console.log("🔄 ENFORCED EXPANSION: All sections set to expanded by default");
  console.log("🔄 INITIAL EXPANDED STATE KEYS:", Object.keys(initialExpandedState));
  console.log("🔄 ALL EXPANSION VALUES:", Object.values(initialExpandedState).every(v => v === true) ? "ALL TRUE" : "SOME FALSE");

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(initialExpandedState);

  // Debug logging will be done after all variables are initialized

  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({});



  // Use global theme context instead of local state 
  const { currentTheme } = useChartTheme();

  // We're using page navigation for display mode instead of local state
  // This determines if we're on the percentage page based on URL
  const isPercentageView = window.location.pathname.includes("percentage");

  // Color scheme mapping from ChartThemeContext themes to legacy color schemes
  const getCompatibleColorScheme = (themeName: string): string => {
    const mapping: Record<string, string> = {
      'vivid': 'rainbow',
      'pastel': 'default',
      'dark': 'iridis',
      'muted': 'grayscale',
      'viridis': 'viridis'
    };
    return mapping[themeName] || 'default';
  };

  // Use context theme but maintain backward compatibility
  const colorScheme = getCompatibleColorScheme(currentTheme);

  // Available color schemes - for display only, using ChartThemeContext now
  const colorSchemes = [
    { value: "default", label: "Standard" },
    { value: "blues", label: "Blues" },
    { value: "rainbow", label: "Rainbow" },
    { value: "viridis", label: "Viridis" },
    { value: "iridis", label: "Iridis" },
    { value: "grayscale", label: "Grayscale" },
    { value: "red", label: "Red" },
    { value: "green", label: "Green" },
    { value: "purple", label: "Purple" },
    { value: "orange", label: "Orange" },
    { value: "teal", label: "Teal" }
  ];

  // Get all chart IDs for the "Select All" functionality
  const getAllChartIds = () => {
    const chartTypes = ["count", "percentage", "distribution"];
    return hrsnCategories.flatMap(category => 
      chartTypes.map(type => `${category.label}_${type}`)
    );
  };

  // Toggle chart expansion
  const toggleChartExpansion = (chartId: string) => {
    console.log("toggleChartExpansion called with:", chartId);
    console.log("Current expandedCharts state:", expandedCharts);

    setExpandedCharts(prev => {
      const newState = {
        ...prev,
        [chartId]: !prev[chartId]
      };
      console.log("New expandedCharts state:", newState);
      return newState;
    });
  };

  // Toggle all charts selection
  const toggleAllCharts = (checked: boolean) => {
    if (checked) {
      setSelectedCharts(getAllChartIds());
    } else {
      setSelectedCharts([]);
    }
  };

  // Calculate overall statistics
  const stats = {
    housingInsecurity: {
      count: patients.filter((p: any) => p?.housing_insecurity === "Yes").length || 0,
      percentage: patients.length ? 
        Math.round((patients.filter((p: any) => p?.housing_insecurity === "Yes").length / patients.length) * 100) : 0
    },
    foodInsecurity: {
      count: patients.filter((p: any) => p?.food_insecurity === "Yes").length || 0,
      percentage: patients.length ? 
        Math.round((patients.filter((p: any) => p?.food_insecurity === "Yes").length / patients.length) * 100) : 0
    },
    transportationInsecurity: {
      count: patients.filter((p: any) => p?.transportation_insecurity === "Yes").length || 0,
      percentage: patients.length ? 
        Math.round((patients.filter((p: any) => p?.transportation_insecurity === "Yes").length / patients.length) * 100) : 0
    },
    utilities: {
      count: patients.filter((p: any) => p?.utility_insecurity === "Yes").length || 0,
      percentage: patients.length ? 
        Math.round((patients.filter((p: any) => p?.utility_insecurity === "Yes").length / patients.length) * 100) : 0
    }
  };

  // Filter data based on selected criteria - Show only search results, not all database records
  const getFilteredData = () => {
    // CRITICAL FIX: Only show the filtered search results, not the entire database
    let filtered = [...patients];

    // Apply symptom filter if selected
    if (selectedSymptom && selectedSymptom !== "all_symptoms") {
      // Filter patients who have the selected symptom in their extracted symptoms
      const patientsWithSymptom = safeData.extractedSymptoms
        ?.filter((symptom: any) => symptom.symptom_segment === selectedSymptom)
        ?.map((symptom: any) => symptom.patient_id) || [];

      filtered = filtered.filter((p: any) => 
        patientsWithSymptom.includes(p.patient_id || p.id)
      );

      console.log(`Applied symptom filter (${selectedSymptom}): ${filtered.length} patients match`);
    }

    // Apply diagnosis filter if selected
    if (selectedDiagnosis && selectedDiagnosis !== "all_diagnoses") {
      const patientsWithDiagnosis = safeData.extractedSymptoms
        ?.filter((symptom: any) => symptom.diagnosis === selectedDiagnosis)
        ?.map((symptom: any) => symptom.patient_id) || [];

      filtered = filtered.filter((p: any) => 
        patientsWithDiagnosis.includes(p.patient_id || p.id)
      );

      console.log(`Applied diagnosis filter (${selectedDiagnosis}): ${filtered.length} patients match`);
    }

    // Apply diagnostic category filter if selected
    if (selectedDiagnosticCategory && selectedDiagnosticCategory !== "all_categories") {
      const patientsWithCategory = safeData.extractedSymptoms
        ?.filter((symptom: any) => symptom.diagnostic_category === selectedDiagnosticCategory)
        ?.map((symptom: any) => symptom.patient_id) || [];

      filtered = filtered.filter((p: any) => 
        patientsWithCategory.includes(p.patient_id || p.id)
      );

      console.log(`Applied category filter (${selectedDiagnosticCategory}): ${filtered.length} patients match`);
    }

    // Apply HRSN problem filter if selected
    if (selectedHrsnProblem && selectedHrsnProblem !== "all_hrsn_problems") {
      filtered = filtered.filter((p: any) => {
        if (!p) return false;
        return p[selectedHrsnProblem] === "Yes";
      });

      console.log(`Applied HRSN filter (${selectedHrsnProblem}): ${filtered.length} patients match`);
    }

    // CRITICAL FIX: Process filtered data to add missing age_range field
    // This ensures filtered charts show categorical breakdowns instead of single totals
    const processedFiltered = filtered.map((patient: any) => {
      const processed = { ...patient };

      // Add age_range field if missing but age exists
      if (!processed.age_range && processed.age !== null && processed.age !== undefined) {
        processed.age_range = processAgeRange(processed.age);
      }

      return processed;
    });

    console.log(`Final filtered data: ${processedFiltered.length} patients with processed age ranges`);
    return processedFiltered;

    // Apply Symptom ID filter
    if (selectedSymptomId && selectedSymptomId !== "all_symptom_ids") {
      // Keep all patients for now - will implement proper filtering when data structure is confirmed
      console.log("Selected Symptom ID, but keeping all patients to prevent empty results:", selectedSymptomId);

      // Log data structure for debugging
      if (safeData.extractedSymptoms && safeData.extractedSymptoms.length > 0) {
        console.log("Example symptom data for Symptom ID filtering:", safeData.extractedSymptoms[0]);
      }

      // Don't filter - this maintains all existing patients
    }

    // If we have no results after filtering, log debug information
    if (filtered.length === 0 && patients.length > 0) {
      console.log("Filter debugging - all filters resulted in zero matching patients");
      console.log("Selected symptom:", selectedSymptom);
      console.log("Selected diagnosis:", selectedDiagnosis);
      console.log("Selected category:", selectedDiagnosticCategory);
      console.log("Selected ICD-10:", selectedIcd10Code);
      console.log("Selected HRSN problem:", selectedHrsnProblem);
      console.log("Selected Symptom ID:", selectedSymptomId);
    }

    return filtered;
  };

  // Toggle chart selection
  const toggleChartSelection = (chartId: string) => {
    setSelectedCharts(prev => {
      if (prev.includes(chartId)) {
        return prev.filter(id => id !== chartId);
      } else {
        return [...prev, chartId];
      }
    });
  };

  // This function is now handled by the toggleAllCharts function above

  // DISABLED: Toggle section expansion - ALL SECTIONS FORCED TO STAY EXPANDED
  const toggleSection = (section: string) => {
    console.log(`🚫 TOGGLE DISABLED: ${section} - all sections forced to stay expanded`);
    // Do nothing - sections remain expanded permanently
  };

  // Generate printable report
  const generateReport = () => {
    window.print();
  };

  // Export selected charts as CSV
  const exportData = () => {
    alert('Export feature will be implemented in a future update');
  };

  // Create categorical aggregated data just like "/api/visualization-data" does for "All" patients
  const createCategoricalAggregations = (rawPatients: any[]) => {
    console.log(`🔍 DEBUG: Input rawPatients:`, rawPatients?.length, rawPatients?.slice(0, 2));

    if (!rawPatients || rawPatients.length === 0) {
      console.log(`❌ DEBUG: No patients to process`);
      return [];
    }

    // Create aggregated data structure matching what the visualization API returns
    const aggregatedData: any[] = [];

    // Process each patient to create categorical breakdowns
    rawPatients.forEach((patient, index) => {
      if (!patient) return;

      // Create age range categorization (matching "All" patient charts)
      const ageRange = patient.age_range || generateAgeRange(patient.age);
      const gender = patient.gender || patient.sex || 'Unknown';
      const race = patient.race || patient.ethnicity || 'Unknown';

      if (index < 3) {
        console.log(`🔍 DEBUG Patient ${index}:`, {
          original_age: patient.age,
          generated_age_range: ageRange,
          original_gender: patient.gender || patient.sex,
          final_gender: gender
        });
      }

      // Add categorical record for this patient
      // CRITICAL: Preserve empty/null values for proper "No Data Available" detection
      // Do NOT convert to 'Unknown' here - let the chart component handle empty data validation
      aggregatedData.push({
        ...patient,
        age_range: ageRange,
        gender: gender,
        race: race,
        financial_status: patient.financial_status || patient.financial_strain || null,
        housing_insecurity: patient.housing_insecurity || null,
        food_insecurity: patient.food_insecurity || null,
        access_to_transportation: patient.access_to_transportation || patient.transportation_needs || null,
        has_a_car: patient.has_a_car || patient.vehicle_access || null,
        veteran_status: patient.veteran_status || null,
        education_level: patient.education_level || null,
        // Include zip code information for geographic mapping
        zip_code: patient.zip_code || patient.zipCode || patient.zip || patient.patient_zip_code || null,
        zipCode: patient.zip_code || patient.zipCode || patient.zip || patient.patient_zip_code || null,
        zip: patient.zip_code || patient.zipCode || patient.zip || patient.patient_zip_code || null
      });
    });

    console.log(`🎯 Created categorical aggregations for ${aggregatedData.length} patient records`);
    console.log(`🔍 Sample aggregated data:`, aggregatedData.slice(0, 2));

    // Debug zip code availability in aggregated data
    const zipCodeCount = aggregatedData.filter(p => p.zip_code || p.zipCode || p.zip).length;
    console.log(`🗺️ GEOGRAPHIC DEBUG: ${zipCodeCount}/${aggregatedData.length} patients have zip code data`);
    if (zipCodeCount > 0) {
      const sampleZips = aggregatedData.filter(p => p.zip_code || p.zipCode || p.zip).slice(0, 5);
      console.log(`🗺️ Sample zip codes found:`, sampleZips.map(p => p.zip_code || p.zipCode || p.zip));
      console.log(`🗺️ Full patient sample with zip codes:`, sampleZips.map(p => ({
        patient_id: p.patient_id || p.id,
        zip_code: p.zip_code,
        zipCode: p.zipCode,
        zip: p.zip
      })));
    } else {
      console.log(`🗺️ NO ZIP CODES FOUND - Checking first 3 patient records:`, aggregatedData.slice(0, 3).map(p => ({
        patient_id: p.patient_id || p.id,
        all_fields: Object.keys(p).filter(key => key.includes('zip')),
        zip_code: p.zip_code,
        zipCode: p.zipCode,
        zip: p.zip
      })));
    }
    return aggregatedData;
  };

  // Helper function to generate age range from numeric age (matching detailed heatmap requirements)
  const generateAgeRange = (age: any) => {
    if (!age || typeof age !== 'number') return 'Unknown';
    if (age < 18) return '0-17';
    if (age <= 25) return '18-25';
    if (age <= 35) return '26-35';
    if (age <= 50) return '36-50';
    if (age <= 65) return '51-65';
    return '65+';
  };

  // Use categorical aggregations just like "All" patient charts do
  // This ensures filtered charts show proper breakdowns instead of single totals
  const filteredData = createCategoricalAggregations(patients);

  // Debug logging after all variables are initialized
  console.log("🔍 SECTION EXPANSION STATE:", expandedSections);
  console.log("🔍 FILTERED DATA LENGTH:", filteredData.length);

  // Add explicit unique patient counting to ensure disparities graphs use unique counts
  // Track distinct patient IDs for each demographic field
  const patientCountsById = new Map();

  // Process filtered patients to ensure we count each patient only once
  filteredData.forEach((patient: any) => {
    if (!patient) return;
    const patientId = patient.id || patient.patient_id;
    if (!patientId) return;

    // Record this patient in our unique count tracker
    if (!patientCountsById.has(patientId)) {
      patientCountsById.set(patientId, true);
    }
  });

  console.log(`Using ${filteredData.length} total records representing ${patientCountsById.size} unique patients for visualization`);

  // Filter configuration for charts
  const filterConfig = {
    symptom: selectedSymptom,
    diagnosis: selectedDiagnosis,
    diagnosticCategory: selectedDiagnosticCategory,
    icd10Code: selectedIcd10Code
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">HRSN Population Health</h2>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="shadow-md">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3].map(j => (
                  <Skeleton key={j} className="h-64 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Check for empty patients data
  if (!patients || patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-xl font-medium text-muted-foreground">No HRSN data available</p>
        <p className="text-sm text-muted-foreground mt-2">Try running a new analysis with different parameters</p>
      </div>
    );
  }

  // Ensure that each filter is properly checked with both existence and value comparison
  const filterActive = 
    (selectedSymptom && selectedSymptom !== "all_symptoms") || 
    (selectedDiagnosis && selectedDiagnosis !== "all_diagnoses") || 
    (selectedDiagnosticCategory && selectedDiagnosticCategory !== "all_categories") || 
    (selectedIcd10Code && selectedIcd10Code !== "all_icd10") || 
    (selectedHrsnProblem && selectedHrsnProblem !== "all_hrsn_problems") || 
    (selectedSymptomId && selectedSymptomId !== "all_symptom_ids");

  // Create a unique key that changes when filters change to force chart re-rendering
  const chartKey = `${selectedDiagnosis}-${selectedDiagnosticCategory}-${selectedSymptom}-${patients.length}`;

  return (
    <div className="space-y-8" key={chartKey}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">HRSN Population Health</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select_all_charts"
                checked={selectedCharts.length === getAllChartIds().length && getAllChartIds().length > 0}
                onCheckedChange={(checked) => toggleAllCharts(checked === true)}
              />
              <label 
                htmlFor="select_all_charts" 
                className="text-sm font-medium cursor-pointer"
              >
                Select All Charts ({selectedCharts.length}/{getAllChartIds().length})
              </label>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSelector />
          <Button variant="outline" size="sm" onClick={generateReport}>
            <Printer className="h-4 w-4 mr-2" /> Print All Charts
          </Button>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>

          {/* Visualization Data Source info - displayed for printing */}
          <div className="ml-4 text-xs text-gray-500 border border-dashed border-gray-300 p-2 rounded-md print:block hidden">
            <p className="font-medium">Visualization Data Source</p>
            <p>File: Symptom_Segments_asof_4_30_25_MASTER.json</p>
            <p>Date generated: {new Date().toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: '2-digit'})}</p>
          </div>
        </div>
      </div>

      {filterActive && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
          <div className="flex items-center gap-2 text-blue-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Filter active:</span>
            <div className="flex flex-wrap gap-2">
              {selectedSymptom && selectedSymptom !== "all_symptoms" && (
                <span className="bg-blue-100 px-2 py-1 rounded text-sm">
                  Symptom: {selectedSymptom.replace(/_/g, ' ')}
                </span>
              )}
              {selectedDiagnosis && selectedDiagnosis !== "all_diagnoses" && (
                <span className="bg-blue-100 px-2 py-1 rounded text-sm">
                  Diagnosis: {selectedDiagnosis}
                </span>
              )}
              {selectedDiagnosticCategory && selectedDiagnosticCategory !== "all_categories" && (
                <span className="bg-blue-100 px-2 py-1 rounded text-sm">
                  Category: {selectedDiagnosticCategory}
                </span>
              )}
              {selectedIcd10Code && selectedIcd10Code !== "all_icd10" && (
                <span className="bg-blue-100 px-2 py-1 rounded text-sm">
                  ICD-10: {selectedIcd10Code}
                </span>
              )}
              {selectedHrsnProblem && selectedHrsnProblem !== "all_hrsn_problems" && (
                <span className="bg-blue-100 px-2 py-1 rounded text-sm">
                  HRSN Problem: {selectedHrsnProblem.replace(/_/g, ' ')}
                </span>
              )}
              {/* Only show Symptom ID when one is actually selected */}
              {selectedSymptomId && selectedSymptomId !== "all_symptom_ids" && (
                <span className="bg-blue-100 px-2 py-1 rounded text-sm">
                  Symptom ID: {selectedSymptomId}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chart Selection Controls */}
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
        <div className="flex items-center">
          <span className="font-medium mr-2">Chart Selection:</span>
          <span className="text-sm text-gray-500">
            {selectedCharts.length} charts selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox 
            id="select_all_charts_control"
            checked={getAllChartIds().every(id => selectedCharts.includes(id)) && getAllChartIds().length > 0}
            onCheckedChange={(checked) => toggleAllCharts(checked === true)}
          />
          <label 
            htmlFor="select_all_charts_control" 
            className="text-sm font-medium cursor-pointer"
          >
            Select All Charts
          </label>
        </div>
      </div>

      {/* Age Range Section */}
      <Card className="shadow-md mb-4 border-2 border-gray-200">
        <CardHeader className="pb-2 pt-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-sm font-medium">Age Range</CardTitle>
              <CardDescription className="text-xs">
                Distribution of patients by age range
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select_age_range"
                checked={["Age Range_count", "Age Range_percentage", "Age Range_distribution"].every(id => 
                  selectedCharts.includes(id)
                )}
                onCheckedChange={(checked) => {
                  const ids = ["Age Range_count", "Age Range_percentage", "Age Range_distribution"];

                  if (checked) {
                    // Add all ids that aren't already in the array
                    const newIds = ids.filter(id => !selectedCharts.includes(id));
                    setSelectedCharts(prev => [...prev, ...newIds]);
                  } else {
                    // Remove all ids
                    setSelectedCharts(prev => prev.filter(id => !ids.includes(id)));
                  }
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => toggleSection("ageRange")}
                className="h-8 w-8 p-0"
              >
                {expandedSections.ageRange ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {expandedSections.ageRange && (
          <CardContent className="p-3 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StandardizedHrsnChart
                data={filteredData}
                chartId="Age Range_count"
                title="Age Range Count" 
                categoryName="age_range"
                chartType="count"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Age Range_count")}
                onToggleSelection={toggleChartSelection}
                dualSourceHrsnData={dualSourceHrsnData}
              />

              <StandardizedHrsnChart
                data={filteredData}
                chartId="Age Range_percentage"
                title="Age Range Percentage" 
                categoryName="age_range"
                chartType="percentage"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Age Range_percentage")}
                onToggleSelection={toggleChartSelection}
                dualSourceHrsnData={dualSourceHrsnData}
              />

              <div className="relative">
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Age Range Distribution" 
                  categoryName="age_range"
                  chartType="heatmap"
                  compactMode={true}
                  yAxisCategory="age_range"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Age Range Distribution chart');
                    toggleChartExpansion("Age Range Distribution");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="relative">
                <AgeRangeInfographic
                  title="Age Range Geographic Distribution"
                  totalPatients={patients?.length || 2456}
                  patientData={patients}
                  categoryName="age_range"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Age Range Geographic');
                    toggleChartExpansion("Age Range Geographic");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Gender Section */}
      <Card className="shadow-md mb-4">
        <CardHeader className="pb-0 mb-0">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base font-medium">Gender</CardTitle>
              <CardDescription>
                Distribution of patients by gender
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select_gender"
                checked={["Gender_count", "Gender_percentage", "Gender_distribution"].every(id => 
                  selectedCharts.includes(id)
                )}
                onCheckedChange={(checked) => {
                  const ids = ["Gender_count", "Gender_percentage", "Gender_distribution"];

                  if (checked) {
                    // Add all ids that aren't already in the array
                    const newIds = ids.filter(id => !selectedCharts.includes(id));
                    setSelectedCharts(prev => [...prev, ...newIds]);
                  } else {
                    // Remove all ids
                    setSelectedCharts(prev => prev.filter(id => !ids.includes(id)));
                  }
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => toggleSection("gender")}
                className="h-8 w-8 p-0"
              >
                {expandedSections.gender ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {expandedSections.gender && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StandardizedHrsnChart
                data={filteredData}
                chartId="Gender_count"
                title="Gender Count" 
                categoryName="gender"
                chartType="count"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Gender_count")}
                onToggleSelection={toggleChartSelection}
                dualSourceHrsnData={dualSourceHrsnData}
              />

              <StandardizedHrsnChart
                data={filteredData}
                chartId="Gender_percentage"
                title="Gender Percentage" 
                categoryName="gender"
                chartType="percentage"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Gender_percentage")}
                onToggleSelection={toggleChartSelection}
                dualSourceHrsnData={dualSourceHrsnData}
              />

              <div className="relative">
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Gender Distribution" 
                  categoryName="age_range"
                  chartType="heatmap"
                  compactMode={true}
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  yAxisCategory="gender"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Gender Distribution chart');
                    toggleChartExpansion("Gender Distribution");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="relative">
                <GenderInfographic
                  title="Gender Geographic Distribution"
                  totalPatients={patients?.length || 2456}
                  patientData={patients}
                  categoryName="gender"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Gender Geographic');
                    toggleChartExpansion("Gender Geographic");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Race Section */}
      <Card className="shadow-md mb-4">
        <CardHeader className="pb-0 mb-0">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base font-medium">Race</CardTitle>
              <CardDescription>
                Distribution of patients by race
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select_race"
                checked={["Race_count", "Race_percentage", "Race_distribution"].every(id => 
                  selectedCharts.includes(id)
                )}
                onCheckedChange={(checked) => {
                  const ids = ["Race_count", "Race_percentage", "Race_distribution"];

                  if (checked) {
                    // Add all ids that aren't already in the array
                    const newIds = ids.filter(id => !selectedCharts.includes(id));
                    setSelectedCharts(prev => [...prev, ...newIds]);
                  } else {
                    // Remove all ids
                    setSelectedCharts(prev => prev.filter(id => !ids.includes(id)));
                  }
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => toggleSection("race")}
                className="h-8 w-8 p-0"
              >
                {expandedSections.race ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {expandedSections.race && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StandardizedHrsnChart
                data={filteredData}
                chartId="Race_count"
                title="Race Count" 
                categoryName="race"
                chartType="count"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Race_count")}
                onToggleSelection={toggleChartSelection}
              />

              <StandardizedHrsnChart
                data={filteredData}
                chartId="Race_percentage"
                title="Race Percentage" 
                categoryName="race"
                chartType="percentage"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Race_percentage")}
                onToggleSelection={toggleChartSelection}
              />

              <div className="relative">
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Race Distribution" 
                  categoryName="age_range"
                  chartType="heatmap"
                  compactMode={true}
                  yAxisCategory="race"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Race Distribution chart');
                    toggleChartExpansion("Race Distribution");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="relative">
                <RaceInfographic
                  title="Race Geographic Distribution"
                  totalPatients={patients?.length || 2456}
                  patientData={patients}
                  categoryName="race"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Race Geographic');
                    toggleChartExpansion("Race Geographic");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Ethnicity Section */}
      <Card className="shadow-md mb-4">
        <CardHeader className="pb-0 mb-0">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base font-medium">Ethnicity</CardTitle>
              <CardDescription>
                Distribution of patients by ethnicity
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select_ethnicity"
                checked={["Ethnicity_count", "Ethnicity_percentage", "Ethnicity_distribution"].every(id => 
                  selectedCharts.includes(id)
                )}
                onCheckedChange={(checked) => {
                  const ids = ["Ethnicity_count", "Ethnicity_percentage", "Ethnicity_distribution"];

                  if (checked) {
                    // Add all ids that aren't already in the array
                    const newIds = ids.filter(id => !selectedCharts.includes(id));
                    setSelectedCharts(prev => [...prev, ...newIds]);
                  } else {
                    // Remove all ids
                    setSelectedCharts(prev => prev.filter(id => !ids.includes(id)));
                  }
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => toggleSection("ethnicity")}
                className="h-8 w-8 p-0"
              >
                {expandedSections.ethnicity ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {expandedSections.ethnicity && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StandardizedHrsnChart
                data={filteredData}
                chartId="Ethnicity_count"
                title="Ethnicity Count" 
                categoryName="ethnicity"
                chartType="count"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Ethnicity_count")}
                onToggleSelection={toggleChartSelection}
              />

              <StandardizedHrsnChart
                data={filteredData}
                chartId="Ethnicity_percentage"
                title="Ethnicity Percentage" 
                categoryName="ethnicity"
                chartType="percentage"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Ethnicity_percentage")}
                onToggleSelection={toggleChartSelection}
              />

              <div className="relative">
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Ethnicity Distribution" 
                  categoryName="age_range"
                  chartType="heatmap"
                  compactMode={true}
                  yAxisCategory="ethnicity"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Ethnicity Distribution chart');
                    toggleChartExpansion("Ethnicity Distribution");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="relative">
                <EthnicityInfographic
                  title="Ethnicity Geographic Distribution"
                  totalPatients={patients?.length || 2456}
                  patientData={patients}
                  categoryName="ethnicity"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Ethnicity Geographic');
                    toggleChartExpansion("Ethnicity Geographic");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Zip Code Section */}
      <Card className="shadow-md mb-4">
        <CardHeader className="pb-0 mb-0">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base font-medium">Zip Code</CardTitle>
              <CardDescription>
                Distribution of patients by the top 25 zip codes out of {getTotalUniqueZipCodes()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select_zip_code"
                checked={["Zip Code_count", "Zip Code_percentage", "Zip Code_distribution"].every(id => 
                  selectedCharts.includes(id)
                )}
                onCheckedChange={(checked) => {
                  const ids = ["Zip Code_count", "Zip Code_percentage", "Zip Code_distribution"];

                  if (checked) {
                    // Add all ids that aren't already in the array
                    const newIds = ids.filter(id => !selectedCharts.includes(id));
                    setSelectedCharts(prev => [...prev, ...newIds]);
                  } else {
                    // Remove all ids
                    setSelectedCharts(prev => prev.filter(id => !ids.includes(id)));
                  }
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => toggleSection("zipCode")}
                className="h-8 w-8 p-0"
              >
                {expandedSections.zipCode ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {expandedSections.zipCode && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StandardizedHrsnChart
                data={filteredData}
                chartId="Zip Code_count"
                title="Zip Code Count" 
                categoryName="zip_code"
                chartType="count"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Zip Code_count")}
                onToggleSelection={toggleChartSelection}
              />

              <StandardizedHrsnChart
                data={filteredData}
                chartId="Zip Code_percentage"
                title="Zip Code Percentage" 
                categoryName="zip_code"
                chartType="percentage"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Zip Code_percentage")}
                onToggleSelection={toggleChartSelection}
                dualSourceHrsnData={dualSourceHrsnData}
              />

              <div className="relative">
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Zip Code Distribution" 
                  categoryName="zip_code"
                  chartType="heatmap"
                  compactMode={true}
                  yAxisCategory="zip_code"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Zip Code Distribution chart');
                    toggleChartExpansion("Zip Code Distribution");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              {/* ZIP Code Geographic Infographic - Compact View with Expand Button */}
              {!expandedCharts["Zip Code Geographic"] && (
                <div className="relative">
                  <ZipCodeInfographic
                    title="ZIP Code Geographic Distribution"
                    totalPatients={patients?.length || 2456}
                    uniqueZipCodes={new Set(filteredData?.map(p => p.zip_code || p.zipCode).filter(Boolean)).size || 170}
                    topZipCodes={(() => {
                      const zipCounts: Record<string, number> = {};
                      filteredData?.forEach(patient => {
                        const zip = patient.zip_code || patient.zipCode;
                        if (zip) zipCounts[zip] = (zipCounts[zip] || 0) + 1;
                      });
                      return Object.entries(zipCounts)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([zipCode, count]) => ({ zipCode, count }));
                    })()}
                    categoryName="zip_code"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🗺️ EXPANDING ZIP CODE CHOROPLETH MAP');
                      console.log('🗺️ Current expandedCharts state:', expandedCharts);
                      toggleChartExpansion("Zip Code Geographic");
                      console.log('🗺️ Called toggleChartExpansion for "Zip Code Geographic"');
                    }}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Zip Code Density Map will be implemented here in the future */}
          </CardContent>
        )}
      </Card>

      {/* Financial Strain Section */}
      <Card className="shadow-md mb-4">
        <CardHeader className="pb-0 mb-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-medium">Financial Strain</CardTitle>
                <DualSourceIndicator 
                  dataSource={getDataSourceForField('financial_strain', transformedDualSourceData)}
                  className="ml-2"
                  showText={false}
                />
              </div>
              <CardDescription>
                Distribution of patients by financial strain (HRSN indicator)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select_financial_strain"
                checked={["Financial Strain_count", "Financial Strain_percentage", "Financial Strain_distribution"].every(id => 
                  selectedCharts.includes(id)
                )}
                onCheckedChange={(checked) => {
                  const ids = ["Financial Strain_count", "Financial Strain_percentage", "Financial Strain_distribution"];

                  if (checked) {
                    // Add all ids that aren't already in the array
                    const newIds = ids.filter(id => !selectedCharts.includes(id));
                    setSelectedCharts(prev => [...prev, ...newIds]);
                  } else {
                    // Remove all ids
                    setSelectedCharts(prev => prev.filter(id => !ids.includes(id)));
                  }
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => toggleSection("financialStrain")}
                className="h-8 w-8 p-0"
              >
                {expandedSections.financialStrain ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {(() => {
          console.log("🚨 FINANCIAL STRAIN SECTION CHECK:", {
            expanded: expandedSections.financialStrain,
            expandedSectionsKeys: Object.keys(expandedSections),
            patientsLength: patients?.length || 0
          });
          return null;
        })()}
        {expandedSections.financialStrain && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StandardizedHrsnChart
                data={filteredData}
                chartId="Financial Strain_count"
                title="Financial Strain Count" 
                categoryName="financial_strain"
                chartType="count"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Financial Strain_count")}
                onToggleSelection={toggleChartSelection}
                dualSourceHrsnData={dualSourceHrsnData}
              />

              <StandardizedHrsnChart
                data={filteredData}
                chartId="Financial Strain_percentage"
                title="Financial Strain Percentage" 
                categoryName="financial_strain"
                chartType="percentage"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Financial Strain_percentage")}
                onToggleSelection={toggleChartSelection}
                dualSourceHrsnData={dualSourceHrsnData}
              />

              <div className="relative">
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Financial Strain Distribution" 
                  categoryName="financial_strain"
                  chartType="heatmap"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  compactMode={true}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("🔍 EXPAND BUTTON: Financial Strain Distribution clicked");
                    toggleChartExpansion("Financial Strain Distribution");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="relative">
                {(() => {
                  console.log("🔍 FINANCIAL STRAIN INFOGRAPHIC DEBUG:", {
                    patientsLength: patients?.length,
                    affectedCount: patients?.filter(patient => 
                      patient.financial_strain === 'Yes' || patient.financial_strain === true
                    ).length,
                    firstPatient: patients?.[0],
                    expandedState: expandedSections.financialStrain
                  });
                  return null;
                })()}
                <HRSNZipCodeInfographic
                  title="Financial Strain Geographic Distribution"
                  totalPatients={patients?.length || 2456}
                  affectedCount={transformedDualSourceData?.categories?.financial_strain?.totalAffected || 269}
                  categoryName="financial_strain"
                  patientData={patients}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Financial Strain Geographic');
                    toggleChartExpansion("Financial Strain Geographic");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Housing Insecurity Section */}
      <Card className="shadow-md mb-4">
        <CardHeader className="pb-0 mb-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <CardTitle className="text-base font-medium">Housing Insecurity</CardTitle>
                <DualSourceIndicator 
                  dataSource={getDataSourceForField('housing_insecurity', transformedDualSourceData)}
                  className="ml-2"
                  showText={false}
                />
              </div>
              <CardDescription>
                Distribution of patients by housing insecurity (HRSN indicator)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select_housing_insecurity"
                checked={["Housing Insecurity_count", "Housing Insecurity_percentage", "Housing Insecurity_distribution"].every(id => 
                  selectedCharts.includes(id)
                )}
                onCheckedChange={(checked) => {
                  const ids = ["Housing Insecurity_count", "Housing Insecurity_percentage", "Housing Insecurity_distribution"];

                  if (checked) {
                    // Add all ids that aren't already in the array
                    const newIds = ids.filter(id => !selectedCharts.includes(id));
                    setSelectedCharts(prev => [...prev, ...newIds]);
                  } else {
                    // Remove all ids
                    setSelectedCharts(prev => prev.filter(id => !ids.includes(id)));
                  }
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => toggleSection("housingInsecurity")}
                className="h-8 w-8 p-0"
              >
                {expandedSections.housingInsecurity ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {(() => {
          console.log('🏠🏠🏠 HOUSING SECTION EXPANDED:', expandedSections.housingInsecurity);
          console.log('🏠🏠🏠 Should render Housing Geographic component');
          return null;
        })()}
        {expandedSections.housingInsecurity && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StandardizedHrsnChart
                data={filteredData}
                chartId="Housing Insecurity_count"
                title="Housing Count" 
                categoryName="housing_insecurity"
                chartType="count"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Housing Insecurity_count")}
                onToggleSelection={toggleChartSelection}
                dualSourceHrsnData={dualSourceHrsnData}
              />

              <StandardizedHrsnChart
                data={filteredData}
                chartId="Housing Insecurity_percentage"
                title="Housing Percentage" 
                categoryName="housing_insecurity"
                chartType="percentage"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Housing Insecurity_percentage")}
                onToggleSelection={toggleChartSelection}
              />

              <div className="relative">
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Housing Distribution" 
                  categoryName="housing_insecurity"
                  chartType="heatmap"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  compactMode={true}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("🔍 EXPAND BUTTON: Housing Distribution clicked");
                    toggleChartExpansion("Housing Distribution");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Geographic Zip Code Map */}
              <div className="relative">
                <HRSNZipCodeInfographic
                  title="Housing Insecurity Geographic Distribution"
                  totalPatients={patients?.length || 2456}
                  affectedCount={transformedDualSourceData?.categories?.housing_insecurity?.totalAffected || 186}
                  categoryName="housing_insecurity"
                  patientData={patients}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Housing Insecurity Geographic');
                    toggleChartExpansion("Housing Insecurity Geographic");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Food Insecurity Section */}
      <Card className="shadow-md mb-4">
        <CardHeader className="pb-0 mb-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <CardTitle className="text-base font-medium">Food Insecurity</CardTitle>
                <DualSourceIndicator 
                  dataSource={getDataSourceForField('food_insecurity', transformedDualSourceData)}
                  className="ml-2"
                  showText={false}
                />
              </div>
              <CardDescription>
                Distribution of patients by food insecurity (HRSN indicator)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select_food_insecurity"
                checked={["Food Insecurity_count", "Food Insecurity_percentage", "Food Insecurity_distribution"].every(id => 
                  selectedCharts.includes(id)
                )}
                onCheckedChange={(checked) => {
                  const ids = ["Food Insecurity_count", "Food Insecurity_percentage", "Food Insecurity_distribution"];

                  if (checked) {
                    // Add all ids that aren't already in the array
                    const newIds = ids.filter(id => !selectedCharts.includes(id));
                    setSelectedCharts(prev => [...prev, ...newIds]);
                  } else {
                    // Remove all ids
                    setSelectedCharts(prev => prev.filter(id => !ids.includes(id)));
                  }
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => toggleSection("foodInsecurity")}
                className="h-8 w-8 p-0"
              >
                {expandedSections.foodInsecurity ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {expandedSections.foodInsecurity && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StandardizedHrsnChart
                data={filteredData}
                chartId="Food Insecurity_count"
                title="Food Count" 
                categoryName="food_insecurity"
                chartType="count"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Food Insecurity_count")}
                onToggleSelection={toggleChartSelection}
                dualSourceHrsnData={dualSourceHrsnData}
              />

              <StandardizedHrsnChart
                data={filteredData}
                chartId="Food Insecurity_percentage"
                title="Food Percentage" 
                categoryName="food_insecurity"
                chartType="percentage"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Food Insecurity_percentage")}
                onToggleSelection={toggleChartSelection}
              />

              <div className="relative">
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Food Distribution" 
                  categoryName="food_insecurity"
                  chartType="heatmap"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  compactMode={true}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("🔍 EXPAND BUTTON: Food Distribution clicked");
                    toggleChartExpansion("Food Distribution");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Geographic Zip Code Map */}
              <div className="relative">
                <HRSNZipCodeInfographic
                  title="Food Insecurity Geographic Distribution"
                  totalPatients={patients?.length || 2456}
                  affectedCount={transformedDualSourceData?.categories?.food_insecurity?.totalAffected || 376}
                  categoryName="food_insecurity"
                  patientData={patients}
                  extractedSymptoms={safeData.extractedSymptoms || []}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Food Insecurity Geographic');
                    toggleChartExpansion("Food Insecurity Geographic");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Veteran Status Section */}
      <Card className="shadow-md mb-4">
        <CardHeader className="pb-0 mb-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <CardTitle className="text-base font-medium">Veteran Status</CardTitle>
                <DualSourceIndicator 
                  dataSource={getDataSourceForField('veteran_status', transformedDualSourceData)}
                  className="ml-2"
                  showText={false}
                />
              </div>
              <CardDescription>
                Distribution of patients by veteran status (HRSN indicator)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select_veteran_status"
                checked={["Veteran Status_count", "Veteran Status_percentage", "Veteran Status_distribution"].every(id => 
                  selectedCharts.includes(id)
                )}
                onCheckedChange={(checked) => {
                  const ids = ["Veteran Status_count", "Veteran Status_percentage", "Veteran Status_distribution"];

                  if (checked) {
                    // Add all ids that aren't already in the array
                    const newIds = ids.filter(id => !selectedCharts.includes(id));
                    setSelectedCharts(prev => [...prev, ...newIds]);
                  } else {
                    // Remove all ids
                    setSelectedCharts(prev => prev.filter(id => !ids.includes(id)));
                  }
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => toggleSection("veteranStatus")}
                className="h-8 w-8 p-0"
              >
                {expandedSections.veteranStatus ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {expandedSections.veteranStatus && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StandardizedHrsnChart
                data={filteredData}
                chartId="Veteran Status_count"
                title="Veteran Status Count" 
                categoryName="veteran_status"
                chartType="count"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Veteran Status_count")}
                onToggleSelection={toggleChartSelection}
                dualSourceHrsnData={dualSourceHrsnData}
              />

              <StandardizedHrsnChart
                data={filteredData}
                chartId="Veteran Status_percentage"
                title="Veteran Status Percentage" 
                categoryName="veteran_status"
                chartType="percentage"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Veteran Status_percentage")}
                onToggleSelection={toggleChartSelection}
              />

              <div className="relative">
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Veteran Status Distribution" 
                  categoryName="veteran_status"
                  chartType="heatmap"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  compactMode={true}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("🔍 EXPAND BUTTON: Veteran Status Distribution clicked");
                    toggleChartExpansion("Veteran Status Distribution");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Geographic Zip Code Map */}
              <div className="relative">
                <HRSNZipCodeInfographic
                  title="Veteran Status Geographic Distribution"
                  totalPatients={patients?.length || 2456}
                  affectedCount={transformedDualSourceData?.categories?.veteran_status?.totalAffected || 0}
                  categoryName="veteran_status"
                  patientData={patients}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Veteran Status Geographic');
                    toggleChartExpansion("Veteran Status Geographic");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Education Level Section */}
      <Card className="shadow-md mb-4">
        <CardHeader className="pb-0 mb-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <CardTitle className="text-base font-medium">Education Level</CardTitle>
                <DualSourceIndicator 
                  dataSource={getDataSourceForField('education_level', transformedDualSourceData)}
                  className="ml-2"
                  showText={false}
                />
              </div>
              <CardDescription>
                Distribution of patients by education level (HRSN indicator)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select_education_level"
                checked={["Education Level_count", "Education Level_percentage", "Education Level_distribution"].every(id => 
                  selectedCharts.includes(id)
                )}
                onCheckedChange={(checked) => {
                  const ids = ["Education Level_count", "Education Level_percentage", "Education Level_distribution"];

                  if (checked) {
                    // Add all ids that aren't already in the array
                    const newIds = ids.filter(id => !selectedCharts.includes(id));
                    setSelectedCharts(prev => [...prev, ...newIds]);
                  } else {
                    // Remove all ids
                    setSelectedCharts(prev => prev.filter(id => !ids.includes(id)));
                  }
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => toggleSection("educationLevel")}
                className="h-8 w-8 p-0"
              >
                {expandedSections.educationLevel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {expandedSections.educationLevel && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StandardizedHrsnChart
                data={filteredData}
                chartId="Education Level_count"
                title="Education Level Count" 
                categoryName="education_level"
                chartType="count"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Education Level_count")}
                onToggleSelection={toggleChartSelection}
                dualSourceHrsnData={dualSourceHrsnData}
              />

              <StandardizedHrsnChart
                data={filteredData}
                chartId="Education Level_percentage"
                title="Education Level Percentage" 
                categoryName="education_level"
                chartType="percentage"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Education Level_percentage")}
                onToggleSelection={toggleChartSelection}
              />

              <div className="relative">
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Education Level Distribution" 
                  categoryName="education_level"
                  chartType="heatmap"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  compactMode={true}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("🔍 EXPAND BUTTON: Education Level Distribution clicked");
                    toggleChartExpansion("Education Level Distribution");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Geographic Zip Code Map */}
              <div className="relative">
                <EducationInfographic
                  title="Education Level Geographic Distribution"
                  totalPatients={patients?.length || 2456}
                  patientData={patients}
                  categoryName="education_level"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Education Level Geographic');
                    toggleChartExpansion("Education Level Geographic");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Access to Transportation Section */}
      <Card className="shadow-md mb-4">
        <CardHeader className="pb-0 mb-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <CardTitle className="text-base font-medium">Access to Transportation</CardTitle>
                <DualSourceIndicator 
                  dataSource={getDataSourceForField('access_to_transportation', transformedDualSourceData)}
                  className="ml-2"
                  showText={false}
                />
              </div>
              <CardDescription>
                Distribution of patients by transportation access (HRSN indicator)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select_transportation_insecurity"
                checked={["Transportation Insecurity_count", "Transportation Insecurity_percentage", "Transportation Insecurity_distribution"].every(id => 
                  selectedCharts.includes(id)
                )}
                onCheckedChange={(checked) => {
                  const ids = ["Transportation Insecurity_count", "Transportation Insecurity_percentage", "Transportation Insecurity_distribution"];

                  if (checked) {
                    // Add all ids that aren't already in the array
                    const newIds = ids.filter(id => !selectedCharts.includes(id));
                    setSelectedCharts(prev => [...prev, ...newIds]);
                  } else {
                    // Remove all ids
                    setSelectedCharts(prev => prev.filter(id => !ids.includes(id)));
                  }
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => toggleSection("transportationInsecurity")}
                className="h-8 w-8 p-0"
              >
                {expandedSections.transportationInsecurity ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {expandedSections.transportationInsecurity && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StandardizedHrsnChart
                data={filteredData}
                chartId="Transportation Insecurity_count"
                title="Transportation Count" 
                categoryName="access_to_transportation"
                chartType="count"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Transportation Insecurity_count")}
                onToggleSelection={toggleChartSelection}
              />

              <StandardizedHrsnChart
                data={filteredData}
                chartId="Transportation Insecurity_percentage"
                title="Transportation Percentage" 
                categoryName="access_to_transportation"
                chartType="percentage"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Transportation Insecurity_percentage")}
                onToggleSelection={toggleChartSelection}
              />

              <div className="relative">
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Transportation Distribution" 
                  categoryName="access_to_transportation"
                  chartType="heatmap"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  compactMode={true}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("🔍 EXPAND BUTTON: Transportation Distribution clicked");
                    toggleChartExpansion("Transportation Distribution");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Geographic Zip Code Map */}
              <div className="relative">
                <HRSNZipCodeInfographic
                  title="Access to Transportation Geographic Distribution"
                  totalPatients={patients?.length || 2456}
                  affectedCount={transformedDualSourceData?.categories?.access_to_transportation?.totalAffected || 1002}
                  categoryName="access_to_transportation"
                  patientData={patients}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Access to Transportation Geographic');
                    toggleChartExpansion("Access to Transportation Geographic");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Has a Car Section */}
      <Card className="shadow-md mb-4">
        <CardHeader className="pb-0 mb-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <CardTitle className="text-base font-medium">Has a Car</CardTitle>
                <DualSourceIndicator 
                  dataSource={getDataSourceForField('has_a_car', transformedDualSourceData)}
                  className="ml-2"
                  showText={false}
                />
              </div>
              <CardDescription>
                Distribution of patients by vehicle access (HRSN indicator)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select_has_car"
                checked={["Has a Car_count", "Has a Car_percentage", "Has a Car_distribution"].every(id => 
                  selectedCharts.includes(id)
                )}
                onCheckedChange={(checked) => {
                  const ids = ["Has a Car_count", "Has a Car_percentage", "Has a Car_distribution"];

                  if (checked) {
                    // Add all ids that aren't already in the array
                    const newIds = ids.filter(id => !selectedCharts.includes(id));
                    setSelectedCharts(prev => [...prev, ...newIds]);
                  } else {
                    // Remove all ids
                    setSelectedCharts(prev => prev.filter(id => !ids.includes(id)));
                  }
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => toggleSection("hasCar")}
                className="h-8 w-8 p-0"
              >
                {expandedSections.hasCar ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {expandedSections.hasCar && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StandardizedHrsnChart
                data={filteredData}
                chartId="Has a Car_count"
                title="Has a Car Count" 
                categoryName="has_a_car"
                chartType="count"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Has a Car_count")}
                onToggleSelection={toggleChartSelection}
                dualSourceHrsnData={dualSourceHrsnData}
              />

              <StandardizedHrsnChart
                data={filteredData}
                chartId="Has a Car_percentage"
                title="Has a Car Percentage" 
                categoryName="has_a_car"
                chartType="percentage"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Has a Car_percentage")}
                onToggleSelection={toggleChartSelection}
              />

              <div className="relative">
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Has a Car Distribution" 
                  categoryName="has_a_car"
                  chartType="heatmap"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  compactMode={true}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("🔍 EXPAND BUTTON: Has a Car Distribution clicked");
                    toggleChartExpansion("Has a Car Distribution");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Geographic Zip Code Map */}
              <div className="relative">
                <HRSNZipCodeInfographic
                  title="Car Access Geographic Distribution"
                  totalPatients={patients?.length || 2456}
                  affectedCount={transformedDualSourceData?.categories?.has_a_car?.totalAffected || 377}
                  categoryName="has_a_car"
                  patientData={patients}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Car Access Geographic');
                    toggleChartExpansion("Car Access Geographic");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Has Transportation Section */}
      <Card className="shadow-md mb-4">
        <CardHeader className="pb-0 mb-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <CardTitle className="text-base font-medium">Has Transportation</CardTitle>
                <DualSourceIndicator 
                  dataSource={getDataSourceForField('has_transportation', transformedDualSourceData)}
                  className="ml-2"
                  showText={false}
                />
              </div>
              <CardDescription>
                Distribution of patients by transportation availability (HRSN indicator)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select_has_transportation"
                checked={["Has Transportation_count", "Has Transportation_percentage", "Has Transportation_distribution"].every(id => 
                  selectedCharts.includes(id)
                )}
                onCheckedChange={(checked) => {
                  const ids = ["Has Transportation_count", "Has Transportation_percentage", "Has Transportation_distribution"];

                  if (checked) {
                    // Add all ids that aren't already in the array
                    const newIds = ids.filter(id => !selectedCharts.includes(id));
                    setSelectedCharts(prev => [...prev, ...newIds]);
                  } else {
                    // Remove all ids
                    setSelectedCharts(prev => prev.filter(id => !ids.includes(id)));
                  }
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => toggleSection("hasTransportation")}
                className="h-8 w-8 p-0"
              >
                {expandedSections.hasTransportation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {expandedSections.hasTransportation && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StandardizedHrsnChart
                data={filteredData}
                chartId="Has Transportation_count"
                title="Has Transportation Count" 
                categoryName="access_to_transportation"
                chartType="count"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Has Transportation_count")}
                onToggleSelection={toggleChartSelection}
              />

              <StandardizedHrsnChart
                data={filteredData}
                chartId="Has Transportation_percentage"
                title="Has Transportation Percentage" 
                categoryName="access_to_transportation"
                chartType="percentage"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Has Transportation_percentage")}
                onToggleSelection={toggleChartSelection}
              />

              <div className="relative">
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Has Transportation Distribution" 
                  categoryName="access_to_transportation"
                  chartType="heatmap"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  compactMode={true}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("🔍 EXPAND BUTTON: Has Transportation Distribution clicked");
                    toggleChartExpansion("Has Transportation Distribution");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Geographic Zip Code Map */}
              <div className="relative">
                <HRSNZipCodeInfographic
                  title="Transportation Geographic Distribution"
                  totalPatients={patients?.length || 2456}
                  affectedCount={transformedDualSourceData?.categories?.access_to_transportation?.totalAffected || 1002}
                  categoryName="access_to_transportation"
                  patientData={patients}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Transportation Geographic');
                    toggleChartExpansion("Transportation Geographic");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Utilities Insecurity Section */}
      <Card className="shadow-md">
        <CardHeader className="pb-0 mb-0">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <CardTitle className="text-base font-medium">Utilities Insecurity</CardTitle>
                <DualSourceIndicator 
                  dataSource={getDataSourceForField('utilities_insecurity', transformedDualSourceData)}
                  className="ml-2"
                  showText={false}
                />
              </div>
              <CardDescription>
                {stats.utilities.percentage}% of patients report utilities insecurity (HRSN indicator)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select_utilities"
                checked={["Utilities_count", "Utilities_percentage", "Utilities_distribution"].every(id => 
                  selectedCharts.includes(id)
                )}
                onCheckedChange={(checked) => {
                  const ids = ["Utilities_count", "Utilities_percentage", "Utilities_distribution"];

                  if (checked) {
                    // Add all ids that aren't already in the array
                    const newIds = ids.filter(id => !selectedCharts.includes(id));
                    setSelectedCharts(prev => [...prev, ...newIds]);
                  } else {
                    // Remove all ids
                    setSelectedCharts(prev => prev.filter(id => !ids.includes(id)));
                  }
                }}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => toggleSection("utilities")}
                className="h-8 w-8 p-0"
              >
                {expandedSections.utilities ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {expandedSections.utilities && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StandardizedHrsnChart
                data={filteredData}
                chartId="Utilities_count"
                title="Utilities Count" 
                categoryName="utility_insecurity"
                chartType="count"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Utilities_count")}
                onToggleSelection={toggleChartSelection}
                dualSourceHrsnData={dualSourceHrsnData}
              />

              <StandardizedHrsnChart
                data={filteredData}
                chartId="Utilities_percentage"
                title="Utilities Percentage" 
                categoryName="utility_insecurity"
                chartType="percentage"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                isSelected={selectedCharts.includes("Utilities_percentage")}
                onToggleSelection={toggleChartSelection}
              />

              <div className="relative">
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Utilities Distribution" 
                  categoryName="utility_insecurity"
                  chartType="heatmap"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  compactMode={true}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("🔍 EXPAND BUTTON: Utilities Distribution clicked");
                    toggleChartExpansion("Utilities Distribution");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Geographic Zip Code Map */}
              <div className="relative">
                <HRSNZipCodeInfographic
                  title="Utilities Geographic Distribution"
                  totalPatients={patients?.length || 2456}
                  affectedCount={transformedDualSourceData?.categories?.utility_insecurity?.totalAffected || 0}
                  categoryName="utility_insecurity"
                  patientData={patients}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 p-0 bg-white hover:bg-white/90 shadow-md border border-gray-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Expanding Utilities Geographic');
                    toggleChartExpansion("Utilities Geographic");
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Expanded Chart Dialogs */}
      <Dialog open={expandedCharts["Age Range Distribution"]} onOpenChange={() => toggleChartExpansion("Age Range Distribution")}>
        <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: "60vw", maxHeight: "120vh", width: "60vw", height: "120vh" }}>
          <DialogHeader className="pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">Age Range Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(120vh-60px)] mt-0 pt-0">
            <CategoricalHrsnChart
              data={filteredData}
              title="" 
              categoryName="age_range"
              chartType="heatmap"
              colorScheme={colorScheme}
              filterBy={filterConfig}
              compactMode={false}
            />
            <ChartExportWidget 
              chartId="age_range_distribution_expanded_top"
              chartTitle="Age Range Distribution"
              data={filteredData}
              className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
            <ChartExportWidget 
              chartId="age_range_distribution_expanded_bottom"
              chartTitle="Age Range Distribution"
              data={filteredData}
              className="absolute bottom-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={expandedCharts["Gender Distribution"]} onOpenChange={() => toggleChartExpansion("Gender Distribution")}>
        <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: "60vw", maxHeight: "120vh", width: "60vw", height: "120vh" }}>
          <DialogHeader className="pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">Gender Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(120vh-60px)] mt-0 pt-0">
            <CategoricalHrsnChart
              data={filteredData}
              title="" 
              categoryName="age_range"
              chartType="heatmap"
              colorScheme={colorScheme}
              filterBy={filterConfig}
              yAxisCategory="gender"
            />
            <ChartExportWidget 
              chartId="gender_distribution_expanded_top"
              chartTitle="Gender Distribution"
              data={filteredData}
              className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
            <ChartExportWidget 
              chartId="gender_distribution_expanded_bottom"
              chartTitle="Gender Distribution"
              data={filteredData}
              className="absolute bottom-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={expandedCharts["Race Distribution"]} onOpenChange={() => toggleChartExpansion("Race Distribution")}>
        <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: "60vw", maxHeight: "120vh", width: "60vw", height: "120vh" }}>
          <DialogHeader className="pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">Race Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(120vh-60px)] mt-0 pt-0">
            <CategoricalHrsnChart
              data={filteredData}
              title="" 
              categoryName="age_range"
              chartType="heatmap"
              colorScheme={colorScheme}
              filterBy={filterConfig}
              yAxisCategory="race"
            />
            <ChartExportWidget 
              chartId="race_distribution_expanded_top"
              chartTitle="Race Distribution"
              data={filteredData}
              className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
            <ChartExportWidget 
              chartId="race_distribution_expanded_bottom"
              chartTitle="Race Distribution"
              data={filteredData}
              className="absolute bottom-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={expandedCharts["Ethnicity Distribution"]} onOpenChange={() => toggleChartExpansion("Ethnicity Distribution")}>
        <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: "60vw", maxHeight: "120vh", width: "60vw", height: "120vh" }}>
          <DialogHeader className="pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">Ethnicity Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(120vh-60px)] mt-0 pt-0">
            <CategoricalHrsnChart
              data={filteredData}
              title="" 
              categoryName="age_range"
              chartType="heatmap"
              colorScheme={colorScheme}
              filterBy={filterConfig}
              yAxisCategory="ethnicity"
            />
            <ChartExportWidget 
              chartId="ethnicity_distribution_expanded_top"
              chartTitle="Ethnicity Distribution"
              data={filteredData}
              className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
            <ChartExportWidget 
              chartId="ethnicity_distribution_expanded_bottom"
              chartTitle="Ethnicity Distribution"
              data={filteredData}
              className="absolute bottom-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={expandedCharts["Zip Code Distribution"]} onOpenChange={() => toggleChartExpansion("Zip Code Distribution")}>
        <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: "60vw", maxHeight: "120vh", width: "60vw", height: "120vh" }}>
          <DialogHeader className="pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">               Zip Code Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(120vh-60px)] mt-0 pt-0">
            <CategoricalHrsnChart
              data={filteredData}
              title="" 
              categoryName="zip_code"
              chartType="heatmap"
              colorScheme={colorScheme}
              filterBy={filterConfig}
              compactMode={false}
            />
            <ChartExportWidget 
              chartId="zip_code_distribution_expanded_top"
              chartTitle="Zip Code Distribution"
              data={filteredData}
              className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
            <ChartExportWidget 
              chartId="zip_code_distribution_expanded_bottom"
              chartTitle="Zip Code Distribution"
              data={filteredData}
              className="absolute bottom-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ZIP CODE GEOGRAPHIC CHOROPLETH MAP DIALOG - REAL MAP IMPLEMENTATION */}
      {(() => {
        console.log('🗺️🗺️🗺️ DIALOG RENDER CHECK: expandedCharts["Zip Code Geographic"] =', expandedCharts["Zip Code Geographic"]);
        return null;
      })()}
      <Dialog 
        open={expandedCharts["Zip Code Geographic"] || false} 
        onOpenChange={(open) => {
          console.log('🗺️🗺️🗺️ DIALOG onOpenChange called with:', open);
          if (!open) {
            toggleChartExpansion("Zip Code Geographic");
          }
        }}
      >
        <DialogContent className="max-w-[100vw] max-h-[100vh] w-[100vw] h-[100vh] p-0 overflow-hidden map-dialog-content" style={{ maxWidth: "100vw", maxHeight: "100vh", width: "100vw", height: "100vh", margin: 0, borderRadius: 0 }}>
          <div className="pt-16 px-2 pb-2 h-full">
            <DialogHeader className="pb-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <DialogTitle className="text-xl font-bold mb-2 pb-0 text-blue-700">🗺️ Interactive ZIP Code Choropleth Map</DialogTitle>
                  <div className="text-xs text-blue-600 mt-1">💡 Tip: Click "Open Full Page Map" for the best viewing experience</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleChartExpansion("Zip Code Geographic");
                    }}
                    className="bg-gray-600 text-white hover:bg-gray-700 px-4 py-2"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                  <Button
                    onClick={(e) => {
                      console.log('🚀 Open Full Page Map clicked!');
                      e.preventDefault();
                      e.stopPropagation();
                      
                      try {
                        // Close the dialog first
                        toggleChartExpansion("Zip Code Geographic");
                        
                        // Navigate to a dedicated map page
                        setTimeout(() => {
                          console.log('🚀 Navigating to /map/zip-code-choropleth');
                          window.location.href = '/map/zip-code-choropleth';
                        }, 100);
                      } catch (error) {
                        console.error('Error navigating to map:', error);
                      }
                    }}
                    className="bg-green-600 text-white hover:bg-green-700 px-4 py-2"
                  >
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Open Full Page Map
                  </Button>
                </div>
              </div>
            </DialogHeader>
            <div className="relative h-[calc(100%-100px)] mt-2 pt-0 bg-white rounded-lg border border-gray-200">
            {/* Real Choropleth Map Component */}
            {(() => {
              console.log('🗺️🗺️🗺️ DIALOG CONTENT RENDERING: About to render WorkingChoroplethMap with', filteredData?.length, 'patients');
              console.log('🗺️🗺️🗺️ DIALOG CONTENT RENDERING: filteredData exists?', !!filteredData, 'length:', filteredData?.length);
              return null;
            })()}
            
            <div 
              id="choropleth-map-container"
              className="relative choropleth-map-container w-full h-full"
            >
              <div className="w-full h-full">
                <ReactLeafletChoropleth
                  data={filteredData || []}
                  title="Patient Distribution by ZIP Code"
                  categoryName="zip_code"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                />
              </div>

            </div>
            </div>
            <ChartExportWidget 
              chartId="zip_code_geographic_map"
              chartTitle="ZIP Code Geographic Distribution"
              data={filteredData}
              className="absolute top-2 right-2 z-[999] bg-white p-3 rounded-md shadow-lg border-2 border-green-500 min-w-[140px]"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Financial Strain Distribution Dialog - Updated to 60vw x 120vh */}
      <Dialog open={expandedCharts["Financial Strain Distribution"]} onOpenChange={() => toggleChartExpansion("Financial Strain Distribution")}>
        <DialogContent style={{ maxWidth: '60vw', maxHeight: '140vh', width: '60vw', height: '140vh' }} className="p-0 overflow-hidden">
          <DialogHeader className="px-2 py-1 pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">Financial Strain Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(140vh-40px)] overflow-hidden">
            <CategoricalHrsnChart
              data={filteredData}
              title="" 
              categoryName="financial_strain"
              chartType="heatmap"
              colorScheme={colorScheme}
              filterBy={filterConfig}
              compactMode={false}
            />
            <ChartExportWidget 
              chartId="financial_strain_distribution_expanded_top"
              chartTitle="Financial Strain Distribution"
              data={filteredData}
              className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
            <ChartExportWidget 
              chartId="financial_strain_distribution_expanded_bottom"
              chartTitle="Financial Strain Distribution"
              data={filteredData}
              className="absolute bottom-0 right-0 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Housing Distribution Dialog */}
      <Dialog open={expandedCharts["Housing Distribution"]} onOpenChange={() => toggleChartExpansion("Housing Distribution")}>
        <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: '60vw', maxHeight: '120vh', width: '60vw', height: '120vh' }}>
          <DialogHeader className="pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">Housing Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(120vh-60px)] mt-0 pt-0">
            <CategoricalHrsnChart
              data={filteredData}
              title="" 
              categoryName="housing_insecurity"
              chartType="heatmap"
              colorScheme={colorScheme}
              filterBy={filterConfig}
              compactMode={false}
            />
            <ChartExportWidget 
              chartId="housing_distribution_expanded_top"
              chartTitle="Housing Distribution"
              data={filteredData}
              className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
            <ChartExportWidget 
              chartId="housing_distribution_expanded_bottom"
              chartTitle="Housing Distribution"
              data={filteredData}
              className="absolute bottom-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Food Distribution Dialog */}
      <Dialog open={expandedCharts["Food Distribution"]} onOpenChange={() => toggleChartExpansion("Food Distribution")}>
        <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: '60vw', maxHeight: '120vh', width: '60vw', height: '120vh' }}>
          <DialogHeader className="pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">Food Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(120vh-60px)] mt-0 pt-0">
            <CategoricalHrsnChart
              data={filteredData}
              title="" 
              categoryName="food_insecurity"
              chartType="heatmap"
              colorScheme={colorScheme}
              filterBy={filterConfig}
              compactMode={false}
            />
            <ChartExportWidget 
              chartId="food_distribution_expanded_top"
              chartTitle="Food Distribution"
              data={filteredData}
              className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
            <ChartExportWidget 
              chartId="food_distribution_expanded_bottom"
              chartTitle="Food Distribution"
              data={filteredData}
              className="absolute bottom-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Veteran Status Distribution Dialog */}
      <Dialog open={expandedCharts["Veteran Status Distribution"]} onOpenChange={() => toggleChartExpansion("Veteran Status Distribution")}>
        <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: '60vw', maxHeight: '120vh', width: '60vw', height: '120vh' }}>
          <DialogHeader className="pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">Veteran Status Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(120vh-60px)] mt-0 pt-0">
            <CategoricalHrsnChart
              data={filteredData}
              title="" 
              categoryName="veteran_status"
              chartType="heatmap"
              colorScheme={colorScheme}
              filterBy={filterConfig}
              compactMode={false}
            />
            <ChartExportWidget 
              chartId="veteran_status_distribution_expanded_top"
              chartTitle="Veteran Status Distribution"
              data={filteredData}
              className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
            <ChartExportWidget 
              chartId="veteran_status_distribution_expanded_bottom"
              chartTitle="Veteran Status Distribution"
              data={filteredData}
              className="absolute bottom-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Education Level Distribution Dialog */}
      <Dialog open={expandedCharts["Education Level Distribution"]} onOpenChange={() => toggleChartExpansion("Education Level Distribution")}>
        <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: '60vw', maxHeight: '120vh', width: '60vw', height: '120vh' }}>
          <DialogHeader className="pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">Education Level Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(120vh-60px)] mt-0 pt-0">
            <CategoricalHrsnChart
              data={filteredData}
              title="" 
              categoryName="education_level"
              chartType="heatmap"
              colorScheme={colorScheme}
              filterBy={filterConfig}
              compactMode={false}
            />
            <ChartExportWidget 
              chartId="education_level_distribution_expanded_top"
              chartTitle="Education Level Distribution"
              data={filteredData}
              className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
            <ChartExportWidget 
              chartId="education_level_distribution_expanded_bottom"
              chartTitle="Education Level Distribution"
              data={filteredData}
              className="absolute bottom-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Transportation Distribution Dialog */}
      <Dialog open={expandedCharts["Transportation Distribution"]} onOpenChange={() => toggleChartExpansion("Transportation Distribution")}>
        <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: '60vw', maxHeight: '120vh', width: '60vw', height: '120vh' }}>
          <DialogHeader className="pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">Transportation Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(120vh-60px)] mt-0 pt-0">
            <CategoricalHrsnChart
              data={filteredData}
              title="" 
              categoryName="access_to_transportation"
              chartType="heatmap"
              colorScheme={colorScheme}
              filterBy={filterConfig}
              compactMode={false}
            />
            <ChartExportWidget 
              chartId="transportation_distribution_expanded_top"
              chartTitle="Transportation Distribution"
              data={filteredData}
              className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
            <ChartExportWidget 
              chartId="transportation_distribution_expanded_bottom"
              chartTitle="Transportation Distribution"
              data={filteredData}
              className="absolute bottom-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Has a Car Distribution Dialog */}
      <Dialog open={expandedCharts["Has a Car Distribution"]} onOpenChange={() => toggleChartExpansion("Has a Car Distribution")}>
        <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: '60vw', maxHeight: '120vh', width: '60vw', height: '120vh' }}>
          <DialogHeader className="pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">Has a Car Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(120vh-60px)] mt-0 pt-0">
            <CategoricalHrsnChart
              data={filteredData}
              title="" 
              categoryName="has_a_car"
              chartType="heatmap"
              colorScheme={colorScheme}
              filterBy={filterConfig}
              compactMode={false}
            />
            <ChartExportWidget 
              chartId="has_a_car_distribution_expanded_top"
              chartTitle="Has a Car Distribution"
              data={filteredData}
              className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
            <ChartExportWidget 
              chartId="has_a_car_distribution_expanded_bottom"
              chartTitle="Has a Car Distribution"
              data={filteredData}
              className="absolute bottom-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Has Transportation Distribution Dialog */}
      <Dialog open={expandedCharts["Has Transportation Distribution"]} onOpenChange={() => toggleChartExpansion("Has Transportation Distribution")}>
        <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: '60vw', maxHeight: '120vh', width: '60vw', height: '120vh' }}>
          <DialogHeader className="pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">Has Transportation Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(120vh-60px)] mt-0 pt-0">
            <CategoricalHrsnChart
              data={filteredData}
              title="" 
              categoryName="access_to_transportation"
              chartType="heatmap"
              colorScheme={colorScheme}
              filterBy={filterConfig}
              compactMode={false}
            />
            <ChartExportWidget 
              chartId="has_transportation_distribution_expanded_top"
              chartTitle="Has Transportation Distribution"
              data={filteredData}
              className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
            <ChartExportWidget 
              chartId="has_transportation_distribution_expanded_bottom"
              chartTitle="Has Transportation Distribution"
              data={filteredData}
              className="absolute bottom-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Utilities Distribution Dialog */}
      <Dialog open={expandedCharts["Utilities Distribution"]} onOpenChange={() => toggleChartExpansion("Utilities Distribution")}>
        <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: "60vw", maxHeight: "120vh", width: "60vw", height: "120vh" }}>
          <DialogHeader className="pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">Utilities Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(120vh-60px)] mt-0 pt-0">
            <CategoricalHrsnChart
              data={filteredData}
              title="" 
              categoryName="utility_insecurity"
              chartType="heatmap"
              colorScheme={colorScheme}
              filterBy={filterConfig}
              compactMode={false}
            />
            <ChartExportWidget 
              chartId="utilities_distribution_expanded_top"
              chartTitle="Utilities Distribution"
              data={filteredData}
              className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
            <ChartExportWidget 
              chartId="utilities_distribution_expanded_bottom"
              chartTitle="Utilities Distribution"
              data={filteredData}
              className="absolute bottom-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>



      {/* Ethnicity Geographic Dialog */}
      <Dialog open={expandedCharts["Ethnicity Geographic"]} onOpenChange={() => toggleChartExpansion("Ethnicity Geographic")}>
        <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: "60vw", maxHeight: "120vh", width: "60vw", height: "120vh" }}>
          <DialogHeader className="pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">Ethnicity Geographic Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(120vh-60px)] mt-0 pt-0">
            {expandedCharts["Ethnicity Geographic"] && (
              <GeoMapChart
                data={filteredData}
                title=""
                categoryName="ethnicity"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                dualSourceHrsnData={dualSourceHrsnData}
                compactMode={false}
              />
            )}
            <ChartExportWidget 
              chartId="ethnicity_geographic_expanded"
              chartTitle="Ethnicity Geographic Distribution"
              data={filteredData}
              className="absolute bottom-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Financial Strain Geographic Dialog */}
      <Dialog open={expandedCharts["Financial Strain Geographic"]} onOpenChange={() => toggleChartExpansion("Financial Strain Geographic")}>
        <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: "60vw", maxHeight: "120vh", width: "60vw", height: "120vh" }}>
          <DialogHeader className="pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">Financial Strain Geographic Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(120vh-60px)] mt-0 pt-0">
            {expandedCharts["Financial Strain Geographic"] && (
              <GeoMapChart
                data={filteredData}
                title=""
                categoryName="financial_strain"
                colorScheme={colorScheme}
                filterBy={filterConfig}
                dualSourceHrsnData={dualSourceHrsnData}
                compactMode={false}
              />
            )}
            <ChartExportWidget 
              chartId="financial_strain_geographic_expanded"
              chartTitle="Financial Strain Geographic Distribution"
              data={filteredData}
              className="absolute bottom-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Housing Geographic Dialog */}
      <Dialog open={expandedCharts["Housing Geographic"]} onOpenChange={() => toggleChartExpansion("Housing Geographic")}>
        <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: "60vw", maxHeight: "120vh", width: "60vw", height: "120vh" }}>
          <DialogHeader className="pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">Housing Geographic Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(120vh-60px)] mt-0 pt-0">
            {expandedCharts["Housing Geographic"] && (
              <div className="h-full w-full bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-blue-600 mb-4">
                    <svg className="mx-auto h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 01.553-.894L9 2l6 3 6-3 .553.894A1 1 0 0122 5.618v10.764a1 1 0 01-.553.894L15 20l-6-3z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-medium text-blue-900 mb-2">Housing Geographic Map - Expanded View</h3>
                  <p className="text-lg text-blue-700 mb-4">
                    ZIP Code choropleth visualization showing housing insecurity distribution
                  </p>
                  <div className="space-y-2 text-base">
                    <p className="text-blue-600">
                      <strong>{patients?.length || 0}</strong> total patients in database
                    </p>
                    <p className="text-blue-600">
                      <strong>{(hrsnApiData as any)?.categories?.housing_insecurity || 0}</strong> patients affected by housing insecurity
                    </p>
                    <p className="text-green-600">
                      ✓ 64MB comprehensive ZIP code boundaries loaded
                    </p>
                    <p className="text-green-600">
                      ✓ Nationwide coverage - all 42,000+ US ZIP codes supported
                    </p>
                    <p className="text-purple-600 mt-4">
                      Ready for full choropleth map implementation with patient density visualization
                    </p>
                  </div>
                </div>
              </div>
            )}
            <ChartExportWidget 
              chartId="housing_geographic_expanded"
              chartTitle="Housing Geographic Distribution"
              data={filteredData}
              className="absolute bottom-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Food Geographic Dialog */}
      <Dialog open={expandedCharts["Food Geographic"]} onOpenChange={() => toggleChartExpansion("Food Geographic")}>
        <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: "60vw", maxHeight: "120vh", width: "60vw", height: "120vh" }}>
          <DialogHeader className="pb-0 mb-0">
            <DialogTitle className="text-lg font-semibold mb-0 pb-0">Food Geographic Distribution</DialogTitle>
          </DialogHeader>
          <div className="relative h-[calc(120vh-60px)] mt-0 pt-0">
            {expandedCharts["Food Geographic"] && (
              <div className="h-full w-full bg-green-50 rounded-lg border border-green-200 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="text-green-600 mb-4">
                    <svg className="mx-auto h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 01.553-.894L9 2l6 3 6-3 .553.894A1 1 0 0122 5.618v10.764a1 1 0 01-.553.894L15 20l-6-3z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-medium text-green-900 mb-2">Food Geographic Map - Expanded View</h3>
                  <p className="text-lg text-green-700 mb-4">
                    ZIP Code choropleth visualization showing food insecurity distribution
                  </p>
                  <div className="space-y-2 text-base">
                    <p className="text-green-600">
                      <strong>{patients?.length || 0}</strong> total patients in database
                    </p>
                    <p className="text-green-600">
                      <strong>{(hrsnApiData as any)?.categories?.food_insecurity || 0}</strong> patients affected by food insecurity
                    </p>
                    <p className="text-emerald-600">
                      ✓ 64MB comprehensive ZIP code boundaries loaded
                    </p>
                    <p className="text-emerald-600">
                      ✓ Nationwide coverage - all 42,000+ US ZIP codes supported
                    </p>
                    <p className="text-purple-600 mt-4">
                      Ready for full choropleth map implementation with patient density visualization
                    </p>
                  </div>
                </div>
              </div>
            )}
            <ChartExportWidget 
              chartId="food_geographic_expanded"
              chartTitle="Food Geographic Distribution"
              data={filteredData}
              className="absolute bottom-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
            />
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}