import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveHeatMap } from "@nivo/heatmap";

type DemographicData = {
  category: string;
  housingStatus: number;
  foodStatus: number;
  financialStatus: number;
  transportationStatus: number;
  totalPatients: number;
};

interface DemographicHeatmapProps {
  title: string;
  data: DemographicData[];
  showPercentages?: boolean;
  categoryField?: string;
}

const DemographicHeatmap = ({ 
  title, 
  data, 
  showPercentages = false, 
  categoryField = "age_range" 
}: DemographicHeatmapProps) => {
  if (!data || data.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64 bg-neutral-50 text-neutral-400 rounded-md">
            No demographic data available for {categoryField}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Dynamic field mapping based on available data
  const getFieldValue = (item: any, fieldType: string): number => {
    switch (fieldType) {
      case 'housing':
        return item.housingStatus || item.housing_insecurity || item.housing_status || 0;
      case 'food':
        return item.foodStatus || item.food_insecurity || item.food_status || 0;
      case 'financial':
        return item.financialStatus || item.financial_strain || item.financial_status || 0;
      case 'transportation':
        return item.transportationStatus || item.access_to_transportation || item.transportation || 0;
      default:
        return 0;
    }
  };

  // Format data for heatmap display with dynamic field detection
  const formattedData = [
    {
      id: "Housing Status",
      data: data.map(item => ({
        x: item.category,
        y: showPercentages 
          ? Math.round((getFieldValue(item, 'housing') / item.totalPatients) * 100) 
          : getFieldValue(item, 'housing'),
        raw: getFieldValue(item, 'housing'),
        total: item.totalPatients,
        percentage: Math.round((getFieldValue(item, 'housing') / item.totalPatients) * 100)
      }))
    },
    {
      id: "Food Status",
      data: data.map(item => ({
        x: item.category,
        y: showPercentages 
          ? Math.round((getFieldValue(item, 'food') / item.totalPatients) * 100) 
          : getFieldValue(item, 'food'),
        raw: getFieldValue(item, 'food'),
        total: item.totalPatients,
        percentage: Math.round((getFieldValue(item, 'food') / item.totalPatients) * 100)
      }))
    },
    {
      id: "Financial Status",
      data: data.map(item => ({
        x: item.category,
        y: showPercentages 
          ? Math.round((getFieldValue(item, 'financial') / item.totalPatients) * 100) 
          : getFieldValue(item, 'financial'),
        raw: getFieldValue(item, 'financial'),
        total: item.totalPatients,
        percentage: Math.round((getFieldValue(item, 'financial') / item.totalPatients) * 100)
      }))
    },
    {
      id: "Transportation Status",
      data: data.map(item => ({
        x: item.category,
        y: showPercentages 
          ? Math.round((getFieldValue(item, 'transportation') / item.totalPatients) * 100) 
          : getFieldValue(item, 'transportation'),
        raw: getFieldValue(item, 'transportation'),
        total: item.totalPatients,
        percentage: Math.round((getFieldValue(item, 'transportation') / item.totalPatients) * 100)
      }))
    }
  ];

  // Get min and max values for color scaling
  const allValues = formattedData.flatMap(row => 
    row.data.map(cell => showPercentages ? cell.percentage : cell.raw)
  );
  const maxValue = Math.max(...allValues, 1);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{title}</span>
          <span className="text-sm font-normal text-gray-500">
            {showPercentages ? '(showing percentages)' : '(showing counts)'} - {categoryField.replace(/_/g, ' ')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: 300 }}>
          <ResponsiveHeatMap
            data={formattedData}
            margin={{ top: 60, right: 90, bottom: 60, left: 120 }}
            valueFormat={showPercentages ? ">-.0f%" : ">-.0f"}
            axisTop={{
              tickSize: 5,
              tickPadding: 40,
              tickRotation: -45,
              legend: categoryField.replace(/_/g, ' ').toUpperCase(),
              legendPosition: 'middle',
              legendOffset: -50
            }}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 40,
              tickRotation: 0,
              legend: categoryField.replace(/_/g, ' ').toUpperCase(),
              legendPosition: 'middle',
              legendOffset: 50
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 40,
              tickRotation: 0,
              legend: 'HRSN Categories',
              legendPosition: 'middle',
              legendOffset: -100
            }}
            colors={{
              type: 'sequential',
              scheme: 'blues'
            }}
            emptyColor="#ffffff"
            borderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
            labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
            animate={true}
            motionConfig="wobbly"
            hoverTarget="cell"
            cellHoverOthersOpacity={0.25}
            tooltip={({ cell }) => (
              <div style={{ 
                padding: '12px', 
                backgroundColor: 'white', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)', 
                borderRadius: '6px',
                border: '1px solid #e1e5e9'
              }}>
                <div style={{ color: '#333', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                  <strong>{cell.serieId}</strong> × <strong>{cell.data.x}</strong>
                </div>
                <div style={{ color: '#666', fontSize: '12px' }}>
                  <strong>Count:</strong> {cell.data.raw} of {cell.data.total} patients
                </div>
                <div style={{ color: '#666', fontSize: '12px' }}>
                  <strong>Percentage:</strong> {cell.data.percentage}%
                </div>
              </div>
            )}
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
                title: showPercentages ? 'Percentage (%)' : 'Patient Count',
                titleAlign: 'start',
                titleOffset: 4
              }
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default DemographicHeatmap;