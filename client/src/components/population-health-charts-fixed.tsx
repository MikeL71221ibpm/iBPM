import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { processChartData } from '@/utils/chart-calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponsiveBar } from '@nivo/bar';

interface PopulationHealthChartsProps {
  data?: any;
  isLoading?: boolean;
  displayMode?: 'count' | 'percentage';
  onDisplayModeChange?: (mode: 'count' | 'percentage') => void;
}

export default function PopulationHealthChartsFixed({ 
  data, 
  isLoading, 
  displayMode = 'count',
  onDisplayModeChange 
}: PopulationHealthChartsProps) {
  const [currentDisplayMode, setCurrentDisplayMode] = useState<'count' | 'percentage'>(displayMode);

  const handleDisplayModeChange = (mode: 'count' | 'percentage') => {
    setCurrentDisplayMode(mode);
    onDisplayModeChange?.(mode);
  };

  // Process HRSN data with correct percentage calculation (total HRSN records: 2,314)
  const hrsnData = data?.hrsnIndicatorData ? 
    processChartData(data.hrsnIndicatorData.slice(0, 10), currentDisplayMode, 2314) : [];

  // Process diagnosis data with correct total (301,306 total diagnosis records)
  const diagnosisData = data?.diagnosisData ? 
    processChartData(data.diagnosisData.slice(0, 10), currentDisplayMode, 301306) : [];



  // Process symptom data with correct total (sum of all symptom counts)
  const symptomTotalCount = data?.symptomSegmentData ? 
    data.symptomSegmentData.reduce((sum: number, item: any) => sum + (parseInt(item.count) || parseInt(item.value) || 0), 0) : 0;
  const symptomData = data?.symptomSegmentData ? 
    processChartData(data.symptomSegmentData.slice(0, 10), currentDisplayMode, symptomTotalCount) : [];

  if (isLoading) return <div>Loading charts...</div>;

  return (
    <div className="space-y-6">
      {/* Display Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <Button 
          variant={currentDisplayMode === 'count' ? 'default' : 'outline'}
          onClick={() => handleDisplayModeChange('count')}
        >
          Count
        </Button>
        <Button 
          variant={currentDisplayMode === 'percentage' ? 'default' : 'outline'}
          onClick={() => handleDisplayModeChange('percentage')}
        >
          Percentage
        </Button>
      </div>

      {/* HRSN Indicators Chart */}
      <Card>
        <CardHeader>
          <CardTitle>HRSN Indicators ({currentDisplayMode} mode)</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: '400px' }}>
            <ResponsiveBar
              data={hrsnData}
              keys={['value']}
              indexBy="id"
              margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: 'nivo' }}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'HRSN Indicators',
                legendPosition: 'middle',
                legendOffset: 32
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: currentDisplayMode === 'percentage' ? 'Percentage (%)' : 'Count',
                legendPosition: 'middle',
                legendOffset: -40
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              animate={true}
              tooltip={({ data, value }) => (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs">
                  <div className="font-medium text-gray-900 mb-1">{data.label}</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {currentDisplayMode === 'percentage' ? (
                      <>
                        <div>Percentage: {value}%</div>
                        <div>Count: {data.rawCount}</div>
                        <div>Total HRSN: {data.total}</div>
                      </>
                    ) : (
                      <>
                        <div>Count: {value}</div>
                        <div>Percentage: {data.percentage}%</div>
                      </>
                    )}
                  </div>
                </div>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Top Diagnoses Chart (based on 301,306 total diagnosis records) */}
      <Card>
        <CardHeader>
          <CardTitle>Top Diagnoses ({currentDisplayMode} mode)</CardTitle>
          <div className="text-sm text-gray-500">Based on 301,306 total diagnosis records</div>
        </CardHeader>
        <CardContent>
          <div style={{ height: '400px' }}>
            <ResponsiveBar
              data={diagnosisData}
              keys={['value']}
              indexBy="id"
              margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: 'category10' }}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'Diagnoses',
                legendPosition: 'middle',
                legendOffset: 32
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: currentDisplayMode === 'percentage' ? 'Percentage (%)' : 'Count',
                legendPosition: 'middle',
                legendOffset: -40
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              animate={true}
              tooltip={({ data, value }) => (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs">
                  <div className="font-medium text-gray-900 mb-1">{data.label}</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {currentDisplayMode === 'percentage' ? (
                      <>
                        <div>Percentage: {value}%</div>
                        <div>Count: {data.rawCount}</div>
                        <div>Total Records: {data.total}</div>
                      </>
                    ) : (
                      <>
                        <div>Count: {value}</div>
                        <div>Percentage: {data.percentage}%</div>
                      </>
                    )}
                  </div>
                </div>
              )}
            />
          </div>
        </CardContent>
      </Card>



      {/* Symptom Segments Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top Symptom Segments ({currentDisplayMode} mode)</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height: '400px' }}>
            <ResponsiveBar
              data={symptomData}
              keys={['value']}
              indexBy="id"
              margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: 'set2' }}
              borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: 'Symptom Segments',
                legendPosition: 'middle',
                legendOffset: 32
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: currentDisplayMode === 'percentage' ? 'Percentage (%)' : 'Count',
                legendPosition: 'middle',
                legendOffset: -40
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
              animate={true}
              tooltip={({ data, value }) => (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs">
                  <div className="font-medium text-gray-900 mb-1">{data.label}</div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {currentDisplayMode === 'percentage' ? (
                      <>
                        <div>Percentage: {value}%</div>
                        <div>Count: {data.rawCount}</div>
                        <div>Total Segments: {data.total}</div>
                      </>
                    ) : (
                      <>
                        <div>Count: {value}</div>
                        <div>Percentage: {data.percentage}%</div>
                      </>
                    )}
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