import React from 'react';
import FallbackHeatmap from './FallbackHeatmap';

// Simple interfaces for type safety
interface HeatMapDataPoint {
  x: string;
  y: number;
}

interface HeatMapItem {
  id: string;
  data: HeatMapDataPoint[];
}

interface HeatMapWrapperProps {
  data: HeatMapItem[];
  title?: string;
}

/**
 * This is a simplified HeatMapWrapper component that focuses on reliable rendering.
 * It uses the FallbackHeatmap component instead of Nivo to avoid rendering issues.
 */
const HeatMapWrapper: React.FC<HeatMapWrapperProps> = ({ data, title }) => {
  try {
    // Check if we have valid data to display
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-[400px] bg-gray-50 rounded-md">
          <p className="text-gray-500">No data available for visualization</p>
        </div>
      );
    }

    // Validate data to make sure it's in the expected format
    const validData = data.filter(series => 
      series && 
      typeof series === 'object' && 
      series.id && 
      Array.isArray(series.data) &&
      series.data.length > 0
    );
      
    if (validData.length === 0) {
      console.warn("HeatMap received data, but no valid items found", data);
      return (
        <div className="flex items-center justify-center h-[400px] bg-gray-50 rounded-md">
          <p className="text-gray-500">No valid data available for heat map</p>
        </div>
      );
    }

    return (
      <div className="mb-8">
        {title && <div className="text-center font-bold text-lg py-2">{title}</div>}
        <div className="h-auto w-full overflow-x-auto">
          <div className="px-4">
            <FallbackHeatmap data={validData} title={title} />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error rendering heat map:", error);
    return (
      <div className="flex items-center justify-center h-[400px] bg-red-50 rounded-md p-4">
        <div className="text-center text-red-800">
          <h3 className="font-bold">Visualization Error</h3>
          <p>There was a problem rendering the heat map.</p>
          <p className="text-sm mt-2">{String(error)}</p>
        </div>
      </div>
    );
  }
};

export default HeatMapWrapper;