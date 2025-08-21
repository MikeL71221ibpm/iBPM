import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import { calculateBubbleSize } from '@/lib/bubble-size-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Palette } from 'lucide-react';

interface PivotData {
  rows: string[];
  columns: string[];
  data: Record<string, Record<string, number>>;
  maxValue: number;
}

interface ScatterDataPoint {
  x: string;
  y: string;
  size: number;
  frequency: number;
}

interface ScatterGroupData {
  id: string;
  data: ScatterDataPoint[];
}

// Color themes
const COLOR_THEMES = {
  iridis: {
    name: "Iridis (Purple)",
    colors: {
      HIGHEST: '#6A00FF',
      HIGH: '#A45CFF',
      MEDIUM: '#C98FFF',
      LOW: '#E0C2FF',
      LOWEST: '#F1E5FF',
    }
  },
  viridis: {
    name: "Viridis (Green-Blue)",
    colors: {
      HIGHEST: '#440154',
      HIGH: '#3B528B',
      MEDIUM: '#21908C',
      LOW: '#5DC963',
      LOWEST: '#FDE725',
    }
  },
  highContrast: {
    name: "High Contrast (B&W)",
    colors: {
      HIGHEST: '#000000',
      HIGH: '#444444',
      MEDIUM: '#888888',
      LOW: '#DDDDDD',
      LOWEST: '#FFFFFF',
    }
  },
  redBlue: {
    name: "Red-Blue",
    colors: {
      HIGHEST: '#9E0142',
      HIGH: '#F46D43',
      MEDIUM: '#FFFFFF',
      LOW: '#74ADD1',
      LOWEST: '#313695',
    }
  },
};

