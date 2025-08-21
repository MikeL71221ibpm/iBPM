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
  const containerRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  
  // Zoom functions
  const zoomIn = () => setScaleFactor(prev => Math.min(prev + 0.2, 2));
  const zoomOut = () => setScaleFactor(prev => Math.max(prev - 0.2, 0.6));
  
  // Download functions
  const downloadAsPng = () => {
    if (!containerRef.current) return;
    
    html2canvas(containerRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
    }).then(canvas => {
      const image = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = image;
      link.download = `${title.replace(/\s+/g, '_').toLowerCase()}_bubble_chart.png`;
      link.click();
    });
  };
  
  const downloadAsPdf = () => {
    if (!containerRef.current) return;
    
    html2canvas(containerRef.current, {
      backgroundColor: '#ffffff',
      scale: 2,
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
      });
      
      // Calculate the width and height to fit in the PDF
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${title.replace(/\s+/g, '_').toLowerCase()}_bubble_chart.pdf`);
    });
  };
  
  // Function to sort dates chronologically
  const sortDatesChronologically = (dates: string[]) => {
    // Helper to convert date string (MM/DD/YY) to a comparable date
    const parseDate = (dateStr: string) => {
      const [month, day, year] = dateStr.split('/').map(Number);
      // Assume 20xx for years less than 50, otherwise 19xx
      const fullYear = year < 50 ? 2000 + year : 1900 + year;
      return new Date(fullYear, month - 1, day);
    };
    
    return [...dates].sort((a, b) => {
      try {
        return parseDate(a).getTime() - parseDate(b).getTime();
      } catch (error) {
        console.error('Error sorting dates:', error);
        return 0;
      }
    });
  };
  
  // Process data to find max values and better scales
  const processData = () => {
    if (!data) return null;
    
    // Sort dates chronologically 
    const sortedDates = sortDatesChronologically(data.columns);
    
    // Calculate totals for each row to sort them
    const rowTotals = data.rows.reduce<Record<string, number>>((acc, row) => {
      const rowData = data.data[row] || {};
      let total = 0;
      
      sortedDates.forEach(date => {
        total += rowData[date] || 0;
      });
      
      acc[row] = total;
      return acc;
    }, {});
    
    // Sort rows by total count (descending)
    const sortedRows = [...data.rows].sort((a, b) => rowTotals[b] - rowTotals[a]);
    
    // Find the maximum value for any cell
    let maxValue = 0;
    data.rows.forEach(row => {
      const rowData = data.data[row] || {};
      sortedDates.forEach(date => {
        const value = rowData[date] || 0;
        maxValue = Math.max(maxValue, value);
      });
    });
    
    return {
      sortedDates,
      sortedRows,
      maxValue,
      rowTotals
    };
  };
  
  const processedData = processData();
  
  // Calculate dimensions for the chart
  const calculateDimensions = () => {
    if (!processedData) return { width: 800, height: 600 };
    
    const { sortedDates, sortedRows } = processedData;
    
    // Base dimensions
    const cellWidth = 70; // Width per date column
    const rowHeight = 50; // Height per row
    const leftMargin = 200; // Space for row labels
    const topMargin = 70; // Space for column labels and title
    const rightMargin = 50; // Space on right
    const bottomMargin = 50; // Space on bottom
    
    // Calculate dimensions based on data
    const width = leftMargin + sortedDates.length * cellWidth + rightMargin;
    const height = topMargin + sortedRows.length * rowHeight + bottomMargin;
    
    return {
      width,
      height,
      cellWidth,
      rowHeight,
      leftMargin,
      topMargin
    };
  };
  
  const dimensions = calculateDimensions();
  
  // Render the bubble chart using SVG
  const renderBubbleChart = () => {
    if (!processedData) return <div>No data available</div>;
    
    const { sortedDates, sortedRows, maxValue, rowTotals } = processedData;
    const { width, height, cellWidth, rowHeight, leftMargin, topMargin } = dimensions;
    
    // Calculate frequency for each row (number of non-zero entries)
    const rowFrequencies: Record<string, number> = {};
    sortedRows.forEach(row => {
      const rowData = data?.data[row] || {};
      let count = 0;
      sortedDates.forEach(date => {
        if ((rowData[date] || 0) > 0) count++;
      });
      rowFrequencies[row] = count;
    });
    
    return (
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${width} ${height}`}
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Chart title */}
        <text
          x={width / 2}
          y={30}
          textAnchor="middle"
          fontWeight="bold"
          fontSize="16"
        >
          {title}
        </text>
        
        {/* Grid background with alternating row colors */}
        {sortedRows.map((row, rowIndex) => (
          <rect
            key={`row-bg-${row}`}
            x={leftMargin}
            y={topMargin + rowIndex * rowHeight}
            width={sortedDates.length * cellWidth}
            height={rowHeight}
            fill={rowIndex % 2 === 0 ? "#f9fafb" : "#ffffff"}
          />
        ))}
        
        {/* Vertical grid lines */}
        {sortedDates.map((_, colIndex) => (
          <line
            key={`vgrid-${colIndex}`}
            x1={leftMargin + colIndex * cellWidth}
            y1={topMargin}
            x2={leftMargin + colIndex * cellWidth}
            y2={topMargin + sortedRows.length * rowHeight}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}
        <line
          x1={leftMargin + sortedDates.length * cellWidth}
          y1={topMargin}
          x2={leftMargin + sortedDates.length * cellWidth}
          y2={topMargin + sortedRows.length * rowHeight}
          stroke="#e5e7eb"
          strokeWidth="1"
        />
        
        {/* Horizontal grid lines */}
        {sortedRows.map((_, rowIndex) => (
          <line
            key={`hgrid-${rowIndex}`}
            x1={leftMargin}
            y1={topMargin + rowIndex * rowHeight}
            x2={leftMargin + sortedDates.length * cellWidth}
            y2={topMargin + rowIndex * rowHeight}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}
        <line
          x1={leftMargin}
          y1={topMargin + sortedRows.length * rowHeight}
          x2={leftMargin + sortedDates.length * cellWidth}
          y2={topMargin + sortedRows.length * rowHeight}
          stroke="#e5e7eb"
          strokeWidth="1"
        />
        
        {/* Column labels (dates) */}
        {sortedDates.map((date, colIndex) => (
          <text
            key={`col-${date}`}
            x={leftMargin + colIndex * cellWidth + cellWidth / 2}
            y={topMargin - 10}
            textAnchor="middle"
            fontSize="12"
            transform={`rotate(-45, ${leftMargin + colIndex * cellWidth + cellWidth / 2}, ${topMargin - 10})`}
          >
            {date}
          </text>
        ))}
        
        {/* Row labels with totals */}
        {sortedRows.map((row, rowIndex) => (
          <text
            key={`row-${row}`}
            x={leftMargin - 10}
            y={topMargin + rowIndex * rowHeight + rowHeight / 2}
            textAnchor="end"
            fontSize="12"
            dominantBaseline="middle"
          >
            {`${row} (${rowTotals[row]})`}
          </text>
        ))}
        
        {/* Bubbles */}
        {sortedRows.map((row, rowIndex) => {
          const rowData = data?.data[row] || {};
          return sortedDates.map((date, colIndex) => {
            const value = rowData[date] || 0;
            if (value === 0) return null;
            
            // Calculate bubble size based on value
            const baseBubbleSize = 16; // Minimum size for visibility
            const scaledSize = calculateBubbleSize(value);
            const bubbleSize = Math.max(baseBubbleSize, scaledSize * 3);
            
            // Calculate position
            const cx = leftMargin + colIndex * cellWidth + cellWidth / 2;
            const cy = topMargin + rowIndex * rowHeight + rowHeight / 2;
            
            // Calculate opacity based on value
            const opacity = 0.7 + (value / maxValue) * 0.3;
            
            // Calculate color based on frequency
            const frequency = rowFrequencies[row];
            
            const colors = [
              '#3b82f6', // Primary blue for most frequent
              '#4c90f3', // Slightly lighter
              '#5d9ef0',
              '#6eabed',
              '#7fb9ea' // Lightest blue for least frequent
            ];
            
            const colorIndex = Math.min(colors.length - 1, Math.floor((frequency - 1) / 2));
            const color = colors[colorIndex];
            
            return (
              <g key={`bubble-${row}-${date}`}>
                {/* Highlight cell */}
                <rect
                  x={leftMargin + colIndex * cellWidth}
                  y={topMargin + rowIndex * rowHeight}
                  width={cellWidth}
                  height={rowHeight}
                  fill={color}
                  fillOpacity="0.05"
                />
                
                {/* The bubble */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={bubbleSize}
                  fill={color}
                  fillOpacity={opacity}
                  stroke={color}
                  strokeOpacity={opacity + 0.2}
                />
                
                {/* Value text */}
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={bubbleSize > 20 ? "12" : "10"}
                  fontWeight="bold"
                  fill={bubbleSize > 20 ? "white" : "black"}
                >
                  {value}
                </text>
              </g>
            );
          });
        })}
        
        {/* Legend */}
        <g transform={`translate(${leftMargin + sortedDates.length * cellWidth + 20}, ${topMargin})`}>
          <text fontWeight="bold" fontSize="12">Legend</text>
          
          {/* Value legend */}
          <text x="0" y="25" fontSize="10">Value:</text>
          
          {[1, 2, 5].map((value, i) => {
            const bubbleSize = Math.max(16, calculateBubbleSize(value) * 3);
            return (
              <g key={`legend-${value}`} transform={`translate(30, ${25 + i * 25})`}>
                <circle
                  cx="0"
                  cy="0"
                  r={bubbleSize}
                  fill="#3b82f6"
                  fillOpacity="0.7"
                  stroke="#3b82f6"
                />
                <text x={bubbleSize + 5} y="0" dominantBaseline="middle" fontSize="10">{value}</text>
              </g>
            );
          })}
          
          {/* Frequency legend */}
          <text x="0" y="100" fontSize="10">Frequency:</text>
          
          {[
            {label: 'High', color: '#3b82f6'},
            {label: 'Medium', color: '#5d9ef0'},
            {label: 'Low', color: '#7fb9ea'}
          ].map((item, i) => (
            <g key={`legend-${item.label}`} transform={`translate(10, ${120 + i * 20})`}>
              <rect x="0" y="-8" width="16" height="16" fill={item.color} />
              <text x="20" y="0" dominantBaseline="middle" fontSize="10">{item.label}</text>
            </g>
          ))}
        </g>
      </svg>
    );
  };
  
  return (
    <Card className={noBorders ? "border-0 shadow-none" : undefined}>
      {!noBorders && (
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0 relative">
        <div className="absolute top-2 right-2 flex items-center space-x-1 z-10">
          <Button size="sm" variant="outline" onClick={zoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={zoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={downloadAsPng}
            className="bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
          >
            <Download className="h-4 w-4 mr-1" />
            PNG
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={downloadAsPdf}
            className="bg-blue-500 text-white hover:bg-blue-600 hover:text-white"
          >
            <Save className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
        
        <div 
          ref={containerRef} 
          className="bubble-chart-container overflow-auto"
          style={{ 
            transform: `scale(${scaleFactor})`, 
            transformOrigin: 'top left',
            transition: 'transform 0.2s ease',
            height: 600,
            position: 'relative'
          }}
        >
          {renderBubbleChart()}
        </div>
      </CardContent>
    </Card>
  );
};

export default BubbleChartRevised;