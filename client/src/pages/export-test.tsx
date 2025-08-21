// Export Test Page - Direct implementation without lazy loading
// Created on May 23, 2025 to test export buttons functionality

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { ResponsiveBar } from '@nivo/bar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Maximize, Table } from 'lucide-react';
import { ChartExportButtons } from '@/components/chart-export-buttons';
import { exportToCSV, exportToDetailedCSV, exportToExcel, exportToJSON } from '@/lib/chart-export-functions';

export default function ExportTest() {
  const { toast } = useToast();
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>('count');
  
  // Sample data for testing
  const chartData = [
    { id: 'Housing Insecurity', value: 18, percentage: 75 },
    { id: 'Food Insecurity', value: 12, percentage: 50 },
    { id: 'Transportation', value: 9, percentage: 37.5 },
    { id: 'Utilities', value: 6, percentage: 25 },
    { id: 'Safety', value: 3, percentage: 12.5 }
  ];
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Export Buttons Test</h1>
      <p className="mb-4">
        This page demonstrates the export functionality using a basic HRSN Indicators chart.
        Click the "Enlarge" button to see the export options in the expanded view.
      </p>
      
      <div className="mb-4 flex gap-4">
        <Button 
          variant={displayMode === 'count' ? 'default' : 'outline'} 
          onClick={() => setDisplayMode('count')}
        >
          Count View
        </Button>
        <Button 
          variant={displayMode === 'percentage' ? 'default' : 'outline'} 
          onClick={() => setDisplayMode('percentage')}
        >
          Percentage View
        </Button>
      </div>
      
      <Card className="overflow-hidden">
        <CardHeader className="p-2 pb-0">
          <CardTitle className="text-sm">HRSN Indicators Test</CardTitle>
          <div className="text-xs text-gray-500 mt-0.5">n=24 patients • n=1061 records</div>
        </CardHeader>
        <CardContent className="p-2 h-[280px]">
          <ResponsiveBar
            data={chartData.map(item => ({
              ...item,
              value: displayMode === "percentage" ? item.percentage : item.value
            }))}
            keys={['value']}
            indexBy="id"
            margin={{ top: 20, right: 20, bottom: 80, left: 70 }}
            padding={0.3}
            colors={{ scheme: 'category10' }}
            colorBy="indexValue"
            valueScale={{ type: 'linear' }}
            indexScale={{ type: 'band', round: true }}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -30,
              legend: 'HRSN Indicators',
              legendPosition: 'middle',
              legendOffset: 70
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: displayMode === "percentage" ? 'Percentage (%)' : 'Patients',
              legendPosition: 'middle',
              legendOffset: -50
            }}
            enableGridY={true}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor={"#000000"}
            labelPosition="middle"
            animate={true}
            motionConfig="gentle"
          />
        </CardContent>
        <CardFooter className="p-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Maximize className="h-4 w-4 mr-2" />
                Enlarge
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh]">
              <DialogHeader>
                <DialogTitle>HRSN Indicators</DialogTitle>
                <DialogDescription>
                  Test chart showing HRSN indicators for 24 patients.
                </DialogDescription>
              </DialogHeader>
              
              {/* Export Buttons */}
              <ChartExportButtons
                onExportCSV={() => {
                  exportToCSV(chartData, 'HRSN_Indicators_Test', toast);
                }}
                onExportDetailCSV={() => {
                  exportToDetailedCSV(chartData, 'HRSN_Indicators_Test', toast, {
                    displayMode: displayMode,
                    patientCount: 24,
                    recordCount: 1061
                  });
                }}
                onExportExcel={() => {
                  exportToExcel(chartData, 'HRSN_Indicators_Test', toast, {
                    displayMode: displayMode,
                    patientCount: 24,
                    recordCount: 1061
                  });
                }}
                onExportJSON={() => {
                  exportToJSON(chartData, 'HRSN_Indicators_Test', toast, {
                    displayMode: displayMode,
                    patientCount: 24,
                    recordCount: 1061
                  });
                }}
                onPrint={() => {
                  window.print();
                }}
              />
              
              {/* Chart display */}
              <div className="flex-1 h-[calc(45vh-120px)]">
                <ResponsiveBar
                  data={chartData.map(item => ({
                    ...item,
                    value: displayMode === "percentage" ? item.percentage : item.value
                  }))}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 70, right: 80, bottom: 140, left: 80 }}
                  padding={0.3}
                  colors={{ scheme: 'category10' }}
                  colorBy="indexValue"
                  valueScale={{ type: 'linear' }}
                  indexScale={{ type: 'band', round: true }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 25,
                    tickRotation: -35,
                    legend: 'HRSN Indicators',
                    legendPosition: 'middle',
                    legendOffset: 80
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: displayMode === "percentage" ? 'Percentage (%)' : 'Patients',
                    legendPosition: 'middle',
                    legendOffset: -50
                  }}
                  enableGridY={true}
                  labelSkipWidth={12}
                  labelSkipHeight={12}
                  enableLabel={true}
                  labelTextColor={"#000000"}
                  animate={true}
                  motionConfig="gentle"
                />
              </div>
              
              {/* Data Table */}
              <div className="border rounded-md mt-2 p-2">
                <h4 className="font-semibold mb-2 flex items-center">
                  <Table className="w-4 h-4 mr-2" />
                  Full Data Table (5 indicators)
                </h4>
                <div className="max-h-[20vh] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="p-2 text-left">HRSN Indicator</th>
                        <th className="p-2 text-left">Count</th>
                        <th className="p-2 text-left">Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                          <td className="p-2">{item.id}</td>
                          <td className="p-2">{item.value}</td>
                          <td className="p-2">{item.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}