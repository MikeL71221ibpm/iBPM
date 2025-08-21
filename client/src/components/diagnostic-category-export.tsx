import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileDown, FileJson, FileSpreadsheet, FileText, Maximize, Printer, Table } from "lucide-react";
import { ResponsiveBar } from "@nivo/bar";

export default function DiagnosticCategoryChart({ 
  getDiagnosticCategoryData, 
  getFullDataset, 
  downloadChartAsCSV,
  downloadChartAsExcel,
  downloadChartAsJson,
  downloadChartAsPDF,
  printChart,
  getChartColors,
  displayMode,
  downloadChart
}) {
  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Maximize className="w-4 h-4 mr-2" />
            Enlarge
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Total Population by Diagnostic Category</DialogTitle>
          </DialogHeader>
          <div className="h-[calc(80vh-100px)]">
            <ResponsiveBar
              data={getDiagnosticCategoryData().map(item => {
                // Calculate percentage on the fly
                const total = getDiagnosticCategoryData().reduce((sum, i) => sum + (i.value || 0), 0);
                const percentage = total > 0 ? Math.round(((item.value || 0) / total) * 100) : 0;
                
                return {
                  ...item,
                  percentage: percentage,
                  value: displayMode === "percentage" ? percentage : item.value,
                  displayValue: displayMode === "percentage" ? `${percentage}%` : `${item.value}`
                };
              })}
              keys={['value']}
              indexBy="id"
              margin={{ top: 70, right: 50, bottom: 100, left: 100 }}
              padding={0.3}
              layout="vertical"
              colors={getChartColors()}
              colorBy="indexValue" // Use each category (bar) name for coloring
              axisBottom={{
                tickSize: 5,
                tickPadding: 10,
                tickRotation: -45,
                legendPosition: 'middle',
                legendOffset: 60,
                truncateTickAt: 0
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: displayMode === "percentage" ? 'Percentage' : 'Count',
                legendPosition: 'middle',
                legendOffset: -60
              }}
              enableGridY={true}
              labelSkipWidth={12}
              labelSkipHeight={12}
              enableLabel={true}
              label={d => {
                // Check for NaN or undefined values during animation
                if (!d || typeof d !== 'object' || d.value === undefined || isNaN(d.value)) {
                  return displayMode === "percentage" ? "0%" : "0";
                }
                return displayMode === "percentage" ? `${d.value}%` : `${d.value}`;
              }}
              labelTextColor={"#000000"}
              animate={true}
            />
          </div>
          
          {/* Data Table */}
          <div className="border rounded-md mt-2 p-2">
            <h4 className="font-semibold mb-2 flex items-center">
              <Table className="w-4 h-4 mr-2" />
              Full Data Table ({getFullDataset('Diagnostic Category').length} categories)
            </h4>
            <div className="max-h-[30vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Diagnostic Category</th>
                    <th className="p-2 text-left">Count</th>
                    <th className="p-2 text-left">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {getFullDataset('Diagnostic Category').map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="p-2">{item.id}</td>
                      <td className="p-2">{item.value}</td>
                      <td className="p-2">{item.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Export Buttons */}
          <div className="mt-4 flex justify-between">
            <div className="text-xs text-muted-foreground">
              Data includes all diagnostic categories, regardless of display settings
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => downloadChartAsCSV('Diagnostic_Category', getFullDataset('Diagnostic Category'))}
                variant="outline"
                size="sm"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Export as CSV
              </Button>
              <Button 
                onClick={() => downloadChartAsExcel('Diagnostic_Category', getFullDataset('Diagnostic Category'))}
                variant="outline"
                size="sm"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as Excel
              </Button>
              <Button 
                onClick={() => downloadChartAsJson('Diagnostic_Category', getFullDataset('Diagnostic Category'))}
                variant="outline"
                size="sm"
              >
                <FileJson className="w-4 h-4 mr-2" />
                Export as JSON
              </Button>
              <Button 
                onClick={() => downloadChartAsPDF('Diagnostic_Category', getFullDataset('Diagnostic Category'))}
                variant="outline"
                size="sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </Button>
              <Button 
                onClick={() => printChart('Diagnostic_Category', getFullDataset('Diagnostic Category'))}
                variant="outline"
                size="sm"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => downloadChart('Diagnostic_Category', getDiagnosticCategoryData())}
      >
        <FileDown className="w-4 h-4 mr-2" />
        Download Chart
      </Button>
    </>
  );
}