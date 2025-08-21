import React, { useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { ResponsiveCirclePacking } from '@nivo/circle-packing';
import ChartExportWidget from '@/components/chart-export-widget';

// Interface for patient visualization parameters
interface PatientVisualizationParams {
  patientId?: string;
}

// Define data types for visualization 
const DATA_TYPES = [
  { id: 'symptom', name: 'Symptoms', description: 'Patient symptoms extracted from clinical notes.' },
  { id: 'diagnosis', name: 'Diagnoses', description: 'Diagnosed conditions identified in clinical documentation.' },
  { id: 'category', name: 'Diagnostic Categories', description: 'Broader diagnostic classifications of conditions.' },
  { id: 'hrsn', name: 'HRSN Indicators', description: 'Health-related social needs affecting patient health.' }
];

// Interface for bubble data
interface BubbleDataItem {
  id: string;
  value: number;
  color?: string;
}

interface RootBubbleNode {
  id: string;
  name: string;
  children: BubbleDataItem[];
}

// Interface for API response data
interface PivotData {
  rows: string[];
  columns: string[];
  data: Record<string, Record<string, number>>;
  maxValue: number;
}

// Color function based on the Iridis color scale
const getIridisColor = (value: number, max: number): string => {
  // Normalize value to 0-1 range
  const normalizedValue = value / max;
  
  // Use quantized levels for color bands
  if (normalizedValue >= 0.85) return '#994C99'; // Deep purple
  if (normalizedValue >= 0.65) return '#8856A7'; // Dark purple
  if (normalizedValue >= 0.45) return '#8C96C6'; // Purple
  if (normalizedValue >= 0.25) return '#B3CDE3'; // Blue/purple
  return '#EDF8FB'; // Light blue/purple
};

// BubbleSection component for displaying a specific data type
const BubbleSection = ({ 
  dataType, 
  patientId,
  compact = true 
}: { 
  dataType: string; 
  patientId: string;
  compact?: boolean;
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const displayName = DATA_TYPES.find(type => type.id === dataType)?.name || dataType;
  
  // Fetch data from API
  const { data, error, isLoading } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${dataType}/${patientId}`],
  });
  
  // Process data into bubble format
  const bubbleData = React.useMemo(() => {
    if (!data) return { id: 'root', name: displayName, children: [] };
    
    // Create a flat list of items with their total counts
    const items = data.rows.map((row: string, index: number) => {
      // Sum values across all columns for this item
      const total = data.columns.reduce((sum: number, col: string) => {
        return sum + (data.data[row]?.[col] || 0);
      }, 0);
      
      return {
        id: row,
        value: total,
        color: getIridisColor(total, data.maxValue || 1)
      };
    });
    
    // Sort by total value descending
    items.sort((a: BubbleDataItem, b: BubbleDataItem) => b.value - a.value);
    
    // Return a hierarchical structure for the bubble chart
    return {
      id: 'root',
      name: displayName,
      children: items
    };
  }, [data, displayName]);
  
  // Extract max value for color scale
  const maxValue = data?.maxValue || 0;
  
  // Prepare export data
  const exportData = React.useMemo(() => {
    if (!data) return [];
    
    const results: any[] = [];
    data.rows.forEach(row => {
      const rowData = data.data[row] || {};
      let rowTotal = 0;
      
      // Add individual date entries
      data.columns.forEach(col => {
        const value = rowData[col] || 0;
        if (value > 0) {
          rowTotal += value;
          results.push({
            Item: row,
            Date: col,
            Frequency: value
          });
        }
      });
      
      // Add total for the row
      if (rowTotal > 0) {
        results.push({
          Item: row,
          Date: 'TOTAL',
          Frequency: rowTotal
        });
      }
    });
    
    return results;
  }, [data]);
  
  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-base font-medium">{displayName}</h3>
        <div className="flex space-x-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setDialogOpen(true)}
            disabled={isLoading || !data}
          >
            Expand
          </Button>
        </div>
      </div>
      
      {/* Expanded view dialog */}
      <div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{displayName} - Full View</DialogTitle>
            </DialogHeader>
            
            {data && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-2 bg-slate-50 border-b mb-4">
                  <h3 className="text-lg font-medium">Complete {displayName} Data</h3>
                  <p className="text-sm text-gray-500">
                    Showing {data?.rows?.length || 0} items with bubble size representing total frequency across all dates.
                    Larger bubbles indicate higher frequency.
                  </p>
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-gray-500">
                      Click on bubbles to zoom in and explore details
                    </div>
                    <div className="flex items-center space-x-2">
                      <ChartExportWidget
                        chartId={`bubble-chart-${dataType}-${patientId}-expanded`}
                        chartTitle={`${displayName} - Patient ${patientId}`}
                        data={exportData}
                        showCloseButton={false}
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setDialogOpen(false)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                  
                  <div 
                    className="flex-1 overflow-auto" 
                    style={{ 
                      height: '75vh',
                      maxHeight: '75vh'
                    }}
                    ref={chartRef}
                  >
                    <div style={{
                      height: '100%',
                      minHeight: '600px',
                      width: '100%'
                    }}>
                      <BubbleVisualization 
                        data={bubbleData} 
                        maxValue={maxValue}
                        compact={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-[150px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500 text-xs">
            Error loading data
          </div>
        ) : (
          <div 
            className="mt-1" 
            style={{ 
              height: dataType === 'hrsn' ? '170px' : '300px',
              overflowY: 'scroll', // Force scrollbar to match pivot table style
              overflowX: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '4px'
            }}
            ref={chartRef}
          >
            <div style={{
              height: '100%',
              minHeight: dataType === 'hrsn' ? '250px' : '300px',
              width: '100%'
            }}>
              <BubbleVisualization 
                data={bubbleData} 
                maxValue={maxValue}
                compact={compact}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Bubble Visualization Component
const BubbleVisualization = ({ 
  data, 
  maxValue, 
  compact = false 
}: { 
  data: RootBubbleNode; 
  maxValue: number;
  compact?: boolean;
}) => {
  if (!data || !data.children || data.children.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data available to display</div>;
  }
  
  // Calculate padding based on compact mode
  const padding = compact ? 2 : 4;
  
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ResponsiveCirclePacking
        data={data}
        margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
        id="id"
        value="value"
        colors={({ data }: any) => data?.color || '#EDF8FB'}
        padding={padding}
        enableLabels={true}
        labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
        animate={false}
        motionConfig="gentle"
        labelSkipRadius={compact ? 14 : 20}
        labelTextDimension="height"
        tooltip={({ node }: any) => (
          <div
            style={{
              padding: '8px 12px',
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              color: '#333',
              fontSize: '0.8rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <strong>{node.id}</strong>
            <div style={{ marginTop: 4 }}>
              Frequency: <strong>{node.value}</strong>
            </div>
          </div>
        )}
        isInteractive={true}
        onMouseLeave={() => {}}
        theme={{
          labels: {
            text: {
              fontSize: compact ? 9 : 11,
              fontWeight: 'bold'
            }
          },
          tooltip: {
            container: {
              pointerEvents: 'none'
            }
          }
        }}
      />
    </div>
  );
};

// Helper function to get a patient name based on ID
const getPatientName = (patientId: number): string => {
  // For this application, we'll use "Bob Test" followed by the ID number
  return `Bob Test${patientId}`;
};

// Main component - displays all four bubble charts in a grid layout
export default function NivoBubbleView() {
  const { patientId } = useParams<PatientVisualizationParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  
  // Update the URL when the component loads to ensure it has patientId
  React.useEffect(() => {
    if (!patientId) {
      setLocation(`/nivo-bubble-view/${patientToDisplay}`);
    }
  }, [patientId, patientToDisplay, setLocation]);

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="text-lg font-medium">
              Patient Name: {getPatientName(parseInt(patientToDisplay))}
              <span className="ml-4 text-sm text-gray-600">ID#: P{patientToDisplay.padStart(4, '0')}</span>
            </div>
          </CardTitle>
          <CardDescription>
            Quick overview of all patient data through bubble visualizations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setLocation(`/direct-grid-view/${patientToDisplay}`)}
              >
                View Pivot Tables
              </Button>
              <Button 
                variant="outline"
                onClick={() => setLocation(`/nivo-heatmap-view/${patientToDisplay}`)}
              >
                View Heatmaps
              </Button>
              <Button onClick={() => window.location.reload()}>
                Refresh Data
              </Button>
            </div>
          </div>
          
          {/* Display all four bubble charts in a 2x2 grid - always visible */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DATA_TYPES.map((type) => (
              <BubbleSection 
                key={type.id} 
                dataType={type.id} 
                patientId={patientToDisplay}
                compact={true}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}