import React, { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart, Download, ZoomIn, ZoomOut, Save } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// Define the parameters type
interface PatientVisualizationParams {
  patientId?: string;
}

// Define pivot data structure
interface PivotData {
  columns: string[];
  rows: string[];
  data: Record<string, Record<string, number>>;
}

// All data types to display in order
const DATA_TYPES = [
  { id: "symptom", label: "Symptoms" },
  { id: "diagnosis", label: "Diagnoses" },
  { id: "diagnostic-category", label: "Diagnostic Categories" },
  { id: "hrsn", label: "HRSN Indicators" }
];

// Component for displaying heatmap visualization with fixed date headers
const HeatmapVisualization = ({ data, title }: { data: PivotData | undefined, title: string }) => {
  // Add reference for the container 
  const tableRef = useRef<HTMLDivElement>(null);
  
  // State for scale factor (for resizing)
  const [scaleFactor, setScaleFactor] = useState(1);

  // Calculate max value to create dynamic color ranges
  let maxValue = 0;
  if (data) {
    data.rows.forEach(row => {
      data.columns.forEach(col => {
        const value = data.data[row]?.[col] || 0;
        if (value > maxValue) maxValue = value;
      });
    });
  }

  // Dynamic color ranges based on data using viridis color palette
  const getDynamicColorRanges = () => {
    // Create custom viridis-inspired colors for Tailwind
    const viridisColors = {
      v1: { bg: "bg-[#440154]", textColor: "text-white" },     // Dark purple
      v2: { bg: "bg-[#414487]", textColor: "text-white" },     // Deep blue
      v3: { bg: "bg-[#2a788e]", textColor: "text-white" },     // Teal blue
      v4: { bg: "bg-[#22a884]", textColor: "text-white" },     // Green
      v5: { bg: "bg-[#7ad151]", textColor: "text-gray-900" },  // Light green
      v6: { bg: "bg-[#fde725]", textColor: "text-gray-900" },  // Yellow
      empty: { bg: "bg-white", textColor: "text-gray-400" }
    };
    
    // If max value is very small, use a reduced scale
    if (maxValue <= 5) {
      return [
        { min: 5, color: viridisColors.v1.bg, textColor: viridisColors.v1.textColor, label: "5" },
        { min: 4, color: viridisColors.v2.bg, textColor: viridisColors.v2.textColor, label: "4" },
        { min: 3, color: viridisColors.v3.bg, textColor: viridisColors.v3.textColor, label: "3" },
        { min: 2, color: viridisColors.v4.bg, textColor: viridisColors.v4.textColor, label: "2" },
        { min: 1, color: viridisColors.v5.bg, textColor: viridisColors.v5.textColor, label: "1" },
        { min: 0, color: viridisColors.empty.bg, textColor: viridisColors.empty.textColor, label: "0" }
      ];
    }
    
    // Normal distribution for larger values
    const tier1 = Math.max(Math.floor(maxValue * 0.8), maxValue - 5);
    const tier2 = Math.max(Math.floor(maxValue * 0.6), maxValue - 10);
    const tier3 = Math.max(Math.floor(maxValue * 0.4), maxValue - 15);
    const tier4 = Math.max(Math.floor(maxValue * 0.2), 1);
    const tier5 = Math.max(1, Math.floor(maxValue * 0.1));
    
    return [
      { min: tier1, color: viridisColors.v1.bg, textColor: viridisColors.v1.textColor, label: `≥ ${tier1}` },
      { min: tier2, color: viridisColors.v2.bg, textColor: viridisColors.v2.textColor, label: `${tier2}-${tier1-1}` },
      { min: tier3, color: viridisColors.v3.bg, textColor: viridisColors.v3.textColor, label: `${tier3}-${tier2-1}` },
      { min: tier4, color: viridisColors.v4.bg, textColor: viridisColors.v4.textColor, label: `${tier4}-${tier3-1}` },
      { min: tier5, color: viridisColors.v5.bg, textColor: viridisColors.v5.textColor, label: `${tier5}-${tier4-1}` },
      { min: 1, color: viridisColors.v6.bg, textColor: viridisColors.v6.textColor, label: `1-${tier5 > 1 ? tier5-1 : 1}` },
      { min: 0, color: viridisColors.empty.bg, textColor: viridisColors.empty.textColor, label: "0" }
    ];
  };

  const colorRanges = getDynamicColorRanges();

  // Helper function to get color based on value
  const getColorForValue = (value: number) => {
    for (const range of colorRanges) {
      if (value >= range.min) return { bg: range.color, text: range.textColor };
    }
    return { bg: "bg-white", text: "text-gray-400" };
  };
  
  // Download as PNG
  const downloadAsPng = () => {
    if (!tableRef.current) return;
    
    html2canvas(tableRef.current).then(canvas => {
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-heatmap.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };
  
  // Download as PDF
  const downloadAsPdf = () => {
    if (!tableRef.current) return;
    
    html2canvas(tableRef.current).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${title.replace(/\s+/g, '-').toLowerCase()}-heatmap.pdf`);
    });
  };
  
  // Zoom in and out functions
  const zoomIn = () => setScaleFactor(prev => Math.min(prev + 0.2, 2));
  const zoomOut = () => setScaleFactor(prev => Math.max(prev - 0.2, 0.6));

  if (!data || !data.rows || !data.columns || data.rows.length === 0 || data.columns.length === 0) {
    return (
      <Card className="mb-4">
        <CardHeader className="py-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">No data available to display</div>
        </CardContent>
      </Card>
    );
  }

  // Process all rows to calculate sums and ranks
  const rowsWithSums = data.rows.map(row => {
    const sum = data.columns.reduce((acc, col) => acc + (data.data[row]?.[col] || 0), 0);
    // Replace empty labels with default value
    const displayRow = row.trim() === '' ? 'Unlabeled Item' : row;
    return { row: displayRow, originalRow: row, sum };
  });
  
  // Sort by sum (descending) to determine ranks and take top 30 for more visibility
  const topRowsWithRanks = rowsWithSums
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 30)
    .map((r, index) => ({ 
      row: r.row, 
      originalRow: r.originalRow,
      sum: r.sum, 
      rank: index + 1 
    }));

  // Custom CSS style for sticky footer
  const stickyFooterStyle = `
    .date-header-${title.replace(/\s+/g, '-').toLowerCase()} {
      height: 60px;
      position: relative;
      padding: 0 !important;
      width: 40px;
    }
    
    .date-label-${title.replace(/\s+/g, '-').toLowerCase()} {
      transform: rotate(45deg);
      transform-origin: bottom left;
      position: absolute;
      bottom: 5px;
      left: 5px;
      white-space: nowrap;
      font-size: 9px;
      font-weight: 600;
    }
    
    .sticky-footer-${title.replace(/\s+/g, '-').toLowerCase()} {
      position: sticky;
      bottom: 0;
      z-index: 100;
      background-color: white;
      box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
    }
  `;

  return (
    <Card className="mb-4">
      <CardHeader className="py-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        <style>{stickyFooterStyle}</style>
        <div className="bg-white rounded">
          {/* Toolbar and legend container */}
          <div className="mb-2 flex justify-between items-start">
            {/* Color legend */}
            <div className="flex items-center gap-2 flex-wrap text-[9px] text-gray-900">
              <span className="font-semibold">Color Legend:</span>
              {colorRanges.map((range, i) => (
                <div key={`legend-${i}`} className="flex items-center gap-1">
                  <div className={`w-3 h-3 ${range.color} border border-gray-200`}></div>
                  <span>{range.label}</span>
                </div>
              ))}
            </div>
            
            {/* Controls for zoom and download */}
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon"
                className="h-6 w-6" 
                onClick={zoomIn} 
                title="Zoom In"
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="h-6 w-6" 
                onClick={zoomOut} 
                title="Zoom Out"
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="h-6 w-6" 
                onClick={downloadAsPng} 
                title="Download as PNG"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="h-6 w-6" 
                onClick={downloadAsPdf} 
                title="Download as PDF"
              >
                <Save className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Container for data table */}
          <div className="relative" style={{ 
            height: '450px', 
            overflow: 'auto',
            position: 'relative'
          }}>
            <div 
              className="relative transition-transform" 
              ref={tableRef}
              style={{ 
                transform: `scale(${scaleFactor})`, 
                transformOrigin: 'top left'
              }}
            >
              <table className="w-auto border-collapse" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '180px' }} />
                  {data.columns.map((col, idx) => (
                    <col key={`col-${idx}`} style={{ width: '40px' }} />
                  ))}
                </colgroup>
                
                {/* Main data rows */}
                <tbody>
                  {topRowsWithRanks.map(({row, originalRow, rank, sum}) => (
                    <tr key={row} className="border-b border-gray-200">
                      <td className="px-1 py-1 font-medium bg-white sticky left-0 z-10 max-w-[180px] truncate text-[9px] text-gray-900 border-r border-gray-200" 
                          style={{ lineHeight: '1' }}>
                        <div className="flex items-center">
                          <span className="inline-flex items-center justify-center w-4 h-4 bg-gray-100 rounded-full mr-1 text-[8px] font-bold">
                            {rank}
                          </span>
                          {row}
                          <span className="ml-1 text-gray-500 text-[8px]">({sum})</span>
                        </div>
                      </td>
                      {data.columns.map(column => {
                        const value = data.data[originalRow]?.[column] || 0;
                        const { bg, text } = getColorForValue(value);
                        
                        return (
                          <td 
                            key={`${row}-${column}`}
                            className={`px-1 py-0 text-center h-6 text-[9px] ${bg} ${text} border-r border-gray-100`}
                            style={{ width: '40px' }}>
                            {value > 0 ? value : <span className="text-transparent">-</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                
                {/* Date headers as footer */}
                <tfoot className={`sticky-footer-${title.replace(/\s+/g, '-').toLowerCase()}`}>
                  <tr>
                    <th className="bg-white sticky left-0 z-20" style={{ 
                      width: '180px', 
                      borderRight: '1px solid #eee' 
                    }}></th>
                    {data.columns.map(column => (
                      <th 
                        key={`date-${column}`}
                        className={`bg-white border-r border-gray-100 date-header-${title.replace(/\s+/g, '-').toLowerCase()}`}>
                        <div className={`date-label-${title.replace(/\s+/g, '-').toLowerCase()}`}>
                          {column}
                        </div>
                      </th>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main component for full patient visualization
export default function SimpleFixedVisualization() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [, setLocation] = useLocation();
  const selectedPatient = patientId || '1';
  
  // Fetch all pivot data types
  const symptomQuery = useQuery<PivotData>({
    queryKey: [`/api/pivot/symptom/${selectedPatient}`]
  });
  
  const diagnosisQuery = useQuery<PivotData>({
    queryKey: [`/api/pivot/diagnosis/${selectedPatient}`]
  });
  
  const categoryQuery = useQuery<PivotData>({
    queryKey: [`/api/pivot/diagnostic-category/${selectedPatient}`]
  });
  
  const hrsnQuery = useQuery<PivotData>({
    queryKey: [`/api/pivot/hrsn/${selectedPatient}`]
  });
  
  // Map data types to their queries
  const dataQueries: Record<string, any> = {
    symptom: symptomQuery,
    diagnosis: diagnosisQuery,
    'diagnostic-category': categoryQuery,
    hrsn: hrsnQuery
  };
  
  // Check if all data is loaded
  const isLoading = symptomQuery.isLoading || diagnosisQuery.isLoading || categoryQuery.isLoading || hrsnQuery.isLoading;
  
  // Check for any errors
  const hasError = symptomQuery.error || diagnosisQuery.error || categoryQuery.error || hrsnQuery.error;

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Patient {selectedPatient} Analysis Dashboard</CardTitle>
          <CardDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span>Comprehensive visualization of patient data over time</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation(`/simplified-auto-pivot/${selectedPatient}`)}
              className="whitespace-nowrap"
            >
              <BarChart className="mr-2 h-4 w-4" />
              Return to Pivot Tables
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading patient data...</span>
            </div>
          ) : hasError ? (
            <div className="text-center py-8 text-red-500">
              Error loading patient data. Please try again or contact support.
            </div>
          ) : (
            <div className="space-y-10">
              {/* Only showing heatmaps for now */}
              <div className="space-y-4 mb-8">
                <h3 className="text-lg font-semibold">Heatmap Visualizations</h3>
                {DATA_TYPES.map(type => (
                  <HeatmapVisualization 
                    key={`heatmap-${type.id}`}
                    data={dataQueries[type.id].data} 
                    title={type.label}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}