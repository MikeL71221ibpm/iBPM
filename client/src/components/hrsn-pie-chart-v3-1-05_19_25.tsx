import React, { useState, useMemo, useRef } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileJson, FileSpreadsheet, FileText, Maximize, Printer, Table, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Define PieDataItem type
interface PieDataItem {
  id: string;
  value: number;
  label?: string;
  percentage?: number;
  [key: string]: string | number | undefined;
}

interface HrsnPieChartProps {
  data: PieDataItem[];
  title?: string;
  colorScheme?: string;
  showLegend?: boolean;
  showValues?: boolean;
  tooltipFormat?: (value: number) => string;
  displayMode?: "count" | "percentage";
  onDisplayModeChange?: (mode: "count" | "percentage") => void;
}

export default function HrsnPieChartV31({
  data,
  title = "",
  colorScheme = "blues" as any,
  showLegend = true,
  showValues = true,
  tooltipFormat,
  displayMode = "count",
  onDisplayModeChange
}: HrsnPieChartProps) {
  
  // Local display mode state if no external control is provided
  const [localDisplayMode, setLocalDisplayMode] = useState<"count" | "percentage">(displayMode);
  
  // Use either external or local display mode
  const currentDisplayMode = onDisplayModeChange ? displayMode : localDisplayMode;
  
  // Reference to the chart container for export
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Export functions
  const downloadChartAsCSV = (chartTitle: string, chartData: any[]) => {
    if (chartData.length === 0) {
      console.error("No data available to export");
      return;
    }
    
    try {
      // Create CSV content
      const headers = Object.keys(chartData[0]).filter(key => 
        typeof chartData[0][key] === 'string' || 
        typeof chartData[0][key] === 'number'
      );
      
      let csvContent = headers.join(',') + '\n';
      
      chartData.forEach(item => {
        const row = headers.map(header => {
          const value = item[header];
          // Handle quotes in string values
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
        }).join(',');
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
  
  const downloadChartAsExcel = (chartTitle: string, chartData: any[]) => {
    if (chartData.length === 0) {
      console.error("No data available to export");
      return;
    }
    
    try {
      // Create a worksheet
      const ws = XLSX.utils.json_to_sheet(chartData);
      
      // Create a workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      
      // Generate Excel file and trigger download
      XLSX.writeFile(wb, `${chartTitle.replace(/\s+/g, '_')}_data.xlsx`);
    } catch (error) {
      console.error("Error exporting Excel:", error);
    }
  };
  
  const downloadChartAsJson = (chartTitle: string, chartData: any[]) => {
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
  
  const downloadChartAsPDF = (chartTitle: string, chartData: any[]) => {
    if (chartData.length === 0) {
      console.error("No data available to export");
      return;
    }
    
    try {
      // Create PDF document with landscape orientation
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add title
      doc.setFontSize(18);
      doc.setTextColor(0, 51, 102);
      doc.text(chartTitle, 20, 20);
      
      // Add date
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${dateStr}`, 20, 28);
      
      // Filter to essential columns for display
      const essentialKeys = ['id', 'value', 'percentage'];
      
      // Create headers for the table
      const headers = essentialKeys.map(key => {
        if (key === 'id') return 'Category';
        if (key === 'value') return 'Count';
        if (key === 'percentage') return 'Percentage (%)';
        return key.charAt(0).toUpperCase() + key.slice(1);
      });
      
      // Create rows for the table
      const rows = chartData.map(item => {
        return essentialKeys.map(key => {
          const value = item[key];
          if (value === null || value === undefined) return '';
          if (key === 'percentage' && typeof value === 'number') return `${value.toFixed(1)}%`;
          return value;
        });
      });
      
      // Generate the table
      (doc as any).autoTable({
        head: [headers],
        body: rows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
        styles: { 
          overflow: 'linebreak', 
          cellWidth: 'auto', 
          fontSize: 10,
          cellPadding: 3
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: { 
          0: { cellWidth: 60 },
          1: { cellWidth: 30, halign: 'right' },
          2: { cellWidth: 30, halign: 'right' } 
        }
      });
      
      // Save the PDF with current timestamp to avoid caching issues
      const timestamp = Date.now();
      doc.save(`${chartTitle.replace(/\s+/g, '_')}_data_${timestamp}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };
  
  // Print Chart function - captures the chart as PNG
  const printChart = async () => {
    if (!chartRef.current) {
      console.error("Chart reference is null");
      return;
    }
    
    try {
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: 'white',
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true, // Allow cross-origin images
      });
      
      // Create a download link
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error("Error capturing chart:", error);
    }
  };
  
  // Create a formatted data version that works with the current display mode
  const formattedData = useMemo(() => {
    if (!data || data.length === 0) {
      return [{ id: "No data", label: "No data", value: 100 }];
    }
    
    return data.map(item => {
      // Ensure value is always a number
      const value = currentDisplayMode === "percentage" 
        ? (typeof item.percentage === 'number' ? item.percentage : 0)
        : (typeof item.value === 'number' ? item.value : 0);
        
      return {
        id: item.id,
        label: item.label || item.id,
        value: value
      };
    });
  }, [data, currentDisplayMode]);
  
  // Create a stable version of the data for the download dialog
  const downloadDialogData = useMemo(() => {
    if (!data || data.length === 0) {
      return [{ id: "No data", label: "No data", value: 100 }];
    }
    
    // Always use count values for the download dialog for consistency
    return data.map(item => {
      return {
        id: item.id,
        label: item.label || item.id,
        value: typeof item.value === 'number' ? item.value : 0
      };
    });
  }, [data]);
  
  // Handle display mode toggle
  const handleDisplayModeToggle = () => {
    const newMode = currentDisplayMode === "count" ? "percentage" : "count";
    if (onDisplayModeChange) {
      onDisplayModeChange(newMode);
    } else {
      setLocalDisplayMode(newMode);
    }
  };
  
  // Custom label formatter to prevent NaN in animations
  const formatLabel = (d: any) => {
    // During animation, ensure we always return a valid string
    if (d === null || d === undefined || isNaN(d.value) || typeof d.value !== 'number') {
      return currentDisplayMode === "percentage" ? "0%" : "0";
    }
    
    const formattedValue = Math.max(0, Number(d.value)); // Ensure it's a positive number
    return currentDisplayMode === "percentage" ? `${formattedValue}%` : `${formattedValue}`;
  };

  return (
    <Card className="w-full h-full">
      <CardContent className="p-0 flex flex-col h-full">
        <div className="p-4 flex justify-between items-center border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          
          <div className="flex items-center gap-2">
            {/* Print Chart button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="hover:bg-accent"
              onClick={printChart}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Chart
            </Button>
            
            {/* Maximize dialog for expanded view */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="hover:bg-accent">
                  <Maximize className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[80vh]">
                <DialogHeader>
                  <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="h-[calc(60vh-100px)] bg-white rounded-md p-4 border">
                  <ResponsivePie
                    data={downloadDialogData}
                    margin={{ top: 40, right: 120, bottom: 40, left: 40 }}
                    innerRadius={0.5}
                    padAngle={0.7}
                    cornerRadius={3}
                    colors={{ scheme: colorScheme as any }}
                    borderWidth={1}
                    borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                    enableArcLabels={true}
                    arcLabelsSkipAngle={10}
                    arcLabelsTextColor="#ffffff"
                    animate={false}
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
                  />
                </div>
                
                {/* Data Table */}
                <div className="border rounded-md mt-4 p-2">
                  <h4 className="font-semibold mb-2 flex items-center">
                    <Table className="w-4 h-4 mr-2" />
                    Full Data Table ({data.length} items)
                  </h4>
                  <div className="max-h-[20vh] overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="p-2 text-left">ID</th>
                          <th className="p-2 text-left">Count</th>
                          <th className="p-2 text-left">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((item, index) => (
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
                
                {/* Export buttons */}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button 
                    onClick={() => {
                      try {
                        if (window.print) {
                          window.print();
                        } else {
                          console.error("Print functionality not available");
                        }
                      } catch (e) {
                        console.error("Error printing:", e);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  
                  <Button 
                    onClick={() => downloadChartAsPDF(title, data)}
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export as PDF
                  </Button>
                  
                  <Button 
                    onClick={() => downloadChartAsExcel(title, data)}
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel (All Data)
                  </Button>
                  
                  <Button 
                    onClick={() => downloadChartAsCSV(title, data)}
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    CSV (Summary)
                  </Button>
                  
                  <Button 
                    onClick={() => downloadChartAsJson(title, data)}
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center"
                  >
                    <FileJson className="w-4 h-4 mr-2" />
                    JSON
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Display mode toggle button */}
        {onDisplayModeChange !== undefined && (
          <div className="px-4 pt-2 flex justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDisplayModeToggle}
              className="text-xs"
            >
              Show {currentDisplayMode === "count" ? "Percentages" : "Counts"}
            </Button>
          </div>
        )}
        
        {/* Main chart area */}
        <div ref={chartRef} className="p-4 flex-grow min-h-[250px]">
          <ResponsivePie
            data={formattedData}
            margin={{ top: 30, right: 30, bottom: 30, left: 30 }}
            innerRadius={0.5}
            padAngle={0.7}
            cornerRadius={3}
            activeOuterRadiusOffset={8}
            borderWidth={1}
            borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="#333333"
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: 'color' }}
            colors={{ scheme: colorScheme as any }}
            legends={showLegend ? [
              {
                anchor: 'right',
                direction: 'column',
                justify: false,
                translateX: 0,
                translateY: 0,
                itemsSpacing: 5,
                itemWidth: 80,
                itemHeight: 20,
                itemTextColor: '#999',
                itemDirection: 'left-to-right',
                itemOpacity: 1,
                symbolSize: 12,
                symbolShape: 'circle',
              }
            ] : []}
            tooltip={({ datum }) => (
              <div
                style={{
                  background: 'white',
                  padding: '9px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '3px',
                }}>
                  <div style={{ 
                    width: 12, 
                    height: 12, 
                    backgroundColor: datum.color,
                    marginRight: 5,
                  }} />
                  <strong>{datum.id}:</strong>
                </div>
                {currentDisplayMode === "percentage" 
                  ? <div>{datum.value}%</div>
                  : <div>{datum.value}</div>
                }
              </div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}