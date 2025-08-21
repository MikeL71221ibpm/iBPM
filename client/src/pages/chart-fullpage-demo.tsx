// Chart Full Page Demo - May 22, 2025
// A dedicated test page for full-page chart display and PDF printing

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Printer, Maximize2 } from 'lucide-react';

export default function ChartFullpageDemo() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const chartRef = React.useRef<HTMLDivElement>(null);
  
  // Demo data
  const chartData = [
    { id: 'High Risk', value: 318, percentage: 30 },
    { id: 'Medium Risk', value: 424, percentage: 40 },
    { id: 'Low Risk', value: 318, percentage: 30 }
  ];
  
  // Colors for the demo chart
  const colors = ['#f87171', '#60a5fa', '#4ade80'];
  
  const handlePrint = async () => {
    if (!chartRef.current) return;
    
    try {
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
      pdf.save('risk_stratification_chart.pdf');
      
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
    }
  };
  
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Chart Fullpage Demo</h1>
      <p className="text-gray-500 mb-6">Click the buttons below to test full-page chart display and printing</p>
      
      <div className="flex gap-4 mb-8">
        <Button onClick={() => setIsExpanded(true)} className="bg-blue-500 text-white py-2 px-4 rounded flex items-center gap-2">
          <Maximize2 className="h-5 w-5" /> 
          <span>Show Full Page Chart</span>
        </Button>
        
        <Button onClick={handlePrint} className="bg-green-500 text-white py-2 px-4 rounded flex items-center gap-2">
          <Printer className="h-5 w-5" /> 
          <span>Print Chart</span>
        </Button>
      </div>
      
      {/* Demo chart preview */}
      <div className="border rounded-lg p-4 bg-white shadow">
        <h2 className="text-xl font-bold mb-1">Risk Stratification</h2>
        <p className="text-sm text-gray-500 mb-4">Patient risk levels</p>
        
        <div ref={chartRef} className="h-[300px] w-full">
          <svg width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid meet">
            {/* Background */}
            <rect width="800" height="300" fill="#ffffff" />
            
            {/* Chart title */}
            <text 
              x="400" 
              y="30" 
              fontSize="20" 
              fontWeight="bold" 
              textAnchor="middle"
              fill="#333"
            >
              Risk Stratification
            </text>
            
            {/* Y-axis line */}
            <line 
              x1="80" 
              y1="50" 
              x2="80" 
              y2="250" 
              stroke="#444" 
              strokeWidth="2" 
            />
            
            {/* X-axis line */}
            <line 
              x1="80" 
              y1="250" 
              x2="720" 
              y2="250" 
              stroke="#444" 
              strokeWidth="2" 
            />
            
            {/* Y-axis label */}
            <text 
              x="30" 
              y="150" 
              fontSize="14" 
              textAnchor="middle" 
              fill="#666"
              transform="rotate(-90, 30, 150)"
            >
              Count
            </text>
            
            {/* Y-axis ticks and values */}
            {[0, 100, 200, 300, 400].map((value, i) => {
              const y = 250 - (value / 450 * 200);
              return (
                <g key={`y-tick-${i}`}>
                  <line 
                    x1="75" 
                    y1={y} 
                    x2="80" 
                    y2={y} 
                    stroke="#666" 
                    strokeWidth="1" 
                  />
                  <text 
                    x="70" 
                    y={y + 5} 
                    fontSize="12" 
                    textAnchor="end" 
                    fill="#666"
                  >
                    {value}
                  </text>
                </g>
              );
            })}
            
            {/* Chart bars */}
            <g>
              {chartData.map((item, i) => {
                const barWidth = 150;
                const spacing = 70;
                const barHeight = (item.value / 450 * 200);
                const x = 130 + (i * (barWidth + spacing));
                const y = 250 - barHeight;
                
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
                      fontSize="16" 
                      fontWeight="bold"
                      textAnchor="middle" 
                      fill="#333"
                    >
                      {item.value}
                    </text>
                    
                    {/* X-axis label */}
                    <text 
                      x={x + barWidth/2} 
                      y="280" 
                      fontSize="14" 
                      textAnchor="middle" 
                      fill="#666"
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
      
      {/* Full page dialog */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-screen-2xl w-screen h-screen max-h-screen p-0 overflow-hidden rounded-none">
          <div className="flex flex-col h-full bg-white">
            <div className="p-4 bg-white border-b">
              <DialogTitle className="text-3xl font-bold">Risk Stratification</DialogTitle>
              <DialogDescription className="text-xl">Patient risk levels</DialogDescription>
            </div>
            
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex items-center justify-center bg-white px-4">
                <svg width="100%" height="100%" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet">
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
                    Risk Stratification
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
                    Count
                  </text>
                  
                  {/* Y-axis ticks and values */}
                  {[0, 100, 200, 300, 400, 500].map((value, i) => {
                    const y = 520 - (value / 500 * 440);
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
                          {value}
                        </text>
                      </g>
                    );
                  })}
                  
                  {/* Chart bars */}
                  <g>
                    {chartData.map((item, i) => {
                      const barWidth = 180;
                      const spacing = 100;
                      const barHeight = (item.value / 450 * 440);
                      const x = 180 + (i * (barWidth + spacing));
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
                            rx="4"
                          />
                          
                          {/* Value on top of bar */}
                          <text 
                            x={x + barWidth/2} 
                            y={y - 15} 
                            fontSize="24" 
                            fontWeight="bold"
                            textAnchor="middle" 
                            fill="#333"
                          >
                            {item.value}
                          </text>
                          
                          {/* X-axis label */}
                          <text 
                            x={x + barWidth/2} 
                            y="560" 
                            fontSize="18" 
                            textAnchor="middle" 
                            fill="#666"
                          >
                            {item.id}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </svg>
              </div>
              
              <div className="flex justify-end mt-2 p-4">
                <Button onClick={handlePrint} className="bg-green-500 text-white py-2 px-4 rounded flex items-center gap-2">
                  <Printer className="h-5 w-5" /> 
                  <span>Print Chart</span>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}