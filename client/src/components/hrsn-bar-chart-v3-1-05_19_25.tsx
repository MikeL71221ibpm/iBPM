import React, { useState, useMemo, useRef } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Maximize } from "lucide-react";

// Define BarDataItem type
interface BarDataItem {
  id: string;
  value: number;
  percentage?: number;
  [key: string]: string | number | undefined;
}

interface HrsnBarChartProps {
  data: BarDataItem[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  title?: string;
  colorScheme?: string;
  groupMode?: "grouped" | "stacked";
  keys?: string[];
  indexBy?: string;
  showValues?: boolean;
  showGridLines?: boolean;
  tooltipFormat?: (value: number) => string;
  displayMode?: "count" | "percentage";
  onDisplayModeChange?: (mode: "count" | "percentage") => void;
}

export default function HrsnBarChartV31({
  data,
  xAxisLabel = "",
  yAxisLabel = "",
  title = "",
  colorScheme = "blues",
  groupMode = "stacked",
  keys = ["value"],
  indexBy = "id",
  showValues = true,
  showGridLines = true,
  tooltipFormat,
  displayMode = "count",
  onDisplayModeChange
}: HrsnBarChartProps) {
  
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
      const headers = Object.keys(chartData[0])
        .filter(key => typeof chartData[0][key] === 'string' || typeof chartData[0][key] === 'number')
        .map(key => key.charAt(0).toUpperCase() + key.slice(1));
      
      // Create rows for the table
      const rows = chartData.map(item => {
        return Object.keys(item)
          .filter(key => typeof item[key] === 'string' || typeof item[key] === 'number')
          .map(key => item[key]);
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
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      // Save the PDF
      doc.save(`${chartTitle.replace(/\s+/g, '_')}_data.pdf`);
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
  
  // Create formatted data based on current display mode
  const formattedData = useMemo(() => {
    if (!data || data.length === 0) {
      return [{ id: "No data", value: 0 }];
    }
    
    return data.map(item => {
      const dataItem = { ...item };
      
      // If in percentage mode, replace the value with percentage
      if (currentDisplayMode === "percentage" && typeof item.percentage === 'number') {
        // Update keys with percentage values 
        keys.forEach(key => {
          if (key === 'value' && typeof item.percentage === 'number') {
            dataItem[key] = item.percentage;
          }
        });
      }
      
      return dataItem;
    });
  }, [data, currentDisplayMode, keys]);
  
  // Format value for tooltip and labels
  const formatValue = (value: number) => {
    if (currentDisplayMode === "percentage") {
      return `${value}%`;
    }
    
    if (tooltipFormat) {
      return tooltipFormat(value);
    }
    
    return value.toString();
  };
  
  // Handle display mode toggle
  const handleDisplayModeToggle = () => {
    const newMode = currentDisplayMode === "count" ? "percentage" : "count";
    if (onDisplayModeChange) {
      onDisplayModeChange(newMode);
    } else {
      setLocalDisplayMode(newMode);
    }
  };
  
  // Dialog for expanded view
  const [expandedView, setExpandedView] = useState(false);

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
            
            {/* Maximize button */}
            <Dialog open={expandedView} onOpenChange={setExpandedView}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="hover:bg-accent">
                  <Maximize className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[80vh]">
                <DialogHeader>
                  <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="h-[calc(80vh-100px)] bg-white rounded-md p-4 border">
                  <ResponsiveBar
                    data={formattedData}
                    keys={keys}
                    indexBy={indexBy}
                    margin={{ top: 50, right: 50, bottom: 50, left: 60 }}
                    padding={0.3}
                    groupMode={groupMode}
                    layout="vertical"
                    valueScale={{ type: 'linear' }}
                    indexScale={{ type: 'band', round: true }}
                    colors={{ scheme: colorScheme as any }}
                    borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: xAxisLabel,
                      legendPosition: 'middle',
                      legendOffset: 45,
                      truncateTickAt: 0
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: yAxisLabel,
                      legendPosition: 'middle',
                      legendOffset: -45,
                      truncateTickAt: 0
                    }}
                    labelSkipWidth={12}
                    labelSkipHeight={12}
                    labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                    tooltip={({ id, value, color }) => (
                      <div
                        style={{
                          padding: 12,
                          background: '#fff',
                          boxShadow: '0 3px 9px rgba(0, 0, 0, 0.15)',
                          borderRadius: 4,
                        }}
                      >
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            background: color,
                            display: 'inline-block',
                            marginRight: 7,
                          }}
                        />
                        <span style={{ fontWeight: 500 }}>{id}</span>
                        <span>{': '}</span>
                        <span>{formatValue(value)}</span>
                      </div>
                    )}
                    enableGridY={showGridLines}
                    animate={true}
                  />
                </div>
                
                <div className="flex justify-end gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadChartAsCSV(title, data)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadChartAsExcel(title, data)}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadChartAsJson(title, data)}
                  >
                    <FileJson className="w-4 h-4 mr-2" />
                    JSON
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadChartAsPDF(title, data)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
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
          <ResponsiveBar
            data={formattedData}
            keys={keys}
            indexBy={indexBy}
            margin={{ top: 30, right: 30, bottom: 50, left: 60 }}
            padding={0.3}
            groupMode={groupMode}
            layout="vertical"
            valueScale={{ type: 'linear' }}
            indexScale={{ type: 'band', round: true }}
            colors={{ scheme: colorScheme as any }}
            borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: xAxisLabel,
              legendPosition: 'middle',
              legendOffset: 32,
              truncateTickAt: 0
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: yAxisLabel,
              legendPosition: 'middle',
              legendOffset: -40,
              truncateTickAt: 0
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            tooltip={({ id, value, color }) => (
              <div
                style={{
                  padding: 12,
                  background: '#fff',
                  boxShadow: '0 3px 9px rgba(0, 0, 0, 0.15)',
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    background: color,
                    display: 'inline-block',
                    marginRight: 7,
                  }}
                />
                <span style={{ fontWeight: 500 }}>{id}</span>
                <span>{': '}</span>
                <span>{formatValue(value)}</span>
              </div>
            )}
            enableGridY={showGridLines}
            animate={true}
          />
        </div>
      </CardContent>
    </Card>
  );
}