// Visualization component
const ThemedBubbleChart: React.FC<{ 
  dataType: 'symptom' | 'diagnosis' | 'category' | 'hrsn';
  patientId: string;
  title: string;
}> = ({ dataType, patientId, title }) => {
  const [activeTheme, setActiveTheme] = useState<string>('iridis');
  const [chartData, setChartData] = useState<ScatterGroupData[]>([]);
  const { toast } = useToast();

  // Fetch data from API
  const { data, isLoading, error } = useQuery<PivotData>({
    queryKey: [`/api/pivot/${dataType}/${patientId}`],
    staleTime: 5 * 60 * 1000,
  });

  // Process data for visualization
  useEffect(() => {
    if (!data || !data.rows || !data.columns) return;
    
    console.log(`Processing ${dataType} data with theme: ${activeTheme}`);
    
    const processedData: ScatterGroupData[] = [{
      id: dataType,
      data: []
    }];
    
    // Create data points
    data.rows.forEach(row => {
      data.columns.forEach(column => {
        const value = data.data[row]?.[column] || 0;
        if (value > 0) {
          // Count frequency (how many times this item appears)
          const frequency = data.columns.filter(col => 
            (data.data[row]?.[col] || 0) > 0
          ).length;
          
          processedData[0].data.push({
            x: column,
            y: row,
            size: value,
            frequency
          });
        }
      });
    });
    
    setChartData(processedData);
  }, [data, dataType, activeTheme]);

  // When theme changes, log it
  useEffect(() => {
    console.log(`Theme changed to: ${activeTheme}`);
  }, [activeTheme]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        Error loading data
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50 pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base font-bold">{title}</CardTitle>
            <p className="text-xs text-muted-foreground">Patient ID: {patientId}</p>
          </div>
          
          {/* Theme selector buttons */}
          <div className="flex items-center gap-1">
            <div className="mr-1">
              <Palette className="h-4 w-4 text-muted-foreground" />
            </div>
            {Object.entries(COLOR_THEMES).map(([themeKey, theme]) => (
              <Button 
                key={themeKey}
                size="sm" 
                variant={activeTheme === themeKey ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => {
                  setActiveTheme(themeKey);
                  toast({
                    title: "Theme Changed",
                    description: `Using ${theme.name} theme`,
                    variant: "default",
                  });
                }}
              >
                {theme.name.split(' ')[0]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div style={{ height: 500 }}>
          <ResponsiveScatterPlot
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 160, left: 300 }}
            xScale={{ type: 'point' }}
            yScale={{ type: 'point' }}
            nodeSize={d => {
              return calculateBubbleSize(d.frequency);
            }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 45,
              legendPosition: 'middle',
              legendOffset: 46,
              renderTick: (tick) => {
                return (
                  <g transform={`translate(${tick.x},${tick.y})`}>
                    <line stroke="#ccc" strokeWidth={1} y1={0} y2={5} />
                    <text
                      textAnchor="start"
                      dominantBaseline="text-before-edge"
                      transform="translate(0,7)rotate(45)"
                      style={{
                        fontSize: '10px',
                        fill: '#666',
                      }}
                    >
                      {tick.value}
                    </text>
                  </g>
                );
              },
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legendPosition: 'middle',
              legendOffset: -60,
              renderTick: (tick) => {
                return (
                  <g transform={`translate(${tick.x},${tick.y})`}>
                    <line stroke="#ccc" strokeWidth={1} x1={0} x2={-5} />
                    <text
                      textAnchor="end"
                      dominantBaseline="middle"
                      transform="translate(-10,0)"
                      style={{
                        fontSize: '10px',
                        fill: '#666',
                        maxWidth: '280px',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden'
                      }}
                    >
                      {tick.value}
                    </text>
                  </g>
                );
              },
            }}
            colors={node => {
              // Determine color based on frequency and active theme
              const theme = COLOR_THEMES[activeTheme as keyof typeof COLOR_THEMES];
              
              if (node.data.frequency >= 10) return theme.colors.HIGHEST;
              if (node.data.frequency >= 8) return theme.colors.HIGH;
              if (node.data.frequency >= 5) return theme.colors.MEDIUM;
              if (node.data.frequency >= 2) return theme.colors.LOW;
              return theme.colors.LOWEST;
            }}
            legends={[
              {
                anchor: 'bottom',
                direction: 'row',
                translateY: 140,
                translateX: 0,
                itemWidth: 100,
                itemHeight: 12,
                itemsSpacing: 5,
                itemTextColor: '#999',
                symbolSize: 12,
                symbolShape: 'circle',
                effects: [
                  {
                    on: 'hover',
                    style: {
                      itemTextColor: '#000'
                    }
                  }
                ],
                data: [
                  { id: 'Highest', label: 'Highest (10+)', color: COLOR_THEMES[activeTheme as keyof typeof COLOR_THEMES].colors.HIGHEST },
                  { id: 'High', label: 'High (8-9)', color: COLOR_THEMES[activeTheme as keyof typeof COLOR_THEMES].colors.HIGH },
                  { id: 'Medium', label: 'Medium (5-7)', color: COLOR_THEMES[activeTheme as keyof typeof COLOR_THEMES].colors.MEDIUM },
                  { id: 'Low', label: 'Low (2-4)', color: COLOR_THEMES[activeTheme as keyof typeof COLOR_THEMES].colors.LOW },
                  { id: 'Lowest', label: 'Lowest (1)', color: COLOR_THEMES[activeTheme as keyof typeof COLOR_THEMES].colors.LOWEST },
                ]
              }
            ]}
            tooltip={({ node }) => (
              <div className="bg-white p-2 border shadow-md text-xs">
                <div><strong>{node.data.y}</strong></div>
                <div>Date: {node.data.x}</div>
                <div>Frequency: {node.data.frequency} occurrences</div>
                <div>Value: {node.data.size}</div>
              </div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

// Full page component with all visualization types
export default function SimpleThemedBubbleChartPage() {
  // We'll use a hardcoded patient ID for simplicity
  const patientId = '1';
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Patient Visualization with Theme Selection</h1>
        <p className="text-muted-foreground">
          Interactive visualization of patient data with selectable color themes
        </p>
      </div>
      
      <div className="grid gap-6">
        <ThemedBubbleChart 
          dataType="symptom" 
          patientId={patientId} 
          title="Symptoms Over Time" 
        />
        
        <ThemedBubbleChart 
          dataType="diagnosis" 
          patientId={patientId} 
          title="Diagnoses Over Time" 
        />
        
        <ThemedBubbleChart 
          dataType="category" 
          patientId={patientId} 
          title="Diagnostic Categories Over Time" 
        />
        
        <ThemedBubbleChart 
          dataType="hrsn" 
          patientId={patientId} 
          title="HRSN Factors Over Time" 
        />
      </div>
    </div>
  );
}