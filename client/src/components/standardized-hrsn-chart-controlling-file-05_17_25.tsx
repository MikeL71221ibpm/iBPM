import React, { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { X, Maximize2, Download, FileText, ArrowDownToLine, Check } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import HrsnPieChart from "./hrsn-pie-chart-v3-1-05_17_25";
import CategoricalHrsnChart from "./categorical-hrsn-chart-v3-1-05_17_25";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useChartTheme } from "@/context/ChartThemeContext";

// Type definition for chart types
type ChartType = "count" | "percentage" | "distribution";

// Component props interface with comprehensive documentation
interface StandardizedHrsnChartProps {
  /** Array of data to visualize */
  data: any[];
  
  /** Unique identifier for the chart */
  chartId: string;
  
  /** Title displayed above the chart */
  title: string;
  
  /** Field name in the data to categorize by (e.g., 'age_range', 'gender') */
  categoryName: string;
  
  /** Secondary field name for distribution charts (optional) */
  secondaryCategoryName?: string;
  
  /** Type of chart to display (count = bar chart, percentage = pie chart, distribution = heatmap) */
  chartType: ChartType;
  
  /** Color scheme name from ChartThemeContext (optional - will use global theme if not provided) */
  colorScheme?: string;
  
  /** Optional filter criteria to apply to the dataset */
  filterBy?: {
    symptom?: string;
    diagnosis?: string;
    diagnosticCategory?: string;
    icd10Code?: string;
  };
  
  /** Whether this chart is selected for multi-chart operations (print, export) */
  isSelected: boolean;
  
  /** Callback when the selection state is changed */
  onToggleSelection: (chartId: string) => void;
  
  /** Whether the component is being rendered for print mode */
  isPrintMode?: boolean;
  
  /** Callback when HRSN category and value are selected for filtering */
  onHrsnSelection?: (category: string, value: string) => void;
}

/**
 * StandardizedHrsnChart - A unified chart component that renders different visualization 
 * types based on the data and configuration provided
 * 
 * @param props StandardizedHrsnChartProps - Component configuration
 * @returns A standardized chart component with consistent styling and behavior
 */
