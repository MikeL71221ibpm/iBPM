// Fixed Charts Page - May 23, 2025
// This page shows all charts with proper percentage display, unified toggle, and category scrollbar filtering

import React, { useState, useEffect, useRef, useCallback } from "react";
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

export default function FixedCharts05_23_25() {
  const [chartData, setChartData] = useState<any>({});
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>('count');
  const chartsContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { currentTheme, setCurrentTheme, colorSettings, theme } = useChartTheme();
  
  // Single category selection for all charts
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [maxCategories, setMaxCategories] = useState<number>(10);
  const [isCategorySelectVisible, setIsCategorySelectVisible] = useState<boolean>(false);
  
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

  // Collect all unique categories from all chart types
  const collectAllCategories = useCallback(() => {
    const uniqueCategories = new Set<string>();
    
    // Add categories from each chart type
    Object.values(demoData).forEach((items) => {
      items.forEach((item: any) => {
        uniqueCategories.add(item.id);
      });
    });
    
    return Array.from(uniqueCategories);
  }, []);

  // Initialize with demo data and categories
  useEffect(() => {
    setChartData(demoData);
    
    const allCats = collectAllCategories();
    setAllCategories(allCats);
    setSelectedCategories(allCats);
  }, [collectAllCategories]);

  // Handle printing all charts
  const printAllCharts = async () => {
    if (!chartsContainerRef.current) return;
    
    try {
      // Show toast notification
      toast({
        title: "Preparing PDF",
        description: "Creating a printable version of all charts...",
      });
      
      // Create PDF document with landscape orientation
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Get all chart containers
      const chartElements = chartsContainerRef.current.querySelectorAll('.chart-container');
      
      // Loop through each chart
      for (let i = 0; i < chartElements.length; i++) {
        const chartElement = chartElements[i] as HTMLElement;
        const title = chartElement.querySelector('.chart-title')?.textContent || `Chart ${i+1}`;
        
        // Add a page for each chart except the first one
        if (i > 0) {
          pdf.addPage();
        }
        
        // Capture the chart as an image
        const canvas = await html2canvas(chartElement, {
          scale: 2, // Higher resolution
          logging: false,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
        
        // Convert to image
        const imgData = canvas.toDataURL('image/png');
        
        // Calculate aspect ratio and fit to page
        const imgWidth = 280; // mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Add title at the top of the page
        pdf.setFontSize(16);
        pdf.text(title, 10, 10);
        
        // Add the chart image
        pdf.addImage(imgData, 'PNG', 10, 20, imgWidth, imgHeight);
        
        // Add footer with date
        pdf.setFontSize(8);
        pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 10, 200);
      }
      
      // Save the PDF
      pdf.save('population-health-charts.pdf');
      
      // Success notification
      toast({
        title: "PDF Created",
        description: "Your charts have been exported to PDF successfully",
      });
      
    } catch (error) {
      console.error("Error creating PDF:", error);
      toast({
        title: "Error creating PDF",
        description: "There was an issue generating the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filter chart data based on selected categories
  const filterChartData = (data: any[], categories: string[]) => {
    if (!data || !Array.isArray(data)) return [];
    return data.filter(item => categories.includes(item.id));
  };

  // Render chart component
  const renderChart = (chartType: keyof typeof demoData, title: string, description: string) => {
    const data = chartData[chartType] || [];
    const filteredData = filterChartData(data, selectedCategories);
    
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

    return (
      <Card className="h-full chart-container">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="chart-title">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pb-4">
          <div style={{ height: 220 }}>
            {validData.length > 0 ? (
              <ResponsiveBar
                data={validData}
                keys={['displayValue']}
                indexBy="id"
                margin={{ top: 10, right: 20, bottom: 50, left: 60 }}
                padding={0.3}
                layout="vertical"
                valueScale={{ type: 'linear' }}
                indexScale={{ type: 'band', round: true }}
                colors={({ data }) => {
                  // Use current theme colors
                  const themeColors = colorSettings.colors || 
                    Array(validData.length)
                      .fill(0)
                      .map((_, i) => theme.getColorFromRange(i, validData.length));
                  
                  const index = validData.findIndex(d => d.id === data.id);
                  return themeColors[index % themeColors.length];
                }}
                borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: -45,
                  legendPosition: 'middle',
                  legendOffset: 32,
                  truncateTickAt: 0
                }}
                axisLeft={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legendPosition: 'middle',
                  legendOffset: -50,
                  truncateTickAt: 0,
                  format: formatTick,
                  legend: displayMode === 'percentage' ? 'Percentage (%)' : 'Count'
                }}
                enableGridY={true}
                labelSkipWidth={12}
                labelSkipHeight={12}
                labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                role="application"
                ariaLabel={`${title} bar chart`}
                barAriaLabel={e => `${e.id}: ${e.formattedValue} ${displayMode === 'percentage' ? 'percent' : 'patients'}`}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No data to display</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Population Health Dashboard</h1>
          <p className="text-muted-foreground">Insights and analytics across key health metrics</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex items-center space-x-2 bg-background rounded-md border p-2">
            <Button
              variant={displayMode === 'count' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('count')}
              className="flex items-center gap-1"
            >
              <Hash className="h-4 w-4" /> Count
            </Button>
            <Button
              variant={displayMode === 'percentage' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDisplayMode('percentage')}
              className="flex items-center gap-1"
            >
              <Percent className="h-4 w-4" /> Percentage
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={isCategorySelectVisible ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCategorySelectVisible(!isCategorySelectVisible)}
              className="flex items-center gap-1"
            >
              <ListFilter className="h-4 w-4" /> Categories
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => printAllCharts()}
              className="flex items-center gap-1"
            >
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>
      </div>
      
      {/* Category Selector Scrollbar */}
      {isCategorySelectVisible && (
        <div className="mb-4 p-4 border rounded-md bg-background shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium">Categories to Display</h3>
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                {selectedCategories.length} of {allCategories.length} categories selected
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
              max={Math.max(30, allCategories.length)}
              value={maxCategories}
              onChange={(e) => setMaxCategories(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          
          <CategorySelector
            allCategories={allCategories.slice(0, maxCategories)}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            maxHeight={300}
            title="Filter Categories"
          />
        </div>
      )}
      
      {/* Main chart grid */}
      <div ref={chartsContainerRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderChart('hrsnIndicators', 'HRSN Indicators', 'Health-related social needs identified in patients')}
        {renderChart('diagnosisCodes', 'Diagnosis Codes', 'Primary diagnosis codes across patient population')}
        {renderChart('symptomSegments', 'Symptom Segments', 'Symptom categories reported by patients')}
        {renderChart('symptomIDs', 'Symptom IDs', 'Specific symptom identifiers across patients')}
        {renderChart('diagnosticCategories', 'Diagnostic Categories', 'Major diagnostic classifications')}
        {renderChart('riskStratifications', 'Risk Stratification', 'Patient risk levels')}
      </div>
    </div>
  );
}