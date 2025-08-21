import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { processChartData } from '@/utils/chart-calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Test component to verify client-side calculations work correctly
 * This will help us confirm the fix before applying it to the main charts
 */
export default function ChartCalculationTest() {
  const [displayMode, setDisplayMode] = useState<'count' | 'percentage'>('count');
  
  const { data, isLoading } = useQuery({
    queryKey: ['/api/visualization-data'],
  });

  const [processedData, setProcessedData] = useState<any[]>([]);

  useEffect(() => {
    if (data?.hrsnIndicatorData) {
      console.log('🧪 Raw HRSN data:', data.hrsnIndicatorData.slice(0, 3));
      
      // Use 2314 as the total HRSN records for correct percentage calculation
      const processed = processChartData(data.hrsnIndicatorData, displayMode, 2314);
      setProcessedData(processed);
      
      console.log('🧪 Processed data:', processed.slice(0, 3));
      console.log('🧪 Display mode:', displayMode);
    }
  }, [data, displayMode]);

  if (isLoading) return <div>Loading test...</div>;

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Chart Calculation Test</CardTitle>
        <div className="flex gap-2">
          <Button 
            variant={displayMode === 'count' ? 'default' : 'outline'}
            onClick={() => setDisplayMode('count')}
          >
            Count
          </Button>
          <Button 
            variant={displayMode === 'percentage' ? 'default' : 'outline'}
            onClick={() => setDisplayMode('percentage')}
          >
            Percentage
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <h3 className="font-semibold">HRSN Indicators ({displayMode} mode):</h3>
          {processedData.slice(0, 5).map((item, index) => (
            <div key={item.id} className="flex justify-between border-b pb-1">
              <span>{item.label || item.id}</span>
              <span className="font-mono">
                {item.value}{displayMode === 'percentage' ? '%' : ''}
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
          <p><strong>Expected results with corrected calculation:</strong></p>
          <p>Count mode: 634, 518, 414...</p>
          <p>Percentage mode: 27% (634/2314), 22% (518/2314), 18% (414/2314)...</p>
          <p>Using total HRSN records: 2,314</p>
        </div>
      </CardContent>
    </Card>
  );
}