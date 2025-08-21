import { useRef } from 'react';
import { ResponsiveBar } from '@nivo/bar';

// Helper function to calculate safe percentage values
const safePercentage = (value: number, total: number): number => {
  if (!total || total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100;
};

// Helper function to get color scheme based on theme selection
const getThemeColor = (theme: string, dataLength: number) => {
  const schemes: Record<string, string> = {
    'blue': 'blues',
    'green': 'greens', 
    'red': 'reds',
    'purple': 'purples',
    'orange': 'oranges',
    'teal': 'teals',
    'pink': 'pinks',
    'gray': 'grays'
  };
  return { scheme: schemes[theme] || 'nivo' };
};

interface HrsnIndicatorsChartProps {
  data?: any;
  isLoading?: boolean;
  displayMode?: 'count' | 'percentage';
  colorTheme?: string;
}

export default function HrsnIndicatorsChart({ 
  data = {}, 
  isLoading = false, 
  displayMode = 'count',
  colorTheme = 'blue'
}: HrsnIndicatorsChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Calculate total patients for percentage calculation
  const totalPatients = data?.patients?.length || 0;
  
  // Get the HRSN data
  const hrsnData = [...(data.hrsnIndicatorData || [])]
    .sort((a, b) => (b.count || 0) - (a.count || 0));
  
  // Prepare chart data
  const chartData = hrsnData.map(item => ({
    id: item.id,
    label: item.id,
    value: displayMode === 'percentage' 
      ? safePercentage(item.count, totalPatients)
      : item.count || 0,
    rawValue: item.count || 0,
    percentage: safePercentage(item.count, totalPatients),
    displayValue: displayMode === 'percentage' ? safePercentage(item.count, totalPatients) : item.count || 0
  }));
  
  // Define chart colors based on selected theme
  const chartColors = getThemeColor(colorTheme, hrsnData.length);
  
  // Calculate total count for display
  const totalCount = hrsnData.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  
  return (
    <div className="w-full h-full relative">
      {/* Total Count Display - Upper Right Corner */}
      <div className="absolute top-2 right-2 z-50 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-md shadow-lg border text-sm font-semibold text-gray-800 pointer-events-none">
        Total Count: {totalCount.toLocaleString()}
      </div>
      
      <div ref={chartRef} className="w-full h-full">
        <ResponsiveBar
          data={chartData}
          keys={['value']}
          indexBy="id"
          margin={{ top: 50, right: 130, bottom: 100, left: 60 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={chartColors}
          borderColor={{
            from: 'color',
            modifiers: [
              ['darker', 1.6]
            ]
          }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: displayMode === 'percentage' ? 'HRSN Categories (%)' : 'HRSN Categories',
            legendPosition: 'middle',
            legendOffset: 80
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
          labelTextColor={{
            from: 'color',
            modifiers: [
              ['darker', 1.6]
            ]
          }}
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
          role="application"
          ariaLabel="HRSN Indicators chart"
          barAriaLabel={e => `${e.id}: ${e.formattedValue} in ${e.indexValue}`}
          tooltip={({ id, value, color, indexValue, data }) => (
            <div
              style={{
                padding: 12,
                background: '#ffffff',
                border: `1px solid ${color}`,
                borderRadius: '4px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}
            >
              <div>
                <strong>{indexValue}</strong>
              </div>
              {displayMode === 'percentage' ? (
                <div>
                  Percentage: <strong>{data.percentage}%</strong>
                </div>
              ) : (
                <div>
                  Count: <strong>{data.rawValue}</strong>
                </div>
              )}
              {displayMode !== 'percentage' && totalPatients > 0 && (
                <div>
                  Percentage: <strong>{data.percentage}%</strong>
                </div>
              )}
            </div>
          )}
        />
      </div>
    </div>
  );
}