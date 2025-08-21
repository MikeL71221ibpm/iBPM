import React from "react";
import { ResponsiveBar } from "@nivo/bar";

interface FixedPercentageBarProps {
  data: any[];
  displayMode: "count" | "percentage";
  keys?: string[];
  indexBy?: string;
  colors?: any;
  colorBy?: string;
  margin?: { top: number; right: number; bottom: number; left: number };
  axisBottom?: any;
  axisLeft?: any;
  theme?: any;
  layout?: string;
  enableGridY?: boolean;
  borderColor?: any;
  legends?: any[];
  animate?: boolean;
  motionConfig?: string;
  role?: string;
  ariaLabel?: string;
  barAriaLabel?: any;
}

/**
 * A wrapper component for Nivo ResponsiveBar that correctly handles percentage display.
 * This component ensures percentages are calculated based on chart total and displayed correctly.
 */
export default function FixedPercentageDisplayBar({
  data,
  displayMode,
  keys = ["value"],
  indexBy = "id",
  colors = { scheme: "nivo" },
  colorBy = "indexValue",
  margin = { top: 50, right: 80, bottom: 140, left: 80 },
  axisBottom,
  axisLeft,
  theme,
  layout = "vertical",
  enableGridY = true,
  borderColor = { from: "color", modifiers: [["darker", 1.6]] },
  legends = [],
  animate = true,
  motionConfig = "gentle",
  role = "application",
  ariaLabel,
  barAriaLabel,
}: FixedPercentageBarProps) {
  // Process the data to ensure percentages are calculated correctly
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Calculate the total value across all items for percentage mode
    const chartTotal = data.reduce((sum, item) => sum + (item.value || 0), 0);
    
    // Add correctly calculated percentage to each item
    return data.map(item => ({
      ...item,
      chartPercentage: chartTotal > 0 ? Math.round(((item.value || 0) / chartTotal) * 100) : 0,
      // For percentage mode, set the value to the percentage
      displayValue: displayMode === "percentage" 
        ? (chartTotal > 0 ? Math.round(((item.value || 0) / chartTotal) * 100) : 0)
        : (item.value || 0)
    }));
  }, [data, displayMode]);

  return (
    <ResponsiveBar
      data={processedData}
      keys={keys}
      indexBy={indexBy}
      margin={margin}
      padding={0.3}
      valueScale={{ type: "linear" }}
      indexScale={{ type: "band", round: true }}
      colors={colors}
      colorBy={colorBy}
      borderColor={borderColor}
      axisBottom={axisBottom}
      axisLeft={axisLeft}
      enableGridY={enableGridY}
      labelSkipWidth={12}
      labelSkipHeight={12}
      enableLabel={true}
      layout={layout}
      label={d => {
        // Access the pre-calculated percentage for percentage mode
        if (displayMode === "percentage") {
          return `${d.data.chartPercentage}%`;
        } else {
          return `${d.value || 0}`;
        }
      }}
      labelTextColor={"#000000"}
      labelPosition="end"
      theme={theme || {
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
      legends={legends}
      animate={animate}
      motionConfig={motionConfig}
      role={role}
      ariaLabel={ariaLabel}
      barAriaLabel={barAriaLabel}
    />
  );
}