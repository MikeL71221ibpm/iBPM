// Simple demonstration of export buttons
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, FileType, Table } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const sampleChartData = [
  { id: "Housing instability", value: 312, percentage: 24 },
  { id: "Food insecurity", value: 267, percentage: 21 },
  { id: "Transportation barriers", value: 241, percentage: 19 },
  { id: "Financial strain", value: 182, percentage: 14 },
  { id: "Utility needs", value: 156, percentage: 12 },
  { id: "Education barriers", value: 89, percentage: 7 },
  { id: "Interpersonal violence", value: 37, percentage: 3 }
];

export default function PopulationHealthWithFixedExport() {
  const { toast } = useToast();
  
  // Export functions
  const exportAsCSV = () => {
    try {
      // Convert data to CSV string
      const headers = Object.keys(sampleChartData[0]).join(',');
      const rows = sampleChartData.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') 
            ? `"${value.replace(/"/g, '""')}"` 
            : String(value)
        ).join(',')
      ).join('\n');
      
      const csvContent = `${headers}\n${rows}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const filename = `hrsn_indicators_${new Date().toISOString().split('T')[0]}.csv`;
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "CSV Export Successful",
        description: `Data exported to ${filename}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred during export",
        variant: "destructive",
      });
    }
  };

  const exportAsJSON = () => {
    try {
      const jsonString = JSON.stringify(sampleChartData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const filename = `hrsn_indicators_${new Date().toISOString().split('T')[0]}.json`;
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "JSON Export Successful",
        description: `Data exported to ${filename}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred during export",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">Export Button Demonstration</h1>
      
      <div className="grid grid-cols-1 gap-8">
        {/* Export Button Card 1: Simple Buttons */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Standard Export Buttons</CardTitle>
            <CardDescription>Basic export functionality with standard styling</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <Button
                  onClick={exportAsCSV}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                
                <Button
                  onClick={exportAsJSON}
                  className="flex items-center gap-2"
                >
                  <FileType className="h-4 w-4" />
                  Export JSON
                </Button>
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                Click either button to download sample data in the selected format
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Export Button Card 2: Enhanced Buttons */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">High-Visibility Export Buttons</CardTitle>
            <CardDescription>Colorful export buttons with enhanced styling</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="bg-gray-900 p-4 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-4">EXPORT OPTIONS</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 text-lg"
                    onClick={exportAsCSV}
                  >
                    <Download className="h-5 w-5 mr-2" />
                    CSV
                  </Button>
                  
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 text-lg"
                    onClick={exportAsJSON}
                  >
                    <FileType className="h-5 w-5 mr-2" />
                    JSON
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 text-sm text-gray-500">
                These buttons stand out more and are easier to see at a glance
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Export Button Card 3: Fixed Position Buttons */}
        <Card className="shadow-lg relative">
          <CardHeader>
            <CardTitle className="text-2xl">Floating Export Buttons</CardTitle>
            <CardDescription>Position-fixed export buttons that stay in view</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[200px]">
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                onClick={exportAsCSV}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                CSV
              </Button>
              
              <Button
                onClick={exportAsJSON}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                size="sm"
              >
                JSON
              </Button>
            </div>
            
            <div className="text-center mt-16">
              <p className="text-gray-600">The export buttons are fixed to the top-right corner of this card</p>
              <p className="text-gray-600">They remain visible regardless of content scrolling</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Data Preview Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Sample Data Being Exported</CardTitle>
            <CardDescription>This is the data that will be exported when you click the buttons</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">ID</th>
                    <th className="border p-2 text-left">Value</th>
                    <th className="border p-2 text-left">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleChartData.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                      <td className="border p-2">{item.id}</td>
                      <td className="border p-2">{item.value}</td>
                      <td className="border p-2">{item.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}