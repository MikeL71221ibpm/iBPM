/**
 * Chart Export Functions - May 23, 2025
 * These functions handle exporting chart data in various formats:
 * - Basic CSV: Simple comma-separated values export
 * - Detailed CSV: Enhanced CSV with additional metadata
 * - Excel: XLSX format with multiple sheets
 * - JSON: Structured data with metadata
 */

import * as XLSX from 'xlsx';

// CSV Export - Summary data (chart visualization data only)
export const exportToCSV = async (data: any[], filename: string, toast: any) => {
  try {
    console.log('🔥 SUMMARY CSV EXPORT CALLED for:', filename);
    
    if (!data || data.length === 0) {
      toast({
        title: "Export Error",
        description: "No chart data available to export",
        variant: "destructive"
      });
      return;
    }
    
    // Format headers and rows for CSV with chart summary data
    const headers = Object.keys(data[0])
      .filter(key => key !== 'color' && key !== 'colorIndex' && key !== 'rawData')
      .join(',');
    
    const rows = data.map(item => 
      Object.keys(item)
        .filter(key => key !== 'color' && key !== 'colorIndex' && key !== 'rawData')
        .map(key => {
          if (typeof item[key] === 'string') return `"${item[key].replace(/"/g, '""')}"`;
          return item[key];
        })
        .join(',')
    );
    
    // Combine headers and rows to create CSV content
    const csvContent = `${headers}\n${rows.join('\n')}`;
    
    // Create a blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_summary_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: `Summary CSV '${filename}' exported with ${data.length} chart data points.`,
      variant: "default"
    });
  } catch (error) {
    console.error("Summary CSV Export error:", error);
    toast({
      title: "Export Failed",
      description: "An error occurred during CSV export. Please try again.",
      variant: "destructive"
    });
  }
};

// Detailed CSV Export - Now includes all notes with dates of service + complete patient data
export const exportToDetailedCSV = async (data: any[], filename: string, toast: any, metadata: any = {}) => {
  try {
    console.log('🔥🔥🔥 DETAILED CSV EXPORT FUNCTION CALLED! 🔥🔥🔥');
    console.log('Data length:', data?.length || 0);
    console.log('Filename:', filename);
    
    // Fetch detailed dataset with all notes and dates of service
    const response = await fetch('/api/export-data-detailed', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch detailed data: ${response.statusText}`);
    }
    
    const result = await response.json();
    const detailedData = result.data || [];
    
    if (!detailedData || detailedData.length === 0) {
      toast({
        title: "Export Error",
        description: "No detailed data available for export",
        variant: "destructive"
      });
      return;
    }
    
    // Create enhanced data with metadata fields added
    const enhancedData = detailedData.map(item => {
      return {
        ...item, // All original + generated fields including dates of service
        dataset: "HRSN Behavioral Health Analytics - Detailed Records",
        exportDate: new Date().toISOString(),
        exportType: "detailed_with_dates_of_service",
        totalRecords: detailedData.length,
      };
    });
    
    // Format headers and rows for CSV with all available data
    const headers = Object.keys(enhancedData[0])
      .filter(key => key !== 'color' && key !== 'colorIndex')
      .join(',');
    
    const rows = enhancedData.map(item => 
      Object.keys(item)
        .filter(key => key !== 'color' && key !== 'colorIndex')
        .map(key => {
          if (typeof item[key] === 'string') return `"${item[key].replace(/"/g, '""')}"`;
          if (typeof item[key] === 'object' && item[key] !== null) return `"${JSON.stringify(item[key]).replace(/"/g, '""')}"`;
          return item[key];
        })
        .join(',')
    );
    
    // Combine headers and rows
    const csvContent = `${headers}\n${rows.join('\n')}`;
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_Detail_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Detailed Export Successful",
      description: `Detailed CSV with ${detailedData.length} records including all dates of service and original data fields exported.`,
      variant: "default"
    });
  } catch (error) {
    console.error("Detailed CSV Export error:", error);
    toast({
      title: "Detailed Export Failed",
      description: "An error occurred during detailed CSV export. Please try again.",
      variant: "destructive"
    });
  }
};

// Excel Export - Now includes complete data with all fields
export const exportToExcel = async (data: any[], filename: string, toast: any, metadata: any = {}) => {
  try {
    // Fetch complete dataset with all fields
    const response = await fetch('/api/export-data', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch complete data: ${response.statusText}`);
    }
    
    const result = await response.json();
    const completeData = result.data || [];
    
    if (!completeData || completeData.length === 0) {
      toast({
        title: "Export Error",
        description: "No data available for Excel export",
        variant: "destructive"
      });
      return;
    }
    
    // Create metadata for Excel file
    const metadataArray = [
      { MetadataType: "Report Name", Value: filename },
      { MetadataType: "Export Date", Value: new Date().toISOString() },
      { MetadataType: "Total Records", Value: completeData.length },
      { MetadataType: "Data Source", Value: "Complete Patient Database" },
      { MetadataType: "Includes", Value: "Original fields + Generated fields" }
    ];
    
    // Clean data by removing only internal UI properties
    const cleanData = completeData.map(item => {
      const cleanItem = {...item};
      delete cleanItem.color;
      delete cleanItem.colorIndex;
      delete cleanItem.rawData;
      return cleanItem;
    });
    
    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();
    
    // Add main data sheet
    const ws = XLSX.utils.json_to_sheet(cleanData);
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    
    // Add metadata sheet
    const metadataWs = XLSX.utils.json_to_sheet(metadataArray);
    XLSX.utils.book_append_sheet(wb, metadataWs, "Metadata");
    
    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Excel Export Successful",
      description: `Excel file '${filename}' has been downloaded.`,
      variant: "default"
    });
  } catch (error) {
    console.error("Excel Export error:", error);
    toast({
      title: "Excel Export Failed",
      description: "An error occurred during Excel export. Please try again.",
      variant: "destructive"
    });
  }
};

// JSON Export - Now includes complete data with all fields
export const exportToJSON = async (data: any[], filename: string, toast: any, metadata: any = {}) => {
  try {
    // Fetch complete dataset with all fields
    const response = await fetch('/api/export-data', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch complete data: ${response.statusText}`);
    }
    
    const result = await response.json();
    const completeData = result.data || [];
    
    if (!completeData || completeData.length === 0) {
      toast({
        title: "Export Error",
        description: "No data available for JSON export",
        variant: "destructive"
      });
      return;
    }
    
    // Clean data by removing only internal UI properties
    const cleanData = completeData.map(item => {
      const cleanItem = {...item};
      delete cleanItem.color;
      delete cleanItem.colorIndex;
      delete cleanItem.rawData;
      return cleanItem;
    });
    
    // Create enhanced data with metadata
    const enhancedData = {
      metadata: {
        reportName: filename,
        exportDate: new Date().toISOString(),
        totalRecords: completeData.length,
        dataSource: "Complete Patient Database",
        includes: "Original fields + Generated fields"
      },
      data: cleanData
    };
    
    // Convert to JSON string with pretty formatting
    const jsonString = JSON.stringify(enhancedData, null, 2);
    
    // Create blob and trigger download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "JSON Export Successful",
      description: `JSON file '${filename}' exported with ${completeData.length} records including all original + generated fields.`,
      variant: "default"
    });
  } catch (error) {
    console.error("JSON Export error:", error);
    toast({
      title: "JSON Export Failed",
      description: "An error occurred during JSON export. Please try again.",
      variant: "destructive"
    });
  }
};