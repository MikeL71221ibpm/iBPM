import React, { useRef } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { Skeleton } from "@/components/ui/skeleton";
import { safePercentage } from '@/lib/chart-helpers';

interface SymptomSegmentChartProps {
  data?: any;
  isLoading?: boolean;
  displayMode?: 'count' | 'percentage';
}

/**
 * Symptom Segment chart with standardized export functionality
 */
export default function SymptomSegmentChart({ 
  data, 
  isLoading = false,
  displayMode = 'count'
}: SymptomSegmentChartProps) {
  // Chart container ref for export
  const chartRef = useRef<HTMLDivElement>(null);
  
  // If still loading, show skeleton
  if (isLoading) {
    return <Skeleton className="w-full h-[350px]" />;
  }
  
  // If no data, show message
  if (!data || !data.symptomSegmentData || !Array.isArray(data.symptomSegmentData)) {
    return <div className="flex items-center justify-center h-[350px] text-muted-foreground">No symptom segment data available</div>;
  }

  // Calculate total patients for percentage calculation
  const totalPatients = data?.patients?.length || 0;
  
  // Get the symptom segment data
  const rawSymptomData = [...data.symptomSegmentData]
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 15); // Limit to top 15 for readability
  
  // Prepare chart data
  const chartData = rawSymptomData.map(item => ({
    id: item.id || item.symptom_segment,
    label: item.symptom_segment || item.id,
    value: displayMode === 'percentage' 
      ? safePercentage(item.count, totalPatients)
      : item.count || 0,
    rawValue: item.count || 0,
    percentage: safePercentage(item.count, totalPatients)
  }));
  
  // Define chart colors - green to yellow gradient
  const chartColors = ['#10b981', '#22c55e', '#84cc16', '#a3e635', '#d9f99d', '#eab308'];
  
  return (
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
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: 'Symptom Segment',
          legendPosition: 'middle',
          legendOffset: 70,
          truncateTickAt: 0
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: displayMode === 'percentage' ? 'Percentage (%)' : 'Count',
          legendPosition: 'middle',
          legendOffset: -45,
          truncateTickAt: 0
        }}
        labelSkipWidth={12}
        labelSkipHeight={12}
        labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
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
        ariaLabel="Symptom Segment chart"
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
  );
}