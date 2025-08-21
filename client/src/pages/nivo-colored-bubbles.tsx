import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';

// Define color themes
const COLOR_THEMES = {
  // Purple-blue theme
  iridis: {
    name: "Iridis (Purple-Blue)",
    HIGHEST: '#6A0DAD', // Dark purple
    HIGH: '#9370DB',    // Medium purple
    MEDIUM: '#B19CD9',  // Light purple
    LOW: '#CCCCFF',     // Very light purple/periwinkle
    LOWEST: '#F8F8FF',  // Almost white with slight purple tint
  }
};

// Simple component for demonstration
export default function NivoColoredBubbles() {
  const [location] = useLocation();
  const [colorTheme, setColorTheme] = React.useState('iridis');
  
  // Get the active color set
  const colorSet = COLOR_THEMES[colorTheme as keyof typeof COLOR_THEMES];

  // Create some simple data with intensity values
  const data = [
    {
      id: 'intensities',
      data: [
        { x: 'Jan', y: 'Highest', size: 15, color: colorSet.HIGHEST },
        { x: 'Feb', y: 'High', size: 10, color: colorSet.HIGH },
        { x: 'Mar', y: 'Medium', size: 7, color: colorSet.MEDIUM },
        { x: 'Apr', y: 'Low', size: 3, color: colorSet.LOW },
        { x: 'May', y: 'Lowest', size: 1, color: colorSet.LOWEST },
      ]
    }
  ];

  // Create a color mapping function
  const getNodeColor = (node: any) => {
    // In Nivo, we need to use the direct color assigned in the data
    if (node && node.data && node.data.color) {
      return node.data.color;
    }
    
    // Fallback to a default color
    return colorSet.MEDIUM;
  };

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            <div className="text-lg font-medium">
              Simple Colored Bubbles Demo
            </div>
          </CardTitle>
          <CardDescription>
            Testing bubble chart colors with explicit color mapping function.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-50 p-3 mb-4 rounded-md border">
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center">
                <div style={{ width: 14, height: 14, backgroundColor: colorSet.HIGHEST, borderRadius: '50%' }} />
                <span className="ml-1">Highest</span>
              </div>
              <div className="flex items-center">
                <div style={{ width: 12, height: 12, backgroundColor: colorSet.HIGH, borderRadius: '50%' }} />
                <span className="ml-1">High</span>
              </div>
              <div className="flex items-center">
                <div style={{ width: 12, height: 12, backgroundColor: colorSet.MEDIUM, borderRadius: '50%' }} />
                <span className="ml-1">Medium</span>
              </div>
              <div className="flex items-center">
                <div style={{ width: 12, height: 12, backgroundColor: colorSet.LOW, borderRadius: '50%' }} />
                <span className="ml-1">Low</span>
              </div>
              <div className="flex items-center">
                <div style={{ width: 10, height: 10, backgroundColor: colorSet.LOWEST, borderRadius: '50%', border: '1px solid #ccc' }} />
                <span className="ml-1">Lowest</span>
              </div>
            </div>
          </div>
          
          <Button 
            variant="outline"
            onClick={() => location !== '/nivo-scatter-view-themed/1' && window.location.replace('/nivo-scatter-view-themed/1')}
            className="mb-4"
          >
            Return to Main Chart
          </Button>
          
          <div style={{ height: '400px' }}>
            <ResponsiveScatterPlot
              data={data}
              margin={{ top: 30, right: 30, bottom: 60, left: 90 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'point' }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Month',
                legendPosition: 'middle',
                legendOffset: 46
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Intensity',
                legendPosition: 'middle',
                legendOffset: -60
              }}
              nodeSize={12}
              blendMode="normal"
              colors={(d: any) => {
                // Extract intensity from size - Nivo's typing is inconsistent
                // In some contexts d has a data property, in others it's the node data directly
                const size = (d.data ? d.data.size : (d.size || 0));
                
                // Apply intensity thresholds
                if (size >= 15) return colorSet.HIGHEST;
                if (size >= 10) return colorSet.HIGH;
                if (size >= 7) return colorSet.MEDIUM;
                if (size >= 3) return colorSet.LOW;
                return colorSet.LOWEST;
              }}
              useMesh={true}
              animate={false}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}