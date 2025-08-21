import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveHeatMap } from "@nivo/heatmap";

// Simple type definitions to match what we receive from the API
export type HeatmapCategory = {
  id: string;
  data: Array<{
    x: string;
    y: number;
  }>;
};

interface RealDataHeatmapProps {
  title: string;
  data: HeatmapCategory[];
  showTooltips?: boolean;
}

const RealDataHeatmap = ({ title, data, showTooltips = true }: RealDataHeatmapProps) => {
  if (!data || data.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64 bg-neutral-50 text-neutral-400 rounded-md">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 240 }}>
          <ResponsiveHeatMap
            data={data}
            margin={{ top: 40, right: 50, bottom: 140, left: 130 }}
            cellPadding={5}
            cellBorderRadius={2}
            forceSquare={false}
            sizeVariation={0}
            axisTop={{
              tickSize: 5,
              tickPadding: 40,
              tickRotation: -45,
              legend: '',
              legendOffset: -40
            }}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 20,
              tickRotation: 0,
              legend: 'Age Range',
              legendPosition: 'middle',
              legendOffset: 50,
              renderTick: (tick) => {
                // Fine-tuned centering - minimal offset for clean alignment
                const cellWidth = 20; // Optimized for clean centering
                const adjustedX = tick.x + (cellWidth / 2);
                console.log("🔥 REAL-DATA CLEAN CENTERING:", tick.value, "original x:", tick.x, "adjusted x:", adjustedX);
                return (
                  <g key={tick.key} transform={`translate(${adjustedX},${tick.y})`}>
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#000000"
                      fontSize="11"
                      fontWeight="600"
                      dy={8}
                    >
                      {tick.value}
                    </text>
                  </g>
                );
              }
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 15,
              tickRotation: 0,
              legend: '',
              legendPosition: 'middle',
              legendOffset: -72,
              renderTick: (tick) => {
                console.log("🔥 REAL-DATA Y-AXIS TICK LABELS FIX:", tick.value, "at coordinates x:", tick.x, "y:", tick.y);
                return (
                  <g key={tick.key} transform={`translate(${tick.x},${tick.y})`}>
                    <text
                      textAnchor="end"
                      dominantBaseline="central"
                      fill="#000000"
                      fontSize="12"
                      fontWeight="600"
                      dx={-10}
                      style={{ 
                        visibility: 'visible',
                        display: 'block',
                        opacity: 1
                      }}
                    >
                      {tick.value}
                    </text>
                  </g>
                );
              }
            }}
            colors={() => '#f1f5f9'}
            emptyColor="#FFFFFF"
            borderWidth={1}
            borderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
            labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
            cellComponent={({ cell, borderWidth, borderColor, data }) => {
              // Y-axis alignment fix - center cells with Y-axis labels
              const adjustedY = cell.y - (cell.height * 0.5);
              console.log("🔥 REAL-DATA CELL POSITION:", cell.value, "at adjusted y:", adjustedY);
              
              return (
                <g transform={`translate(${cell.x},${adjustedY})`}>
                  <rect
                    width={cell.width}
                    height={cell.height}
                    fill="#f1f5f9"
                    stroke={borderColor}
                    strokeWidth={borderWidth}
                  />
                  <text
                    x={cell.width / 2}
                    y={cell.height / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#000000"
                    style={{ fontSize: '11px', fontWeight: '600' }}
                  >
                    {cell.value}%
                  </text>
                </g>
              );
            }}
            legends={[
              {
                anchor: 'bottom',
                translateX: 0,
                translateY: 30,
                length: 400,
                thickness: 8,
                direction: 'row',
                tickPosition: 'after',
                tickSize: 3,
                tickSpacing: 4,
                tickOverlap: false,
                title: 'Count →',
                titleAlign: 'start',
                titleOffset: 4
              }
            ]}
            tooltip={(data) => (
              <div style={{ 
                padding: '8px 12px', 
                backgroundColor: 'white', 
                boxShadow: '0 2px 10px rgba(0,0,0,0.15)', 
                borderRadius: '4px'
              }}>
                <div style={{ color: '#333', fontSize: '14px', fontWeight: 500 }}>
                  <strong>Data point information</strong>
                </div>
                <div>
                  <strong>Important:</strong> Using actual patient data
                </div>
              </div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default RealDataHeatmap;