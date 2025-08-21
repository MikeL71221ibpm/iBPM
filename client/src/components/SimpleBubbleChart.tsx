import React, { useMemo } from 'react';
import { ResponsiveCirclePacking } from '@nivo/circle-packing';
import type { PivotTable } from '@/utils/pivotTableUtils';
import { pivotToBubbleChartData } from '@/utils/pivotTableUtils';
import ChartExportWidget from './chart-export-widget';

interface SimpleBubbleChartProps {
  pivotTable: PivotTable;
  title?: string;
}

/**
 * A completely redesigned simple bubble chart component
 * Based on the working version from the Streamlit app
 */
const SimpleBubbleChart: React.FC<SimpleBubbleChartProps> = ({ pivotTable, title }) => {
  // Transform the pivot table data to the format needed for the bubble chart
  const { bubbleData, exportData } = useMemo(() => {
    // First get the flattened data 
    const raw = pivotToBubbleChartData(pivotTable);
    
    // Group by segment for bubble chart nesting
    const segmentGroups: Record<string, { count: number, children: { name: string, value: number }[] }> = {};
    
    raw.forEach(item => {
      if (!segmentGroups[item.segment]) {
        segmentGroups[item.segment] = { count: 0, children: [] };
      }
      
      segmentGroups[item.segment].count += item.count;
      segmentGroups[item.segment].children.push({
        name: `${item.date} (${item.count})`,
        value: item.count
      });
    });
    
    // Prepare export data
    const exportResults: any[] = [];
    Object.entries(segmentGroups).forEach(([segment, data]) => {
      data.children.forEach(child => {
        exportResults.push({
          Segment: segment,
          DateCount: child.name,
          Value: child.value,
          TotalInSegment: data.count
        });
      });
    });
    
    // Convert to hierarchical structure for the circle packing visualization
    const hierarchicalData = {
      name: 'root',
      children: Object.entries(segmentGroups).map(([segment, data]) => ({
        name: segment,
        children: data.children
      }))
    };
    
    return { bubbleData: hierarchicalData, exportData: exportResults };
  }, [pivotTable]);

  // If no data, show a placeholder
  if (!pivotTable.rows.length || !pivotTable.columns.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg p-8">
        <p>No data available for bubble chart visualization</p>
        <p className="text-sm mt-2">Select different date range or try another patient</p>
      </div>
    );
  }

  // If we processed the data but it's empty, show a message
  if (!bubbleData.children || bubbleData.children.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg p-8">
        <p>No data points to display in bubble chart</p>
        <p className="text-sm mt-2">Select different date range or try another patient</p>
      </div>
    );
  }



  return (
    <div className="w-full h-full relative">
      <ChartExportWidget
        chartId={`bubble-chart-${title?.replace(/\s+/g, '-').toLowerCase() || 'visualization'}`}
        chartTitle={title || 'Bubble Chart'}
        data={exportData}
        className="absolute top-2 right-2 z-10"
        showCloseButton={false}
      />
      {title && <h3 className="text-lg font-medium mb-4">{title}</h3>}
      <div className="w-full h-[400px]">
        <ResponsiveCirclePacking
          data={bubbleData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          id="name"
          value="value"
          colors={{ scheme: 'blues' }}
          childColor={{
            from: 'color',
            modifiers: [['brighter', 0.4]]
          }}
          padding={4}
          enableLabels={true}
          labelsFilter={n => n.node.height === 0}
          labelsSkipRadius={10}
          labelTextColor={{
            from: 'color',
            modifiers: [['darker', 2]]
          }}
          borderWidth={1}
          borderColor={{
            from: 'color',
            modifiers: [['darker', 0.5]]
          }}
          animate={true}
          motionConfig="gentle"
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
                  {value} occurrences
                </div>
              </div>
            )}
        />
      </div>
    </div>
  );
};

export default SimpleBubbleChart;