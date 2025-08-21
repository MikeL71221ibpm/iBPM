import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

// Simple Excel-like pivot chart component
// Just paste data, click a button, get a chart
const ExcelStylePivotChart: React.FC = () => {
  const [rawData, setRawData] = useState('');
  const [title, setTitle] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Simple parsing function for tabular data
  const generateChart = () => {
    try {
      setError('');
      
      // Split the data into lines
      const lines = rawData.trim().split('\n');
      
      if (lines.length < 2) {
        setError('Please paste at least a header row and one data row');
        return;
      }
      
      // Check if the first line is a title
      if (!lines[0].match(/\d/)) {
        setTitle(lines[0]);
        lines.shift();
      }
      
      // Get the headers (dates)
      const headers = lines[0].trim().split(/\s+/);
      
      // Process data rows into a simple format for charting
      const data: any[] = [];
      const labels: string[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(/\s+/);
        
        // Extract the label (everything until we hit a number)
        let labelParts = [];
        let j = 0;
        
        while (j < parts.length && !parts[j].match(/^-?\d+(\.\d+)?$/)) {
          labelParts.push(parts[j]);
          j++;
        }
        
        const label = labelParts.join(' ');
        if (!label) continue;
        
        labels.push(label);
        
        // Create a data object with the label and values
        const row: any = { label };
        
        for (let k = 0; k < headers.length && j < parts.length; k++, j++) {
          const value = parts[j] === '' ? 0 : Number(parts[j]);
          row[headers[k]] = isNaN(value) ? 0 : value;
        }
        
        data.push(row);
      }
      
      setChartData(data);
      setChartLabels(labels);
    } catch (err) {
      console.error('Error generating chart:', err);
      setError('Failed to parse the data. Please check the format.');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Excel-Style Pivot Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Paste your data here:
            </label>
            <Textarea 
              value={rawData} 
              onChange={(e) => setRawData(e.target.value)} 
              className="min-h-[200px] font-mono"
              placeholder="Paste data from Excel or a pivot table.
Example:
Title (optional)
Date1 Date2 Date3 ...
Label1 1 2 3
Label2 4 5 6"
            />
          </div>
          
          <Button onClick={generateChart}>Generate Chart</Button>
          
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md border border-red-200">
              {error}
            </div>
          )}
          
          {chartData.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">{title || 'Chart Results'}</h3>
              
              <Tabs defaultValue="bar">
                <TabsList>
                  <TabsTrigger value="bar">Bar Chart</TabsTrigger>
                  <TabsTrigger value="table">Table View</TabsTrigger>
                </TabsList>
                
                <TabsContent value="bar" className="pt-4">
                  <div className="h-[500px]">
                    <ResponsiveBar
                      data={chartData}
                      keys={Object.keys(chartData[0] || {}).filter(k => k !== 'label')}
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
                      labelSkipWidth={12}
                      labelSkipHeight={12}
                      labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
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
                
                <TabsContent value="table">
                  <ScrollArea className="h-[300px]">
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Label</TableHead>
                            {Object.keys(chartData[0] || {})
                              .filter(key => key !== 'label')
                              .map(date => (
                                <TableHead key={date} className="text-right">{date}</TableHead>
                              ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {chartData.map((row, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{row.label}</TableCell>
                              {Object.keys(row)
                                .filter(key => key !== 'label')
                                .map(date => (
                                  <TableCell key={date} className="text-right">
                                    {row[date]}
                                  </TableCell>
                                ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExcelStylePivotChart;