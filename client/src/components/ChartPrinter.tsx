// ChartPrinter.tsx - May 22, 2025
// A dedicated component for full-page chart display and PDF printing

import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, FileText, Download, X, Maximize2 } from 'lucide-react';

interface ChartPrinterProps {
  chartData: Array<{id: string; value: number; displayValue: number; percentage: number}>;
  title: string;
  description: string;
  displayMode: 'count' | 'percentage';
  colors: string[];
  isOpen: boolean;
  onClose: () => void;
}

export default function ChartPrinter({
  chartData,
  title,
  description,
  displayMode,
  colors,
  isOpen,
  onClose
}: ChartPrinterProps) {
  const [loading, setLoading] = useState(false);
  const chartRef = React.useRef<HTMLDivElement>(null);
  
  const handlePrint = async () => {
    if (!chartRef.current) return;
    
    try {
      setLoading(true);
      
      // Wait a moment to ensure chart is fully rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture the chart at high resolution
      const canvas = await html2canvas(chartRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      // Create PDF in landscape orientation
      const pdf = new jsPDF('l', 'mm', 'a4');
      
      // PDF dimensions
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Add the image to completely fill the PDF
      pdf.addImage(
        canvas.toDataURL('image/png', 1.0),
        'PNG',
        0, 0,
        pdfWidth, pdfHeight
      );
      
      // Save the PDF
      pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
      
      toast({
        title: 'Print Successful',
        description: 'Chart saved as PDF document',
      });
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: 'Print Failed',
        description: 'Unable to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const maxValue = Math.max(...chartData.map(d => d.displayValue));
  
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[60vw] max-h-[120vh] w-full p-3 overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="text-gray-500">{description}</p>
              <p className="text-sm text-gray-400 italic">
                Display Mode: {displayMode === 'count' ? 'Count Values' : 'Percentage Values'}
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint}
                disabled={loading}
              >
                <Printer className="h-4 w-4 mr-1" />
                {loading ? 'Processing...' : 'Print'}
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div 
            ref={chartRef} 
            className="flex-1 flex items-center justify-center bg-white p-6 rounded-lg"
          >
            {/* Full-page custom SVG chart - direct control and perfect scaling */}
            <svg width="100%" height="100%" viewBox={`0 0 1000 600`} preserveAspectRatio="xMidYMid meet">
              {/* Background */}
              <rect width="1000" height="600" fill="#ffffff" />
              
              {/* Chart title */}
              <text 
                x="500" 
                y="40" 
                fontSize="24" 
                fontWeight="bold" 
                textAnchor="middle"
                fill="#333"
              >
                {title}
              </text>
              
              {/* Y-axis line */}
              <line 
                x1="100" 
                y1="80" 
                x2="100" 
                y2="520" 
                stroke="#444" 
                strokeWidth="2" 
              />
              
              {/* X-axis line */}
              <line 
                x1="100" 
                y1="520" 
                x2="900" 
                y2="520" 
                stroke="#444" 
                strokeWidth="2" 
              />
              
              {/* Y-axis label */}
              <text 
                x="40" 
                y="300" 
                fontSize="18" 
                textAnchor="middle" 
                fill="#666"
                transform="rotate(-90, 40, 300)"
              >
                {displayMode === 'count' ? 'Count' : 'Percentage (%)'}
              </text>
              
              {/* Y-axis ticks and values */}
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => {
                const y = 520 - (440 * ratio);
                const value = Math.round(maxValue * ratio);
                return (
                  <g key={`y-tick-${i}`}>
                    <line 
                      x1="95" 
                      y1={y} 
                      x2="100" 
                      y2={y} 
                      stroke="#666" 
                      strokeWidth="1" 
                    />
                    <text 
                      x="85" 
                      y={y + 5} 
                      fontSize="16" 
                      textAnchor="end" 
                      fill="#666"
                    >
                      {value}{displayMode === 'percentage' ? '%' : ''}
                    </text>
                  </g>
                );
              })}
              
              {/* Chart bars */}
              <g>
                {chartData.map((item, i) => {
                  const barWidth = Math.min(60, (800 / chartData.length) * 0.6);
                  const spacing = Math.min(40, (800 / chartData.length) * 0.4);
                  const barHeight = (item.displayValue / maxValue) * 440;
                  const x = 100 + (i * (barWidth + spacing)) + spacing/2;
                  const y = 520 - barHeight;
                  
                  return (
                    <g key={`bar-${i}`}>
                      {/* Bar */}
                      <rect 
                        x={x} 
                        y={y} 
                        width={barWidth} 
                        height={barHeight} 
                        fill={colors[i % colors.length]} 
                        rx="3"
                      />
                      
                      {/* Value on top of bar */}
                      <text 
                        x={x + barWidth/2} 
                        y={y - 10} 
                        fontSize="18" 
                        fontWeight="bold"
                        textAnchor="middle" 
                        fill="#333"
                      >
                        {displayMode === 'percentage' 
                          ? `${item.displayValue}%` 
                          : item.displayValue
                        }
                      </text>
                      
                      {/* X-axis label */}
                      <text 
                        x={x + barWidth/2} 
                        y="560" 
                        fontSize="16" 
                        textAnchor="middle" 
                        fill="#666"
                        transform={`rotate(-35, ${x + barWidth/2}, 560)`}
                      >
                        {item.id}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}