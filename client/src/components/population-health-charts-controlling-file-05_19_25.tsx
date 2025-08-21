// Population Health Charts Controlling File - May 19, 2025
// Updated version with "Print Chart" text instead of "Download Chart"

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Download, ChevronDown, FileDown, FileSpreadsheet, FileJson, FileText, Printer } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ChartPrintButton } from "@/components/chart-print-handler";
import { Skeleton } from "@/components/ui/skeleton";
import { Slide } from '@/components/Slide';
import BooleanHrsnHeatmap from './boolean-hrsn-heatmap-controlling-file-05_17_25';
import ChartExportMenu from './chart-export-menu';
import ChartPrintButton from './chart-print-handler';

// Import chart themes
import { chartThemes } from '../lib/chart-themes';

// Define the props interface
interface PopulationHealthChartsProps {
  data?: any;
  isLoading?: boolean;
  colorTheme?: string;
}

// Charts Configurations
const chartConfig = {
  margin: { 
    top: 20, 
    right: 100, 
    bottom: 75, 
    left: 80
  },
  padding: 0.3,
  colors: { scheme: 'nivo' }, // default color scheme
  borderRadius: 5,
  borderWidth: 0,
  defs: [
    {
      id: 'dots',
      type: 'patternDots',
      background: 'inherit',
      color: 'rgba(255, 255, 255, 0.3)',
      size: 4,
      padding: 1,
      stagger: true
    },
    {
      id: 'lines',
      type: 'patternLines',
      background: 'inherit',
      color: 'rgba(255, 255, 255, 0.3)',
      rotation: -45,
      lineWidth: 6,
      spacing: 10
    }
  ],
  axisBottom: {
    tickSize: 5,
    tickPadding: 5,
    tickRotation: -35,
    legend: 'Categories',
    legendPosition: 'middle',
    legendOffset: 55
  },
  axisLeft: {
    tickSize: 5,
    tickPadding: 5,
    tickRotation: 0,
    legend: 'Count',
    legendPosition: 'middle',
    legendOffset: -65
  },
};

// Parse a JSON formatted date string to mm/dd/yyyy
function formatDate(dateString: string): string {
  if (!dateString) return 'Unknown';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString; // Return the original string if parsing fails
  }
}

// Define color theme presets
interface ColorThemePreset {
  name: string;
  saturation?: number;
  lightness?: number;
  alpha?: number;
  isCustomPalette?: boolean;
  colors?: string[];
}

// Create a new array of specified length with sequential hue values
function generateHueArray(length: number, startHue: number = 0, endHue: number = 360): number[] {
  if (length <= 0) return [];
  if (length === 1) return [startHue];
  
  const step = (endHue - startHue) / (length - 1);
  return Array.from({ length }, (_, i) => startHue + i * step);
}

