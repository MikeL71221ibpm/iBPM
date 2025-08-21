import React from 'react';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Test component that uses Node as the coloring method
export default function NivoNodeColor() {
  // Create a simple dataset to test with
  const data = [
    {
      id: 'intensity-series',
      data: [
        { x: 'Point 1', y: 'Category A', intensity: 12 }, // highest
        { x: 'Point 2', y: 'Category B', intensity: 9 },  // high
        { x: 'Point 3', y: 'Category C', intensity: 6 },  // medium
        { x: 'Point 4', y: 'Category D', intensity: 3 },  // low
        { x: 'Point 5', y: 'Category E', intensity: 1 },  // lowest
      ]
    }
  ];
  
  // Define our explicit color map based on intensity ranges
  const getColorForIntensity = (intensity: number) => {
    if (intensity >= 11) return '#4A0672'; // HIGHEST 
    if (intensity >= 8) return '#6930C3';  // HIGH
    if (intensity >= 5) return '#8282F6';  // MEDIUM
    if (intensity >= 2) return '#A5C8E4';  // LOW
    return '#EDF7F9';                      // LOWEST
  };

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Node-based Color Assignment
          </CardTitle>
          <CardDescription>
            Testing Nivo ScatterPlot with node-level color assignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height: '500px', width: '100%' }}>
            <ResponsiveScatterPlot
              data={data}
              margin={{ top: 30, right: 40, bottom: 70, left: 90 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'point' }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: '',
                legendPosition: 'middle',
                legendOffset: 46
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
              }}
              // Use standard node size for all points
              nodeSize={30}
              
              // Use color function that maps intensities to colors
              colors={(node: any) => {
                if (!node?.data) return '#cccccc'; // default gray
                
                const intensity = node.data.intensity || 0;
                const nodeColor = getColorForIntensity(intensity);
                
                console.log(`Node data: ${JSON.stringify(node.data)}`);
                console.log(`Node at position has intensity ${intensity} and color ${nodeColor}`);
                
                return nodeColor;
              }}
              tooltip={({ node }: any) => (
                <div className="bg-white p-3 shadow-lg border-2 rounded-md">
                  <div>Position: ({node.data.x}, {node.data.y})</div>
                  <div>Intensity: {node.data.intensity}</div>
                  <div>Color: {getColorForIntensity(node.data.intensity)}</div>
                </div>
              )}
              animate={false}
              blendMode="normal"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}