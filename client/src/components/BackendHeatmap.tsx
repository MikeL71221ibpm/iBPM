import React from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { usePivotData } from '../hooks/usePivotData';

interface BackendHeatmapProps {
  categoryField: string;
  height?: number;
  isExpanded?: boolean;
}

export function BackendHeatmap({ categoryField, height = 400, isExpanded = false }: BackendHeatmapProps) {
  const { pivotData, loading, error } = usePivotData(categoryField);

  // Show loading state
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading pivot data...</p>
        </div>
      </div>
    );
  }

  // Show error state - fallback to table message
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading pivot data: {error}</p>
          <p className="text-gray-500 mt-2">Displaying table view instead.</p>
        </div>
      </div>
    );
  }

  // Show no data state
  if (!pivotData || !pivotData.heatmapData || pivotData.heatmapData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">No pivot data available for {categoryField}</p>
          <p className="text-gray-400 mt-2">Displaying table view instead.</p>
        </div>
      </div>
    );
  }

  const { heatmapData, ageRanges, maxValue } = pivotData;
  
  // Ensure ageRanges is defined and not empty
  const safeAgeRanges = ageRanges || [];
  const safeHeatmapData = heatmapData || [];
  const safeMaxValue = maxValue || 100;

  // Additional safety check
  if (safeAgeRanges.length === 0 || safeHeatmapData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Invalid heatmap data structure for {categoryField}</p>
          <p className="text-gray-400 mt-2">Displaying table view instead.</p>
        </div>
      </div>
    );
  }

  // Debug logging
  console.log('🔥 HEATMAP DATA DEBUG:', {
    categoryField,
    safeAgeRanges,
    safeHeatmapData,
    firstDataItem: safeHeatmapData[0],
    dataKeys: safeHeatmapData[0] ? Object.keys(safeHeatmapData[0]) : []
  });
  
  console.log(`📊 BACKEND HEATMAP DATA for ${categoryField}:`, {
    categories: pivotData.categories?.length || 0,
    ageRanges: pivotData.ageRanges?.length || 0,
    maxValue: pivotData.maxValue,
    heatmapDataLength: pivotData.heatmapData?.length || 0,
    sampleData: pivotData.heatmapData?.slice(0, 2)
  });

  // Set up responsive margins optimized for axis alignment
  const margins = isExpanded 
    ? { top: 70, right: 40, bottom: 80, left: 120 }
    : { top: 60, right: 40, bottom: 60, left: 100 };

  try {
    return (
      <div style={{ height: height }}>
        <ResponsiveHeatMap
          data={safeHeatmapData}
          keys={safeAgeRanges}
          indexBy="id"
          margin={margins}
          pixelRatio={2}
          colors={{
            type: 'diverging',
            scheme: 'blue_green',
            divergeAt: 0.5,
            minValue: 0,
            maxValue: safeMaxValue
          }}
          borderColor={{
            from: 'color',
            modifiers: [
              ['darker', 0.6]
            ]
          }}
          borderWidth={1}
          borderRadius={2}
          enableLabels={true}
          labelTextColor={{
            from: 'color',
            modifiers: [
              ['darker', 1.8]
            ]
          }}
          cellComponent={({ cell, borderColor, labelTextColor, textColor }) => (
            <g transform={`translate(${cell.x}, ${cell.y})`}>
              <rect
                width={cell.width}
                height={cell.height}
                fill={cell.color}
                strokeWidth={cell.borderWidth}
                stroke={borderColor}
                rx={2}
                ry={2}
              />
              {cell.value !== null && cell.value !== undefined && (
                <text
                  x={cell.width / 2}
                  y={cell.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{
                    fill: labelTextColor,
                    fontSize: isExpanded ? '12px' : '10px',
                    fontWeight: 'bold'
                  }}
                >
                  {cell.value}
                </text>
              )}
            </g>
          )}
          hoverTarget="cell"
          tooltip={({ cell }) => (
            <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
              <div className="font-semibold">
                {cell.serieId} - {cell.data.indexValue}
              </div>
              <div className="text-sm text-gray-600">
                Patients: {cell.value || 0}
              </div>
            </div>
          )}
          animate={true}
          motionConfig="gentle"
          forceSquare={false}
          sizeVariation={0}
          theme={{
            axis: {
              ticks: {
                text: {
                  fontSize: isExpanded ? 12 : 10,
                  fill: '#374151'
                }
              },
              legend: {
                text: {
                  fontSize: isExpanded ? 14 : 12,
                  fill: '#374151'
                }
              }
            },
            labels: {
              text: {
                fontSize: isExpanded ? 12 : 10,
                fill: '#374151'
              }
            }
          }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            orient: 'bottom',
            tickSize: 5,
            tickPadding: 8,
            legend: 'Age Range',
            legendOffset: isExpanded ? 60 : 40,
            legendPosition: 'middle'
          }}
          axisLeft={{
            orient: 'left',
            tickSize: 5,
            tickPadding: 8,
            legend: categoryField.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            legendOffset: isExpanded ? -100 : -80,
            legendPosition: 'middle'
          }}
          legends={[]}
        />
      </div>
    );
  } catch (error) {
    console.error('🔥 HEATMAP ERROR:', error);
    console.error('🔥 DATA STATE:', {
      safeHeatmapData,
      safeAgeRanges,
      categoryField
    });
    
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Heatmap rendering error for {categoryField}</p>
          <p className="text-gray-500 mt-2">Displaying table view instead.</p>
        </div>
      </div>
    );
  }
}