import React from "react";
import { ResponsiveBar } from "@nivo/bar";

/**
 * This component renders a bar chart with proper percentage display.
 * It fixes the NaN issue by ensuring percentages are calculated properly.
 */

interface PercentageBarChartProps {
  data: any[];
  title: string;
  displayMode: "count" | "percentage";
  totalPatients?: number;
  colors?: string[];
}

export default function PercentageBarChart({
  data,
  title,
  displayMode,
  totalPatients = 24, // Default from our dataset
  colors = ["#61cdbb", "#97e3d5", "#e8c1a0", "#f47560"]
}: PercentageBarChartProps) {
  // Calculate percentages based on category totals
  // First compute the sum of all values for this chart
  const chartTotal = data.reduce((sum, item) => sum + (item.value || 0), 0);
  
  // Then calculate percentages for each item
  const preparedData = data.map(item => {
    // Calculate percentage against chart total, not total patients
    const percentage = chartTotal > 0 ? Math.round(((item.value || 0) / chartTotal) * 100) : 0;
    
    return {
      ...item,
      // Store percentage in a specific field for the label function
      chartPercentage: percentage
    };
  });

  return (
    <div className="h-[300px] w-full">
      <div className="text-lg font-semibold text-center mb-2">{title}</div>
      <ResponsiveBar
        data={preparedData}
        keys={["value"]}
        indexBy="id"
        margin={{ top: 20, right: 20, bottom: 70, left: 60 }}
        padding={0.3}
        layout="vertical"
        colors={colors}
        valueScale={{ type: "linear" }}
        indexScale={{ type: "band", round: true }}
        borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legendPosition: "middle",
          legendOffset: 32
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: displayMode === "percentage" ? "Percentage (%)" : "Count",
          legendPosition: "middle",
          legendOffset: -40
        }}
        enableGridY={true}
        labelSkipWidth={12}
        labelSkipHeight={12}
        enableLabel={true}
        label={d => {
          // Access the pre-calculated percentage value for percentage mode
          if (displayMode === "percentage") {
            // Use the chartPercentage property we added
            return `${d.data.chartPercentage}%`;
          } else {
            // For count mode, show the value
            return `${d.value || 0}`;
          }
        }}
        labelTextColor={"#000000"}
        labelPosition="middle"
        theme={{
          axis: {
            ticks: {
              text: {
                fontSize: 12
              }
            },
            legend: {
              text: {
                fontSize: 14,
                fontWeight: "bold"
              }
            }
          }
        }}
        role="application"
        ariaLabel={`${title} chart`}
      />
    </div>
  );
}