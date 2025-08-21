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
    html2canvas(containerRef.current).then(canvas => {
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-bubble-chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };
  
  const downloadAsPdf = () => {
    if (!containerRef.current) return;
    html2canvas(containerRef.current).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm' });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${title.replace(/\s+/g, '-').toLowerCase()}-bubble-chart.pdf`);
    });
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

  // Calculate max value for bubble sizing and coloring
  let maxValue = 0;
  data.rows.forEach(row => {
    data.columns.forEach(col => {
      const value = data.data[row]?.[col] || 0;
      if (value > maxValue) maxValue = value;
    });
  });
  
  // Viridis color palette
  const colors = {
    v1: "#440154", // Dark purple
    v2: "#414487", // Deep blue
    v3: "#2a788e", // Teal blue
    v4: "#22a884", // Green
    v5: "#7ad151", // Light green
    v6: "#fde725"  // Yellow
  };
  
  // Get bubble size based on value using standardized sizing utility
  const getBubbleSize = (value: number): number => {
    if (value === 0) return 0;
    return calculateBubbleSize(value);
  };
  
  // Get bubble color based on value
  const getBubbleColor = (value: number): string => {
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
  
  // Enhanced logging and analysis
  useEffect(() => {
    // Calculate data metrics
    const dataValues = topRows.reduce((count, { row }) => {
      return count + data.columns.filter(col => (data.data[row]?.[col] || 0) > 0).length;
    }, 0);
    
    // Log detailed information about the chart data
    console.log(`${title} Bubble Chart Data:`, {
      columns: data.columns.length,
      rows: topRows.length,
      dataValues
    });
    console.log(`${title} Bubble Chart: Max value found:`, maxValue);
    
    // Additional debugging for cell rendering
    if (containerRef.current) {
      setTimeout(() => {
        const bubbleCells = containerRef.current?.querySelectorAll('td div div[style*="border-radius: 50%"]');
        console.log(`${title} Bubble Chart: Found ${bubbleCells?.length || 0} rendered bubble cells`);
      }, 500);
    }
  }, [data, maxValue, title, topRows]);

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

          {/* Main visualization container */}
          <div 
            className="relative"
            ref={containerRef}
          >
            {/* New integrated table with sticky header at bottom */}
            <div 
              className="overflow-x-auto overflow-y-auto max-h-[460px]"
              style={{ 
                transform: `scale(${scaleFactor})`,
                transformOrigin: 'top left',
                scrollbarWidth: 'none', /* Firefox */
                msOverflowStyle: 'none', /* IE and Edge */
              }}
            >
              <table className="bubble-table" style={{ 
                width: '100%', 
                borderCollapse: 'separate', 
                borderSpacing: '0',
                tableLayout: 'fixed'
              }}>
                <colgroup>
                  <col width="180" />
                  {data.columns.map((col, idx) => (
                    <col key={`col-${idx}`} width="40" />
                  ))}
                </colgroup>
                
                {/* Main data body */}
                <tbody>
                  {topRows.map(({ row, rank, sum }) => (
                    <tr key={row} style={{ border: 'none' }}>
                      {/* Row label with rank */}
                      <td 
                        className="px-1 py-0.5 bg-white sticky left-0 z-10 max-w-[180px] truncate text-[9px] text-gray-900"
                        style={{ 
                          lineHeight: '1', 
                          fontWeight: 500, 
                          borderRight: '1px solid #eee',
                          width: '180px'
                        }}
                      >
                        <div className="flex items-center">
                          <span className="inline-flex items-center justify-center w-4 h-4 bg-gray-100 rounded-full mr-1 text-[8px] font-bold">
                            {rank}
                          </span>
                          <span className="truncate">{row}</span>
                          <span className="ml-1 text-gray-500 text-[8px]">({sum})</span>
                        </div>
                      </td>
                      
                      {/* Data cells with bubbles */}
                      {data.columns.map(col => {
                        const value = data.data[row]?.[col] || 0;
                        const size = getBubbleSize(value);
                        const color = getBubbleColor(value);
                        
                        return (
                          <td 
                            key={`${row}-${col}`} 
                            className="bubble-cell"
                            style={{ 
                              height: '24px',
                              width: '40px',
                              minWidth: '40px',
                              maxWidth: '40px',
                              padding: 0,
                              textAlign: 'center',
                              verticalAlign: 'middle',
                              backgroundColor: 'white !important',
                              background: 'white !important',
                              border: noBorders ? 'none' : '1px solid rgba(238,238,238,0.2)',
                              borderTop: '0',
                              borderLeft: '0'
                            }}
                          >
                            {value > 0 ? (
                              <div className="bubble-container" style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                height: '100%',
                                width: '100%',
                                backgroundColor: 'white',
                                background: 'white',
                                position: 'relative'
                              }}>
                                <div className="bubble" style={{ 
                                  width: `${size}px`, 
                                  height: `${size}px`,
                                  borderRadius: '50%',
                                  backgroundColor: color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '9px',
                                  fontWeight: 500,
                                  boxShadow: '0 0 0 1px rgba(255,255,255,0.8)',
                                  position: 'relative',
                                  zIndex: 5,
                                  userSelect: 'none'
                                }}>
                                  {value}
                                </div>
                              </div>
                            ) : (
                              <span style={{ 
                                display: 'inline-block', 
                                width: '1px', 
                                height: '1px', 
                                padding: 0,
                                margin: 0,
                                border: 'none',
                                backgroundColor: 'transparent' 
                              }} />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                
                {/* Date header as footer */}
                <tfoot style={{ 
                  position: 'sticky', 
                  bottom: 0, 
                  zIndex: 100,
                  backgroundColor: 'white',
                  boxShadow: '0 -2px 4px rgba(0,0,0,0.1)'
                }}>
                  <tr>
                    <th style={{ 
                      width: '180px', 
                      backgroundColor: 'white',
                      borderRight: noBorders ? 'none' : '1px solid #eee',
                      position: 'sticky',
                      left: 0,
                      zIndex: 101
                    }}></th>
                    {data.columns.map(column => (
                      <th 
                        key={`date-${column}`} 
                        style={{
                          width: '40px',
                          minWidth: '40px',
                          maxWidth: '40px',
                          padding: 0,
                          textAlign: 'center',
                          backgroundColor: 'white',
                          borderRight: noBorders ? 'none' : '1px solid rgba(238,238,238,0.2)'
                        }}
                      >
                        <div style={{
                          fontSize: '9px',
                          fontWeight: 600,
                          color: '#333',
                          whiteSpace: 'nowrap',
                          transform: 'rotate(45deg)',
                          transformOrigin: 'bottom left',
                          marginLeft: '2px',
                          marginTop: '10px',
                          height: '60px',
                          width: '70px',
                          overflow: 'visible'
                        }}>
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

export default BubbleChartRevised;