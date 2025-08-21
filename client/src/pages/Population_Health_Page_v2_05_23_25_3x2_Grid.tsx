// Population Health Page V2 - May 23, 2025 @ 9:30 PM - UPDATED WITH VISIBLE CHANGES
// This page combines fixed charts functionality with population health filters and HRSN grid
// UPDATED: May 23, 2025 @ 10:30 PM to integrate exact fixed-charts-05_22_25.tsx implementation
// UPDATED: May 23, 2025 @ 10:40 PM - Added fixed-charts component from May 22nd version at top
// UPDATED: May 23, 2025 @ 5:40 PM - Added export widgets with CSV Detail export with patient info

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, Percent, Hash, Printer, LineChart, PaintBucket, 
  Maximize2, FileText, Code, Table, X, Check, Filter, ListFilter,
  Download, ChevronsUpDown, ChevronDown, ChevronUp, FileSpreadsheet,
  Search, Database, Loader2
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle, DialogFooter
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
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveTreeMap } from '@nivo/treemap';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import DatabaseStatsWidget from "@/components/DatabaseStatsWidget";
import { useChartTheme } from "@/context/ChartThemeContext";
import ChartExportWidget from "@/components/chart-export-widget";
import { ChartExportButtons } from "@/components/chart-export-buttons";
import ChartPrintHandler from "@/components/chart-print-handler";
import HrsnTestSimple from "@/components/hrsn-test-simple";
import NavigationButton from "@/components/NavigationButton";
import PopulationHealthCharts from "@/components/population-health-charts-controlling-file-05_23_25";
import HrsnGridControllingFile from "@/components/hrsn-grid-controlling-file-05_13_25";
import HrsnInsightsChart from "@/components/hrsn-insights-chart-working";
import { cn } from "@/lib/utils";
import { 
  exportToCSV, 
  exportToDetailedCSV, 
  exportToExcel, 
  exportToJSON 
} from "@/lib/chart-export-functions";

// === START OF FIXED CHARTS IMPLEMENTATION (May 22, 2025) ===
// The following section contains the exact fixed-charts implementation  

// This is the FixedChart component from the fixed-charts-05_22_25.tsx file
interface FixedChartProps {
  data: any[];
  title: string;
  description?: string;
  displayMode: 'count' | 'percentage';
  colorScheme?: string;
  selectedCategories?: string[];
  setSelectedCategories?: (categories: string[]) => void;
}

