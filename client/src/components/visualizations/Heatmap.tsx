import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveHeatMap } from "@nivo/heatmap";
import { ExtractedSymptom } from "@shared/schema";

interface HeatmapProps {
  title: string;
  data: ExtractedSymptom[];
  indexBy: "symptomSegment" | "diagnosis" | "diagnosticCategory";
}

interface ProcessedData {
  id: string;
  data: Array<{ x: string; y: number }>;
}

const Heatmap = ({ title, data, indexBy }: HeatmapProps) => {
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
    const key = item[indexBy] as string;
    const dateStr = new Date(item.dosDate).toLocaleDateString();
    
    if (!acc[key]) {
      acc[key] = {};
    }
    
    if (!acc[key][dateStr]) {
      acc[key][dateStr] = 0;
    }
    
    acc[key][dateStr]++;
    
    return acc;
  }, {} as Record<string, Record<string, number>>);
  
  // Get unique dates
  const allDates = [...new Set(data.map(item => 
    new Date(item.dosDate).toLocaleDateString()
  ))].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
  // Format data for heatmap
  const formattedData: ProcessedData[] = Object.keys(groupedData).map(key => {
    const itemData = allDates.map(date => ({
      x: date,
      y: groupedData[key][date] || 0
    }));
    
    return {
      id: key,
      data: itemData
    };
  });
  
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

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-background border border-slate-200 p-2 text-left text-sm font-semibold text-gray-700 min-w-[200px]">
                  {indexBy === 'symptomSegment' ? 'Symptom' : 
                   indexBy === 'diagnosis' ? 'Diagnosis' : 'Category'}
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
                  totalValue: Object.values(groupedData[key]).reduce((sum, val) => sum + val, 0)
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

export default Heatmap;
