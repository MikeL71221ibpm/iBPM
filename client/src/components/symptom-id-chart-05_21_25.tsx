import React, { useState, useRef } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { Skeleton } from "@/components/ui/skeleton";
import ChartExportWidget from "@/components/chart-export-widget";
import { safePercentage, getThemeColor, formatChartValue, CHART_DIMENSIONS } from '@/lib/chart-helpers';

interface SymptomIDChartProps {
  data?: any;
  isLoading?: boolean;
  displayMode?: 'count' | 'percentage';
  colorTheme?: string;
}

/**
 * Symptom ID chart with standardized export functionality
 */
export default function SymptomIDChart({ 
  data, 
  isLoading = false,
  displayMode = 'count',
  colorTheme = 'spectral'
}: SymptomIDChartProps) {
  // Chart container ref for export
  const chartRef = useRef<HTMLDivElement>(null);
  
  // If still loading, show skeleton
  if (isLoading) {
    return <Skeleton className={CHART_DIMENSIONS.standard.className} />;
  }
  
  // If no data, show message
  if (!data || !data.symptomIDData || !Array.isArray(data.symptomIDData)) {
    return <div className={`flex items-center justify-center ${CHART_DIMENSIONS.standard.className} text-muted-foreground`}>No symptom data available</div>;
  }

  // Get the symptom ID data
  const rawSymptomData = [...data.symptomIDData]
    .sort((a, b) => (b.count || 0) - (a.count || 0));
  
  // Calculate total patients for percentage calculation
  const totalPatients = data?.patients?.length || 0;
  
  // Prepare chart data
  const chartData = rawSymptomData.map(item => ({
    id: item.id || item.symptom_id,
    label: item.symptom_id || item.id,
    value: displayMode === 'percentage' 
      ? safePercentage(item.count, totalPatients)
      : item.count || 0,
    rawValue: item.count || 0,
    percentage: safePercentage(item.count, totalPatients),
    displayValue: displayMode === 'percentage' ? safePercentage(item.count, totalPatients) : item.count || 0
  }));
  
  // Get colors from theme helper
  const getChartColor = (index: number) => {
    return getThemeColor(index, chartData.length, colorTheme);
  };
  
  return (
    <div ref={chartRef} id="symptom_id_chart" className={CHART_DIMENSIONS.standard.className}>
      <ChartExportWidget 
        chartRef={chartRef}
        chartId="symptom_id_chart"
        fileName="symptom_id_distribution"
        title="Symptom ID Distribution"
        chartData={chartData}
      />
      <ResponsiveBar
        data={chartData}
        keys={['value']}
        indexBy="id"
        margin={{ top: 50, right: 130, bottom: 100, left: 60 }}
        padding={0.3}
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        colors={(bar) => getChartColor(chartData.findIndex(d => d.id === bar.data.id))}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: 'Symptom ID',
          legendPosition: 'middle',
          legendOffset: 70,
          truncateTickAt: 0
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: displayMode === 'percentage' ? 'Percentage (%)' : 'Patient Count',
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
        ariaLabel="Symptom ID chart"
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
            <div>
              Count: <strong>{data.rawValue}</strong>
            </div>
            <div>
              Percentage: <strong>{formatChartValue(data.percentage, 'percentage')}</strong>
            </div>
          </div>
        )}
      />
    </div>
  );
}