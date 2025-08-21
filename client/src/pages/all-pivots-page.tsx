import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowUpRight, FileText, Calendar, Stethoscope, ClipboardList } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import DatabaseStatsWidget from '@/components/DatabaseStatsWidget';

// Define the auto pivot page parameter types
interface AutoPivotPageParams {
  patientId?: string;
}

// Define pivot data structure
interface PivotData {
  columns: string[];
  rows: string[];
  data: Record<string, Record<string, number>>;
}

// Patient statistics interface
interface PatientStats {
  patientId: number;
  noteCount: number;
  uniqueDatesCount: number;
  symptomCount: number;
  diagnosisCount: number;
  firstNoteDate: string;
  lastNoteDate: string;
  timeframeDisplay: string;
}

// Data types for visualization
const DATA_TYPES = [
  { id: "symptom", label: "Symptoms" },
  { id: "diagnosis", label: "Diagnoses" },
  { id: "category", label: "Diagnostic Categories" },
  { id: "hrsn", label: "HRSN Indicators" }
];

// Simple component to display a data table from pivot data with direct DOM manipulation
const HardCodedPivot = ({ data, dataType, compact = true, fitToPage = false, patientId }: { 
  data: PivotData | undefined, 
  dataType: string, 
  compact?: boolean,
  fitToPage?: boolean,
  patientId: string
}) => {
  const tableRef = useRef<HTMLDivElement>(null);

  // This effect will run after the component mounts and directly manipulate the DOM
  useEffect(() => {
    if (!tableRef.current || !data || !data.rows || !data.columns || data.rows.length === 0 || data.columns.length === 0) {
      return;
    }

    // Clean up function for when component unmounts
    const cleanup = () => {
      if (tableRef.current) {
        tableRef.current.innerHTML = '';
      }
    };

    // Clear previous content
    tableRef.current.innerHTML = '';

    // For all views, show ALL rows by setting a large row limit
    // This will allow scrolling through all available items
    const rowLimit = 1000; // Show all available rows for all data types

    // Filter to top rows with highest sums for better display
    const rowsWithSums = data.rows.map(row => {
      const sum = data.columns.reduce((acc, col) => acc + (data.data[row]?.[col] || 0), 0);
      return { row, sum };
    });
    
    // Sort by sum (descending) and take top N rows based on compact mode
    const topRows = rowsWithSums
      .sort((a, b) => b.sum - a.sum)
      .slice(0, rowLimit);

    // Calculate max value for dynamic color scaling
    const maxValue = topRows.reduce((max, { row }) => {
      const rowMax = data.columns.reduce((rowMax, col) => {
        const value = data.data[row]?.[col] || 0;
        return value > rowMax ? value : rowMax;
      }, 0);
      return rowMax > max ? rowMax : max;
    }, 0);
    
    // Dynamic thresholds based on the maximum value
    const thresholdLevel1 = Math.max(1, Math.round(maxValue * 0.05));
    const thresholdLevel2 = Math.max(2, Math.round(maxValue * 0.15));
    const thresholdLevel3 = Math.max(5, Math.round(maxValue * 0.30));
    const thresholdLevel4 = Math.max(10, Math.round(maxValue * 0.50));
    const thresholdLevel5 = Math.max(20, Math.round(maxValue * 0.75));

    // Create the styles
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .hard-coded-table {
        width: 100%;
        border-collapse: collapse;
        position: relative;
      }
      
      .hard-coded-table-container {
        max-height: ${compact ? '300px' : '650px'};
        min-height: ${compact ? '250px' : '600px'};
        overflow-y: auto;
        overflow-x: auto;
        position: relative;
      }
      
      .table-wrapper {
        position: relative;
        overflow: auto;
      }
      
      .sticky-col {
        position: sticky;
        left: 0;
        z-index: 10;
        background-color: #f9fafb;
        border-right: 1px solid #e5e7eb;
        width: ${compact ? '140px' : '180px'};
        padding: ${compact ? '2px 4px' : '4px 6px'};
        font-weight: 500;
        font-size: ${compact ? '9px' : '10px'};
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .data-cell {
        border: 1px solid #e5e7eb;
        padding: 1px 2px;
        text-align: center;
        width: ${fitToPage ? '40px' : (compact ? '24px' : '32px')};
        min-width: ${fitToPage ? '40px' : (compact ? '24px' : '32px')};
        height: 12px;
        font-size: 8px;
        /* Uniform small cell sizing across all chart types */
      }
      
      /* Date footer styling inspired by HRSN table */
      .date-footer {
        position: sticky !important;
        bottom: 0 !important;
        z-index: 100 !important;
        background-color: white !important;
        border-top: 1px solid #e5e7eb !important;
        box-shadow: 0 -2px 4px rgba(0,0,0,0.1) !important;
      }
      
      .date-cell {
        position: relative !important;
        width: ${fitToPage ? '40px' : (compact ? '24px' : '32px')} !important;
        min-width: ${fitToPage ? '40px' : (compact ? '24px' : '32px')} !important;
        padding: 0 !important;
        border-right: 1px solid #e5e7eb !important;
        background-color: white !important;
        height: 12px !important;
      }
      
      .date-label {
        position: absolute !important;
        transform: rotate(45deg) !important;
        transform-origin: bottom left !important;
        left: 4px !important;
        bottom: 2px !important;
        font-size: ${compact ? '7px' : '9px'} !important;
        white-space: nowrap !important;
        font-weight: 500 !important;
        color: #4b5563 !important;
      }
      
      /* Iridis color scheme for heat levels - purple to green to yellow to red */
      .level-0 { background-color: white; }
      .level-1 { background-color: #EDF8FB; } /* Light blue/purple */
      .level-2 { background-color: #B3CDE3; } /* Blue/purple */
      .level-3 { background-color: #8C96C6; } /* Purple */
      .level-4 { background-color: #8856A7; } /* Dark purple */
      .level-5 { background-color: #994C99; } /* Deep purple */
    `;
    tableRef.current.appendChild(styleEl);

    // Create container
    const container = document.createElement('div');
    container.className = 'hard-coded-table-container';
    
    // Set overflow for scrolling
    container.style.overflowY = 'auto';
    container.style.overflowX = 'auto';
    
    // In fit-to-page mode, remove all height constraints and force full expansion
    if (fitToPage) {
      container.style.height = 'auto';
      container.style.maxHeight = 'none';
      container.style.minHeight = 'fit-content';
      // Force the container to show all content
      container.style.setProperty('height', 'auto', 'important');
      container.style.setProperty('max-height', 'none', 'important');
      container.style.setProperty('min-height', 'fit-content', 'important');
    }
    container.style.width = '100%';
    container.style.minWidth = 'fit-content';
    
    // Add a scrollbar indicator text at the bottom
    const scrollIndicator = document.createElement('div');
    scrollIndicator.textContent = '⬇️ Scroll to see more items ⬇️';
    scrollIndicator.style.textAlign = 'center';
    scrollIndicator.style.marginTop = '4px';
    scrollIndicator.style.fontSize = '10px';
    scrollIndicator.style.color = '#6b7280';
    
    tableRef.current.appendChild(container);
    
    // Only add the scroll indicator for tables with lots of data (not HRSN)
    if (dataType !== 'hrsn' && compact) {
      tableRef.current.appendChild(scrollIndicator);
    }
    
    // Create toolbar container (for legend and action buttons)
    const toolbarContainer = document.createElement('div');
    toolbarContainer.style.display = 'flex';
    toolbarContainer.style.justifyContent = 'space-between';
    toolbarContainer.style.alignItems = 'flex-start';
    toolbarContainer.style.flexWrap = 'wrap';
    toolbarContainer.style.gap = '10px';
    toolbarContainer.style.marginBottom = '8px';
    toolbarContainer.style.padding = compact ? '4px' : '8px';
    toolbarContainer.style.backgroundColor = '#f9fafb';
    toolbarContainer.style.borderRadius = '4px';
    toolbarContainer.style.width = '100%';
    container.appendChild(toolbarContainer);
    
    // Left side - removed legend per user request
    
    // Add title and download buttons to right side
    const rightSideContainer = document.createElement('div');
    rightSideContainer.style.display = 'flex';
    rightSideContainer.style.flexDirection = 'column';
    rightSideContainer.style.alignItems = 'flex-end';
    rightSideContainer.style.gap = '4px';
    
    // Add title above buttons (only in fit-to-page mode)
    if (fitToPage) {
      const titleElement = document.createElement('div');
      titleElement.style.fontSize = '12px';
      titleElement.style.fontWeight = '600';
      titleElement.style.color = '#374151';
      titleElement.style.marginBottom = '2px';
      const dataTypeName = DATA_TYPES.find(t => t.id === dataType)?.label || 'Data';
      titleElement.textContent = `${dataTypeName} - ${getPatientName(parseInt(patientId))} (ID: P${patientId.padStart(4, '0')})`;
      rightSideContainer.appendChild(titleElement);
    }
    
    const actionsContainer = document.createElement('div');
    actionsContainer.style.display = 'flex';
    actionsContainer.style.flexWrap = 'wrap';
    actionsContainer.style.gap = '6px';
    actionsContainer.style.alignItems = 'center';
    
    // Download buttons with their labels
    const downloadOptions = [
      { label: 'Excel', format: 'excel' },
      { label: 'PDF', format: 'pdf' },
      { label: 'PNG', format: 'png' }
    ];
    
    downloadOptions.forEach(option => {
      const buttonContainer = document.createElement('div');
      buttonContainer.style.display = 'inline-flex';
      buttonContainer.style.flexDirection = 'column';
      buttonContainer.style.alignItems = 'center';
      
      const downloadButton = document.createElement('button');
      downloadButton.textContent = option.label;
      downloadButton.style.padding = compact ? '4px 6px' : '6px 10px';
      downloadButton.style.backgroundColor = '#f0f9ff';
      downloadButton.style.border = '1px solid #bae6fd';
      downloadButton.style.borderRadius = '4px';
      downloadButton.style.fontSize = compact ? '9px' : '12px';
      downloadButton.style.fontWeight = '500';
      downloadButton.style.color = '#0369a1';
      downloadButton.style.cursor = 'pointer';
      
      // Add hover style
      downloadButton.addEventListener('mouseover', () => {
        downloadButton.style.backgroundColor = '#e0f2fe';
      });
      
      downloadButton.addEventListener('mouseout', () => {
        downloadButton.style.backgroundColor = '#f0f9ff';
      });
      
      // Add download functionality
      downloadButton.addEventListener('click', () => {
        const dataTypeName = DATA_TYPES.find(t => t.id === dataType)?.label || 'Data';
        const tableContainer = container.querySelector('table');
        
        if (!tableContainer) {
          alert("Could not find table to download");
          return;
        }
        
        switch (option.format) {
          case 'excel':
            // Download as Excel spreadsheet with explicit value types
            try {
              const wb = XLSX.utils.book_new();
              const safeSheetName = dataTypeName.replace(/[*?:/\\[\]]/g, '_').substring(0, 31); // Max 31 chars for sheet name
              
              // Create worksheet data with better types
              const worksheet_data = [];
              
              // Header row with date columns
              const headerRow = ['Items'];
              data.columns.forEach(col => {
                headerRow.push(col);
              });
              worksheet_data.push(headerRow);
              
              // Add data rows
              topRows.forEach(({row}, rowIndex) => {
                const totalCount = data.columns.reduce((sum, col) => sum + (data.data[row]?.[col] || 0), 0);
                const dataRow = [`${rowIndex + 1}. ${row} (${totalCount})`];
                
                // Add values for each column as real numbers for Excel
                data.columns.forEach(column => {
                  const value = data.data[row]?.[column] || 0;
                  dataRow.push(value); // Keep as number for better Excel functionality
                });
                
                worksheet_data.push(dataRow);
              });
              
              // Create worksheet using aoa with types
              const ws = XLSX.utils.aoa_to_sheet(worksheet_data);
              
              // Apply formatting to cells
              const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
              
              // Format all cells appropriately
              for (let r = range.s.r; r <= range.e.r; r++) {
                for (let c = range.s.c; c <= range.e.c; c++) {
                  const cell_ref = XLSX.utils.encode_cell({r, c});
                  if (!ws[cell_ref]) continue;
                  
                  if (r === 0 || c === 0) {
                    // Headers and row labels are text
                    ws[cell_ref].t = 's';
                  } else {
                    // Data cells are numbers
                    ws[cell_ref].t = 'n';
                    
                    // Add cell styles for the data cells (numeric)
                    if (!ws[cell_ref].s) ws[cell_ref].s = {};
                    ws[cell_ref].s.alignment = { horizontal: 'center' };
                    
                    // Add basic color formatting based on value
                    const value = worksheet_data[r][c];
                    if (value === 0) {
                      // No fill for zero values
                    } else if (value >= thresholdLevel5) {
                      ws[cell_ref].s.fill = { fgColor: { rgb: "994C99" } }; // Deep purple
                    } else if (value >= thresholdLevel4) {
                      ws[cell_ref].s.fill = { fgColor: { rgb: "8856A7" } }; // Dark purple
                    } else if (value >= thresholdLevel3) {
                      ws[cell_ref].s.fill = { fgColor: { rgb: "8C96C6" } }; // Purple
                    } else if (value >= thresholdLevel2) {
                      ws[cell_ref].s.fill = { fgColor: { rgb: "B3CDE3" } }; // Blue/purple
                    } else {
                      ws[cell_ref].s.fill = { fgColor: { rgb: "EDF8FB" } }; // Light blue/purple
                    }
                  }
                }
              }
              
              // Set column widths
              ws['!cols'] = [
                { wch: 50 }, // Wider for first column with items
                ...Array(data.columns.length).fill({ wch: 12 }) // Standard width for date columns
              ];
              
              // Add to workbook
              XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
              
              // Generate safe filename
              const date = new Date().toLocaleDateString().replace(/\//g, '-');
              const safeTypeName = dataTypeName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
              const fileName = `patient_${safeTypeName}_${date}.xlsx`;
              
              // Download the Excel file
              XLSX.writeFile(wb, fileName);
            } catch (error) {
              console.error("Excel download error:", error);
              alert("Error generating Excel file. Please try again.");
            }
            break;
            
          case 'pdf':
            // Download as PDF with the entire table
            try {
              const date = new Date().toLocaleDateString().replace(/\//g, '-');
              const safeTypeName = dataTypeName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
              const fileName = `patient_${safeTypeName}_${date}.pdf`;
              
              // Add a title to the table for the PDF export, similar to PNG
              const title = document.createElement('div');
              title.textContent = `Patient ${dataTypeName} Data - Generated on ${new Date().toLocaleDateString()}`;
              title.style.fontWeight = 'bold';
              title.style.fontSize = '14px';
              title.style.marginBottom = '10px';
              title.style.padding = '8px';
              title.style.backgroundColor = '#f0f9ff';
              title.style.borderRadius = '4px';
              title.style.border = '1px solid #bae6fd';
              title.style.textAlign = 'center';
              
              // Create full table element with all rows - not just the visible ones
              const fullTable = document.createElement('table');
              fullTable.className = 'hard-coded-table';
              fullTable.style.width = '100%';
              fullTable.style.borderCollapse = 'collapse';
              fullTable.style.border = '1px solid #e5e7eb';
              fullTable.style.backgroundColor = 'white';
              
              // Create header row
              const thead = document.createElement('thead');
              const headerRow = document.createElement('tr');
              
              // Add an empty cell for the first column
              const emptyHeaderCell = document.createElement('th');
              emptyHeaderCell.textContent = "Items / Dates";
              emptyHeaderCell.style.padding = '8px';
              emptyHeaderCell.style.border = '1px solid #e5e7eb';
              emptyHeaderCell.style.backgroundColor = '#f9fafb';
              emptyHeaderCell.style.fontWeight = 'bold';
              emptyHeaderCell.style.position = 'sticky';
              emptyHeaderCell.style.top = '0';
              emptyHeaderCell.style.left = '0';
              headerRow.appendChild(emptyHeaderCell);
              
              // Add date header cells
              data.columns.forEach(column => {
                const dateCell = document.createElement('th');
                dateCell.textContent = column;
                dateCell.style.padding = '8px';
                dateCell.style.border = '1px solid #e5e7eb';
                dateCell.style.backgroundColor = '#f9fafb';
                dateCell.style.fontWeight = 'bold';
                dateCell.style.fontSize = '10px';
                headerRow.appendChild(dateCell);
              });
              
              thead.appendChild(headerRow);
              fullTable.appendChild(thead);
              
              // Create body with ALL rows
              const tbody = document.createElement('tbody');
              
              // Add all data rows in the correct order
              for (let i = 0; i < topRows.length; i++) {
                const {row} = topRows[i];
                const tr = document.createElement('tr');
                
                // Add row header with total count
                const firstCell = document.createElement('td');
                const totalCount = data.columns.reduce((sum, col) => sum + (data.data[row]?.[col] || 0), 0);
                firstCell.textContent = `${i + 1}. ${row} (${totalCount})`;
                firstCell.style.padding = '8px';
                firstCell.style.border = '1px solid #e5e7eb';
                firstCell.style.backgroundColor = '#f9fafb';
                firstCell.style.fontWeight = '500';
                tr.appendChild(firstCell);
                
                // Add all data cells with appropriate background color
                data.columns.forEach(column => {
                  const value = data.data[row]?.[column] || 0;
                  const td = document.createElement('td');
                  td.style.padding = '8px';
                  td.style.border = '1px solid #e5e7eb';
                  td.style.textAlign = 'center';
                  
                  // Set background color based on value thresholds
                  if (value === 0) {
                    td.style.backgroundColor = 'white';
                  } else if (value >= thresholdLevel5) {
                    td.style.backgroundColor = '#994C99'; // Deep purple
                  } else if (value >= thresholdLevel4) {
                    td.style.backgroundColor = '#8856A7'; // Dark purple
                  } else if (value >= thresholdLevel3) {
                    td.style.backgroundColor = '#8C96C6'; // Purple
                  } else if (value >= thresholdLevel2) {
                    td.style.backgroundColor = '#B3CDE3'; // Blue/purple
                  } else {
                    td.style.backgroundColor = '#EDF8FB'; // Light blue/purple
                  }
                  
                  td.textContent = value > 0 ? value.toString() : '';
                  tr.appendChild(td);
                });
                
                tbody.appendChild(tr);
              }
              
              fullTable.appendChild(tbody);
              
              // Create a wrapper div to hold the title and table
              const wrapper = document.createElement('div');
              wrapper.style.backgroundColor = 'white';
              wrapper.style.padding = '20px';
              wrapper.style.border = '1px solid #e5e7eb';
              wrapper.style.borderRadius = '4px';
              wrapper.style.maxWidth = '100%';
              
              // Append title and table
              wrapper.appendChild(title);
              wrapper.appendChild(fullTable);
              
              // Append wrapper to document body temporarily (but hidden)
              wrapper.style.position = 'absolute';
              wrapper.style.left = '-9999px';
              document.body.appendChild(wrapper);
              
              html2canvas(wrapper, {
                scale: 2, // Increase resolution
                useCORS: true,
                allowTaint: true,
                backgroundColor: 'white',
                scrollX: 0,
                scrollY: 0,
                logging: false,
                removeContainer: true,
                imageTimeout: 0, // No timeout
                windowWidth: document.documentElement.offsetWidth,
                windowHeight: document.documentElement.offsetHeight,
              }).then(canvas => {
                const imgData = canvas.toDataURL('image/png', 1.0);
                
                // Always use landscape for more space
                const pdf = new jsPDF({
                  orientation: 'landscape',
                  unit: 'mm',
                });
                
                // Get page dimensions
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                
                // Calculate image dimensions to fit the page, ensuring whole table is visible
                const imgWidth = pageWidth - 20; // 10mm margins
                const imgHeight = canvas.height * imgWidth / canvas.width;
                
                // Force it to fit on one page by adjusting scale if needed
                const finalHeight = Math.min(imgHeight, pageHeight - 20);
                const scale = finalHeight / imgHeight;
                const finalWidth = imgWidth * scale;
                
                // Add image to PDF centered and scaled to fit
                pdf.addImage(
                  imgData, 
                  'PNG', 
                  (pageWidth - finalWidth) / 2, // Center horizontally
                  10, // Top margin
                  finalWidth, 
                  finalHeight
                );
                
                // Save the PDF
                pdf.save(fileName);
                
                // Clean up - remove wrapper from document
                document.body.removeChild(wrapper);
              });
            } catch (error) {
              console.error("PDF download error:", error);
              alert("Error generating PDF file. Please try again.");
            }
            break;
            
          case 'png':
            // Download as PNG with the complete table data
            try {
              const date = new Date().toLocaleDateString().replace(/\//g, '-');
              const safeTypeName = dataTypeName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
              const fileName = `patient_${safeTypeName}_${date}.png`;
              
              // Add a title to the table for the PNG export
              const title = document.createElement('div');
              title.textContent = `Patient ${dataTypeName} Data - Generated on ${new Date().toLocaleDateString()}`;
              title.style.fontWeight = 'bold';
              title.style.fontSize = '14px';
              title.style.marginBottom = '10px';
              title.style.padding = '8px';
              title.style.backgroundColor = '#f0f9ff';
              title.style.borderRadius = '4px';
              title.style.border = '1px solid #bae6fd';
              title.style.textAlign = 'center';
              
              // Create full table element with all rows - not just the visible ones
              const fullTable = document.createElement('table');
              fullTable.className = 'hard-coded-table';
              fullTable.style.width = '100%';
              fullTable.style.borderCollapse = 'collapse';
              fullTable.style.border = '1px solid #e5e7eb';
              fullTable.style.backgroundColor = 'white';
              
              // Create header row
              const thead = document.createElement('thead');
              const headerRow = document.createElement('tr');
              
              // Add an empty cell for the first column
              const emptyHeaderCell = document.createElement('th');
              emptyHeaderCell.textContent = "Items / Dates";
              emptyHeaderCell.style.padding = '8px';
              emptyHeaderCell.style.border = '1px solid #e5e7eb';
              emptyHeaderCell.style.backgroundColor = '#f9fafb';
              emptyHeaderCell.style.fontWeight = 'bold';
              emptyHeaderCell.style.position = 'sticky';
              emptyHeaderCell.style.top = '0';
              emptyHeaderCell.style.left = '0';
              headerRow.appendChild(emptyHeaderCell);
              
              // Add date header cells
              data.columns.forEach(column => {
                const dateCell = document.createElement('th');
                dateCell.textContent = column;
                dateCell.style.padding = '8px';
                dateCell.style.border = '1px solid #e5e7eb';
                dateCell.style.backgroundColor = '#f9fafb';
                dateCell.style.fontWeight = 'bold';
                dateCell.style.fontSize = '10px';
                headerRow.appendChild(dateCell);
              });
              
              thead.appendChild(headerRow);
              fullTable.appendChild(thead);
              
              // Create body with ALL rows
              const tbody = document.createElement('tbody');
              
              // Add all data rows in the correct order
              for (let i = 0; i < topRows.length; i++) {
                const {row} = topRows[i];
                const tr = document.createElement('tr');
                
                // Add row header with total count
                const firstCell = document.createElement('td');
                const totalCount = data.columns.reduce((sum, col) => sum + (data.data[row]?.[col] || 0), 0);
                firstCell.textContent = `${i + 1}. ${row} (${totalCount})`;
                firstCell.style.padding = '8px';
                firstCell.style.border = '1px solid #e5e7eb';
                firstCell.style.backgroundColor = '#f9fafb';
                firstCell.style.fontWeight = '500';
                tr.appendChild(firstCell);
                
                // Add all data cells with appropriate background color
                data.columns.forEach(column => {
                  const value = data.data[row]?.[column] || 0;
                  const td = document.createElement('td');
                  td.style.padding = '8px';
                  td.style.border = '1px solid #e5e7eb';
                  td.style.textAlign = 'center';
                  
                  // Set background color based on value thresholds
                  if (value === 0) {
                    td.style.backgroundColor = 'white';
                  } else if (value >= thresholdLevel5) {
                    td.style.backgroundColor = '#994C99'; // Deep purple
                  } else if (value >= thresholdLevel4) {
                    td.style.backgroundColor = '#8856A7'; // Dark purple
                  } else if (value >= thresholdLevel3) {
                    td.style.backgroundColor = '#8C96C6'; // Purple
                  } else if (value >= thresholdLevel2) {
                    td.style.backgroundColor = '#B3CDE3'; // Blue/purple
                  } else {
                    td.style.backgroundColor = '#EDF8FB'; // Light blue/purple
                  }
                  
                  td.textContent = value > 0 ? value.toString() : '';
                  tr.appendChild(td);
                });
                
                tbody.appendChild(tr);
              }
              
              fullTable.appendChild(tbody);
              
              // Create a wrapper div to hold the title and table
              const wrapper = document.createElement('div');
              wrapper.style.backgroundColor = 'white';
              wrapper.style.padding = '20px';
              wrapper.style.border = '1px solid #e5e7eb';
              wrapper.style.borderRadius = '4px';
              wrapper.style.maxWidth = '100%';
              
              // Append title and table
              wrapper.appendChild(title);
              wrapper.appendChild(fullTable);
              
              // Append wrapper to document body temporarily (but hidden)
              wrapper.style.position = 'absolute';
              wrapper.style.left = '-9999px';
              document.body.appendChild(wrapper);
              
              // Use html2canvas with high quality settings
              html2canvas(wrapper, {
                scale: 3, // Higher resolution for image export
                useCORS: true,
                allowTaint: true,
                backgroundColor: 'white',
                scrollX: 0,
                scrollY: 0,
                logging: false,
                removeContainer: true,
                imageTimeout: 0, // No timeout
                windowWidth: document.documentElement.offsetWidth,
                windowHeight: document.documentElement.offsetHeight,
              }).then(canvas => {
                // Get high quality PNG
                const imgData = canvas.toDataURL('image/png', 1.0);
                
                // Create temporary link for download
                const link = document.createElement('a');
                link.download = fileName;
                link.href = imgData;
                link.click();
                
                // Clean up - remove wrapper from document
                document.body.removeChild(wrapper);
              });
            } catch (error) {
              console.error("PNG download error:", error);
              alert("Error generating PNG file. Please try again.");
            }
            break;
            
          default:
            alert(`The ${option.format} download option is not yet implemented.`);
        }
      });
      
      buttonContainer.appendChild(downloadButton);
      actionsContainer.appendChild(buttonContainer);
    });
    
    // Add actions to toolbar
    rightSideContainer.appendChild(actionsContainer);
    toolbarContainer.appendChild(rightSideContainer);

    // Create table
    const table = document.createElement('table');
    table.className = 'hard-coded-table';
    table.style.width = 'max-content'; // Let table expand to fit all columns
    table.style.minWidth = '100%';
    
    // In fit-to-page mode, ensure table can expand to full height
    if (fitToPage) {
      table.style.height = 'auto';
      table.style.tableLayout = 'auto';
    }
    
    container.appendChild(table);

    // Apply fit-to-page CSS class if enabled
    if (fitToPage) {
      container.classList.add('fit-to-page');
    } else {
      container.classList.remove('fit-to-page');
    }

    // Create table body
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    // Add rows
    topRows.forEach(({row, sum}, rowIndex) => {
      const tr = document.createElement('tr');
      
      // Add row header (first column) with total count
      const firstCell = document.createElement('td');
      firstCell.className = 'sticky-col';
      // Calculate the total count across all dates for this row
      const totalCount = data.columns.reduce((sum, col) => sum + (data.data[row]?.[col] || 0), 0);
      // Add the total count in parentheses after the row name
      firstCell.textContent = `${rowIndex + 1}. ${row} (${totalCount})`;
      tr.appendChild(firstCell);
      
      // Add data cells with simplified styling to match the previous design
      data.columns.forEach(column => {
        const valueStr = data.data[row]?.[column] || '0';
        const value = parseInt(valueStr); // Convert to number
        const td = document.createElement('td');
        
        // Simple plain styling - no color coding
        td.className = 'data-cell';
        
        td.textContent = value > 0 ? value.toString() : '';
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
    
    // We'll use the tbody approach for dates as it worked better in the past version
    // Add date row directly to the table to ensure alignment with data cells
    const dateRow = document.createElement('tr');
    dateRow.className = 'date-row';
    dateRow.style.position = 'sticky';
    dateRow.style.bottom = '0';
    dateRow.style.zIndex = '100';
    dateRow.style.backgroundColor = 'white';
    dateRow.style.boxShadow = '0 -2px 4px rgba(0,0,0,0.1)'; // Shadow at the top
    
    // Add an empty cell for the first column (label column)
    const emptyCell = document.createElement('td');
    emptyCell.className = 'sticky-col';
    emptyCell.style.height = '12px'; // Small uniform height
    emptyCell.style.backgroundColor = 'white'; // Ensure background color
    emptyCell.textContent = "Date →";
    emptyCell.style.fontWeight = 'bold';
    emptyCell.style.fontSize = '8px';
    emptyCell.style.color = '#374151';
    dateRow.appendChild(emptyCell);
    
    // Add date cells without borders for better visual appearance
    data.columns.forEach((column) => {
      const dateCell = document.createElement('td');
      dateCell.className = 'data-cell';
      dateCell.style.position = 'relative';
      dateCell.style.border = 'none'; // No borders for date cells for better appearance
      dateCell.style.height = '12px';
      dateCell.style.padding = '0';
      dateCell.style.backgroundColor = 'white';
      
      // Create the label inside each cell
      const dateLabel = document.createElement('div');
      dateLabel.textContent = column;
      dateLabel.style.position = 'absolute';
      dateLabel.style.bottom = '2px';
      dateLabel.style.left = '2px';
      dateLabel.style.transform = 'rotate(-45deg)';
      dateLabel.style.transformOrigin = 'left bottom';
      dateLabel.style.fontSize = '8px';
      dateLabel.style.fontWeight = 'normal';
      dateLabel.style.color = '#4b5563';
      dateLabel.style.whiteSpace = 'nowrap';
      dateLabel.style.background = 'none';
      dateLabel.style.border = 'none';
      
      // Add label to the cell
      dateCell.appendChild(dateLabel);
      dateRow.appendChild(dateCell);
    });
    
    // Add date row to the table body (not footer)
    tbody.appendChild(dateRow);
    
    // Return cleanup function to be called when component unmounts
    return cleanup;

  }, [data, dataType, compact, fitToPage]);

  if (!data || !data.rows || !data.columns || data.rows.length === 0 || data.columns.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data available to display</div>;
  }

  return <div ref={tableRef} className="hard-coded-pivot"></div>;
};

// Helper function to get a patient name based on ID
const getPatientName = (patientId: number): string => {
  // First check if we have a stored patient name in sessionStorage
  const storedPatientName = sessionStorage.getItem('selectedPatientName');
  
  if (storedPatientName) {
    console.log("Using patient name from sessionStorage:", storedPatientName);
    return storedPatientName;
  }
  
  // Fallback to the default naming pattern if not in sessionStorage
  return `Bob Test${patientId}`;
};

// Patient Statistics Component
const PatientStatsSection = ({ patientId }: { patientId: string }) => {
  const { data: stats, isLoading, error } = useQuery<PatientStats>({
    queryKey: [`/api/patient-stats/${patientId}`],
    enabled: !!patientId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="space-y-1 flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return null; // Fail silently, don't disrupt the main interface
  }

  const statItems = [
    {
      icon: FileText,
      label: "Notes Reviewed",
      value: stats.noteCount,
      subtext: `${stats.uniqueDatesCount} unique dates`,
    },
    {
      icon: Calendar,
      label: "Timeframe",
      value: stats.firstNoteDate && stats.lastNoteDate ? 
        `${new Date(stats.firstNoteDate).toLocaleDateString()} to ${new Date(stats.lastNoteDate).toLocaleDateString()}` :
        "No dates available",
      subtext: stats.firstNoteDate && stats.lastNoteDate ? 
        `${Math.ceil((new Date(stats.lastNoteDate).getTime() - new Date(stats.firstNoteDate).getTime()) / (1000 * 60 * 60 * 24))} days` :
        "",
    },
    {
      icon: Stethoscope,
      label: "Symptoms Extracted",
      value: stats.symptomCount,
      subtext: "unique problems",
    },
    {
      icon: ClipboardList,
      label: "Diagnoses Found",
      value: stats.diagnosisCount,
      subtext: "unique diagnoses",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statItems.map((item, index) => (
        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border">
          <item.icon className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-900 truncate">
              {item.label}
            </p>
            <p className="text-sm font-semibold text-gray-900 truncate">
              {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
            </p>
            {item.subtext && (
              <p className="text-xs text-gray-500 truncate">
                {item.subtext}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Individual pivot table section component
const PivotSection = ({ dataType, patientId }: { 
  dataType: string, 
  patientId: string
}) => {
  // Endpoint for the data type
  const apiPath = dataType === 'category' ? 'diagnostic-category' : dataType;
  const endpoint = `/api/pivot/${apiPath}/${patientId}`;
  
  // Get display name for the data type
  const displayName = DATA_TYPES.find(t => t.id === dataType)?.label || 'Data';
  
  // Fetch the pivot data
  const { data, isLoading, error } = useQuery<PivotData>({
    queryKey: [endpoint],
    enabled: true,
  });
  
  const [open, setOpen] = useState(false);
  const [fitToPage, setFitToPage] = useState(true); // Default to fit-to-page mode

  return (
    <div className="relative border rounded">
      <div className="flex justify-between items-center p-2 bg-slate-50 border-b">
        <div>
          <h3 className="text-base font-medium">{displayName}</h3>
          <p className="text-xs text-gray-500">
            {dataType === 'hrsn' 
              ? 'HRSN Indicators (scrollable)' 
              : dataType === 'category' 
                ? 'All 34 categories (scrollable)'
                : dataType === 'diagnosis'
                  ? 'All 79 diagnoses (scrollable)'
                  : 'All 99 symptoms (scrollable)'
            }
          </p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <ArrowUpRight className="h-4 w-4" />
              <span className="sr-only">Expand {displayName}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className={fitToPage ? "w-[98vw] h-auto max-w-[98vw] p-2 m-0 overflow-visible" : "fullpage-dialog"}>
            {fitToPage ? (
              <div className="absolute top-2 right-12 z-20">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setFitToPage(!fitToPage)}
                  className="text-xs px-2 py-1"
                >
                  Standard
                </Button>
              </div>
            ) : (
              <DialogHeader className="pb-4 bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div>
                    <DialogTitle className="text-2xl font-bold text-gray-900">
                      {displayName} - {getPatientName(parseInt(patientId))} (ID: P{patientId.padStart(4, '0')})
                    </DialogTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Full Page View - Standard View
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFitToPage(!fitToPage)}
                    className="ml-4 mr-8"
                  >
                    Fit to Screen
                  </Button>
                </div>
              </DialogHeader>
            )}
            {isLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-4 text-red-500">
                Error loading {displayName.toLowerCase()} data. Please try again.
              </div>
            ) : (
              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {!fitToPage && (
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                    <h3 className="text-xl font-bold text-gray-900">
                      Complete {displayName} Data
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Showing all {data?.rows?.length || 0} items sorted by total frequency across all dates. 
                      Items are ranked 1-N with #1 being the most frequent overall.
                    </p>
                  </div>
                )}
                
                <div className={fitToPage ? "pivot-content h-auto flex-1" : "pivot-content"}>
                  <HardCodedPivot 
                    data={data} 
                    dataType={dataType}
                    compact={false}
                    fitToPage={fitToPage}
                    patientId={patientId}
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-[150px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500 text-xs">
            Error loading data
          </div>
        ) : (
          <div className="mt-1" style={{ 
            // Consistent height for all chart types
            height: '300px',
            overflowY: 'scroll', // Force scrollbar to always appear
            overflowX: 'auto',
            border: '1px solid #e5e7eb',
            borderRadius: '4px'
          }}>
            <HardCodedPivot 
              data={data} 
              dataType={dataType}
              compact={true}
              patientId={patientId}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Main component - displays all four pivot tables in a grid layout
export default function DirectGridView() {
  const { patientId } = useParams<AutoPivotPageParams>();
  const [location, setLocation] = useLocation();
  
  // Default to the patient ID that was passed or use the one in sessionStorage if available
  const storedPatientId = sessionStorage.getItem('selectedPatientId');
  console.log("Retrieved from sessionStorage in grid view:", storedPatientId);
  
  // Make sure we're using the correct patient ID - PRIORITIZE sessionStorage over URL
  const patientToDisplay = storedPatientId || patientId || '1';
  console.log("Using patient ID for grid view:", patientToDisplay, typeof patientToDisplay);
  
  // Force refresh sessionStorage value if needed
  if (storedPatientId !== patientToDisplay) {
    console.log("Updating sessionStorage with current patient ID:", patientToDisplay);
    sessionStorage.setItem('selectedPatientId', patientToDisplay);
  }
  
  // Update the URL when the component loads to ensure it has patientId
  useEffect(() => {
    if (!patientId) {
      setLocation(`/direct-grid-view/${patientToDisplay}`);
    }
  }, [patientId, patientToDisplay, setLocation]);

  return (
    <div className="container mx-auto py-6">
      <DatabaseStatsWidget />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="text-lg font-medium">
              Patient Name: {getPatientName(parseInt(patientToDisplay))}
              <span className="ml-4 text-sm text-gray-600">ID#: P{patientToDisplay.padStart(4, '0')}</span>
            </div>
          </CardTitle>
          <CardDescription>
            Quick overview of all patient data. Click the expand icon on any section to see more details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Patient Statistics Section */}
          <PatientStatsSection patientId={patientToDisplay} />
          
          {/* Display all four pivot tables in a 2x2 grid - always visible */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DATA_TYPES.map((type) => (
              <PivotSection 
                key={type.id} 
                dataType={type.id} 
                patientId={patientToDisplay}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}