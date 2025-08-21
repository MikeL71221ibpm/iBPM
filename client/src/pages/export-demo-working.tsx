import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Maximize2, 
  FileDown, 
  FileText, 
  FileSpreadsheet, 
  FileJson, 
  Printer,
  ArrowLeft 
} from 'lucide-react';
import { ResponsiveBar } from '@nivo/bar';
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import NavigationButton from '@/components/NavigationButton';

// Sample data for charts
const sampleData = [
  { id: "Housing instability", value: 312, percentage: 24 },
  { id: "Food insecurity", value: 267, percentage: 21 },
  { id: "Transportation barriers", value: 241, percentage: 19 },
  { id: "Financial strain", value: 182, percentage: 14 },
  { id: "Utility needs", value: 156, percentage: 12 },
  { id: "Education barriers", value: 89, percentage: 7 },
  { id: "Interpersonal violence", value: 37, percentage: 3 }
];

export default function ExportDemoWorking() {
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>('count');
  const [expandedChartId, setExpandedChartId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Process data based on display mode
  const processedData = sampleData.map(item => ({
    id: item.id,
    displayValue: displayMode === 'percentage' ? item.percentage : item.value,
    value: item.value,
    percentage: item.percentage
  }));

  // Export functions
  const exportCSV = (detailed = false) => {
    try {
      // Basic data for simple CSV
      let exportData = processedData.map(item => ({
        Category: item.id,
        [displayMode === 'percentage' ? 'Percentage (%)' : 'Count']: displayMode === 'percentage' ? item.percentage : item.value,
      }));
      
      // Add more data for detailed CSV
      if (detailed) {
        exportData = processedData.map(item => ({
          Category: item.id,
          Count: item.value,
          'Percentage (%)': item.percentage,
          DisplayMode: displayMode,
          ExportDate: new Date().toLocaleString(),
          PatientCount: 24, // Sample count
          RecordCount: 1061 // Sample count
        }));
      }
      
      // Convert to CSV
      const headers = Object.keys(exportData[0]).join(',');
      const rows = exportData.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : String(value)
        ).join(',')
      ).join('\\n');
      
      const csvContent = `${headers}\\n${rows}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const filename = `HRSN_Indicators_${detailed ? 'detailed_' : ''}${new Date().toISOString().split('T')[0]}.csv`;
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `Data exported to ${filename}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const exportExcel = () => {
    try {
      // Create worksheet with all data
      const exportData = processedData.map(item => ({
        Category: item.id,
        Count: item.value,
        'Percentage (%)': item.percentage,
        DisplayMode: displayMode,
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Create metadata worksheet
      const metadataWS = XLSX.utils.json_to_sheet([
        { Key: 'Report Name', Value: 'HRSN Indicators Report' },
        { Key: 'Export Date', Value: new Date().toLocaleString() },
        { Key: 'Display Mode', Value: displayMode },
        { Key: 'Total Patients', Value: 24 },
        { Key: 'Total Records', Value: 1061 }
      ]);
      
      // Create workbook and add worksheets
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
      XLSX.utils.book_append_sheet(workbook, metadataWS, "Metadata");
      
      // Export file
      const filename = `HRSN_Indicators_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      toast({
        title: "Export Successful",
        description: `Data exported to ${filename}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const exportJSON = () => {
    try {
      // Create comprehensive JSON with metadata
      const exportData = {
        reportName: 'HRSN Indicators Report',
        exportDate: new Date().toISOString(),
        displayMode: displayMode,
        metadata: {
          totalPatients: 24,
          totalRecords: 1061
        },
        data: processedData
      };
      
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const filename = `HRSN_Indicators_${new Date().toISOString().split('T')[0]}.json`;
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `Data exported to ${filename}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container mx-auto p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Export Functionality Demo</h1>
          <p className="text-sm text-muted-foreground">
            Demonstrating the export buttons implementation
          </p>
        </div>
        
        <div className="flex gap-2">
          <NavigationButton 
            href="/" 
            variant="outline"
            icon={ArrowLeft}
          >
            Back to Home
          </NavigationButton>
          
          <Button 
            variant={displayMode === 'count' ? 'default' : 'outline'}
            onClick={() => setDisplayMode('count')}
          >
            Count
          </Button>
          
          <Button 
            variant={displayMode === 'percentage' ? 'default' : 'outline'}
            onClick={() => setDisplayMode('percentage')}
          >
            Percentage
          </Button>
        </div>
      </header>
      
      <div className="grid grid-cols-1 gap-6">
        <Card className="w-full">
          <CardHeader className="py-2 px-4">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-sm">HRSN Indicators</CardTitle>
                <CardDescription className="text-xs">
                  Distribution of health-related social needs indicators
                </CardDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  onClick={() => setExpandedChartId('hrsn-indicators')}
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  title="Expand"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div style={{ height: 300 }}>
              <ResponsiveBar
                data={processedData}
                keys={['displayValue']}
                indexBy="id"
                margin={{ top: 10, right: 15, bottom: 56, left: 49 }}
                padding={0.2}
                layout="horizontal"
                valueScale={{ type: 'linear' }}
                indexScale={{ type: 'band', round: true }}
                colors="#3B82F6"
                axisBottom={{
                  tickSize: 3,
                  tickPadding: 3,
                  tickRotation: -30,
                  legend: '',
                  legendPosition: 'middle',
                  legendOffset: 35,
                  truncateTickAt: 0
                }}
                axisLeft={{
                  tickSize: 3,
                  tickPadding: 3,
                  tickRotation: 0,
                  legend: displayMode === 'percentage' ? 'Percentage (%)' : 'Count',
                  legendPosition: 'middle',
                  legendOffset: -35,
                  truncateTickAt: 0
                }}
                labelSkipWidth={8}
                labelSkipHeight={8}
                labelTextColor="#000000"
                labelStyle={{ 
                  fontWeight: 'bold', 
                  fontSize: 10
                }}
                label={d => displayMode === 'percentage' ? `${d.value}%` : d.value.toLocaleString()}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Expanded Chart Dialog */}
      <Dialog open={expandedChartId !== null} onOpenChange={(open) => !open && setExpandedChartId(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>HRSN Indicators ({displayMode === 'percentage' ? 'Percentage' : 'Count'})</DialogTitle>
            <DialogDescription>
              Distribution of health-related social needs indicators
            </DialogDescription>
          </DialogHeader>
          
          {/* Export Buttons */}
          <div className="bg-gray-900 p-2 rounded-md border border-yellow-500 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-white font-bold mr-2 text-sm">EXPORT OPTIONS:</span>
              
              <Button 
                size="sm" 
                onClick={() => exportCSV(false)}
                className="bg-blue-600 hover:bg-blue-700 h-8 px-2 py-1"
              >
                <FileDown className="h-4 w-4 mr-1" />
                <span>CSV</span>
              </Button>
              
              <Button 
                size="sm" 
                onClick={() => exportCSV(true)}
                className="bg-green-600 hover:bg-green-700 h-8 px-2 py-1"
              >
                <FileText className="h-4 w-4 mr-1" />
                <span>CSV Detail</span>
              </Button>
              
              <Button 
                size="sm" 
                onClick={exportExcel}
                className="bg-purple-600 hover:bg-purple-700 h-8 px-2 py-1"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                <span>Excel</span>
              </Button>
              
              <Button 
                size="sm" 
                onClick={exportJSON}
                className="bg-orange-600 hover:bg-orange-700 h-8 px-2 py-1"
              >
                <FileJson className="h-4 w-4 mr-1" />
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
          
          {/* Expanded Chart */}
          <div style={{ height: 500 }}>
            <ResponsiveBar
              data={processedData}
              keys={['displayValue']}
              indexBy="id"
              margin={{ top: 20, right: 20, bottom: 80, left: 70 }}
              padding={0.2}
              layout="horizontal"
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors="#3B82F6"
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -30,
                legend: '',
                legendPosition: 'middle',
                legendOffset: 45,
                truncateTickAt: 0
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: displayMode === 'percentage' ? 'Percentage (%)' : 'Count',
                legendPosition: 'middle',
                legendOffset: -50,
                truncateTickAt: 0
              }}
              labelSkipWidth={8}
              labelSkipHeight={8}
              labelTextColor="#000000"
              labelStyle={{ 
                fontWeight: 'bold', 
                fontSize: 12
              }}
              label={d => displayMode === 'percentage' ? `${d.value}%` : d.value.toLocaleString()}
            />
          </div>
          
          {/* Data Table */}
          <div className="mt-4 border rounded-md overflow-hidden">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left font-medium text-sm">Category</th>
                  <th className="py-2 px-4 text-right font-medium text-sm">Count</th>
                  <th className="py-2 px-4 text-right font-medium text-sm">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {processedData.map((item, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-2 px-4 text-sm">{item.id}</td>
                    <td className="py-2 px-4 text-right text-sm">{item.value}</td>
                    <td className="py-2 px-4 text-right text-sm">{item.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}