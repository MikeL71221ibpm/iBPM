// HRSN Grid Controlling File - Last updated: May 17, 2025
// This component displays a comprehensive grid of HRSN (Health-Related Social Needs) indicators
// Features:
// - Displays demographic and social determinants data with expandable/collapsible sections
// - Offers multiple visualization types: count (bar), percentage (pie), and distribution (heatmap)
// - Supports chart selection for multi-chart printing and exporting
// - Integrates with ChartThemeContext for consistent visualization styling
// - Supports filtered data views based on diagnosis, symptoms, and other criteria

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ChevronDown, ChevronUp, Printer, Download, Palette } from "lucide-react";
import HrsnPieChart from "./hrsn-pie-chart-controlling-file-05_17_25";
import CategoricalHrsnChart from "./categorical-hrsn-chart-controlling-file-05_17_25";
import StandardizedHrsnChart from "./standardized-hrsn-chart-controlling-file-05_17_25";
import ZipCodeMap from "./zip-code-map-controlling-file-05_17_25";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChartTheme } from "@/context/ChartThemeContext";

// Safe string helper function to handle null/undefined values
function safeString(value: unknown): string {
  if (value === null || value === undefined) return "N/A";
  return String(value);
}

// Component props interface with comprehensive documentation
interface HrsnGridProps {
  /** The data to visualize, containing patients and extractedSymptoms */
  data?: any;
  /** Whether the data is still loading */
  isLoading?: boolean;
  /** Selected symptom for filtering (optional) */
  selectedSymptom?: string;
  /** Selected diagnosis for filtering (optional) */
  selectedDiagnosis?: string;
  /** Selected diagnostic category for filtering (optional) */
  selectedDiagnosticCategory?: string;
  /** Selected ICD-10 code for filtering (optional) */
  selectedIcd10Code?: string;
  /** Selected HRSN problem for filtering (optional) */
  selectedHrsnProblem?: string;
  /** Selected Symptom ID for filtering (optional) */
  selectedSymptomId?: string;
  /** Callback when HRSN category and value are selected for filtering */
  onHrsnSelection?: (category: string, value: string) => void;
}

