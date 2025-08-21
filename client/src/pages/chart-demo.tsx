import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  DownloadIcon, 
  PrinterIcon, 
  ChevronRightIcon 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Mock data for our demo
const mockChartData = [
  { id: "Housing", label: "Housing", value: 45, percentage: 28.13 },
  { id: "Food", label: "Food", value: 32, percentage: 20.00 },
  { id: "Transportation", label: "Transportation", value: 27, percentage: 16.88 },
  { id: "Utilities", label: "Utilities", value: 24, percentage: 15.00 },
  { id: "Personal Safety", label: "Personal Safety", value: 18, percentage: 11.25 },
  { id: "Healthcare Access", label: "Healthcare Access", value: 14, percentage: 8.75 }
];

// Helper for CSV export
const objectToCsv = (data: any[]) => {
  const csvRows = [];
  
  // Get headers
  const headers = Object.keys(data[0]);
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      // Escape quotes and handle special characters
      return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
};

const ChartDemo = () => {
  const { toast } = useToast();
  const [data, setData] = useState(mockChartData);
  
  // Export functions
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HRSN Chart Data");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(dataBlob, "hrsn-chart-data.xlsx");
    
    toast({
      title: "Success",
      description: "Data exported to Excel successfully!",
    });
  };
  
  const exportToCsv = () => {
    const csvData = objectToCsv(data);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, "hrsn-chart-data.csv");
    
    toast({
      title: "Success",
      description: "Data exported to CSV successfully!",
    });
  };
  
  const exportToPdf = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text("HRSN Chart Data", 14, 22);
    
    // Prepare data for the table
    const tableColumn = ["Category", "Count", "Percentage"];
    const tableRows = data.map(item => [
      item.label,
      item.value,
      `${item.percentage.toFixed(2)}%`
    ]);
    
    // Add the table
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    
    doc.save("hrsn-chart-data.pdf");
    
    toast({
      title: "Success",
      description: "Data exported to PDF successfully!",
    });
  };
  
  const exportToJson = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    saveAs(blob, "hrsn-chart-data.json");
    
    toast({
      title: "Success",
      description: "Data exported to JSON successfully!",
    });
  };
  
  const printWithDataTable = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Could not open print window. Please check your popup settings.",
        variant: "destructive"
      });
      return;
    }
    
    // Create table HTML from the data
    const tableHtml = `
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th>Category</th>
            <th>Count</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              <td>${item.label}</td>
              <td>${item.value}</td>
              <td>${item.percentage.toFixed(2)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    // Create full HTML document
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>HRSN Chart Data</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            .chart-container { margin-bottom: 30px; }
            .data-table { margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>HRSN Chart Data</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          
          <div class="data-table">
            <h2>Data Source</h2>
            ${tableHtml}
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 12px;">
              © 2025 HRSN Analytics Platform. All rights reserved.
            </p>
          </div>
          
          <script>
            // Auto-print once loaded
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Chart Export Demo (v3.1)</h1>
      <p className="mb-8">
        This demo showcases the v3.1 export enhancements added to HRSN charts. The 
        key features include Excel/CSV export, PDF export with styling, JSON export, 
        and printing with data tables.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center">
              <span>HRSN Indicators</span>
              <div className="dropdown relative ml-2">
                <Button variant="ghost" size="icon" className="data-export-button">
                  <DownloadIcon className="h-5 w-5" />
                </Button>
                <div className="dropdown-menu absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 p-1 space-y-1 hidden">
                  <button
                    onClick={exportToExcel}
                    className="group flex w-full items-center rounded-md px-2 py-2 text-sm hover:bg-gray-100"
                  >
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={exportToCsv}
                    className="group flex w-full items-center rounded-md px-2 py-2 text-sm hover:bg-gray-100"
                  >
                    CSV (.csv)
                  </button>
                  <button
                    onClick={exportToPdf}
                    className="group flex w-full items-center rounded-md px-2 py-2 text-sm hover:bg-gray-100"
                  >
                    PDF (.pdf)
                  </button>
                  <button
                    onClick={exportToJson}
                    className="group flex w-full items-center rounded-md px-2 py-2 text-sm hover:bg-gray-100"
                  >
                    JSON (.json)
                  </button>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-col space-y-4">
              {data.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3" 
                      style={{ backgroundColor: `hsl(${Math.random() * 360}, 70%, 50%)` }} 
                    />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-4">{item.value}</span>
                    <span className="text-sm text-gray-500">{item.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8">
              <Button 
                variant="outline" 
                onClick={printWithDataTable}
                className="flex items-center"
              >
                <PrinterIcon className="mr-2 h-4 w-4" />
                Print with Data Table
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Key Enhancements in v3.1</h2>
          <ul className="space-y-4">
            <li className="flex">
              <ChevronRightIcon className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0" />
              <div>
                <strong>Chart Export Options</strong>
                <p className="text-gray-600">Added the ability to export chart data in multiple formats (Excel, CSV, PDF, JSON).</p>
              </div>
            </li>
            <li className="flex">
              <ChevronRightIcon className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0" />
              <div>
                <strong>Print with Data Tables</strong>
                <p className="text-gray-600">Enhanced print functionality to include the data tables alongside the visualizations.</p>
              </div>
            </li>
            <li className="flex">
              <ChevronRightIcon className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0" />
              <div>
                <strong>Version Control System</strong>
                <p className="text-gray-600">Implemented a central configuration system to toggle between v3.0 and v3.1 interfaces.</p>
              </div>
            </li>
            <li className="flex">
              <ChevronRightIcon className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0" />
              <div>
                <strong>Maintained Visual Consistency</strong>
                <p className="text-gray-600">All enhancements maintain the exact same visual representation as the v3.0 charts.</p>
              </div>
            </li>
          </ul>
          
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-bold">How to use</h3>
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              <li>Click the download icon on any chart to see export options</li>
              <li>Use the "Print with Data Table" button to preview printable report</li>
              <li>Toggle between v3.0 and v3.1 using the version config</li>
            </ol>
          </div>
        </Card>
      </div>
      
      {/* JavaScript to handle dropdown for export options */}
      <script dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('DOMContentLoaded', function() {
            const exportButtons = document.querySelectorAll('.data-export-button');
            
            exportButtons.forEach(button => {
              button.addEventListener('click', function(e) {
                const menu = this.nextElementSibling;
                menu.classList.toggle('hidden');
                e.stopPropagation();
              });
            });
            
            document.addEventListener('click', function() {
              const menus = document.querySelectorAll('.dropdown-menu');
              menus.forEach(menu => {
                menu.classList.add('hidden');
              });
            });
          });
        `
      }} />
    </div>
  );
};

export default ChartDemo;