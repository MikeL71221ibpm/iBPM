import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtractedSymptom } from "@shared/schema";

interface BubbleChartProps {
  title: string;
  data: ExtractedSymptom[];
  indexBy: "symptomSegment" | "diagnosis" | "diagnosticCategory";
}

const BubbleChart = ({ title, data, indexBy }: BubbleChartProps) => {
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
  
  // Group by indexBy and count occurrences
  const counts = data.reduce((acc, item) => {
    const key = item[indexBy] as string;
    
    if (!key) return acc;
    
    if (!acc[key]) {
      acc[key] = 0;
    }
    
    acc[key]++;
    return acc;
  }, {} as Record<string, number>);
  
  // Generate colors
  const colors = [
    "#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", 
    "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f"
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] overflow-auto">
          <div className="p-4 rounded-md bg-neutral-50">
            <h3 className="text-lg font-medium text-neutral-700 mb-4">
              Data Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(counts).map(([key, value], index) => (
                <div 
                  key={key} 
                  className="p-4 rounded-lg shadow-sm flex items-center"
                  style={{ backgroundColor: `${colors[index % colors.length]}20` }}
                >
                  <div 
                    className="w-4 h-4 rounded-full mr-3" 
                    style={{ backgroundColor: colors[index % colors.length] }}
                  ></div>
                  <div>
                    <div className="font-medium">{key}</div>
                    <div className="text-sm">{value} mentions</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-4 text-neutral-500 text-sm">
              * Visualization simplified - future version will include interactive bubble chart
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BubbleChart;
