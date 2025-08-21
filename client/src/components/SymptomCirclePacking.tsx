// Symptom Circle Packing Component
// Individual search visualization with standardized export functionality

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ResponsiveCirclePacking } from '@nivo/circle-packing';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Maximize2, AlertCircle } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import ChartExportWidget from '@/components/chart-export-widget';

interface SymptomCirclePackingProps {
  patientId?: string;
  dateRange?: DateRange;
}

// Sample chart data structure
interface CircleNode {
  name: string;
  value?: number;
  children?: CircleNode[];
  color?: string;
}

export default function SymptomCirclePacking({ patientId, dateRange }: SymptomCirclePackingProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const chartId = `symptom-categories-chart-${patientId}`;

  // Fetch diagnostic category data
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/patient/diagnostic-categories', patientId, dateRange],
    enabled: !!patientId,
    retry: false,
  });

  // Format data for export
  const getExportData = () => {
    if (!data) return [];
    
    // Flatten hierarchical data for export
    const flattenedData: any[] = [];
    
    const flatten = (node: CircleNode, parentCategory: string = '') => {
      if (node.children) {
        node.children.forEach(child => {
          flatten(child, node.name);
        });
      } else if (node.value) {
        flattenedData.push({
          Category: parentCategory,
          Symptom: node.name,
          Count: node.value
        });
      }
    };
    
    data.children?.forEach(category => {
      flatten(category);
    });
    
    return flattenedData;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Diagnostic Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <Skeleton className="h-[250px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Diagnostic Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center text-center p-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Unable to load chart</h3>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "No data available for the selected patient."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sample data if needed (will be replaced by actual API data)
  const chartData = data || {
    name: "Diagnostic Categories",
    children: [
      {
        name: "Mood Disorders",
        children: [
          { name: "Depression", value: 24 },
          { name: "Anxiety", value: 18 },
          { name: "Bipolar Disorder", value: 8 }
        ]
      },
      {
        name: "Sleep Disorders",
        children: [
          { name: "Insomnia", value: 12 },
          { name: "Sleep Apnea", value: 6 }
        ]
      },
      {
        name: "Physical Symptoms",
        children: [
          { name: "Fatigue", value: 9 },
          { name: "Pain", value: 7 },
          { name: "Headache", value: 5 }
        ]
      }
    ]
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">
          Diagnostic Categories
        </CardTitle>
        <ChartExportWidget
          chartId={chartId}
          chartTitle="Diagnostic Categories"
          data={getExportData()}
        />
      </CardHeader>
      <CardContent>
        <div id={chartId} className="h-[300px]">
          <ResponsiveCirclePacking
            data={chartData}
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            id="name"
            value="value"
            colors={{ scheme: 'nivo' }}
            childColor={{ from: 'color', modifiers: [['brighter', 0.2]] }}
            padding={4}
            enableLabels={true}
            labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
            borderWidth={1}
            borderColor={{ from: 'color', modifiers: [['darker', 0.5]] }}
            animate={true}
            motionStiffness={90}
            motionDamping={15}
            tooltip={({ id, value, color }) => (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'white',
                  border: `1px solid ${color}`,
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <strong>{id}:</strong> {value}
              </div>
            )}
          />
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full" onClick={() => setIsExpanded(true)}>
              <Maximize2 className="mr-2 h-4 w-4" />
              Expand Chart
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[60vw] max-h-[120vh] w-[60vw] h-[120vh] p-1 overflow-hidden" style={{ maxWidth: '60vw', maxHeight: '120vh', width: '60vw', height: '120vh' }}>
            <DialogHeader className="pb-0 mb-0">
              <DialogTitle className="text-lg mb-0 pb-0">Diagnostic Categories - Patient {patientId}</DialogTitle>
            </DialogHeader>
            <div className="h-[calc(120vh-60px)] mt-0 pt-0 w-full landscape-chart-container">
              <ChartExportWidget
                chartId={`${chartId}-expanded`}
                chartTitle="Diagnostic Categories (Expanded)"
                data={getExportData()}
                iconSize={20}
                className="absolute top-2 right-2 z-[999] bg-white p-2 rounded-md shadow-lg border-2 border-blue-400"
              />
              <ResponsiveCirclePacking
                data={chartData}
                margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
                id="name"
                value="value"
                colors={{ scheme: 'nivo' }}
                childColor={{ from: 'color', modifiers: [['brighter', 0.2]] }}
                padding={8}
                enableLabels={true}
                labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                borderWidth={1}
                borderColor={{ from: 'color', modifiers: [['darker', 0.5]] }}
                animate={true}
                motionStiffness={90}
                motionDamping={15}
                // Increase label size for better readability in landscape view
                labelSkipRadius={10}
                labelTextColor={{
                  from: 'color',
                  modifiers: [['darker', 3]]
                }}
                // Improve tooltip visibility
                tooltip={({ id, value, color }) => (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: 'white',
                      border: `2px solid ${color}`,
                      borderRadius: '4px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      fontSize: '14px'
                    }}
                  >
                    <strong>{id}:</strong> {value}
                  </div>
                )}
                // Enhanced theme for better visualization
                theme={{
                  labels: {
                    text: {
                      fontSize: 14,
                      fontWeight: 600
                    }
                  },
                  tooltip: {
                    container: {
                      fontSize: '14px',
                      padding: '12px',
                      borderRadius: '4px'
                    }
                  }
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}