import React from 'react';
import { Button } from "@/components/ui/button";
import { Info, FileDown, Table, FileSpreadsheet, FileJson, Printer } from "lucide-react";

interface ChartExportSectionProps {
  chartName: string;
  downloadChartAsCSV: (chartName: string, data: any[], includePatientDetails?: boolean) => void;
  downloadChartAsExcel: (chartName: string, data: any[]) => void;
  downloadChartAsJson: (chartName: string, data: any[]) => void;
  printChart: (chartName: string, isDialog?: boolean) => void;
  getFullDataset: (chartType: string, includePercentages?: boolean, includePatientDetails?: boolean) => any[];
  shortLabel?: boolean;
}

export function ChartExportSection({
  chartName,
  downloadChartAsCSV,
  downloadChartAsExcel,
  downloadChartAsJson,
  printChart,
  getFullDataset,
  shortLabel = false
}: ChartExportSectionProps) {
  // Format descriptor based on chart name
  const getDescriptor = () => {
    if (chartName === 'HRSN Indicators') return 'indicators';
    if (chartName === 'Risk Stratification') return 'risk levels';
    if (chartName === 'Symptom Segment') return 'symptom segments';
    if (chartName === 'Diagnosis') return 'diagnoses';
    if (chartName === 'Symptom ID') return 'symptom IDs';
    if (chartName === 'Diagnostic Category') return 'diagnostic categories';
    return 'items';
  };

  return (
    <div className="flex flex-col mt-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted-foreground flex items-center">
          <Info className="w-4 h-4 mr-2" />
          Download {chartName.toLowerCase()} data in various formats
        </div>
        <div className="text-xs text-muted-foreground">
          Includes all {getDescriptor()}
        </div>
      </div>
      
      {/* Export Buttons in a single row */}
      <div className="flex justify-end gap-2">
        <Button 
          onClick={() => downloadChartAsCSV(chartName, getFullDataset(chartName, true))}
          variant="outline"
          size="sm"
        >
          <FileDown className="w-4 h-4 mr-1" />
          CSV
        </Button>
        <Button 
          onClick={() => downloadChartAsCSV(`${chartName} Patient Detail`, getFullDataset(chartName, true, true))}
          variant="outline"
          size="sm"
        >
          <Table className="w-4 h-4 mr-1" />
          {shortLabel ? 'Detail CSV' : 'Patient Detail'}
        </Button>
        <Button 
          onClick={() => downloadChartAsExcel(chartName, getFullDataset(chartName, true))}
          variant="outline"
          size="sm"
        >
          <FileSpreadsheet className="w-4 h-4 mr-1" />
          Excel
        </Button>
        <Button 
          onClick={() => downloadChartAsJson(chartName, getFullDataset(chartName, false))}
          variant="outline"
          size="sm"
        >
          <FileJson className="w-4 h-4 mr-1" />
          JSON
        </Button>
        <Button 
          onClick={() => downloadChartAsJson(`${chartName} Patient Detail`, getFullDataset(chartName, false, true))}
          variant="outline"
          size="sm"
        >
          <FileJson className="w-4 h-4 mr-1" />
          {shortLabel ? 'Detail JSON' : 'Patient Detail JSON'}
        </Button>
        <Button 
          onClick={() => printChart(chartName, true)}
          variant="outline"
          size="sm"
        >
          <Printer className="w-4 h-4 mr-1" />
          Print
        </Button>
      </div>
    </div>
  );
}