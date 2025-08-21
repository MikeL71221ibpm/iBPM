import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { ResponsiveBar } from '@nivo/bar';

// A more direct and simple approach to visualizing pivot tables
const SimplePivotChart: React.FC = () => {
  const [rawData, setRawData] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartKeys, setChartKeys] = useState<string[]>([]);
  const [chartTitle, setChartTitle] = useState('');
  const [error, setError] = useState('');

  // Simple parsing for pivot table format
  const parseData = () => {
    try {
      setError('');
      // Split by lines
      const lines = rawData.trim().split('\n');
      
      if (lines.length < 2) {
        setError('Not enough data. Please include a header row and at least one data row.');
        return;
      }
      
      // First line might be a title
      const firstLine = lines[0].trim();
      if (!firstLine.match(/\d+\/\d+\/\d+/)) {
        // This is probably a title, not column headers
        setChartTitle(firstLine);
        lines.shift(); // Remove the title line
      }
      
      // Get column headers (dates)
      const headers = lines[0].trim().split(/\s+/);
      const dateColumns = headers.filter(h => h.match(/\d+\/\d+\/\d+/));
      setChartKeys(dateColumns);
      
      // Process data rows
      const parsedData: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Split the line by whitespace
        const parts = line.split(/\s+/);
        
        // The first part(s) that don't match numbers are the row label
        let label = '';
        let j = 0;
        while (j < parts.length && !parts[j].match(/^[\d.]+$/)) {
          label += (label ? ' ' : '') + parts[j];
          j++;
        }
        
        // Skip rows without a proper label
        if (!label) continue;
        
        // Create data object
        const rowData: any = { label };
        
        // Extract values - only take as many as we have date columns
        for (let k = 0; k < dateColumns.length && j < parts.length; k++, j++) {
          const value = parts[j] === '' ? null : Number(parts[j]);
          rowData[dateColumns[k]] = value;
        }
        
        parsedData.push(rowData);
      }
      
      setChartData(parsedData);
    } catch (err) {
      console.error('Failed to parse pivot table data:', err);
      setError('Failed to parse the data. Please check the format.');
    }
  };

  // Format shorter dates for display
  const formatDate = (date: string) => {
    const parts = date.split('/');
    return parts.length === 3 ? `${parts[0]}/${parts[1]}` : date;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Simple Pivot Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Paste your pivot table data here:
            </label>
            <Textarea 
              value={rawData} 
              onChange={(e) => setRawData(e.target.value)} 
              className="min-h-[200px] font-mono"
              placeholder="Paste data in pivot table format:
Title (optional)
Date1 Date2 Date3 ...
Row1 Value1 Value2 Value3 ...
Row2 Value1 Value2 Value3 ..."
            />
          </div>
          
          <Button onClick={parseData}>Generate Chart</Button>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
              {error}
            </div>
          )}
          
          {chartData.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">{chartTitle || 'Chart Results'}</h3>
              
              <Tabs defaultValue="bar">
                <TabsList>
                  <TabsTrigger value="bar">Bar Chart</TabsTrigger>
                  <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                </TabsList>
                
                <TabsContent value="bar" className="pt-4">
                  <div className="h-[500px]">
                    <ResponsiveBar
                      data={chartData}
                      keys={chartKeys}
                      indexBy="label"
                      margin={{ top: 50, right: 130, bottom: 100, left: 60 }}
                      padding={0.3}
                      valueScale={{ type: 'linear' }}
                      indexScale={{ type: 'band', round: true }}
                      colors={{ scheme: 'nivo' }}
                      axisBottom={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: -45,
                        legendPosition: 'middle',
                        legendOffset: 32
                      }}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'Count',
                        legendPosition: 'middle',
                        legendOffset: -40
                      }}
                      legends={[
                        {
                          dataFrom: 'keys',
                          anchor: 'bottom-right',
                          direction: 'column',
                          justify: false,
                          translateX: 120,
                          translateY: 0,
                          itemsSpacing: 2,
                          itemWidth: 100,
                          itemHeight: 20,
                          itemDirection: 'left-to-right',
                          itemOpacity: 0.85,
                          symbolSize: 12,
                          symbolShape: 'circle',
                        }
                      ]}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="heatmap" className="pt-4">
                  <div className="h-[500px]">
                    <ResponsiveHeatMap
                      data={chartData.map(item => {
                        const row: any = { id: item.label };
                        chartKeys.forEach(key => {
                          row[formatDate(key)] = item[key] || 0;
                        });
                        return row;
                      })}
                      valueFormat=">-.2f"
                      indexBy="id"
                      margin={{ top: 50, right: 60, bottom: 60, left: 120 }}
                      forceSquare={false}
                      axisTop={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: -45,
                        legend: '',
                      }}
                      axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: '',
                      }}
                      cellOpacity={1}
                      cellBorderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
                      labelTextColor={{ from: 'color', modifiers: [['darker', 1.8]] }}
                      legends={[
                        {
                          anchor: 'bottom',
                          translateX: 0,
                          translateY: 30,
                          length: 240,
                          thickness: 10,
                          direction: 'row',
                          tickPosition: 'after',
                          tickSize: 3,
                          tickSpacing: 4,
                          tickOverlap: false,
                          tickFormat: '>-.2s',
                          title: 'Value →',
                          titleAlign: 'start',
                          titleOffset: 4
                        }
                      ]}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SimplePivotChart;