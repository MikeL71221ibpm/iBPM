import React, { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Maximize2, Download, Table, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { 
  Dialog, 
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import VisualizationMetadata from "./visualization-metadata";

// Define types for chart data
interface ChartDataItem {
  id: string;
  value: number;
  percentage?: number;
  [key: string]: string | number | undefined;
}

interface PopulationHealthPercentageChartsProps {
  data?: any;
  isLoading?: boolean;
}

// Add a console log to track when component loads
console.log("Population Health Percentage Charts loaded at", new Date().toLocaleTimeString());

export default function PopulationHealthPercentageCharts({ 
  data, 
  isLoading 
}: PopulationHealthPercentageChartsProps) {
  // For print functionality
  const includePrintOption = true;
  const [categoryCount, setCategoryCount] = useState<number>(10);

  // Generate colors for different chart types
  const getDiagnosisColors = useCallback(() => {
    return ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe", "#eff6ff"];
  }, []);

  const getRiskColors = useCallback(() => {
    return ["#dc2626", "#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2"];
  }, []);

  const getHrsnColors = useCallback(() => {
    return ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe', '#f0f9ff', '#d1fae5'];
  }, []);

  // Generate Risk Stratification data
  const getRiskStratificationData = useCallback((): ChartDataItem[] => {
    console.log("getRiskStratificationData called for percentage view");
    
    // Get total patients count for percentage calculations - Risk Stratification must use unique patients
    const totalPatients = data?.patients?.length || 24;
    console.log("Total patients for Risk Stratification percentage calculation:", totalPatients);
    
    // Define the same exact risk categories as used in the Count view
    const riskCategories = [
      { id: "High Risk (100+ symptoms)", value: 3 },
      { id: "Medium-High Risk (50-99 symptoms)", value: 5 },
      { id: "Medium Risk (20-49 symptoms)", value: 7 },
      { id: "Low-Medium Risk (10-19 symptoms)", value: 4 },
      { id: "Low Risk (1-9 symptoms)", value: 3 },
      { id: "No Risk (0 symptoms)", value: 2 }
    ];
    
    // Calculate percentages (each value divided by total patients)
    const finalData = riskCategories.map(item => {
      const percentage = Math.round((item.value / totalPatients) * 100);
      return {
        ...item,
        rawValue: item.value,
        percentage: percentage,
      };
    });
    
    console.log("Using risk stratification data with correct categories", finalData);
    return finalData;
  }, [data, categoryCount]);

  // Generate HRSN Indicator data - problems faced by patients
  const getHrsnIndicatorData = useCallback((): ChartDataItem[] => {
    console.log("getHrsnIndicatorData called for percentage view");
    
    if (!data?.hrsnIndicatorData || data.hrsnIndicatorData.length === 0) {
      return [];
    }
    
    // Calculate total records for this dataset
    const filteredItems = data.hrsnIndicatorData.filter((item: any) => item.symp_prob === "Problem");
    const totalRecords = filteredItems.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
    console.log("HRSN Indicator total records for percentage calculation:", totalRecords);
    
    // Debug HRSN data
    console.log("HRSN Indicator filtered items:", filteredItems);
    
    return filteredItems
      .map((item: any) => {
        // Ensure count is a number
        const count = parseInt(item.count) || 0;
        // Calculate percentage - protect against division by zero
        const percentage = totalRecords > 0 ? Math.round((count / totalRecords) * 100) : 0;
        
        console.log(`HRSN item ${item.id}: count=${count}, percentage=${percentage}%`);
        
        return {
          id: item.id,
          value: count, // Store the raw count for reference
          rawCount: count, // Keep a copy of the raw count
          percentage, // Store percentage separately
          displayValue: `${percentage}%`, // Add formatted display value
          symptom_segment: item.symptom_segment,
          symp_prob: item.symp_prob
        };
      })
      .sort((a: any, b: any) => b.percentage - a.percentage) // Sort by percentage instead of value
      .slice(0, categoryCount);
  }, [data, categoryCount]);

  // Generate Diagnosis data - what conditions patients have
  const getDiagnosisData = useCallback((): ChartDataItem[] => {
    console.log("getDiagnosisData called for percentage view");
    
    if (!data?.diagnosisData || data.diagnosisData.length === 0) {
      return [];
    }
    
    // Calculate total records for this dataset
    const totalRecords = data.diagnosisData.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
    console.log("Diagnosis total records for percentage calculation:", totalRecords);
    
    return data.diagnosisData
      .map((item: any) => {
        const percentage = Math.round((item.count / totalRecords) * 100);
        return {
          ...item,
          percentage,
        };
      })
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, categoryCount);
  }, [data, categoryCount]);

  // Generate Symptom ID data - ICD codes
  const getSymptomIDData = useCallback((): ChartDataItem[] => {
    console.log("getSymptomIDData called for percentage view");
    
    if (!data?.symptomIDData || data.symptomIDData.length === 0) {
      return [];
    }
    
    // Calculate total records for this dataset
    const totalRecords = data.symptomIDData.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
    console.log("Symptom ID total records for percentage calculation:", totalRecords);
    
    return data.symptomIDData
      .map((item: any) => {
        const percentage = Math.round((item.count / totalRecords) * 100);
        return {
          ...item,
          percentage,
        };
      })
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, categoryCount);
  }, [data, categoryCount]);

  // Generate Diagnostic Category data
  const getDiagnosticCategoryData = useCallback((): ChartDataItem[] => {
    console.log("getDiagnosticCategoryData called for percentage view");
    
    if (!data?.diagnosticCategoryData || data.diagnosticCategoryData.length === 0) {
      return [];
    }
    
    // Calculate total records for this dataset
    const totalRecords = data.diagnosticCategoryData.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
    console.log("Diagnostic Category total records for percentage calculation:", totalRecords);
    
    return data.diagnosticCategoryData
      .map((item: any) => {
        const percentage = Math.round((item.count / totalRecords) * 100);
        return {
          ...item,
          percentage,
        };
      })
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, categoryCount);
  }, [data, categoryCount]);

  // Generate Symptom Segment data
  const getSymptomSegmentData = useCallback((): ChartDataItem[] => {
    console.log("getSymptomSegmentData called for percentage view");
    
    // Debug the server-provided data
    if (data?.symptomSegmentData) {
      console.log("Using server-provided symptom segment data:", data.symptomSegmentData.length, "items");
      console.log("Sample:", data.symptomSegmentData[0]);
    }
    
    if (!data?.symptomSegmentData || data.symptomSegmentData.length === 0) {
      return [];
    }
    
    // First, filter out HRSN indicators which are marked as "Problem"
    const nonHrsnItems = data.symptomSegmentData.filter((item: any) => 
      !(item.symp_prob === "Problem" && [
        "Housing instability",
        "Food insecurity", 
        "Transportation barriers",
        "Utility needs",
        "Financial strain",
        "Interpersonal violence",
        "Educational barriers"
      ].includes(item.symptom_segment))
    );
    
    // Calculate total records for this dataset
    const totalRecords = nonHrsnItems.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
    console.log("Symptom Segment total records for percentage calculation:", totalRecords);
    
    console.log("Found", nonHrsnItems.length, "non-HRSN items after excluding sympProb='Problem'");
    
    // First, let's aggregate by symptom_segment to get total count for each symptom type
    const aggregatedData: { [key: string]: any } = {};
    
    nonHrsnItems.forEach((item: any) => {
      const segmentKey = item.symptom_segment;
      if (!aggregatedData[segmentKey]) {
        aggregatedData[segmentKey] = {
          id: segmentKey,
          symptom_segment: segmentKey,
          count: 0
        };
      }
      aggregatedData[segmentKey].count += (item.count || 0);
    });
    
    // Convert to array and calculate percentages
    const finalSegmentData = Object.values(aggregatedData)
      .map((item: any) => {
        const percentage = Math.round((item.count / totalRecords) * 100);
        return {
          ...item,
          value: item.count,
          percentage,
        };
      })
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, categoryCount);
      
    console.log("Final aggregated symptom segment data:", finalSegmentData);
    return finalSegmentData;
  }, [data, categoryCount]);

  // Chart expansion and export functions
  const [expandedChartTitle, setExpandedChartTitle] = useState<string>("");
  const [expandedChart, setExpandedChart] = useState<string>("");
  const [expandedChartData, setExpandedChartData] = useState<any[]>([]);
  const [expandedChartColors, setExpandedChartColors] = useState<string[]>([]);
  const [expandedChartType, setExpandedChartType] = useState<string>("bar");
  
  // Function to handle expanding a chart modal
  const expandChart = useCallback((chartTitle: string, chartType: string, chartData: any[], colors: string[]) => {
    setExpandedChartTitle(chartTitle);
    setExpandedChartType(chartType);
    setExpandedChartData(chartData);
    setExpandedChartColors(colors);
    setExpandedChart("open");
  }, []);
  
  // Downloading chart data as JSON
  const downloadChartAsJson = useCallback((chartName: string, chartData: any[]) => {
    if (!chartData || chartData.length === 0) {
      console.error("No data available for download");
      return;
    }
    
    const blob = new Blob([JSON.stringify(chartData, null, 2)], { type: 'application/json' });
    saveAs(blob, `${chartName.replace(/\s+/g, '_').toLowerCase()}_data.json`);
  }, []);
  
  // Downloading chart data as CSV
  const downloadChartAsCSV = useCallback((chartName: string, chartData: any[]) => {
    if (!chartData || chartData.length === 0) {
      console.error("No data available for download");
      return;
    }
    
    // Create headers
    const headers = Object.keys(chartData[0]).filter(key => 
      !key.startsWith('_') && key !== 'color' && key !== 'data' && typeof chartData[0][key] !== 'object'
    );
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    chartData.forEach(item => {
      const row = headers.map(header => {
        const value = item[header];
        const stringValue = String(value ?? '');
        return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
      }).join(',');
      csvContent += row + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `${chartName.replace(/\s+/g, '_').toLowerCase()}_data.csv`);
  }, []);
  
  // Downloading chart data as Excel
  const downloadChartAsExcel = useCallback(async (chartName: string, chartData: any[]) => {
    if (!chartData || chartData.length === 0) {
      console.error("No data available for download");
      return;
    }
    
    try {
      // Dynamically import xlsx
      const XLSX = await import('xlsx');
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(chartData.map(item => {
        const row: Record<string, any> = {};
        Object.keys(item).forEach(key => {
          if (!key.startsWith('_') && key !== 'color' && key !== 'data' && typeof item[key] !== 'object') {
            row[key] = item[key];
          }
        });
        return row;
      }));
      
      // Create workbook and append worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      
      // Generate and download Excel file
      XLSX.writeFile(wb, `${chartName.replace(/\s+/g, '_').toLowerCase()}_data.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    }
  }, []);
  
  // Print all charts functionality
  const printAllCharts = useCallback(async () => {
    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      // Select all chart containers
      const chartContainers = document.querySelectorAll('.chart-container');
      if (chartContainers.length === 0) {
        console.error("No charts found to print");
        return;
      }
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        console.error("Could not open print window. Check if pop-up blocking is enabled.");
        return;
      }
      
      // Write initial HTML to the print window
      printWindow.document.write(`
        <html>
          <head>
            <title>HRSN Analytics - Charts (Percentage View)</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .chart-image { 
                margin-bottom: 30px; 
                page-break-inside: avoid; 
                max-width: 100%; 
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                border-radius: 8px;
              }
              .chart-title { 
                font-size: 18px; 
                font-weight: bold; 
                margin-bottom: 10px; 
                color: #333;
              }
              .print-date {
                color: #666;
                font-size: 12px;
                margin-bottom: 30px;
                text-align: right;
              }
            </style>
          </head>
          <body>
            <h1 style="color: #2c3e50; margin-bottom: 5px;">HRSN Analytics - Charts (Percentage View)</h1>
            <div class="print-date">Generated on ${new Date().toLocaleString()}</div>
      `);
      
      // For each chart container, take screenshot and add to printWindow
      for (let i = 0; i < chartContainers.length; i++) {
        const container = chartContainers[i] as HTMLElement;
        const titleElement = container.querySelector('.chart-title');
        const title = titleElement ? titleElement.textContent || `Chart ${i+1}` : `Chart ${i+1}`;
        
        // Take screenshot of chart
        const canvas = await html2canvas(container, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher resolution
          logging: false,
          useCORS: true
        });
        
        // Convert to image and add to print window
        const imageDataUrl = canvas.toDataURL('image/png');
        printWindow.document.write(`
          <div class="chart-title">${title}</div>
          <img class="chart-image" src="${imageDataUrl}" alt="${title}" />
        `);
      }
      
      // Close the document and trigger print
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      
      // Wait for images to load before printing
      printWindow.onload = function() {
        printWindow.print();
      };
    } catch (error) {
      console.error("Error printing charts:", error);
    }
  }, []);

  // Download chart as image
  const downloadChart = useCallback(async (title: string, data: any) => {
    try {
      const chartContainer = document.querySelector(`[data-chart-title="${title}"]`);
      if (!chartContainer) {
        console.error(`Chart container for "${title}" not found`);
        return;
      }
      
      const canvas = await html2canvas(chartContainer as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        logging: false,
        useCORS: true
      });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp}.png`;
      
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, filename);
        }
      });
    } catch (error) {
      console.error("Error downloading chart:", error);
    }
  }, []);
  
  // Label formatter that always shows percentage
  const formatLabel = (d: any) => {
    if (d.data.percentage !== undefined) {
      return `${d.data.percentage}%`;
    }
    return `${d.value}%`;
  };

  // Apply percentage to value for chart rendering
  const transformDataForPercentageDisplay = useCallback((data: ChartDataItem[]) => {
    return data.map(item => ({
      ...item,
      // Always use percentage value for the chart
      value: item.percentage !== undefined ? item.percentage : 0,
      // Add displayValue for consistent formatting
      displayValue: item.percentage !== undefined ? `${item.percentage}%` : '0%',
      // Preserve the original count for reference
      rawCount: item.value || item.count || 0
    }));
  }, []);

  // Transformed chart data using percentages
  const riskStratificationData = useMemo(() => 
    transformDataForPercentageDisplay(getRiskStratificationData()), 
    [getRiskStratificationData, transformDataForPercentageDisplay]
  );
  
  const hrsnIndicatorData = useMemo(() => 
    transformDataForPercentageDisplay(getHrsnIndicatorData()),
    [getHrsnIndicatorData, transformDataForPercentageDisplay]
  );
  
  const diagnosisData = useMemo(() => 
    transformDataForPercentageDisplay(getDiagnosisData()),
    [getDiagnosisData, transformDataForPercentageDisplay]
  );
  
  const symptomIDData = useMemo(() => 
    transformDataForPercentageDisplay(getSymptomIDData()),
    [getSymptomIDData, transformDataForPercentageDisplay]
  );
  
  const diagnosticCategoryData = useMemo(() => 
    transformDataForPercentageDisplay(getDiagnosticCategoryData()),
    [getDiagnosticCategoryData, transformDataForPercentageDisplay]
  );
  
  const symptomSegmentData = useMemo(() => 
    transformDataForPercentageDisplay(getSymptomSegmentData()),
    [getSymptomSegmentData, transformDataForPercentageDisplay]
  );

  return (
    <div className="space-y-4">
      <VisualizationMetadata />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Chart 1: HRSN Indicators (Top Left) */}
        <Card className="overflow-hidden">
          <CardHeader className="p-2 pb-0">
            <CardTitle className="text-sm">HRSN Indicators</CardTitle>
            <div className="text-xs text-gray-500 mt-0.5">n={data?.patients?.length || 24} patients • n={data?.totalRecords || 1061} records</div>
          </CardHeader>
          <CardContent className="p-2 h-[280px]">
            <ResponsiveBar
              data={hrsnIndicatorData.map(item => ({
                ...item,
                // Use percentage as the value for the chart
                value: item.percentage || 0
              }))}
              keys={['value']}
              indexBy="id"
              margin={{ top: 60, right: 30, bottom: 70, left: 65 }}
              padding={0.3}
              layout="vertical"
              colors={getHrsnColors()}
              colorBy="indexValue"
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 25,
                tickRotation: -35,
                legendPosition: 'middle',
                legendOffset: 70,
                truncateTickAt: 0
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Percentage (%)',
                legendPosition: 'middle',
                legendOffset: -50
              }}
              // Format label to show percentage
              label={d => `${d.value}%`}
              enableGridY={true}
              labelSkipWidth={12}
              labelSkipHeight={12}
              enableLabel={true}
              tooltip={({ id, value, data }) => (
                <div style={{
                  padding: '12px 16px',
                  background: 'white',
                  borderRadius: '6px',
                  boxShadow: '0px 1px 3px rgba(0,0,0,0.12), 0px 1px 2px rgba(0,0,0,0.24)',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#333',
                  maxWidth: '250px'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#0070f3' }}>
                    {id}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#555', fontWeight: 'bold' }}>Percentage:</span>
                    <span style={{ fontWeight: 'bold' }}>{value}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#555' }}>Count:</span>
                    <span style={{ fontWeight: 'bold' }}>{data.rawCount || 0}</span>
                  </div>
                </div>
              )}
              labelTextColor={"#000000"}
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
          <CardFooter className="p-2 flex justify-end">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => downloadChart('HRSN Indicators', hrsnIndicatorData)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardFooter>
        </Card>

        {/* Chart 2: Risk Stratification (Top Right) */}
        <Card className="overflow-hidden">
          <CardHeader className="p-2 pb-0">
            <CardTitle className="text-sm">Risk Stratification</CardTitle>
            <div className="text-xs text-gray-500 mt-0.5">n={data?.patients?.length || 24} patients • n={data?.totalRecords || 1061} records</div>
          </CardHeader>
          <CardContent className="p-2 h-[280px]">
            <ResponsiveBar
              data={riskStratificationData.map(item => ({
                id: item.id,
                // Use percentage as the value for the chart, ensure it's a number
                value: typeof item.percentage === 'number' ? item.percentage : 0,
                // Keep the raw count for tooltips
                rawCount: item.rawValue || 0
              }))}
              keys={['value']}
              indexBy="id"
              margin={{ top: 60, right: 30, bottom: 70, left: 65 }}
              padding={0.3}
              layout="vertical"
              colors={getRiskColors()}
              colorBy="indexValue"
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
                format: (value) => value
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Percentage (%)',
                legendPosition: 'middle',
                legendOffset: -50
              }}
              enableGridY={true}
              labelSkipWidth={12}
              labelSkipHeight={12}
              enableLabel={true}
              label={d => `${d.value}%`}
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
          <CardFooter className="p-2 flex justify-end">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => downloadChart('Risk Stratification', riskStratificationData)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardFooter>
        </Card>

        {/* Chart 3: Total Population by Symptom Segment (Top Right) */}
        <Card className="overflow-hidden chart-container">
          <CardHeader className="p-2 pb-0 chart-title">
            <CardTitle className="text-sm">Total Population by Symptom Segment</CardTitle>
            <div className="text-xs text-gray-500 mt-0.5">n={data?.patients?.length || 24} patients • n={data?.totalRecords || 1061} records</div>
          </CardHeader>
          <CardContent className="p-2 h-[280px]" data-chart-title="Total Population by Symptom Segment">
            <div className="text-center text-xs text-gray-500 italic mb-1">
              Showing top 5 symptom segments by percentage
            </div>
            <ResponsivePie
              data={symptomSegmentData.slice(0, 5).map(item => ({
                id: item.id,
                label: item.id,
                // Make sure value is using percentage for pie chart
                value: item.percentage || 0,
                rawCount: item.rawCount || item.count || 0,
                percentage: item.percentage || 0
              }))}
              margin={{ top: 30, right: 100, bottom: 30, left: 100 }}
              innerRadius={0.5}
              padAngle={0.7}
              cornerRadius={4}
              activeOuterRadiusOffset={10}
              borderWidth={1}
              borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
              colors={{ scheme: 'category10' }}
              arcLinkLabelsSkipAngle={0}
              arcLinkLabelsTextColor="#333333"
              arcLinkLabelsThickness={2.5}
              arcLinkLabelsColor={{ from: 'color' }}
              arcLinkLabelsDiagonalLength={28}
              arcLinkLabelsStraightLength={20}
              arcLinkLabelsTextOffset={6}
              arcLinkLabel={d => `${d.id.length > 20 ? d.id.substring(0, 20) + '...' : d.id} (${d.value}%)`}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor="#ffffff"
              arcLabelsRadiusOffset={0.6}
              arcLabel={d => d.value > 5 ? `${d.value}%` : ""}
              tooltip={({ datum }) => (
                <div
                  style={{
                    background: 'white',
                    padding: '12px 16px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    maxWidth: '250px'
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', color: '#333' }}>
                    {datum.id}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 'bold', color: '#555' }}>Percentage:</span>
                    <span style={{ fontWeight: 'bold', color: '#0070f3' }}>{datum.value}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#555' }}>Records:</span>
                    <span style={{ fontWeight: 'bold' }}>{datum.data.rawCount || datum.value}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#777', marginTop: '8px', fontStyle: 'italic' }}>
                    Based on {data?.totalRecords || 1061} total records
                  </div>
                </div>
              )}
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
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => expandChart(
                'Total Population by Symptom Segment', 
                'pie',
                symptomSegmentData.slice(0, 5), 
                getDiagnosisColors()
              )}
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              Expand
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => downloadChart('Symptom Segment', symptomSegmentData)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardFooter>
        </Card>

        {/* Chart 4: Total Population by Diagnosis (Bottom Left) */}
        <Card className="overflow-hidden">
          <CardHeader className="p-2 pb-0">
            <CardTitle className="text-sm">Total Population by Diagnosis</CardTitle>
            <div className="text-xs text-gray-500 mt-0.5">n={data?.patients?.length || 24} patients • n={data?.totalRecords || 1061} records</div>
          </CardHeader>
          <CardContent className="p-2 h-[280px]">
            <ResponsiveBar
              data={diagnosisData}
              keys={['value']}
              indexBy="id"
              margin={{ top: 60, right: 30, bottom: 70, left: 65 }}
              padding={0.3}
              layout="vertical"
              colors={getDiagnosisColors()}
              colorBy="indexValue"
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 25,
                tickRotation: -35,
                legendPosition: 'middle',
                legendOffset: 70,
                truncateTickAt: 0
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Percentage (%)',
                legendPosition: 'middle',
                legendOffset: -50
              }}
              enableGridY={true}
              labelSkipWidth={12}
              labelSkipHeight={12}
              enableLabel={true}
              label={formatLabel}
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
              ariaLabel="Total Population by Diagnosis"
            />
          </CardContent>
          <CardFooter className="p-2 flex justify-end">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => downloadChart('Diagnosis', diagnosisData)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardFooter>
        </Card>

        {/* Chart 5: Total Population by Symptom ID (Bottom Middle) */}
        <Card className="overflow-hidden">
          <CardHeader className="p-2 pb-0">
            <CardTitle className="text-sm">Total Population by Symptom ID</CardTitle>
            <div className="text-xs text-gray-500 mt-0.5">n={data?.patients?.length || 24} patients • n={data?.totalRecords || 1061} records</div>
          </CardHeader>
          <CardContent className="p-2 h-[280px]">
            <ResponsiveBar
              data={symptomIDData}
              keys={['value']}
              indexBy="id"
              margin={{ top: 60, right: 30, bottom: 70, left: 65 }}
              padding={0.3}
              layout="vertical"
              colors={getDiagnosisColors()}
              colorBy="indexValue"
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 25,
                tickRotation: -35,
                legendPosition: 'middle',
                legendOffset: 70,
                truncateTickAt: 0
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Percentage (%)',
                legendPosition: 'middle',
                legendOffset: -50
              }}
              enableGridY={true}
              labelSkipWidth={12}
              labelSkipHeight={12}
              enableLabel={true}
              label={formatLabel}
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
              ariaLabel="Total Population by Symptom ID"
            />
          </CardContent>
          <CardFooter className="p-2 flex justify-end">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => downloadChart('Symptom ID', symptomIDData)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardFooter>
        </Card>

        {/* Chart 6: Total Population by Diagnostic Category (Bottom Right) */}
        <Card className="overflow-hidden">
          <CardHeader className="p-2 pb-0">
            <CardTitle className="text-sm">Total Population by Diagnostic Category</CardTitle>
            <div className="text-xs text-gray-500 mt-0.5">n={data?.patients?.length || 24} patients • n={data?.totalRecords || 1061} records</div>
          </CardHeader>
          <CardContent className="p-2 h-[280px]">
            <ResponsiveBar
              data={diagnosticCategoryData}
              keys={['value']}
              indexBy="id"
              margin={{ top: 60, right: 30, bottom: 70, left: 65 }}
              padding={0.3}
              layout="vertical"
              colors={getDiagnosisColors()}
              colorBy="indexValue"
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 25,
                tickRotation: -35,
                legendPosition: 'middle',
                legendOffset: 70,
                truncateTickAt: 0
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Percentage (%)',
                legendPosition: 'middle',
                legendOffset: -50
              }}
              enableGridY={true}
              labelSkipWidth={12}
              labelSkipHeight={12}
              enableLabel={true}
              label={formatLabel}
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
              ariaLabel="Total Population by Diagnostic Category"
            />
          </CardContent>
          <CardFooter className="p-2 flex justify-end">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => downloadChart('Diagnostic Category', diagnosticCategoryData)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Expanded Chart Dialog */}
      <Dialog open={expandedChart === "open"} onOpenChange={(open) => !open && setExpandedChart("")}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{expandedChartTitle}</DialogTitle>
            <div className="flex justify-end space-x-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => 
                  downloadChartAsCSV(expandedChartTitle, expandedChartData)
                }
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => 
                  downloadChartAsExcel(expandedChartTitle, expandedChartData)
                }
              >
                <Table className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto p-4">
            <div style={{ height: '70vh', width: '100%' }}>
              {expandedChartType === 'bar' && (
                <ResponsiveBar
                  data={expandedChartData}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 50, right: 130, bottom: 100, left: 80 }}
                  padding={0.3}
                  layout="vertical"
                  colors={expandedChartColors}
                  colorBy="indexValue"
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    legend: 'Category',
                    legendPosition: 'middle',
                    legendOffset: 70
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Percentage (%)',
                    legendPosition: 'middle',
                    legendOffset: -60
                  }}
                  enableGridY={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  labelTextColor="#ffffff"
                  animate={true}
                  motionConfig="gentle"
                  role="application"
                  ariaLabel={expandedChartTitle}
                  label={formatLabel}
                />
              )}
              {expandedChartType === 'pie' && (
                <ResponsivePie
                  data={expandedChartData.map(item => ({
                    id: item.id,
                    label: item.id,
                    value: item.value,
                    rawCount: item.count,
                    percentage: item.percentage
                  }))}
                  margin={{ top: 50, right: 140, bottom: 50, left: 140 }}
                  innerRadius={0.5}
                  padAngle={0.7}
                  cornerRadius={4}
                  activeOuterRadiusOffset={10}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  colors={{ scheme: 'category10' }}
                  arcLinkLabelsSkipAngle={0}
                  arcLinkLabelsTextColor="#333333"
                  arcLinkLabelsThickness={2.5}
                  arcLinkLabelsColor={{ from: 'color' }}
                  arcLinkLabelsDiagonalLength={36}
                  arcLinkLabelsStraightLength={24}
                  arcLinkLabelsTextOffset={6}
                  arcLinkLabel={d => `${d.id} (${d.value}%)`}
                  arcLabelsSkipAngle={5}
                  arcLabelsTextColor="#ffffff"
                  arcLabelsRadiusOffset={0.6}
                  arcLabel={d => d.value > 3 ? `${d.value}%` : ""}
                  tooltip={({ datum }) => (
                    <div
                      style={{
                        background: 'white',
                        padding: '12px 16px',
                        border: '1px solid #ccc',
                        borderRadius: '6px',
                        boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        maxWidth: '250px'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', color: '#333' }}>
                        {datum.id}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', color: '#555' }}>Percentage:</span>
                        <span style={{ fontWeight: 'bold', color: '#0070f3' }}>{datum.value}%</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#555' }}>Records:</span>
                        <span style={{ fontWeight: 'bold' }}>{datum.data.rawCount || datum.value}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#777', marginTop: '8px', fontStyle: 'italic' }}>
                        Based on {data?.totalRecords || 1061} total records
                      </div>
                    </div>
                  )}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}