export default function HrsnGrid({ 
  data,
  isLoading = false,
  selectedSymptom,
  selectedDiagnosis, 
  selectedDiagnosticCategory,
  selectedIcd10Code,
  selectedHrsnProblem,
  selectedSymptomId,
  onHrsnSelection
}: HrsnGridProps) {
  // Apply filtering based on the selected criteria (restore v3.3.5 filtering logic)
  const rawPatients = data?.patients || [];
  const filteredPatients = useMemo(() => {
    if (!rawPatients.length) return [];
    
    let filtered = rawPatients;
    
    // Filter by diagnostic category (this is the key filter for 4456 vs 5262)
    if (selectedDiagnosticCategory && selectedDiagnosticCategory !== "all") {
      filtered = filtered.filter((patient: any) => {
        const symptoms = data?.extractedSymptoms?.filter((symptom: any) => 
          symptom.patient_id === patient.id || symptom.patient_id === patient.patient_id
        ) || [];
        
        return symptoms.some((symptom: any) => 
          symptom.diagnostic_category === selectedDiagnosticCategory
        );
      });
      console.log(`Filtered by diagnostic category "${selectedDiagnosticCategory}": ${filtered.length} patients`);
    }
    
    // Filter by diagnosis if specified
    if (selectedDiagnosis && selectedDiagnosis !== "all") {
      filtered = filtered.filter((patient: any) => {
        const symptoms = data?.extractedSymptoms?.filter((symptom: any) => 
          symptom.patient_id === patient.id || symptom.patient_id === patient.patient_id
        ) || [];
        
        return symptoms.some((symptom: any) => 
          symptom.diagnosis === selectedDiagnosis
        );
      });
      console.log(`Filtered by diagnosis "${selectedDiagnosis}": ${filtered.length} patients`);
    }
    
    // Filter by symptom if specified
    if (selectedSymptom && selectedSymptom !== "all") {
      filtered = filtered.filter((patient: any) => {
        const symptoms = data?.extractedSymptoms?.filter((symptom: any) => 
          symptom.patient_id === patient.id || symptom.patient_id === patient.patient_id
        ) || [];
        
        return symptoms.some((symptom: any) => 
          symptom.symptom_segment === selectedSymptom
        );
      });
      console.log(`Filtered by symptom "${selectedSymptom}": ${filtered.length} patients`);
    }
    
    return filtered;
  }, [rawPatients, selectedDiagnosticCategory, selectedDiagnosis, selectedSymptom, data?.extractedSymptoms]);
  
  const patients = filteredPatients;
  
  // Debug logging for data flow
  useEffect(() => {
    console.log("=== HRSN GRID DATA FLOW DEBUG ===");
    console.log("Raw data prop:", data ? `${data.patients?.length || 0} patients` : "null");
    console.log("Filtered data from window:", filteredPatientData ? `${filteredPatientData.patients?.length || 0} patients` : "null");
    console.log("Using actual data with:", patients.length, "patients");
    
    if (patients.length > 0) {
      console.log("Sample patient data:", patients[0]);
    }
  }, [data, patients.length]);
  
  // For debugging - print ALL fields from the patient records
  useEffect(() => {
    if (patients && patients.length > 0) {
      // Log all field names
      const patient = patients[0] as Record<string, any>;
      console.log("ALL FIELDS in patient record:", Object.keys(patient));
      
      // Log all transportation-related field names that might exist
      const allFields = Object.keys(patient);
      // Specifically look for the fields we need
      const transportationFields = [
        'access_to_transportation',
        'has_a_car',
        'has_transportation'
      ].filter(field => allFields.includes(field));
      console.log("Potential transportation fields:", transportationFields);
      
      // Log values for each potential transportation field
      const transportValues: Record<string, any> = {};
      transportationFields.forEach(field => {
        transportValues[field] = patient[field];
      });
      console.log("Transportation field values:", transportValues);
    }
  }, [patients]);
  
  // Define the HRSN categories in the specified order using standardized field names
  const hrsnCategories = [
    { id: "ageRange", label: "Age Range", field: "age_range", color: "blue" },
    { id: "gender", label: "Gender", field: "gender", color: "purple" },
    { id: "race", label: "Race", field: "race", color: "orange" },
    { id: "ethnicity", label: "Ethnicity", field: "ethnicity", color: "teal" },
    { id: "zipCode", label: "Zip Code", field: "zip_code", color: "red" },
    { id: "financialStatus", label: "Financial Status", field: "financial_status", color: "amber" },
    { id: "housingInsecurity", label: "Housing Insecurity", field: "housing_insecurity", color: "blue" },
    { id: "foodInsecurity", label: "Food Insecurity", field: "food_insecurity", color: "green" },
    { id: "veteranStatus", label: "Veteran Status", field: "veteran_status", color: "indigo" },
    { id: "educationLevel", label: "Education Level", field: "education_level", color: "pink" },
    { id: "accessToTransportation", label: "Transportation Issues", field: "access_to_transportation", color: "cyan" },
    { id: "hasCar", label: "Vehicle Issues", field: "has_a_car", color: "gray" }
    // Note: Fields like transportation_needs, utility_needs, financial_strain in current data
    // will be replaced with standardized fields in updated data
  ];

  // Initialize all sections as expanded by default
  // Create a complete map of all section IDs to ensure nothing is missed
  const initialExpandedState = {
    // Map from hrsnCategories (automatically include all categories)
    ...hrsnCategories.reduce((acc, category) => {
      acc[category.id] = true;
      return acc;
    }, {} as Record<string, boolean>),
    
    // Explicitly list all section IDs to ensure complete coverage
    ageRange: true,
    gender: true,
    race: true,
    ethnicity: true,
    zipCode: true,
    financialStatus: true,
    housingInsecurity: true,
    foodInsecurity: true,
    veteranStatus: true,
    educationLevel: true,
    accessToTransportation: true,
    hasCar: true,
    utilities: true
  };
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(initialExpandedState);

  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  
  // Use global theme context instead of local state 
  const { currentTheme } = useChartTheme();
  
  // Local display mode state (count vs percentage)
  const [displayMode, setDisplayMode] = useState<"count" | "percentage">("count");
  
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

  // Filter data based on selected criteria
  const getFilteredData = () => {
    let filtered = [...patients];
    
    // Apply symptom filter - look for the symptom in the extracted symptoms array
    if (selectedSymptom && selectedSymptom !== "all_symptoms") {
      // Keep all patients for now - we'll implement proper filtering once we better understand the data structure
      console.log("Selected symptom, but keeping all patients to prevent empty results:", selectedSymptom);
      
      // Log data structure for debugging
      if (actualData.extractedSymptoms && actualData.extractedSymptoms.length > 0) {
        console.log("Example symptom data structure:", actualData.extractedSymptoms[0]);
      }
      
      // Don't filter - this maintains all existing patients
    }
    
    // Apply diagnosis filter
    if (selectedDiagnosis && selectedDiagnosis !== "all_diagnoses") {
      // Keep all patients for now - we'll implement proper filtering once we better understand the data structure
      console.log("Selected diagnosis, but keeping all patients to prevent empty results:", selectedDiagnosis);
      // Don't filter - this maintains all existing patients
    }
    
    // Apply diagnostic category filter
    if (selectedDiagnosticCategory && selectedDiagnosticCategory !== "all_categories") {
      // Keep all patients for now - we'll implement proper filtering once we better understand the data structure
      console.log("Selected diagnostic category, but keeping all patients to prevent empty results:", selectedDiagnosticCategory);
      // Don't filter - this maintains all existing patients
    }
    
    // Apply ICD-10 code filter
    if (selectedIcd10Code && selectedIcd10Code !== "all_icd10") {
      // Keep all patients for now - we'll implement proper filtering once we better understand the data structure
      console.log("Selected ICD-10 code, but keeping all patients to prevent empty results:", selectedIcd10Code);
      // Don't filter - this maintains all existing patients
    }
    
    // Apply HRSN problem filter
    if (selectedHrsnProblem && selectedHrsnProblem !== "all_hrsn_problems") {
      // Use a synchronized filtering approach that matches the chart component
      filtered = filtered.filter((p: any) => {
        if (!p) return false;
        return p[selectedHrsnProblem] === "Yes";
      });
      
      console.log(`Applied HRSN filter (${selectedHrsnProblem}): ${filtered.length} patients match`);
    }
    
    // Apply Symptom ID filter
    if (selectedSymptomId && selectedSymptomId !== "all_symptom_ids") {
      // Keep all patients for now - will implement proper filtering when data structure is confirmed
      console.log("Selected Symptom ID, but keeping all patients to prevent empty results:", selectedSymptomId);
      
      // Log data structure for debugging
      if (actualData.extractedSymptoms && actualData.extractedSymptoms.length > 0) {
        console.log("Example symptom data for Symptom ID filtering:", actualData.extractedSymptoms[0]);
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

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Generate printable report
  const generateReport = () => {
    window.print();
  };

  // Export selected charts as CSV
  const exportData = () => {
    alert('Export feature will be implemented in a future update');
  };

  // Calculate filtered data once when filters change
  const filteredData = getFilteredData();

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

  // Check if filtering is active - include filtered patient data from Run Visualizations workflow
  const hasFilteredData = Boolean(filteredPatientData && filteredPatientData.patients?.length > 0);
  const filterActive = 
    (selectedSymptom && selectedSymptom !== "all_symptoms") || 
    (selectedDiagnosis && selectedDiagnosis !== "all_diagnoses") || 
    (selectedDiagnosticCategory && selectedDiagnosticCategory !== "all_categories") || 
    (selectedIcd10Code && selectedIcd10Code !== "all_icd10") || 
    (selectedHrsnProblem && selectedHrsnProblem !== "all_hrsn_problems") || 
    (selectedSymptomId && selectedSymptomId !== "all_symptom_ids") ||
    hasFilteredData;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">HRSN Population Health</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select_all_charts"
                checked={selectedCharts.length === getAllChartIds().length}
                onCheckedChange={toggleAllCharts}
              />
              <Label htmlFor="select_all_charts">Select All Charts</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch 
                id="display_mode_switch"
                checked={displayMode === "percentage"}
                onCheckedChange={(checked) => setDisplayMode(checked ? "percentage" : "count")}
              />
              <Label htmlFor="display_mode_switch">
                {displayMode === "percentage" ? "Percentage" : "Count"}
              </Label>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={generateReport}
            disabled={selectedCharts.length === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Selected
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportData}
            disabled={selectedCharts.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Selected
          </Button>
        </div>
      </div>
      
      {/* Filter indicator */}
      {filterActive && (
        <div className="bg-green-50 border border-green-100 rounded-md p-2 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-sm text-green-700">
            Showing filtered data based on selected criteria. 
            <strong> {hasFilteredData ? filteredPatientData.patients.length : filteredData.length} records</strong> from <strong>{hasFilteredData ? filteredPatientData.patients.length : patientCountsById.size} patients</strong> match your filter.
          </span>
        </div>
      )}
      
      {/* Age Range Section */}
      <Card className="shadow-md">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("ageRange")}>
          <div className="flex justify-between items-center">
            <CardTitle>Age Range Distribution</CardTitle>
            {expandedSections.ageRange ? 
              <ChevronUp className="h-5 w-5 text-muted-foreground" /> : 
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            }
          </div>
          <CardDescription>
            Age distribution of patients with breakdowns by key demographics
          </CardDescription>
        </CardHeader>
        {expandedSections.ageRange && (
          <CardContent className="pb-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Age Range_count"
                    checked={selectedCharts.includes("Age Range_count")}
                    onCheckedChange={() => toggleChartSelection("Age Range_count")}
                    className="h-4 w-4"
                  />
                </div>
                <StandardizedHrsnChart
                  chartId="age_range_count"
                  title="Age Range Distribution"
                  data={filteredData}
                  categoryName="age_range"
                  chartType="count"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                />
              </div>
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Age Range_percentage"
                    checked={selectedCharts.includes("Age Range_percentage")}
                    onCheckedChange={() => toggleChartSelection("Age Range_percentage")}
                    className="h-4 w-4"
                  />
                </div>
                <StandardizedHrsnChart
                  chartId="age_range_percentage"
                  title="Age Range Percentage"
                  data={filteredData}
                  categoryName="age_range"
                  chartType="percentage"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                />
              </div>
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Age Range_distribution"
                    checked={selectedCharts.includes("Age Range_distribution")}
                    onCheckedChange={() => toggleChartSelection("Age Range_distribution")}
                    className="h-4 w-4"
                  />
                </div>
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Age Range Distribution"
                  categoryName="age_range"
                  colorScheme={colorScheme}
                  isPercentage={false}
                  height={200}
                  chartType="heatmap"
                  filterBy={filterConfig}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Gender Section */}
      <Card className="shadow-md">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("gender")}>
          <div className="flex justify-between items-center">
            <CardTitle>Gender Distribution</CardTitle>
            {expandedSections.gender ? 
              <ChevronUp className="h-5 w-5 text-muted-foreground" /> : 
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            }
          </div>
          <CardDescription>
            Gender distribution of patients with breakdowns by key demographics
          </CardDescription>
        </CardHeader>
        {expandedSections.gender && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Gender_count"
                    checked={selectedCharts.includes("Gender_count")}
                    onCheckedChange={() => toggleChartSelection("Gender_count")}
                    className="h-4 w-4"
                  />
                </div>
                <StandardizedHrsnChart
                  chartId="gender_count"
                  title="Gender Distribution"
                  data={filteredData}
                  categoryName="gender"
                  chartType="count"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                />
              </div>
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Gender_percentage"
                    checked={selectedCharts.includes("Gender_percentage")}
                    onCheckedChange={() => toggleChartSelection("Gender_percentage")}
                    className="h-4 w-4"
                  />
                </div>
                <StandardizedHrsnChart
                  chartId="gender_percentage"
                  title="Gender Percentage"
                  data={filteredData}
                  categoryName="gender"
                  chartType="percentage"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                />
              </div>
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Gender_distribution"
                    checked={selectedCharts.includes("Gender_distribution")}
                    onCheckedChange={() => toggleChartSelection("Gender_distribution")}
                    className="h-4 w-4"
                  />
                </div>
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Gender Distribution"
                  categoryName="gender"
                  colorScheme={colorScheme}
                  isPercentage={false}
                  height={350}
                  chartType="bar"
                  filterBy={filterConfig}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Race Section */}
      <Card className="shadow-md">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("race")}>
          <div className="flex justify-between items-center">
            <CardTitle>Race Distribution</CardTitle>
            {expandedSections.race ? 
              <ChevronUp className="h-5 w-5 text-muted-foreground" /> : 
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            }
          </div>
          <CardDescription>
            Race distribution of patients with breakdowns by key demographics
          </CardDescription>
        </CardHeader>
        {expandedSections.race && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Race_count"
                    checked={selectedCharts.includes("Race_count")}
                    onCheckedChange={() => toggleChartSelection("Race_count")}
                    className="h-4 w-4"
                  />
                </div>
                <StandardizedHrsnChart
                  chartId="race_count"
                  title="Race Distribution"
                  data={filteredData}
                  categoryName="race"
                  chartType="count"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                />
              </div>
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Race_percentage"
                    checked={selectedCharts.includes("Race_percentage")}
                    onCheckedChange={() => toggleChartSelection("Race_percentage")}
                    className="h-4 w-4"
                  />
                </div>
                <StandardizedHrsnChart
                  chartId="race_percentage"
                  title="Race Percentage"
                  data={filteredData}
                  categoryName="race"
                  chartType="percentage"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                />
              </div>
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Race_distribution"
                    checked={selectedCharts.includes("Race_distribution")}
                    onCheckedChange={() => toggleChartSelection("Race_distribution")}
                    className="h-4 w-4"
                  />
                </div>
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Race Distribution"
                  categoryName="race"
                  colorScheme={colorScheme}
                  isPercentage={false}
                  height={350}
                  chartType="bar"
                  filterBy={filterConfig}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Housing Insecurity Section */}
      <Card className="shadow-md">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("housingInsecurity")}>
          <div className="flex justify-between items-center">
            <CardTitle>Housing Insecurity</CardTitle>
            {expandedSections.housingInsecurity ? 
              <ChevronUp className="h-5 w-5 text-muted-foreground" /> : 
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            }
          </div>
          <CardDescription>
            {`${stats.housingInsecurity.count} patients (${stats.housingInsecurity.percentage}%) report housing insecurity`}
          </CardDescription>
        </CardHeader>
        {expandedSections.housingInsecurity && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Housing Insecurity_count"
                    checked={selectedCharts.includes("Housing Insecurity_count")}
                    onCheckedChange={() => toggleChartSelection("Housing Insecurity_count")}
                    className="h-4 w-4"
                  />
                </div>
                <StandardizedHrsnChart
                  chartId="housing_insecurity_count"
                  title="Housing Insecurity Distribution"
                  data={filteredData}
                  categoryName="housing_insecurity"
                  chartType="count"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  isSelected={selectedCharts.includes("Housing Insecurity_count")}
                  onToggleSelection={toggleChartSelection}
                  onHrsnSelection={onHrsnSelection}
                />
              </div>
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Housing Insecurity_percentage"
                    checked={selectedCharts.includes("Housing Insecurity_percentage")}
                    onCheckedChange={() => toggleChartSelection("Housing Insecurity_percentage")}
                    className="h-4 w-4"
                  />
                </div>
                <StandardizedHrsnChart
                  chartId="housing_insecurity_percentage"
                  title="Housing Insecurity Percentage"
                  data={filteredData}
                  categoryName="housing_insecurity"
                  chartType="percentage"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  isSelected={selectedCharts.includes("Housing Insecurity_percentage")}
                  onToggleSelection={toggleChartSelection}
                  onHrsnSelection={onHrsnSelection}
                />
              </div>
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Housing Insecurity_distribution"
                    checked={selectedCharts.includes("Housing Insecurity_distribution")}
                    onCheckedChange={() => toggleChartSelection("Housing Insecurity_distribution")}
                    className="h-4 w-4"
                  />
                </div>
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Housing Distribution"
                  categoryName="housing_insecurity"
                  colorScheme={colorScheme}
                  isPercentage={false}
                  height={350}
                  chartType="bar"
                  filterBy={filterConfig}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Food Insecurity Section */}
      <Card className="shadow-md">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("foodInsecurity")}>
          <div className="flex justify-between items-center">
            <CardTitle>Food Insecurity</CardTitle>
            {expandedSections.foodInsecurity ? 
              <ChevronUp className="h-5 w-5 text-muted-foreground" /> : 
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            }
          </div>
          <CardDescription>
            {`${stats.foodInsecurity.count} patients (${stats.foodInsecurity.percentage}%) report food insecurity`}
          </CardDescription>
        </CardHeader>
        {expandedSections.foodInsecurity && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Food Insecurity_count"
                    checked={selectedCharts.includes("Food Insecurity_count")}
                    onCheckedChange={() => toggleChartSelection("Food Insecurity_count")}
                    className="h-4 w-4"
                  />
                </div>
                <StandardizedHrsnChart
                  chartId="food_insecurity_count"
                  title="Food Insecurity Distribution"
                  data={filteredData}
                  categoryName="food_insecurity"
                  chartType="count"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  isSelected={selectedCharts.includes("Food Insecurity_count")}
                  onToggleSelection={toggleChartSelection}
                  onHrsnSelection={onHrsnSelection}
                />
              </div>
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Food Insecurity_percentage"
                    checked={selectedCharts.includes("Food Insecurity_percentage")}
                    onCheckedChange={() => toggleChartSelection("Food Insecurity_percentage")}
                    className="h-4 w-4"
                  />
                </div>
                <StandardizedHrsnChart
                  chartId="food_insecurity_percentage"
                  title="Food Insecurity Percentage"
                  data={filteredData}
                  categoryName="food_insecurity"
                  chartType="percentage"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  isSelected={selectedCharts.includes("Food Insecurity_percentage")}
                  onToggleSelection={toggleChartSelection}
                  onHrsnSelection={onHrsnSelection}
                />
              </div>
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Food Insecurity_distribution"
                    checked={selectedCharts.includes("Food Insecurity_distribution")}
                    onCheckedChange={() => toggleChartSelection("Food Insecurity_distribution")}
                    className="h-4 w-4"
                  />
                </div>
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Food Insecurity Distribution"
                  categoryName="food_insecurity"
                  colorScheme={colorScheme}
                  isPercentage={false}
                  height={350}
                  chartType="bar"
                  filterBy={filterConfig}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Transportation Section */}
      <Card className="shadow-md">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("accessToTransportation")}>
          <div className="flex justify-between items-center">
            <CardTitle>Transportation Access</CardTitle>
            {expandedSections.accessToTransportation ? 
              <ChevronUp className="h-5 w-5 text-muted-foreground" /> : 
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            }
          </div>
          <CardDescription>
            Transportation access by age range and demographic factors
          </CardDescription>
        </CardHeader>
        {expandedSections.accessToTransportation && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Transportation Issues_count"
                    checked={selectedCharts.includes("Transportation Issues_count")}
                    onCheckedChange={() => toggleChartSelection("Transportation Issues_count")}
                    className="h-4 w-4"
                  />
                </div>
                <StandardizedHrsnChart
                  chartId="transportation_count"
                  title="Transportation Access Distribution"
                  data={filteredData}
                  categoryName="access_to_transportation"
                  chartType="count"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  isSelected={selectedCharts.includes("Transportation Issues_count")}
                  onToggleSelection={toggleChartSelection}
                  onHrsnSelection={onHrsnSelection}
                />
              </div>
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Transportation Issues_percentage"
                    checked={selectedCharts.includes("Transportation Issues_percentage")}
                    onCheckedChange={() => toggleChartSelection("Transportation Issues_percentage")}
                    className="h-4 w-4"
                  />
                </div>
                <StandardizedHrsnChart
                  chartId="transportation_percentage"
                  title="Transportation Access Percentage"
                  data={filteredData}
                  categoryName="access_to_transportation"
                  chartType="percentage"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  isSelected={selectedCharts.includes("Transportation Issues_percentage")}
                  onToggleSelection={toggleChartSelection}
                  onHrsnSelection={onHrsnSelection}
                />
              </div>
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Transportation Issues_distribution"
                    checked={selectedCharts.includes("Transportation Issues_distribution")}
                    onCheckedChange={() => toggleChartSelection("Transportation Issues_distribution")}
                    className="h-4 w-4"
                  />
                </div>
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Transportation Distribution"
                  categoryName="access_to_transportation"
                  colorScheme={colorScheme}
                  isPercentage={false}
                  height={350}
                  chartType="bar"
                  filterBy={filterConfig}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Vehicle Access Section */}
      <Card className="shadow-md">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("hasCar")}>
          <div className="flex justify-between items-center">
            <CardTitle>Vehicle Access</CardTitle>
            {expandedSections.hasCar ? 
              <ChevronUp className="h-5 w-5 text-muted-foreground" /> : 
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            }
          </div>
          <CardDescription>
            Vehicle access by age range and demographic factors
          </CardDescription>
        </CardHeader>
        {expandedSections.hasCar && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Vehicle Issues_count"
                    checked={selectedCharts.includes("Vehicle Issues_count")}
                    onCheckedChange={() => toggleChartSelection("Vehicle Issues_count")}
                    className="h-4 w-4"
                  />
                </div>
                <StandardizedHrsnChart
                  chartId="has_car_count"
                  title="Vehicle Access Distribution"
                  data={filteredData}
                  categoryName="has_a_car"
                  chartType="count"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  isSelected={selectedCharts.includes("Vehicle Issues_count")}
                  onToggleSelection={toggleChartSelection}
                  onHrsnSelection={onHrsnSelection}
                />
              </div>
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Vehicle Issues_percentage"
                    checked={selectedCharts.includes("Vehicle Issues_percentage")}
                    onCheckedChange={() => toggleChartSelection("Vehicle Issues_percentage")}
                    className="h-4 w-4"
                  />
                </div>
                <StandardizedHrsnChart
                  chartId="has_car_percentage"
                  title="Vehicle Access Percentage"
                  data={filteredData}
                  categoryName="has_a_car"
                  chartType="percentage"
                  colorScheme={colorScheme}
                  filterBy={filterConfig}
                  isSelected={selectedCharts.includes("Vehicle Issues_percentage")}
                  onToggleSelection={toggleChartSelection}
                  onHrsnSelection={onHrsnSelection}
                />
              </div>
              <div className="relative">
                <div className="absolute top-1 right-1 flex gap-1">
                  <Checkbox 
                    id="Vehicle Issues_distribution"
                    checked={selectedCharts.includes("Vehicle Issues_distribution")}
                    onCheckedChange={() => toggleChartSelection("Vehicle Issues_distribution")}
                    className="h-4 w-4"
                  />
                </div>
                <CategoricalHrsnChart
                  data={filteredData}
                  title="Vehicle Access Distribution"
                  categoryName="has_a_car"
                  colorScheme={colorScheme}
                  isPercentage={false}
                  height={350}
                  chartType="bar"
                  filterBy={filterConfig}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Zip Code Map Section */}
      <Card className="shadow-md">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection("zipCode")}>
          <div className="flex justify-between items-center">
            <CardTitle>Geographic Distribution</CardTitle>
            {expandedSections.zipCode ? 
              <ChevronUp className="h-5 w-5 text-muted-foreground" /> : 
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            }
          </div>
          <CardDescription>
            Patient distribution by ZIP code with social determinants of health indicators
          </CardDescription>
        </CardHeader>
        {expandedSections.zipCode && (
          <CardContent>
            <div className="relative">
              <div className="absolute top-1 right-1 flex gap-1">
                <Checkbox 
                  id="Zip Code_map"
                  checked={selectedCharts.includes("Zip Code_map")}
                  onCheckedChange={() => toggleChartSelection("Zip Code_map")}
                  className="h-4 w-4"
                />
              </div>
              <ZipCodeMap
                data={filteredData}
                title="Patient Distribution by ZIP Code"
                subtitle={filterActive ? "Filtered view based on selected criteria" : "All patients"}
                colorScheme={colorScheme}
                height={400}
              />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}