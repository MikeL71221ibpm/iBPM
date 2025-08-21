// Ultra-simple export buttons demo
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Maximize } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ResponsiveBar } from '@nivo/bar';

// Import the chart export buttons component
import { ChartExportButtons } from '@/components/chart-export-buttons';

export default function ExportButtonsDemo() {
  const { toast } = useToast();
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>('count');
  
  // Sample data
  const chartData = [
    { id: 'Housing Insecurity', value: 18, percentage: 75 },
    { id: 'Food Insecurity', value: 12, percentage: 50 },
    { id: 'Transportation', value: 9, percentage: 37.5 },
    { id: 'Utilities', value: 6, percentage: 25 },
    { id: 'Safety', value: 3, percentage: 12.5 }
  ];
  
  // Simple export functions
  const handleCSVExport = () => {
    toast({ title: "CSV Export", description: "Exporting to CSV" });
    
    // Create CSV content
    const headers = "Indicator,Value,Percentage\n";
    const rows = chartData.map(item => `"${item.id}",${item.value},${item.percentage}`).join('\n');
    const csvContent = headers + rows;
    
    // Download the file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chart-data.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleExcelExport = () => {
    toast({ title: "Excel Export", description: "Exporting to Excel" });
    // In a real implementation, we would use xlsx library
  };
  
  const handleJSONExport = () => {
    toast({ title: "JSON Export", description: "Exporting to JSON" });
    
    // Create and download JSON
    const jsonContent = JSON.stringify({
      data: chartData,
      metadata: {
        exportDate: new Date().toISOString(),
        displayMode
      }
    }, null, 2);
    
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chart-data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handlePrint = () => {
    toast({ title: "Print", description: "Printing chart" });
    window.print();
  };
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Export Buttons Demo</h1>
      <p className="mb-6">This is a simple demo of the export buttons functionality.</p>
      
      <div className="mb-4 flex gap-2">
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
      
      <Card>
        <CardHeader>
          <CardTitle>HRSN Indicators</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveBar
            data={chartData}
            keys={['value']}
            indexBy="id"
            margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
            padding={0.3}
            valueScale={{ type: 'linear' }}
            colors={{ scheme: 'nivo' }}
            animate={true}
            enableLabel={true}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
            }}
          />
        </CardContent>
        <CardFooter>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Maximize className="mr-2 h-4 w-4" />
                Enlarge
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>HRSN Indicators</DialogTitle>
              </DialogHeader>
              
              {/* Export Buttons */}
              <ChartExportButtons
                onExportCSV={handleCSVExport}
                onExportDetailCSV={handleCSVExport}
                onExportExcel={handleExcelExport}
                onExportJSON={handleJSONExport}
                onPrint={handlePrint}
              />
              
              <div className="h-[400px] mt-4">
                <ResponsiveBar
                  data={chartData}
                  keys={['value']}
                  indexBy="id"
                  margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
                  padding={0.3}
                  valueScale={{ type: 'linear' }}
                  colors={{ scheme: 'nivo' }}
                  animate={true}
                  enableLabel={true}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}