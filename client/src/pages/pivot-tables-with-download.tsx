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

// Define parameter types and interfaces
interface PageParams {
  patientId?: string;
}

interface PivotData {
  columns: string[];
  rows: string[];
  data: Record<string, Record<string, number>>;
}

// Component for displaying when no data is available
const NoDataDisplay = ({ message = "No data available" }) => (
  <div className="flex items-center justify-center h-[300px] text-gray-500">
    {message}
  </div>
);

// Main visualization card component
const VisualizationCard = ({ title, patientId = "1", dataType = "symptom" }) => {
  const [sizeOption, setSizeOption] = useState("medium");
  const [isDownloading, setIsDownloading] = useState(false);

  // Create ref for the chart
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Size configurations
  const sizeConfigs = {
    compact: {
      height: 350,
      margin: { top: 40, right: 60, bottom: 40, left: 120 },
      fontSize: 9
    },
    medium: {
      height: 450,
      margin: { top: 60, right: 80, bottom: 60, left: 150 },
      fontSize: 11
    },
    large: {
      height: 550,
      margin: { top: 80, right: 100, bottom: 80, left: 180 },
      fontSize: 13
    }
  };
  
  // Get current size config
  const config = sizeConfigs[sizeOption as keyof typeof sizeConfigs];
  
  // API endpoint based on data type
  const endpoint = `/api/pivot/${dataType === 'category' ? 'diagnostic-category' : dataType}/${patientId}`;
  
  // Fetch data
  const { data, isLoading, error } = useQuery<PivotData>({
    queryKey: [endpoint],
    enabled: !!endpoint,
  });
  
  // Function to download as image
  const downloadAsImage = async () => {
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
      const link = document.createElement('a');
      link.href = imageData;
      link.download = `Patient_${patientId}_${title}.png`;
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Function to download as PDF
  const downloadAsPDF = async () => {
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
      pdf.text(`Patient ${patientId} - ${title}`, 10, 10);
      
      // Add image
      pdf.addImage(imageData, 'PNG', 10, 20, imgWidth, imgHeight);
      pdf.save(`Patient_${patientId}_${title}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Function to download as Excel
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
          rowData[col] = data.data[row] && data.data[row][col] ? data.data[row][col] : 0;
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
  
  // Render pivot table with proper data validation
  const renderPivotTable = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex items-center justify-center h-[300px] text-red-500">
          Error loading data. Please try again.
        </div>
      );
    }
    
    // Validate data existence
    if (!data || !data.rows || !data.columns || !data.data || 
        !Array.isArray(data.rows) || !Array.isArray(data.columns) || 
        data.rows.length === 0 || data.columns.length === 0) {
      return <NoDataDisplay />;
    }
    
    // Apply size configurations
    const tableClass = {
      compact: "text-xs",
      medium: "text-sm",
      large: "text-base"
    }[sizeOption];
    
    return (
      <div ref={chartRef} style={{ maxHeight: config.height, overflowY: 'auto', width: '100%' }}>
        <table className={`w-full border-collapse ${tableClass}`}>
          <thead>
            <tr className="bg-slate-100">
              <th className="border p-2 sticky top-0 left-0 z-10 bg-slate-100">{title}</th>
              {data.columns.map((col, idx) => (
                <th key={idx} className="border p-2 sticky top-0 bg-slate-100" style={{ minWidth: '100px' }}>
                  <div className="transform -rotate-45 origin-left translate-y-2 h-16 w-20 overflow-hidden text-left">
                    {col}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border p-2 font-medium sticky left-0 bg-inherit">{row}</td>
                {data.columns.map((col, colIdx) => {
                  // Safely access the value with fallbacks
                  const value = data.data && data.data[row] && data.data[row][col] 
                    ? data.data[row][col] 
                    : 0;
                  
                  // Color coding based on value
                  let bgColor = 'bg-white';
                  if (value > 0) {
                    if (value >= 20) bgColor = 'bg-blue-400 text-white';
                    else if (value >= 10) bgColor = 'bg-blue-300';
                    else if (value >= 5) bgColor = 'bg-blue-200';
                    else bgColor = 'bg-blue-100';
                  }
                  
                  return (
                    <td 
                      key={colIdx} 
                      className={`border p-2 text-center ${bgColor}`}
                    >
                      {value > 0 ? value : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  return (
    <div className="mb-6 border rounded">
      <div className="flex justify-between items-center bg-slate-50 p-4 border-b">
        <h3 className="text-lg font-semibold">{title} Pivot Table</h3>
        <div className="flex items-center gap-2">
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
          
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={downloadAsImage}
              disabled={isDownloading || isLoading || !data}
            >
              {isDownloading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ImageIcon className="h-3 w-3 mr-1" />}
              PNG
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={downloadAsPDF}
              disabled={isDownloading || isLoading || !data}
            >
              {isDownloading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileText className="h-3 w-3 mr-1" />}
              PDF
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={downloadAsExcel}
              disabled={isDownloading || isLoading || !data}
            >
              {isDownloading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileSpreadsheet className="h-3 w-3 mr-1" />}
              Excel
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {renderPivotTable()}
      </div>
    </div>
  );
};

// Main page component
export default function PivotTablesWithDownload() {
  const { patientId } = useParams<PageParams>();
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
          <CardTitle>Pivot Table Analysis Dashboard</CardTitle>
          <CardDescription>
            Interactive pivot tables with download options for Patient {selectedPatient}
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
                Refresh Data
              </Button>
            </div>
          </div>
          
          <div className="space-y-6">
            <VisualizationCard 
              title="Symptoms"
              patientId={selectedPatient}
              dataType="symptom"
            />
            
            <VisualizationCard 
              title="Diagnoses"
              patientId={selectedPatient}
              dataType="diagnosis"
            />
            
            <VisualizationCard 
              title="Diagnostic Categories"
              patientId={selectedPatient}
              dataType="category"
            />
            
            <VisualizationCard 
              title="HRSN Indicators"
              patientId={selectedPatient}
              dataType="hrsn"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}