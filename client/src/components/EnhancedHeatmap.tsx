import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { useTheme } from '@/components/theme-provider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

// Type for the pivot table data
interface PivotTableData {
  rows: string[];
  columns: string[];
  values: Record<string, Record<string, number>>;
}

interface EnhancedHeatmapProps {
  data: PivotTableData;
  title: string;
  description?: string;
  colorScheme?: 'blue' | 'red' | 'green' | 'amber';
  minColor?: string;
  maxColor?: string;
  emptyColor?: string;
  height?: number;
}

const EnhancedHeatmap: React.FC<EnhancedHeatmapProps> = ({
  data,
  title,
  description,
  colorScheme = 'blue',
  minColor,
  maxColor,
  emptyColor = '#f8fafc',
  height = 500
}) => {
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';

  // Define color schemes
  const colorSchemes = {
    blue: {
      min: minColor || (isDarkTheme ? '#0c4a6e' : '#dbeafe'),
      max: maxColor || (isDarkTheme ? '#60a5fa' : '#1d4ed8')
    },
    red: {
      min: minColor || (isDarkTheme ? '#7f1d1d' : '#fee2e2'),
      max: maxColor || (isDarkTheme ? '#f87171' : '#b91c1c')
    },
    green: {
      min: minColor || (isDarkTheme ? '#14532d' : '#dcfce7'),
      max: maxColor || (isDarkTheme ? '#4ade80' : '#15803d')
    },
    amber: {
      min: minColor || (isDarkTheme ? '#78350f' : '#fef3c7'),
      max: maxColor || (isDarkTheme ? '#fbbf24' : '#b45309')
    }
  };

  // Transform the data for the Nivo heatmap
  const heatmapData = useMemo(() => {
    return data.rows.map(row => {
      const rowData: any = { id: row };
      
      data.columns.forEach(column => {
        // If this cell has no value, set it to null to represent empty
        rowData[column] = data.values[row]?.[column] || null;
      });
      
      return rowData;
    });
  }, [data]);

  // Get highest value for color scaling
  const maxValue = useMemo(() => {
    let max = 0;
    data.rows.forEach(row => {
      data.columns.forEach(column => {
        const value = data.values[row]?.[column] || 0;
        if (value > max) max = value;
      });
    });
    return max;
  }, [data]);

  // Prepare a CellComponent to handle our tooltip and empty cells
  const CellComponent = ({ data, x, y, width, height, color, borderWidth, borderColor, opacity, value }) => {
    return (
      <g transform={`translate(${x}, ${y})`}>
        <rect
          x={borderWidth / 2}
          y={borderWidth / 2}
          width={width - borderWidth}
          height={height - borderWidth}
          fill={value === null ? emptyColor : color}
          strokeWidth={borderWidth}
          stroke={borderColor}
          opacity={opacity}
        />
        {value !== null && (
          <text
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontSize: '10px',
              fontWeight: 'bold',
              fill: isDarkTheme ? 'white' : 'black'
            }}
          >
            {value}
          </text>
        )}
      </g>
    );
  };

  // Cell tooltip component
  const cellTooltip = ({ id, value, xKey }) => (
    <div style={{ 
      backgroundColor: isDarkTheme ? '#1e293b' : 'white', 
      padding: '8px', 
      border: `1px solid ${isDarkTheme ? '#475569' : '#e2e8f0'}`,
      borderRadius: '4px',
      color: isDarkTheme ? 'white' : 'black'
    }}>
      <div><strong>{id}</strong></div>
      <div>Date: {xKey}</div>
      <div>Count: {value || 0}</div>
    </div>
  );

  // Helper function to check if the data is empty
  const isDataEmpty = useMemo(() => {
    return data.rows.length === 0 || data.columns.length === 0;
  }, [data]);

  if (isDataEmpty) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="text-center text-muted-foreground p-8">
          No data available for visualization.
        </CardContent>
      </Card>
    );
  }

  // Get the active color scheme
  const activeColorScheme = colorSchemes[colorScheme];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="heatmap">
          <TabsList className="mb-4">
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>
          <TabsContent value="heatmap" className="h-full">
            <div style={{ height: `${height}px` }}>
              <ResponsiveHeatMap
                data={heatmapData}
                keys={data.columns}
                indexBy="id"
                margin={{ top: 20, right: 60, bottom: 60, left: 140 }}
                forceSquare={false}
                axisTop={null}
                axisRight={null}
                axisBottom={{
                  tickSize: 5,
                  tickRotation: -45,
                  legend: 'Date',
                  legendPosition: 'middle',
                  legendOffset: 40
                }}
                axisLeft={{
                  tickSize: 5,
                  tickRotation: 0,
                  legend: '',
                  legendPosition: 'middle',
                  legendOffset: -40
                }}
                cellOpacity={1}
                cellBorderWidth={1}
                cellBorderColor={isDarkTheme ? '#1e293b' : '#e2e8f0'}
                labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                colors={{
                  type: 'sequential',
                  scheme: 'blues'
                }}
                emptyColor={emptyColor}
                minValue={0}
                maxValue={maxValue}
                cellComponent={CellComponent}
                hoverTarget="cell"
                tooltip={cellTooltip}
                animate={true}
                motionConfig="gentle"
                theme={{
                  tooltip: {
                    container: {
                      background: isDarkTheme ? '#1e293b' : 'white',
                      color: isDarkTheme ? 'white' : 'black',
                      fontSize: '12px',
                      borderRadius: '4px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }
                  },
                  axis: {
                    ticks: {
                      text: {
                        fill: isDarkTheme ? '#94a3b8' : '#64748b',
                        fontSize: 11
                      }
                    },
                    legend: {
                      text: {
                        fill: isDarkTheme ? '#e2e8f0' : '#334155',
                        fontSize: 12
                      }
                    }
                  },
                  grid: {
                    line: {
                      stroke: isDarkTheme ? '#1e293b' : '#e2e8f0',
                      strokeWidth: 1
                    }
                  }
                }}
              />
            </div>
          </TabsContent>
          <TabsContent value="table">
            <ScrollArea className="h-[450px]">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10">
                        {title}
                      </TableHead>
                      {data.columns.map(column => (
                        <TableHead key={column} className="text-center whitespace-nowrap">
                          {column}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map(row => (
                      <TableRow key={row}>
                        <TableCell className="font-medium sticky left-0 bg-background z-10">
                          {row}
                        </TableCell>
                        {data.columns.map(column => {
                          const value = data.values[row]?.[column] || 0;
                          const intensity = Math.min(0.9, Math.max(0.1, value / maxValue));
                          
                          // Determine background color based on value intensity
                          let cellBgClass = '';
                          if (value > 0) {
                            if (colorScheme === 'blue') {
                              cellBgClass = intensity < 0.25 ? 'bg-blue-50' : 
                                           intensity < 0.5 ? 'bg-blue-100' : 
                                           intensity < 0.75 ? 'bg-blue-200' : 'bg-blue-300';
                              if (isDarkTheme) {
                                cellBgClass = intensity < 0.25 ? 'bg-blue-950' : 
                                             intensity < 0.5 ? 'bg-blue-900' : 
                                             intensity < 0.75 ? 'bg-blue-800' : 'bg-blue-700';
                              }
                            } else if (colorScheme === 'red') {
                              cellBgClass = intensity < 0.25 ? 'bg-red-50' : 
                                           intensity < 0.5 ? 'bg-red-100' : 
                                           intensity < 0.75 ? 'bg-red-200' : 'bg-red-300';
                              if (isDarkTheme) {
                                cellBgClass = intensity < 0.25 ? 'bg-red-950' : 
                                             intensity < 0.5 ? 'bg-red-900' : 
                                             intensity < 0.75 ? 'bg-red-800' : 'bg-red-700';
                              }
                            } else if (colorScheme === 'green') {
                              cellBgClass = intensity < 0.25 ? 'bg-green-50' : 
                                           intensity < 0.5 ? 'bg-green-100' : 
                                           intensity < 0.75 ? 'bg-green-200' : 'bg-green-300';
                              if (isDarkTheme) {
                                cellBgClass = intensity < 0.25 ? 'bg-green-950' : 
                                             intensity < 0.5 ? 'bg-green-900' : 
                                             intensity < 0.75 ? 'bg-green-800' : 'bg-green-700';
                              }
                            } else if (colorScheme === 'amber') {
                              cellBgClass = intensity < 0.25 ? 'bg-amber-50' : 
                                           intensity < 0.5 ? 'bg-amber-100' : 
                                           intensity < 0.75 ? 'bg-amber-200' : 'bg-amber-300';
                              if (isDarkTheme) {
                                cellBgClass = intensity < 0.25 ? 'bg-amber-950' : 
                                             intensity < 0.5 ? 'bg-amber-900' : 
                                             intensity < 0.75 ? 'bg-amber-800' : 'bg-amber-700';
                              }
                            }
                          }
                          
                          return (
                            <TableCell key={column} className={`text-center ${cellBgClass}`}>
                              {value > 0 ? value : ''}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EnhancedHeatmap;