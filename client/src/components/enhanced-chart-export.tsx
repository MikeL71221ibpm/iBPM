import React, { useState } from 'react';
import { FileDown, FileSpreadsheet, FileJson, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

interface ChartExportProps {
  chartTitle: string;
  chartId: string;
  data: any[];
}

export const EnhancedChartExport = ({ chartTitle, chartId, data }: ChartExportProps) => {
  const [isExporting, setIsExporting] = useState(false);

  // Safe version of export to PNG
  const exportToPng = async () => {
    try {
      setIsExporting(true);
      const chartElement = document.querySelector(`[data-chart-id="${chartId}"]`) as HTMLElement;
      if (!chartElement) {
        console.error(`Chart element with ID ${chartId} not found`);
        alert(`Could not find chart for export. Please try again.`);
        setIsExporting(false);
        return;
      }

      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true
      });

      const imageUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${chartTitle.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = imageUrl;
      document.body.appendChild(link);
      link.click();
      
      // Safe removal with check
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error exporting chart to PNG:', error);
      alert('Failed to export chart. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Safe version of print
  const printChart = async () => {
    try {
      setIsExporting(true);
      const chartElement = document.querySelector(`[data-chart-id="${chartId}"]`) as HTMLElement;
      if (!chartElement) {
        console.error(`Chart element with ID ${chartId} not found`);
        alert(`Could not find chart for printing. Please try again.`);
        setIsExporting(false);
        return;
      }

      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2
      });

      // Create image from canvas
      const img = canvas.toDataURL('image/png');
      
      // Create a new window for printing
      let printWindow = null;
      try {
        printWindow = window.open('', '_blank');
        if (!printWindow) {
          alert('Please allow popups to print charts');
          setIsExporting(false);
          return;
        }
        
        // Add content to the print window
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${chartTitle} - Chart Print</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .chart-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
                .chart-image { max-width: 100%; }
                .print-date { color: #666; font-size: 12px; margin-bottom: 20px; }
              </style>
            </head>
            <body>
              <div class="chart-title">${chartTitle}</div>
              <div class="print-date">Generated on ${new Date().toLocaleString()}</div>
              <img class="chart-image" src="${img}" alt="${chartTitle}">
            </body>
          </html>
        `);
        
        printWindow.document.close();
        
        // Wait for content to be fully loaded before printing
        setTimeout(() => {
          try {
            if (printWindow) {
              printWindow.print();
              // Don't close the window - let the user decide after printing
            }
          } catch (printError) {
            console.error('Error during print operation:', printError);
          } finally {
            setIsExporting(false);
          }
        }, 250);
      } catch (error) {
        console.error('Error opening print window:', error);
        setIsExporting(false);
      }
    } catch (error) {
      console.error('Error preparing chart for print:', error);
      alert('Failed to prepare chart for printing. Please try again.');
      setIsExporting(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    try {
      if (!data || !data.length) {
        alert('No data available for export');
        return;
      }
      
      // Convert to CSV
      const headers = Object.keys(data[0]).filter(key => !key.startsWith('_'));
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(key => {
          // Handle strings with commas by wrapping in quotes
          const value = row[key]?.toString() || '';
          return value.includes(',') ? `"${value}"` : value;
        }).join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `${chartTitle.replace(/\s+/g, '-').toLowerCase()}.csv`);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Failed to export as CSV. Please try again.');
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    try {
      if (!data || !data.length) {
        alert('No data available for export');
        return;
      }

      // Filter data to remove internal properties
      const cleanData = data.map(item => {
        const cleanItem: Record<string, any> = {};
        Object.keys(item).forEach(key => {
          if (!key.startsWith('_') && typeof item[key] !== 'function') {
            cleanItem[key] = item[key];
          }
        });
        return cleanItem;
      });

      // Create workbook
      const worksheet = XLSX.utils.json_to_sheet(cleanData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Chart Data');
      
      // Generate file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Download
      saveAs(blob, `${chartTitle.replace(/\s+/g, '-').toLowerCase()}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export as Excel. Please try again.');
    }
  };

  // Export to JSON
  const exportToJSON = () => {
    try {
      if (!data || !data.length) {
        alert('No data available for export');
        return;
      }

      // Filter data to remove internal properties
      const cleanData = data.map(item => {
        const cleanItem: Record<string, any> = {};
        Object.keys(item).forEach(key => {
          if (!key.startsWith('_') && typeof item[key] !== 'function') {
            cleanItem[key] = item[key];
          }
        });
        return cleanItem;
      });

      // Create JSON blob
      const jsonString = JSON.stringify(cleanData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Download
      saveAs(blob, `${chartTitle.replace(/\s+/g, '-').toLowerCase()}.json`);
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      alert('Failed to export as JSON. Please try again.');
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    try {
      const chartElement = document.querySelector(`[data-chart-id="${chartId}"]`) as HTMLElement;
      if (!chartElement) {
        console.error(`Chart element with ID ${chartId} not found`);
        alert(`Could not find chart for PDF export. Please try again.`);
        return;
      }

      html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        
        // Calculate dimensions to fit on PDF
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 295; // A4 height in mm
        const imgHeight = canvas.height * imgWidth / canvas.width;
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // Add metadata
        pdf.setProperties({
          title: chartTitle,
          subject: 'Chart Export',
          creator: 'HRSN Analytics Dashboard'
        });
        
        // Add title
        pdf.setFontSize(16);
        pdf.text(chartTitle, 20, 20);
        
        // Add timestamp
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Generated on ${new Date().toLocaleString()}`, 20, 30);
        
        // Add image
        pdf.addImage(imgData, 'PNG', 0, 40, imgWidth, imgHeight);
        
        // Save PDF
        pdf.save(`${chartTitle.replace(/\s+/g, '-').toLowerCase()}.pdf`);
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Failed to export as PDF. Please try again.');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="hover:bg-accent" 
          disabled={isExporting}
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Chart
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" sideOffset={5} style={{ zIndex: 1000 }}>
        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Print option */}
        <DropdownMenuItem onClick={printChart} className="cursor-pointer">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Export Data</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Export as PDF option */}
        <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">
          <FileText className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        
        {/* Export as Excel option */}
        <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer flex items-center">
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
        
        {/* Export as CSV option */}
        <DropdownMenuItem onClick={exportToCSV} className="cursor-pointer flex items-center">
          <FileDown className="w-4 h-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        
        {/* Export as JSON option */}
        <DropdownMenuItem onClick={exportToJSON} className="cursor-pointer flex items-center">
          <FileJson className="w-4 h-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default EnhancedChartExport;