import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { ResponsiveCirclePacking } from '@nivo/circle-packing';

export const StaticPopulationGrid: React.FC = () => {
  const colors = {
    HIGHEST: "#994C99", 
    HIGH: "#8856A7", 
    MEDIUM: "#8C96C6", 
    LOW: "#B3CDE3", 
    LOWEST: "#EDF8FB"
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {/* Chart 1: Symptoms by Segment */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Symptoms by Segment</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-[250px] w-full">
            <ResponsiveBar
              data={[
                { id: "Pain", value: 42, color: colors.HIGH },
                { id: "Fatigue", value: 35, color: colors.HIGH },
                { id: "Depression", value: 28, color: colors.HIGH },
                { id: "Anxiety", value: 23, color: colors.HIGH },
                { id: "Insomnia", value: 18, color: colors.HIGH }
              ]}
              keys={['value']}
              indexBy="id"
              margin={{ top: 30, right: 20, bottom: 50, left: 60 }}
              padding={0.3}
              colors={{ scheme: 'purple_blue' }}
              colorBy="indexValue"
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legendPosition: 'middle',
                legendOffset: 40
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                legendPosition: 'middle',
                legendOffset: -40
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Chart 2: Diagnoses Distribution */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Diagnoses Distribution</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-[250px] w-full">
            <ResponsivePie
              data={[
                { id: "Hypertension", value: 30, color: colors.HIGHEST },
                { id: "Diabetes", value: 25, color: colors.HIGH },
                { id: "Asthma", value: 20, color: colors.MEDIUM },
                { id: "Depression", value: 15, color: colors.LOW },
                { id: "Anxiety", value: 10, color: colors.LOWEST }
              ]}
              margin={{ top: 30, right: 80, bottom: 30, left: 80 }}
              innerRadius={0.5}
              padAngle={0.7}
              cornerRadius={3}
              colors={{ scheme: 'purple_blue' }}
              borderWidth={1}
              borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
              enableArcLinkLabels={false}
              arcLinkLabelsSkipAngle={10}
              arcLinkLabelsTextColor="#333333"
              arcLabelsSkipAngle={10}
              arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
              legends={[
                {
                  anchor: 'right',
                  direction: 'column',
                  justify: false,
                  translateX: 70,
                  translateY: 0,
                  itemsSpacing: 0,
                  itemWidth: 60,
                  itemHeight: 20,
                  itemTextColor: '#999',
                  itemDirection: 'left-to-right',
                  itemOpacity: 1,
                  symbolSize: 10,
                  symbolShape: 'circle'
                }
              ]}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Chart 3: HRSN Distribution */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">HRSN Distribution</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-[250px] w-full">
            <ResponsiveHeatMap
              data={[
                { id: 'Housing', data: [
                  { x: 'Secure', y: 30 },
                  { x: 'Insecure', y: 15 },
                  { x: 'Homeless', y: 5 }
                ]},
                { id: 'Food', data: [
                  { x: 'Secure', y: 25 },
                  { x: 'Insecure', y: 20 },
                  { x: 'Homeless', y: 5 }
                ]},
                { id: 'Financial', data: [
                  { x: 'Secure', y: 20 },
                  { x: 'Insecure', y: 22 },
                  { x: 'Homeless', y: 8 }
                ]}
              ]}
              margin={{ top: 30, right: 60, bottom: 40, left: 60 }}
              colors={{
                type: 'sequential',
                scheme: 'purples'
              }}
              axisTop={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legendPosition: 'middle',
                legendOffset: 36
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legendPosition: 'middle',
                legendOffset: -40
              }}
              hoverTarget="cell"
              // cellOpacity={1} // removed due to type issue
              borderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Chart 4: Symptom Distribution by Age */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Symptom Distribution by Age</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-[250px] w-full">
            <ResponsiveCirclePacking
              data={{
                name: 'symptoms',
                children: [
                  {
                    name: '18-34',
                    children: [
                      { name: 'Anxiety', value: 15 },
                      { name: 'Depression', value: 10 },
                      { name: 'Insomnia', value: 8 }
                    ]
                  },
                  {
                    name: '35-54',
                    children: [
                      { name: 'Hypertension', value: 20 },
                      { name: 'Diabetes', value: 15 },
                      { name: 'Asthma', value: 12 }
                    ]
                  },
                  {
                    name: '55+',
                    children: [
                      { name: 'Arthritis', value: 25 },
                      { name: 'Heart Disease', value: 18 },
                      { name: 'Chronic Pain', value: 22 }
                    ]
                  }
                ]
              }}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              id="name"
              value="value"
              colors={{ scheme: 'purple_blue' }}
              childColor={{ from: 'color', modifiers: [['brighter', 0.4]] }}
              padding={4}
              enableLabels={true}
              labelsSkipRadius={10} // fixed property name
              labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
              borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
              borderWidth={1}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaticPopulationGrid;