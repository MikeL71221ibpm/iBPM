import React from 'react';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// This component implements the most basic color handling according to Nivo docs
export default function NivoBasicColors() {
  // Sample data with both points and series coloring applied
  const data = [
    {
      id: 'series1',
      color: 'red', // THIS DOESN'T WORK - series color isn't applied
      data: [
        { x: 1, y: 1, color: '#e41a1c' }, // red point
        { x: 2, y: 2, size: 12 }, // no color - uses series color or scheme
        { x: 3, y: 3 }, // no color or size - uses defaults
      ]
    },
    {
      id: 'series2',
      color: 'blue', // THIS DOESN'T WORK - series color isn't applied
      data: [
        { x: 1, y: 4, color: '#377eb8' }, // blue point
        { x: 2, y: 5, size: 16 }, // no color - uses series color or scheme
        { x: 3, y: 6 }, // no color or size - uses defaults
      ]
    }
  ];

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Nivo Basic Colors Test</CardTitle>
          <CardDescription>
            Testing Nivo's basic coloring methods according to documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="border p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Method 1: Direct Color Assignment</h3>
              <div style={{ height: '400px' }}>
                <ResponsiveScatterPlot
                  data={data}
                  margin={{ top: 30, right: 30, bottom: 60, left: 90 }}
                  xScale={{ type: 'linear', min: 0, max: 'auto' }}
                  yScale={{ type: 'linear', min: 0, max: 'auto' }}
                  nodeSize={15}
                  colors={(d: any) => d?.data?.color || '#cccccc'}
                  blendMode="multiply"
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'X axis',
                    legendPosition: 'middle',
                    legendOffset: 46
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Y axis',
                    legendPosition: 'middle',
                    legendOffset: -60
                  }}
                />
              </div>
            </div>
            
            <div className="border p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Method 2: Color Scheme</h3>
              <div style={{ height: '400px' }}>
                <ResponsiveScatterPlot
                  data={data}
                  margin={{ top: 30, right: 30, bottom: 60, left: 90 }}
                  xScale={{ type: 'linear', min: 0, max: 'auto' }}
                  yScale={{ type: 'linear', min: 0, max: 'auto' }}
                  nodeSize={15}
                  // Use a color scheme instead of direct assignment
                  colors={{ scheme: 'category10' }}
                  blendMode="multiply"
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'X axis',
                    legendPosition: 'middle',
                    legendOffset: 46
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Y axis',
                    legendPosition: 'middle',
                    legendOffset: -60
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="border p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Method 3: Custom Color Function</h3>
              <div style={{ height: '400px' }}>
                <ResponsiveScatterPlot
                  data={data}
                  margin={{ top: 30, right: 30, bottom: 60, left: 90 }}
                  xScale={{ type: 'linear', min: 0, max: 'auto' }}
                  yScale={{ type: 'linear', min: 0, max: 'auto' }}
                  nodeSize={(d: any) => d.data.size || 8}
                  // Use a color function that assigns colors based on a value
                  colors={(d: any) => {
                    // Log what we're getting to better understand the structure
                    console.log("Method 3 node data:", d);
                    
                    // Check for explicit color
                    if (d?.data?.color) return d.data.color;
                    
                    // Use a value-based approach (increasing y = more intense color)
                    const y = d?.data?.y || 0;
                    if (y > 5) return '#d73027'; // red 
                    if (y > 4) return '#fc8d59'; // orange
                    if (y > 3) return '#fee090'; // yellow
                    if (y > 2) return '#e0f3f8'; // light blue
                    if (y > 1) return '#91bfdb'; // medium blue
                    return '#4575b4'; // dark blue
                  }}
                  blendMode="multiply"
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'X axis',
                    legendPosition: 'middle',
                    legendOffset: 46
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Y axis',
                    legendPosition: 'middle',
                    legendOffset: -60
                  }}
                />
              </div>
            </div>
            
            <div className="border p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Method 4: Static Color Array</h3>
              <div style={{ height: '400px' }}>
                <ResponsiveScatterPlot
                  data={data}
                  margin={{ top: 30, right: 30, bottom: 60, left: 90 }}
                  xScale={{ type: 'linear', min: 0, max: 'auto' }}
                  yScale={{ type: 'linear', min: 0, max: 'auto' }}
                  nodeSize={15}
                  // Use static color array (applies by series)
                  colors={['#e41a1c', '#377eb8']}
                  blendMode="multiply"
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'X axis',
                    legendPosition: 'middle',
                    legendOffset: 46
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Y axis',
                    legendPosition: 'middle',
                    legendOffset: -60
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}