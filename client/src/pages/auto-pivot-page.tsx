import { useEffect, useState, useRef } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Loader2, 
  Maximize2, 
  Minimize2, 
  Download, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  FileText
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { ResponsiveCirclePacking } from '@nivo/circle-packing';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

// Define the auto pivot page parameter types
interface AutoPivotPageParams {
  patientId?: string;
}

// Define pivot data structure
interface PivotData {
  columns: string[];
  rows: string[];
  data: Record<string, Record<string, number>>;
}

// Chart types
type ChartType = "heatmap" | "circle";

// Data views configuration
const DATA_VIEWS = [
  { id: "symptom", label: "Symptoms" },
  { id: "diagnosis", label: "Diagnoses" },
  { id: "category", label: "Diagnostic Categories" },
  { id: "hrsn", label: "HRSN Indicators" }
];

// Simple fallback component for when no data is available
const NoDataDisplay = ({ message = "No data available for this visualization" }) => (
  <div className="flex items-center justify-center h-[400px] text-gray-500">
    {message}
  </div>
);

// Component for displaying a visualization with collapsible content
const VisualizationCard = ({ 
  title, 
  patientId,
  dataType,
  chartType,
  expanded = false,
}: { 
  title: string;
  patientId: string;
  dataType: string;
  chartType: ChartType;
  expanded?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [sizeOption, setSizeOption] = useState("medium");
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Create separate refs for each chart type
  const heatmapRef = useRef<HTMLDivElement>(null);
  const bubbleChartRef = useRef<HTMLDivElement>(null);
  
  // Function to download chart as image
  const downloadAsImage = async () => {
    // Get the appropriate ref based on chart type
    const chartRef = chartType === 'heatmap' ? heatmapRef : bubbleChartRef;
    
    if (!chartRef.current || !data) return;
    
    try {
      setIsDownloading(true);
      const element = chartRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // Higher scale for better quality
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      const imageData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imageData;
      link.download = `Patient_${patientId}_${title}_${chartType}.png`;
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Function to download chart as PDF
  const downloadAsPDF = async () => {
    // Get the appropriate ref based on chart type
    const chartRef = chartType === 'heatmap' ? heatmapRef : bubbleChartRef;
    
    if (!chartRef.current || !data) return;
    
    try {
      setIsDownloading(true);
      const element = chartRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });
      
      const imageData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
      });
      
      // Calculate aspect ratio to fit to PDF page
      const imgWidth = 280;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add title
      pdf.setFontSize(16);
      pdf.text(`Patient ${patientId} - ${title} - ${chartType === 'heatmap' ? 'Heatmap' : 'Bubble Chart'}`, 10, 10);
      
      // Add image
      pdf.addImage(imageData, 'PNG', 10, 20, imgWidth, imgHeight);
      pdf.save(`Patient_${patientId}_${title}_${chartType}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Function to download chart data as Excel
  const downloadAsExcel = () => {
    if (!data) return;
    
    try {
      setIsDownloading(true);
      
      // Create a workbook and worksheet
      const wb = XLSX.utils.book_new();
      
      // Convert data to format suitable for Excel
      const excelData = data.rows.map(row => {
        const rowData: Record<string, any> = { Item: row };
        data.columns.forEach(col => {
          rowData[col] = data.data[row][col] || 0;
        });
        return rowData;
      });
      
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, `${title}_Data`);
      
      // Generate Excel file and trigger download
      XLSX.writeFile(wb, `Patient_${patientId}_${title}_Data.xlsx`);
    } catch (error) {
      console.error('Error generating Excel file:', error);
    } finally {
      setIsDownloading(false);
    }
  };
  const endpoint = `/api/pivot/${dataType === 'category' ? 'diagnostic-category' : dataType}/${patientId}`;
  
  // Fetch data for this visualization
  const { data, isLoading, error } = useQuery<PivotData>({
    queryKey: [endpoint],
    enabled: !!endpoint,
  });
  
  // Safely check if we have data to display
  const hasValidData = data && 
                      Array.isArray(data.rows) && 
                      data.rows.length > 0 && 
                      Array.isArray(data.columns) && 
                      data.columns.length > 0;
  
  // Basic HeatMap implementation that doesn't rely on complex data transformations
  const renderHeatmap = () => {
    if (!hasValidData) {
      return <NoDataDisplay message="No data available for heatmap visualization" />;
    }
    
    // Make sure we have at least one column with non-zero data
    if (!data || !data.columns || data.columns.length === 0) {
      return <NoDataDisplay message="Missing date information for heatmap" />;
    }
    
    // For the HeatMap, we need a different format than the original data
    // Instead of the nested format, create a flat array with row, column, and value information
    const heatmapData = data.rows.map(row => {
      // Create a new entry for each row with id and all column values
      const item: Record<string, any> = { id: row };
      
      // Add each column's value or 0 if not present
      if (Array.isArray(data.columns)) {
        data.columns.forEach(col => {
          const value = data.data && data.data[row] && data.data[row][col] ? data.data[row][col] : 0;
          item[col] = value;
        });
      }
      
      return item;
    });
    
    // If after transformation, we have no data to show
    if (!heatmapData || !heatmapData.length) {
      return <NoDataDisplay message="No heatmap data to display" />;
    }
    
    // Generate a safe keys array from columns
    const safeKeys = Array.isArray(data.columns) ? data.columns : [];
    
    // If no columns/keys, don't try to render the heatmap
    if (safeKeys.length === 0) {
      return <NoDataDisplay message="No date columns available for visualization" />;
    }

    // Size configurations for different view options
    const sizeConfigs = {
      compact: {
        height: "350px",
        margin: { top: 40, right: 60, bottom: 40, left: 120 },
        tickSize: 3,
        tickPadding: 3,
        legendOffset: -100,
        cellSize: { width: 28, height: 18 },
        fontSize: 9
      },
      medium: {
        height: "400px",
        margin: { top: 60, right: 80, bottom: 60, left: 150 },
        tickSize: 5,
        tickPadding: 5,
        legendOffset: -130,
        cellSize: { width: 36, height: 24 },
        fontSize: 11
      },
      large: {
        height: "500px",
        margin: { top: 80, right: 100, bottom: 80, left: 180 },
        tickSize: 7,
        tickPadding: 7,
        legendOffset: -160,
        cellSize: { width: 44, height: 32 },
        fontSize: 13
      }
    };

    // Get the current size configuration
    const config = sizeConfigs[sizeOption as keyof typeof sizeConfigs];

    // Create legend items for legend box
    const legendItems = [
      { text: "0 mentions", color: "white" },
      { text: "1-4 mentions", color: "#dbeafe" },
      { text: "5-9 mentions", color: "#bfdbfe" },
      { text: "10-19 mentions", color: "#93c5fd" },
      { text: "20+ mentions", color: "#60a5fa" }
    ];
    
    return (
      <div>
        {/* Size controls and legend */}
        <div className="flex justify-between items-center mb-4 p-2 bg-gray-50 rounded">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-3 font-medium text-sm">Frequency Legend:</span>
            {legendItems.map((item, index) => (
              <div key={index} className="flex items-center mr-2">
                <span 
                  className="inline-block w-3.5 h-3.5 mr-1 border border-gray-200"
                  style={{ backgroundColor: item.color }}
                ></span>
                <span className="text-xs">{item.text}</span>
              </div>
            ))}
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <label className="text-sm mr-1">Size:</label>
              <select
                value={sizeOption}
                onChange={(e) => setSizeOption(e.target.value)}
                className="text-xs p-1 border border-gray-300 rounded"
              >
                <option value="compact">Compact</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1 text-xs"
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={downloadAsImage} className="text-xs cursor-pointer">
                  <ImageIcon className="h-3.5 w-3.5 mr-2" />
                  Download as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadAsPDF} className="text-xs cursor-pointer">
                  <FileText className="h-3.5 w-3.5 mr-2" />
                  Download as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadAsExcel} className="text-xs cursor-pointer">
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-2" />
                  Download as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Heatmap */}
        <div ref={heatmapRef} style={{ height: config.height }}>
          <ResponsiveHeatMap
            // @ts-ignore
            data={heatmapData}
            margin={config.margin}
            valueFormat=">-.2s"
            indexBy="id"
            keys={safeKeys}
            colors={{
              type: 'sequential',
              scheme: 'blues',
            }}
            cellWidth={config.cellSize.width}
            cellHeight={config.cellSize.height}
            axisTop={{
              tickSize: config.tickSize,
              tickPadding: config.tickPadding,
              tickRotation: -45,
              legend: 'Dates',
              legendOffset: 46
            }}
            axisLeft={{
              tickSize: config.tickSize,
              tickPadding: config.tickPadding,
              tickRotation: 0,
              legend: title,
              legendPosition: 'middle',
              legendOffset: config.legendOffset
            }}
            theme={{
              tooltip: {
                container: {
                  background: 'white',
                  padding: '12px 16px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
                }
              },
              axis: {
                ticks: {
                  text: {
                    fontSize: config.fontSize
                  }
                },
                legend: {
                  text: {
                    fontSize: config.fontSize
                  }
                }
              }
            }}
            heatmapTooltip={({ id, value, xKey }: { id: string, value: number, xKey: string }) => (
              <div>
                <strong>{id}</strong> on <strong>{xKey}</strong>: {value || 0} occurrences
              </div>
            )}
          />
        </div>
      </div>
    );
  };
  
  // Basic Circle Packing implementation that doesn't rely on complex data transformations  
  const renderCirclePacking = () => {
    if (!hasValidData) {
      return <NoDataDisplay message="No data available for bubble chart visualization" />;
    }
    
    // Add comprehensive null checks to prevent runtime errors
    if (!data || !data.rows || !Array.isArray(data.rows) || !data.columns || !Array.isArray(data.columns)) {
      return <NoDataDisplay message="Invalid data structure for bubble chart" />;
    }
    
    // Use all rows with complete data - with extra data safety checks
    const validRows = data.rows
      .map(row => {
        if (!data.data || !data.data[row]) {
          return { row, total: 0 };
        }
        const total = data.columns.reduce((sum, col) => {
          if (data.data && data.data[row] && typeof data.data[row][col] === 'number') {
            return sum + data.data[row][col];
          }
          return sum;
        }, 0);
        return { row, total };
      })
      .filter(item => item.total > 0)
      .map(item => item.row);
    
    if (!validRows.length) {
      return <NoDataDisplay message="No bubble chart data to display" />;
    }
    
    // Create the data structure needed for circle packing
    const circleData = {
      name: "root",
      children: validRows.map(row => {
        // Get all columns with values
        const children = data.columns
          .filter(col => {
            if (data.data && data.data[row] && typeof data.data[row][col] === 'number') {
              return data.data[row][col] > 0;
            }
            return false;
          })
          .map(col => ({
            name: col,
            value: data.data[row][col] || 0
          }));
        
        const total = children.reduce((sum, child) => sum + (child.value || 0), 0);
        
        return {
          name: row,
          value: total,
          children: children.length ? children : undefined
        };
      })
    };

    // Size configurations for different view options
    const sizeConfigs = {
      compact: {
        height: "350px",
        margin: { top: 15, right: 15, bottom: 15, left: 15 },
        padding: 3,
        labelFontSize: 8
      },
      medium: {
        height: "400px",
        margin: { top: 20, right: 20, bottom: 20, left: 20 },
        padding: 4,
        labelFontSize: 11
      },
      large: {
        height: "500px",
        margin: { top: 25, right: 25, bottom: 25, left: 25 },
        padding: 5,
        labelFontSize: 14
      }
    };

    // Get the current size configuration
    const config = sizeConfigs[sizeOption as keyof typeof sizeConfigs];

    // Create legend items for legend box
    const legendItems = [
      { text: "Symptom/Diagnosis Item", color: "#93c5fd" },
      { text: "Date Occurrence", color: "#bfdbfe" },
    ];
    
    return (
      <div>
        {/* Size controls and legend */}
        <div className="flex justify-between items-center mb-4 p-2 bg-gray-50 rounded">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-3 font-medium text-sm">Chart Legend:</span>
            {legendItems.map((item, index) => (
              <div key={index} className="flex items-center mr-2">
                <span 
                  className="inline-block w-3.5 h-3.5 mr-1 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></span>
                <span className="text-xs">{item.text}</span>
              </div>
            ))}
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <label className="text-sm mr-1">Size:</label>
              <select
                value={sizeOption}
                onChange={(e) => setSizeOption(e.target.value)}
                className="text-xs p-1 border border-gray-300 rounded"
              >
                <option value="compact">Compact</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1 text-xs"
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={downloadAsImage} className="text-xs cursor-pointer">
                  <ImageIcon className="h-3.5 w-3.5 mr-2" />
                  Download as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadAsPDF} className="text-xs cursor-pointer">
                  <FileText className="h-3.5 w-3.5 mr-2" />
                  Download as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadAsExcel} className="text-xs cursor-pointer">
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-2" />
                  Download as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
    
        {/* Bubble Chart */}
        <div ref={bubbleChartRef} style={{ height: config.height }}>
          <ResponsiveCirclePacking
            data={circleData}
            margin={config.margin}
            padding={config.padding}
            colors={{ scheme: 'blues' }}
            childColor={{
              from: 'color',
              modifiers: [['brighter', 0.4]]
            }}
            enableLabels={true}
            label="name"
            labelTextColor={{
              from: 'color',
              modifiers: [['darker', 3]]
            }}
            borderWidth={1}
            borderColor={{
              from: 'color',
              modifiers: [['darker', 0.5]]
            }}
            isInteractive={true}
            onMouseLeave={() => {}}
            theme={{
              labels: {
                text: {
                  fontSize: config.labelFontSize
                }
              },
              tooltip: {
                container: {
                  background: 'white',
                  padding: '12px 16px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                  pointerEvents: 'none'
                }
              }
            }}
            tooltip={({ id, value, color }) => (
              <div>
                <strong style={{ color }}>{id}</strong>: {value || 0} occurrences
              </div>
            )}
          />
        </div>
      </div>
    );
  };
  
  // Get chart content based on type
  const renderChartContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex items-center justify-center h-[400px] text-red-500">
          Error loading data. Please try again.
        </div>
      );
    }
    
    if (!hasValidData) {
      return <NoDataDisplay />;
    }
    
    // Render the appropriate visualization
    return chartType === "heatmap" ? renderHeatmap() : renderCirclePacking();
  };
  
  return (
    <Collapsible 
      open={isExpanded} 
      onOpenChange={setIsExpanded}
      className="mb-6 border rounded-md overflow-hidden"
    >
      <div className="flex justify-between items-center bg-slate-50 p-4 border-b">
        <h3 className="text-lg font-semibold">{title} {chartType === "heatmap" ? "Heatmap" : "Bubble Chart"}</h3>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {isExpanded ? (
              <Minimize2 className="h-4 w-4 mr-2" />
            ) : (
              <Maximize2 className="h-4 w-4 mr-2" />
            )}
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
        </CollapsibleTrigger>
      </div>
      
      <CollapsibleContent className={isExpanded ? "h-[500px]" : "h-[400px]"}>
        <div className="p-4 h-full">
          {renderChartContent()}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default function AutoPivotPage() {
  const { patientId } = useParams<AutoPivotPageParams>();
  const [selectedPatient, setSelectedPatient] = useState<string>(patientId || '1');
  
  // When patient changes from URL parameter, update the selected patient
  useEffect(() => {
    if (patientId) {
      setSelectedPatient(patientId);
    }
  }, [patientId]);
  
  // Create array of patients to select from
  const patientOptions = Array.from({ length: 14 }, (_, i) => ({
    id: (i + 1).toString(),
    name: `Patient ${i + 1}`
  }));

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Patient Analysis Dashboard</CardTitle>
          <CardDescription>
            Comprehensive visualization of patient data for Patient {selectedPatient}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-1 block">Select Patient</label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Patient" />
                </SelectTrigger>
                <SelectContent>
                  {patientOptions.map(patient => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="ml-auto flex items-end">
              <Button onClick={() => window.location.reload()}>
                Refresh All Data
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {/* Section 1: Heatmaps */}
            <div>
              <h2 className="text-xl font-bold mb-4 text-slate-800 border-b pb-2">Heatmap Visualizations</h2>
              
              {/* Symptoms Heatmap */}
              <VisualizationCard 
                title="Symptoms"
                patientId={selectedPatient}
                dataType="symptom"
                chartType="heatmap"
                expanded={true}
              />
              
              {/* Diagnoses Heatmap */}
              <VisualizationCard 
                title="Diagnoses"
                patientId={selectedPatient}
                dataType="diagnosis"
                chartType="heatmap"
              />
              
              {/* Diagnostic Categories Heatmap */}
              <VisualizationCard 
                title="Diagnostic Categories"
                patientId={selectedPatient}
                dataType="category"
                chartType="heatmap"
              />
              
              {/* HRSN Indicators Heatmap */}
              <VisualizationCard 
                title="HRSN Indicators"
                patientId={selectedPatient}
                dataType="hrsn"
                chartType="heatmap"
              />
            </div>
            
            {/* Section 2: Bubble Charts */}
            <div>
              <h2 className="text-xl font-bold mb-4 text-slate-800 border-b pb-2">Bubble Chart Visualizations</h2>
              
              {/* Symptoms Bubble Chart */}
              <VisualizationCard 
                title="Symptoms"
                patientId={selectedPatient}
                dataType="symptom"
                chartType="circle"
                expanded={true}
              />
              
              {/* Diagnoses Bubble Chart */}
              <VisualizationCard 
                title="Diagnoses"
                patientId={selectedPatient}
                dataType="diagnosis"
                chartType="circle"
              />
              
              {/* Diagnostic Categories Bubble Chart */}
              <VisualizationCard 
                title="Diagnostic Categories"
                patientId={selectedPatient}
                dataType="category"
                chartType="circle"
              />
              
              {/* HRSN Indicators Bubble Chart */}
              <VisualizationCard 
                title="HRSN Indicators"
                patientId={selectedPatient}
                dataType="hrsn"
                chartType="circle"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}