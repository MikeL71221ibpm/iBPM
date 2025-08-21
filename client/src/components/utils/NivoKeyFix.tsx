import React from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';

// This is a wrapper for Nivo's HeatMap that ensures dynamic keys are handled properly
// The standard Nivo component has issues with dynamic data where keys change between renders
export const SafeHeatMap: React.FC<any> = (props) => {
  // Add detailed logging to debug the issue
  console.log("SafeHeatMap received props:", {
    dataExists: !!props.data,
    dataLength: props.data?.length || 0,
    keysExists: !!props.keys,
    keysLength: props.keys?.length || 0,
    firstDataItem: props.data?.[0] || null,
    keys: props.keys || null
  });
  
  if (!props.data || props.data.length === 0) {
    console.error("SafeHeatMap missing data array or empty data array");
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-gray-500">No data available for heatmap (missing data)</p>
      </div>
    );
  }
  
  if (!props.keys || props.keys.length === 0) {
    console.error("SafeHeatMap missing keys array or empty keys array");
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-gray-500">No data available for heatmap (missing keys)</p>
      </div>
    );
  }
  
  return (
    <ResponsiveHeatMap
      {...props}
    />
  );
};