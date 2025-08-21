// Percentage Display Fix Component - May 21, 2025
// This component provides a fixed version of the population health charts
// that correctly displays percentages

import React, { useState } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, PieChart, Percent, Hash } from 'lucide-react';

interface PercentageDisplayFixProps {
  data: any;
  title: string;
  description?: string;
  height?: number;
}

// This component correctly handles percentage display by formatting the data properly
export default function PercentageDisplayFix({
  data = [],
  title = "Chart",
  description,
  height = 300
}: PercentageDisplayFixProps) {
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>('count');

  // Process the data to ensure proper percentage calculation
  const processedData = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    // Calculate total for percentage
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    
    return data.map(item => ({
      ...item,
      id: item.id || item.category || 'Unknown',
      // Calculate percentage rounded to nearest whole number
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
      // For display, use either the raw count or the percentage based on mode
      displayValue: displayMode === 'percentage' 
        ? (total > 0 ? Math.round((item.value / total) * 100) : 0)
        : (item.value || 0)
    }));
  }, [data, displayMode]);

  // Toggle display mode
  const toggleDisplayMode = () => {
    setDisplayMode(prev => prev === 'count' ? 'percentage' : 'count');
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleDisplayMode}
          >
            {displayMode === 'count' ? <PercentageIcon className="h-4 w-4 mr-1" /> : <Hash className="h-4 w-4 mr-1" />}
            {displayMode === 'count' ? 'Show %' : 'Show Count'}
          </Button>
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent style={{ height: height }} className="pt-0">
        <ResponsiveBar
          data={processedData}
          keys={['displayValue']}
          indexBy="id"
          margin={{ top: 10, right: 20, bottom: 50, left: 60 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={{ scheme: 'category10' }}
          // Custom label to display with % symbol when needed
          label={d => {
            const value = d.data?.displayValue || d.value;
            return displayMode === 'percentage' ? `${value}%` : `${value}`;
          }}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legendPosition: 'middle',
            legendOffset: 40
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: displayMode === 'percentage' ? 'Percentage (%)' : 'Count',
            legendPosition: 'middle',
            legendOffset: -40
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor="#000000"
          animate={true}
          motionConfig="gentle"
          role="application"
          ariaLabel={`${title} Chart`}
          // Custom tooltip to show both percentage and count
          tooltip={({ id, value, data }) => (
            <div style={{
              background: 'white',
              padding: '9px 12px',
              border: '1px solid #ccc',
              borderRadius: '3px'
            }}>
              <div><strong>{id}</strong></div>
              {displayMode === 'percentage' ? (
                <>
                  <div>{data.percentage}% of total</div>
                  <div>({data.value} of {processedData.reduce((sum, item) => sum + (item.value || 0), 0)})</div>
                </>
              ) : (
                <>
                  <div>{value} items</div>
                  <div>({data.percentage}% of total)</div>
                </>
              )}
            </div>
          )}
        />
      </CardContent>
    </Card>
  );
}