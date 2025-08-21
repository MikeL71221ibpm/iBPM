import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ChartExportWidget from '@/components/chart-export-widget';

interface HeatmapProps {
  title: string;
  data: any[];
  indexBy: string;
  chartId: string;
}

interface ProcessedData {
  id: string;
  data: { x: string; y: number }[];
}

const UnifiedHeatmapComponent = ({ title, data, indexBy, chartId }: HeatmapProps) => {
  if (!data || data.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64 bg-neutral-50 text-neutral-400 rounded-md">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group by date and indexBy
  const groupedData = data.reduce((acc, item) => {
    // Map field names to match database schema
    const fieldMap: { [key: string]: string } = {
      'symptomSegment': 'symptom_segment',
      'diagnosis': 'diagnosis',
      'diagnosticCategory': 'diagnostic_category',
      'hrsnIndicator': 'hrsn_indicator'
    };
    const fieldName = fieldMap[indexBy] || indexBy;
    const key = (item as any)[fieldName] as string;
    
    // Handle date field - check both possible field names
    const dateValue = (item as any).dos_date || (item as any).dosDate;
    const dateStr = new Date(dateValue).toLocaleDateString();
    
    if (!key || key === 'null' || key === 'undefined') return acc;
    
    if (!acc[key]) {
      acc[key] = {};
    }
    
    if (!acc[key][dateStr]) {
      acc[key][dateStr] = 0;
    }
    
    acc[key][dateStr]++;
    
    return acc;
  }, {} as Record<string, Record<string, number>>);
  
  // Get unique dates and sort chronologically
  const allDates = Array.from(new Set(data.map(item => {
    const dateValue = (item as any).dos_date || (item as any).dosDate;
    return new Date(dateValue).toLocaleDateString();
  }))).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
  // Calculate color based on exact value (distinct color for each count)
  const getBackgroundColor = (value: number) => {
    if (value === 0 || value === 1) return '#ffffff'; // White for 0 or 1
    if (value === 2) return '#f3f4f6'; // Light gray for 2s
    if (value === 3) return '#ddd6fe'; // Very light purple for 3s
    if (value === 4) return '#c084fc'; // Light purple for 4s
    if (value === 5) return '#a855f7'; // Purple for 5s
    if (value === 6) return '#9333ea'; // Medium purple for 6s
    if (value === 7) return '#7c3aed'; // Deep purple for 7s
    if (value >= 8) return '#6b21a8'; // Dark purple for 8+
    return '#ffffff'; // Default to white
  };

  // Format data for export
  const getExportData = () => {
    const exportData: any[] = [];
    
    Object.keys(groupedData)
      .sort((a, b) => {
        const totalA = Object.values(groupedData[a]).reduce((sum, val) => sum + (val as number), 0);
        const totalB = Object.values(groupedData[b]).reduce((sum, val) => sum + (val as number), 0);
        if (totalB !== totalA) return totalB - totalA;
        return a.localeCompare(b);
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
    
    return exportData;
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>{title}</CardTitle>
        <ChartExportWidget
          chartId={chartId}
          chartTitle={title}
          data={getExportData()}
          showDetailedExport={false}
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-background border border-slate-200 p-2 text-left text-sm font-semibold text-gray-700 min-w-[200px]">
                  {indexBy === 'symptomSegment' ? 'Symptom' : 
                   indexBy === 'diagnosis' ? 'Diagnosis' : 
                   indexBy === 'diagnosticCategory' ? 'Category' :
                   indexBy === 'hrsnIndicator' ? 'HRSN Indicator' : 'Item'}
                </th>
                {allDates.map((date) => (
                  <th 
                    key={date}
                    style={{ 
                      padding: '8px',
                      border: '1px solid #e5e7eb',
                      textAlign: 'center'
                    }}
                    className="text-center font-medium border border-slate-200 text-xs"
                  >
                    {date}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedData)
                .map(key => ({
                  name: key,
                  totalValue: Object.values(groupedData[key]).reduce((sum, val) => sum + (val as number), 0)
                }))
                .sort((a, b) => {
                  if (b.totalValue !== a.totalValue) {
                    return b.totalValue - a.totalValue;
                  }
                  return a.name.localeCompare(b.name);
                })
                .map(({ name, totalValue }) => (
                <tr key={name}>
                  <th className="sticky left-0 bg-background border border-slate-200 p-2 text-left text-sm font-semibold text-gray-700 min-w-[200px]">
                    {name} <span className="font-normal">({totalValue})</span>
                  </th>
                  {allDates.map((date) => {
                    const value = groupedData[name]?.[date] || 0;
                    const backgroundColor = getBackgroundColor(value);
                    
                    return (
                      <td 
                        key={`${name}-${date}`} 
                        style={{ 
                          padding: '8px',
                          border: '1px solid #e5e7eb',
                          textAlign: 'center',
                          backgroundColor
                        }}
                        className="text-center font-medium border border-slate-200"
                        title={`${name} on ${date}: ${value}`}
                      >
                        {value > 0 ? value : '\u00A0'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default UnifiedHeatmapComponent;