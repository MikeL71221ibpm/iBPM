import React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import type { PivotTable } from '@/utils/pivotTableUtils';
import { pivotToBarChartData } from '@/utils/pivotTableUtils';

interface SimpleBarChartProps {
  pivotTable: PivotTable;
  title?: string;
}

/**
 * A completely redesigned simple bar chart component
 * Based on the working version from the Streamlit app
 */
const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ pivotTable, title }) => {
  // Transform the pivot table data into the format needed for the bar chart
  const barData = pivotToBarChartData(pivotTable);

  // If no data, show a placeholder
  if (!pivotTable.rows.length || !pivotTable.columns.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg p-8">
        <p>No data available for bar chart visualization</p>
        <p className="text-sm mt-2">Select different date range or try another patient</p>
      </div>
    );
  }

  // If we processed the data but it's empty, show a message
  if (!barData.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg p-8">
        <p>No data points to display in bar chart</p>
        <p className="text-sm mt-2">Select different date range or try another patient</p>
      </div>
    );
  }

  // Format data for ResponsiveBar by converting the pivotToBarChartData format
  // Note: The data is already sorted by pivotToBarChartData (b.value - a.value)
  const formattedData = barData.map(item => ({
    id: item.id,
    value: item.value,
    label: item.id,
    count: item.value
  }));

  // Limit to top 10 items to prevent overcrowding - already sorted in descending order
  const limitedData = formattedData.slice(0, 10);

  return (
    <div className="w-full h-full">
      {title && <h3 className="text-lg font-medium mb-4">{title}</h3>}
      <div className="w-full h-[400px]">
        <ResponsiveBar
          data={limitedData}
          keys={['value']}
          indexBy="label"
          margin={{ top: 60, right: 30, bottom: 100, left: 60 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={{ scheme: 'blues' }}
          defs={[
            {
              id: 'dots',
              type: 'patternDots',
              background: 'inherit',
              color: '#38bcb2',
              size: 4,
              padding: 1,
              stagger: true
            },
            {
              id: 'lines',
              type: 'patternLines',
              background: 'inherit',
              color: '#eed312',
              rotation: -45,
              lineWidth: 6,
              spacing: 10
            }
          ]}
          borderColor={{
            from: 'color',
            modifiers: [['darker', 1.6]]
          }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: '',
            legendPosition: 'middle',
            legendOffset: 32
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Occurrences',
            legendPosition: 'middle',
            legendOffset: -40
          }}
          labelSkipWidth={12}
          // IMPORTANT: Enable labels on bars
          enableLabel={true}
          isInteractive={true}
          label={(d) => `${d.value}`}
          labelTextColor="#000000"
          // Position labels at the top of bars
          // For vertical charts: end=top, start=bottom
          labelPosition="end"
          // Move slightly above the bars
          labelOffset={-8}
          // Use theme to control label styling
          theme={{
            labels: {
              text: {
                fontSize: 14,
                fontWeight: 900,
                fill: "#000000", 
                textAnchor: 'middle',
                // This positions text at the top of bars
                dominantBaseline: 'auto'
              }
            }
          }}
          animate={true}
          motionConfig="gentle"
          tooltip={({ id, value, color, indexValue }: any) => (
            <div
              style={{
                padding: 12,
                color: '#333',
                background: 'white',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
              }}
            >
              <div className="font-bold">{indexValue}</div>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    background: color,
                    marginRight: '8px',
                  }}
                ></span>
                {value} occurrences
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default SimpleBarChart;