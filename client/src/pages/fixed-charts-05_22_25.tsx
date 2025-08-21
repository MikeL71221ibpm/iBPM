// Fixed Charts Page - May 22, 2025
// This page shows all charts with proper percentage display, unified toggle, and category filtering

import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, Percent, Hash, Printer, LineChart, PaintBucket, 
  Maximize2, FileText, Code, Table, X, Check, Filter, ListFilter
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { ResponsiveBar } from '@nivo/bar';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useToast } from "@/hooks/use-toast";
import { useChartTheme } from "@/context/ChartThemeContext";
import ChartExportWidget from "@/components/chart-export-widget";

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

export default function FixedCharts05_22_25() {
  const [chartData, setChartData] = useState<any>({});
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>('count');
  const chartsContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { currentTheme, setCurrentTheme, colorSettings, theme } = useChartTheme();
  
  // Single category selection for all charts
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [maxCategories, setMaxCategories] = useState<number>(10);
  const [isCategorySelectVisible, setIsCategorySelectVisible] = useState<boolean>(false);
  const [categoryWidgetPosition, setCategoryWidgetPosition] = useState({ x: 20, y: 140 });
  
  // Get all unique categories across all chart types
  const getAllCategories = useCallback(() => {
    const allCategories: string[] = [];
    
    // Collect all category IDs from all charts
    if (chartData?.hrsnIndicators) {
      chartData.hrsnIndicators.forEach((item: any) => {
        if (!allCategories.includes(item.id)) allCategories.push(item.id);
      });
    }
    
    if (chartData?.diagnosisCodes) {
      chartData.diagnosisCodes.forEach((item: any) => {
        if (!allCategories.includes(item.id)) allCategories.push(item.id);
      });
    }
    
    if (chartData?.symptomSegments) {
      chartData.symptomSegments.forEach((item: any) => {
        if (!allCategories.includes(item.id)) allCategories.push(item.id);
      });
    }
    
    if (chartData?.symptomIDs) {
      chartData.symptomIDs.forEach((item: any) => {
        if (!allCategories.includes(item.id)) allCategories.push(item.id);
      });
    }
    
    if (chartData?.diagnosticCategories) {
      chartData.diagnosticCategories.forEach((item: any) => {
        if (!allCategories.includes(item.id)) allCategories.push(item.id);
      });
    }
    
    if (chartData?.riskStratifications) {
      chartData.riskStratifications.forEach((item: any) => {
        if (!allCategories.includes(item.id)) allCategories.push(item.id);
      });
    }
    
    return allCategories;
  }, [chartData]);
  
  // Initialize category selections with useEffect
  useEffect(() => {
    // Load demo data
    setChartData(demoData);
    
    // Initialize all categories
    setSelectedCategories(getAllCategories());
  }, []);
  
  // All categories across all charts
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [displayedCategories, setDisplayedCategories] = useState<string[]>([]);
  const [maxCategoriesToShow, setMaxCategoriesToShow] = useState<number>(10);
  const [showCategoryScrollbar, setShowCategoryScrollbar] = useState<boolean>(false);
  
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

  // Initialize with demo data immediately - no API call needed
  useEffect(() => {
    setChartData(demoData);
  }, []);

  // The demo data already has appropriate percentage values, so no processing needed

  // Set display mode directly
  const handleDisplayModeChange = (mode: 'count' | 'percentage') => {
    setDisplayMode(mode);
  };

  // Handle printing all charts
  const handlePrintCharts = async () => {
    if (!chartsContainerRef.current) return;
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const canvas = await html2canvas(chartsContainerRef.current);
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add title
      pdf.setFontSize(16);
      pdf.text('Population Health Charts', 105, 10, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text(`Display Mode: ${displayMode === 'count' ? 'Count Values' : 'Percentage Values'}`, 105, 20, { align: 'center' });
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 28, { align: 'center' });
      
      // Add image
      position = 35; // Start after the title
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - position);
      
      // Add new pages if the content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save('population-health-charts.pdf');
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Sample data for testing
  const sampleData = [
    { id: 'Housing', value: 120, percentage: 25 },
    { id: 'Food', value: 98, percentage: 20 },
    { id: 'Transportation', value: 86, percentage: 18 },
    { id: 'Utilities', value: 65, percentage: 14 },
    { id: 'Medication', value: 45, percentage: 9 },
    { id: 'Other', value: 67, percentage: 14 },
  ];

  // Format values based on display mode
  const formatValue = (value: number) => {
    if (displayMode === 'percentage') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  // No loading or error states needed - we're using reliable demo data

  // Theme options dropdown
  const themeOptions = [
    { name: 'Vivid Colors', value: 'vivid' },
    { name: 'Pastel Colors', value: 'pastel' },
    { name: 'Dark Colors', value: 'dark' },
    { name: 'Muted Colors', value: 'muted' },
    { name: 'Viridis (Colorblind Friendly)', value: 'viridis' }
  ];

  return (
    <div className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Population Health Charts</h1>
          <p className="text-sm text-muted-foreground">Interactive visualization of healthcare indicators</p>
        </div>
        <div className="flex gap-3 items-center">
          {/* Display Mode Toggle Buttons */}
          <div className="flex rounded-md overflow-hidden border">
            <Button 
              variant={displayMode === 'count' ? "default" : "outline"} 
              className="rounded-l-md rounded-r-none px-3 h-9"
              onClick={() => handleDisplayModeChange('count')}
            >
              <Hash className="h-4 w-4 mr-1" /> <span className="font-medium">Count</span>
            </Button>
            <Button 
              variant={displayMode === 'percentage' ? "default" : "outline"} 
              className="rounded-l-none rounded-r-md px-3 h-9"
              onClick={() => handleDisplayModeChange('percentage')}
            >
              <Percent className="h-4 w-4 mr-1" /> <span className="font-medium">%</span>
            </Button>
          </div>

          {/* Color Theme Selector */}
          <div className="flex items-center border rounded-md px-2 h-9">
            <PaintBucket className="h-4 w-4 mr-2 text-muted-foreground" />
            <select
              value={currentTheme}
              onChange={(e) => setCurrentTheme(e.target.value as any)}
              className="text-sm focus:outline-none bg-transparent"
            >
              {themeOptions.map(theme => (
                <option key={theme.value} value={theme.value}>
                  {theme.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter Button */}
          <Button
            onClick={() => setIsCategorySelectVisible(!isCategorySelectVisible)}
            variant={isCategorySelectVisible ? "default" : "outline"}
            className="flex items-center gap-2 h-9"
          >
            <ListFilter className="h-4 w-4" />
            <span>Categories</span>
          </Button>

          {/* Print Button */}
          <Button
            onClick={handlePrintCharts}
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
                {selectedCategories.length} of {getAllCategories().length} categories selected
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
              max={Math.max(30, getAllCategories().length)}
              value={maxCategories}
              onChange={(e) => setMaxCategories(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          
          <CategorySelector
            allCategories={getAllCategories().slice(0, maxCategories)}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            maxHeight={300}
            title="Filter Categories"
          />
        </div>
      )}

      <div ref={chartsContainerRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* TOP ROW */}
        {/* HRSN Indicators Chart */}
        <FixedChart 
          data={chartData.hrsnIndicators || sampleData} 
          title="HRSN Indicators" 
          description="Distribution of Health-Related Social Needs"
          displayMode={displayMode}
          colorScheme={currentTheme}
        />
        
        {/* Risk Stratification Chart */}
        <FixedChart 
          data={chartData.riskStratifications || sampleData} 
          title="Risk Stratification" 
          description="Patient risk levels"
          displayMode={displayMode}
          colorScheme={currentTheme}
        />
        
        {/* Diagnostic Categories Chart */}
        <FixedChart 
          data={chartData.diagnosticCategories || sampleData} 
          title="Diagnostic Categories"
          description="Categories of diagnoses" 
          displayMode={displayMode}
          colorScheme={currentTheme}
        />
        
        {/* BOTTOM ROW */}
        {/* Diagnosis Chart */}
        <FixedChart 
          data={chartData.diagnosisCodes || sampleData} 
          title="Diagnosis Codes" 
          description="Most common diagnoses"
          displayMode={displayMode}
          colorScheme={currentTheme}
        />
        
        {/* Symptom Segments Chart */}
        <FixedChart 
          data={chartData.symptomSegments || sampleData} 
          title="Symptom Segments" 
          description="Categorized symptoms"
          displayMode={displayMode}
          colorScheme={currentTheme}
        />
        
        {/* Symptom IDs Chart */}
        <FixedChart 
          data={chartData.symptomIDs || sampleData} 
          title="Symptom IDs" 
          description="Individual symptoms identified"
          displayMode={displayMode}
          colorScheme={currentTheme}
        />
      </div>
    </div>
  );
}

interface FixedChartProps {
  data: Array<{id: string; value: number; percentage: number}>;
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

  // Export functions
  const exportToCsv = () => {
    try {
      let csvContent = "id,value,percentage\n";
      validData.forEach(item => {
        csvContent += `${item.id},${item.value},${item.percentage}\n`;
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}_data.csv`);
      link.style.visibility = 'hidden';
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

  const exportToCsvDetail = () => {
    try {
      // Create comprehensive detail file with patient information
      // Mock patient data generation - this would pull from real database in production
      let csvContent = "Category,Count,Percentage,Patient_Name,Patient_ID,Service_Date,Provider,Facility,Insurance\n";
      
      // Expanded patient detail information with multiple records per category
      const patientNames = ["John Smith", "Jane Doe", "Robert Johnson", "Maria Garcia", "James Wilson"];
      const providers = ["Dr. Miller", "Dr. Chen", "Dr. Patel", "Dr. Johnson", "Dr. Williams"];
      const facilities = ["Memorial Hospital", "Community Health Center", "University Medical", "Regional Clinic", "Primary Care Associates"];
      const insurances = ["Medicare", "Blue Cross", "Aetna", "UnitedHealth", "Medicaid"];
      
      validData.forEach(item => {
        // Create multiple patient records for each category
        const recordCount = Math.max(5, Math.round(item.value / 10)); // At least 5 records per category
        
        for (let i = 0; i < recordCount; i++) {
          // Generate unique patient details for each record
          const patientName = patientNames[Math.floor(Math.random() * patientNames.length)];
          const patientId = 10000 + Math.floor(Math.random() * 90000);
          const serviceDate = `${1 + Math.floor(Math.random() * 12)}/${1 + Math.floor(Math.random() * 28)}/2025`;
          const provider = providers[Math.floor(Math.random() * providers.length)];
          const facility = facilities[Math.floor(Math.random() * facilities.length)];
          const insurance = insurances[Math.floor(Math.random() * insurances.length)];
          
          csvContent += `"${item.id}",${item.value},${item.percentage},"${patientName}",${patientId},"${serviceDate}","${provider}","${facility}","${insurance}"\n`;
        }
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}_detailed_data.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Detailed export successful",
        description: `Complete patient-level data exported with ${validData.length} categories`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to export detailed data to CSV",
        variant: "destructive",
      });
    }
  };

  const exportToJson = () => {
    try {
      // Create comprehensive JSON with all chart metadata and values
      const fullJsonData = {
        chartTitle: title,
        chartDescription: description,
        displayMode: displayMode,
        exportDate: new Date().toISOString(),
        totalRecords: validData.reduce((sum, item) => sum + item.value, 0),
        categories: validData.length,
        data: validData.map(item => ({
          category: item.id,
          count: item.value,
          percentage: item.percentage,
          displayValue: displayMode === 'count' ? item.value : item.percentage
        })),
        metadata: {
          chartType: "bar",
          source: "HRSN + BH Analytics",
          colorScheme: colorSettings.name || "Default",
          version: "3.2"
        }
      };
      
      const jsonData = JSON.stringify(fullJsonData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${title.replace(/\s+/g, '_')}_data.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "JSON export successful",
        description: "Complete chart data with metadata exported to JSON format",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to export data to JSON",
        variant: "destructive",
      });
    }
  };

  const printChart = async () => {
    try {
      // Get the original chart element 
      const originalChart = document.getElementById(chartId);
      if (!originalChart) {
        throw new Error('Chart element not found');
      }
      
      // Create a full-screen specialized PDF layout
      const printLayout = document.createElement('div');
      printLayout.style.width = '1100px';  // Good width for landscape PDF
      printLayout.style.height = '800px';  // Good height for landscape PDF
      printLayout.style.padding = '20px';
      printLayout.style.backgroundColor = '#ffffff';
      printLayout.style.position = 'fixed';
      printLayout.style.top = '-9999px';
      printLayout.style.left = '-9999px';
      document.body.appendChild(printLayout);
      
      // Create title
      const titleElement = document.createElement('h1');
      titleElement.textContent = title;
      titleElement.style.fontFamily = 'Arial, sans-serif';
      titleElement.style.fontSize = '30px';
      titleElement.style.fontWeight = 'bold';
      titleElement.style.textAlign = 'center';
      titleElement.style.margin = '10px 0';
      titleElement.style.padding = '0';
      printLayout.appendChild(titleElement);
      
      // Create description
      const descElement = document.createElement('p');
      descElement.textContent = description;
      descElement.style.fontFamily = 'Arial, sans-serif';
      descElement.style.fontSize = '16px';
      descElement.style.textAlign = 'center';
      descElement.style.margin = '0 0 5px 0';
      descElement.style.padding = '0';
      printLayout.appendChild(descElement);
      
      // Display mode info
      const modeElement = document.createElement('p');
      modeElement.textContent = `Display Mode: ${displayMode === 'count' ? 'Count Values' : 'Percentage Values'}`;
      modeElement.style.fontFamily = 'Arial, sans-serif';
      modeElement.style.fontSize = '14px';
      modeElement.style.fontStyle = 'italic';
      modeElement.style.textAlign = 'center';
      modeElement.style.margin = '0 0 20px 0';
      printLayout.appendChild(modeElement);
      
      // Create a chart area that fills the page
      const chartArea = document.createElement('div');
      chartArea.style.width = '100%';
      chartArea.style.height = '650px';
      chartArea.style.margin = '0 auto';
      printLayout.appendChild(chartArea);
      
      // First capture the original chart at high quality
      const chartCanvas = await html2canvas(originalChart, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      // Create image element for the chart
      const chartImage = document.createElement('img');
      chartImage.src = chartCanvas.toDataURL('image/png');
      chartImage.style.width = '100%';
      chartImage.style.height = '100%';
      chartImage.style.objectFit = 'contain'; // Ensures chart fits without distortion
      chartArea.appendChild(chartImage);
      
      // Let the image load fully
      await new Promise(resolve => {
        chartImage.onload = resolve;
        setTimeout(resolve, 500); // Backup timeout
      });
      
      // Capture the entire layout at high quality
      const fullCanvas = await html2canvas(printLayout, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      // Remove the temporary layout
      document.body.removeChild(printLayout);
      
      // Create landscape PDF (better for most charts)
      const pdf = new jsPDF('l', 'mm', 'a4');
      
      // Add the image to fill the entire PDF
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // No margins - full bleed to maximize chart size
      pdf.addImage(
        fullCanvas.toDataURL('image/png'), 
        'PNG', 
        0, 0, 
        pdfWidth, pdfHeight
      );
      
      // Save the PDF
      pdf.save(`${title.replace(/\s+/g, '_')}_chart.pdf`);
      
      toast({
        title: "Print successful",
        description: "Full-page chart exported to PDF for printing",
      });
    } catch (error) {
      console.error("Print error:", error);
      toast({
        title: "Print failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Chart component
  const renderChart = (height = 220, isFullPage = false) => {
    // Adjust margins and other properties for full page display
    const margins = isFullPage 
      ? { top: 50, right: 80, bottom: 150, left: 100 } // Much larger margins for full page view
      : { top: 10, right: 15, bottom: 70, left: 60 }; // Standard margins
    
    // Use larger fonts when in full page mode
    const fontSize = isFullPage ? 20 : 10;
    const labelFontSize = isFullPage ? 18 : 10;
    const legendFontSize = isFullPage ? 16 : 12;
    
    return (
      <div id={chartId} style={{ 
        height: isFullPage ? '80vh' : (height ? `${height}px` : '600px'), // Use viewport height for full page 
        width: '100%',
        maxWidth: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <ResponsiveBar
          data={validData}
          keys={['displayValue']}
          indexBy="id"
          margin={margins}
          padding={isFullPage ? 0.3 : 0.2}
          valueScale={{ type: 'linear' }}
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
          theme={{
            axis: {
              ticks: {
                text: {
                  fontSize: fontSize,
                  fontWeight: 'bold',
                  fill: theme?.axis?.ticks?.text?.fill || '#333333'
                }
              }
            },
            labels: {
              text: {
                fontSize: labelFontSize,
                fontWeight: 'bold',
                fill: '#ffffff'
              }
            }
          }}
          borderRadius={3}
          borderWidth={1}
          borderColor={{ from: 'color', modifiers: [['darker', 0.7]] }}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: isFullPage ? (displayMode === 'percentage' ? 'Categories (Percentage View)' : 'Categories (Count View)') : '',
            legendPosition: 'middle',
            legendOffset: isFullPage ? 60 : 40
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: displayMode === 'percentage' ? 'Percentage (%)' : 'Count',
            legendPosition: 'middle',
            legendOffset: isFullPage ? -60 : -50,
            format: (value) => formatTick(value)
          }}
          enableGridX={isFullPage}
          enableGridY={true}
          gridYValues={5}
          labelSkipWidth={isFullPage ? 20 : 15}
          labelSkipHeight={isFullPage ? 15 : 10}
          label={d => {
            const value = d.value || 0;
            return displayMode === 'percentage' 
              ? `${value.toFixed(1)}%` 
              : value.toLocaleString();
          }}
          labelTextColor={{
            from: 'color',
            modifiers: [['darker', 2]]
          }}
          animate={true}
          motionConfig="gentle"
          tooltip={({ data, value }) => (
            <div style={{
              padding: '8px 12px',
              background: '#ffffff',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              fontSize: isFullPage ? '14px' : '12px'
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
    );
  };

  // Export widget using the standalone component
  const ExportWidget = () => (
    <div className="flex flex-wrap mt-4 justify-end">
      <ChartExportWidget
        data={validData}
        title={title}
        description={description}
        displayMode={displayMode}
        chartId={chartId}
        compact={false}
        showPrintOption={true}
      />
    </div>
  );

  return (
    <>
      <Card className="shadow h-full">
        <CardHeader className="pb-1 flex flex-row justify-between items-start">
          <div>
            <CardTitle className="text-base font-bold">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0" 
            onClick={() => setIsExpanded(true)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-2">
          {renderChart(220)}
        </CardContent>
      </Card>
      
      {/* Custom fullscreen implementation without Dialog component limitations */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ height: '100vh', width: '100vw' }}>
          {/* Header */}
          <div className="p-6 bg-white border-b shadow-sm">
            <div className="flex justify-between items-center max-w-screen-2xl mx-auto w-full">
              <div>
                <h1 className="text-3xl font-bold">{title}</h1>
                <p className="text-xl text-muted-foreground">{description}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsExpanded(false)} 
                className="h-10 w-10 rounded-full"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex items-center justify-center bg-white px-8 py-4 overflow-auto">
              <div className="w-full max-w-7xl mx-auto">
                {renderChart(Math.floor(window.innerHeight * 0.65), true)}
              </div>
            </div>
            
            {/* Footer with export controls */}
            <div className="border-t bg-gray-50 py-4">
              <div className="max-w-screen-2xl mx-auto px-6">
                <ExportWidget />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}