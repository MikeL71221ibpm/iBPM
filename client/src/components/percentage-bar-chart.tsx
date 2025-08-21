import React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { BarDatum } from '@nivo/bar';

interface PercentageBarChartProps {
  data: any[];
  displayMode: 'count' | 'percentage';
  colorScheme?: string;
}

/**
 * A bar chart component that can switch between count and percentage display modes
 */
export default function PercentageBarChart({ data, displayMode, colorScheme = 'set2' }: PercentageBarChartProps) {
  // Prepare data based on display mode
  const processedData = React.useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    // Calculate total for percentage calculation
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    
    // Transform data based on display mode
    return data.map(item => {
      // Calculate percentage if needed
      const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
      
      return {
        ...item,
        // Store original value
        rawValue: item.value,
        // Set display value based on mode
        value: displayMode === 'percentage' ? percentage : item.value,
        // Store percentage for label formatting
        percentage: percentage
      };
    });
  }, [data, displayMode]);
  
  // Format for labels
  const formatLabel = (d: any) => {
    if (displayMode === 'percentage') {
      return `${d.value}%`;
    }
    return `${d.value}`;
  };
  
  // Format for tooltip
  const formatTooltip = (d: any) => {
    if (displayMode === 'percentage') {
      return `${d.id}: ${d.value}% (${d.data.rawValue} records)`;
    }
    return `${d.id}: ${d.value} records`;
  };
  
  return (
    <div style={{ height: 400 }}>
      <ResponsiveBar
        data={processedData}
        keys={['value']}
        indexBy="id"
        margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
        padding={0.3}
        valueScale={{ type: 'linear' }}
        colors={{ scheme: colorScheme }}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: displayMode === 'percentage' ? 'Categories (%)' : 'Categories',
          legendPosition: 'middle',
          legendOffset: 32
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
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        label={formatLabel}
        tooltip={({ id, value, color, data }) => (
          <div
            style={{
              padding: 12,
              background: '#ffffff',
              border: `1px solid ${color}`,
              borderRadius: 4,
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}
          >
            {formatTooltip({ id, value, data })}
          </div>
        )}
        legends={[
          {
            dataFrom: 'keys',
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 120,
            translateY: 0,
            itemsSpacing: 2,
            itemWidth: 100,
            itemHeight: 20,
            itemDirection: 'left-to-right',
            itemOpacity: 0.85,
            symbolSize: 20,
            effects: [
              {
                on: 'hover',
                style: {
                  itemOpacity: 1
                }
              }
            ]
          }
        ]}
        animate={true}
        motionStiffness={90}
        motionDamping={15}
      />
    </div>
  );
}