// Generate HSL color from hue, with fixed saturation and lightness
function generateHslColor(hue: number, saturation: number = 70, lightness: number = 55): string {
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Helper function to get a consistent color for a given key
function getConsistentColor(key: string, index: number, total: number, colors?: string[]): string {
  // If custom colors are provided, use them
  if (colors && colors.length > 0) {
    return colors[index % colors.length];
  }
  
  // Otherwise, generate a color based on the index
  const hue = (index / total) * 360;
  return generateHslColor(hue, 70, 55);
}

// Export utility function - for CSV
function exportChartDataToCsv(chartTitle: string, data: any[]): void {
  if (!data || !data.length) return;
  
  try {
    // Create header row
    const headers = Object.keys(data[0]).filter(key => !key.startsWith('_') && key !== 'color' && key !== 'id').join(',');
    
    // Create data rows
    const rows = data.map(item => {
      return Object.keys(data[0])
        .filter(key => !key.startsWith('_') && key !== 'color' && key !== 'id')
        .map(key => {
          const value = item[key];
          // Handle values with commas by wrapping in quotes
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        })
        .join(',');
    });
    
    // Combine header and rows
    const csvContent = [headers, ...rows].join('\\n');
    
    // Create a Blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${chartTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
  } catch (error) {
    console.error('Error exporting CSV data:', error);
    alert('There was an error exporting the chart data to CSV.');
  }
}

// Export utility function - for Excel
function exportChartDataToExcel(chartTitle: string, data: any[]): void {
  if (!data || !data.length) return;
  
  try {
    // Filter out internal properties
    const processedData = data.map(item => {
      const newObj: any = {};
      Object.keys(item).forEach(key => {
        if (!key.startsWith('_') && key !== 'color' && key !== 'id') {
          newObj[key] = item[key];
        }
      });
      return newObj;
    });
    
    // Create a workbook and add a worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(processedData);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, chartTitle.substr(0, 31));
    
    // Generate Excel file and trigger download
    XLSX.writeFile(wb, \`\${chartTitle.replace(/[^a-z0-9]/gi, '_')}_\${new Date().toISOString().slice(0, 10)}.xlsx\`);
  } catch (error) {
    console.error('Error exporting Excel data:', error);
    alert('There was an error exporting the chart data to Excel.');
  }
}

// Export utility function - for JSON
function exportChartDataToJson(chartTitle: string, data: any[]): void {
  if (!data || !data.length) return;
  
  try {
    // Filter out internal properties
    const processedData = data.map(item => {
      const newObj: any = {};
      Object.keys(item).forEach(key => {
        if (!key.startsWith('_') && key !== 'color') {
          newObj[key] = item[key];
        }
      });
      return newObj;
    });
    
    // Create a Blob and download
    const blob = new Blob([JSON.stringify(processedData, null, 2)], { type: 'application/json' });
    saveAs(blob, `${chartTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.json`);
  } catch (error) {
    console.error('Error exporting JSON data:', error);
    alert('There was an error exporting the chart data to JSON.');
  }
}

// Export utility function - for PDF
function exportChartDataToPdf(chartTitle: string, data: any[]): void {
  if (!data || !data.length) return;
  
  try {
    // Create new PDF document
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(chartTitle, 14, 20);
    doc.setFontSize(10);
    doc.text(\`Generated on \${new Date().toLocaleString()}\`, 14, 26);
    
    // Create table headers
    const headers = Object.keys(data[0])
      .filter(key => !key.startsWith('_') && key !== 'color' && key !== 'id')
      .map(header => ({
        id: header,
        name: header.charAt(0).toUpperCase() + header.slice(1).replace(/([A-Z])/g, ' $1'),
        width: 30
      }));
    
    // Create table rows
    const rows = data.map(item => {
      return headers.map(header => {
        const value = item[header.id];
        return value !== undefined && value !== null ? String(value) : '';
      });
    });
    
    // Generate the table
    (doc as any).autoTable({
      startY: 30,
      head: [headers.map(h => h.name)],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [66, 139, 202], textColor: [255, 255, 255] }
    });
    
    // Save the PDF
    doc.save(\`\${chartTitle.replace(/[^a-z0-9]/gi, '_')}_\${new Date().toISOString().slice(0, 10)}.pdf\`);
  } catch (error) {
    console.error('Error exporting PDF data:', error);
    alert('There was an error exporting the chart data to PDF.');
  }
}

// Function to capture and print chart
function printChartData(chartTitle: string, data: any[], chartElement?: HTMLElement): void {
  if (!data || !data.length) {
    console.error("No data available to print");
    alert("No data available to print. Please try again after loading data.");
    return;
  }
  
  try {
    // If a specific chart element is passed, print it
    if (chartElement) {
      html2canvas(chartElement, { 
        backgroundColor: '#ffffff',
        scale: 2 // Higher resolution
      }).then(canvas => {
        const img = canvas.toDataURL('image/png');
        
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          alert('Please allow popups to print charts');
          return;
        }
        
        // Add content to the print window
        printWindow.document.write(\`
          <!DOCTYPE html>
          <html>
            <head>
              <title>\${chartTitle} - Chart Print</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .chart-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
                .chart-image { max-width: 100%; }
                .print-date { color: #666; font-size: 12px; margin-bottom: 20px; }
              </style>
            </head>
            <body>
              <div class="chart-title">\${chartTitle}</div>
              <div class="print-date">Generated on \${new Date().toLocaleString()}</div>
              <img class="chart-image" src="\${img}" alt="\${chartTitle}">
            </body>
          </html>
        \`);
        
        printWindow.document.close();
        
        // Wait for content to be fully loaded before printing
        setTimeout(() => {
          printWindow.print();
        }, 250);
      });
    } else {
      // If no specific chart element, print the data as a table
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print data');
        return;
      }
      
      // Filter data to remove internal properties
      const printableData = data.map(item => {
        const newObj: any = {};
        Object.keys(item).forEach(key => {
          if (!key.startsWith('_') && key !== 'color' && key !== 'id') {
            newObj[key] = item[key];
          }
        });
        return newObj;
      });
      
      // Generate table HTML
      let tableHTML = '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">';
      
      // Add header row
      tableHTML += '<tr style="background-color: #f2f2f2;">';
      Object.keys(printableData[0]).forEach(key => {
        tableHTML += \`<th style="text-align: left;">\${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</th>\`;
      });
      tableHTML += '</tr>';
      
      // Add data rows
      printableData.forEach((row, index) => {
        tableHTML += \`<tr style="background-color: \${index % 2 === 0 ? '#ffffff' : '#f9f9f9'}">\`;
        Object.values(row).forEach(value => {
          tableHTML += \`<td>\${value !== null && value !== undefined ? value : ''}</td>\`;
        });
        tableHTML += '</tr>';
      });
      
      tableHTML += '</table>';
      
      // Write to the print window
      printWindow.document.write(\`
        <!DOCTYPE html>
        <html>
          <head>
            <title>\${chartTitle} - Data Print</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #333; }
              .print-date { color: #666; font-size: 12px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #f2f2f2; text-align: left; }
              th, td { padding: 8px; border: 1px solid #ddd; }
              tr:nth-child(even) { background-color: #f9f9f9; }
            </style>
          </head>
          <body>
            <h1>\${chartTitle}</h1>
            <div class="print-date">Generated on \${new Date().toLocaleString()}</div>
            \${tableHTML}
          </body>
        </html>
      \`);
      
      printWindow.document.close();
      
      // Wait for content to be fully loaded before printing
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  } catch (error) {
    console.error('Error printing chart data:', error);
    alert('There was an error preparing the chart for printing.');
  }
}

export default function PopulationHealthCharts({ 
  data, 
  isLoading = false,
  colorTheme = 'vivid'
}: PopulationHealthChartsProps) {
  
  // State for available chart containers
  const [chartContainers, setChartContainers] = useState<HTMLElement[]>([]);
  
  // State for tracking if chart images are being loaded/exported
  const [loadingChartImage, setLoadingChartImage] = useState(false);
  
  // Use useCallback to avoid unnecessary re-renders
  const downloadChart = useCallback((chartId: string, chartData: any[]): void => {
    try {
      // Find chart container by ID or class
      const chartElement = document.querySelector(\`[data-chart-id="\${chartId}"]\`) as HTMLElement;
      if (!chartElement) {
        console.error(\`Chart container for \${chartId} not found\`);
        return;
      }
      
      setLoadingChartImage(true);
      
      // Use html2canvas to take screenshot
      html2canvas(chartElement, { 
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true
      }).then(canvas => {
        // Convert to blob and download
        canvas.toBlob(blob => {
          if (blob) {
            saveAs(blob, `${chartId.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.png`);
          }
          setLoadingChartImage(false);
        });
      }).catch(error => {
        console.error('Error capturing chart:', error);
        setLoadingChartImage(false);
      });
    } catch (error) {
      console.error('Error downloading chart:', error);
      setLoadingChartImage(false);
    }
  }, []);
  
  // Function to create data structures for the HRSN Indicator chart
  const getHrsnIndicatorData = useCallback(() => {
    if (!data?.hrsnIndicatorData) return [];
    
    let formattedData: any[] = [];
    
    // Process each HRSN indicator category
    data.hrsnIndicatorData.forEach((category: any) => {
      const { id, indicators } = category;
      
      // Process each indicator within the category
      indicators.forEach((indicator: any) => {
        formattedData.push({
          category: id,
          label: indicator.label,
          value: indicator.value,
          percentage: indicator.percentage,
          id: \`\${id}-\${indicator.label}\` // Unique ID
        });
      });
    });
    
    return formattedData;
  }, [data]);
  
  // Function to create data for the Risk Stratification chart
  const getRiskStratificationData = useCallback(() => {
    if (!data?.riskStratificationData) return [];
    
    // Format the data for the chart
    return data.riskStratificationData.map((item: any) => ({
      id: item.id,
      value: item.value,
      label: item.label,
      percentage: item.percentage
    }));
  }, [data]);
  
  // Function to create data for the Symptom Segment chart (top symptoms)
  const getSymptomSegmentData = useCallback(() => {
    if (!data?.symptomSegmentData) return [];
    
    // Sort by count/value descending and take top 15
    const sortedData = [...data.symptomSegmentData]
      .sort((a, b) => (b.value || b.count) - (a.value || a.count))
      .slice(0, 15);
    
    // Format the data for the chart
    return sortedData.map((item: any) => ({
      id: item.symptom_segment || item.id,
      value: item.value || item.count,
      label: item.symptom_segment || item.id,
      type: item.symp_prob || 'Symptom'
    }));
  }, [data]);
  
  // Function to create data for the Diagnosis chart
  const getDiagnosisData = useCallback(() => {
    if (!data?.diagnosisData) return [];
    
    // Format the data for the chart
    return data.diagnosisData.map((item: any) => ({
      id: item.id,
      value: item.value || item.count,
      label: item.label || item.id,
      percentage: item.percentage
    }));
  }, [data]);
  
  // Function to create data for the Symptom ID chart
  const getSymptomIdData = useCallback(() => {
    if (!data?.symptomIDData) return [];
    
    // Format the data for the chart
    return data.symptomIDData.map((item: any) => ({
      id: item.id,
      value: item.value || item.count,
      label: item.label || item.id,
      percentage: item.percentage
    }));
  }, [data]);
  
  // Function to create data for the Diagnostic Category chart
  const getDiagnosticCategoryData = useCallback(() => {
    if (!data?.diagnosticCategoryData) return [];
    
    // Format the data for the chart
    return data.diagnosticCategoryData.map((item: any) => ({
      id: item.id,
      value: item.value || item.count,
      label: item.label || item.id,
      percentage: item.percentage
    }));
  }, [data]);
  
  // Download chart as PDF
  const downloadChartAsPDF = useCallback((chartTitle: string, chartData: any[]): void => {
    exportChartDataToPdf(chartTitle, chartData);
  }, []);
  
  // Download chart as Excel
  const downloadChartAsExcel = useCallback((chartTitle: string, chartData: any[]): void => {
    exportChartDataToExcel(chartTitle, chartData);
  }, []);
  
  // Download chart as CSV
  const downloadChartAsCSV = useCallback((chartTitle: string, chartData: any[]): void => {
    exportChartDataToCsv(chartTitle, chartData);
  }, []);
  
  // Download chart as JSON
  const downloadChartAsJson = useCallback((chartTitle: string, chartData: any[]): void => {
    exportChartDataToJson(chartTitle, chartData);
  }, []);
  
  // Print chart data
  const printChart = useCallback((chartTitle: string, chartData: any[]): void => {
    const chartContainer = document.querySelector(\`[data-chart-id="\${chartTitle}"]\`) as HTMLElement;
    printChartData(chartTitle, chartData, chartContainer);
  }, []);
  
  // Display "No Data Available" message for empty charts
  const NoDataDisplay = () => (
    <div className="flex flex-col items-center justify-center h-[300px] w-full text-muted-foreground">
      <Download className="h-16 w-16 mb-2 opacity-20" />
      <p className="text-lg font-medium">No Data Available</p>
      <p className="text-sm">There is no data to display for this chart.</p>
    </div>
  );
  
  // If loading, show skeleton
  if (isLoading) {
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
  
  // Helper function to get the theme for charts
  const getTheme = () => {
    // Return the selected theme from chartThemes or a default if not found
    return chartThemes[colorTheme] || chartThemes.vivid;
  };
  
  return (
    <div className="mt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: HRSN Indicators (Top Left) */}
        <Card className="shadow-sm chart-container" data-chart-id="HRSN Indicators">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-semibold chart-title">
                  Total Population by HRSN Indicator
                </CardTitle>
                <CardDescription>
                  Distribution of health-related social needs indicators
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2">
            <div className="h-[350px] mt-0 pt-0">
              {getHrsnIndicatorData().length > 0 ? (
                <ResponsiveBar
                  data={getHrsnIndicatorData()}
                  keys={['value']}
                  indexBy="label"
                  margin={{ top: 20, right: 20, bottom: 80, left: 80 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={(bar) => {
                    // Get proper category for this item
                    const category = bar.data.category;
                    
                    // Assign different color hues based on category
                    if (category === 'Housing') return '#3498db';
                    if (category === 'Food') return '#2ecc71';
                    if (category === 'Transportation') return '#f39c12';
                    if (category === 'Utilities') return '#e74c3c';
                    if (category === 'Personal Safety') return '#9b59b6';
                    if (category === 'Education') return '#1abc9c';
                    
                    return '#7f8c8d'; // Default color
                  }}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: 'HRSN Categories',
                    legendPosition: 'middle',
                    legendOffset: 60
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Count',
                    legendPosition: 'middle',
                    legendOffset: -65
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
                  role="application"
                  ariaLabel="HRSN Indicator Chart"
                  tooltip={(point) => (
                    <div
                      style={{
                        background: 'white',
                        padding: '9px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div><strong>{point.data.category}</strong>: {point.data.label}</div>
                      <div>Count: <strong>{point.data.value}</strong></div>
                      <div>Percentage: <strong>{point.data.percentage?.toFixed(1)}%</strong></div>
                    </div>
                  )}
                  theme={getTheme()}
                />
              ) : (
                <NoDataDisplay />
              )}
            </div>
          </CardContent>
          <CardFooter>
            {/* Download button removed as requested */}
            <ChartPrintButton
              chartId="HRSN Indicators"
              chartTitle="HRSN Indicators"
            />
          </CardFooter>
        </Card>
          
        {/* Chart 2: Risk Stratification (Top Right) */}
        <Card className="shadow-sm chart-container" data-chart-id="Risk Stratification">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-semibold chart-title">
                  Total Population by Risk Stratification
                </CardTitle>
                <CardDescription>
                  Distribution of patient risk stratification levels
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2">
            <div className="h-[350px] mt-0 pt-0">
              {getRiskStratificationData().length > 0 ? (
                <ResponsivePie
                  data={getRiskStratificationData()}
                  margin={{ top: 20, right: 80, bottom: 80, left: 80 }}
                  innerRadius={0.5}
                  padAngle={0.7}
                  cornerRadius={3}
                  activeOuterRadiusOffset={8}
                  colors={({ data }) => {
                    // Assign colors based on risk level
                    if (data.id === 'High Risk') return '#e74c3c';
                    if (data.id === 'Medium Risk') return '#f39c12';
                    if (data.id === 'Low Risk') return '#2ecc71';
                    return '#3498db'; // Default
                  }}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  arcLinkLabelsSkipAngle={10}
                  arcLinkLabelsTextColor={{ from: 'color', modifiers: [] }}
                  arcLinkLabelsThickness={2}
                  arcLinkLabelsColor={{ from: 'color' }}
                  arcLabelsSkipAngle={10}
                  arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
                  legends={[
                    {
                      anchor: 'bottom',
                      direction: 'row',
                      justify: false,
                      translateX: 0,
                      translateY: 56,
                      itemsSpacing: 0,
                      itemWidth: 100,
                      itemHeight: 18,
                      itemTextColor: '#999',
                      itemDirection: 'left-to-right',
                      itemOpacity: 1,
                      symbolSize: 18,
                      symbolShape: 'circle',
                    }
                  ]}
                  tooltip={(point) => (
                    <div
                      style={{
                        background: 'white',
                        padding: '9px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div><strong>{point.datum.id}</strong></div>
                      <div>Count: <strong>{point.datum.value}</strong></div>
                      <div>Percentage: <strong>{point.datum.percentage?.toFixed(1)}%</strong></div>
                    </div>
                  )}
                  theme={getTheme()}
                />
              ) : (
                <NoDataDisplay />
              )}
            </div>
          </CardContent>
          <CardFooter>
            {/* Download button removed as requested */}
            <ChartPrintButton
              chartId="Risk Stratification"
              chartTitle="Risk Stratification"
            />
          </CardFooter>
        </Card>
          
        {/* Chart 3: Total Population by Symptom Segment (Middle Left) */}
        <Card className="shadow-sm chart-container" data-chart-id="Symptom_Segment">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-semibold chart-title">
                  Total Population by Symptom Segment
                </CardTitle>
                <CardDescription>
                  Top 15 symptom segments across the population
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2">
            <div className="h-[350px] mt-0 pt-0">
              {getSymptomSegmentData().length > 0 ? (
                <ResponsiveBar
                  data={getSymptomSegmentData()}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 20, right: 20, bottom: 80, left: 80 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={(bar) => {
                    // Use different color schemes based on type
                    if (bar.data.type === 'Problem') return '#e74c3c';
                    return '#3498db'; // Default for Symptom
                  }}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: 'Symptom Segments',
                    legendPosition: 'middle',
                    legendOffset: 60
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Count',
                    legendPosition: 'middle',
                    legendOffset: -65
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
                  role="application"
                  ariaLabel="Symptom Segment Chart"
                  tooltip={(point) => (
                    <div
                      style={{
                        background: 'white',
                        padding: '9px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div><strong>{point.data.id}</strong></div>
                      <div>Type: <strong>{point.data.type}</strong></div>
                      <div>Count: <strong>{point.data.value}</strong></div>
                    </div>
                  )}
                  theme={getTheme()}
                />
              ) : (
                <NoDataDisplay />
              )}
            </div>
          </CardContent>
          <CardFooter>
            {/* Download button removed as requested */}
            <ChartPrintButton
              chartId="Symptom_Segment"
              chartTitle="Total Population by Symptom Segment"
            />
          </CardFooter>
        </Card>
        
        {/* Chart 4: Total Population by Diagnosis (Middle Right) */}
        <Card className="shadow-sm chart-container" data-chart-id="Diagnosis">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-semibold chart-title">
                  Total Population by Diagnosis
                </CardTitle>
                <CardDescription>
                  Distribution of diagnoses across the population
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2">
            <div className="h-[350px] mt-0 pt-0">
              {getDiagnosisData().length > 0 ? (
                <ResponsiveBar
                  data={getDiagnosisData()}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 20, right: 20, bottom: 80, left: 80 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={(bar) => {
                    // Generate a color based on the index
                    const diagnosisColors = [
                      '#3498db', // Blue
                      '#e74c3c', // Red
                      '#2ecc71', // Green
                      '#f39c12', // Orange
                      '#9b59b6', // Purple
                      '#1abc9c', // Turquoise
                      '#d35400'  // Dark Orange
                    ];
                    
                    // Find the index of this diagnosis in the array
                    const index = getDiagnosisData().findIndex(d => d.id === bar.data.id);
                    return diagnosisColors[index % diagnosisColors.length];
                  }}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: 'Diagnoses',
                    legendPosition: 'middle',
                    legendOffset: 60
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Count',
                    legendPosition: 'middle',
                    legendOffset: -65
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
                  role="application"
                  ariaLabel="Diagnosis Chart"
                  tooltip={(point) => (
                    <div
                      style={{
                        background: 'white',
                        padding: '9px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div><strong>{point.data.id}</strong></div>
                      <div>Count: <strong>{point.data.value}</strong></div>
                      <div>Percentage: <strong>{point.data.percentage?.toFixed(1)}%</strong></div>
                    </div>
                  )}
                  theme={getTheme()}
                />
              ) : (
                <NoDataDisplay />
              )}
            </div>
          </CardContent>
          <CardFooter>
            {/* Download button removed as requested */}
            <ChartPrintButton
              chartId="Diagnosis"
              chartTitle="Total Population by Diagnosis"
            />
          </CardFooter>
        </Card>
        
        {/* Chart 5: Total Population by Symptom ID (Bottom Left) */}
        <Card className="shadow-sm chart-container" data-chart-id="Symptom ID">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-semibold chart-title">
                  Total Population by Symptom ID
                </CardTitle>
                <CardDescription>
                  Distribution of symptom IDs across the population
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2">
            <div className="h-[350px] mt-0 pt-0">
              {getSymptomIdData().length > 0 ? (
                <ResponsiveBar
                  data={getSymptomIdData()}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 20, right: 20, bottom: 80, left: 80 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={(bar) => {
                    // Generate a color based on the index
                    const symptomColors = [
                      '#9b59b6', // Purple
                      '#3498db', // Blue
                      '#2ecc71', // Green
                      '#e74c3c', // Red
                      '#f39c12', // Orange
                      '#1abc9c', // Turquoise
                      '#d35400'  // Dark Orange
                    ];
                    
                    // Find the index of this symptom in the array
                    const index = getSymptomIdData().findIndex(s => s.id === bar.data.id);
                    return symptomColors[index % symptomColors.length];
                  }}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: 'Symptom IDs',
                    legendPosition: 'middle',
                    legendOffset: 60
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Count',
                    legendPosition: 'middle',
                    legendOffset: -65
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
                  role="application"
                  ariaLabel="Symptom ID Chart"
                  tooltip={(point) => (
                    <div
                      style={{
                        background: 'white',
                        padding: '9px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div><strong>{point.data.id}</strong></div>
                      <div>Count: <strong>{point.data.value}</strong></div>
                      <div>Percentage: <strong>{point.data.percentage?.toFixed(1)}%</strong></div>
                    </div>
                  )}
                  theme={getTheme()}
                />
              ) : (
                <NoDataDisplay />
              )}
            </div>
          </CardContent>
          <CardFooter>
            {/* Download button removed as requested */}
            <ChartPrintButton
              chartId="Symptom ID"
              chartTitle="Total Population by Symptom ID"
            />
          </CardFooter>
        </Card>
        
        {/* Chart 6: Total Population by Diagnostic Category (Bottom Right) */}
        <Card className="shadow-sm chart-container" data-chart-id="Diagnostic Category">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-semibold chart-title">
                  Total Population by Diagnostic Category
                </CardTitle>
                <CardDescription>
                  Distribution of diagnostic categories across the population
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2">
            <div className="h-[350px] mt-0 pt-0">
              {getDiagnosticCategoryData().length > 0 ? (
                <ResponsiveBar
                  data={getDiagnosticCategoryData()}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 20, right: 20, bottom: 80, left: 80 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  colors={(bar) => {
                    // Generate a color based on the index
                    const categoryColors = [
                      '#3498db', // Blue
                      '#e74c3c', // Red
                      '#2ecc71', // Green
                      '#f39c12', // Orange
                      '#9b59b6', // Purple
                      '#1abc9c', // Turquoise
                      '#d35400'  // Dark Orange
                    ];
                    
                    // Find the index of this category in the array
                    const index = getDiagnosticCategoryData().findIndex(c => c.id === bar.data.id);
                    return categoryColors[index % categoryColors.length];
                  }}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  axisTop={null}
                  axisRight={null}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: 'Diagnostic Categories',
                    legendPosition: 'middle',
                    legendOffset: 60
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Count',
                    legendPosition: 'middle',
                    legendOffset: -65
                  }}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
                  role="application"
                  ariaLabel="Diagnostic Category Chart"
                  tooltip={(point) => (
                    <div
                      style={{
                        background: 'white',
                        padding: '9px 12px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div><strong>{point.data.id}</strong></div>
                      <div>Count: <strong>{point.data.value}</strong></div>
                      <div>Percentage: <strong>{point.data.percentage?.toFixed(1)}%</strong></div>
                    </div>
                  )}
                  theme={getTheme()}
                />
              ) : (
                <NoDataDisplay />
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 pt-0">
            {/* Dialog for full-screen view with export options */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Maximize className="h-4 w-4" />
                  <span className="sr-md:inline">Expand</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl w-[90vw]">
                <DialogHeader>
                  <DialogTitle>Total Population by Diagnostic Category</DialogTitle>
                  <DialogDescription>Distribution of diagnostic categories across the population</DialogDescription>
                </DialogHeader>
                
                <div className="w-full h-[500px] mt-4">
                  {getDiagnosticCategoryData().length > 0 ? (
                    <ResponsiveBar
                      data={getDiagnosticCategoryData()}
                      keys={['value']}
                      indexBy="id"
                      margin={{ top: 30, right: 50, bottom: 100, left: 100 }}
                      padding={0.3}
                      valueScale={{ type: 'linear' }}
                      indexScale={{ type: 'band', round: true }}
                      colors={(bar) => {
                        const categoryColors = [
                          '#3498db', '#e74c3c', '#2ecc71', '#f39c12', 
                          '#9b59b6', '#1abc9c', '#d35400'
                        ];
                        const index = getDiagnosticCategoryData().findIndex(c => c.id === bar.data.id);
                        return categoryColors[index % categoryColors.length];
                      }}
                      borderWidth={1}
                      borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: -45,
                        legend: 'Diagnostic Categories',
                        legendPosition: 'middle',
                        legendOffset: 80
                      }}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Count',
                        legendPosition: 'middle',
                        legendOffset: -70
                      }}
                      labelSkipWidth={12}
                      labelSkipHeight={12}
                      labelTextColor={{ from: 'color', modifiers: [['darker', 3]] }}
                      theme={getTheme()}
                    />
                  ) : (
                    <NoDataDisplay />
                  )}
                </div>
                
                {/* Standardized Export Section */}
                <ChartExportSection 
                  chartName="Total Population by Diagnostic Category"
                  downloadChartAsCSV={(chartTitle, data) => exportChartDataToCsv(chartTitle, getDiagnosticCategoryData())}
                  downloadChartAsExcel={(chartTitle, data) => exportChartDataToExcel(chartTitle, getDiagnosticCategoryData())}
                  downloadChartAsJson={(chartTitle, data) => exportChartDataToJson(chartTitle, getDiagnosticCategoryData())}
                  printChart={(chartTitle) => printChartData(chartTitle, getDiagnosticCategoryData())}
                  getFullDataset={() => getDiagnosticCategoryData()}
                />
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
        
        {/* Housing Status by Age Range Heatmap (Bottom) */}
        <Card className="shadow-sm col-span-1 md:col-span-2 chart-container" data-chart-id="Housing Status Heatmap">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg font-semibold chart-title">
                  Housing Status by Age Range
                </CardTitle>
                <CardDescription>
                  Distribution of housing status across different age ranges
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-2">
            <div className="h-[400px] mt-0 pt-0">
              {data?.patients && data.patients.length > 0 ? (
                <BooleanHrsnHeatmap 
                  patientData={data.patients} 
                  colorScheme={colorTheme}
                  categoryName="housingStatus"
                />
              ) : (
                <NoDataDisplay />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}`}