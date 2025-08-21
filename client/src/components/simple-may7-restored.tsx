import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveBar } from '@nivo/bar';
import { ResponsivePie } from '@nivo/pie';

interface ChartDataItem {
  id: string;
  value: number;
  percentage?: number;
  [key: string]: string | number | undefined;
}

interface PopulationHealthChartsProps {
  data?: any;
  isLoading?: boolean;
}

export default function SimpleMay7Restored({ 
  data, 
  isLoading = false 
}: PopulationHealthChartsProps) {

  // Simplify the color scheme to use standard Nivo schemes
  const colorScheme = 'nivo';
  
  // These are the processed data arrays that will be used in charts
  const patientsByAgeData = data?.ageData || [];
  const patientsByGenderData = data?.genderData || [];
  const patientsByRaceData = data?.raceData || [];
  const diagnosesByCategoryData = data?.mockDiagnosesData || [];

  // Helper function to format percentages
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">May 7th: Population by Age Range</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div style={{ height: 300 }}>
            <ResponsiveBar
              data={patientsByAgeData}
              keys={['value']}
              indexBy="id"
              margin={{ top: 10, right: 10, bottom: 40, left: 60 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: colorScheme }}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Age Range',
                legendPosition: 'middle',
                legendOffset: 32
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Patients',
                legendPosition: 'middle',
                legendOffset: -50
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              tooltip={({ id, value, color, data }) => (
                <div style={{ padding: 12, background: 'white', border: '1px solid #ccc', borderRadius: 4 }}>
                  <strong>{id}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                    <div style={{ width: 12, height: 12, background: color, marginRight: 8 }} />
                    <span>{value} patients</span>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span>{formatPercentage(data.percentage as number)} of total</span>
                  </div>
                </div>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">May 7th: Population by Gender</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div style={{ height: 300 }}>
            <ResponsivePie
              data={patientsByGenderData}
              margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
              innerRadius={0.5}
              padAngle={0.7}
              cornerRadius={3}
              activeOuterRadiusOffset={8}
              colors={{ scheme: colorScheme }}
              borderWidth={1}
              borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
              arcLinkLabelsSkipAngle={10}
              arcLinkLabelsTextColor="#333333"
              arcLinkLabelsThickness={2}
              arcLinkLabelsColor={{ from: 'color' }}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
              legends={[
                {
                  anchor: 'bottom',
                  direction: 'row',
                  justify: false,
                  translateX: 0,
                  translateY: 56,
                  itemsSpacing: 0,
                  itemWidth: 100,
                  itemHeight: 18,
                  itemTextColor: '#999',
                  itemDirection: 'left-to-right',
                  itemOpacity: 1,
                  symbolSize: 18,
                  symbolShape: 'circle',
                }
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">May 7th: Population by Race</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div style={{ height: 300 }}>
            <ResponsiveBar
              data={patientsByRaceData}
              keys={['value']}
              indexBy="id"
              margin={{ top: 10, right: 10, bottom: 40, left: 60 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: colorScheme }}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Race',
                legendPosition: 'middle',
                legendOffset: 32
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Patients',
                legendPosition: 'middle',
                legendOffset: -50
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              tooltip={({ id, value, color, data }) => (
                <div style={{ padding: 12, background: 'white', border: '1px solid #ccc', borderRadius: 4 }}>
                  <strong>{id}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                    <div style={{ width: 12, height: 12, background: color, marginRight: 8 }} />
                    <span>{value} patients</span>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span>{formatPercentage(data.percentage as number)} of total</span>
                  </div>
                </div>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">May 7th: Common Diagnoses</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div style={{ height: 300 }}>
            <ResponsiveBar
              data={diagnosesByCategoryData}
              keys={['value']}
              indexBy="id"
              margin={{ top: 10, right: 10, bottom: 40, left: 60 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: colorScheme }}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'Diagnosis',
                legendPosition: 'middle',
                legendOffset: 32
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Count',
                legendPosition: 'middle',
                legendOffset: -50
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              tooltip={({ id, value, color, data }) => (
                <div style={{ padding: 12, background: 'white', border: '1px solid #ccc', borderRadius: 4 }}>
                  <strong>{id}</strong>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
                    <div style={{ width: 12, height: 12, background: color, marginRight: 8 }} />
                    <span>{value} patients</span>
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <span>{formatPercentage(data.percentage as number)} of total</span>
                  </div>
                </div>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}