export default function StandardizedHrsnChart({
  data = [],
  chartId,
  title,
  categoryName,
  secondaryCategoryName,
  chartType,
  colorScheme,
  filterBy,
  isSelected = false,  // Default if not provided
  onToggleSelection = () => {},
  isPrintMode = false,  // Default to false if not provided
  onHrsnSelection
}: StandardizedHrsnChartProps) {
  // Get theme settings from context
  const { currentTheme } = useChartTheme();
  
  // Map the global theme to the color scheme format required by legacy components
  const getCompatibleColorScheme = (themeName: string): string => {
    const mapping: Record<string, string> = {
      'vivid': 'rainbow',
      'pastel': 'pastel',
      'dark': 'dark',
      'muted': 'grayscale',
      'viridis': 'viridis',
      // Add a fallback to ensure we always have a valid mapping
      'default': 'rainbow'
    };
    return mapping[themeName] || 'rainbow';
  };
  
  // Override the passed colorScheme with the global theme
  const globalColorScheme = getCompatibleColorScheme(currentTheme);
  
  // Component state for dialog management
  const [enlargedChartOpen, setEnlargedChartOpen] = useState(false);
  
  // DEBUGGING: Log the incoming data with clear labels
  console.log(`[StandardizedHrsnChart] ${chartId} (${title}) received data:`, { 
    dataExists: !!data, 
    dataLength: data?.length || 0,
    chartType,
    categoryName,
    colorScheme: globalColorScheme,
    isSelected,
    isPrintMode
  });
  
  // Element refs for the chart container (used for export functionality)
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const enlargedChartRef = useRef<HTMLDivElement>(null);
  
  // Toast notifications for user feedback
  const { toast } = useToast();
  
  // Component state
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [height, setHeight] = useState(250); // Default height for charts
  
  // Determine if we have valid data to display
  const validData = Array.isArray(data) ? data : [];
  const showNoDataMessage = validData.length === 0;
  
  /**
   * Helper function to extract appropriate field from data item
   */
  const getFieldValue = (item: any, field: string) => {
    return item[field] || "Unknown";
  };
  
  /**
   * Handles exporting the enlarged chart to PDF
   * Uses html2canvas to capture the chart and jsPDF to create the document
   */
  const handleExportToPdf = async () => {
    const chartElement = enlargedChartOpen 
      ? enlargedChartRef.current 
      : chartContainerRef.current;
    
    if (!chartElement) {
      toast({
        title: "Export Failed",
        description: "Could not find chart element to export",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Show a loading toast
      toast({
        title: "Exporting to PDF",
        description: "Please wait while we prepare your PDF...",
      });
      
      // Use html2canvas to capture the chart
      const canvas = await html2canvas(chartElement, {
        scale: 2, // Higher scale for better quality
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      // Create PDF with appropriate dimensions
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm'
      });
      
      // Add a title to the PDF
      pdf.setFontSize(16);
      pdf.text(title, 14, 15);
      
      // Add the chart image
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, (pdfHeight - 30) / imgHeight);
      
      pdf.addImage(
        imgData, 
        'PNG', 
        10, 
        25, 
        imgWidth * ratio, 
        imgHeight * ratio
      );
      
      // Add footer with metadata
      pdf.setFontSize(8);
      const footerText = `Generated from HRSN Analytics Dashboard | ${new Date().toLocaleString()}`;
      pdf.text(footerText, 14, pdfHeight - 10);
      
      // Add filter information if present
      if (filterBy && Object.keys(filterBy).some(key => !!filterBy[key])) {
        let filterText = "Filters: ";
        if (filterBy.symptom) filterText += `Symptom: ${filterBy.symptom}; `;
        if (filterBy.diagnosis) filterText += `Diagnosis: ${filterBy.diagnosis}; `;
        if (filterBy.diagnosticCategory) filterText += `Category: ${filterBy.diagnosticCategory}; `;
        if (filterBy.icd10Code) filterText += `ICD-10: ${filterBy.icd10Code}; `;
        
        pdf.text(filterText, 14, pdfHeight - 15);
      }
      
      // Save the PDF
      pdf.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_chart.pdf`);
      
      toast({
        title: "Export Successful",
        description: "Chart has been exported to PDF",
        variant: "default"
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting to PDF",
        variant: "destructive"
      });
    }
  };
  
  /**
   * Exports chart data to Excel with patient details
   */
  const handleExportToExcel = () => {
    try {
      // Show loading toast
      toast({
        title: "Exporting to Excel",
        description: "Please wait while we prepare your Excel file...",
      });
      
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Create the summary worksheet (chart data)
      const summaryData = validData.map(item => {
        const baseObj = {
          Category: getFieldValue(item, categoryName) 
        };
        
        if (item.count !== undefined) baseObj['Count'] = item.count;
        if (item.value !== undefined) baseObj['Value'] = item.value;
        if (item.percentage !== undefined) baseObj['Percentage'] = `${item.percentage}%`;
        
        return baseObj;
      });
      
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, "Chart Summary");
      
      // Create the details worksheet (patient details)
      // Only include if we have patient ID data
      if (validData.some(item => item.patient_id || item.patientId)) {
        const detailsData = validData.map(item => {
          return {
            "Patient ID": item.patient_id || item.patientId || "Unknown",
            "Patient Name": item.patient_name || item.patientName || "Unknown",
            [categoryName]: getFieldValue(item, categoryName),
            "Value": item.value || item.count || 0
          };
        });
        
        const detailsWs = XLSX.utils.json_to_sheet(detailsData);
        XLSX.utils.book_append_sheet(wb, detailsWs, "Patient Details");
      }
      
      // Add metadata sheet
      const metadataWs = XLSX.utils.json_to_sheet([
        { Key: "Chart Title", Value: title },
        { Key: "Category", Value: categoryName },
        { Key: "Chart Type", Value: chartType },
        { Key: "Export Date", Value: new Date().toLocaleString() },
        { Key: "Record Count", Value: validData.length },
        { Key: "Filters Applied", Value: filterBy ? Object.keys(filterBy).filter(k => !!filterBy[k]).join(", ") : "None" }
      ]);
      XLSX.utils.book_append_sheet(wb, metadataWs, "Metadata");
      
      // Generate the Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Save the file
      saveAs(blob, `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_data.xlsx`);
      
      toast({
        title: "Export Successful",
        description: "Chart data has been exported to Excel",
        variant: "default"
      });
    } catch (error) {
      console.error("Excel export error:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting to Excel",
        variant: "destructive"
      });
    }
  };
  
  /**
   * Exports chart data to CSV with option for summary or detail view
   */
  const handleExportToCsv = () => {
    try {
      // Show loading toast
      toast({
        title: "Exporting to CSV",
        description: "Please wait while we prepare your CSV file...",
      });
      
      // Prepare CSV data - include additional fields for patient details if available
      const csvData = validData.map(item => {
        const row: Record<string, any> = {
          Category: getFieldValue(item, categoryName)
        };
        
        // Add patient details if available
        if (item.patient_id || item.patientId) {
          row["Patient ID"] = item.patient_id || item.patientId || "";
          row["Patient Name"] = item.patient_name || item.patientName || "";
        }
        
        // Add measure values with proper formatting
        if (item.count !== undefined) row["Count"] = item.count;
        if (item.value !== undefined) row["Value"] = item.value;
        if (item.percentage !== undefined) row["Percentage"] = `${item.percentage}%`;
        
        // Add any HRSN indicators if present
        if (item.housing_instability !== undefined) row["Housing Instability"] = item.housing_instability;
        if (item.food_insecurity !== undefined) row["Food Insecurity"] = item.food_insecurity;
        if (item.transportation_barriers !== undefined) row["Transportation Barriers"] = item.transportation_barriers;
        
        return row;
      });
      
      // Convert to CSV string
      const replacer = (key: string, value: any) => value === null ? '' : value;
      const header = Object.keys(csvData[0] || {});
      const csv = [
        header.join(','),
        ...csvData.map(row => header.map(fieldName => 
          JSON.stringify(row[fieldName], replacer)).join(','))
      ].join('\r\n');
      
      // Create and save the file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_data.csv`);
      
      toast({
        title: "Export Successful",
        description: "Chart data has been exported to CSV",
        variant: "default"
      });
    } catch (error) {
      console.error("CSV export error:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting to CSV",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Card 
      id={chartId} 
      className="relative shadow-md h-full p-0 border-2 border-gray-300 rounded-md hover:border-blue-300 transition-colors"
      data-testid={`chart-${chartId}`}
    >
      {/* Chart controls - maximize and selection checkbox */}
      <div className="absolute top-1 right-1 z-10 flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 hover:bg-gray-100" 
          onClick={() => setEnlargedChartOpen(true)}
          aria-label={`Maximize ${title} chart`}
        >
          <Maximize2 className="h-3 w-3" />
        </Button>
        
        <DropdownMenu open={exportMenuOpen} onOpenChange={setExportMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 hover:bg-gray-100" 
              aria-label={`Export ${title} chart`}
            >
              <Download className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportToPdf}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Export to PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportToExcel}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Export to Excel</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportToCsv}>
              <ArrowDownToLine className="mr-2 h-4 w-4" />
              <span>Export to CSV</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={() => onToggleSelection(chartId)} 
          className="h-3 w-3"
          aria-label={`Select ${title} chart for printing`}
        />
      </div>
      
      {/* Data source information (only visible when printing) */}
      {isPrintMode && (
        <div className="absolute top-1 left-1 z-10 text-[8px] text-gray-500 print-only">
          <span>Source: HRSN data.json (05/17/25)</span>
        </div>
      )}
      
      {/* Chart content area */}
      <div className="p-2 pt-3"> {/* Increased padding for better visibility */}
        {/* "No Data Available" message when filters are active but no matching data exists */}
        {showNoDataMessage ? (
          <div className="flex items-center justify-center h-[75px] text-gray-500 text-sm">
            No Data Available
          </div>
        ) : chartType === "count" && (
          <CategoricalHrsnChart
            patientData={validData}
            categoryName={categoryName}
            filterBy={filterBy}
            colorScheme={globalColorScheme}
          />
        )}
        
        {/* Only show "percentage" chart if we're not showing the "No Data Available" message */}
        {!showNoDataMessage && chartType === "percentage" && (
          <HrsnPieChart
            data={validData}
            title={title}
            fieldName={categoryName}
            colorScheme={globalColorScheme}
            height={height}
          />
        )}
        
        {/* Distribution visualization using the working CategoricalHrsnChart approach */}
        {!showNoDataMessage && chartType === "distribution" && (
          <CategoricalHrsnChart
            patientData={validData}
            categoryName={categoryName}
            filterBy={filterBy}
            colorScheme={globalColorScheme}
          />
        )}
      </div>
      
      {/* Chart title with filter indication */}
      <div className="px-3 pt-0 pb-0 text-center border-t border-gray-200">
        <div className="font-medium text-sm truncate" title={title}>
          {title}
          {/* Show indicator when filters are applied */}
          {filterBy && Object.values(filterBy).some(v => v) && (
            <span className="ml-1 inline-flex items-center justify-center w-3 h-3 bg-blue-500 rounded-full">
              <Check className="text-white w-2 h-2" />
            </span>
          )}
        </div>
      </div>
      
      {/* Enlarged chart dialog */}
      <Dialog open={enlargedChartOpen} onOpenChange={setEnlargedChartOpen}>
        <DialogContent className="max-w-4xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setEnlargedChartOpen(false)}
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Enlarged chart content */}
          <div ref={enlargedChartRef} className="bg-white p-4 rounded-md">
            {showNoDataMessage ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No Data Available
              </div>
            ) : chartType === "count" && (
              <CategoricalHrsnChart
                patientData={validData}
                categoryName={categoryName}
                filterBy={filterBy}
                colorScheme={globalColorScheme}
              />
            )}
            
            {!showNoDataMessage && chartType === "percentage" && (
              <HrsnPieChart
                data={validData}
                title={title}
                fieldName={categoryName}
                colorScheme={globalColorScheme}
                height={300}
              />
            )}
            
            {!showNoDataMessage && chartType === "distribution" && (
              <CategoricalHrsnChart
                patientData={validData}
                categoryName={categoryName}
                filterBy={filterBy}
                colorScheme={globalColorScheme}
              />
            )}
          </div>
          
          {/* Export buttons for enlarged view */}
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportToPdf}
            >
              <FileText className="mr-2 h-4 w-4" />
              Export to PDF
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportToExcel}
            >
              <FileText className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExportToCsv}
            >
              <ArrowDownToLine className="mr-2 h-4 w-4" />
              Export to CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}