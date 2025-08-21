import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';

// Simple test component to verify color handling
export default function TestColorScatter() {
  const [location, setLocation] = useLocation();
  
  // Create a very simple data structure that Nivo expects
  const data = [
    {
      id: 'test-series',
      data: [
        { x: 'A', y: 'Item 1', size: 15, color: '#e41a1c' }, // red
        { x: 'B', y: 'Item 2', size: 10, color: '#ff7f00' }, // orange
        { x: 'C', y: 'Item 3', size: 7, color: '#ffff33' },  // yellow
        { x: 'D', y: 'Item 4', size: 3, color: '#4daf4a' },  // green
        { x: 'E', y: 'Item 5', size: 1, color: '#377eb8' },  // blue
      ]
    }
  ];
  
  // Render a very basic scatter plot
  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Color Test Chart
          </CardTitle>
          <CardDescription>
            Simple test of Nivo's scatter plot with direct colors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button 
              variant="outline" 
              onClick={() => setLocation(`/nivo-scatter-view-themed/1`)}
            >
              Back to Main View
            </Button>
          </div>
          
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
              // Static node size based on point's "size" property
              nodeSize={30}
              // Use the color directly from the data point
              colors={(d: any) => {
                console.log("TEST COLOR NODE:", d);
                // Use the directly assigned color from the data point
                return d?.data?.color || 'grey';
              }}
              useMesh={true}
              debugMesh={true}
              // Show the color and size as a tooltip
              tooltip={({ node }: any) => {
                if (!node?.data) return null;
                return (
                  <div className="bg-white p-3 shadow-lg border-2 rounded-md">
                    <div>Item: {node.data.y}</div>
                    <div>Color: {node.data.color}</div>
                    <div>Size: {node.data.size}</div>
                  </div>
                );
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}