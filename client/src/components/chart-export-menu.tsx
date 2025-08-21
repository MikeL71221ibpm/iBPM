import { FileDown, FileSpreadsheet, FileJson, FileText, Printer, Maximize } from "lucide-react";
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

interface ChartExportMenuProps {
  chartTitle: string;
  data: any[];
  downloadChartAsCSV: (chartTitle: string, data: any[]) => void;
  downloadChartAsExcel: (chartTitle: string, data: any[]) => void;
  downloadChartAsJson: (chartTitle: string, data: any[]) => void;
  downloadChartAsPDF: (chartTitle: string, data: any[]) => void;
  printChart: (chartTitle: string, data: any[]) => void;
  onShowChart?: () => void; // Optional callback for showing chart
}

export default function ChartExportMenu({
  chartTitle,
  data,
  downloadChartAsCSV,
  downloadChartAsExcel,
  downloadChartAsJson,
  downloadChartAsPDF,
  printChart,
  onShowChart
}: ChartExportMenuProps) {
  // Enhancement to fix the hover issue and provide a cleaner user experience
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="hover:bg-accent">
          <Printer className="w-4 h-4 mr-2" />
          Print Chart
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" sideOffset={5} style={{ zIndex: 1000 }} forceMount>
        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Print option */}
        <DropdownMenuItem onClick={() => printChart(chartTitle, data)} className="cursor-pointer">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Export Data</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Export as PDF option */}
        <DropdownMenuItem onClick={() => downloadChartAsPDF(chartTitle, data)} className="cursor-pointer">
          <FileText className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
        
        {/* Export as Excel option */}
        <DropdownMenuItem 
          onClick={() => downloadChartAsExcel(chartTitle, data)} 
          className="cursor-pointer flex items-center"
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export as Excel (All Data)
        </DropdownMenuItem>
        
        {/* Export as CSV Summary option */}
        <DropdownMenuItem 
          onClick={() => downloadChartAsCSV(chartTitle, data)} 
          className="cursor-pointer flex items-center"
        >
          <FileDown className="w-4 h-4 mr-2" />
          Export as CSV (Summary)
        </DropdownMenuItem>
        
        {/* Export as JSON option */}
        <DropdownMenuItem 
          onClick={() => downloadChartAsJson(chartTitle, data)} 
          className="cursor-pointer flex items-center"
        >
          <FileJson className="w-4 h-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}