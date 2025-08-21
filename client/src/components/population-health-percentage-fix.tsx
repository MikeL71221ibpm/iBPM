import React, { useState, useCallback, useEffect } from "react";
import { ResponsiveBar } from '@nivo/bar';

// This is a simplified component that focuses only on fixing the percentage display in charts
// It will be used to replace the problem sections in the main file

interface ChartProps {
  data: any[];
  displayMode: "count" | "percentage";
  id: string;
  title: string;
  subtitle?: string;
}

export default function FixedPercentageChart({ 
  data,
  displayMode,
  id,
  title,
  subtitle
}: ChartProps) {
  // Process data to ensure percentages are calculated correctly
  const processedData = data.map(item => {
    // Make sure we have the total for percentage calculation
    const totalItems = data.reduce((sum, current) => sum + (current.value || 0), 0);
    
    return {
      ...item,
      // Calculate percentage based on the item's value relative to total
      percentage: Math.round(((item.value || 0) / totalItems) * 100)
    };
  });

  return (
    <div className="h-[280px]">
      <ResponsiveBar
        data={processedData.map(item => ({
          id: item.id,
          value: displayMode === "percentage" ? item.percentage : item.value,
          rawValue: item.value || 0,
          percentage: item.percentage || 0
        }))}
        keys={['value']}
        indexBy="id"
        margin={{ top: 50, right: 30, bottom: 70, left: 60 }}
        padding={0.3}
        layout="vertical"
        colors={{ scheme: 'nivo' }}
        valueScale={{ type: 'linear' }}
        indexScale={{ type: 'band', round: true }}
        borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legendPosition: 'middle',
          legendOffset: 32
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: displayMode === "percentage" ? 'Percentage (%)' : 'Count',
          legendPosition: 'middle',
          legendOffset: -40
        }}
        enableGridY={true}
        labelSkipWidth={12}
        labelSkipHeight={12}
        enableLabel={true}
        label={d => {
          // For percentage mode, use the percentage from data
          if (displayMode === "percentage") {
            return `${d.data.percentage || 0}%`;
          } else {
            // For count mode, use the raw value
            return `${d.value || 0}`;
          }
        }}
        labelTextColor={"#000000"}
        role="application"
        ariaLabel={`${title} chart`}
      />
    </div>
  );
}