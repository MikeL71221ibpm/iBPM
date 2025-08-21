// Ultra-simple direct export demo - no lazy loading or dependencies
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, FileText, FileSpreadsheet, Database, Printer, Maximize } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

// Sample data for the chart
const sampleData = [
  { id: 'Housing Insecurity', value: 18, percentage: 75 },
  { id: 'Food Insecurity', value: 12, percentage: 50 },
  { id: 'Transportation', value: 9, percentage: 37.5 },
  { id: 'Utilities', value: 6, percentage: 25 },
  { id: 'Safety', value: 3, percentage: 12.5 }
];

// Simple export buttons - no external dependencies
function ExportButtons({ data, displayMode }: { data: any[], displayMode: string }) {
  const { toast } = useToast();
  
  const handleCSVExport = () => {
    toast({ title: "CSV Export", description: "Exporting to CSV format" });
    
    // Create CSV content
    const headers = "Indicator,Value,Percentage\n";
    const rows = data.map(item => `"${item.id}",${item.value},${item.percentage}`).join('\n');
    const csvContent = headers + rows;
    
    // Download the file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hrsn-indicators.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleDetailCSVExport = () => {
    toast({ title: "Detailed CSV Export", description: "Exporting detailed CSV" });
    
    // Create CSV content with metadata
    const metadata = [
      `# Export Date: ${new Date().toLocaleString()}`,
      `# Display Mode: ${displayMode}`,
      `# Total Records: ${data.length}`,
      '#'
    ].join('\n');
    
    const headers = "Indicator,Value,Percentage\n";
    const rows = data.map(item => `"${item.id}",${item.value},${item.percentage}`).join('\n');
    const csvContent = metadata + '\n' + headers + rows;
    
    // Download the file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hrsn-indicators-detailed.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleExcelExport = () => {
    toast({ title: "Excel Export", description: "Excel export would require XLSX.js library" });
  };
  
  const handleJSONExport = () => {
    toast({ title: "JSON Export", description: "Exporting to JSON format" });
    
    // Create JSON content
    const jsonContent = JSON.stringify({
      metadata: {
        exportDate: new Date().toISOString(),
        displayMode,
        totalRecords: data.length
      },
      data
    }, null, 2);
    
    // Download the file
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hrsn-indicators.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handlePrint = () => {
    toast({ title: "Print", description: "Opening print dialog" });
    window.print();
  };
  
  return (
    <div className="bg-gray-900 p-2 rounded-md border border-yellow-500 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-white font-bold mr-2 text-sm">EXPORT OPTIONS:</span>
        
        <Button 
          size="sm" 
          onClick={handleCSVExport}
          className="bg-blue-600 hover:bg-blue-700 h-8 px-2 py-1"
        >
          <FileDown className="h-4 w-4 mr-1" />
          <span>CSV</span>
        </Button>
        
        <Button 
          size="sm" 
          onClick={handleDetailCSVExport}
          className="bg-green-600 hover:bg-green-700 h-8 px-2 py-1"
        >
          <FileText className="h-4 w-4 mr-1" />
          <span>CSV Detail</span>
        </Button>
        
        <Button 
          size="sm" 
          onClick={handleExcelExport}
          className="bg-purple-600 hover:bg-purple-700 h-8 px-2 py-1"
        >
          <FileSpreadsheet className="h-4 w-4 mr-1" />
          <span>Excel</span>
        </Button>
        
        <Button 
          size="sm" 
          onClick={handleJSONExport}
          className="bg-orange-600 hover:bg-orange-700 h-8 px-2 py-1"
        >
          <Database className="h-4 w-4 mr-1" />
          <span>JSON</span>
        </Button>
        
        <Button 
          size="sm" 
          onClick={handlePrint}
          className="bg-gray-600 hover:bg-gray-700 h-8 px-2 py-1"
        >
          <Printer className="h-4 w-4 mr-1" />
          <span>Print</span>
        </Button>
      </div>
    </div>
  );
}

// Simple chart display with no dependencies
function SimpleChartDisplay({ data, displayMode }: { data: any[], displayMode: string }) {
  return (
    <div className="border rounded-md p-4 bg-white">
      <h3 className="font-bold mb-2">Simple Chart Representation</h3>
      <div>
        {data.map((item) => (
          <div key={item.id} className="mb-2">
            <div className="flex justify-between mb-1">
              <span>{item.id}</span>
              <span className="font-bold">
                {displayMode === 'percentage' ? `${item.percentage}%` : item.value}
              </span>
            </div>
            <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500" 
                style={{ width: `${item.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Data table component
function DataTable({ data }: { data: any[] }) {
  return (
    <div className="border rounded-md p-4 mt-4 overflow-x-auto bg-white">
      <h3 className="font-bold mb-2">Data Table</h3>
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-4 py-2 text-left">Indicator</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Value</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-4 py-2">{item.id}</td>
              <td className="border border-gray-300 px-4 py-2">{item.value}</td>
              <td className="border border-gray-300 px-4 py-2">{item.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Main component
export default function DirectExportDemo() {
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>('count');
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Direct Export Demo</h1>
      <p className="mb-6">This is a simplified version with no dependencies to eliminate spinning issues.</p>
      
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
        <CardContent className="h-[250px]">
          <SimpleChartDisplay data={sampleData} displayMode={displayMode} />
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
                <DialogTitle>HRSN Indicators - Expanded View</DialogTitle>
              </DialogHeader>
              
              {/* Export Buttons */}
              <ExportButtons data={sampleData} displayMode={displayMode} />
              
              <div className="mt-4">
                <SimpleChartDisplay data={sampleData} displayMode={displayMode} />
                <DataTable data={sampleData} />
              </div>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}