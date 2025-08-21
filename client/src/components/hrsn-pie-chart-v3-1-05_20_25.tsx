// Last updated: May 20, 2025 - Enhancement for v3.1
// Controls component: HRSN Pie Chart - displays HRSN percentage distributions with export functionality

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsivePie, PieCustomLayerProps } from "@nivo/pie";
import { useChartTheme } from "@/context/ChartThemeContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileDown, FileJson, FileSpreadsheet, FileText, Maximize, Printer, Table } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Field name mapping from standardized fields to current data fields
// This allows us to work with standardized field names while supporting legacy data
const fieldNameMapping: Record<string, string> = {
  // Standard field name -> Current data field name
  "financial_status": "financial_strain",
  "access_to_transportation": "transportation_needs",
  "has_transportation": "transportation_needs",
  "has_a_car": "transportation_needs",
  "ethnicity": "race", // Temporarily map ethnicity to race until we have proper ethnicity data
  "zip_code": "age_range", // Temporary mapping - will be replaced with real data in future
  "veteran_status": "age_range", // Temporary mapping - will be replaced with real data in future
  "education_level": "age_range", // Temporary mapping - will be replaced with real data in future
  "utilities_insecurity": "utility_needs" // Map to correct field name in current data
};

// Helper function to get mapped field value from an item
function getMappedFieldValue(item: any, fieldName: string): any {
  // First try the standardized field name
  if (item[fieldName] !== undefined) {
    return item[fieldName];
  }
  
  // If not found, check if there's a mapping for this field name
  if (fieldNameMapping[fieldName] && item[fieldNameMapping[fieldName]] !== undefined) {
    return item[fieldNameMapping[fieldName]];
  }
  
  // If still not found, return undefined
  return undefined;
}

interface PieChartDataItem {
  id: string;
  label: string;
  value: number;
  color?: string;
  percentage?: number;
}

interface HrsnPieChartProps {
  data?: any[];
  title: string;
  fieldName: string;
  colorScheme?: string;
  showTooltip?: boolean;
  height?: number;
  subtitle?: string;
  showLegend?: boolean;
  displayMode?: "count" | "percentage";
  onDisplayModeChange?: (mode: "count" | "percentage") => void;
}