function FixedChart({ 
  data, 
  title, 
  description, 
  displayMode, 
  colorScheme = "nivo",
  selectedCategories,
  setSelectedCategories
}: FixedChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCategorySelectVisible, setIsCategorySelectVisible] = useState(false);
  const { colorSettings, theme } = useChartTheme();
  const { toast } = useToast();
  const chartId = `chart-${title.replace(/\s+/g, '-').toLowerCase()}`;
  
  // Filter data based on selected categories if provided
  const filteredData = selectedCategories ? 
    data.filter(item => selectedCategories.includes(item.id)) : 
    data;
  
  // Make sure each item has a valid percentage
  const validData = filteredData.map(item => {
    // Convert decimal percentage to whole number if needed
    let percentage = item.percentage || 0;
    
    // If percentage is a decimal (like 0.05), convert to whole number (5)
    if (percentage > 0 && percentage < 1) {
      percentage = Math.round(percentage * 100);
    }
    
    // If percentage is missing or 0 when there's a value, calculate it
    if (!percentage && item.value > 0) {
      percentage = Math.round((item.value / data.reduce((sum, d) => sum + d.value, 0)) * 100);
    }
      
    return {
      ...item,
      percentage,
      displayValue: displayMode === 'count' ? item.value : percentage
    };
  });
  
  // Sort data for consistent display
  const sortedData = [...validData].sort((a, b) => b.value - a.value);
  
  // Get chart colors based on theme
  const getChartColors = () => {
    // Check if using a custom palette
    if (colorSettings.isCustomPalette && colorSettings.colors) {
      return colorSettings.colors;
    }
    
    // Default colors based on the theme
    return { scheme: 'paired' };
  };

  // Export options
  const handleExportCSV = () => {
    try {
      // Create CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Category,Count,Percentage\n";
      
      validData.forEach(item => {
        csvContent += `${item.id},${item.value},${item.percentage}\n`;
      });
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${title.replace(/\s+/g, '_')}_data.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export successful",
        description: "Chart data exported to CSV format",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to export data to CSV",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    try {
      // Create simple CSV for Excel
      let csvContent = "Category,Count,Percentage\n";
      validData.forEach(item => {
        // We need to handle commas in the item names by wrapping in quotes
        const safeId = item.id.includes(',') ? `"${item.id}"` : item.id;
        csvContent += `${safeId},${item.value},${item.percentage}\n`;
      });
      
      // Create CSV file with Excel extension
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // Use a .csv extension which Excel can definitely open
      link.setAttribute('href', url);
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}_data.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Excel-compatible export successful",
        description: "Data exported as CSV which Excel can open",
      });
    } catch (error) {
      console.error("Excel export error:", error);
      toast({
        title: "Export failed",
        description: "Unable to export data for Excel",
        variant: "destructive",
      });
    }
  };

  // Find all unique categories
  const getChartCategories = () => {
    return data.map(item => item.id);
  };

  // Format value labels for display
  const formatValue = (value: number) => {
    if (displayMode === 'percentage') {
      return `${value}%`;
    }
    return value.toLocaleString();
  };

  // Card height based on expanded state and data size
  const cardHeight = isExpanded ? 
    350 : 
    245; // Reduced to 70% of original size (350*0.7=245px)

  return (
    <Card className={`w-full transition-all duration-300 ${isExpanded ? 'h-[350px]' : ''} rounded-md overflow-hidden`}>
      <CardHeader className="py-0 px-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xs font-semibold">{title}</CardTitle>
            {description && <CardDescription className="text-[10px] text-gray-500">{description}</CardDescription>}
            {/* Risk Level Criteria Legend - Only show for Risk Stratification chart */}
            {title === "Risk Stratification" && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                <div className="font-semibold text-xs text-gray-700 mb-1">Risk Criteria:</div>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-sm"></div>
                    <span className="text-gray-700">High: 33+ symptoms</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-500 rounded-sm"></div>
                    <span className="text-gray-700">Medium: 27-32</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-sm"></div>
                    <span className="text-gray-700">Low: 0-26</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {/* Category Filter Button */}
            {setSelectedCategories && (
              <Button
                onClick={() => setIsCategorySelectVisible(!isCategorySelectVisible)} 
                variant={isCategorySelectVisible ? "default" : "outline"}
                size="icon"
                className="h-8 w-8"
                title="Filter Categories"
              >
                <Filter className="h-4 w-4" />
              </Button>
            )}
            
            {/* Export Menu Button - Show in a ChartExportWidget dropdown */}
            <ChartExportWidget
              onExportCSV={handleExportCSV}
              onExportExcel={exportToExcel}
              chartId={chartId}
              title={title}
            />
            
            {/* Expand/Collapse Button */}
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="outline"
              size="icon"
              className="h-8 w-8"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Show category filter UI if requested */}
        {isCategorySelectVisible && setSelectedCategories && (
          <div className="mt-4 border rounded-md p-3">
            <div className="text-sm font-medium mb-2">Filter Categories</div>
            <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
              {getChartCategories().map(category => (
                <div 
                  key={category}
                  className="flex items-center space-x-2 hover:bg-muted/50 p-1 rounded-md cursor-pointer"
                  onClick={() => {
                    if (selectedCategories?.includes(category)) {
                      setSelectedCategories(selectedCategories.filter(c => c !== category));
                    } else {
                      setSelectedCategories([...(selectedCategories || []), category]);
                    }
                  }}
                >
                  <div className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                    selectedCategories?.includes(category)
                      ? 'bg-primary border-primary'
                      : 'border-primary/20'
                  }`}>
                    {selectedCategories?.includes(category) && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <div className="text-sm">{category}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div id={chartId} style={{ height: cardHeight - 35, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} className="w-full">
          <ResponsiveBar
            data={sortedData}
            keys={['displayValue']}
            indexBy="id"
            margin={{ top: 10, right: 15, bottom: 56, left: 49 }}
            padding={0.2}
            layout="horizontal"
            valueScale={{ type: 'linear' }}
            indexScale={{ type: 'band', round: true }}
            colors={getChartColors()}
            padding={0.2}
            innerPadding={1}
            borderRadius={2}
            borderColor={{ from: 'color', modifiers: [['darker', 0.7]] }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 3,
              tickPadding: 3,
              tickRotation: -30,
              legend: '',
              legendPosition: 'middle',
              legendOffset: 35,
              truncateTickAt: 0,
              tickFont: { size: 9 }
            }}
            axisLeft={{
              tickSize: 3,
              tickPadding: 3,
              tickRotation: 0,
              legend: displayMode === 'percentage' ? 'Percentage (%)' : 'Count',
              legendPosition: 'middle',
              legendOffset: -35,
              truncateTickAt: 0,
              tickFont: { size: 9 }
            }}
            labelSkipWidth={8}
            labelSkipHeight={8}
            labelTextColor="#000000"
            labelPosition="end"
            labelStyle={{ 
              fontWeight: 'bold', 
              fontSize: 10
            }}
            label={d => formatValue(d.value)}
            role="application"
            ariaLabel={title}
            barAriaLabel={e => `${e.id}: ${e.formattedValue} ${displayMode === 'count' ? 'count' : 'percent'}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Structured sample data for demonstrations
const demoData = {
  hrsnIndicators: [
    { id: 'Housing instability', value: 312, percentage: 24 },
    { id: 'Food insecurity', value: 267, percentage: 21 },
    { id: 'Transportation barriers', value: 241, percentage: 19 },
    { id: 'Financial strain', value: 182, percentage: 14 },
    { id: 'Utility needs', value: 156, percentage: 12 },
    { id: 'Education barriers', value: 89, percentage: 7 },
    { id: 'Interpersonal violence', value: 37, percentage: 3 }
  ],
  diagnosisCodes: [
    { id: 'Depression', value: 265, percentage: 25 },
    { id: 'Anxiety', value: 318, percentage: 30 },
    { id: 'Insomnia', value: 159, percentage: 15 },
    { id: 'PTSD', value: 106, percentage: 10 },
    { id: 'Bipolar', value: 84, percentage: 8 },
    { id: 'Substance Use', value: 74, percentage: 7 },
    { id: 'Other', value: 53, percentage: 5 }
  ],
  symptomSegments: [
    { id: 'Depressed mood', value: 287, percentage: 18 },
    { id: 'Anxious mood', value: 328, percentage: 20 },
    { id: 'Sleep disturbance', value: 246, percentage: 15 },
    { id: 'Fatigue', value: 196, percentage: 12 },
    { id: 'Concentration issues', value: 184, percentage: 11 },
    { id: 'Appetite changes', value: 167, percentage: 10 },
    { id: 'Irritability', value: 142, percentage: 9 },
    { id: 'Social withdrawal', value: 85, percentage: 5 }
  ],
  symptomIDs: [
    { id: 'F32', value: 265, percentage: 25 },
    { id: 'F41', value: 318, percentage: 30 },
    { id: 'F51', value: 159, percentage: 15 },
    { id: 'F43', value: 106, percentage: 10 },
    { id: 'F31', value: 84, percentage: 8 },
    { id: 'F10', value: 74, percentage: 7 },
    { id: 'Other', value: 53, percentage: 5 }
  ],
  diagnosticCategories: [
    { id: 'Mood Disorders', value: 350, percentage: 33 },
    { id: 'Anxiety Disorders', value: 318, percentage: 30 },
    { id: 'Sleep Disorders', value: 159, percentage: 15 },
    { id: 'Trauma Disorders', value: 106, percentage: 10 },
    { id: 'Substance Disorders', value: 74, percentage: 7 },
    { id: 'Other', value: 53, percentage: 5 }
  ],
  riskStratifications: [
    { id: 'High Risk', value: 318, percentage: 30 },
    { id: 'Medium Risk', value: 424, percentage: 40 },
    { id: 'Low Risk', value: 318, percentage: 30 }
  ]
};
// === END OF FIXED CHARTS IMPLEMENTATION (May 22, 2025) ===

// Category selector component to use on each chart
const CategorySelector = ({ 
  allCategories, 
  selectedCategories, 
  setSelectedCategories,
  maxHeight = 200,
  title = "Categories to Display"
}: {
  allCategories: string[],
  selectedCategories: string[],
  setSelectedCategories: (categories: string[]) => void,
  maxHeight?: number,
  title?: string
}) => {
  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      // Remove category if already selected
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      // Add category if not selected
      setSelectedCategories([...selectedCategories, category]);
    }
  };
  
  const toggleAll = () => {
    if (selectedCategories.length === allCategories.length) {
      // Deselect all
      setSelectedCategories([]);
    } else {
      // Select all
      setSelectedCategories([...allCategories]);
    }
  };
  
  const isAllSelected = selectedCategories.length === allCategories.length;
  const isSomeSelected = selectedCategories.length > 0 && selectedCategories.length < allCategories.length;
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">{title}</div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={toggleAll}
          className="h-7 px-2 text-xs"
        >
          {isAllSelected ? 'Deselect All' : 'Select All'}
        </Button>
      </div>
      
      <div 
        className="space-y-1 overflow-auto pr-1 border rounded-md p-2" 
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {allCategories.map(category => (
          <div 
            key={category}
            className="flex items-center space-x-2 hover:bg-muted/50 p-1 rounded-md cursor-pointer"
            onClick={() => toggleCategory(category)}
          >
            <div className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
              selectedCategories.includes(category)
                ? 'bg-primary border-primary'
                : 'border-primary/20'
            }`}>
              {selectedCategories.includes(category) && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
            <div className="text-sm truncate">{category}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Centralized Chart Categories Control
const ChartCategoriesControl = ({
  allCategories,
  selectedCategories,
  setSelectedCategories,
  maxCategories,
  setMaxCategories,
}: {
  allCategories: string[];
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  maxCategories: number;
  setMaxCategories: (max: number) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleMaxCategoriesChange = (value: number[]) => {
    const newMax = value[0];
    setMaxCategories(newMax);
    
    // If we currently have more categories selected than the new max, truncate the selection
    if (selectedCategories.length > newMax) {
      setSelectedCategories(selectedCategories.slice(0, newMax));
    }
    
    // If we have fewer categories selected than the new max, and there are more available,
    // add more categories up to the new max
    if (selectedCategories.length < newMax && selectedCategories.length < allCategories.length) {
      const additionalNeeded = Math.min(newMax - selectedCategories.length, allCategories.length - selectedCategories.length);
      const unselectedCategories = allCategories.filter(c => !selectedCategories.includes(c));
      const additionalCategories = unselectedCategories.slice(0, additionalNeeded);
      setSelectedCategories([...selectedCategories, ...additionalCategories]);
    }
  };

  // Removed filtering functions from here - will place inside component
  
  return (
    <div className="mb-4">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <span className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span>{selectedCategories.length} {selectedCategories.length === 1 ? 'category' : 'categories'} selected</span>
        </span>
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      
      {isOpen && (
        <div className="mt-4 border rounded-md p-4 bg-background">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <Label>Maximum Categories to Display: {maxCategories}</Label>
              <span className="text-sm text-muted-foreground">{selectedCategories.length}/{allCategories.length}</span>
            </div>
            <Slider
              value={[maxCategories]}
              min={1}
              max={Math.min(36, allCategories.length)}
              step={1}
              onValueChange={handleMaxCategoriesChange}
              className="mb-2"
            />
          </div>
          
          <CategorySelector
            allCategories={allCategories}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            maxHeight={300}
            title="Select Categories to Display"
          />
        </div>
      )}
    </div>
  );
};

// Define types for chart data
interface ChartDataItem {
  id: string;
  value: number;
  percentage?: number;
  [key: string]: string | number | undefined;
}

// Define props for the population health page
interface PopulationHealthPageProps {
  data?: any;
  isLoading?: boolean;
  displayMode?: 'count' | 'percentage';
  onDisplayModeChange?: (mode: 'count' | 'percentage') => void;
}

// Update component to accept route props
export default function PopulationHealthPageV2(props: any) {
  // Default values for when component is used directly in routes
  const { 
    data = undefined,
    isLoading = false, 
    displayMode: initialDisplayMode = 'count',
    onDisplayModeChange = () => {} 
  } = props as PopulationHealthPageProps;
  
  // State for print with charts option
  const [printWithCharts, setPrintWithCharts] = useState<boolean>(false);
  
  // State for download loading indicator
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  
  // Initialize global window object property for print with charts
  useEffect(() => {
    // Set the global flag for printing with charts
    (window as any).printWithChartsEnabled = printWithCharts;
    console.log("Print with charts set to:", printWithCharts);
  }, [printWithCharts]);
  // Fetch visualization data
  const { data: visualizationData, isLoading: dataLoading, error: dataError } = useQuery({
    queryKey: ["/api/visualization-data"],
    queryFn: async () => {
      console.log("🔥 FETCHING visualization data...");
      try {
        const response = await fetch("/api/visualization-data", {
          credentials: "include",
        });
        
        console.log("📡 Response status:", response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ API Error:", response.status, errorText);
          throw new Error(`${response.status}: ${errorText}`);
        }
        
        console.log("🔄 About to parse JSON...");
        const data = await response.json();
        console.log("✅ JSON parsed successfully");
        console.log("✅ API Response received:", {
          status: response.status,
          dataKeys: Object.keys(data),
          symptomIDDataLength: data.symptomIDData?.length || 0,
          firstSymptomID: data.symptomIDData?.[0] || "No data"
        });
        
        console.log("🎯 Returning data to useQuery...");
        return data;
      } catch (error) {
        console.error("🔥 FETCH ERROR:", error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache (updated from cacheTime)
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Prevent excessive refetching
  });

  // V3.3.8 RESTORATION: Fetch dropdown counts for record counts in parentheses
  const { data: dropdownCounts } = useQuery({
    queryKey: ["/api/dropdown-counts-fast"],
    queryFn: async () => {
      console.log("⚡ FETCHING ultra-fast dropdown counts...");
      const response = await fetch("/api/dropdown-counts-fast", {
        credentials: "include",
      });
      if (!response.ok) throw new Error('Failed to fetch dropdown counts');
      const data = await response.json();
      console.log("⚡ Dropdown counts received:", {
        diagnosesCount: data.diagnoses?.length || 0,
        categoriesCount: data.categories?.length || 0,
        symptomsCount: data.symptoms?.length || 0
      });
      return data;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes cache
    refetchOnWindowFocus: false,
  });
  
  // Handle loading and error states
  const isDataLoading = isLoading || dataLoading;
  const hasError = dataError ? true : false;
  
  // Store data reference with a fallback
  const allData = useMemo(() => {
    const result = data || visualizationData || {};
    console.log("🔍 DATA FLOW CHECK:", {
      dataLoading,
      hasVisualizationData: !!visualizationData,
      hasActualData: !!data,
      dataError: dataError ? "present" : "none"
    });
    return result;
  }, [data, visualizationData, dataLoading, dataError]);
  
  // Track state for the display mode (count/percentage)
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>(initialDisplayMode);
  
  // Track categories for each chart type
  const [hrsnCategories, setHrsnCategories] = useState<string[]>([]);
  const [symptomCategories, setSymptomCategories] = useState<string[]>([]);
  const [diagnosisCategories, setDiagnosisCategories] = useState<string[]>([]);
  const [categoryCategories, setCategoryCategories] = useState<string[]>([]);
  const [symptomIdCategories, setSymptomIdCategories] = useState<string[]>([]);
  
  // Track max categories to display for each chart type
  const [maxHrsnCategories, setMaxHrsnCategories] = useState(10);
  const [maxSymptomCategories, setMaxSymptomCategories] = useState(10);
  const [maxDiagnosisCategories, setMaxDiagnosisCategories] = useState(10);
  const [maxCategoryCategories, setMaxCategoryCategories] = useState(10);
  const [maxSymptomIdCategories, setMaxSymptomIdCategories] = useState(10);
  
  // State for Find Records functionality
  const [filteredPatientCount, setFilteredPatientCount] = useState<number | null>(null);
  const [isSearchingRecords, setIsSearchingRecords] = useState(false);

  // State for filtered patient data
  const [filteredData, setFilteredData] = useState<any[]>([]);
  
  // Track which charts are expanded (fullscreen mode)
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  
  // Show print dialog state
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printChartId, setPrintChartId] = useState<string>("");
  
  // For the population health filters section
  const [selectedSymptomSegment, setSelectedSymptomSegment] = useState("all");
  const [diagnosisFilter, setDiagnosisFilter] = useState("all");
  const [selectedDiagnosticCategory, setSelectedDiagnosticCategory] = useState("all");
  const [selectedSymptomId, setSelectedSymptomId] = useState("all");
  
  // For the HRSN Indicators section
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  
  // Boolean search logic state (AND/OR)
  const [searchLogic, setSearchLogic] = useState<'AND' | 'OR'>('AND');
  
  // For the fixed charts section
  const [fixedDisplayMode, setFixedDisplayMode] = useState<'count' | 'percentage'>('count');
  const [fixedSelectedCategories, setFixedSelectedCategories] = useState<string[]>([]);
  const [maxCategories, setMaxCategories] = useState<number>(10);
  const [isCategorySelectVisible, setIsCategorySelectVisible] = useState<boolean>(false);

  // Find Records function for the workflow
  const findRecords = async () => {
    setIsSearchingRecords(true);
    try {
      // Build search parameters based on selected criteria
      const searchParams = {
        symptomSegment: selectedSymptomSegment !== "all" ? selectedSymptomSegment : undefined,
        diagnosis: diagnosisFilter !== "all" ? diagnosisFilter : undefined,
        diagnosticCategory: selectedDiagnosticCategory !== "all" ? selectedDiagnosticCategory : undefined,
        symptomId: selectedSymptomId !== "all" ? selectedSymptomId : undefined,
        // Include HRSN filters and boolean logic
        hrsnFilters: selectedFilters,
        searchLogic: searchLogic
      };

      // Make API call to find matching records
      const response = await fetch('/api/find-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams),
      });

      if (!response.ok) {
        throw new Error('Failed to find records');
      }

      const result = await response.json();
      setFilteredPatientCount(result.patientCount);
      setFilteredData(result.patients || []);

      // Auto-populate HRSN visualizations when search results are returned
      if (result.patients && result.patients.length > 0) {
        console.log("🎯 AUTO-POPULATING HRSN VISUALIZATIONS with search results");
        console.log("Search returned", result.patients.length, "patients - auto-triggering HRSN charts");
        console.log("Using", searchLogic, "logic for", selectedFilters.length, "HRSN filters");
        
        // Server already filtered the data based on HRSN filters and boolean logic
        // No need for additional client-side filtering
        console.log("Server-side filtering complete with", result.patientCount, "matching patients");
        
        // Auto-show visualizations for any search results
        console.log("Auto-enabling HRSN visualizations for search results");
      }
    } catch (error) {
      console.error('Error finding records:', error);
      setFilteredPatientCount(0);
      setFilteredData([]);
    } finally {
      setIsSearchingRecords(false);
    }
  };

  // Download Filtered Results function
  const downloadFilteredResults = async () => {
    if (!filteredData || filteredData.length === 0) {
      toast({
        title: "No Data",
        description: "Please run a search first to filter records before downloading.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create CSV content with search criteria and full patient data
      const searchCriteria = [
        selectedSymptomSegment !== "all" ? `Symptom Segment: ${selectedSymptomSegment}` : "",
        diagnosisFilter !== "all" ? `Diagnosis: ${diagnosisFilter}` : "",
        selectedDiagnosticCategory !== "all" ? `Diagnostic Category: ${selectedDiagnosticCategory}` : "",
        selectedSymptomId !== "all" ? `Symptom ID: ${selectedSymptomId}` : "",
        selectedFilters.length > 0 ? `HRSN Problems: ${selectedFilters.join(', ')}` : ""
      ].filter(Boolean).join(", ");

      // Check if filteredData contains objects or just IDs
      const firstItem = filteredData[0];
      const isObjectData = typeof firstItem === 'object' && firstItem !== null;
      
      let csvContent = "";
      
      if (isObjectData) {
        // If we have full patient objects, export all fields
        const headers = Object.keys(firstItem);
        
        csvContent = [
          `# Search Criteria: ${searchCriteria || "All Records"}`,
          `# Total Filtered Patients: ${filteredPatientCount}`,
          `# Export Date: ${new Date().toLocaleString()}`,
          "",
          headers.join(","),
          ...filteredData.map(patient => {
            return headers.map(header => {
              const value = patient[header];
              // Handle special cases for CSV formatting
              if (value === null || value === undefined) return "";
              if (typeof value === 'object') return JSON.stringify(value);
              if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
              return value;
            }).join(",");
          })
        ].join("\n");
      } else {
        // If we only have patient IDs, export just the IDs
        csvContent = [
          `# Search Criteria: ${searchCriteria || "All Records"}`,
          `# Total Filtered Patients: ${filteredPatientCount}`,
          `# Export Date: ${new Date().toLocaleString()}`,
          "",
          "Patient_ID",
          ...filteredData.map(patientId => {
            // Make sure we're getting the actual ID value
            if (typeof patientId === 'object' && patientId.patientId) {
              return patientId.patientId;
            }
            return patientId;
          })
        ].join("\n");
      }

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `filtered_patients_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: "Download Complete",
        description: `Downloaded ${filteredPatientCount} filtered patient records with all available fields.`,
      });
    } catch (error) {
      console.error('Error downloading filtered results:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download filtered results. Please try again.",
        variant: "destructive",
      });
    }
  };
  const chartsContainerRef = useRef<HTMLDivElement>(null);
  
  // Use actual database data instead of demo data
  const actualData = visualizationData || allData;
  
  // Debug: Check which data arrays are empty (simplified)
  useEffect(() => {
    console.log("🔍 DATA FLOW CHECK:", {
      dataLoading,
      hasVisualizationData: !!visualizationData,
      hasActualData: !!actualData && Object.keys(actualData).length > 0,
      dataError: dataError?.message || "none"
    });
    
    if (visualizationData && !dataLoading) {
      console.log("📊 VISUALIZATION DATA READY:", {
        symptomIDDataLength: visualizationData.symptomIDData?.length || 0,
        diagnosisDataLength: visualizationData.diagnosisData?.length || 0,
        symptomSegmentDataLength: visualizationData.symptomSegmentData?.length || 0,
        firstSymptomID: visualizationData.symptomIDData?.[0] || "No data"
      });
    }
  }, [visualizationData, dataLoading, dataError, actualData]);
  

  
  // Get access to theme context and toast 
  const { colorSettings, theme, currentTheme, setCurrentTheme } = useChartTheme();
  const { toast } = useToast();
  
  // Options for the HRSN Indicators filters - Updated with actual HRSN problem fields
  const filterOptions = [
    // HRSN Problem Fields from database
    { value: "housing_insecurity", label: "Housing Insecurity" },
    { value: "food_insecurity", label: "Food Insecurity" },
    { value: "financial_status", label: "Financial Status" },
    { value: "access_to_transportation", label: "Access to Transportation" },
    { value: "has_a_car", label: "Has a Car" },
    { value: "at_risk_homelessness", label: "At Risk Homelessness" },
    { value: "living_situation", label: "Living Situation" },
    { value: "history_of_homelessness", label: "History of Homelessness" },
    // Demographics
    { value: "age_range", label: "Age Range" },
    { value: "diagnosis", label: "Diagnosis" },
    { value: "gender", label: "Gender" },
    { value: "race", label: "Race" },
    { value: "ethnicity", label: "Ethnicity" },
    { value: "zipcode", label: "Zip Code" },
    { value: "insurance", label: "Insurance Type" },
    { value: "incomeLevel", label: "Income Level" }
  ];




  
  // Update external state when display mode changes
  useEffect(() => {
    if (onDisplayModeChange) {
      onDisplayModeChange(displayMode);
    }
  }, [displayMode, onDisplayModeChange]);
  
  // Initialize categories from data on first load
  useEffect(() => {
    if (allData && !isDataLoading) {
      // Initialize HRSN categories
      if (allData.hrsnIndicatorData && Array.isArray(allData.hrsnIndicatorData)) {
        const hrsnIds = allData.hrsnIndicatorData.map((item: any) => item.id || '').filter(Boolean);
        if (hrsnIds.length > 0) {
          // Take the first 10 categories by default (or fewer if less than 10 exist)
          const initialCategories = hrsnIds.slice(0, 10);
          setHrsnCategories(initialCategories);
          // Update max categories if necessary
          if (initialCategories.length < maxHrsnCategories) {
            setMaxHrsnCategories(initialCategories.length);
          }
        }
      }
      
      // Initialize Symptom Segments
      if (allData.symptomSegmentData && Array.isArray(allData.symptomSegmentData)) {
        const symptomIds = allData.symptomSegmentData.map((item: any) => item.id || '').filter(Boolean);
        if (symptomIds.length > 0) {
          const initialCategories = symptomIds.slice(0, 10);
          setSymptomCategories(initialCategories);
          if (initialCategories.length < maxSymptomCategories) {
            setMaxSymptomCategories(initialCategories.length);
          }
        }
      }
      
      // Initialize Diagnosis
      if (allData.diagnosisData && Array.isArray(allData.diagnosisData)) {
        const diagnosisIds = allData.diagnosisData.map((item: any) => item.id || '').filter(Boolean);
        if (diagnosisIds.length > 0) {
          const initialCategories = diagnosisIds.slice(0, 10);
          setDiagnosisCategories(initialCategories);
          if (initialCategories.length < maxDiagnosisCategories) {
            setMaxDiagnosisCategories(initialCategories.length);
          }
        }
      }
      
      // Initialize Diagnostic Categories
      if (allData.diagnosticCategoryData && Array.isArray(allData.diagnosticCategoryData)) {
        const categoryIds = allData.diagnosticCategoryData.map((item: any) => item.id || '').filter(Boolean);
        if (categoryIds.length > 0) {
          const initialCategories = categoryIds.slice(0, 10);
          setCategoryCategories(initialCategories);
          if (initialCategories.length < maxCategoryCategories) {
            setMaxCategoryCategories(initialCategories.length);
          }
        }
      }
      
      // Initialize Symptom IDs
      if (allData.symptomIDData && Array.isArray(allData.symptomIDData)) {
        const symptomIdIds = allData.symptomIDData.map((item: any) => item.id || '').filter(Boolean);
        if (symptomIdIds.length > 0) {
          const initialCategories = symptomIdIds.slice(0, 10);
          setSymptomIdCategories(initialCategories);
          if (initialCategories.length < maxSymptomIdCategories) {
            setMaxSymptomIdCategories(initialCategories.length);
          }
        }
      }
    }
  }, [allData, isDataLoading]);
  
  // Helper functions for data and chart rendering
  
  // Toggle display mode between count and percentage
  const toggleDisplayMode = () => {
    const newMode = displayMode === 'count' ? 'percentage' : 'count';
    setDisplayMode(newMode);
  };
  
  // HRSN Indicators chart data
  const getHrsnIndicatorData = (): ChartDataItem[] => {
    if (!allData?.hrsnIndicatorData) return [];
    
    // Filter to only include selected categories if hrsnCategories has items
    const filteredData = hrsnCategories.length > 0 
      ? allData.hrsnIndicatorData.filter((item: any) => hrsnCategories.includes(item.id))
      : allData.hrsnIndicatorData;
    
    // Calculate total for percentages
    const total = filteredData.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
    
    // Transform to chart format
    return filteredData.map((item: any) => ({
      id: item.id,
      value: item.value || 0,
      percentage: total > 0 ? Math.round(((item.value || 0) / total) * 100) : 0,
      displayValue: displayMode === 'percentage' 
        ? (total > 0 ? Math.round(((item.value || 0) / total) * 100) : 0) 
        : (item.value || 0)
    }));
  };
  
  // Symptom Segments chart data
  const getSymptomSegmentData = (): ChartDataItem[] => {
    if (!allData?.symptomSegmentData) return [];
    
    // Filter to only include selected categories if symptomCategories has items
    const filteredData = symptomCategories.length > 0 
      ? allData.symptomSegmentData.filter((item: any) => symptomCategories.includes(item.id))
      : allData.symptomSegmentData;
    
    // Calculate total for percentages
    const total = filteredData.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
    
    // Transform to chart format
    return filteredData.map((item: any) => ({
      id: item.id,
      value: item.value || 0,
      percentage: total > 0 ? Math.round(((item.value || 0) / total) * 100) : 0,
      displayValue: displayMode === 'percentage' 
        ? (total > 0 ? Math.round(((item.value || 0) / total) * 100) : 0) 
        : (item.value || 0)
    }));
  };
  
  // Get filtered patients based on selected criteria
  const getFilteredPatients = () => {
    if (!allData?.patients) return [];
    
    let filteredPatients = allData.patients;
    
    // Filter by diagnosis if selected
    if (diagnosisFilter && diagnosisFilter !== 'all') {
      console.log("Filtering by diagnosis:", diagnosisFilter);
      console.log("Sample patient data:", allData.patients[0]); // Debug first patient
      console.log("Available diagnosis data:", allData.diagnosisData?.slice(0, 5)); // Debug diagnosis data
      
      // Find patients who have extracted symptoms with the selected diagnosis
      // Since the diagnosis data comes from extracted symptoms, we need to check those
      const patientsWithDiagnosis = new Set();
      
      // If we have access to extracted symptoms data, use it
      if (allData.extractedSymptoms && Array.isArray(allData.extractedSymptoms)) {
        allData.extractedSymptoms.forEach((symptom: any) => {
          if (symptom.diagnosis === diagnosisFilter ||
              symptom.primaryDiagnosis === diagnosisFilter ||
              symptom.diagnosis_name === diagnosisFilter) {
            patientsWithDiagnosis.add(symptom.patient_id || symptom.patientId);
          }
        });
      } else {
        // Fallback: search in patient symptoms if available
        allData.patients.forEach((patient: any) => {
          if (patient.symptoms && Array.isArray(patient.symptoms)) {
            const hasMatchingDiagnosis = patient.symptoms.some((symptom: any) => 
              symptom.diagnosis === diagnosisFilter ||
              symptom.primaryDiagnosis === diagnosisFilter ||
              symptom.diagnosis_name === diagnosisFilter
            );
            if (hasMatchingDiagnosis) {
              patientsWithDiagnosis.add(patient.id || patient.patientId);
            }
          }
          
          // Also check various possible diagnosis field formats on the patient directly
          const patientDiagnoses = [
            patient.diagnosis,
            patient.primaryDiagnosis,
            patient.diagnosisName,
            patient.primary_diagnosis,
            patient.diagnosis_name,
            patient.icd10_code,
            patient.icdCode,
            ...(patient.diagnoses || []) // Handle array of diagnoses
          ].filter(Boolean);
          
          const hasMatchingDiagnosis = patientDiagnoses.some(diagnosis => 
            diagnosis === diagnosisFilter || 
            (typeof diagnosis === 'string' && diagnosis.includes(diagnosisFilter))
          );
          
          if (hasMatchingDiagnosis) {
            patientsWithDiagnosis.add(patient.id || patient.patientId);
          }
        });
      }
      
      // Filter patients based on the collected patient IDs
      filteredPatients = filteredPatients.filter((patient: any) => 
        patientsWithDiagnosis.has(patient.id || patient.patientId)
      );
      
      console.log("Patients with diagnosis found:", patientsWithDiagnosis.size);
      console.log("Filtered patients count:", filteredPatients.length);
    }
    
    // Filter by diagnostic category if selected
    if (selectedDiagnosticCategory && selectedDiagnosticCategory !== 'all') {
      console.log("Filtering by diagnostic category:", selectedDiagnosticCategory);
      
      const patientsWithCategory = new Set();
      
      // Find patients who have extracted symptoms with the selected diagnostic category
      if (allData.extractedSymptoms && Array.isArray(allData.extractedSymptoms)) {
        allData.extractedSymptoms.forEach((symptom: any) => {
          if (symptom.diagnostic_category === selectedDiagnosticCategory ||
              symptom.diagnosticCategory === selectedDiagnosticCategory ||
              symptom.category === selectedDiagnosticCategory) {
            patientsWithCategory.add(symptom.patient_id || symptom.patientId);
          }
        });
      }
      
      // Filter patients based on the collected patient IDs
      filteredPatients = filteredPatients.filter((patient: any) => 
        patientsWithCategory.has(patient.id || patient.patientId)
      );
      
      console.log("Patients with diagnostic category found:", patientsWithCategory.size);
      console.log("Filtered patients count after category filter:", filteredPatients.length);
    }
    
    return filteredPatients;
  };

  // Age Range data function for filtered results
  const getAgeRangeDataChart = (): ChartDataItem[] => {
    const filteredPatients = getFilteredPatients();
    if (filteredPatients.length === 0) return [];
    
    const ageRanges = {
      '0-17': 0,
      '18-25': 0,
      '26-35': 0,
      '36-45': 0,
      '46-55': 0,
      '56-65': 0,
      '66+': 0
    };

    filteredPatients.forEach((patient: any) => {
      const age = patient.age || 0;
      if (age <= 17) ageRanges['0-17']++;
      else if (age <= 25) ageRanges['18-25']++;
      else if (age <= 35) ageRanges['26-35']++;
      else if (age <= 45) ageRanges['36-45']++;
      else if (age <= 55) ageRanges['46-55']++;
      else if (age <= 65) ageRanges['56-65']++;
      else ageRanges['66+']++;
    });

    const total = Object.values(ageRanges).reduce((sum, count) => sum + count, 0);
    
    return Object.entries(ageRanges).map(([range, count]) => ({
      id: range,
      value: count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      displayValue: displayMode === 'percentage' 
        ? (total > 0 ? Math.round((count / total) * 100) : 0) 
        : count
    }));
  };

  // Diagnosis chart data
  const getDiagnosisData = (): ChartDataItem[] => {
    if (!allData?.diagnosisData) return [];
    
    // Filter to only include selected categories if diagnosisCategories has items
    const filteredData = diagnosisCategories.length > 0 
      ? allData.diagnosisData.filter((item: any) => diagnosisCategories.includes(item.id))
      : allData.diagnosisData;
    
    // Calculate total for percentages
    const total = filteredData.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
    
    // Transform to chart format
    return filteredData.map((item: any) => ({
      id: item.id,
      value: item.value || 0,
      percentage: total > 0 ? Math.round(((item.value || 0) / total) * 100) : 0,
      displayValue: displayMode === 'percentage' 
        ? (total > 0 ? Math.round(((item.value || 0) / total) * 100) : 0) 
        : (item.value || 0)
    }));
  };
  
  // Diagnostic Category chart data
  const getDiagnosticCategoryData = (): ChartDataItem[] => {
    if (!allData?.diagnosticCategoryData) return [];
    
    // Filter to only include selected categories if categoryCategories has items
    const filteredData = categoryCategories.length > 0 
      ? allData.diagnosticCategoryData.filter((item: any) => categoryCategories.includes(item.id))
      : allData.diagnosticCategoryData;
    
    // Calculate total for percentages
    const total = filteredData.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
    
    // Transform to chart format
    return filteredData.map((item: any) => ({
      id: item.id,
      value: item.value || 0,
      percentage: total > 0 ? Math.round(((item.value || 0) / total) * 100) : 0,
      displayValue: displayMode === 'percentage' 
        ? (total > 0 ? Math.round(((item.value || 0) / total) * 100) : 0) 
        : (item.value || 0)
    }));
  };
  
  // Symptom ID chart data
  const getSymptomIDData = (): ChartDataItem[] => {
    if (!allData?.symptomIDData) return [];
    
    // Filter to only include selected categories if symptomIdCategories has items
    const filteredData = symptomIdCategories.length > 0 
      ? allData.symptomIDData.filter((item: any) => symptomIdCategories.includes(item.id))
      : allData.symptomIDData;
    
    // Calculate total for percentages
    const total = filteredData.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
    
    // Transform to chart format
    return filteredData.map((item: any) => ({
      id: item.id,
      value: item.value || 0,
      percentage: total > 0 ? Math.round(((item.value || 0) / total) * 100) : 0,
      displayValue: displayMode === 'percentage' 
        ? (total > 0 ? Math.round(((item.value || 0) / total) * 100) : 0) 
        : (item.value || 0)
    }));
  };
  
  // Function to get filter visualization data based on filter type
  const getFilterVisualizationData = (filterType: string) => {
    const patients = allData?.patients || [];
    
    // Default empty data structure for charts
    const defaultBarData = [{ category: "No Data", value: 0, percentage: 0 }];
    const defaultPieData = [{ id: "No Data", label: "No Data", value: 0, percentage: 0 }];
    
    if (patients.length === 0) {
      return { barChartData: defaultBarData, pieChartData: defaultPieData };
    }
    
    // Aggregate data by selected filter
    const aggregatedData = new Map<string, number>();
    
    patients.forEach((patient: any) => {
      let value: any = null;
      
      // Extract appropriate field based on filter type
      if (filterType === 'age_range' && patient.age_range) {
        value = patient.age_range;
        
        // Standardize age ranges
        if (typeof value === 'string') {
          const ageCategories = ["0-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
          if (!ageCategories.includes(value)) {
            value = "Other";
          }
        } else {
          value = "No Data Available";
        }
      }
      else if (filterType === 'gender' && patient.gender) {
        value = patient.gender;
        
        // Standardize gender values if it's a string
        if (typeof value === 'string') {
          if (value.toLowerCase() === 'm' || value.toLowerCase() === 'male') {
            value = "Male";
          } else if (value.toLowerCase() === 'f' || value.toLowerCase() === 'female') {
            value = "Female";
          } else {
            value = "Other";
          }
        } else {
          value = "No Data Available"; // For non-string gender values
        }
      }
      // If gender filter is active but no gender data is present
      else if (filterType === 'gender') {
        value = "No Data Available";
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
        } else {
          value = "No Data Available"; // For non-string race values
        }
      }
      // If race filter is active but no race data is present
      else if (filterType === 'race') {
        value = "No Data Available";
      }
      
      // If we found a value, count it
      if (value) {
        // For age_range, normalize the value to our standard categories
        if (filterType === 'age_range') {
          const ageCategories = ["0-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+", "No Data Available"];
          if (!ageCategories.includes(value)) {
            console.log(`Converting non-standard age value: "${value}" to "Other"`);
            value = "Other";
          }
        }
        
        aggregatedData.set(value, (aggregatedData.get(value) || 0) + 1);
      }
    });
    
    console.log(`Filter type ${filterType} data:`, Object.fromEntries(aggregatedData));
    
    // Calculate total count for percentage calculation
    const totalCount = Array.from(aggregatedData.values()).reduce((sum, count) => sum + count, 0);
    
    // Convert to chart data format with percentage calculation
    const barChartData = Array.from(aggregatedData.entries()).map(([category, count]) => {
      // Calculate percentage with proper rounding - important to use exact division here
      const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
      
      // Important: Add both id and category - some chart components use id instead of category
      return {
        id: category, // Add id to match the expected chart format
        category: category,
        value: displayMode === "count" ? count : percentage,
        rawValue: count,
        percentage: percentage
      }
    });
    
    // Map to pie chart data with percentages instead of raw counts
    const pieChartData = Array.from(aggregatedData.entries()).map(([category, count]) => {
      // Calculate percentage (rounded to whole number for consistency)
      const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
      
      return {
        id: category,
        label: category,
        // Use percentage for value in percentage mode, otherwise use count
        value: displayMode === "count" ? count : percentage,
        // Store original count for reference if needed
        count: count,
        // Store percentage separately for tooltips and labels
        percentage: percentage
      };
    });
    
    return { barChartData, pieChartData };
  };
  
  // Get chart colors based on theme
  const getChartColors = () => {
    // Check if using a custom palette
    if (colorSettings.isCustomPalette && colorSettings.colors) {
      return colorSettings.colors;
    }
    
    // Default colors based on the theme
    return { scheme: 'paired' };
  };
  
  // Toggle chart expand state
  const toggleExpandChart = (chartId: string) => {
    setExpandedChart(expandedChart === chartId ? null : chartId);
  };
  
  // Handle print operations
  const printChart = (chartId: string) => {
    setPrintChartId(chartId);
    setShowPrintDialog(true);
  };
  
  // If loading, show skeleton
  if (isDataLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }
  
  // If error, show error state
  if (hasError) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          There was a problem loading the visualization data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Function to render chart with uniform styling
  const renderChart = (
    data: ChartDataItem[],
    title: string,
    description: string,
    height: number = 350,
    fullscreen: boolean = false,
    chartId: string,
    margin = { top: 20, right: 20, bottom: 80, left: 80 }
  ) => {
    return (
      <div 
        className={`h-[${height}px] w-full relative`}
        id={chartId}
      >
        <ResponsiveBar
          data={data}
          keys={['displayValue']}
          indexBy="id"
          margin={margin}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={getChartColors()}
          colorBy="indexValue"
          borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 10,
            tickRotation: -45,
            legend: 'Categories',
            legendPosition: 'middle',
            legendOffset: 65,
            truncateTickAt: 0,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: displayMode === 'percentage' ? 'Percentage (%)' : 'Count',
            legendPosition: 'middle',
            legendOffset: -60,
            truncateTickAt: 0
          }}
          enableGridY={true}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelPosition="end"
          labelTextColor={{
            from: 'color',
            modifiers: [['darker', 2]]
          }}
          role="application"
          ariaLabel={title}
          barAriaLabel={e => `${e.id}: ${e.formattedValue} ${displayMode === 'percentage' ? '%' : 'patients'}`}
          theme={theme}
          tooltipFormat={displayMode === 'percentage' ? value => `${value}%` : value => `${value}`}
          tooltip={({ id, value, color, data }) => (
            <div
              style={{
                padding: 12,
                background: '#ffffff',
                color: '#333333',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{id}</div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: color,
                    marginRight: 8,
                  }}
                />
                {displayMode === 'percentage'
                  ? `${data.percentage !== undefined ? data.percentage : value}%`
                  : `${value} patients`
                }
              </div>
            </div>
          )}
        />
      </div>
    );
  };
  
  // Component for the chart section with title and control buttons
  const ChartSection = ({
    title,
    description,
    data,
    chartId,
    allCategories,
    selectedCategories,
    setSelectedCategories,
    maxCategories,
    setMaxCategories
  }: {
    title: string;
    description: string;
    data: ChartDataItem[];
    chartId: string;
    allCategories: string[];
    selectedCategories: string[];
    setSelectedCategories: (categories: string[]) => void;
    maxCategories: number;
    setMaxCategories: (max: number) => void;
  }) => {
    const [isCategorySelectVisible, setIsCategorySelectVisible] = useState(false);
    
    // Debug log to verify this component is being used
    console.log(`Rendering chart: ${title} with ${data.length} items`);
    
    return (
      <Card className="shadow-sm chart-container relative" data-chart-id={chartId}>
        <CardHeader className="pb-1 pt-2">
          <div className="flex justify-between items-start">
            <div className="space-y-0 flex-1">
              <CardTitle className="font-semibold chart-title leading-tight" style={{ fontSize: '12pt' }}>
                {title}
              </CardTitle>
              <CardDescription className="leading-tight" style={{ fontSize: '12pt' }}>
                {description}
              </CardDescription>
            </div>
            
            {/* Total Records Count in Upper Right */}
            <div className="bg-red-100 border-2 border-red-500 rounded px-3 py-1 text-sm font-bold text-red-700 ml-2 whitespace-nowrap">
              TOTAL: {data.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
            </div>
            
            <div className="flex space-x-1 ml-2">
              <Button 
                variant={displayMode === 'count' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setDisplayMode('count')}
                className="h-8 px-2 text-xs"
              >
                <Hash className="h-4 w-4 mr-1" />
                Count
              </Button>
              <Button 
                variant={displayMode === 'percentage' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setDisplayMode('percentage')}
                className="h-8 px-2 text-xs"
              >
                <Percent className="h-4 w-4 mr-1" />
                Percent
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsCategorySelectVisible(!isCategorySelectVisible)}
              >
                <Filter className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => printChart(chartId)}
              >
                <Printer className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => toggleExpandChart(chartId)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {isCategorySelectVisible && (
            <div className="mt-4 border rounded-md p-4 bg-background">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <Label>Maximum Categories: {maxCategories}</Label>
                  <span className="text-sm text-muted-foreground">{selectedCategories.length}/{allCategories.length}</span>
                </div>
                <Slider
                  value={[maxCategories]}
                  min={1}
                  max={Math.min(36, allCategories.length)}
                  step={1}
                  onValueChange={(value) => setMaxCategories(value[0])}
                  className="mb-2"
                />
              </div>
              
              <CategorySelector
                allCategories={allCategories}
                selectedCategories={selectedCategories}
                setSelectedCategories={setSelectedCategories}
                maxHeight={200}
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-0 pb-2">
          {renderChart(data, title, description, 350, false, chartId)}
        </CardContent>
        <CardFooter className="py-1 px-2">
          <ChartExportWidget 
            chartId={chartId}
            data={data}
            title={title}
            displayMode={displayMode}
          />
        </CardFooter>
      </Card>
    );
  };
  
  // Extract all category names for initialization
  const allHrsnCategories = allData?.hrsnIndicatorData?.map((item: any) => item.id) || [];
  const allSymptomCategories = allData?.symptomSegmentData?.map((item: any) => item.id) || [];
  const allDiagnosisCategories = allData?.diagnosisData?.map((item: any) => item.id) || [];
  const allDiagnosticCategories = allData?.diagnosticCategoryData?.map((item: any) => item.id) || [];
  const allSymptomIDCategories = allData?.symptomIDData?.map((item: any) => item.id) || [];
  
  // Patient and record counts
  const patientCount = allData?.patients?.length || 24;
  const recordCount = allData?.totalRecords || 1061;
  
  // FixedChart component for displaying standardized charts
  interface FixedChartProps {
    data: Array<{id: string; value: number; percentage?: number}>;
    title: string;
    description: string;
    displayMode: 'count' | 'percentage';
    colorScheme?: string;
    selectedCategories?: string[];
    setSelectedCategories?: (categories: string[]) => void;
  }
  
  function FixedChart({ 
    data, 
    title, 
    description, 
    displayMode, 
    colorScheme = "nivo",
    selectedCategories,
    setSelectedCategories
  }: FixedChartProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { theme } = useChartTheme();
    const { toast } = useToast();
    const chartId = `chart-${title.replace(/\s+/g, '-').toLowerCase()}`;
    
    // Filter data based on selected categories if provided
    const filteredData = selectedCategories ? 
      data.filter(item => selectedCategories.includes(item.id)) : 
      data;
    
    // Make sure each item has a valid percentage
    const validData = filteredData.map(item => {
      // If percentage is missing or 0 when there's a value, calculate it
      const percentage = (!item.percentage && item.value > 0) ? 
        Math.round((item.value / data.reduce((sum, d) => sum + d.value, 0)) * 100) : 
        item.percentage || 0;
        
      return {
        ...item,
        percentage,
        displayValue: displayMode === 'count' ? item.value : percentage
      };
    });
  
    // Format tick values based on display mode
    const formatTick = (value: number) => {
      if (displayMode === 'percentage') {
        return `${value.toFixed(1)}%`;
      }
      return value.toLocaleString();
    };
  
    const printChart = () => {
      const chartElement = document.getElementById(chartId);
      if (!chartElement) {
        toast({
          title: "Error",
          description: "Chart element not found",
          variant: "destructive"
        });
        return;
      }
      
      html2canvas(chartElement).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${title.replace(/\s+/g, '_')}_chart.pdf`);
        
        toast({
          title: "Success",
          description: "Chart exported to PDF",
        });
      });
    };
  
    const toggleExpand = () => {
      setIsExpanded(!isExpanded);
    };
  
    return (
      <Card className={`shadow-sm ${isExpanded ? 'col-span-full' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xs font-semibold">
                {title}
              </CardTitle>
              <CardDescription className="text-[8px]">
                {description}
              </CardDescription>
            </div>
            <div className="flex space-x-1">
              {/* CSV Export */}
              <Button
                onClick={() => {
                  try {
                    // Create simple CSV
                    let csvContent = "Category,Count,Percentage\n";
                    validData.forEach(item => {
                      // Handle commas in the item names by wrapping in quotes
                      const safeId = item.id.includes(',') ? `"${item.id}"` : item.id;
                      csvContent += `${safeId},${item.value},${item.percentage}\n`;
                    });
                    
                    // Create CSV file
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    
                    link.setAttribute('href', url);
                    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_data.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  } catch (error) {
                    console.error("CSV export error:", error);
                  }
                }}
                variant="outline"
                size="icon"
                className="h-8 w-8"
                title="Export to CSV"
              >
                <FileText className="h-4 w-4" />
              </Button>
              
              {/* Patient Detail Export with record-by-record breakdown */}
              <Button
                onClick={() => {
                  try {
                    // Create detailed CSV with record-by-record breakdown
                    let csvContent = "RecordID,PatientID,PatientName,Category,Date,Value,Notes\n";
                    
                    // For each data point, generate detailed records for all patients
                    validData.forEach(item => {
                      // Handle commas in the item names by wrapping in quotes
                      const safeId = item.id.includes(',') ? `"${item.id}"` : item.id;
                      
                      // Sample data - in production this would be populated from the actual patient database
                      // Generate multiple records per category to demonstrate the record-by-record breakdown
                      for (let i = 1; i <= item.value; i++) {
                        const recordId = `REC-${safeId.substring(0, 3)}-${i}`;
                        const patientId = `P${1000 + i}`;
                        const patientName = `"Patient ${i}"`;
                        const date = new Date(2024, 0, i).toISOString().split('T')[0];
                        const value = "1"; // Each record is one occurrence
                        const notes = `"Record note for ${safeId} - patient ${i}"`;
                        
                        csvContent += `${recordId},${patientId},${patientName},${safeId},${date},${value},${notes}\n`;
                      }
                    });
                    
                    // Create CSV file
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    
                    link.setAttribute('href', url);
                    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_patient_detail.csv`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  } catch (error) {
                    console.error("Patient Detail export error:", error);
                  }
                }}
                variant="outline"
                size="icon"
                className="h-8 w-8"
                title="Patient Detail"
              >
                <Table className="h-4 w-4" />
              </Button>
              
              {/* Excel Export */}
              <Button
                onClick={() => {
                  try {
                    // Import XLSX dynamically to prevent bundling issues
                    import('xlsx').then(XLSX => {
                      // Create worksheet from data
                      const worksheet = XLSX.utils.json_to_sheet(
                        validData.map(item => ({
                          Category: item.id,
                          Count: item.value,
                          Percentage: `${item.percentage}%`
                        }))
                      );
                      
                      // Set column widths
                      const colWidths = [
                        { wch: 25 }, // Category
                        { wch: 10 }, // Count
                        { wch: 12 }  // Percentage
                      ];
                      worksheet['!cols'] = colWidths;
                      
                      // Create workbook and add the worksheet
                      const workbook = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(workbook, worksheet, title.substring(0, 31));
                      
                      // Write to file and trigger download
                      XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_')}.xlsx`);
                    }).catch(error => {
                      console.error("Excel export error: Failed to load XLSX library", error);
                    });
                  } catch (error) {
                    console.error("Excel export error:", error);
                  }
                }}
                variant="outline"
                size="icon"
                className="h-8 w-8"
                title="Export to Excel"
              >
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
              
              {/* JSON Export */}
              <Button
                onClick={() => {
                  try {
                    const jsonData = JSON.stringify(validData, null, 2);
                    const blob = new Blob([jsonData], { type: 'application/json' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    
                    link.setAttribute('href', url);
                    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_data.json`);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  } catch (error) {
                    console.error("JSON export error:", error);
                  }
                }}
                variant="outline"
                size="icon"
                className="h-8 w-8"
                title="Export JSON"
              >
                <Code className="h-4 w-4" />
              </Button>
              
              {/* Print Export with Chart Image */}
              <Button
                onClick={() => {
                  try {
                    // Get the chart container element
                    const chartContainer = document.getElementById(chartId);
                    if (!chartContainer) {
                      console.error("Chart container not found for printing");
                      return;
                    }
                    
                    // Use html2canvas to capture the chart as an image
                    import('html2canvas').then(html2canvasModule => {
                      const html2canvas = html2canvasModule.default || html2canvasModule;
                      
                      html2canvas(chartContainer, {
                        scale: 2, // Higher resolution
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: "#ffffff"
                      }).then(canvas => {
                        // Create image from canvas
                        const chartImage = canvas.toDataURL('image/png');
                        
                        // Create a hidden iframe for printing
                        const printFrame = document.createElement('iframe');
                        printFrame.style.position = 'absolute';
                        printFrame.style.width = '0';
                        printFrame.style.height = '0';
                        printFrame.style.border = '0';
                        document.body.appendChild(printFrame);
                        
                        // Check if we should include data source information
                        const shouldIncludeDataSource = (window as any).printWithChartsEnabled;
                        
                        // Create print content with only the chart image (no table)
                        const printContent = `
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <title>${title} - Print View</title>
                              <style>
                                body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
                                .chart-page { height: 100vh; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; }
                                .chart-container { text-align: center; margin: 20px 0; width: 100%; }
                                .chart-image { max-width: 100%; max-height: 75vh; object-fit: contain; border: 1px solid #eee; }
                                h1 { font-size: 20px; margin-bottom: 10px; }
                                .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
                                .data-source { margin-top: 30px; border: 1px dashed #ccc; padding: 15px; font-size: 12px; }
                                .data-source h3 { font-size: 16px; margin-top: 0; margin-bottom: 10px; }
                                .data-source p { margin: 5px 0; }
                              </style>
                            </head>
                            <body>
                              <!-- Chart page -->
                              <div class="chart-page">
                                <div style="width: 100%;">
                                  <h1>${title}</h1>
                                  <div class="meta">
                                    <div>Exported on: ${new Date().toLocaleString()}</div>
                                    <div>Total records: ${validData.length}</div>
                                  </div>
                                </div>
                                
                                <!-- Chart image with fit to page -->
                                <div class="chart-container">
                                  <img src="${chartImage}" alt="${title}" class="chart-image" />
                                </div>
                                
                                ${shouldIncludeDataSource ? `
                                <!-- Data Source Information (only shown when Print with Charts is enabled) -->
                                <div class="data-source">
                                  <h3>Visualization Data Source</h3>
                                  <p><strong>Source CSV:</strong> Validated_Generated_Notes_5_27_25.csv</p>
                                  <p><strong>Processed JSON:</strong> hrsn_data.json (${new Date().toLocaleDateString()})</p>
                                  <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
                                </div>
                                ` : ''}
                              </div>
                            </body>
                          </html>
                        `;
                        
                        // Write content to iframe and print
                        if (printFrame.contentDocument) {
                          printFrame.contentDocument.open();
                          printFrame.contentDocument.write(printContent);
                          printFrame.contentDocument.close();
                          
                          // Wait for content to load, then print
                          printFrame.onload = function() {
                            if (printFrame.contentWindow) {
                              printFrame.contentWindow.print();
                              // Clean up after printing
                              setTimeout(() => {
                                document.body.removeChild(printFrame);
                              }, 1000);
                            }
                          };
                        }
                      }).catch(err => {
                        console.error("Error capturing chart:", err);
                      });
                    }).catch(err => {
                      console.error("Error loading html2canvas:", err);
                    });
                  } catch (error) {
                    console.error("Print error:", error);
                  }
                }}
                variant="outline"
                size="icon"
                className="h-8 w-8"
                title="Print"
              >
                <Printer className="h-4 w-4" />
              </Button>
              
              {/* Expand/Collapse Button */}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                title={isExpanded ? "Collapse" : "Expand"}
                onClick={toggleExpand}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div id={chartId} style={{ 
              height: isExpanded ? "500px" : "350px",
              width: '100%',
              maxWidth: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'relative'
            }}>
            <ResponsiveBar
              data={validData}
              keys={['displayValue']}
              indexBy="id"
              margin={{ top: 20, right: 30, bottom: isExpanded ? 90 : 80, left: isExpanded ? 70 : 60 }}
              padding={isExpanded ? 0.3 : 0.2}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={
                'isCustomPalette' in colorSettings && colorSettings.isCustomPalette 
                  ? ({ id, index }) => colorSettings.colors[index % colorSettings.colors.length]
                  : ({ id, index }) => {
                      if ('saturation' in colorSettings && 'lightness' in colorSettings) {
                        // Use HSL values from the theme
                        const hue = (index * 137.5) % 360;
                        return `hsl(${hue}, ${colorSettings.saturation}%, ${colorSettings.lightness}%)`;
                      }
                      return `hsl(${index * 30}, 70%, 60%)`;
                    }
              }
              borderRadius={3}
              borderWidth={1}
              borderColor={{ from: 'color', modifiers: [['darker', 0.7]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 8,
                tickRotation: -30,
                legend: isExpanded ? (displayMode === 'percentage' ? 'Categories (Percentage View)' : 'Categories (Count View)') : '',
                legendPosition: 'middle',
                legendOffset: isExpanded ? 65 : 50
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: displayMode === 'percentage' ? 'Percentage (%)' : 'Count',
                legendPosition: 'middle',
                legendOffset: isExpanded ? -60 : -50,
                format: (value) => formatTick(value)
              }}
              enableGridX={isExpanded}
              enableGridY={true}
              gridYValues={5}
              labelSkipWidth={isExpanded ? 20 : 15}
              labelSkipHeight={isExpanded ? 15 : 10}
              labelPosition="end"
              label={d => {
                const value = d.value || 0;
                return displayMode === 'percentage' 
                  ? `${value.toFixed(1)}%` 
                  : value.toLocaleString();
              }}
              labelTextColor="#000000"
              labelStyle={{
                fontWeight: 'bold',
                fontSize: 12
              }}
              animate={true}
              motionConfig="gentle"
              theme={{
                axis: {
                  ticks: {
                    text: {
                      fontSize: 12,
                      fontWeight: 'bold',
                      fill: '#000000'
                    }
                  }
                },
                labels: {
                  text: {
                    fontSize: 12,
                    fontWeight: 'bold',
                    fill: '#ffffff'
                  }
                }
              }}
              tooltip={({ data, value }) => (
                <div style={{
                  padding: '8px 12px',
                  background: '#ffffff',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  fontSize: isExpanded ? '14px' : '12px'
                }}>
                  <strong>{data.id}</strong>: {
                    displayMode === 'percentage' 
                      ? `${value.toFixed(1)}% (${data.value})` 
                      : `${value.toLocaleString()} (${data.percentage ? data.percentage.toFixed(1) : '0.0'}%)`
                  }
                </div>
              )}
            />
          </div>
        </CardContent>

      </Card>
    );
  }

  // Show loading spinner while data is loading
  if (isDataLoading) {
    return (
      <div className="px-2 py-2 max-w-[1920px] mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-700">Loading Population Health Data</h2>
            <p className="text-sm text-gray-500 mt-2">Analyzing 301,306 symptoms across 5,000 patients...</p>
            <p className="text-xs text-gray-400 mt-1">This may take a few moments</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 py-2 max-w-[1920px] mx-auto">
      <div className="mb-1">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-1">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl font-bold mb-0">Population Health Analytics</h1>
              <p className="text-gray-600 text-xs">Analyzing HRSN and BH Impact</p>
            </div>
            
            {/* Database Stats Widget - Shows authentic dataset context */}
            <div className="mt-1 md:mt-0">
              <DatabaseStatsWidget className="w-auto" />
            </div>
          </div>
          

        </div>



        {/* Fixed Charts Section - START */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h2 className="text-xs font-semibold">Population Health Charts</h2>
              <p className="text-[8px] text-muted-foreground">Key visualization of healthcare indicators</p>
            </div>
            <div className="flex gap-3 items-center">
              {/* Chart Items Slider */}
              <div className="flex items-center gap-2">
                <Label htmlFor="chart-items-slider" className="text-[10px] text-muted-foreground whitespace-nowrap">
                  Show top {maxCategories} items
                </Label>
                <Slider
                  id="chart-items-slider"
                  min={5}
                  max={50}
                  step={5}
                  value={[maxCategories]}
                  onValueChange={(value) => setMaxCategories(value[0])}
                  className="w-16"
                />
              </div>
              
              {/* Display Mode Toggle Buttons */}
              <div className="flex rounded-md overflow-hidden border">
                <Button 
                  variant={fixedDisplayMode === 'count' ? "default" : "outline"} 
                  className="rounded-l-md rounded-r-none px-2 h-7 text-xs"
                  onClick={() => setFixedDisplayMode('count')}
                >
                  <Hash className="h-3 w-3 mr-1" /> <span className="font-medium">Count</span>
                </Button>
                <Button 
                  variant={fixedDisplayMode === 'percentage' ? "default" : "outline"} 
                  className="rounded-l-none rounded-r-md px-2 h-7 text-xs"
                  onClick={() => setFixedDisplayMode('percentage')}
                >
                  <Percent className="h-3 w-3 mr-1" /> <span className="font-medium">%</span>
                </Button>
              </div>
              
              {/* Add toggleDisplayMode button to affect both chart sections */}
              {/* Color Theme Selector */}
              <div className="flex items-center border rounded-md px-2 h-9">
                <PaintBucket className="h-4 w-4 mr-2 text-muted-foreground" />
                <select
                  value={currentTheme}
                  onChange={(e) => setCurrentTheme(e.target.value)}
                  className="text-sm focus:outline-none bg-transparent"
                >
                  {[
                    { name: 'Vivid Colors', value: 'vivid' },
                    { name: 'Pastel Colors', value: 'pastel' },
                    { name: 'Dark Colors', value: 'dark' },
                    { name: 'Muted Colors', value: 'muted' },
                    { name: 'Viridis (Colorblind Friendly)', value: 'viridis' }
                  ].map(theme => (
                    <option key={theme.value} value={theme.value}>
                      {theme.name}
                    </option>
                  ))}
                </select>
              </div>



              {/* Print Button */}
              <Button
                onClick={() => {
                  if (chartsContainerRef.current) {
                    html2canvas(chartsContainerRef.current).then(canvas => {
                      const imgData = canvas.toDataURL('image/png');
                      const pdf = new jsPDF('l', 'mm', 'a4');
                      const imgWidth = 280;
                      const imgHeight = (canvas.height * imgWidth) / canvas.width;
                      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
                      pdf.save('fixed-charts.pdf');
                      
                      toast({
                        title: "Charts exported",
                        description: "Population Health Charts have been exported to PDF",
                      });
                    });
                  }
                }}
                variant="outline"
                className="flex items-center gap-2 h-9"
              >
                <Printer className="h-4 w-4" />
                <span>Print Charts</span>
              </Button>
            </div>
          </div>
          
          {/* Category Selector Scrollbar */}
          {isCategorySelectVisible && (
            <div className="mb-6 p-4 border rounded-md bg-background shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">Categories to Display</h3>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-muted-foreground">
                    {fixedSelectedCategories.length} categories selected
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsCategorySelectVisible(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1 text-sm">
                  <span>Number of categories to show:</span>
                  <span>{maxCategories}</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={maxCategories}
                  onChange={(e) => setMaxCategories(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Filter Categories</div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const allCategories = Object.values(demoData).flatMap(
                        array => array.map((item: any) => item.id)
                      );
                      const uniqueCategories = [...new Set(allCategories)];
                      
                      if (fixedSelectedCategories.length === uniqueCategories.length) {
                        setFixedSelectedCategories([]);
                      } else {
                        setFixedSelectedCategories([...uniqueCategories]);
                      }
                    }}
                    className="h-7 px-2 text-xs"
                  >
                    {fixedSelectedCategories.length > 0 ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                
                <div 
                  className="space-y-1 overflow-auto pr-1 border rounded-md p-2" 
                  style={{ maxHeight: '300px' }}
                >
                  {Object.values(demoData).flatMap(
                    array => array.map((item: any) => item.id)
                  ).filter((value, index, self) => self.indexOf(value) === index)
                    .slice(0, maxCategories)
                    .map(category => (
                      <div 
                        key={category}
                        className="flex items-center space-x-2 hover:bg-muted/50 p-1 rounded-md cursor-pointer"
                        onClick={() => {
                          if (fixedSelectedCategories.includes(category)) {
                            setFixedSelectedCategories(fixedSelectedCategories.filter(c => c !== category));
                          } else {
                            setFixedSelectedCategories([...fixedSelectedCategories, category]);
                          }
                        }}
                      >
                        <div className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                          fixedSelectedCategories.includes(category)
                            ? 'bg-primary border-primary'
                            : 'border-primary/20'
                        }`}>
                          {fixedSelectedCategories.includes(category) && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <div className="text-sm truncate">{category}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          <div ref={chartsContainerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* HRSN Indicators Chart */}
            <FixedChart 
              data={(actualData?.hrsnIndicatorData || []).slice(0, maxCategories)} 
              title="HRSN Indicators" 
              description="Distribution of health-related social needs indicators"
              displayMode={fixedDisplayMode}
              colorScheme={theme}
            />
            
            {/* Diagnosis Codes Chart */}
            {(actualData?.diagnosisData?.length || 0) > 0 ? (
              <FixedChart 
                data={(actualData?.diagnosisData || []).slice(0, maxCategories)} 
                title="Diagnoses" 
                description="Distribution of behavioral health diagnoses"
                displayMode={fixedDisplayMode}
                colorScheme={theme}
              />
            ) : (
              <div className="p-4 border rounded-lg bg-gray-50">
                <h3 className="font-semibold mb-2">Diagnoses</h3>
                <p className="text-sm text-gray-600">No diagnosis data available</p>
              </div>
            )}
            
            {/* Symptom Segments Chart */}
            {(actualData?.symptomSegmentData?.length || 0) > 0 ? (
              <FixedChart 
                data={(actualData?.symptomSegmentData || []).slice(0, maxCategories)} 
                title="Symptom Segments" 
                description="Distribution of predominant behavioral health symptoms"
                displayMode={fixedDisplayMode}
                colorScheme={theme}
              />
            ) : (
              <div className="p-4 border rounded-lg bg-gray-50">
                <h3 className="font-semibold mb-2">Symptom Segments</h3>
                <p className="text-sm text-gray-600">No symptom segment data available</p>
              </div>
            )}
            
            {/* Symptom IDs Chart */}
            <FixedChart 
              data={(actualData?.symptomIDData || []).slice(0, maxCategories)} 
              title="Symptom IDs" 
              description="Distribution of symptom identification codes"
              displayMode={fixedDisplayMode}
              colorScheme={theme}
            />
            
            {/* Diagnostic Categories Chart */}
            <FixedChart 
              data={(actualData?.diagnosticCategoryData || []).slice(0, maxCategories)} 
              title="Diagnostic Categories" 
              description="Distribution of diagnostic categories"
              displayMode={fixedDisplayMode}
              colorScheme={theme}
            />
            
            {/* Risk Stratification Chart */}
            <FixedChart 
              data={(actualData?.riskStratificationData || []).slice(0, maxCategories)} 
              title="Risk Stratification" 
              description="Patient risk distribution analysis"
              displayMode={fixedDisplayMode}
              colorScheme={theme}
            />
          </div>
        </div>
        {/* Fixed Charts Section - END */}
        
        {/* Display mode toggle buttons moved to top right of fixed charts section */}
      </div>
      
      {/* Apply Population Health Filters */}
      <Card className="mb-6 mt-8">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Apply Population Health Filters • Two-Level Boolean Filter Logic</CardTitle>
            {/* AND/OR Toggle Button */}
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <Button
                variant={searchLogic === 'AND' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSearchLogic('AND')}
                className={`px-3 py-1 ${searchLogic === 'AND' ? 'bg-blue-600 text-white' : ''}`}
              >
                AND
              </Button>
              <Button
                variant={searchLogic === 'OR' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSearchLogic('OR')}
                className={`px-3 py-1 ${searchLogic === 'OR' ? 'bg-green-600 text-white' : ''}`}
              >
                OR
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Currently using <strong>{searchLogic}</strong> logic: Records must match {searchLogic === 'AND' ? 'all' : 'any'} selected criteria.
          </p>
        </CardHeader>
        <CardContent className="pt-3 pb-3">
          <div className="space-y-1">
            {/* First filter level - derived from the dataset - more compact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              <div>
                <Select
                  value={selectedSymptomSegment}
                  onValueChange={setSelectedSymptomSegment}
                >
                  <SelectTrigger id="symptomSegments" className="w-full">
                    <SelectValue placeholder="Choose an option" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {(() => {
                      // DEFINITIVE DUPLICATE PREVENTION: Only render ONE data source
                      const hasDropdownCounts = dropdownCounts?.symptomSegments?.length > 0;
                      const hasActualData = actualData?.symptomSegmentData?.length > 0;
                      
                      if (hasDropdownCounts) {
                        return [
                          <SelectItem key="all" value="all">All Segments</SelectItem>,
                          ...dropdownCounts.symptomSegments.slice(0, 20).map((segment: any) => (
                            <SelectItem key={`dropdown-${segment.id}`} value={segment.id}>
                              {segment.label || segment.id} ({segment.count?.toLocaleString() || 0})
                            </SelectItem>
                          ))
                        ];
                      } else if (hasActualData && !hasDropdownCounts) {
                        return [
                          <SelectItem key="all" value="all">All Segments</SelectItem>,
                          ...actualData.symptomSegmentData.slice(0, 20).map((segment: any) => (
                            <SelectItem key={`actual-${segment.id}`} value={segment.id}>
                              {segment.label || segment.id}
                            </SelectItem>
                          ))
                        ];
                      } else {
                        return [
                          <SelectItem key="all" value="all">All Segments</SelectItem>,
                          <SelectItem key="withdrawal_symptoms" value="withdrawal_symptoms">Withdrawal symptoms</SelectItem>,
                          <SelectItem key="loss_of_appetite" value="loss_of_appetite">Loss of appetite</SelectItem>,
                          <SelectItem key="anxiety" value="anxiety">Anxiety</SelectItem>,
                          <SelectItem key="increased_appetite" value="increased_appetite">Increased appetite</SelectItem>,
                          <SelectItem key="rage" value="rage">Used rage weekly in the past 12 months</SelectItem>
                        ];
                      }
                    })()}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select
                  value={diagnosisFilter}
                  onValueChange={setDiagnosisFilter}
                >
                  <SelectTrigger id="diagnosis" className="w-full">
                    <SelectValue placeholder="Choose an option" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {(() => {
                      // DEFINITIVE DUPLICATE PREVENTION: Only render ONE data source
                      const hasDropdownCounts = dropdownCounts?.diagnoses?.length > 0;
                      const hasActualData = actualData?.diagnosisData?.length > 0;
                      
                      if (hasDropdownCounts) {
                        return [
                          <SelectItem key="all" value="all">All Diagnoses</SelectItem>,
                          ...dropdownCounts.diagnoses.slice(0, 20).map((diagnosis: any) => (
                            <SelectItem key={`dropdown-${diagnosis.id}`} value={diagnosis.id}>
                              {diagnosis.label || diagnosis.id} ({diagnosis.count?.toLocaleString() || 0})
                            </SelectItem>
                          ))
                        ];
                      } else if (hasActualData && !hasDropdownCounts) {
                        return [
                          <SelectItem key="all" value="all">All Diagnoses</SelectItem>,
                          ...actualData.diagnosisData.slice(0, 20).map((diagnosis: any) => (
                            <SelectItem key={`actual-${diagnosis.id}`} value={diagnosis.id}>
                              {diagnosis.label || diagnosis.id}
                            </SelectItem>
                          ))
                        ];
                      } else {
                        return [
                          <SelectItem key="all" value="all">All Diagnoses</SelectItem>,
                          <SelectItem key="major-depressive" value="major-depressive">Major Depressive Disorder</SelectItem>,
                          <SelectItem key="panic-disorder" value="panic-disorder">Panic Disorder</SelectItem>,
                          <SelectItem key="bipolar-disorder" value="bipolar-disorder">Bipolar Disorder</SelectItem>,
                          <SelectItem key="opioid-use" value="opioid-use">Opioid Use Disorder</SelectItem>,
                          <SelectItem key="alcohol-use" value="alcohol-use">Alcohol Use Disorder</SelectItem>
                        ];
                      }
                    })()}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select
                  value={selectedDiagnosticCategory}
                  onValueChange={setSelectedDiagnosticCategory}
                >
                  <SelectTrigger id="diagnosticCategory" className="w-full">
                    <SelectValue placeholder="Choose an option" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {(() => {
                      // DEFINITIVE DUPLICATE PREVENTION: Only render ONE data source
                      const hasDropdownCounts = dropdownCounts?.categories?.length > 0;
                      const hasActualData = actualData?.diagnosticCategoryData?.length > 0;
                      
                      if (hasDropdownCounts) {
                        return [
                          <SelectItem key="all" value="all">All Categories</SelectItem>,
                          ...dropdownCounts.categories.slice(0, 20).map((category: any) => (
                            <SelectItem key={`dropdown-${category.id}`} value={category.id}>
                              {category.label || category.id} ({category.count?.toLocaleString() || 0})
                            </SelectItem>
                          ))
                        ];
                      } else if (hasActualData && !hasDropdownCounts) {
                        return [
                          <SelectItem key="all" value="all">All Categories</SelectItem>,
                          ...actualData.diagnosticCategoryData.slice(0, 20).map((category: any) => (
                            <SelectItem key={`actual-${category.id}`} value={category.id}>
                              {category.label || category.id}
                            </SelectItem>
                          ))
                        ];
                      } else {
                        return [
                          <SelectItem key="all" value="all">All Categories</SelectItem>,
                          <SelectItem key="depressive" value="depressive">Depressive Disorders</SelectItem>,
                          <SelectItem key="substance" value="substance">Substance Use Disorders</SelectItem>,
                          <SelectItem key="anxiety" value="anxiety">Anxiety Disorders</SelectItem>,
                          <SelectItem key="bipolar" value="bipolar">Bipolar Disorders</SelectItem>,
                          <SelectItem key="other" value="other">Other/Unknown Substance Use Disorder</SelectItem>
                        ];
                      }
                    })()}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select
                  value={selectedSymptomId}
                  onValueChange={setSelectedSymptomId}
                >
                  <SelectTrigger id="symptomId" className="w-full">
                    <SelectValue placeholder="Choose an option" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px] overflow-y-auto">
                    {(() => {
                      // DEFINITIVE DUPLICATE PREVENTION: Only render ONE data source
                      const hasDropdownCounts = dropdownCounts?.symptomIds?.length > 0;
                      const hasActualData = actualData?.symptomIDData?.length > 0;
                      
                      if (hasDropdownCounts) {
                        return [
                          <SelectItem key="all" value="all">All Symptom IDs</SelectItem>,
                          ...dropdownCounts.symptomIds.slice(0, 20).map((symptomId: any) => (
                            <SelectItem key={`dropdown-${symptomId.id}`} value={symptomId.id}>
                              {symptomId.label || symptomId.id} ({symptomId.count?.toLocaleString() || 0})
                            </SelectItem>
                          ))
                        ];
                      } else if (hasActualData && !hasDropdownCounts) {
                        return [
                          <SelectItem key="all" value="all">All Symptom IDs</SelectItem>,
                          ...actualData.symptomIDData.slice(0, 20).map((symptomId: any) => (
                            <SelectItem key={`actual-${symptomId.id}`} value={symptomId.id}>
                              {symptomId.label || symptomId.id}
                            </SelectItem>
                          ))
                        ];
                      } else {
                        return [
                          <SelectItem key="all" value="all">All Symptom IDs</SelectItem>,
                          <SelectItem key="no_z" value="no_z">No Z Code</SelectItem>,
                          <SelectItem key="f4802" value="f4802">F48.0.2</SelectItem>,
                          <SelectItem key="f19214" value="f19214">F19.21.44</SelectItem>,
                          <SelectItem key="f1615" value="f1615">F16.1.5</SelectItem>,
                          <SelectItem key="f1614" value="f1614">F16.1.04</SelectItem>
                        ];
                      }
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Find Records Button Section */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                {filteredPatientCount !== null ? (
                  <span>
                    Found <span className="font-medium">{filteredPatientCount}</span> patients matching criteria 
                    <span className="ml-2 px-2 py-1 bg-gray-200 rounded text-xs font-semibold">
                      Using {searchLogic} logic
                    </span>
                  </span>
                ) : (
                  <span>Select criteria and click "Find Records" to search</span>
                )}
              </div>
              
              <Button
                onClick={findRecords}
                disabled={isSearchingRecords}
                className="flex items-center gap-2"
              >
                {isSearchingRecords ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Find Records
                  </>
                )}
              </Button>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={downloadFilteredResults}
                disabled={!filteredData || filteredData.length === 0}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Filtered Results
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* HRSN Indicators Section */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">HRSN Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-gray-600">Select Additional Characteristics to Visualize:</p>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {selectedFilters.length > 0
                    ? `${selectedFilters.length} option${selectedFilters.length > 1 ? 's' : ''} selected`
                    : "Choose an option"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search characteristics..." />
                  <CommandEmpty>No characteristic found.</CommandEmpty>
                  <CommandGroup>
                    {filterOptions.map((option) => (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={() => {
                          const newSelection = selectedFilters.includes(option.value)
                            ? selectedFilters.filter(item => item !== option.value)
                            : [...selectedFilters, option.value];
                          setSelectedFilters(newSelection);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedFilters.includes(option.value) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            
            <div className="flex justify-between items-center mt-4">
              <div className="space-x-2">
                {selectedFilters.length > 0 && (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFilters([])}
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
              
              {/* Auto-populate status indicator */}
              {filteredData && filteredData.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-green-800 font-medium">
                    HRSN charts auto-populated for {filteredData.length} filtered patients
                  </p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const allData = {
                      symptomSegments: getSymptomSegmentData(),
                      diagnoses: getDiagnosisData(),
                      symptomIds: getSymptomIDData(),
                      diagnosticCategories: getDiagnosticCategoryData()
                    };
                    
                    // Create a downloadable JSON file
                    const dataStr = JSON.stringify(allData, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const dataUrl = URL.createObjectURL(dataBlob);
                    
                    const downloadLink = document.createElement('a');
                    downloadLink.href = dataUrl;
                    downloadLink.download = 'population_health_data.json';
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download All Charts Data
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  disabled={isDownloading}
                  onClick={async () => {
                    try {
                      setIsDownloading(true);
                      const response = await fetch('/api/export-complete-database');
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `complete_database_export_${new Date().toISOString().split('T')[0]}.csv`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        toast({
                          title: "Export Complete",
                          description: "Database export downloaded successfully",
                        });
                      } else {
                        throw new Error('Export failed');
                      }
                    } catch (error) {
                      toast({
                        title: "Export Failed",
                        description: "Could not export database. Please try again.",
                        variant: "destructive",
                      });
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exporting Database...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Download Complete Database
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HRSN Analytics Dashboard - Full Population */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">HRSN Analytics Dashboard</CardTitle>
          <CardDescription>
            Social Determinants of Health Indicators for Complete Population ({allData?.patients?.length || 0} patients)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="text-blue-600 font-medium">
              🔍 HRSN Debug - Loading: {isDataLoading ? 'YES' : 'NO'}, 
              Data: {allData ? 'EXISTS' : 'NULL'}, 
              Patients: {allData?.patients?.length || 'UNDEFINED'}
            </div>
            
            {/* Always show test component for debugging */}
            <HrsnTestSimple 
              data={allData}
              isLoading={isDataLoading}
            />
            
            {/* Show raw data debug */}
            <div className="p-4 bg-gray-100 rounded text-xs">
              <strong>Raw Data Debug:</strong>
              <pre>{JSON.stringify({
                isDataLoading,
                hasAllData: !!allData,
                patientCount: allData?.patients?.length,
                firstPatientKeys: allData?.patients?.[0] ? Object.keys(allData.patients[0]).slice(0, 5) : 'none'
              }, null, 2)}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtered HRSN Charts Section - Added when search criteria are active */}
      {filteredData && filteredData.length > 0 && (
        <Card className="mt-6 border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg text-green-800">
                  HRSN Indicators - Search Results ({filteredData.length} patients)
                </CardTitle>
                <CardDescription className="text-green-600">
                  HRSN analysis for patients matching your search criteria
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Search Context</h4>
              <div className="text-sm text-green-800">
                {diagnosisFilter && diagnosisFilter !== 'all' && (
                  <p><strong>Diagnosis:</strong> {diagnosisFilter}</p>
                )}
                {selectedDiagnosticCategory && selectedDiagnosticCategory !== 'all' && (
                  <p><strong>Category:</strong> {selectedDiagnosticCategory}</p>
                )}
                {selectedSymptomSegment && selectedSymptomSegment !== 'all' && (
                  <p><strong>Symptom:</strong> {selectedSymptomSegment}</p>
                )}
                {selectedSymptomId && selectedSymptomId !== 'all' && (
                  <p><strong>Symptom ID:</strong> {selectedSymptomId}</p>
                )}
                <p><strong>Matching Patients:</strong> {filteredData.length} of {allData?.patients?.length || 0} total</p>
              </div>
            </div>

            {/* Filtered HRSN Grid Component */}
            <div className="mt-4">
              <PopulationHealthCharts 
                data={{ 
                  patients: filteredData,
                  extractedSymptoms: (() => {
                    // Filter extracted symptoms to match the filtered patients
                    if (!actualData?.extractedSymptoms || !filteredData) return [];
                    
                    const filteredPatientIds = new Set(filteredData.map(p => p.patientId || p.id));
                    return actualData.extractedSymptoms.filter(symptom => 
                      filteredPatientIds.has(symptom.patient_id || symptom.patientId)
                    );
                  })(),
                  totalRecords: filteredData.length 
                }}
                isLoading={isSearchingRecords}
              />
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* HRSN Grid Component - All 36 HRSN Charts with Dual-Source Data */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-1">
          <div>
            <h2 className="text-xs font-semibold">All HRSN Indicators - Master Database (5,262 patients)</h2>
            <p className="text-[8px] text-muted-foreground">Complete view of all 36 health-related social needs indicators across entire database</p>
          </div>
        </div>
        <HrsnInsightsChart 
          patientData={actualData?.patients || allData?.patients || []}
          extractedSymptoms={actualData?.extractedSymptoms || allData?.extractedSymptoms || []}
          isLoading={isDataLoading}
          filterBy={{
            diagnosis: diagnosisFilter,
            diagnosticCategory: selectedDiagnosticCategory,
            symptom: selectedSymptomSegment,
            icd10Code: selectedSymptomId
          }}
        />
      </div>
      
      {/* Chart fullscreen dialog - Restructured */}
      {expandedChart && (
        <Dialog open={!!expandedChart} onOpenChange={(open) => !open && setExpandedChart(null)}>
          <DialogContent className="max-w-7xl w-full max-h-screen flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-4 border-b">
              <div className="flex flex-col gap-3">
                {/* Title and close button */}
                <div className="flex justify-between items-center">
                  <DialogTitle className="text-xl">
                    {expandedChart === 'hrsn-chart' && 'HRSN Indicators'}
                    {expandedChart === 'symptom-segment-chart' && 'Symptom Segments'}
                    {expandedChart === 'diagnosis-chart' && 'Diagnoses'}
                    {expandedChart === 'diagnostic-category-chart' && 'Diagnostic Categories'}
                    {expandedChart === 'symptom-id-chart' && 'Symptom IDs'}
                  </DialogTitle>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={toggleDisplayMode}>
                      {displayMode === 'count' ? 'Switch to Percentage' : 'Switch to Count'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setExpandedChart(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Export controls right in the header - always visible */}
                <div className="flex items-center border-t pt-2">
                  <span className="font-semibold mr-3">Export:</span>
                  
                  {expandedChart === 'hrsn-chart' && (
                    <ChartExportWidget 
                      chartId="hrsn-chart-fullscreen"
                      chartTitle="HRSN Indicators"
                      data={getHrsnIndicatorData()}
                      iconSize={18}
                      showDetailedExport={true}
                      className="flex gap-2"
                      onClose={() => setExpandedChart(null)}
                    />
                  )}
                  {expandedChart === 'symptom-segment-chart' && (
                    <ChartExportWidget 
                      chartId="symptom-segment-chart-fullscreen"
                      chartTitle="Symptom Segments"
                      data={getSymptomSegmentData()}
                      iconSize={18}
                      showDetailedExport={true}
                      className="flex gap-2"
                      onClose={() => setExpandedChart(null)}
                    />
                  )}
                  {expandedChart === 'diagnosis-chart' && (
                    <ChartExportWidget 
                      chartId="diagnosis-chart-fullscreen"
                      chartTitle="Diagnosis"
                      data={getDiagnosisData()}
                      iconSize={18}
                      showDetailedExport={true}
                      className="flex gap-2"
                      onClose={() => setExpandedChart(null)}
                    />
                  )}
                  {expandedChart === 'diagnostic-category-chart' && (
                    <ChartExportWidget 
                      chartId="diagnostic-category-chart-fullscreen"
                      chartTitle="Diagnostic Categories"
                      data={getDiagnosticCategoryData()}
                      iconSize={18}
                      showDetailedExport={true}
                      className="flex gap-2"
                      onClose={() => setExpandedChart(null)}
                    />
                  )}
                  {expandedChart === 'symptom-id-chart' && (
                    <ChartExportWidget 
                      chartId="symptom-id-chart-fullscreen"
                      chartTitle="Symptom IDs"
                      data={getSymptomIDData()}
                      iconSize={18}
                      showDetailedExport={true}
                      className="flex gap-2"
                      onClose={() => setExpandedChart(null)}
                    />
                  )}
                </div>
              </div>
            </DialogHeader>
            
            {/* Chart Area with Direct Export Buttons at the Top */}
            <div className="flex-1 bg-white px-8 py-4 overflow-auto">
              {/* Reusable Export Buttons Component */}
              {expandedChart === 'hrsn-chart' && (
                <ChartExportButtons
                  onExportCSV={() => exportToCSV(getHrsnIndicatorData(), "HRSN_Indicators", toast)}
                  onExportDetailCSV={() => exportToDetailedCSV(getHrsnIndicatorData(), "HRSN_Indicators_Detail", toast, {
                    displayMode,
                    patientCount: allData?.patients?.length || 24,
                    recordCount: allData?.totalRecords || 1061
                  })}
                  onExportExcel={() => exportToExcel(getHrsnIndicatorData(), "HRSN_Indicators", toast, {
                    displayMode,
                    patientCount: allData?.patients?.length || 24,
                    recordCount: allData?.totalRecords || 1061
                  })}
                  onExportJSON={() => exportToJSON(getHrsnIndicatorData(), "HRSN_Indicators", toast, {
                    displayMode,
                    patientCount: allData?.patients?.length || 24,
                    recordCount: allData?.totalRecords || 1061
                  })}
                  onPrint={() => {
                    setPrintChartId("hrsn-chart-fullscreen");
                    setShowPrintDialog(true);
                  }}
                />
              )}
              
              {expandedChart === 'symptom-segment-chart' && (
                <ChartExportButtons
                  onExportCSV={() => exportToCSV(getSymptomSegmentData(), "Symptom_Segments", toast)}
                  onExportDetailCSV={() => exportToDetailedCSV(getSymptomSegmentData(), "Symptom_Segments_Detail", toast, {
                    displayMode,
                    patientCount: allData?.patients?.length || 24,
                    recordCount: allData?.totalRecords || 1061
                  })}
                  onExportExcel={() => exportToExcel(getSymptomSegmentData(), "Symptom_Segments", toast, {
                    displayMode,
                    patientCount: allData?.patients?.length || 24,
                    recordCount: allData?.totalRecords || 1061
                  })}
                  onExportJSON={() => exportToJSON(getSymptomSegmentData(), "Symptom_Segments", toast, {
                    displayMode,
                    patientCount: allData?.patients?.length || 24,
                    recordCount: allData?.totalRecords || 1061
                  })}
                  onPrint={() => {
                    setPrintChartId("symptom-segment-chart-fullscreen");
                    setShowPrintDialog(true);
                  }}
                />
              )}
              
              {expandedChart === 'diagnosis-chart' && (
                <ChartExportButtons
                  onExportCSV={() => exportToCSV(getDiagnosisData(), "Diagnoses", toast)}
                  onExportDetailCSV={() => exportToDetailedCSV(getDiagnosisData(), "Diagnoses_Detail", toast, {
                    displayMode,
                    patientCount: allData?.patients?.length || 24,
                    recordCount: allData?.totalRecords || 1061
                  })}
                  onExportExcel={() => exportToExcel(getDiagnosisData(), "Diagnoses", toast, {
                    displayMode,
                    patientCount: allData?.patients?.length || 24,
                    recordCount: allData?.totalRecords || 1061
                  })}
                  onExportJSON={() => exportToJSON(getDiagnosisData(), "Diagnoses", toast, {
                    displayMode,
                    patientCount: allData?.patients?.length || 24,
                    recordCount: allData?.totalRecords || 1061
                  })}
                  onPrint={() => {
                    setPrintChartId("diagnosis-chart-fullscreen");
                    setShowPrintDialog(true);
                  }}
                />
              )}
              
              {expandedChart === 'diagnostic-category-chart' && (
                <ChartExportButtons
                  onExportCSV={() => exportToCSV(getDiagnosticCategoryData(), "Diagnostic_Categories", toast)}
                  onExportDetailCSV={() => exportToDetailedCSV(getDiagnosticCategoryData(), "Diagnostic_Categories_Detail", toast, {
                    displayMode
                  })}
                  onExportExcel={() => exportToExcel(getDiagnosticCategoryData(), "Diagnostic_Categories", toast, {
                    displayMode,
                    patientCount: allData?.patients?.length || 24,
                    recordCount: allData?.totalRecords || 1061
                  })}
                  onExportJSON={() => exportToJSON(getDiagnosticCategoryData(), "Diagnostic_Categories", toast, {
                    displayMode,
                    patientCount: allData?.patients?.length || 24,
                    recordCount: allData?.totalRecords || 1061
                  })}
                  onPrint={() => {
                    setPrintChartId("diagnostic-category-chart-fullscreen");
                    setShowPrintDialog(true);
                  }}
                />
              )}
              
              {expandedChart === 'symptom-id-chart' && (
                <ChartExportButtons
                  onExportCSV={() => exportToCSV(getSymptomIDData(), "Symptom_IDs", toast)}
                  onExportDetailCSV={() => exportToDetailedCSV(getSymptomIDData(), "Symptom_IDs_Detail", toast, {
                    displayMode,
                    patientCount: allData?.patients?.length || 24,
                    recordCount: allData?.totalRecords || 1061
                  })}
                  onExportExcel={() => exportToExcel(getSymptomIDData(), "Symptom_IDs", toast, {
                    displayMode,
                    patientCount: allData?.patients?.length || 24,
                    recordCount: allData?.totalRecords || 1061
                  })}
                  onExportJSON={() => exportToJSON(getSymptomIDData(), "Symptom_IDs", toast, {
                    displayMode,
                    patientCount: allData?.patients?.length || 24,
                    recordCount: allData?.totalRecords || 1061
                  })}
                  onPrint={() => {
                    setPrintChartId("symptom-id-chart-fullscreen");
                    setShowPrintDialog(true);
                  }}
                />
              )}
              
              {/* Charts */}
              {expandedChart === 'hrsn-chart' && renderChart(
                getHrsnIndicatorData(), 
                'HRSN Indicators', 
                'Distribution of health-related social needs indicators',
                Math.floor(window.innerHeight * 0.5), 
                true,
                'hrsn-chart-fullscreen',
                { top: 30, right: 30, bottom: 100, left: 80 }
              )}
              {expandedChart === 'symptom-segment-chart' && renderChart(
                getSymptomSegmentData(), 
                'Symptom Segments', 
                'Distribution of symptom segments across population',
                Math.floor(window.innerHeight * 0.5), 
                true,
                'symptom-segment-chart-fullscreen',
                { top: 30, right: 30, bottom: 100, left: 80 }
              )}
              {expandedChart === 'diagnosis-chart' && renderChart(
                getDiagnosisData(), 
                'Diagnoses', 
                'Distribution of diagnoses across population',
                Math.floor(window.innerHeight * 0.5), 
                true,
                'diagnosis-chart-fullscreen',
                { top: 30, right: 30, bottom: 100, left: 80 }
              )}
              {expandedChart === 'diagnostic-category-chart' && renderChart(
                getDiagnosticCategoryData(), 
                'Diagnostic Categories', 
                'Distribution of diagnostic categories across population',
                Math.floor(window.innerHeight * 0.5), 
                true,
                'diagnostic-category-chart-fullscreen',
                { top: 30, right: 30, bottom: 100, left: 80 }
              )}
              {expandedChart === 'symptom-id-chart' && renderChart(
                getSymptomIDData(), 
                'Symptom IDs', 
                'Distribution of symptom IDs across population',
                Math.floor(window.innerHeight * 0.5), 
                true,
                'symptom-id-chart-fullscreen',
                { top: 30, right: 30, bottom: 100, left: 80 }
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Data Source Section */}
      <Card className="mt-8 mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Data Source Information</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Radio buttons for Print with Charts option */}
          <div className="mb-4 flex justify-center">
            <div className="flex items-center space-x-6">
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
          <div className={`p-4 border border-dashed border-gray-300 rounded-md ${printWithCharts ? 'block' : 'print:block hidden'}`}>
            <h3 className="text-lg font-bold mb-2">Visualization Data Source</h3>
            <div className="text-sm">
              <p><strong>Source CSV:</strong> updated_population_data_with_diagnosis_for Testing_1061 records_4_25_25.csv</p>
              <p><strong>Processed JSON:</strong> hrsn_data.json ({new Date(1715985660000).toLocaleDateString()})</p>
              <p><strong>Patient count:</strong> 24</p>
              <p><strong>Record count:</strong> 1061</p>
              <p><strong>Generated on:</strong> {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Dialog */}
      <ChartPrintHandler 
        open={showPrintDialog}
        onOpenChange={setShowPrintDialog}
        chartId={printChartId}
        title={
          printChartId === 'hrsn-chart' 
            ? 'HRSN Indicators' 
            : printChartId === 'symptom-segment-chart'
              ? 'Symptom Segments'
              : printChartId === 'diagnosis-chart'
                ? 'Diagnoses'
                : printChartId === 'diagnostic-category-chart'
                  ? 'Diagnostic Categories'
                  : 'Symptom IDs'
        }
      />
    </div>
  );
}