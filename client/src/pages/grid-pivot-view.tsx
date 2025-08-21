import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";

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

// Data types for visualization
const DATA_TYPES = [
  { id: "symptom", label: "Symptoms" },
  { id: "diagnosis", label: "Diagnoses" },
  { id: "category", label: "Diagnostic Categories" },
  { id: "hrsn", label: "HRSN Indicators" }
];

// Simple component to display a data table from pivot data with direct DOM manipulation
const HardCodedPivot = ({ data, dataType, compact = false }: { data: PivotData | undefined, dataType: string, compact?: boolean }) => {
  const tableRef = useRef<HTMLDivElement>(null);

  // This effect will run after the component mounts and directly manipulate the DOM
  useEffect(() => {
    if (!tableRef.current || !data || !data.rows || !data.columns || data.rows.length === 0 || data.columns.length === 0) {
      return;
    }

    // Store references to created date labels for cleanup
    const dateLabels: HTMLElement[] = [];
    
    // Clean up function for when component unmounts
    const cleanup = () => {
      // Remove any date labels we've added to the body
      dateLabels.forEach(label => {
        if (document.body.contains(label)) {
          document.body.removeChild(label);
        }
      });
    };

    // Clear previous content
    tableRef.current.innerHTML = '';

    // Set number of rows based on compact mode
    const rowLimit = compact ? 15 : 40;

    // Filter to top rows with highest sums for better display
    const rowsWithSums = data.rows.map(row => {
      const sum = data.columns.reduce((acc, col) => acc + (data.data[row]?.[col] || 0), 0);
      return { row, sum };
    });
    
    // Sort by sum (descending) and take top N rows based on compact mode
    const topRows = rowsWithSums
      .sort((a, b) => b.sum - a.sum)
      .slice(0, rowLimit);

    // Create the styles
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .hard-coded-table {
        width: 100%;
        border-collapse: collapse;
        position: relative;
      }
      
      .hard-coded-table-container {
        max-height: ${compact ? '350px' : '650px'};
        overflow: auto;
        position: relative;
      }
      
      .sticky-col {
        position: sticky;
        left: 0;
        z-index: 10;
        background-color: #f9fafb;
        border-right: 1px solid #e5e7eb;
        width: ${compact ? '150px' : '180px'};
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
        padding: ${compact ? '1px 2px' : '2px 4px'};
        text-align: center;
        width: ${compact ? '28px' : '32px'};
        height: ${compact ? '16px' : '20px'};
        font-size: ${compact ? '8px' : '10px'};
      }
      
      /* Date footer styling inspired by HRSN table */
      .date-footer {
        position: sticky;
        bottom: 0;
        z-index: 10;
        background-color: white;
        border-top: 1px solid #e5e7eb;
        height: ${compact ? '25px' : '30px'};
      }
      
      .date-cell {
        position: relative;
        width: ${compact ? '30px' : '40px'};
        padding: 0;
        border-right: 1px solid #e5e7eb;
        background-color: white;
      }
      
      .date-label {
        position: absolute;
        transform: rotate(45deg);
        transform-origin: bottom left;
        left: 4px;
        bottom: 2px;
        font-size: ${compact ? '7px' : '9px'};
        white-space: nowrap;
        font-weight: 500;
        color: #4b5563;
      }
      
      .level-0 { background-color: white; }
      .level-1 { background-color: #dbeafe; }
      .level-2 { background-color: #bfdbfe; }
      .level-3 { background-color: #99f6e4; }
      .level-4 { background-color: #86efac; }
      .level-5 { background-color: #fef08a; }
    `;
    tableRef.current.appendChild(styleEl);

    // Create container
    const container = document.createElement('div');
    container.className = 'hard-coded-table-container';
    tableRef.current.appendChild(container);
    
    // Create toolbar for controls and actions
    const toolbarContainer = document.createElement('div');
    toolbarContainer.style.display = 'flex';
    toolbarContainer.style.justifyContent = 'space-between';
    toolbarContainer.style.alignItems = 'center';
    toolbarContainer.style.flexWrap = 'wrap';
    toolbarContainer.style.gap = '10px';
    toolbarContainer.style.marginBottom = '8px';
    toolbarContainer.style.padding = compact ? '4px' : '8px';
    toolbarContainer.style.backgroundColor = '#f9fafb';
    toolbarContainer.style.borderRadius = '4px';
    
    // Only show toolbar in non-compact mode
    if (!compact) {
      container.appendChild(toolbarContainer);
      
      // Left side - legend
      const legendContainer = document.createElement('div');
      legendContainer.style.display = 'flex';
      legendContainer.style.flexWrap = 'wrap';
      legendContainer.style.gap = '8px';
      legendContainer.style.alignItems = 'center';
      
      // Legend title
      const legendTitle = document.createElement('div');
      legendTitle.textContent = 'Frequency Legend:';
      legendTitle.style.marginRight = '12px';
      legendTitle.style.fontWeight = '500';
      legendTitle.style.fontSize = '12px';
      legendContainer.appendChild(legendTitle);
      
      // Create legend items
      const legendItems = [
        { level: 'level-0', text: '0 mentions', color: 'white' },
        { level: 'level-1', text: '1 mention', color: '#dbeafe' },
        { level: 'level-2', text: '2-4 mentions', color: '#bfdbfe' },
        { level: 'level-3', text: '5-9 mentions', color: '#99f6e4' },
        { level: 'level-4', text: '10-19 mentions', color: '#86efac' },
        { level: 'level-5', text: '20+ mentions', color: '#fef08a' }
      ];
      
      legendItems.forEach(item => {
        const legendItem = document.createElement('div');
        legendItem.style.display = 'flex';
        legendItem.style.alignItems = 'center';
        legendItem.style.marginRight = '10px';
        
        const colorBox = document.createElement('span');
        colorBox.style.width = '14px';
        colorBox.style.height = '14px';
        colorBox.style.backgroundColor = item.color;
        colorBox.style.border = '1px solid #e5e7eb';
        colorBox.style.display = 'inline-block';
        colorBox.style.marginRight = '4px';
        
        const itemText = document.createElement('span');
        itemText.textContent = item.text;
        itemText.style.fontSize = '11px';
        
        legendItem.appendChild(colorBox);
        legendItem.appendChild(itemText);
        legendContainer.appendChild(legendItem);
      });
      
      // Add legend to toolbar
      toolbarContainer.appendChild(legendContainer);
      
      // Right side - controls
      const controlsContainer = document.createElement('div');
      controlsContainer.style.display = 'flex';
      controlsContainer.style.alignItems = 'center';
      controlsContainer.style.gap = '10px';
      
      // Size controls
      const sizeControlContainer = document.createElement('div');
      sizeControlContainer.style.display = 'flex';
      sizeControlContainer.style.alignItems = 'center';
      
      const sizeLabel = document.createElement('label');
      sizeLabel.textContent = 'Size:';
      sizeLabel.style.fontSize = '12px';
      sizeLabel.style.marginRight = '5px';
      sizeControlContainer.appendChild(sizeLabel);
      
      const sizeSelect = document.createElement('select');
      sizeSelect.style.fontSize = '12px';
      sizeSelect.style.padding = '2px 4px';
      sizeSelect.style.borderRadius = '4px';
      sizeSelect.style.border = '1px solid #d1d5db';
      
      ['Compact', 'Medium', 'Large'].forEach(size => {
        const option = document.createElement('option');
        option.value = size.toLowerCase();
        option.textContent = size;
        if (size === 'Medium') option.selected = true;
        sizeSelect.appendChild(option);
      });
      
      // Handle size changes
      sizeSelect.addEventListener('change', (e) => {
        const selectedSize = (e.target as HTMLSelectElement).value;
        
        // Apply style changes based on selected size
        const applyStyles = (
          fontSize: string, 
          maxHeight: string, 
          cellStyles: { padding: string; width: string; height: string; },
          headerStyles: { fontSize: string; padding: string; width: string; },
          dateLabelSize: string
        ) => {
          // Set main font size and container height
          table.style.fontSize = fontSize;
          container.style.maxHeight = maxHeight;
          
          // Apply to data cells
          const cells = table.querySelectorAll('.data-cell');
          cells.forEach((cell) => {
            const htmlCell = cell as HTMLElement;
            htmlCell.style.padding = cellStyles.padding;
            htmlCell.style.width = cellStyles.width;
            htmlCell.style.height = cellStyles.height;
          });
          
          // Apply to row headers
          const rowHeaders = table.querySelectorAll('.sticky-col');
          rowHeaders.forEach((header) => {
            const htmlHeader = header as HTMLElement;
            htmlHeader.style.fontSize = headerStyles.fontSize;
            htmlHeader.style.padding = headerStyles.padding;
            htmlHeader.style.width = headerStyles.width;
          });
          
          // Apply to date labels
          const dateLabels = table.querySelectorAll('.data-cell div');
          dateLabels.forEach((label) => {
            const htmlLabel = label as HTMLElement;
            htmlLabel.style.fontSize = dateLabelSize;
          });
        };
        
        // Apply different styles based on selection
        switch (selectedSize) {
          case 'compact':
            applyStyles(
              '8px',  // fontSize
              '450px', // maxHeight
              { padding: '1px 2px', width: '28px', height: '16px' }, // cellStyles
              { fontSize: '8px', padding: '2px 4px', width: '150px' }, // headerStyles
              '8px' // dateLabelSize
            );
            break;
            
          case 'medium':
            applyStyles(
              '10px', // fontSize
              '650px', // maxHeight
              { padding: '2px 4px', width: '32px', height: '20px' }, // cellStyles
              { fontSize: '10px', padding: '4px 6px', width: '180px' }, // headerStyles
              '10px' // dateLabelSize
            );
            break;
            
          case 'large':
            applyStyles(
              '12px', // fontSize
              '800px', // maxHeight
              { padding: '4px 6px', width: '38px', height: '26px' }, // cellStyles 
              { fontSize: '12px', padding: '6px 8px', width: '240px' }, // headerStyles
              '12px' // dateLabelSize
            );
            break;
        }
      });
      
      sizeControlContainer.appendChild(sizeSelect);
      controlsContainer.appendChild(sizeControlContainer);
      
      // Download options - temporarily removed
      const downloadLabel = document.createElement('label');
      downloadLabel.textContent = 'Download Options (Coming Soon)';
      downloadLabel.style.fontSize = '12px';
      downloadLabel.style.marginRight = '5px';
      downloadLabel.style.color = '#6b7280';
      controlsContainer.appendChild(downloadLabel);
      
      // Add controls to toolbar
      toolbarContainer.appendChild(controlsContainer);
    }

    // Create table
    const table = document.createElement('table');
    table.className = 'hard-coded-table';
    container.appendChild(table);

    // Create table body
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    // Add rows
    topRows.forEach(({row, sum}, rowIndex) => {
      const tr = document.createElement('tr');
      
      // Add row header (first column)
      const firstCell = document.createElement('td');
      firstCell.className = 'sticky-col';
      firstCell.textContent = `${rowIndex + 1}. ${row} (${sum})`;
      tr.appendChild(firstCell);
      
      // Add data cells
      data.columns.forEach(column => {
        const value = data.data[row]?.[column] || 0;
        const td = document.createElement('td');
        
        // Assign color class based on value
        if (value === 0) {
          td.className = 'data-cell level-0';
        } else if (value >= 20) {
          td.className = 'data-cell level-5';
        } else if (value >= 10) {
          td.className = 'data-cell level-4';
        } else if (value >= 5) {
          td.className = 'data-cell level-3';
        } else if (value >= 2) {
          td.className = 'data-cell level-2';
        } else {
          td.className = 'data-cell level-1';
        }
        
        td.textContent = value > 0 ? value.toString() : '';
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
    
    // Add date row directly to the table to ensure alignment
    // Create a row for dates at the bottom of the table that stays with it
    const dateRow = document.createElement('tr');
    
    // Add an empty cell for the first column (label column)
    const emptyCell = document.createElement('td');
    emptyCell.className = 'sticky-col';
    emptyCell.style.height = compact ? '30px' : '40px'; // Height for date labels
    dateRow.appendChild(emptyCell);
    
    // Add date cells
    data.columns.forEach((column) => {
      const dateCell = document.createElement('td');
      dateCell.className = 'data-cell';
      dateCell.style.position = 'relative';
      dateCell.style.border = 'none'; // No borders for date cells
      dateCell.style.height = compact ? '30px' : '40px';
      dateCell.style.padding = '0';
      
      // Create the label inside each cell
      const dateLabel = document.createElement('div');
      dateLabel.textContent = column;
      dateLabel.style.position = 'absolute';
      dateLabel.style.bottom = '5px';
      dateLabel.style.left = '5px';
      dateLabel.style.transform = 'rotate(-45deg)';
      dateLabel.style.transformOrigin = 'left bottom';
      dateLabel.style.fontSize = compact ? '8px' : '10px';
      dateLabel.style.fontWeight = 'normal';
      dateLabel.style.color = '#4b5563';
      dateLabel.style.whiteSpace = 'nowrap';
      dateLabel.style.background = 'none';
      dateLabel.style.border = 'none';
      dateLabel.style.boxShadow = 'none';
      
      // Add label to the cell
      dateCell.appendChild(dateLabel);
      dateRow.appendChild(dateCell);
      
      // Store reference for potential cleanup
      dateLabels.push(dateLabel);
    });
    
    // Add date row to the table
    tbody.appendChild(dateRow);
    
    // Return cleanup function to be called when component unmounts
    return cleanup;

  }, [data, dataType, compact]);

  if (!data || !data.rows || !data.columns || data.rows.length === 0 || data.columns.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data available to display</div>;
  }

  return <div ref={tableRef} className="hard-coded-pivot"></div>;
};

// Individual pivot table section component with collapsible functionality
const PivotSection = ({ dataType, patientId, initiallyExpanded = false }: { 
  dataType: string, 
  patientId: string,
  initiallyExpanded?: boolean
}) => {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [fullScreen, setFullScreen] = useState(false);
  
  // Endpoint for the data type
  const apiPath = dataType === 'category' ? 'diagnostic-category' : dataType;
  const endpoint = `/api/pivot/${apiPath}/${patientId}`;
  
  // Get display name for the data type
  const displayName = DATA_TYPES.find(t => t.id === dataType)?.label || 'Data';
  
  // Fetch the pivot data
  const { data, isLoading, error } = useQuery<PivotData>({
    queryKey: [endpoint],
    enabled: true, // Always fetch to avoid data flash when expanding
  });

  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpanded}
      className={`border rounded ${fullScreen ? 'fixed inset-4 z-50 bg-white overflow-auto' : ''}`}
    >
      <div className="flex justify-between items-center p-4 bg-slate-50 border-b">
        <div className="flex items-center">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="mr-2">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <h3 className="text-lg font-semibold">{displayName}</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {expanded && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFullScreen(!fullScreen)}
              title={fullScreen ? "Exit full screen" : "View full screen"}
            >
              {fullScreen ? 
                <Minimize2 className="h-4 w-4" /> : 
                <Maximize2 className="h-4 w-4" />
              }
            </Button>
          )}
        </div>
      </div>
      
      <CollapsibleContent className="p-0">
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-4 text-red-500">
              Error loading {displayName.toLowerCase()} data. Please try again.
            </div>
          ) : (
            <div className="mt-2">
              <HardCodedPivot 
                data={data} 
                dataType={dataType}
                compact={!expanded}
              />
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// Main component - now displays all four pivot tables in a grid layout
export default function GridPivotView() {
  const { patientId } = useParams<AutoPivotPageParams>();
  const [location, setLocation] = useLocation();
  const patientToDisplay = patientId || '1';
  
  // Update the URL when the component loads to ensure it has patientId
  useEffect(() => {
    if (!patientId) {
      setLocation(`/grid-pivot-view/${patientToDisplay}`);
    }
  }, [patientId, patientToDisplay, setLocation]);

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Patient {patientToDisplay} Data Overview</CardTitle>
          <CardDescription>
            Comprehensive data visualization dashboard for Patient {patientToDisplay}. Click on any section to expand for more details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mb-4">
            <div>
              <Select 
                value={patientToDisplay} 
                onValueChange={(value) => setLocation(`/grid-pivot-view/${value}`)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Patient" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 14 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      Patient {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setLocation(`/hard-coded-pivot/${patientToDisplay}`)}
              >
                View Full Tables
              </Button>
              <Button onClick={() => window.location.reload()}>
                Refresh Data
              </Button>
            </div>
          </div>
          
          {/* Display all four pivot tables in a 2x2 grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DATA_TYPES.map((type, index) => (
              <PivotSection 
                key={type.id} 
                dataType={type.id} 
                patientId={patientToDisplay}
                initiallyExpanded={false}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}