export default function HrsnPieChartV31({
  data = [],
  title,
  fieldName,
  colorScheme = "blues",
  showTooltip = true,
  height = 300,
  subtitle,
  showLegend = true,
  displayMode = "count",
  onDisplayModeChange
}: HrsnPieChartProps) {
  // Local display mode state if no external control is provided
  const [localDisplayMode, setLocalDisplayMode] = useState<"count" | "percentage">(displayMode);
  
  // Use either external or local display mode
  const currentDisplayMode = onDisplayModeChange ? displayMode : localDisplayMode;
  
  // Get the current chart theme
  const { theme, getColorForIndex } = useChartTheme();

  // Reference to the chart container for export
  const chartRef = useRef<HTMLDivElement>(null);
  
  // State for pie chart data
  const [pieData, setPieData] = useState<PieChartDataItem[]>([]);
  
  // Update display mode when prop changes
  useEffect(() => {
    if (onDisplayModeChange) {
      // If we have external control, update only when the prop changes
      setLocalDisplayMode(displayMode);
    }
  }, [displayMode, onDisplayModeChange]);
  
  // Process the data when it changes or when display mode changes
  useEffect(() => {
    if (!data || data.length === 0) {
      setPieData([]);
      return;
    }
    
    // Count occurrences of each value for the given field
    const valueCounts: Record<string, number> = {};
    
    // Also save the distribution in percentage
    const valuePercent: Record<string, number> = {};
    
    // Count total for the field to calculate percentages
    let total = 0;
    
    // Process each data item
    data.forEach(item => {
      // Get the field value using our mapping function
      const value = getMappedFieldValue(item, fieldName);
      
      if (value !== undefined && value !== null && value !== "") {
        const stringValue = String(value);
        valueCounts[stringValue] = (valueCounts[stringValue] || 0) + 1;
        total++;
      }
    });
    
    // Calculate percentages
    Object.keys(valueCounts).forEach(key => {
      valuePercent[key] = total > 0 ? (valueCounts[key] / total) * 100 : 0;
    });
    
    // Create pie chart data
    const newPieData: PieChartDataItem[] = Object.keys(valueCounts).map((key, index) => ({
      id: key,
      label: key,
      value: currentDisplayMode === "percentage" ? parseFloat(valuePercent[key].toFixed(1)) : valueCounts[key],
      color: getColorForIndex(index),
      percentage: parseFloat(valuePercent[key].toFixed(1))
    }));
    
    // Sort by value in descending order
    newPieData.sort((a, b) => b.value - a.value);
    
    setPieData(newPieData);
  }, [data, fieldName, currentDisplayMode, getColorForIndex]);
  
  // Handle display mode toggle
  const handleDisplayModeToggle = () => {
    const newMode = currentDisplayMode === "count" ? "percentage" : "count";
    if (onDisplayModeChange) {
      onDisplayModeChange(newMode);
    } else {
      setLocalDisplayMode(newMode);
    }
  };
  
  // Export functions
  const downloadChartAsCSV = (chartTitle: string, chartData: PieChartDataItem[]) => {
    if (chartData.length === 0) {
      console.error("No data available to export");
      return;
    }
    
    try {
      // Create CSV content
      const headers = ["Category", "Count", "Percentage"];
      let csvContent = headers.join(',') + '\n';
      
      chartData.forEach(item => {
        const row = [
          `"${item.id.replace(/"/g, '""')}"`,
          item.value,
          item.percentage + '%'
        ].join(',');
        csvContent += row + '\n';
      });
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${chartTitle.replace(/\s+/g, '_')}_data.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
    }
  };
  
  const downloadChartAsExcel = (chartTitle: string, chartData: PieChartDataItem[]) => {
    if (chartData.length === 0) {
      console.error("No data available to export");
      return;
    }
    
    try {
      // Prepare data for Excel
      const excelData = chartData.map(item => ({
        Category: item.id,
        Count: item.value,
        Percentage: item.percentage + '%'
      }));
      
      // Create a worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Create a workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      
      // Generate Excel file and trigger download
      XLSX.writeFile(wb, `${chartTitle.replace(/\s+/g, '_')}_data.xlsx`);
    } catch (error) {
      console.error("Error exporting Excel:", error);
    }
  };
  
  const downloadChartAsJson = (chartTitle: string, chartData: PieChartDataItem[]) => {
    if (chartData.length === 0) {
      console.error("No data available to export");
      return;
    }
    
    try {
      const jsonStr = JSON.stringify(chartData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${chartTitle.replace(/\s+/g, '_')}_data.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting JSON:", error);
    }
  };
  
  const downloadChartAsPDF = (chartTitle: string, chartData: PieChartDataItem[]) => {
    if (chartData.length === 0) {
      console.error("No data available to export");
      return;
    }
    
    try {
      // Create PDF document
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text(chartTitle, 20, 20);
      
      // Create table data
      const tableData = chartData.map(item => [
        item.id,
        String(item.value),
        item.percentage + '%'
      ]);
      
      // Generate the table
      (doc as any).autoTable({
        head: [['Category', 'Count', 'Percentage']],
        body: tableData,
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202], textColor: 255 },
        styles: { overflow: 'linebreak', cellWidth: 'auto' }
      });
      
      // Save the PDF
      doc.save(`${chartTitle.replace(/\s+/g, '_')}_data.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };
  
  const printChart = (chartTitle: string, chartData: PieChartDataItem[]) => {
    if (chartData.length === 0) {
      console.error("No data available to print");
      return;
    }
    
    try {
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        console.error("Failed to open print window. Check if pop-ups are blocked.");
        return;
      }
      
      // Generate HTML content
      let tableRows = '';
      chartData.forEach((item, index) => {
        const rowClass = index % 2 === 0 ? 'even-row' : 'odd-row';
        tableRows += `
          <tr class="${rowClass}">
            <td>${item.id}</td>
            <td>${item.value}</td>
            <td>${item.percentage}%</td>
          </tr>
        `;
      });
      
      // Create full HTML document
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${chartTitle} - Print View</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { font-size: 18px; margin-bottom: 15px; }
            table { border-collapse: collapse; width: 100%; }
            th { background-color: #4285f4; color: white; padding: 8px; text-align: left; }
            td { border: 1px solid #ddd; padding: 8px; }
            .even-row { background-color: #f9f9f9; }
            .odd-row { background-color: white; }
            @media print {
              h1 { margin-top: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px;">
            <button onclick="window.print()" style="padding: 8px 16px; background-color: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Print
            </button>
            <button onclick="window.close()" style="padding: 8px 16px; margin-left: 10px; background-color: #f1f1f1; border: none; border-radius: 4px; cursor: pointer;">
              Close
            </button>
          </div>
          <h1>${chartTitle}</h1>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
        </html>
      `;
      
      // Write to the window and trigger print
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Auto-print after the content loads - Give more time for content to render
      printWindow.onload = function() {
        setTimeout(() => {
          try {
            printWindow.focus(); // Focus the window before printing
            printWindow.print();
          } catch (e) {
            console.error("Error during print:", e);
          }
        }, 500); // Increased delay for better stability
      };
      
    } catch (error) {
      console.error("Error printing data:", error);
    }
  };
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          {title}
          <Button 
            variant="outline"
            size="sm"
            onClick={handleDisplayModeToggle}
            className="ml-2"
          >
            {currentDisplayMode === "count" ? "Show %" : "Show Count"}
          </Button>
        </CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
      </CardHeader>
      <CardContent className="px-2 py-0">
        <div style={{ height: `${height}px` }} ref={chartRef}>
          {pieData.length > 0 ? (
            <div className="relative h-full">
              <ResponsivePie
                data={pieData}
                margin={{ top: 10, right: 80, bottom: 10, left: 10 }}
                innerRadius={0.5}
                padAngle={0.7}
                cornerRadius={3}
                colors={{ scheme: colorScheme }}
                borderWidth={1}
                borderColor={{
                  from: 'color',
                  modifiers: [['darker', 0.2]]
                }}
                enableArcLabels={true}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor="#ffffff"
                arcLinkLabelsSkipAngle={10}
                arcLinkLabelsThickness={2}
                arcLinkLabelsColor={{ from: 'color' }}
                arcLabelsRadiusOffset={0.55}
                arcLabelsTextProps={{
                  textAnchor: 'middle',
                  dominantBaseline: 'middle'
                }}
                tooltip={({ datum }) => (
                  <div
                    style={{
                      background: 'white',
                      padding: '9px 12px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    }}
                  >
                    <strong>{datum.id}: </strong>
                    {currentDisplayMode === "percentage"
                      ? `${datum.value}%`
                      : `${datum.value} (${datum.data.percentage}%)`}
                  </div>
                )}
                legends={showLegend ? [
                  {
                    anchor: 'right',
                    direction: 'column',
                    justify: false,
                    translateX: 0,
                    translateY: 0,
                    itemsSpacing: 0,
                    itemWidth: 100,
                    itemHeight: 20,
                    itemTextColor: '#999',
                    itemDirection: 'left-to-right',
                    itemOpacity: 1,
                    symbolSize: 10,
                    symbolShape: 'circle',
                  }
                ] : []}
                theme={theme}
              />
              
              {/* Export and Enlarge buttons */}
              <div className="absolute top-0 right-0 p-1 flex space-x-1">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon" className="h-7 w-7" title="View Full Chart">
                      <Maximize className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>{title}</DialogTitle>
                    </DialogHeader>
                    <div className="h-[calc(60vh-100px)]">
                      <ResponsivePie
                        data={pieData}
                        margin={{ top: 40, right: 120, bottom: 40, left: 40 }}
                        innerRadius={0.5}
                        padAngle={0.7}
                        cornerRadius={3}
                        colors={{ scheme: colorScheme }}
                        borderWidth={1}
                        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                        enableArcLabels={true}
                        arcLabelsSkipAngle={10}
                        arcLabelsTextColor="#ffffff"
                        tooltip={({ datum }) => (
                          <div
                            style={{
                              background: 'white',
                              padding: '9px 12px',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                            }}
                          >
                            <strong>{datum.id}: </strong>
                            {currentDisplayMode === "percentage"
                              ? `${datum.value}%`
                              : `${datum.value} (${datum.data.percentage}%)`}
                          </div>
                        )}
                        legends={showLegend ? [
                          {
                            anchor: 'right',
                            direction: 'column',
                            justify: false,
                            translateX: 0,
                            translateY: 0,
                            itemsSpacing: 5,
                            itemWidth: 100,
                            itemHeight: 20,
                            itemTextColor: '#999',
                            itemDirection: 'left-to-right',
                            itemOpacity: 1,
                            symbolSize: 12,
                            symbolShape: 'circle',
                          }
                        ] : []}
                        theme={theme}
                      />
                    </div>
                    
                    {/* Data Table */}
                    <div className="border rounded-md mt-4 p-2">
                      <h4 className="font-semibold mb-2 flex items-center">
                        <Table className="w-4 h-4 mr-2" />
                        Full Data Table ({pieData.length} items)
                      </h4>
                      <div className="max-h-[30vh] overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="p-2 text-left">Category</th>
                              <th className="p-2 text-left">Count</th>
                              <th className="p-2 text-left">Percentage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pieData.map((item, index) => (
                              <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                                <td className="p-2">{item.id}</td>
                                <td className="p-2">{item.value}</td>
                                <td className="p-2">{item.percentage}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    {/* Export Buttons */}
                    <div className="mt-4 flex justify-between">
                      <div className="text-xs text-muted-foreground">
                        Data includes all items, regardless of display settings
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => downloadChartAsCSV(title, pieData)}
                          variant="outline"
                          size="sm"
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          Export as CSV
                        </Button>
                        <Button 
                          onClick={() => downloadChartAsExcel(title, pieData)}
                          variant="outline"
                          size="sm"
                        >
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Export as Excel
                        </Button>
                        <Button 
                          onClick={() => downloadChartAsJson(title, pieData)}
                          variant="outline"
                          size="sm"
                        >
                          <FileJson className="w-4 h-4 mr-2" />
                          Export as JSON
                        </Button>
                        <Button 
                          onClick={() => downloadChartAsPDF(title, pieData)}
                          variant="outline"
                          size="sm"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Export as PDF
                        </Button>
                        <Button 
                          onClick={() => printChart(title, pieData)}
                          variant="outline"
                          size="sm"
                        >
                          <Printer className="w-4 h-4 mr-2" />
                          Print
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <div className="dropdown">
                  <Button variant="outline" size="icon" className="h-7 w-7" title="Export Chart">
                    <FileDown className="h-4 w-4" />
                  </Button>
                  <div className="dropdown-content">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => downloadChartAsCSV(title, pieData)}
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      Export as CSV
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => downloadChartAsExcel(title, pieData)}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Export as Excel
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => downloadChartAsJson(title, pieData)}
                    >
                      <FileJson className="w-4 h-4 mr-2" />
                      Export as JSON
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => downloadChartAsPDF(title, pieData)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Export as PDF
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => printChart(title, pieData)}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground text-sm">No data available</p>
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Dropdown menu styling */}
      <style jsx>{`
        .dropdown {
          position: relative;
          display: inline-block;
        }
        .dropdown-content {
          display: none;
          position: absolute;
          right: 0;
          background-color: white;
          min-width: 160px;
          box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
          z-index: 1;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
        }
        .dropdown:hover .dropdown-content {
          display: block;
        }
      `}</style>
    </Card>
  );
}