// Simple Export Button Demo
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExportDemo() {
  const { toast } = useToast();
  
  // Sample data
  const sampleData = [
    { id: "Housing instability", value: 312 },
    { id: "Food insecurity", value: 267 },
    { id: "Transportation barriers", value: 241 },
    { id: "Financial strain", value: 182 },
    { id: "Utility needs", value: 156 }
  ];
  
  const exportCSV = () => {
    try {
      // Convert data to CSV string
      const headers = Object.keys(sampleData[0]).join(',');
      const rows = sampleData.map(row => 
        Object.values(row).join(',')
      ).join('\n');
      
      const csvContent = `${headers}\n${rows}`;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const filename = `export_demo_${new Date().toISOString().split('T')[0]}.csv`;
      
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
        description: "An error occurred during export",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Export Button Demo</h1>
      
      <Card className="p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">HRSN Indicators</h2>
          
          {/* Export button fixed in top right corner */}
          <Button 
            onClick={exportCSV}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
        
        <div className="mt-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Indicator</th>
                <th className="border p-2 text-left">Value</th>
              </tr>
            </thead>
            <tbody>
              {sampleData.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="border p-2">{item.id}</td>
                  <td className="border p-2">{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-bold mb-2">Implementation Notes:</h3>
        <p>The export button is positioned in the top-right corner of the chart container.</p>
        <p>Clicking it will download a CSV file with the chart data.</p>
        <p>This approach can be applied to all charts by adding a similar button to each chart container.</p>
      </div>
    </div>
  );
}