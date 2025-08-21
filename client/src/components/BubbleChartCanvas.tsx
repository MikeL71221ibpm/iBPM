import React, { useState, useRef, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Download, Save } from "lucide-react";
import { jsPDF } from "jspdf";

// Define pivot data structure
interface PivotData {
  columns: string[];
  rows: string[];
  data: Record<string, Record<string, number>>;
}

const BubbleChartCanvas = ({ 
  data, 
  title
}: { 
  data: PivotData | undefined;
  title: string;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scaleFactor, setScaleFactor] = useState(1);
  
  // Viridis color palette
  const colors = {
    v1: "#440154", // Dark purple
    v2: "#414487", // Deep blue
    v3: "#2a788e", // Teal blue
    v4: "#22a884", // Green
    v5: "#7ad151", // Light green
    v6: "#fde725"  // Yellow
  };
  
  // Zoom functions
  const zoomIn = () => setScaleFactor(prev => Math.min(prev + 0.2, 2));
  const zoomOut = () => setScaleFactor(prev => Math.max(prev - 0.2, 0.6));
  
  // Download functions
  const downloadAsPng = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = `${title.replace(/\\s+/g, '-').toLowerCase()}-bubble-chart.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };
  
  const downloadAsPdf = () => {
    if (!canvasRef.current) return;
    
    const imgData = canvasRef.current.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm' });
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${title.replace(/\\s+/g, '-').toLowerCase()}-bubble-chart.pdf`);
  };
  
  // Check if we have data to display
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

  // Calculate sums for each row and sort
  const rowsWithSums = data.rows.map(row => {
    const sum = data.columns.reduce((acc, col) => acc + (data.data[row]?.[col] || 0), 0);
    return { row, sum };
  });
  
  // Get top 30 rows by sum, but only include non-zero rows
  const topRows = rowsWithSums
    .filter(item => item.sum > 0)
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 30)
    .map((item, index) => ({ 
      row: item.row, 
      sum: item.sum, 
      rank: index + 1 
    }));
    
  // Calculate max value for bubble sizing and coloring
  let maxValue = 0;
  topRows.forEach(({ row }) => {
    data.columns.forEach(col => {
      const value = data.data[row]?.[col] || 0;
      if (value > maxValue) maxValue = value;
    });
  });
  
  // Get color based on value
  const getColorForValue = (value: number): string => {
    if (value === 0) return "transparent";
    
    if (maxValue <= 6) {
      // For small ranges, directly map to one of the 6 colors
      return colors[`v${Math.min(6, Math.max(1, value))}` as keyof typeof colors];
    } else {
      // For larger ranges, scale proportionally
      const colorIndex = Math.max(1, Math.min(6, Math.ceil(value * 6 / maxValue)));
      return colors[`v${colorIndex}` as keyof typeof colors];
    }
  };

  // Get bubble size based on value
  const getBubbleSize = (value: number): number => {
    if (value === 0) return 0;
    const minSize = 8;
    const maxSize = 20;
    return Math.max(minSize, Math.min(maxSize, Math.floor(minSize + (value / maxValue) * (maxSize - minSize))));
  };
  
  // If no data rows with values, show empty state
  if (topRows.length === 0) {
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
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || topRows.length === 0) return;

    const columnWidth = 40;
    const rowHeight = 24;
    const labelWidth = 180;
    const dateHeight = 60;
    
    // Set canvas dimensions
    const totalWidth = labelWidth + (data.columns.length * columnWidth);
    const totalHeight = (topRows.length * rowHeight) + dateHeight;
    
    canvas.width = totalWidth * window.devicePixelRatio;
    canvas.height = totalHeight * window.devicePixelRatio;
    canvas.style.width = `${totalWidth}px`;
    canvas.style.height = `${totalHeight}px`;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Scale for higher DPI displays
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Clear canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, totalWidth, totalHeight);
    
    // Draw background grid lines
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 0.5;
    
    // Vertical grid lines
    for (let i = 0; i <= data.columns.length; i++) {
      const x = labelWidth + (i * columnWidth);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, topRows.length * rowHeight);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let i = 0; i <= topRows.length; i++) {
      const y = i * rowHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(totalWidth, y);
      ctx.stroke();
    }
    
    // Draw row labels with rank
    ctx.fillStyle = '#333';
    ctx.font = '9px sans-serif';
    topRows.forEach(({ row, rank, sum }, index) => {
      const y = index * rowHeight;
      
      // Draw rank circle
      ctx.fillStyle = '#f0f0f0';
      ctx.beginPath();
      ctx.arc(10, y + rowHeight/2, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw rank number
      ctx.fillStyle = '#333';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rank.toString(), 10, y + rowHeight/2);
      
      // Draw row label
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(row.length > 20 ? row.substring(0, 18) + '...' : row, 22, y + rowHeight/2);
      
      // Draw sum in parentheses
      ctx.fillStyle = '#777';
      ctx.font = '8px sans-serif';
      ctx.fillText(`(${sum})`, 22 + ctx.measureText(row.length > 20 ? row.substring(0, 18) + '...' : row).width + 4, y + rowHeight/2);
    });
    
    // Draw data bubbles
    topRows.forEach(({ row }, rowIndex) => {
      data.columns.forEach((col, colIndex) => {
        const value = data.data[row]?.[col] || 0;
        if (value > 0) {
          const x = labelWidth + (colIndex * columnWidth) + (columnWidth / 2);
          const y = (rowIndex * rowHeight) + (rowHeight / 2);
          const size = getBubbleSize(value);
          
          // Draw bubble
          ctx.fillStyle = getColorForValue(value);
          ctx.beginPath();
          ctx.arc(x, y, size/2, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw value text
          ctx.fillStyle = 'white';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(value.toString(), x, y);
        }
      });
    });
    
    // Draw date labels
    const dateY = topRows.length * rowHeight + 20;
    ctx.fillStyle = '#333';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.save();
    
    data.columns.forEach((col, colIndex) => {
      const x = labelWidth + (colIndex * columnWidth) + 2;
      ctx.save();
      ctx.translate(x, dateY);
      ctx.rotate(Math.PI / 4); // 45 degrees
      ctx.fillText(col, 0, 0);
      ctx.restore();
    });
    
    // Log data for debugging
    console.log(`${title} Canvas Bubble Chart Data:`, {
      columns: data.columns.length,
      rows: topRows.length,
      maxValue,
      canvasWidth: totalWidth,
      canvasHeight: totalHeight
    });
    
  }, [data, topRows, title, maxValue, scaleFactor]);
  
  return (
    <Card className="mb-4">
      <CardHeader className="py-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        <div className="bg-white rounded">
          {/* Legend and controls row */}
          <div className="mb-2 flex justify-between items-start">
            <div className="flex items-center gap-2 flex-wrap text-[9px] text-gray-900">
              <span className="font-semibold">Legend:</span>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={`legend-${i}`} className="flex items-center gap-1">
                  <div 
                    className="rounded-full"
                    style={{ 
                      width: `${5 + i * 2}px`, 
                      height: `${5 + i * 2}px`,
                      backgroundColor: colors[`v${i}` as keyof typeof colors]
                    }}
                  ></div>
                  <span>{i === 6 ? "Highest" : i === 1 ? "Lowest" : ""}</span>
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={zoomIn} title="Zoom In">
                <ZoomIn className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={zoomOut} title="Zoom Out">
                <ZoomOut className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={downloadAsPng} title="Download PNG">
                <Download className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={downloadAsPdf} title="Download PDF">
                <Save className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Canvas container */}
          <div 
            className="relative overflow-x-auto max-h-[500px]"
            ref={containerRef}
            style={{ 
              transform: `scale(${scaleFactor})`,
              transformOrigin: 'top left'
            }}
          >
            <canvas 
              ref={canvasRef} 
              style={{ 
                display: 'block',
                backgroundColor: 'white'
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BubbleChartCanvas;