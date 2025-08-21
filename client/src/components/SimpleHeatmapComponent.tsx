import React from 'react';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Image } from "lucide-react";
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface HeatmapProps {
  title: string;
  data: any[];
  indexBy: string;
  chartId: string;
}

const SimpleHeatmapComponent = ({ title, data, indexBy, chartId }: HeatmapProps) => {
  if (!data || data.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <h3 className="text-lg font-semibold">{title}</h3>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No data available</p>
        </CardContent>
      </Card>
    );
  }

  // Group by date and indexBy
  const groupedData: Record<string, Record<string, number>> = {};
  
  // Map field names to match database schema
  const fieldMap: Record<string, string> = {
    'symptomSegment': 'symptom_segment',
    'diagnosis': 'diagnosis', 
    'diagnosticCategory': 'diagnostic_category',
    'hrsnIndicator': 'hrsn_indicator'
  };
  
  const fieldName = fieldMap[indexBy] || indexBy;

  data.forEach(item => {
    const key = (item as any)[fieldName] as string;
    const dateValue = (item as any).dos_date || (item as any).dosDate;
    
    // Handle date formatting consistently for complete dataset
    let dateStr: string;
    if (dateValue) {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        dateStr = date.toLocaleDateString('en-US', { 
          month: '2-digit', 
          day: '2-digit', 
          year: '2-digit' 
        });
      } else {
        dateStr = 'Invalid Date';
      }
    } else {
      dateStr = 'No Date';
    }
    
    if (!groupedData[key]) {
      groupedData[key] = {};
    }
    groupedData[key][dateStr] = (groupedData[key][dateStr] || 0) + 1;
  });

  // Get unique dates and sort chronologically
  const allDates = Array.from(new Set(data.map(item => {
    const dateValue = (item as any).dos_date || (item as any).dosDate;
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { 
        month: '2-digit', 
        day: '2-digit', 
        year: '2-digit' 
      });
    }
    return 'Invalid Date';
  }))).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // Get all keys and sort by total frequency for complete dataset
  const allKeys = Object.keys(groupedData).sort((a, b) => {
    const totalA = Object.values(groupedData[a]).reduce((sum: number, val) => sum + (val as number), 0);
    const totalB = Object.values(groupedData[b]).reduce((sum: number, val) => sum + (val as number), 0);
    return totalB - totalA;
  });

  // Pagination for large datasets (important for complete patient data)
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 25; // Show 25 items per page for better performance
  const totalPages = Math.ceil(allKeys.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentKeys = allKeys.slice(startIndex, endIndex);

  // Calculate color based on value
  const getBackgroundColor = (value: number) => {
    if (value === 0 || value === 1) return '#ffffff';
    if (value === 2) return '#fef3c7';
    if (value === 3) return '#fde68a';
    if (value === 4) return '#fcd34d';
    if (value === 5) return '#f59e0b';
    if (value === 6) return '#d97706';
    if (value === 7) return '#b45309';
    if (value >= 8) return '#6b21a8';
    return '#ffffff';
  };

  // Export functions
  const exportToCSV = () => {
    const exportData: any[] = [];
    
    Object.keys(groupedData)
      .sort((a, b) => {
        const totalA = Object.values(groupedData[a]).reduce((sum: number, val) => sum + (val as number), 0);
        const totalB = Object.values(groupedData[b]).reduce((sum: number, val) => sum + (val as number), 0);
        return totalB - totalA;
      })
      .forEach(key => {
        const rowData: any = { Item: key };
        let totalValue = 0;
        
        allDates.forEach(date => {
          const value = groupedData[key]?.[date] || 0;
          rowData[date] = value;
          totalValue += value;
        });
        
        rowData.Total = totalValue;
        exportData.push(rowData);
      });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Heatmap Data');
    XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_heatmap.xlsx`);
  };

  const exportToPNG = async () => {
    const element = document.getElementById(chartId);
    if (element) {
      const canvas = await html2canvas(element);
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}_heatmap.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const exportToPDF = async () => {
    const element = document.getElementById(chartId);
    if (element) {
      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${title.replace(/\s+/g, '_')}_heatmap.pdf`);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-col gap-3 pb-2">
        <div className="flex flex-row items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <FileText className="w-4 h-4 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPNG}>
              <Image className="w-4 h-4 mr-1" />
              PNG
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <Download className="w-4 h-4 mr-1" />
              PDF
            </Button>
          </div>
        </div>
        
        {/* Pagination controls for large datasets */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>
                Showing {startIndex + 1}-{Math.min(endIndex, allKeys.length)} of {allKeys.length} items
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div 
          id={chartId} 
          className="overflow-auto border border-gray-200"
          style={{
            height: '400px',
            maxHeight: '400px',
            minHeight: '400px',
            width: '100%',
            scrollbarWidth: 'thin'
          }}
        >
          <table 
            className="border-collapse"
            style={{
              width: 'max-content',
              minWidth: '100%'
            }}
          >
            <thead>
              <tr>
                <th 
                  className="border border-slate-200 p-2 text-left text-sm font-semibold text-gray-700 bg-white"
                  style={{
                    position: 'sticky',
                    left: 0,
                    top: 0,
                    minWidth: '200px',
                    maxWidth: '200px',
                    zIndex: 30,
                    boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
                  }}
                >
                  {indexBy}
                </th>
                {allDates.map((date, index) => (
                  <th 
                    key={date} 
                    className="border border-slate-200 text-center text-sm font-semibold text-gray-700 bg-white relative"
                    style={{
                      position: 'sticky',
                      top: 0,
                      width: '90px',
                      minWidth: '90px',
                      maxWidth: '90px',
                      height: '60px',
                      zIndex: 20,
                      padding: 0
                    }}
                  >
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '50%',
                        transform: 'translateX(-50%) rotate(-45deg)',
                        transformOrigin: 'center center',
                        fontSize: '11px',
                        lineHeight: '1',
                        whiteSpace: 'nowrap',
                        textAlign: 'center'
                      }}
                    >
                      {date}
                    </div>
                  </th>
                ))}
                <th 
                  className="border border-slate-200 text-center text-sm font-semibold text-gray-700 bg-white"
                  style={{
                    position: 'sticky',
                    top: 0,
                    width: '80px',
                    minWidth: '80px',
                    maxWidth: '80px',
                    height: '60px',
                    zIndex: 20,
                    padding: '8px 4px'
                  }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {currentKeys.map((name) => {
                  const totalValue = Object.values(groupedData[name]).reduce((sum: number, val) => sum + (val as number), 0);
                  const truncatedName = name.length > 30 ? name.substring(0, 27) + '...' : name;
                  
                  return (
                    <tr key={name}>
                      <th 
                        className="border border-slate-200 p-2 text-left text-sm font-semibold text-gray-700 bg-white relative group"
                        style={{
                          position: 'sticky',
                          left: 0,
                          minWidth: '200px',
                          maxWidth: '200px',
                          zIndex: 10,
                          boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
                        }}
                        title={name}
                      >
                        <span className="block truncate">
                          {truncatedName} <span className="font-normal text-gray-500">({totalValue})</span>
                        </span>
                        {name.length > 30 && (
                          <div 
                            className="absolute invisible group-hover:visible bg-gray-900 text-white text-xs rounded-md px-2 py-1 z-50"
                            style={{
                              left: '105%',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              whiteSpace: 'nowrap',
                              maxWidth: '300px'
                            }}
                          >
                            {name}
                            <div 
                              className="absolute"
                              style={{
                                right: '100%',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid #111827',
                                borderTop: '6px solid transparent',
                                borderBottom: '6px solid transparent'
                              }}
                            />
                          </div>
                        )}
                      </th>
                      {allDates.map(date => {
                        const value = groupedData[name]?.[date] || 0;
                        return (
                          <td
                            key={date}
                            className="border border-slate-200 text-center text-sm"
                            style={{ 
                              backgroundColor: getBackgroundColor(value),
                              color: value >= 5 ? '#ffffff' : '#000000',
                              minWidth: '90px',
                              maxWidth: '90px',
                              width: '90px',
                              padding: '8px 4px',
                              fontWeight: value > 0 ? '600' : '400'
                            }}
                          >
                            {value}
                          </td>
                        );
                      })}
                      <td 
                        className="border border-slate-200 text-center text-sm font-semibold text-gray-900"
                        style={{
                          backgroundColor: '#f8fafc',
                          width: '80px',
                          minWidth: '80px',
                          maxWidth: '80px',
                          padding: '8px 4px'
                        }}
                      >
                        {totalValue}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleHeatmapComponent;