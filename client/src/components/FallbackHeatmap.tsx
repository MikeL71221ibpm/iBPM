import React from 'react';

interface HeatmapDataPoint {
  id: string;
  data: Array<{
    x: string;
    y: number;
  }>;
}

interface FallbackHeatmapProps {
  data: HeatmapDataPoint[];
  title?: string;
}

/**
 * A simple HTML-based heatmap fallback that doesn't use Nivo
 * This is used when the Nivo components cause errors
 */
const FallbackHeatmap: React.FC<FallbackHeatmapProps> = ({ data, title }) => {
  try {
    // Log the data for debugging
    console.log("FallbackHeatmap data:", data.slice(0, 2));
    
    // If no data, show a message
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 rounded-md p-4">
          <div className="text-center text-gray-500">
            <h3 className="font-medium">No data available</h3>
            <p className="text-sm">There is no data to display in the heatmap</p>
          </div>
        </div>
      );
    }

    // Find all unique x values (dates) across all series
    const allXValues = new Set<string>();
    data.forEach(series => {
      if (!Array.isArray(series.data)) {
        console.warn("Invalid series data format:", series);
        return;
      }
      
      series.data.forEach(point => {
        if (point && point.x) {
          allXValues.add(point.x);
        }
      });
    });

    // Convert to array and sort chronologically
    const sortedXValues = Array.from(allXValues).sort((a, b) => {
      try {
        // Try to parse as MM/DD/YY first
        const parseDate = (str: string) => {
          const parts = str.split('/');
          if (parts.length === 3) {
            const month = parseInt(parts[0], 10) - 1;
            const day = parseInt(parts[1], 10);
            const year = parts[2].length === 2 ? 2000 + parseInt(parts[2], 10) : parseInt(parts[2], 10);
            return new Date(year, month, day).getTime();
          }
          return new Date(str).getTime();
        };
        
        return parseDate(a) - parseDate(b);
      } catch (e) {
        // Fall back to string comparison if date parsing fails
        console.warn("Date comparison error:", e);
        return a.localeCompare(b);
      }
    });

    // Find max value for color scaling
    let maxValue = 0;
    data.forEach(series => {
      if (!Array.isArray(series.data)) return;
      
      series.data.forEach(point => {
        if (point && typeof point.y === 'number' && point.y > maxValue) {
          maxValue = point.y;
        }
      });
    });

    // Function to get color based on value
    const getHeatColor = (value: number) => {
      if (value === 0) return '#f9fafb'; // Very light gray
      
      const intensity = Math.min(1, value / Math.max(1, maxValue));
      
      // Scale from light blue to dark blue
      if (intensity < 0.2) return '#dbeafe'; // Very light blue
      if (intensity < 0.4) return '#93c5fd'; // Light blue
      if (intensity < 0.6) return '#60a5fa'; // Medium blue
      if (intensity < 0.8) return '#3b82f6'; // Blue
      return '#1d4ed8'; // Dark blue
    };

    // Function to format date for display
    const formatDate = (dateStr: string) => {
      try {
        // If it's already in MM/DD/YY format, use it as is
        if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{2}$/)) {
          return dateStr;
        }
        
        const date = new Date(dateStr);
        return `${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).slice(-2)}`;
      } catch (e) {
        console.warn("Date formatting error:", e);
        return dateStr;
      }
    };

    // Clean series ID for display (remove leading spaces, etc.)
    const cleanId = (id: string) => {
      if (typeof id !== 'string') return String(id);
      return id.trim().replace(/^\s+/, ''); // Remove leading spaces
    };

    return (
      <div className="w-full overflow-auto">
        {title && <h3 className="text-center font-medium text-sm mb-2">{title}</h3>}
        
        <div className="min-w-[500px]">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-0 border bg-gray-50"></th>
                {sortedXValues.map(x => (
                  <th key={x} className="p-0 border bg-gray-50 text-[8px] font-medium text-gray-600 rotate-45 h-12 min-w-[30px]">
                    <div className="transform origin-bottom-left translate-x-2">
                      {formatDate(x)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map(series => {
                const seriesId = cleanId(series.id);
                
                return (
                  <tr key={series.id}>
                    <td className="p-0 border bg-gray-50 font-medium text-[9px] text-left max-w-[140px] overflow-hidden whitespace-nowrap text-ellipsis" title={seriesId}>
                      {seriesId}
                    </td>
                    {sortedXValues.map(x => {
                      // Find the data point for this x value
                      const point = Array.isArray(series.data) 
                        ? series.data.find(d => d && d.x === x) 
                        : undefined;
                      const value = point && typeof point.y === 'number' ? point.y : 0;
                      
                      return (
                        <td 
                          key={`${series.id}-${x}`} 
                          className="border w-6 h-6 text-center text-[8px] p-0"
                          style={{ backgroundColor: getHeatColor(value) }}
                          title={`${seriesId} on ${formatDate(x)}: ${value}`}
                        >
                          {value > 0 && <span className="text-white font-medium">{value}</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error rendering fallback heatmap:", error);
    return (
      <div className="flex items-center justify-center h-[400px] bg-red-50 rounded-md p-4">
        <div className="text-center text-red-800">
          <h3 className="font-bold">Visualization Error</h3>
          <p>There was a problem rendering the heatmap.</p>
          <p className="text-sm mt-2">{String(error)}</p>
        </div>
      </div>
    );
  }
};

export default FallbackHeatmap;