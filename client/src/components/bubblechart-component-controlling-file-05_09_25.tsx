import React, { useState, useRef, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Download, Save } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import '../bubbleChart.css';
import { calculateBubbleSize } from '@/lib/bubble-size-utils';
import ChartExportWidget from "@/components/chart-export-widget";

// Last updated: May 9, 2025 - 5:50 AM
// Controls component: BubbleChartRevised - reusable bubble chart visualization

// Define pivot data structure
interface PivotData {
  columns: string[];
  rows: string[];
  data: Record<string, Record<string, number>>;
}

const BubbleChartRevised = ({ 
  data, 
  title, 
  noBorders = false 
}: { 
  data: PivotData | undefined;
  title: string;
  noBorders?: boolean;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [translatePos, setTranslatePos] = useState({ x: 0, y: 0 });
  
  // Chart dimensions
  const canvasWidth = 1000;
  const canvasHeight = 600;
  const margin = { top: 60, right: 20, bottom: 60, left: 200 };
  
  // Ensure we have valid data
  if (!data || !data.rows || !data.columns || data.rows.length === 0 || data.columns.length === 0) {
    return (
      <div className="text-center p-8">
        <p>No data available for visualization</p>
      </div>
    );
  }
  
  // Process rows with their totals for sorting
  const rowsWithTotals = data.rows.map(row => {
    const total = data.columns.reduce((acc, col) => acc + (data.data[row]?.[col] || 0), 0);
    return { row, total };
  });
  
  // Sort rows by total in descending order
  const sortedRows = rowsWithTotals
    .sort((a, b) => b.total - a.total)
    .map(item => item.row);
  
  // Take top 20 rows for better visualization
  const topRows = sortedRows.slice(0, 20);  
  
  // Create a mapping for row colors
  const rowColors: Record<string, string> = {};
  const predefinedColors = [
    "#8856a7", "#8c96c6", "#9ebcda", "#bfd3e6", "#edf8fb",  // Blue-Purple
    "#d73027", "#fc8d59", "#fee090", "#e0f3f8", "#91bfdb"   // Red-Blue diverging
  ];
  
  topRows.forEach((row, idx) => {
    rowColors[row] = predefinedColors[idx % predefinedColors.length];
  });
  
  // Calculate maximum value for scaling
  let maxValue = 0;
  topRows.forEach(row => {
    data.columns.forEach(col => {
      const value = data.data[row]?.[col] || 0;
      maxValue = Math.max(maxValue, value);
    });
  });
  
  // Layout calculations
  const innerWidth = canvasWidth - margin.left - margin.right;
  const innerHeight = canvasHeight - margin.top - margin.bottom;
  
  // Calculate how much space each cell needs
  const cellWidth = innerWidth / Math.max(1, data.columns.length);
  const rowHeight = innerHeight / Math.max(1, topRows.length);
  
  // X and Y scales (simple linear mapping)
  const xScale = (colIndex: number) => margin.left + colIndex * cellWidth + cellWidth / 2;
  const yScale = (rowIndex: number) => margin.top + rowIndex * rowHeight + rowHeight / 2;

  // Minimum and maximum bubble sizes
  const minBubbleSize = 5;
  const maxBubbleSize = Math.min(cellWidth, rowHeight) * 0.8;
  
  // Handle zoom operations
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  };
  
  // Mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    setTranslatePos(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleMouseLeave = () => {
    setIsDragging(false);
  };
  
  // Reset transformations
  const resetView = () => {
    setZoomLevel(1);
    setTranslatePos({ x: 0, y: 0 });
  };
  
  // Export functions
  const exportAsPNG = async () => {
    if (!svgRef.current) return;
    
    try {
      // Reset zoom and position for export
      const currentZoom = zoomLevel;
      const currentTranslate = { ...translatePos };
      setZoomLevel(1);
      setTranslatePos({ x: 0, y: 0 });
      
      // Wait for re-render
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create canvas
      const canvas = await html2canvas(svgRef.current, {
        scale: 2,
        backgroundColor: null,
        logging: false
      });
      
      // Download
      const img = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = img;
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.click();
      
      // Restore view settings
      setZoomLevel(currentZoom);
      setTranslatePos(currentTranslate);
    } catch (err) {
      console.error('Error exporting PNG:', err);
    }
  };
  
  const exportAsPDF = async () => {
    if (!svgRef.current) return;
    
    try {
      // Reset zoom and position for export
      const currentZoom = zoomLevel;
      const currentTranslate = { ...translatePos };
      setZoomLevel(1);
      setTranslatePos({ x: 0, y: 0 });
      
      // Wait for re-render
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create canvas
      const canvas = await html2canvas(svgRef.current, {
        scale: 2,
        backgroundColor: null,
        logging: false
      });
      
      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm'
      });
      
      // Add title
      pdf.setFontSize(16);
      pdf.text(title, 10, 10);
      
      // Add image
      const imgWidth = 270;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 15, 20, imgWidth, imgHeight);
      pdf.save(`${title.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      
      // Restore view settings
      setZoomLevel(currentZoom);
      setTranslatePos(currentTranslate);
    } catch (err) {
      console.error('Error exporting PDF:', err);
    }
  };
  
  // Create bubble chart elements
  const chartElements = [];
  
  // First, add X-axis (column) labels at the top
  data.columns.forEach((col, colIndex) => {
    const x = xScale(colIndex);
    const y = margin.top - 10;
    
    chartElements.push(
      <text
        key={`col-${colIndex}`}
        x={x}
        y={y}
        textAnchor="middle"
        fontSize="12"
        fill="#333"
        transform={`rotate(-45, ${x}, ${y})`}
      >
        {col}
      </text>
    );
  });
  
  // Add Y-axis (row) labels at the left
  topRows.forEach((row, rowIndex) => {
    const total = rowsWithTotals.find(r => r.row === row)?.total || 0;
    const x = margin.left - 10;
    const y = yScale(rowIndex);
    
    chartElements.push(
      <g key={`row-${rowIndex}`}>
        <text
          x={x}
          y={y}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize="12"
          fill="#333"
        >
          {`${rowIndex + 1}. ${row} (${total})`}
        </text>
        <circle 
          cx={x - 130} 
          cy={y} 
          r={8} 
          fill={rowColors[row]} 
        />
      </g>
    );
  });
  
  // Add bubbles
  topRows.forEach((row, rowIndex) => {
    data.columns.forEach((col, colIndex) => {
      const value = data.data[row]?.[col] || 0;
      if (value > 0) {
        // Get coordinates
        const x = xScale(colIndex);
        const y = yScale(rowIndex);
        
        // Calculate size
        const bubbleSize = calculateBubbleSize(value, maxValue, minBubbleSize, maxBubbleSize);
        
        // Add bubble
        chartElements.push(
          <g key={`bubble-${rowIndex}-${colIndex}`}>
            <circle
              cx={x}
              cy={y}
              r={bubbleSize}
              fill={rowColors[row]}
              fillOpacity={0.7}
              stroke="#1e40af"
              strokeWidth={2}
              className="bubble-hover"
            />
            {value > maxValue * 0.2 && (
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.max(10, bubbleSize / 2)}
                fill="#333"
                fontWeight="bold"
              >
                {value}
              </text>
            )}
          </g>
        );
      }
    });
  });
  
  // Legends removed as requested in standardization
  
  // Prepare data for ChartExportWidget
  const exportData = React.useMemo(() => {
    const results: any[] = [];
    
    topRows.forEach(row => {
      const rowData = data.data[row] || {};
      data.columns.forEach(col => {
        const value = rowData[col];
        if (value && value > 0) {
          results.push({
            Date: col,
            Item: row,
            Frequency: value,
            Total: rowsWithTotals.find(r => r.row === row)?.total || 0
          });
        }
      });
    });
    
    return results;
  }, [data, topRows, rowsWithTotals]);
  
  return (
    <div className={`relative ${noBorders ? '' : 'border-2 border-blue-500 rounded-lg shadow-md'}`} style={{ overflow: 'hidden' }}>
      <ChartExportWidget
        chartId={`bubble-chart-${title.replace(/\s+/g, '-').toLowerCase()}`}
        chartTitle={title}
        data={exportData}
        className="absolute top-2 right-2 z-10"
        showCloseButton={false}
      />
      <div className="flex justify-between items-center p-2 bg-slate-50 border-b-2 border-blue-200">
        <div>
          <h3 className="text-base font-medium">{title}</h3>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={resetView}>
            Reset View
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div ref={containerRef} style={{ overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          width={canvasWidth}
          height={canvasHeight}
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            transform: `scale(${zoomLevel}) translate(${translatePos.x}px, ${translatePos.y}px)`,
            transformOrigin: 'center',
            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <rect width="100%" height="100%" fill="white" />
          {chartElements}
        </svg>
      </div>
    </div>
  );
};

export default BubbleChartRevised;