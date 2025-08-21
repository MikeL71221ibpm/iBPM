import React, { useState, useCallback, useRef } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Download, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import DatabaseStatsWidget from '@/components/DatabaseStatsWidget';
// Simple bubble size calculation
const calculateBubbleSize = (frequency: number): number => {
  if (frequency <= 1) return 5;
  if (frequency <= 2) return 7;
  if (frequency <= 4) return 10;
  if (frequency <= 7) return 13;
  return 16;
};
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Simple color themes
const COLOR_THEMES = {
  iridis: {
    name: "Iridis (Purple-Blue)",
    HIGHEST: "#6A0DAD",
    HIGH: "#9370DB", 
    MEDIUM: "#B19CD9",
    LOW: "#CCCCFF",
    LOWEST: "#F8F8FF"
  }
};

interface ScatterDataPoint {
  x: string;
  y: string;
  size: number;
  frequency: number;
  color?: string;
}

interface ScatterGroupData {
  id: string;
  data: ScatterDataPoint[];
}

function SimpleScatterChart({ 
  data, 
  title, 
  onExpand 
}: { 
  data: any; 
  title: string; 
  onExpand: () => void;
}) {
  if (!data || !data.data) {
    return (
      <Card className="h-[400px]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Transform data for scatter chart
  const scatterData = data.columns.flatMap((col: string) => 
    data.rows.map((row: string) => {
      const value = data.data[row]?.[col] || 0;
      if (value > 0) {
        const frequency = Object.values(data.data[row] || {}).filter(v => v > 0).length;
        return {
          x: col,
          y: row,
          z: calculateBubbleSize(frequency),
          value,
          frequency
        };
      }
      return null;
    }).filter(Boolean)
  );

  return (
    <Card className="h-[400px]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{title}</CardTitle>
        <Button variant="outline" size="sm" onClick={onExpand}>
          <Maximize2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 100 }}>
            <XAxis 
              type="category" 
              dataKey="x" 
              name="Date"
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={10}
            />
            <YAxis 
              type="category" 
              dataKey="y" 
              name="Item"
              width={120}
              fontSize={10}
            />
            <ZAxis type="number" dataKey="z" range={[5, 20]} />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border rounded p-2 shadow">
                      <p className="font-medium">{data.y}</p>
                      <p className="text-sm">Date: {data.x}</p>
                      <p className="text-sm">Frequency: {data.frequency}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter data={scatterData} fill="#9370DB" />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function BubbleChartsWorking() {
  const [location] = useLocation();
  const [match, params] = useRoute('/bubble-charts/:patientId');
  const patientId = params?.patientId || location.split('/').pop();
  const [expandedChart, setExpandedChart] = useState<any>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Queries for each data type
  const symptomQuery = useQuery({
    queryKey: [`/api/pivot/symptom/${patientId}`],
    enabled: !!patientId
  });

  const diagnosisQuery = useQuery({
    queryKey: [`/api/pivot/diagnosis/${patientId}`],
    enabled: !!patientId
  });

  const diagnosticCategoryQuery = useQuery({
    queryKey: [`/api/pivot/diagnostic-category/${patientId}`],
    enabled: !!patientId
  });

  const hrsnQuery = useQuery({
    queryKey: [`/api/pivot/hrsn/${patientId}`],
    enabled: !!patientId
  });

  const exportGridAsPDF = useCallback(async () => {
    if (!gridRef.current) {
      console.warn('Grid ref not available for export');
      return;
    }
    
    try {
      const canvas = await html2canvas(gridRef.current, {
        scale: 2,
        backgroundColor: '#fff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`bubble-charts-patient-${patientId}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  }, [patientId]);

  if (!patientId) {
    return (
      <div className="container mx-auto py-4 px-12">
        <div className="text-center">
          <p>Please select a patient to view bubble charts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-12">
      <DatabaseStatsWidget />
      
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Bubble Chart Analysis - Patient {patientId}</h1>
        <Button onClick={exportGridAsPDF} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <div ref={gridRef} className="grid grid-cols-2 gap-4">
        <SimpleScatterChart
          data={symptomQuery.data}
          title="Symptoms"
          onExpand={() => setExpandedChart({ type: 'symptom', data: symptomQuery.data, title: 'Symptoms' })}
        />
        
        <SimpleScatterChart
          data={diagnosisQuery.data}
          title="Diagnoses"
          onExpand={() => setExpandedChart({ type: 'diagnosis', data: diagnosisQuery.data, title: 'Diagnoses' })}
        />
        
        <SimpleScatterChart
          data={diagnosticCategoryQuery.data}
          title="Diagnostic Categories"
          onExpand={() => setExpandedChart({ type: 'diagnostic-category', data: diagnosticCategoryQuery.data, title: 'Diagnostic Categories' })}
        />
        
        <SimpleScatterChart
          data={hrsnQuery.data}
          title="HRSN Indicators"
          onExpand={() => setExpandedChart({ type: 'hrsn', data: hrsnQuery.data, title: 'HRSN Indicators' })}
        />
      </div>

      {/* Expanded Chart Dialog */}
      {expandedChart && (
        <Dialog open={true} onOpenChange={() => setExpandedChart(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh]">
            <DialogHeader>
              <DialogTitle>{expandedChart.title} - Detailed View</DialogTitle>
            </DialogHeader>
            <div className="h-[80vh]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 100, left: 150 }}>
                  <XAxis 
                    type="category" 
                    dataKey="x" 
                    name="Date"
                    angle={-45}
                    textAnchor="end"
                    height={120}
                    fontSize={12}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="y" 
                    name="Item"
                    width={180}
                    fontSize={12}
                  />
                  <ZAxis type="number" dataKey="z" range={[8, 30]} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border rounded p-3 shadow-lg">
                            <p className="font-medium">{data.y}</p>
                            <p className="text-sm">Date: {data.x}</p>
                            <p className="text-sm">Frequency: {data.frequency}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter 
                    data={expandedChart.data?.columns?.flatMap((col: string) => 
                      expandedChart.data?.rows?.map((row: string) => {
                        const value = expandedChart.data?.data?.[row]?.[col] || 0;
                        if (value > 0) {
                          const frequency = Object.values(expandedChart.data?.data?.[row] || {}).filter(v => v > 0).length;
                          return {
                            x: col,
                            y: row,
                            z: calculateBubbleSize(frequency),
                            value,
                            frequency
                          };
                        }
                        return null;
                      }).filter(Boolean)
                    ) || []} 
                    fill="#9370DB" 
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}