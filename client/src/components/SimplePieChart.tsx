import React from 'react';
import { ResponsivePie } from '@nivo/pie';
import type { PivotTable } from '@/utils/pivotTableUtils';
import { pivotToPieChartData } from '@/utils/pivotTableUtils';

interface SimplePieChartProps {
  pivotTable: PivotTable;
  title?: string;
}

/**
 * A completely redesigned simple pie chart component
 * Based on the working version from the Streamlit app
 */
const SimplePieChart: React.FC<SimplePieChartProps> = ({ pivotTable, title }) => {
  // Transform the pivot table data into the format needed for the pie chart
  const pieData = pivotToPieChartData(pivotTable);

  // If no data, show a placeholder
  if (!pivotTable.rows.length || !pivotTable.columns.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg p-8">
        <p>No data available for pie chart visualization</p>
        <p className="text-sm mt-2">Select different date range or try another patient</p>
      </div>
    );
  }

  // If we processed the data but it's empty, show a message
  if (!pieData.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg p-8">
        <p>No data points to display in pie chart</p>
        <p className="text-sm mt-2">Select different date range or try another patient</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {title && <h3 className="text-lg font-medium mb-4">{title}</h3>}
      <div className="w-full h-[400px]">
        <ResponsivePie
          data={pieData}
          margin={{ top: 60, right: 80, bottom: 100, left: 80 }}
          innerRadius={0.5}
          padAngle={0.7}
          cornerRadius={3}
          activeOuterRadiusOffset={8}
          borderWidth={1}
          borderColor={{
            from: 'color',
            modifiers: [['darker', 0.2]]
          }}
          arcLinkLabelsSkipAngle={10}
          arcLinkLabelsTextColor="#333333"
          arcLinkLabelsThickness={2}
          arcLinkLabelsColor={{ from: 'color' }}
          arcLabelsSkipAngle={10}
          arcLabelsTextColor={{
            from: 'color',
            modifiers: [['darker', 2]]
          }}
          colors={{ scheme: 'blues' }}
          legends={[]}
          enableArcLinkLabels={true}
          arcLinkLabel={d => d.id}
          enableArcLabels={true}
          arcLabel={d => `${d.value}%`}
          tooltip={({ id, value, color }: any) => (
            <div
              style={{
                padding: 12,
                color: '#333',
                background: 'white',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
              }}
            >
              <div className="font-bold">{id}</div>
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
                {value} occurrences ({Math.round(value / pieData.reduce((sum, item) => sum + item.value, 0) * 100)}%)
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default SimplePieChart;